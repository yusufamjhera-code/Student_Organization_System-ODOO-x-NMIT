// File: organizer/setup-org.js
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = firebase.firestore();

    const form = document.getElementById('setup-org-form');
    const submitBtn = document.getElementById('setup-submit-btn');

    const nameInput = document.getElementById('org-name');
    const descInput = document.getElementById('org-desc');
    const feeInput = document.getElementById('org-fee');
    const durationInput = document.getElementById('org-duration');
    const discountInput = document.getElementById('org-discount');

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        if (!user || user.isAnonymous) {
            window.location.href = '../auth/login.html';
            return;
        }

        // Check if org already exists — if so, redirect to dashboard
        try {
            const orgSnap = await firestore.collection('organizations')
                .where('ownerId', '==', user.uid)
                .limit(1)
                .get();

            if (!orgSnap.empty) {
                // Org already set up, go to dashboard
                window.location.href = 'dashboard.html';
                return;
            }
        } catch (err) {
            console.error("Error checking existing org:", err);
        }
    });

    // --- FORM SUBMIT ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            alert("You must be signed in.");
            window.location.href = '../auth/login.html';
            return;
        }

        const orgName = nameInput.value.trim();
        const description = descInput.value.trim();
        const membershipFee = parseFloat(feeInput.value) || 0;
        const membershipDuration = parseInt(durationInput.value) || 365;
        const memberDiscountPercent = parseFloat(discountInput.value) || 10;

        // Validation
        if (orgName.length < 2) {
            nameInput.focus();
            return;
        }

        if (membershipFee < 0) {
            feeInput.value = 0;
            feeInput.focus();
            return;
        }

        if (membershipDuration < 1) {
            durationInput.value = 365;
            durationInput.focus();
            return;
        }

        if (memberDiscountPercent < 0 || memberDiscountPercent > 100) {
            discountInput.value = 10;
            discountInput.focus();
            return;
        }

        // Loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="google-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; width:20px; height:20px;">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
            <span>Setting up...</span>
        `;

        try {
            // Create organization document
            await firestore.collection('organizations').add({
                ownerId: user.uid,
                name: orgName,
                description: description,
                membershipFee: membershipFee,
                membershipDuration: membershipDuration,
                memberDiscountPercent: memberDiscountPercent,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update organizer doc with actual org name
            await firestore.collection('organizers').doc(user.uid).set({
                organizerId: user.uid,
                email: user.email,
                organizationName: orgName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error("Setup error:", error);
            alert("Failed to create organization. Please try again.");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ph-bold ph-rocket-launch"></i><span>Launch Organization</span>';
        }
    });
});
