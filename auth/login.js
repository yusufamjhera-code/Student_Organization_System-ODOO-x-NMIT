// File: auth/login.js
document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-signin-btn');
    const delegatedForm = document.getElementById('delegated-login-form');
    const delegatedBtn = document.getElementById('delegated-signin-btn');
    const messageEl = document.getElementById('message');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authPanels = document.querySelectorAll('.auth-panel');

    const auth = firebase.auth();
    const firestore = firebase.firestore();

    // --- TAB SWITCHING ---
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPanel = tab.dataset.tab;

            // Update tabs
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update panels
            authPanels.forEach(p => p.classList.remove('active'));
            document.getElementById(`${targetPanel}-login`).classList.add('active');

            // Clear messages
            messageEl.textContent = '';
            messageEl.className = 'message-area';
        });
    });

    // Button loading state helper
    const setButtonLoading = (btn, isLoading, originalContent = null) => {
        if (isLoading) {
            btn.disabled = true;
            btn.dataset.originalContent = btn.innerHTML;
            btn.innerHTML = `
                <svg class="google-icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
                <span>Signing in...</span>
            `;
            btn.style.opacity = '0.7';
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originalContent || originalContent;
            btn.style.opacity = '1';
        }
    };

    // Show message helper
    const showMessage = (text, type) => {
        messageEl.textContent = text;
        messageEl.className = `message-area ${type}`;
    };

    // --- ADMIN LOGIN (GOOGLE) ---
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            setButtonLoading(googleBtn, true);
            showMessage('Opening Google Sign-in...', 'info');

            const provider = new firebase.auth.GoogleAuthProvider();

            try {
                const result = await auth.signInWithPopup(provider);
                const user = result.user;
                const isNewUser = result.additionalUserInfo?.isNewUser;

                showMessage('✓ Verified! Setting up your account...', 'success');

                // Create profile for new organizers
                if (isNewUser) {
                    await firestore.collection('organizers').doc(user.uid).set({
                        organizerId: user.uid,
                        email: user.email,
                        organizationName: user.displayName || "New Organization",
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                // Store auth type in session
                sessionStorage.setItem('authType', 'admin');
                sessionStorage.removeItem('collaboratorEmail');

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '../organizer/dashboard.html';
                }, 800);

            } catch (error) {
                console.error("Auth error:", error);
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

    // --- DELEGATED USER LOGIN (EMAIL + CODE) ---
    if (delegatedForm) {
        delegatedForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('delegated-email').value.trim().toLowerCase();
            const code = document.getElementById('access-code').value.trim().toUpperCase();

            if (!email || !code) {
                return showMessage('Please fill in all fields.', 'error');
            }

            if (code.length !== 8) {
                return showMessage('Access code must be 8 characters.', 'error');
            }

            setButtonLoading(delegatedBtn, true);
            showMessage('Verifying credentials...', 'info');

            try {
                // Search all events for matching collaborator
                const eventsSnapshot = await firestore.collection('events').get();
                let foundEvent = null;
                let collaboratorData = null;

                for (const doc of eventsSnapshot.docs) {
                    const eventData = doc.data();
                    const collaborators = eventData.collaborators || [];

                    const match = collaborators.find(c =>
                        c.email.toLowerCase() === email &&
                        c.accessCode === code
                    );

                    if (match) {
                        foundEvent = { id: doc.id, ...eventData };
                        collaboratorData = match;
                        break;
                    }
                }

                if (!foundEvent) {
                    throw new Error('invalid-credentials');
                }

                showMessage('✓ Access verified! Signing in...', 'success');

                // Sign in anonymously to get Firebase auth for Firestore writes
                await auth.signInAnonymously();

                // Store collaborator info in session
                sessionStorage.setItem('authType', 'collaborator');
                sessionStorage.setItem('collaboratorEmail', email);

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '../organizer/dashboard.html';
                }, 800);

            } catch (error) {
                console.error("Delegated auth error:", error);
                setButtonLoading(delegatedBtn, false);

                if (error.message === 'invalid-credentials') {
                    showMessage('Invalid email or access code.', 'error');
                } else if (error.code === 'auth/network-request-failed') {
                    showMessage('Network error. Check your connection.', 'error');
                } else {
                    showMessage('Sign-in failed. Please try again.', 'error');
                }
            }
        });
    }

    // Add spin animation for loading
    const style = document.createElement('style');
    style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
});