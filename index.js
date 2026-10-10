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

            // 1. Check if user owns an organization
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
                    target = 'members/directory.html';
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
                        roleLabel = 'Event Staff / Scanner';
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

            setButtonLoading(loginBtn, true, 'Verifying...');
            showMessage('Verifying credentials...', 'info');

            // 1. Try Firebase Email & Password
            try {
                const userCred = await auth.signInWithEmailAndPassword(email, credential);
                if (userCred && userCred.user) {
                    return await resolveRoleAndNavigate(userCred.user, true);
                }
            } catch (authErr) {
                const isPossibleAccessCode = credential.length === 8;

                if (!isPossibleAccessCode || !firestore) {
                    setButtonLoading(loginBtn, false);
                    if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/user-not-found') {
                        return showMessage('Invalid email or password. Staff volunteers can enter their 8-character code.', 'error');
                    }
                    return showMessage(authErr.message || 'Authentication failed.', 'error');
                }

                // 2. Check 8-character collaborator staff code in events
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
                        await auth.signInAnonymously();
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
                    showMessage('Verification failed. Please try again.', 'error');
                }
            }
        });
    }

    // --- QUICK PREVIEW / TESTING ACCESS ---
    const previewOrgBtn = document.getElementById('preview-organizer-btn');
    const previewMemberBtn = document.getElementById('preview-member-btn');

    if (previewOrgBtn) {
        previewOrgBtn.addEventListener('click', () => {
            sessionStorage.setItem('authType', 'admin');
            sessionStorage.setItem('demoUser', 'true');
            if (window.PassTrackToast) window.PassTrackToast.success('Opening Organizer Dashboard in Preview Mode...');
            setTimeout(() => {
                window.location.href = 'organizer/dashboard.html';
            }, 500);
        });
    }

    if (previewMemberBtn) {
        previewMemberBtn.addEventListener('click', () => {
            sessionStorage.setItem('authType', 'member');
            sessionStorage.setItem('demoUser', 'true');
            if (window.PassTrackToast) window.PassTrackToast.success('Opening Member Directory in Preview Mode...');
            setTimeout(() => {
                window.location.href = 'members/directory.html';
            }, 500);
        });
    }

    // --- MOBILE QUICK JUMP BUTTON HANDLER ---
    if (mobileAuthJumpBtn) {
        mobileAuthJumpBtn.addEventListener('click', (e) => {
            if (auth && auth.currentUser && !auth.currentUser.isAnonymous) {
                e.preventDefault();
                window.location.href = destinationUrl;
                return;
            }
            e.preventDefault();
            const authCard = document.getElementById('auth-card-box');
            if (authCard) {
                authCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    const emailInput = document.getElementById('delegated-email');
                    if (emailInput) {
                        emailInput.focus();
                        emailInput.classList.add('pulse-focus');
                        setTimeout(() => emailInput.classList.remove('pulse-focus'), 1000);
                    }
                }, 350);
            }
        });
    }
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
