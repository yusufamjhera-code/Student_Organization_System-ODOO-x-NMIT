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
                        window.location.href = redirectParam || '../members/wallet-pass.html';
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
                        window.location.href = redirectParam || '../organizer/dashboard.html';
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

    // Helper: Friendly error message formatter
    function formatAuthErrorMessage(error) {
        if (!error) return 'Authentication failed. Please check your credentials.';
        const code = error.code || '';
        if (code === 'auth/invalid-login-credentials' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
            return 'Incorrect email or password. Please verify your credentials and try again.';
        }
        if (code === 'auth/invalid-email') {
            return 'Please enter a valid email address (e.g. name@college.edu).';
        }
        if (code === 'auth/user-disabled') {
            return 'This account has been deactivated. Please contact your organization lead.';
        }
        if (code === 'auth/too-many-requests') {
            return 'Too many failed login attempts. Please wait a few moments and try again.';
        }
        if (code === 'auth/network-request-failed') {
            return 'Network connection issue. Please check your internet connectivity.';
        }
        if (code === 'auth/popup-closed-by-user') {
            return 'Google sign-in popup was closed before completing.';
        }
        if (code === 'auth/popup-blocked') {
            return 'Popup blocked by your browser. Please allow popups for PassTrack.';
        }
        let msg = error.message || 'Authentication failed.';
        return msg.replace(/^Firebase:\s*(Error\s*)?(\([^\)]+\)\.?\s*)?/i, '').trim() || 'Authentication failed.';
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
                showMessage(formatAuthErrorMessage(error), 'error');
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

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return showMessage('Please enter a valid email address (e.g. name@college.edu).', 'error');
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
                // If not standard email/pass, check if it's an event collaborator access code
                const cleanCode = credential.trim();
                const isPossibleAccessCode = cleanCode.length >= 6 && cleanCode.length <= 12;

                if (!isPossibleAccessCode) {
                    setButtonLoading(delegatedBtn, false);
                    return showMessage(formatAuthErrorMessage(firebaseAuthErr), 'error');
                }

                // Strategy B: Check collaborator access code in events
                try {
                    const codeUpper = cleanCode.toUpperCase();
                    let matchedEvent = null;

                    // 1. Try targeted collaboratorEmails array lookup
                    try {
                        const eventsSnapshot = await firestore.collection('events')
                            .where('collaboratorEmails', 'array-contains', email)
                            .get();

                        for (const doc of eventsSnapshot.docs) {
                            const eventData = doc.data();
                            const collaborators = eventData.collaborators || [];
                            const match = collaborators.find(c =>
                                c.email && c.email.toLowerCase() === email &&
                                c.accessCode && c.accessCode.trim().toUpperCase() === codeUpper
                            );
                            if (match) {
                                matchedEvent = doc.id;
                                break;
                            }
                        }
                    } catch (queryErr) {
                        console.warn("Array query warning, checking events fallback:", queryErr);
                    }

                    // 2. Fallback scan all events if array field isn't indexed
                    if (!matchedEvent) {
                        const allEventsSnap = await firestore.collection('events').limit(30).get();
                        for (const doc of allEventsSnap.docs) {
                            const eventData = doc.data();
                            const collaborators = eventData.collaborators || [];
                            const match = collaborators.find(c =>
                                c.email && c.email.toLowerCase() === email &&
                                c.accessCode && c.accessCode.trim().toUpperCase() === codeUpper
                            );
                            if (match) {
                                matchedEvent = doc.id;
                                break;
                            }
                        }
                    }

                    if (matchedEvent) {
                        try {
                            await auth.signInAnonymously();
                        } catch (anonErr) {
                            console.warn("Anonymous auth unavailable or restricted; proceeding with verified collaborator session:", anonErr);
                        }
                        sessionStorage.setItem('authType', 'collaborator');
                        sessionStorage.setItem('collaboratorEmail', email);
                        showMessage('✓ Staff credentials verified! Opening workspace...', 'success');
                        setTimeout(() => {
                            window.location.href = '../organizer/dashboard.html';
                        }, 600);
                        return;
                    }

                    // If neither matched
                    setButtonLoading(delegatedBtn, false);
                    showMessage('Invalid credentials or collaborator access code.', 'error');

                } catch (staffErr) {
                    console.error("Staff access code error:", staffErr);
                    setButtonLoading(delegatedBtn, false);
                    showMessage('Verification failed. Please check your credentials or network connection.', 'error');
                }
            }
        });
    }
});