// File: auth/login.js
// Single Unified Login Engine with Automatic Role Routing
document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-signin-btn');
    const delegatedForm = document.getElementById('delegated-login-form');
    const delegatedBtn = document.getElementById('delegated-signin-btn');
    const messageEl = document.getElementById('message');

    const auth = firebase.auth();
    const firestore = firebase.firestore();

    // Helper: show feedback message
    const showMessage = (text, type = 'info') => {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.className = `message-area ${type}`;
        if (window.PassTrackToast) {
            window.PassTrackToast.show(text, type);
        }
    };

    // Helper: set button loading state
    const setButtonLoading = (btn, isLoading, loadingText = 'Signing in...') => {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = `
                <span class="pt-spinner" style="border-top-color: currentColor;"></span>
                <span>${loadingText}</span>
            `;
            btn.style.opacity = '0.75';
        } else {
            btn.disabled = false;
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
            }
            btn.style.opacity = '1';
        }
    };

    // Routing resolver: determine appropriate destination based on user roles
    async function resolveUserRoleAndRedirect(user) {
        showMessage('✓ Authenticated! Detecting your role...', 'success');

        try {
            // Check for redirect param
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect');

            // 0. Check if user has an explicit role in userProfiles
            const profileDoc = await firestore.collection('userProfiles').doc(user.uid).get();
            if (profileDoc.exists) {
                const profile = profileDoc.data();
                if (redirectParam && !redirectParam.includes('login.html')) {
                    setTimeout(() => { window.location.href = redirectParam; }, 600);
                    return;
                }

                if (profile.role === 'staff' || profile.role === 'volunteer') {
                    sessionStorage.setItem('authType', 'staff');
                    sessionStorage.setItem('collaboratorEmail', (user.email || '').toLowerCase());
                    setTimeout(() => {
                        window.location.href = '../distributor/distributor.html';
                    }, 600);
                    return;
                } else if (profile.role === 'member') {
                    sessionStorage.setItem('authType', 'member');
                    sessionStorage.setItem('memberEmail', (user.email || '').toLowerCase());
                    if (profile.orgId) sessionStorage.setItem('orgId', profile.orgId);
                    setTimeout(() => {
                        window.location.href = '../members/directory.html';
                    }, 600);
                    return;
                } else if (profile.role === 'organizer') {
                    const orgSnap = await firestore.collection('organizations')
                        .where('ownerId', '==', user.uid)
                        .limit(1)
                        .get();

                    sessionStorage.setItem('authType', 'admin');
                    if (!orgSnap.empty) {
                        sessionStorage.setItem('orgId', orgSnap.docs[0].id);
                        setTimeout(() => {
                            window.location.href = '../organizer/dashboard.html';
                        }, 600);
                    } else {
                        setTimeout(() => {
                            window.location.href = '../organizer/setup-org.html';
                        }, 600);
                    }
                    return;
                }
            }

            // 1. Fallback: Check if user is an Organizer
            const organizerDoc = await firestore.collection('organizers').doc(user.uid).get();
            if (!organizerDoc.exists) {
                await firestore.collection('organizers').doc(user.uid).set({
                    organizerId: user.uid,
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // Check if organization exists for this user
            const orgSnap = await firestore.collection('organizations')
                .where('ownerId', '==', user.uid)
                .limit(1)
                .get();

            if (!orgSnap.empty) {
                sessionStorage.setItem('authType', 'admin');
                sessionStorage.setItem('orgId', orgSnap.docs[0].id);
                setTimeout(() => {
                    window.location.href = redirectParam || '../organizer/dashboard.html';
                }, 600);
                return;
            }

            // 2. Fallback: Check if user email is registered as an active Member
            if (user.email) {
                const memberSnap = await firestore.collection('members')
                    .where('email', '==', user.email.toLowerCase())
                    .limit(1)
                    .get();

                if (!memberSnap.empty) {
                    sessionStorage.setItem('authType', 'member');
                    sessionStorage.setItem('memberEmail', user.email.toLowerCase());
                    const mData = memberSnap.docs[0].data();
                    if (mData.orgId) sessionStorage.setItem('orgId', mData.orgId);
                    setTimeout(() => {
                        window.location.href = redirectParam || '../members/directory.html';
                    }, 600);
                    return;
                }

                // 3. Fallback: Check if user is an event collaborator
                const eventSnap = await firestore.collection('events')
                    .where('collaboratorEmails', 'array-contains', user.email.toLowerCase())
                    .limit(1)
                    .get();

                if (!eventSnap.empty) {
                    sessionStorage.setItem('authType', 'collaborator');
                    sessionStorage.setItem('collaboratorEmail', user.email.toLowerCase());
                    setTimeout(() => {
                        window.location.href = redirectParam || '../distributor/distributor.html';
                    }, 600);
                    return;
                }
            }

            // Default for newly registered organizers with no created org yet
            sessionStorage.setItem('authType', 'admin');
            setTimeout(() => {
                window.location.href = redirectParam || '../organizer/setup-org.html';
            }, 600);

        } catch (err) {
            console.error("Role resolution error:", err);
            // Fallback to organizer dashboard
            window.location.href = '../organizer/dashboard.html';
        }
    }

    // --- 1. GOOGLE SIGN-IN ---
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            setButtonLoading(googleBtn, true, 'Connecting Google...');
            showMessage('Opening Google sign-in popup...', 'info');

            const provider = new firebase.auth.GoogleAuthProvider();

            try {
                const result = await auth.signInWithPopup(provider);
                await resolveUserRoleAndRedirect(result.user);
            } catch (error) {
                console.error("Google Auth error:", error);
                setButtonLoading(googleBtn, false);

                if (error.code === 'auth/popup-closed-by-user') {
                    showMessage('Sign-in cancelled. Try again when ready.', 'error');
                } else if (error.code === 'auth/network-request-failed') {
                    showMessage('Network error. Check your connection.', 'error');
                } else {
                    showMessage('Sign-in failed. Please try again.', 'error');
                }
            }
        });
    }

    // --- 2. UNIFIED CREDENTIAL / ACCESS CODE SIGN-IN ---
    if (delegatedForm) {
        delegatedForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('delegated-email');
            const codeInput = document.getElementById('access-code');

            const email = (emailInput ? emailInput.value : '').trim().toLowerCase();
            const credential = (codeInput ? codeInput.value : '').trim();

            if (!email || !credential) {
                return showMessage('Please provide both email and password / access code.', 'error');
            }

            setButtonLoading(delegatedBtn, true, 'Verifying...');
            showMessage('Verifying credentials...', 'info');

            // Strategy A: Try Firebase standard email/password first
            try {
                const userCred = await auth.signInWithEmailAndPassword(email, credential);
                if (userCred && userCred.user) {
                    return await resolveUserRoleAndRedirect(userCred.user);
                }
            } catch (firebaseAuthErr) {
                // If not standard email/pass, check if it's a staff 8-character access code
                const isPossibleAccessCode = credential.length === 8;

                if (!isPossibleAccessCode) {
                    setButtonLoading(delegatedBtn, false);
                    if (firebaseAuthErr.code === 'auth/wrong-password' || firebaseAuthErr.code === 'auth/user-not-found') {
                        return showMessage('Invalid email or password. If you are a staff volunteer, check your 8-character access code.', 'error');
                    }
                    return showMessage(firebaseAuthErr.message || 'Authentication failed.', 'error');
                }

                // Strategy B: Check collaborator access code in events
                try {
                    const codeUpper = credential.toUpperCase();
                    const eventsSnapshot = await firestore.collection('events')
                        .where('collaboratorEmails', 'array-contains', email)
                        .get();

                    let matchedEvent = null;
                    for (const doc of eventsSnapshot.docs) {
                        const eventData = doc.data();
                        const collaborators = eventData.collaborators || [];
                        const match = collaborators.find(c =>
                            c.email && c.email.toLowerCase() === email &&
                            c.accessCode && c.accessCode.toUpperCase() === codeUpper
                        );
                        if (match) {
                            matchedEvent = doc.id;
                            break;
                        }
                    }

                    if (matchedEvent) {
                        // Sign in anonymously to acquire Firestore privileges
                        await auth.signInAnonymously();
                        sessionStorage.setItem('authType', 'collaborator');
                        sessionStorage.setItem('collaboratorEmail', email);
                        showMessage('✓ Staff credentials verified!', 'success');
                        setTimeout(() => {
                            window.location.href = '../organizer/dashboard.html';
                        }, 600);
                        return;
                    }

                    // If neither matched
                    setButtonLoading(delegatedBtn, false);
                    showMessage('Invalid email or access code.', 'error');

                } catch (staffErr) {
                    console.error("Staff access code error:", staffErr);
                    setButtonLoading(delegatedBtn, false);
                    showMessage('Verification failed. Please try again.', 'error');
                }
            }
        });
    }
});