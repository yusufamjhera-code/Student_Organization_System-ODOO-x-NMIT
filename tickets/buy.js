// File: tickets/buy.js
document.addEventListener('DOMContentLoaded', async () => {
    const firestore = db; // from firebase-config.js

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');

    const spinner = document.getElementById('loading-spinner');
    const ticketCard = document.getElementById('ticket-card');
    const successCard = document.getElementById('success-state');
    
    if (!eventId) {
        spinner.innerHTML = '<p>Error: Missing event ID.</p>';
        return;
    }

    let eventData = null;
    let tConfig = null;
    let orgId = null;
    
    // --- LOAD EVENT DATA ---
    try {
        const doc = await firestore.collection('events').doc(eventId).get();
        if (!doc.exists) {
            spinner.innerHTML = '<p>Event not found.</p>';
            return;
        }
        eventData = doc.data();
        tConfig = eventData.ticketConfig || {};
        
        // Find OrgId based on organizerId
        const orgQuery = await firestore.collection('organizations')
            .where('ownerId', '==', eventData.organizerId)
            .get();
        if (!orgQuery.empty) {
            orgId = orgQuery.docs[0].id;
        }

        // Check if sales are open
        const today = new Date().toISOString().split('T')[0];
        const salesClosedMsg = document.getElementById('sales-closed-msg');
        let canBuy = true;
        
        if (tConfig.salesOpen === false) canBuy = false;
        if (tConfig.salesStart && today < tConfig.salesStart) canBuy = false;
        if (tConfig.salesEnd && today > tConfig.salesEnd) canBuy = false;
        if (tConfig.totalSeats && (tConfig.seatsSold || 0) >= tConfig.totalSeats) canBuy = false;

        document.getElementById('event-name').textContent = eventData.name;
        document.getElementById('event-date').textContent = new Date(eventData.eventDate).toLocaleDateString();

        document.getElementById('price-member').textContent = `₹${tConfig.memberPrice || 0}`;
        document.getElementById('price-nonmember').textContent = `₹${tConfig.nonmemberPrice || 0}`;

        if (!canBuy) {
            salesClosedMsg.style.display = 'flex';
            document.getElementById('checkout-btn').disabled = true;
            document.getElementById('checkout-btn').style.opacity = '0.5';
        }

        spinner.style.display = 'none';
        ticketCard.style.display = 'block';
        updateTotal();

    } catch (err) {
        console.error("Error loading event:", err);
        spinner.innerHTML = '<p>Failed to load event details.</p>';
    }

    // --- PRICE CALCULATION & VERIFICATION ---
    const radios = document.querySelectorAll('input[name="ticket-type"]');
    radios.forEach(r => r.addEventListener('change', updateTotal));

    function updateTotal() {
        if (!tConfig) return;
        const selected = document.querySelector('input[name="ticket-type"]:checked').value;
        const total = selected === 'member' ? (tConfig.memberPrice || 0) : (tConfig.nonmemberPrice || 0);
        document.getElementById('total-amount').textContent = `₹${total}`;
    }

    const emailInput = document.getElementById('buyer-email');
    const verifStatus = document.getElementById('member-verification-status');
    const memberRadio = document.querySelector('input[value="member"]');
    const nonmemberRadio = document.querySelector('input[value="nonmember"]');

    let debounceTimer;
    emailInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const email = e.target.value.trim().toLowerCase();
        
        if (!email.includes('@')) {
            verifStatus.style.display = 'none';
            memberRadio.disabled = false;
            return;
        }

        debounceTimer = setTimeout(async () => {
            if (!orgId) return;
            try {
                const q = await firestore.collection('members')
                    .where('orgId', '==', orgId)
                    .where('email', '==', email)
                    .get();

                if (!q.empty) {
                    const member = q.docs[0].data();
                    if (member.membershipStatus === 'active') {
                        verifStatus.className = 'alert-box success';
                        verifStatus.innerHTML = '<i class="ph-bold ph-check-circle"></i> Active member verified! Member discount applied.';
                        verifStatus.style.display = 'flex';
                        memberRadio.checked = true;
                        memberRadio.disabled = false;
                    } else {
                        verifStatus.className = 'alert-box warning';
                        verifStatus.innerHTML = `<i class="ph-bold ph-warning-circle"></i> Membership status is '${member.membershipStatus}'. Please pay dues to use member pricing.`;
                        verifStatus.style.display = 'flex';
                        nonmemberRadio.checked = true;
                        memberRadio.disabled = true;
                    }
                } else {
                    verifStatus.style.display = 'none';
                    nonmemberRadio.checked = true;
                }
                updateTotal();
            } catch(err) {
                console.error("Verification error:", err);
            }
        }, 500);
    });

    // --- SUBMIT ---
    document.getElementById('buy-ticket-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('buyer-name').value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const selectedType = document.querySelector('input[name="ticket-type"]:checked').value;

        // Validation (Task 3.5)
        if (name.length < 2) {
            showToast("Name must be at least 2 characters.", "danger"); return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast("Please enter a valid email address.", "danger"); return;
        }

        // Re-verify if they selected member manually without triggering the input check (just to be safe)
        if (selectedType === 'member') {
            if (!orgId) return showToast("Cannot verify membership. Error with org.", "danger");
            const q = await firestore.collection('members').where('orgId', '==', orgId).where('email', '==', email).get();
            if (q.empty || q.docs[0].data().membershipStatus !== 'active') {
                showToast("You are not an active member. Please select General Admission.", "danger");
                nonmemberRadio.checked = true;
                updateTotal();
                return;
            }
        }

        const btn = document.getElementById('checkout-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>Processing Payment...</span>';

        try {
            // Task 2.3: Duplicate ticket check
            const existingTicket = await firestore.collection('users')
                .where('eventDocId', '==', eventId)
                .where('contact', '==', email)
                .get();
            const alreadyHasTicket = existingTicket.docs.some(d => d.data().ticketType);
            if (alreadyHasTicket) {
                showToast("You've already purchased a ticket for this event.", "danger");
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-credit-card"></i> <span>Proceed to Payment</span>';
                return;
            }
            // Check seats again using transaction
            const eventRef = firestore.collection('events').doc(eventId);
            
            const qrToken = 'TKT_' + Math.random().toString(36).substr(2, 9).toUpperCase();
            
            // Build permissions from event stations
            let permissions = {};
            if (eventData.stations) {
                eventData.stations.forEach(s => {
                    permissions[s.name] = {
                        status: 'issued',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                });
            }

            await firestore.runTransaction(async (transaction) => {
                const evDoc = await transaction.get(eventRef);
                const evData = evDoc.data();
                const evConfig = evData.ticketConfig || {};
                const sold = evConfig.seatsSold || 0;
                
                if (evConfig.totalSeats && sold >= evConfig.totalSeats) {
                    throw new Error("SoldOut");
                }
                
                // Increment sold
                evConfig.seatsSold = sold + 1;
                transaction.update(eventRef, { ticketConfig: evConfig });
                
                // Create user
                const userRef = firestore.collection('users').doc();
                transaction.set(userRef, {
                    organizerId: evData.organizerId,
                    eventDocId: eventId,
                    eventId: evData.eventId,
                    name: name,
                    contact: email,
                    qrToken: qrToken,
                    permissions: permissions,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    ticketType: selectedType
                });

                // Auto-create transaction for Treasury
                const txnRef = firestore.collection('transactions').doc();
                const pricePaid = selectedType === 'member' ? (evConfig.memberPrice || 0) : (evConfig.nonmemberPrice || 0);
                if (pricePaid > 0) {
                    transaction.set(txnRef, {
                        orgId: orgId,
                        type: 'income',
                        amount: pricePaid,
                        category: 'tickets',
                        date: new Date().toISOString().split('T')[0],
                        description: `Ticket Purchase (${selectedType}): ${evData.name}`,
                        recordedBy: 'System',
                        recordedByName: 'System',
                        relatedDocId: userRef.id,
                        relatedDocType: 'ticket',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            // Trigger Email via GAS (Optional: call GOOGLE_SCRIPT_URL here)
            if (window.GOOGLE_SCRIPT_URL) {
                const payload = {
                    security_token: "PT_SECURE_2026",
                    type: 'participant',
                    event_name: eventData.name,
                    to_name: name,
                    to_email: email,
                    qr_link: `${window.location.origin}/viewer/viewer.html?token=${qrToken}`
                };
                fetch(window.GOOGLE_SCRIPT_URL, {
                    method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                }).catch(console.error);
            }

            // Success UI
            ticketCard.style.display = 'none';
            successCard.style.display = 'block';
            
            document.getElementById('qr-preview').innerHTML = `
                <a href="../viewer/viewer.html?token=${qrToken}" target="_blank" style="color:var(--primary); text-decoration:none; font-weight:bold;">
                    View Digital Pass
                </a>
                <br><br>
                <a href="../index.html" style="display:inline-block; padding:10px 24px; background:var(--primary, #6a11cb); color:#fff; border-radius:10px; text-decoration:none; font-weight:600;">← Back to Home</a>
            `;
            
        } catch (err) {
            console.error("Checkout error:", err);
            if (err.message === "SoldOut") {
                showToast("Sorry, tickets are sold out!", "danger");
                document.getElementById('sales-closed-msg').style.display = 'flex';
            } else {
                showToast("Payment failed. Please try again.", "danger");
            }
            btn.disabled = false;
            btn.innerHTML = '<i class="ph-bold ph-credit-card"></i> <span>Proceed to Payment</span>';
        }
    });

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-x-circle';
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
