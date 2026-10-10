// File: distributor/distributor.js
document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const loginForm = document.getElementById('distributor-login-form');
    const messageEl = document.getElementById('message');
    const passwordInput = document.getElementById('distributor-code');
    const togglePasswordBtn = document.getElementById('toggle-password');

    if (!loginForm) return;

    // Password Toggle Functionality
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';

            // Update icon
            const icon = togglePasswordBtn.querySelector('i');
            icon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Get input values
        const eventId = document.getElementById('event-id').value.trim().toLowerCase();
        const distributorCode = document.getElementById('distributor-code').value.trim();

        // 2. Visual feedback for the user
        messageEl.textContent = 'Authenticating staff credentials...';
        messageEl.style.color = '#64748b'; // Neutral gray
        messageEl.className = 'message-area info';

        try {
            // 3. Query Firestore for the event
            // We search for a document where both the Public Event ID and the Staff Key match
            const eventsRef = db.collection('events');
            const query = eventsRef
                .where('eventId', '==', eventId)
                .where('distributorCode', '==', distributorCode);

            const querySnapshot = await query.get();

            if (querySnapshot.empty) {
                // 4. Handle Invalid Login
                messageEl.textContent = 'Access Denied: Invalid Event ID or Staff Key.';
                messageEl.style.color = '#ef4444'; // Danger red
                messageEl.className = 'message-area error';
            } else {
                // 5. Handle Successful Login
                const eventDoc = querySnapshot.docs[0];
                const eventData = eventDoc.data();

                messageEl.textContent = 'Authorization Granted! Launching scanner...';
                messageEl.style.color = '#10b981'; // Success green
                messageEl.className = 'message-area success';

                // Store both the readable ID and the internal Doc ID for scanner logic
                sessionStorage.setItem('distributorEventId', eventId);
                sessionStorage.setItem('distributorEventDocId', eventDoc.id);
                sessionStorage.setItem('distributorEventName', eventData.name);

                // Redirect to the scanner page within the same distributor folder
                setTimeout(() => {
                    window.location.href = 'scanner.html';
                }, 1200);
            }

        } catch (error) {
            console.error("Login processing error: ", error);

            // Check specifically for index requirements
            if (error.code === 'failed-precondition') {
                messageEl.textContent = 'System Error: A database index is required. Please check the browser console (F12) for the generation link.';
            } else {
                messageEl.textContent = 'An error occurred during verification. Please check your connection.';
            }
            messageEl.style.color = '#ef4444';
        }
    });
});