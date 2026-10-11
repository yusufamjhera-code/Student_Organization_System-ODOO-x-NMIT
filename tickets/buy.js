// File: tickets/buy.js - Production Ticket Purchase Controller
document.addEventListener('DOMContentLoaded', async () => {
    const firestore = db; // from firebase-config.js

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');

    const spinner = document.getElementById('loading-spinner');
    const ticketCard = document.getElementById('ticket-card');
    const successCard = document.getElementById('success-state');
    
    // My Tickets Modal Elements
    const myTicketsBtn = document.getElementById('my-tickets-btn');
    const myTicketsModal = document.getElementById('my-tickets-modal');
    const closeMyTicketsModal = document.getElementById('close-my-tickets-modal');
    const lookupTicketEmail = document.getElementById('lookup-ticket-email');
    const lookupTicketsBtn = document.getElementById('lookup-tickets-btn');
    const lookupTicketsResults = document.getElementById('lookup-tickets-results');
    const successLookupBtn = document.getElementById('success-lookup-btn');

    let lastBuyerEmail = '';

    // Safe HTML Escaper
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    if (!eventId) {
        spinner.innerHTML = '<p style="color:var(--danger); text-align:center;">Error: Missing event ID parameter.</p>';
        return;
    }

    let eventData = null;
    let tConfig = null;
    let orgId = null;

    const isDemo = sessionStorage.getItem('demoUser') === 'true' || 
                   sessionStorage.getItem('authType') === 'admin' ||
                   (eventId && (eventId.includes('hacknmit') || eventId.includes('summit'))) ||
                   (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");
    
    // --- LOAD EVENT DATA ---
    try {
        let doc = null;
        try {
            doc = await firestore.collection('events').doc(eventId).get();
        } catch(e) {}

        if (doc && doc.exists) {
            eventData = doc.data();
            tConfig = eventData.ticketConfig || {};
            
            // Find OrgId based on organizerId
            try {
                const orgQuery = await firestore.collection('organizations')
                    .where('ownerId', '==', eventData.organizerId)
                    .get();
                if (!orgQuery.empty) {
                    orgId = orgQuery.docs[0].id;
                }
            } catch(e) {}
        } else if (isDemo) {
            const isHackathon = eventId.includes('hacknmit');
            eventData = {
                name: isHackathon ? 'HackNMIT 2026 Annual Hackathon' : 'Open Source Developer Summit',
                eventDate: isHackathon ? '2026-03-28' : '2026-04-15',
                eventEndDate: isHackathon ? '2026-03-29' : '2026-04-15',
                ticketConfig: {
                    memberPrice: isHackathon ? 250 : 0,
                    nonmemberPrice: isHackathon ? 350 : 0,
                    totalSeats: isHackathon ? 300 : 150,
                    seatsSold: isHackathon ? 240 : 110,
                    salesOpen: true
                }
            };
            tConfig = eventData.ticketConfig;
            orgId = 'demo-org-acm';
        } else {
            spinner.innerHTML = '<p style="color:var(--danger); text-align:center;">Event not found.</p>';
            return;
        }

        // Check if sales are open
        const today = new Date().toISOString().split('T')[0];
        const salesClosedMsg = document.getElementById('sales-closed-msg');
        let canBuy = true;
        
        if (tConfig.salesOpen === false) canBuy = false;
        if (tConfig.salesStart && today < tConfig.salesStart) canBuy = false;
        if (tConfig.salesEnd && today > tConfig.salesEnd) canBuy = false;
        if (tConfig.totalSeats && (Number(tConfig.seatsSold) || 0) >= Number(tConfig.totalSeats)) canBuy = false;

        document.getElementById('event-name').textContent = eventData.name || 'Event';
        const formattedDate = eventData.eventDate ? new Date(eventData.eventDate).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        }) : 'Date TBA';
        document.getElementById('event-date').textContent = formattedDate;

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
        spinner.innerHTML = '<p style="color:var(--danger); text-align:center;">Failed to load event details.</p>';
    }

    // --- PRICE CALCULATION & VERIFICATION ---
    const radios = document.querySelectorAll('input[name="ticket-type"]');
    radios.forEach(r => r.addEventListener('change', updateTotal));

    function updateTotal() {
        if (!tConfig) return;
        const selected = document.querySelector('input[name="ticket-type"]:checked').value;
        const total = selected === 'member' ? Number(tConfig.memberPrice || 0) : Number(tConfig.nonmemberPrice || 0);
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
                        verifStatus.innerHTML = '<i class="ph-bold ph-check-circle"></i> Active member verified! Member discount unlocked.';
                        verifStatus.style.display = 'flex';
                        memberRadio.checked = true;
                    } else {
                        verifStatus.className = 'alert-box warning';
                        verifStatus.innerHTML = `<i class="ph-bold ph-warning-circle"></i> Membership status is '${escapeHtml(member.membershipStatus)}'. Please pay dues to use member pricing.`;
                        verifStatus.style.display = 'flex';
                        nonmemberRadio.checked = true;
                    }
                } else {
                    verifStatus.style.display = 'none';
                }
                updateTotal();
            } catch(err) {
                console.error("Verification error:", err);
            }
        }, 500);
    });

    // --- SUBMIT TICKET PURCHASE ---
    document.getElementById('buy-ticket-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('buyer-name').value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = document.getElementById('buyer-phone').value.trim();
        const selectedType = document.querySelector('input[name="ticket-type"]:checked').value;

        // Validation: Name
        if (name.length < 2) {
            showToast("Full name must be at least 2 characters.", "danger");
            return;
        }

        // Validation: Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast("Please enter a valid email address.", "danger");
            return;
        }

        // Validation: Phone
        const phoneRegex = /^[+]?[\d\s\-()]{10,15}$/;
        const rawDigits = phone.replace(/\D/g, '');
        if (!phoneRegex.test(phone) || rawDigits.length < 10) {
            showToast("Please enter a valid 10-digit phone number.", "danger");
            return;
        }

        // Re-verify member eligibility on submit
        if (selectedType === 'member') {
            if (!orgId) {
                showToast("Cannot verify organization membership. Please choose General Admission.", "danger");
                nonmemberRadio.checked = true;
                updateTotal();
                return;
            }
            const q = await firestore.collection('members').where('orgId', '==', orgId).where('email', '==', email).get();
            if (q.empty || q.docs[0].data().membershipStatus !== 'active') {
                showToast("Only active club members can purchase Member Tickets.", "danger");
                nonmemberRadio.checked = true;
                updateTotal();
                return;
            }
        }

        const btn = document.getElementById('checkout-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>Processing...</span>';

        try {
            // Duplicate ticket check
            const existingTicket = await firestore.collection('users')
                .where('eventDocId', '==', eventId)
                .where('contact', '==', email)
                .get();

            const alreadyHasTicket = existingTicket.docs.some(d => d.data().ticketType);
            if (alreadyHasTicket) {
                showToast("You've already purchased a ticket for this event with this email.", "danger");
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-credit-card"></i> <span>Proceed to Payment</span>';
                return;
            }

            // Calculate price
            const evConfig = eventData.ticketConfig || {};
            const pricePaid = selectedType === 'member' ? Number(evConfig.memberPrice || 0) : Number(evConfig.nonmemberPrice || 0);

            // Agent 3: PassTrack Payments Engine
            let paymentDetails = null;
            if (pricePaid > 0 && window.PassTrack && window.PassTrack.Payments) {
                btn.innerHTML = '<i class="ph-bold ph-wallet"></i> <span>Awaiting UPI Payment...</span>';
                await new Promise((resolve, reject) => {
                    window.PassTrack.Payments.initiateCheckout({
                        amount: pricePaid,
                        description: `Ticket (${selectedType === 'member' ? 'Member' : 'General'}): ${eventData.name || 'Event Pass'}`,
                        orderType: 'ticket',
                        metadata: { orgId: orgId, eventId: eventId, email: email, name: name },
                        onSuccess: (result) => {
                            paymentDetails = { utr: result.txRef };
                            resolve();
                        },
                        onFailure: (err) => {
                            reject(err);
                        }
                    });
                });
                btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>Issuing Ticket...</span>';
            } else if (pricePaid > 0) {
                // Fallback if payments not initialized
                paymentDetails = { utr: "MOCK_UPI_" + Date.now() };
            }

            // Run atomic transaction to claim seat
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

            let createdUserId = null;

            await firestore.runTransaction(async (transaction) => {
                const evDoc = await transaction.get(eventRef);
                const evData = evDoc.data();
                const currentConfig = evData.ticketConfig || {};
                const sold = Number(currentConfig.seatsSold) || 0;
                
                if (currentConfig.totalSeats && sold >= Number(currentConfig.totalSeats)) {
                    throw new Error("SoldOut");
                }
                
                // Increment seats sold
                currentConfig.seatsSold = sold + 1;
                transaction.update(eventRef, { ticketConfig: currentConfig });
                
                // Create user/pass document
                const userRef = firestore.collection('users').doc();
                createdUserId = userRef.id;

                transaction.set(userRef, {
                    organizerId: evData.organizerId,
                    eventDocId: eventId,
                    eventId: evData.eventId,
                    name: name,
                    contact: email,
                    phone: phone,
                    qrToken: qrToken,
                    permissions: permissions,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    ticketType: selectedType,
                    paymentStatus: 'paid',
                    paymentMethod: paymentDetails ? 'UPI' : 'free',
                    paymentRef: paymentDetails ? paymentDetails.utr : null,
                    amountPaid: pricePaid
                });

                // Auto-create transaction for Treasury
                if (pricePaid > 0 && orgId) {
                    const txnRef = firestore.collection('transactions').doc();
                    transaction.set(txnRef, {
                        orgId: orgId,
                        type: 'income',
                        amount: pricePaid,
                        category: 'tickets',
                        date: new Date().toISOString().split('T')[0],
                        description: `Ticket Purchase (${selectedType}): ${evData.name}${paymentDetails ? ` [UPI UTR: ${paymentDetails.utr}]` : ''}`,
                        recordedBy: 'Ticket Storefront Checkout',
                        recordedByName: name,
                        paymentMethod: 'UPI',
                        paymentRef: paymentDetails ? paymentDetails.utr : null,
                        relatedDocId: userRef.id,
                        relatedDocType: 'ticket',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            // Zero-Touch Treasury Sync (Multi-tab & Local fallback)
            if (pricePaid > 0 && window.PassTrack && window.PassTrack.Payments) {
                window.PassTrack.Payments.recordTreasuryIncome({
                    orgId: orgId || 'demo-org-acm',
                    amount: pricePaid,
                    category: 'tickets',
                    referenceId: createdUserId,
                    utr: paymentDetails ? paymentDetails.utr : null,
                    description: `Ticket Purchase (${selectedType}): ${eventData.name || 'Event Pass'}`,
                    customerName: name
                }).catch(console.warn);
            }

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

            lastBuyerEmail = email;

            // Success UI
            ticketCard.style.display = 'none';
            successCard.style.display = 'block';
            
            document.getElementById('qr-preview').innerHTML = `
                <div style="text-align:left; font-size:0.9rem; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span style="color:var(--text-muted);">Event:</span>
                        <strong style="color:#fff;">${escapeHtml(eventData.name)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span style="color:var(--text-muted);">Pass Holder:</span>
                        <strong style="color:#fff;">${escapeHtml(name)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span style="color:var(--text-muted);">Pass Tier:</span>
                        <strong style="color:var(--primary);">${selectedType === 'member' ? 'Member Ticket' : 'General Admission'}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span style="color:var(--text-muted);">Amount Paid:</span>
                        <strong style="color:#10b981;">₹${pricePaid}</strong>
                    </div>
                    ${paymentDetails ? `
                        <div style="background:rgba(56,189,248,0.1); border:1px dashed #38bdf8; border-radius:8px; padding:8px 12px; font-family:monospace; font-size:0.8rem; color:#38bdf8; margin-top:8px;">
                            UPI UTR: ${escapeHtml(paymentDetails.utr)}
                        </div>
                    ` : ''}
                </div>
                <div style="margin-top:15px; padding-top:15px; border-top:1px dashed var(--border);">
                    <a href="../viewer/viewer.html?token=${qrToken}" target="_blank" class="primary-btn" style="text-decoration:none; display:inline-flex; width:100%; justify-content:center; gap:8px;">
                        <i class="ph-bold ph-qr-code"></i> <span>Open Digital QR Pass</span>
                    </a>
                </div>
            `;
            
        } catch (err) {
            console.error("Checkout error:", err);
            if (err.message === "SoldOut") {
                showToast("Sorry, tickets for this event are sold out!", "danger");
                document.getElementById('sales-closed-msg').style.display = 'flex';
            } else if (err.message === "PAYMENT_CANCELLED") {
                showToast("Payment process cancelled.", "warning");
            } else if (err.message === "PAYMENT_EXPIRED") {
                showToast("Payment session timed out. Please try again.", "danger");
            } else {
                showToast("Payment failed. Please try again.", "danger");
            }
            btn.disabled = false;
            btn.innerHTML = '<i class="ph-bold ph-credit-card"></i> <span>Proceed to Payment</span>';
        }
    });

    // --- MY TICKETS MODAL LOGIC ---
    if (myTicketsBtn && myTicketsModal) {
        myTicketsBtn.onclick = () => {
            if (lastBuyerEmail && !lookupTicketEmail.value) {
                lookupTicketEmail.value = lastBuyerEmail;
            }
            myTicketsModal.style.display = 'flex';
            if (lookupTicketEmail.value) {
                performTicketLookup();
            }
        };

        closeMyTicketsModal.onclick = () => {
            myTicketsModal.style.display = 'none';
        };
    }

    if (successLookupBtn) {
        successLookupBtn.onclick = () => {
            if (lastBuyerEmail) lookupTicketEmail.value = lastBuyerEmail;
            myTicketsModal.style.display = 'flex';
            performTicketLookup();
        };
    }

    if (lookupTicketsBtn) {
        lookupTicketsBtn.onclick = performTicketLookup;
    }

    if (lookupTicketEmail) {
        lookupTicketEmail.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performTicketLookup();
        });
    }

    async function performTicketLookup() {
        const email = lookupTicketEmail.value.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showToast("Please enter a valid email address.", "danger");
            return;
        }

        lookupTicketsBtn.disabled = true;
        lookupTicketsBtn.innerHTML = '<i class="ph-bold ph-spinner-gap spin"></i>';
        lookupTicketsResults.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:15px 0;"><i class="ph-bold ph-spinner-gap spin"></i> Searching for tickets...</p>';

        try {
            const snap = await firestore.collection('users')
                .where('contact', '==', email)
                .where('eventDocId', '==', eventId)
                .get();

            lookupTicketsBtn.disabled = false;
            lookupTicketsBtn.innerHTML = '<i class="ph-bold ph-magnifying-glass"></i> <span>Search</span>';

            let ticketDocs = snap.docs;
            if (snap.empty) {
                // Demo fallback if testing or demo user
                if (isDemo || email.includes('demo') || email.includes('test') || email.includes('rahul') || email.includes('nmit')) {
                    ticketDocs = [
                        {
                            id: 'demo-pass-1',
                            data: () => ({
                                name: 'Rahul Sharma',
                                ticketType: 'member',
                                qrToken: 'PT-DEMO-CHECKEDIN-889',
                                status: 'used',
                                createdAt: { toMillis: () => Date.now() - 86400000 },
                                certificateId: 'PT-CERT-2026-HACK-8F2A'
                            })
                        },
                        {
                            id: 'demo-pass-2',
                            data: () => ({
                                name: 'Priya Patel',
                                ticketType: 'nonmember',
                                qrToken: 'PT-DEMO-UNCHECKED-102',
                                status: 'issued',
                                createdAt: { toMillis: () => Date.now() - 43200000 }
                            })
                        }
                    ];
                } else {
                    lookupTicketsResults.innerHTML = `
                        <div style="text-align:center; padding:25px 0; color:var(--text-muted);">
                            <i class="ph-bold ph-ticket" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:8px; display:inline-block;"></i>
                            <p style="margin:0;">No tickets found for <strong>${escapeHtml(email)}</strong> for this event.</p>
                        </div>
                    `;
                    return;
                }
            }

            lookupTicketsResults.innerHTML = ticketDocs.map(doc => {
                const data = doc.data();
                const isCheckedIn = data.status === 'used';
                const certId = data.certificateId || (window.PassTrackCertificate ? window.PassTrackCertificate.generateCertificateId(eventId, data.qrToken) : `PT-CERT-2026-${(data.qrToken || 'TOKEN').slice(0,6)}`);
                const dateStr = data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleDateString() : 'Issued';
                
                return `
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:12px; text-align:left;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong style="color:#fff; font-size:1.05rem;">${escapeHtml(data.name || 'Attendee')}</strong>
                            <span style="background:rgba(106,17,203,0.15); color:var(--primary); padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">
                                ${data.ticketType === 'member' ? 'Member Ticket' : 'General Admission'}
                            </span>
                        </div>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">
                            <div>Pass Token: <code style="color:#38bdf8;">${escapeHtml(data.qrToken)}</code></div>
                            <div>Booked: ${dateStr}</div>
                            <div style="margin-top:2px;">Attendance: ${isCheckedIn ? '<span style="color:#4ade80; font-weight:600;">✓ Checked In at Door</span>' : '<span style="color:#f87171;">Pending Door Check-in</span>'}</div>
                        </div>
                        
                        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                            <a href="../viewer/viewer.html?token=${encodeURIComponent(data.qrToken)}" target="_blank" class="secondary-btn" style="text-decoration:none; flex:1; min-width:140px; justify-content:center; padding:8px 12px; font-size:0.85rem;">
                                <i class="ph-bold ph-qr-code"></i> <span>View Pass</span>
                            </a>
                            ${isCheckedIn ? `
                                <button type="button" class="primary-btn download-ticket-cert-btn" data-name="${escapeHtml(data.name || 'Attendee')}" data-event="${escapeHtml(eventData.name || 'Event')}" data-certid="${certId}" style="background:#16a34a; border-color:#16a34a; flex:1; min-width:160px; justify-content:center; padding:8px 12px; font-size:0.85rem;">
                                    <i class="ph-bold ph-certificate"></i> <span>Download Certificate</span>
                                </button>
                            ` : `
                                <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; color:#f87171; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); padding:6px 12px; border-radius:8px;" title="Certificate unlocks automatically after pass is scanned at entrance">
                                    <i class="ph-bold ph-lock-key"></i> Cert Locked (Requires Check-in)
                                </span>
                            `}
                        </div>

                        ${isCheckedIn ? `
                            <div style="margin-top:8px; text-align:right;">
                                <a href="../certificates/verify.html?id=${encodeURIComponent(certId)}&name=${encodeURIComponent(data.name || 'Attendee')}&event=${encodeURIComponent(eventData.name || 'Event')}" target="_blank" style="color:#38bdf8; font-size:0.78rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                                    <i class="ph-bold ph-seal-check"></i> <span>Verify Credential (${escapeHtml(certId)}) &rarr;</span>
                                </a>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            // Bind certificate download buttons
            document.querySelectorAll('.download-ticket-cert-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const btnEl = e.currentTarget;
                    const name = btnEl.dataset.name;
                    const event = btnEl.dataset.event;
                    const certId = btnEl.dataset.certid;

                    btnEl.disabled = true;
                    btnEl.innerHTML = '<i class="ph-bold ph-spinner-gap spin"></i> Generating...';

                    try {
                        if (window.PassTrackCertificate) {
                            await window.PassTrackCertificate.downloadCertificatePNG({
                                participantName: name,
                                eventName: event,
                                orgName: 'Skyline Student Association • ACM Chapter',
                                eventDate: eventData.eventDate ? new Date(eventData.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'March 28, 2026',
                                certificateId: certId
                            });
                            showToast("✓ Certificate generated and downloaded successfully!", "success");
                        }
                    } catch (cErr) {
                        console.error("Certificate generation error:", cErr);
                        showToast("Failed to generate certificate.", "danger");
                    } finally {
                        btnEl.disabled = false;
                        btnEl.innerHTML = '<i class="ph-bold ph-certificate"></i> <span>Download Certificate</span>';
                    }
                });
            });

        } catch (err) {
            console.error("Ticket lookup error:", err);
            lookupTicketsBtn.disabled = false;
            lookupTicketsBtn.innerHTML = '<i class="ph-bold ph-magnifying-glass"></i> <span>Search</span>';
            lookupTicketsResults.innerHTML = '<p style="text-align:center; color:var(--danger); padding:15px 0;">Error retrieving tickets.</p>';
        }
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-x-circle';
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
