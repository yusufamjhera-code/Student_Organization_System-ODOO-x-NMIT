// File: members/register.js
document.addEventListener('DOMContentLoaded', async () => {
    const firestore = db; // Assuming db is initialized in firebase-config.js

    // DOM Elements
    const orgNameHeader = document.getElementById('org-name-header');
    const orgDesc = document.getElementById('org-desc');
    const loadingSpinner = document.getElementById('loading-spinner');
    const registerForm = document.getElementById('register-form');
    const errorEl = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');
    const feeAmountEl = document.getElementById('fee-amount');
    const durationDaysEl = document.getElementById('duration-days');
    const submitBtn = document.getElementById('submit-btn');

    // Get orgId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('org');

    if (!orgId) {
        showError('Invalid Link: Missing organization ID.');
        loadingSpinner.style.display = 'none';
        return;
    }

    let organizationData = null;

    // Fetch Organization Data
    try {
        const orgDoc = await firestore.collection('organizations').doc(orgId).get();
        if (!orgDoc.exists) {
            showError('Organization not found.');
            loadingSpinner.style.display = 'none';
            return;
        }

        organizationData = orgDoc.data();
        
        // Update UI
        orgNameHeader.textContent = organizationData.name;
        orgDesc.textContent = organizationData.description || 'Become a member today.';
        feeAmountEl.textContent = `₹${organizationData.membershipFee || 0}`;
        durationDaysEl.textContent = organizationData.membershipDuration || 365;

        // Show form
        loadingSpinner.style.display = 'none';
        registerForm.style.display = 'block';

    } catch (err) {
        console.error("Error fetching org:", err);
        showError('Failed to load organization details.');
        loadingSpinner.style.display = 'none';
    }

    // Handle Form Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('member-name').value.trim();
        const email = document.getElementById('member-email').value.trim().toLowerCase();
        const phone = document.getElementById('member-phone').value.trim();
        const studentId = document.getElementById('member-studentid').value.trim();

        if (name.length < 2) return showError('Name must be at least 2 characters.');
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return showError('Please enter a valid email address.');

        // Phone validation (Task 3.5)
        if (phone) {
            const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/;
            if (!phoneRegex.test(phone)) return showError('Please enter a valid phone number (7-15 digits).');
        }

        // Loading state
        setLoading(true);
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        try {
            // Check if email already exists in this org
            const existingMemberQuery = await firestore.collection('members')
                .where('orgId', '==', orgId)
                .where('email', '==', email)
                .get();

            if (!existingMemberQuery.empty) {
                setLoading(false);
                return showError('This email is already registered with this organization.');
            }

            // Calculate dates
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            const duration = organizationData.membershipDuration || 365;
            const endDate = new Date(now.getTime() + (duration * 24 * 60 * 60 * 1000));
            const endDateStr = endDate.toISOString().split('T')[0];

            // Add member
            await firestore.collection('members').add({
                orgId: orgId,
                name: name,
                email: email,
                phone: phone || null,
                studentId: studentId || null,
                membershipStatus: 'pending', // Pending until dues paid
                membershipStartDate: todayStr,
                membershipEndDate: endDateStr,
                duesPaid: false,
                duesAmount: organizationData.membershipFee || 0,
                duesPaidAt: null,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                renewalReminderSent: false
            });

            // Trigger welcome email (fire-and-forget for client, or via trigger. For now, we simulate success)
            // TODO: call google apps script if needed
            
            registerForm.style.display = 'none';
            successEl.innerHTML = `
                <i class="ph-bold ph-check-circle"></i> Registration successful! Please pay your dues to activate your membership.
                <br><br>
                <a href="../index.html" style="display:inline-block; padding:10px 24px; background:var(--primary, #6a11cb); color:#fff; border-radius:10px; text-decoration:none; font-weight:600;">← Back to Home</a>
            `;
            successEl.style.display = 'block';

        } catch (err) {
            console.error("Registration error:", err);
            showError('Failed to register. Please try again.');
            setLoading(false);
        }
    });

    // Helpers
    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ph-bold ph-spinner-gap spin" style="font-size:1.2rem; margin:0;"></i> <span>Processing...</span>';
            submitBtn.style.opacity = '0.7';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ph-bold ph-user-plus"></i> <span>Register Now</span>';
            submitBtn.style.opacity = '1';
        }
    }
});
