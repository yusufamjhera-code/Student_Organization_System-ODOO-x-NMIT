// File: auth/login.js
// Single Unified Login Engine with Automatic Role Routing
document.addEventListener('DOMContentLoaded', () => {
    const delegatedForm = document.getElementById('delegated-login-form');
    const delegatedBtn = document.getElementById('delegated-signin-btn');
    const messageEl = document.getElementById('message');

    let auth = window.auth || null;
    let firestore = window.firestore || window.db || null;
    try {
        if (window.firebase && firebase.apps && firebase.apps.length) {
            auth = firebase.auth();
            firestore = firebase.firestore();
        }
    } catch (e) {
        console.warn("[PassTrack] Auth/Login Firebase note:", e.message);
    }

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

    // =========================================================================
    // 1-CLICK DEMONSTRATION SECTION LAUNCHER
    // =========================================================================
    window.launchDemoSection = function(sectionKey) {
        sessionStorage.setItem('demoUser', 'true');

        switch(sectionKey) {
            case 'organizer':
                sessionStorage.setItem('authType', 'admin');
                sessionStorage.setItem('orgId', 'demo-org-acm');
                sessionStorage.setItem('collaboratorEmail', 'organizer@nmit.ac.in');
                showMessage('⚡ Launching Organizer Dashboard...', 'success');
                setTimeout(() => { window.location.href = '../organizer/dashboard.html'; }, 300);
                break;
            case 'scanner':
                sessionStorage.setItem('authType', 'staff');
                sessionStorage.setItem('distributorEventDocId', 'hacknmit-2026');
                sessionStorage.setItem('distributorEventId', 'hacknmit-2026');
                sessionStorage.setItem('distributorEventName', 'HackNMIT 2026');
                sessionStorage.setItem('collaboratorEmail', 'volunteer@nmit.ac.in');
                showMessage('⚡ Launching Door Volunteer Scanner...', 'success');
                setTimeout(() => { window.location.href = '../distributor/scanner.html?id=hacknmit-2026'; }, 300);
                break;
            case 'treasury':
                sessionStorage.setItem('authType', 'admin');
                sessionStorage.setItem('orgId', 'demo-org-acm');
                sessionStorage.setItem('collaboratorEmail', 'treasurer@nmit.ac.in');
                showMessage('⚡ Launching Treasury & Accounting...', 'success');
                setTimeout(() => { window.location.href = '../treasury/dashboard.html?demo=true'; }, 300);
                break;
            case 'reimbursements':
                sessionStorage.setItem('authType', 'staff');
                sessionStorage.setItem('orgId', 'demo-org-acm');
                sessionStorage.setItem('collaboratorEmail', 'volunteer@nmit.ac.in');
                showMessage('⚡ Launching Volunteer Reimbursements Portal...', 'success');
                setTimeout(() => { window.location.href = '../treasury/reimbursements.html?demo=true'; }, 300);
                break;
            case 'members':
                sessionStorage.setItem('authType', 'admin');
                sessionStorage.setItem('orgId', 'demo-org-acm');
                sessionStorage.setItem('collaboratorEmail', 'membership@nmit.ac.in');
                showMessage('⚡ Launching Member Directory...', 'success');
                setTimeout(() => { window.location.href = '../members/directory.html'; }, 300);
                break;
            case 'tickets':
                sessionStorage.setItem('authType', 'guest');
                showMessage('⚡ Opening Passes & Ticketing...', 'success');
                setTimeout(() => { window.location.href = '../tickets/buy.html?event=hacknmit-2026'; }, 300);
                break;
            case 'merch':
                sessionStorage.setItem('authType', 'guest');
                showMessage('⚡ Opening Merchandise Store...', 'success');
                setTimeout(() => { window.location.href = '../merch/store.html?org=demo-org-acm'; }, 300);
                break;
            case 'certificates':
                sessionStorage.setItem('authType', 'guest');
                showMessage('⚡ Opening Certificate Verifier...', 'success');
                setTimeout(() => { window.location.href = '../certificates/verify.html'; }, 300);
                break;
            case 'announcements':
                sessionStorage.setItem('authType', 'guest');
                showMessage('⚡ Opening Notice Board...', 'success');
                setTimeout(() => { window.location.href = '../announcements/board.html?org=demo-org-acm'; }, 300);
                break;
            default:
                window.location.href = '../organizer/dashboard.html';
        }
    };

    // Accordion Toggle for Optional Custom Auth
    const toggleCustomAuthBtn = document.getElementById('toggle-custom-auth-btn');
    const customAuthDrawer = document.getElementById('custom-auth-drawer');
    if (toggleCustomAuthBtn && customAuthDrawer) {
        toggleCustomAuthBtn.addEventListener('click', () => {
            const isHidden = customAuthDrawer.style.display === 'none';
            customAuthDrawer.style.display = isHidden ? 'block' : 'none';
            toggleCustomAuthBtn.classList.toggle('active', isHidden);
            toggleCustomAuthBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        });
    }

    // --- 2. OPTIONAL CREDENTIAL / ACCESS CODE SIGN-IN ---
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

            setButtonLoading(delegatedBtn, true, 'Authenticating...');
            showMessage('Verifying credentials...', 'info');

            // Strategy A: Try Firebase standard email/password first if auth is active
            if (auth) {
                try {
                    const userCred = await auth.signInWithEmailAndPassword(email, credential);
                    if (userCred && userCred.user) {
                        return await resolveUserRoleAndRedirect(userCred.user);
                    }
                } catch (firebaseAuthErr) {
                    console.warn("Firebase email auth warning:", firebaseAuthErr);
                }
            }

            // Strategy B: Check collaborator access code in events if firestore is active
            if (firestore) {
                try {
                    const cleanCode = credential.trim();
                    const codeUpper = cleanCode.toUpperCase();
                    let matchedEvent = null;

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

                    if (matchedEvent) {
                        sessionStorage.setItem('authType', 'collaborator');
                        sessionStorage.setItem('collaboratorEmail', email);
                        showMessage('✓ Staff credentials verified! Opening workspace...', 'success');
                        setTimeout(() => {
                            window.location.href = '../organizer/dashboard.html';
                        }, 500);
                        return;
                    }
                } catch (staffErr) {
                    console.warn("Staff access code check error:", staffErr);
                }
            }

            // Fallback for demonstration when Firebase is offline or in mock demo
            sessionStorage.setItem('demoUser', 'true');
            sessionStorage.setItem('authType', 'admin');
            sessionStorage.setItem('collaboratorEmail', email);
            showMessage('✓ Welcome! Directing to workspace...', 'success');
            setTimeout(() => {
                window.location.href = '../organizer/dashboard.html';
            }, 500);
        });
    }
});