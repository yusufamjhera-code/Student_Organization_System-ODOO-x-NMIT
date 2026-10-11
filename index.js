// File: index.js
// PassTrack Universal Home & Automated Role Routing Engine
// Follows Sonnet Clip Universal Authentication Architecture

let currentTargetUrl = '';
let currentType = ''; // 'org' or 'event'

document.addEventListener('DOMContentLoaded', () => {
    const auth = (window.firebase && firebase.auth) ? firebase.auth() : null;
    const firestore = (window.firebase && firebase.firestore) ? firebase.firestore() : null;

    const unauthContainer = document.getElementById('unauth-container');
    const authSessionContainer = document.getElementById('auth-session-container');
    const googleBtn = document.getElementById('google-signin-btn');
    const loginForm = document.getElementById('delegated-login-form');
    const loginBtn = document.getElementById('delegated-signin-btn');
    const messageEl = document.getElementById('message');

    const userNameEl = document.getElementById('user-session-name');
    const userEmailEl = document.getElementById('user-session-email');
    const userRoleBadge = document.getElementById('user-role-badge');
    const enterWorkspaceBtn = document.getElementById('enter-workspace-btn');
    const signoutSessionBtn = document.getElementById('signout-session-btn');
    const authSubtitle = document.getElementById('auth-subtitle');
    const mobileAuthJumpBtn = document.getElementById('mobile-auth-jump-btn');

    let destinationUrl = 'organizer/dashboard.html';

    // Helper: show feedback message & toast
    const showMessage = (text, type = 'info') => {
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.className = `auth-message-box ${type}`;
        }
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

    // =========================================================================
    // AUTOMATED ROLE RESOLVER & WORKSPACE ROUTER
    // =========================================================================
    async function resolveRoleAndNavigate(user, autoRedirect = false) {
        if (!firestore) return;

        try {
            const email = (user.email || '').toLowerCase();
            let roleLabel = 'Organizer';
            let target = 'organizer/dashboard.html';

            // 0. Check if user has an explicit role registered in userProfiles
            const profileDoc = await firestore.collection('userProfiles').doc(user.uid).get();
            if (profileDoc.exists) {
                const profile = profileDoc.data();
                if (profile.role === 'staff' || profile.role === 'volunteer') {
                    roleLabel = 'Door Staff / Scanner';
                    target = 'distributor/distributor.html';
                    sessionStorage.setItem('authType', 'staff');
                    sessionStorage.setItem('collaboratorEmail', email);
                } else if (profile.role === 'member') {
                    roleLabel = 'Club Member';
                    target = 'members/directory.html';
                    sessionStorage.setItem('authType', 'member');
                    sessionStorage.setItem('memberEmail', email);
                    if (profile.orgId) sessionStorage.setItem('orgId', profile.orgId);
                } else if (profile.role === 'organizer') {
                    const orgSnap = await firestore.collection('organizations')
                        .where('ownerId', '==', user.uid)
                        .limit(1)
                        .get();
                    if (!orgSnap.empty) {
                        roleLabel = 'Club Lead / Organizer';
                        target = 'organizer/dashboard.html';
                        sessionStorage.setItem('authType', 'admin');
                        sessionStorage.setItem('orgId', orgSnap.docs[0].id);
                    } else {
                        roleLabel = 'Organizer (New Setup)';
                        target = 'organizer/setup-org.html';
                        sessionStorage.setItem('authType', 'admin');
                    }
                }
            } else {
                // 1. Fallback: Check if user owns an organization
                const orgSnap = await firestore.collection('organizations')
                    .where('ownerId', '==', user.uid)
                    .limit(1)
                    .get();

                if (!orgSnap.empty) {
                    roleLabel = 'Club Lead / Organizer';
                    target = 'organizer/dashboard.html';
                    sessionStorage.setItem('authType', 'admin');
                    sessionStorage.setItem('orgId', orgSnap.docs[0].id);
                } else if (email) {
                    // 2. Check if user is a member of an organization
                    const memberSnap = await firestore.collection('members')
                        .where('email', '==', email)
                        .limit(1)
                        .get();

                    if (!memberSnap.empty) {
                        roleLabel = 'Club Member';
                        target = 'members/wallet-pass.html';
                        sessionStorage.setItem('authType', 'member');
                        sessionStorage.setItem('memberEmail', email);
                        const mData = memberSnap.docs[0].data();
                        if (mData.orgId) sessionStorage.setItem('orgId', mData.orgId);
                    } else {
                        // 3. Check if user is a staff collaborator on events
                        const eventSnap = await firestore.collection('events')
                            .where('collaboratorEmails', 'array-contains', email)
                            .limit(1)
                            .get();

                        if (!eventSnap.empty) {
                            roleLabel = 'Event Collaborator';
                            target = 'organizer/dashboard.html';
                            sessionStorage.setItem('authType', 'collaborator');
                            sessionStorage.setItem('collaboratorEmail', email);
                        } else {
                            // 4. Default for newly signed in organizer without org yet
                            roleLabel = 'Organizer (New Setup)';
                            target = 'organizer/setup-org.html';
                            sessionStorage.setItem('authType', 'admin');
                        }
                    }
                }
            }

            // Check if there is an intended redirect destination
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect');
            if (redirectParam && !redirectParam.includes('index.html')) {
                target = redirectParam;
            }

            destinationUrl = target;

            // Register session in SessionManager if available
            if (window.PassTrackSessionManager && user && !user.isAnonymous) {
                try {
                    await window.PassTrackSessionManager.createSession(user.uid, {
                        role: roleLabel,
                        email: user.email
                    });
                } catch (sErr) {
                    console.warn('[SessionManager] session creation warning:', sErr);
                }
            }

            // Update UI elements
            if (userRoleBadge) {
                userRoleBadge.textContent = roleLabel;
                userRoleBadge.className = 'status-chip status-chip--accent';
            }

            if (mobileAuthJumpBtn) {
                mobileAuthJumpBtn.innerHTML = '<i class="ph-bold ph-squares-four"></i> <span>Workspace</span>';
            }

            if (enterWorkspaceBtn) {
                enterWorkspaceBtn.onclick = () => {
                    window.location.href = destinationUrl;
                };
            }

            if (autoRedirect) {
                showMessage(`✓ Signed in as ${roleLabel}! Opening workspace...`, 'success');
                setTimeout(() => {
                    window.location.href = destinationUrl;
                }, 700);
            }

        } catch (err) {
            console.error("Error resolving user role:", err);
            destinationUrl = 'organizer/dashboard.html';
            if (autoRedirect) {
                window.location.href = destinationUrl;
            }
        }
    }

    // =========================================================================
    // AUTH STATE LISTENER (Keeps Active Session Synchronized)
    // =========================================================================
    if (auth) {
        auth.onAuthStateChanged(async (user) => {
            if (user && !user.isAnonymous) {
                if (unauthContainer) unauthContainer.style.display = 'none';
                if (authSessionContainer) authSessionContainer.style.display = 'block';

                if (userNameEl) userNameEl.textContent = user.displayName || user.email.split('@')[0];
                if (userEmailEl) userEmailEl.textContent = user.email;
                if (authSubtitle) authSubtitle.textContent = "You are currently signed in. Jump right into your active workspace:";
                if (mobileAuthJumpBtn) {
                    mobileAuthJumpBtn.innerHTML = '<i class="ph-bold ph-squares-four"></i> <span>Workspace</span>';
                }

                await resolveRoleAndNavigate(user, false);
            } else {
                if (unauthContainer) unauthContainer.style.display = 'block';
                if (authSessionContainer) authSessionContainer.style.display = 'none';
                if (authSubtitle) authSubtitle.textContent = "Universal sign-in. Your verified role is determined automatically.";
                if (mobileAuthJumpBtn) {
                    mobileAuthJumpBtn.innerHTML = '<i class="ph-bold ph-sign-in"></i> <span>Login / Sign Up</span>';
                }
            }
        });
    }

    // Sign out button on active session card
    if (signoutSessionBtn && auth) {
        signoutSessionBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                sessionStorage.clear();
                if (window.PassTrackToast) window.PassTrackToast.info('Signed out successfully.');
            } catch (err) {
                console.error("Signout error:", err);
            }
        });
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
    // GOOGLE SIGN-IN HANDLER
    // =========================================================================
    if (googleBtn && auth) {
        googleBtn.addEventListener('click', async () => {
            setButtonLoading(googleBtn, true, 'Connecting Google...');
            showMessage('Opening Google sign-in...', 'info');

            const provider = new firebase.auth.GoogleAuthProvider();

            try {
                const result = await auth.signInWithPopup(provider);
                const user = result.user;

                // Ensure organizer doc is present
                if (firestore) {
                    await firestore.collection('organizers').doc(user.uid).set({
                        organizerId: user.uid,
                        email: user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                await resolveRoleAndNavigate(user, true);

            } catch (error) {
                console.error("Google Auth error:", error);
                setButtonLoading(googleBtn, false);
                showMessage(formatAuthErrorMessage(error), 'error');
            }
        });
    }

    // =========================================================================
    // UNIFIED CREDENTIALS / ACCESS CODE HANDLER
    // =========================================================================
    if (loginForm && auth) {
        loginForm.addEventListener('submit', async (e) => {
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

            setButtonLoading(loginBtn, true, 'Verifying...');
            showMessage('Verifying credentials...', 'info');

            // 1. Try Firebase Email & Password
            try {
                const userCred = await auth.signInWithEmailAndPassword(email, credential);
                if (userCred && userCred.user) {
                    return await resolveRoleAndNavigate(userCred.user, true);
                }
            } catch (authErr) {
                const cleanCode = credential.trim();
                const isPossibleAccessCode = cleanCode.length >= 6 && cleanCode.length <= 12;

                if (!isPossibleAccessCode || !firestore) {
                    setButtonLoading(loginBtn, false);
                    return showMessage(formatAuthErrorMessage(authErr), 'error');
                }

                // 2. Check collaborator staff code in events
                try {
                    const codeUpper = cleanCode.toUpperCase();
                    let matchedEvent = null;

                    // First try targeted query
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
                        console.warn("Array query warning, checking events collection fallback:", queryErr);
                    }

                    // Fallback scan if array-contains had no match or wasn't indexed yet
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
                            console.warn("Anonymous sign-in unavailable or restricted; proceeding with verified collaborator session:", anonErr);
                        }
                        sessionStorage.setItem('authType', 'collaborator');
                        sessionStorage.setItem('collaboratorEmail', email);
                        showMessage('✓ Staff credentials verified! Opening portal...', 'success');
                        setTimeout(() => {
                            window.location.href = 'organizer/dashboard.html';
                        }, 700);
                        return;
                    }

                    setButtonLoading(loginBtn, false);
                    showMessage('Invalid email or access code.', 'error');

                } catch (staffErr) {
                    console.error("Staff code error:", staffErr);
                    setButtonLoading(loginBtn, false);
                    showMessage('Verification failed. Please check your credentials or connection.', 'error');
                }
            }
        });
    }



    // =========================================================================
    // MOBILE AUTH POPUP MODAL CONTROLLER
    // =========================================================================
    const authPanel = document.getElementById('auth-panel');
    const authCardBox = document.getElementById('auth-card-box');
    const mobileAuthCloseBtn = document.getElementById('mobile-auth-close-btn');

    function openMobileAuthModal() {
        if (!authPanel) return;
        authPanel.classList.add('mobile-modal-active');
        document.body.classList.add('mobile-auth-open');
        setTimeout(() => {
            const emailInput = document.getElementById('delegated-email');
            if (emailInput) {
                emailInput.focus();
                emailInput.classList.add('pulse-focus');
                setTimeout(() => emailInput.classList.remove('pulse-focus'), 1000);
            }
        }, 120);
    }

    function closeMobileAuthModal() {
        if (!authPanel) return;
        authPanel.classList.remove('mobile-modal-active');
        document.body.classList.remove('mobile-auth-open');
    }

    // Expose helpers globally
    window.openMobileAuthModal = openMobileAuthModal;
    window.closeMobileAuthModal = closeMobileAuthModal;

    // Mobile trigger button handler
    if (mobileAuthJumpBtn) {
        mobileAuthJumpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // If already signed in with active session, jump straight to workspace
            if (auth && auth.currentUser && !auth.currentUser.isAnonymous) {
                window.location.href = destinationUrl;
                return;
            }
            // Otherwise, open the login popup modal
            openMobileAuthModal();
        });
    }

    // Mobile modal close button handler
    if (mobileAuthCloseBtn) {
        mobileAuthCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileAuthModal();
        });
    }

    // Backdrop click handler: close when clicking on the dimmed backdrop overlay
    if (authPanel) {
        authPanel.addEventListener('click', (e) => {
            if (window.innerWidth <= 992 && authPanel.classList.contains('mobile-modal-active')) {
                // If click is directly on the outer backdrop container (not inside the card box)
                if (e.target === authPanel) {
                    closeMobileAuthModal();
                }
            }
        });
    }

    // Escape key closes modal on responsive screen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (authPanel && authPanel.classList.contains('mobile-modal-active')) {
                closeMobileAuthModal();
            }
        }
    });

    // Cleanup modal classes if user expands screen to desktop width
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            closeMobileAuthModal();
        }
    });

    // Automatically open modal if requested via hash or query param (?login=1 or #login)
    const checkLoginUrlTrigger = () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('login') === '1' || window.location.hash === '#login' || window.location.hash === '#auth') {
            if (window.innerWidth <= 992) {
                setTimeout(openMobileAuthModal, 200);
            }
        }
    };
    checkLoginUrlTrigger();
});

// =========================================================================
// PUBLIC GUEST EXPLORATION SELECTOR (Browse Events / Clubs without Login)
// =========================================================================
function openSelector(type, targetUrl) {
    if (window.event) window.event.preventDefault();

    if (typeof db === 'undefined' || !db) {
        if (window.PassTrackToast) {
            window.PassTrackToast.warn("Connecting to database... please verify configuration.");
        } else {
            alert("Firebase is initializing. Please verify configuration.");
        }
        return;
    }

    currentTargetUrl = targetUrl;
    currentType = type;

    const modal = document.getElementById('selector-modal');
    const title = document.getElementById('selector-title');
    const subtitle = document.getElementById('selector-subtitle');
    const list = document.getElementById('selector-list');

    if (!modal || !title || !subtitle || !list) return;

    list.innerHTML = '<p style="text-align:center; padding:1.5rem; color:var(--muted);"><span class="pt-spinner"></span> Loading options...</p>';
    modal.style.display = 'flex';

    if (type === 'org') {
        title.textContent = 'Select Organization';
        subtitle.textContent = 'Choose the club storefront or board you wish to explore:';
        fetchOrganizations();
    } else if (type === 'event') {
        title.textContent = 'Select Event';
        subtitle.textContent = 'Choose the upcoming campus event you want to buy tickets for:';
        fetchEvents();
    }
}

function closeSelector() {
    const modal = document.getElementById('selector-modal');
    if (modal) modal.style.display = 'none';
}

async function fetchOrganizations() {
    const list = document.getElementById('selector-list');
    if (!list) return;

    try {
        const snap = await db.collection('organizations').orderBy('createdAt', 'desc').limit(20).get();
        if (snap.empty) {
            list.innerHTML = '<p style="text-align:center; color:var(--muted); padding:1rem;">No registered organizations found.</p>';
            return;
        }

        list.innerHTML = '';
        snap.forEach(doc => {
            const org = doc.data();
            const btn = document.createElement('button');
            btn.className = 'selector-item-btn';
            btn.innerHTML = `<strong>${org.name}</strong>`;
            btn.onclick = () => {
                window.location.href = `${currentTargetUrl}?org=${doc.id}`;
            };
            list.appendChild(btn);
        });
    } catch (err) {
        console.error("Error fetching organizations:", err);
        list.innerHTML = '<p style="color:var(--bad); text-align:center; padding:1rem;">Failed to load options. Ensure Firestore rules are deployed.</p>';
    }
}

async function fetchEvents() {
    const list = document.getElementById('selector-list');
    if (!list) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection('events').where('eventDate', '>=', today).limit(20).get();

        if (snap.empty) {
            list.innerHTML = '<p style="text-align:center; color:var(--muted); padding:1rem;">No upcoming public events found.</p>';
            return;
        }

        list.innerHTML = '';
        snap.forEach(doc => {
            const ev = doc.data();
            const btn = document.createElement('button');
            btn.className = 'selector-item-btn';
            btn.innerHTML = `<strong>${ev.name}</strong><br><small style="color:var(--muted);">${new Date(ev.eventDate).toLocaleDateString()}</small>`;
            btn.onclick = () => {
                window.location.href = `${currentTargetUrl}?event=${doc.id}`;
            };
            list.appendChild(btn);
        });
    } catch (err) {
        console.error("Error fetching events:", err);
        list.innerHTML = '<p style="color:var(--bad); text-align:center; padding:1rem;">Failed to load events. Ensure Firestore rules are deployed.</p>';
    }
}
