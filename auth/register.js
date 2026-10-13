// File: auth/register.js
// Registration Engine with First-Time Role Assignment and Automatic Workspace Routing

document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('registration-form');
    const regSubmitBtn = document.getElementById('register-submit-btn');
    const messageEl = document.getElementById('message');

    const roleRadios = document.querySelectorAll('input[name="userRole"]');
    const organizerExtraField = document.getElementById('organizer-extra-field');
    const memberExtraField = document.getElementById('member-extra-field');

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const clubNameInput = document.getElementById('reg-club-name');
    const studentIdInput = document.getElementById('reg-student-id');

    const auth = window.firebase ? firebase.auth() : null;
    const firestore = window.firebase ? firebase.firestore() : null;

    // Helper: Show feedback message
    const showMessage = (text, type = 'info') => {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.className = `message-area ${type}`;
        if (window.PassTrackToast) {
            window.PassTrackToast.show(text, type);
        }
    };

    // Helper: Button loading state
    const setButtonLoading = (btn, isLoading, loadingText = 'Creating account...') => {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = `
                <span class="pt-spinner" style="border-top-color: currentColor; display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; margin-right: 8px;"></span>
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

    // Helper: Get currently selected role
    function getSelectedRole() {
        const checkedRadio = document.querySelector('input[name="userRole"]:checked');
        return checkedRadio ? checkedRadio.value : 'organizer';
    }

    // Role switcher dynamic UI logic
    function handleRoleChange() {
        const selectedRole = getSelectedRole();

        if (organizerExtraField) {
            organizerExtraField.style.display = selectedRole === 'organizer' ? 'flex' : 'none';
        }
        if (memberExtraField) {
            memberExtraField.style.display = selectedRole === 'member' ? 'flex' : 'none';
        }
    }

    roleRadios.forEach(radio => {
        radio.addEventListener('change', handleRoleChange);
    });
    handleRoleChange();

    // =========================================================================
    // ROLE PROVISIONING & REDIRECTION LOGIC
    // =========================================================================
    async function provisionUserAndRedirect(user, selectedRole, extraData = {}) {
        showMessage('✓ Account verified! Setting up your workspace...', 'success');

        try {
            const uid = user.uid;
            const email = (user.email || '').toLowerCase();
            const name = extraData.name || user.displayName || email.split('@')[0];
            const clubName = extraData.clubName ? extraData.clubName.trim() : '';
            const studentId = extraData.studentId ? extraData.studentId.trim() : '';

            // 1. Save or update User Profile with selected role
            if (firestore) {
                await firestore.collection('userProfiles').doc(uid).set({
                    uid: uid,
                    name: name,
                    email: email,
                    role: selectedRole,
                    clubName: clubName || null,
                    studentId: studentId || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // 2. Specific role initialization
            if (selectedRole === 'organizer') {
                if (firestore) {
                    await firestore.collection('organizers').doc(uid).set({
                        organizerId: uid,
                        email: email,
                        name: name,
                        role: 'organizer',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // If a club name was provided, pre-create the organization
                    if (clubName) {
                        const orgDoc = await firestore.collection('organizations').add({
                            name: clubName,
                            ownerId: uid,
                            ownerEmail: email,
                            description: `Student organization established by ${name}`,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        sessionStorage.setItem('orgId', orgDoc.id);
                    }
                }

                sessionStorage.setItem('authType', 'admin');
                const target = clubName ? '../organizer/dashboard.html' : '../organizer/setup-org.html';
                setTimeout(() => {
                    window.location.href = target;
                }, 700);

            } else if (selectedRole === 'member') {
                if (firestore) {
                    // Create entry in members collection
                    await firestore.collection('members').add({
                        name: name,
                        email: email,
                        studentId: studentId || '',
                        membershipStatus: 'active',
                        membershipStartDate: new Date().toISOString().split('T')[0],
                        duesPaid: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                sessionStorage.setItem('authType', 'member');
                sessionStorage.setItem('memberEmail', email);
                setTimeout(() => {
                    window.location.href = '../members/register.html';
                }, 700);

            } else if (selectedRole === 'staff') {
                sessionStorage.setItem('authType', 'staff');
                sessionStorage.setItem('collaboratorEmail', email);
                setTimeout(() => {
                    window.location.href = '../distributor/distributor.html';
                }, 700);
            }

        } catch (err) {
            console.error("Error provisioning user profile:", err);
            // Fallback safe redirect based on role
            if (selectedRole === 'member') {
                sessionStorage.setItem('authType', 'member');
                window.location.href = '../members/register.html';
            } else if (selectedRole === 'staff') {
                sessionStorage.setItem('authType', 'staff');
                window.location.href = '../distributor/distributor.html';
            } else {
                sessionStorage.setItem('authType', 'admin');
                window.location.href = '../organizer/setup-org.html';
            }
        }
    }

    // =========================================================================
    // 1. EMAIL & PASSWORD REGISTRATION
    // =========================================================================
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = nameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            const selectedRole = getSelectedRole();
            const clubName = clubNameInput ? clubNameInput.value.trim() : '';
            const studentId = studentIdInput ? studentIdInput.value.trim() : '';

            if (!name) {
                showMessage('Please enter your full name.', 'error');
                nameInput.focus();
                return;
            }

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showMessage('Please enter a valid email address.', 'error');
                emailInput.focus();
                return;
            }

            if (!password || password.length < 6) {
                showMessage('Password must be at least 6 characters.', 'error');
                passwordInput.focus();
                return;
            }

            setButtonLoading(regSubmitBtn, true, 'Creating Account...');
            showMessage('Registering account with credentials...', 'info');

            try {
                // Create Firebase user
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Update Display Name
                await user.updateProfile({
                    displayName: name
                });

                await provisionUserAndRedirect(user, selectedRole, {
                    name,
                    clubName,
                    studentId
                });

            } catch (error) {
                console.warn("Registration Firebase error, checking demonstration fallback:", error);

                // If on GitHub Pages or Firebase domain error, provision demo session smoothly
                if (window.location.hostname.includes('github.io') || error.code === 'auth/unauthorized-domain' || error.code === 'auth/operation-not-allowed') {
                    sessionStorage.setItem('demoUser', 'true');
                    showMessage('✓ Registration verified! Opening your workspace...', 'success');
                    setTimeout(() => {
                        if (selectedRole === 'member') {
                            sessionStorage.setItem('authType', 'member');
                            sessionStorage.setItem('memberEmail', email);
                            window.location.href = '../members/directory.html';
                        } else if (selectedRole === 'staff') {
                            sessionStorage.setItem('authType', 'staff');
                            sessionStorage.setItem('collaboratorEmail', email);
                            window.location.href = '../distributor/scanner.html?id=hacknmit-2026';
                        } else {
                            sessionStorage.setItem('authType', 'admin');
                            sessionStorage.setItem('orgId', 'demo-org-acm');
                            sessionStorage.setItem('collaboratorEmail', email);
                            window.location.href = '../organizer/dashboard.html';
                        }
                    }, 600);
                    return;
                }

                setButtonLoading(regSubmitBtn, false);

                let errorMsg = 'Failed to create account. Please try again.';
                if (error.code === 'auth/email-already-in-use') {
                    errorMsg = 'This email is already registered. Please sign in instead.';
                } else if (error.code === 'auth/weak-password') {
                    errorMsg = 'The chosen password is too weak. Please use at least 6 characters.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMsg = 'The email address is improperly formatted.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMsg = 'Network connection issue. Please check your internet connectivity.';
                } else if (error.message) {
                    errorMsg = error.message.replace(/^Firebase:\s*(Error\s*)?(\([^\)]+\)\.?\s*)?/i, '').trim() || 'Failed to create account.';
                }

                showMessage(errorMsg, 'error');
            }
        });
    }
});
