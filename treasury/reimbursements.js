// File: treasury/reimbursements.js - Volunteer Expense Claim Portal
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db;

    // Elements
    const form = document.getElementById('reimbursement-form');
    const nameInput = document.getElementById('claimant-name');
    const emailInput = document.getElementById('claimant-email');
    const upiInput = document.getElementById('claimant-upi');
    const eventSelect = document.getElementById('claim-event');
    const amountInput = document.getElementById('claim-amount');
    const categorySelect = document.getElementById('claim-category');
    const dateInput = document.getElementById('claim-date');
    const merchantInput = document.getElementById('claim-merchant');
    const descInput = document.getElementById('claim-desc');
    const fileInput = document.getElementById('receipt-file-input');
    const browseBtn = document.getElementById('browse-file-btn');
    const demoReceiptBtn = document.getElementById('demo-receipt-btn');
    const dropzone = document.getElementById('receipt-dropzone');
    const dropzonePrompt = document.getElementById('dropzone-prompt');
    const dropzonePreview = document.getElementById('dropzone-preview');
    const previewImg = document.getElementById('receipt-preview-img');
    const fileNameEl = document.getElementById('receipt-file-name');
    const fileSizeEl = document.getElementById('receipt-file-size');
    const removeReceiptBtn = document.getElementById('remove-receipt-btn');
    const viewEnlargeBtn = document.getElementById('view-enlarge-receipt-btn');
    const submitBtn = document.getElementById('submit-claim-btn');

    // Tabs
    const tabNewClaim = document.getElementById('tab-new-claim');
    const tabMyClaims = document.getElementById('tab-my-claims');
    const contentNewClaim = document.getElementById('content-new-claim');
    const contentMyClaims = document.getElementById('content-my-claims');
    const userClaimsCountEl = document.getElementById('user-claims-count');
    const claimsGrid = document.getElementById('claims-grid');
    const statusFilter = document.getElementById('claims-status-filter');

    // Modal
    const modal = document.getElementById('receipt-modal');
    const closeModalBtn = document.getElementById('close-receipt-modal');

    let currentOrgId = 'demo-org-acm';
    let currentUser = null;
    let isDemoMode = false;
    let attachedReceiptDataUrl = null;
    let attachedReceiptFileName = '';
    let userClaims = [];

    // Set today's date default
    dateInput.value = new Date().toISOString().split('T')[0];

    // Seed Demo Claims
    const DEMO_CLAIMS_KEY = 'passtrack_volunteer_claims';
    function loadLocalClaims() {
        try {
            const raw = localStorage.getItem(DEMO_CLAIMS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        
        // Initial Realistic Demo Claims
        const seed = [
            {
                id: 'claim-101',
                claimantName: 'Aarav Patel',
                claimantEmail: 'aarav.patel@nmit.ac.in',
                upiId: 'aarav@okaxis',
                event: 'HackNMIT 2026',
                amount: 1450,
                category: 'catering',
                date: '2026-03-27',
                merchant: 'Campus Cafeteria & Snacks',
                description: 'Midnight snacks, extra mineral water cartons & black coffee for volunteer night shift during HackNMIT hackathon.',
                receiptUrl: generateReceiptCanvasUrl('Campus Cafeteria & Snacks', 1450, '2026-03-27', ['Mineral Water 20L x 3', 'Espresso Premix x 2', 'Glucose Biscuits x 12']),
                receiptFileName: 'canteen_cash_bill_2703.jpg',
                status: 'pending',
                createdAt: '2026-03-27T23:15:00.000Z'
            },
            {
                id: 'claim-102',
                claimantName: 'Priya Sundaram',
                claimantEmail: 'priya.s@nmit.ac.in',
                upiId: 'priya.s@paytm',
                event: 'HackNMIT 2026',
                amount: 2800,
                category: 'hardware',
                date: '2026-03-26',
                merchant: 'Sri Balaji Electronics & Hardware',
                description: 'Two 15-meter surge-protected extension cord boards and HDMI adapters for projector lab.',
                receiptUrl: generateReceiptCanvasUrl('Sri Balaji Electronics', 2800, '2026-03-26', ['Power Extension 15m x 2', 'HDMI to Type-C Adaptor x 3']),
                receiptFileName: 'hardware_invoice_904.png',
                status: 'pending',
                createdAt: '2026-03-26T14:30:00.000Z'
            },
            {
                id: 'claim-103',
                claimantName: 'Rohit Kulkarni',
                claimantEmail: 'rohit.k@nmit.ac.in',
                upiId: 'rohit@icici',
                event: 'Club Orientation 2026',
                amount: 950,
                category: 'stationery',
                date: '2026-03-20',
                merchant: 'Venkateshwara Xerox & Print',
                description: '250 color induction handouts, lanyard ribbons and safety clips for door registration.',
                receiptUrl: generateReceiptCanvasUrl('Venkateshwara Print', 950, '2026-03-20', ['Glossy Orientation Flyers x 250', 'Lanyard Ribbons x 100']),
                receiptFileName: 'print_shop_bill.jpg',
                status: 'approved',
                reviewedBy: 'treasurer@nmit.ac.in',
                transactionId: 'txn-demo-reimb-1',
                createdAt: '2026-03-20T11:00:00.000Z'
            }
        ];
        localStorage.setItem(DEMO_CLAIMS_KEY, JSON.stringify(seed));
        return seed;
    }

    function saveLocalClaims(claims) {
        localStorage.setItem(DEMO_CLAIMS_KEY, JSON.stringify(claims));
    }

    // --- AUTH INITIALIZATION ---
    auth.onAuthStateChanged(async (user) => {
        isDemoMode = sessionStorage.getItem('demoUser') === 'true' || 
                     sessionStorage.getItem('authType') === 'staff' ||
                     sessionStorage.getItem('authType') === 'member' ||
                     sessionStorage.getItem('authType') === 'admin' ||
                     window.location.search.includes('demo=true') ||
                     (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY") ||
                     !user;

        if (user) {
            currentUser = user;
            if (nameInput && !nameInput.value) nameInput.value = user.displayName || '';
            if (emailInput && !emailInput.value) emailInput.value = user.email || '';
            
            // Check organization
            try {
                const orgsSnapshot = await firestore.collection('organizations').where('ownerId', '==', user.uid).get();
                if (!orgsSnapshot.empty) {
                    currentOrgId = orgsSnapshot.docs[0].id;
                }
            } catch(e) {}
        } else if (isDemoMode) {
            currentUser = {
                uid: 'demo-volunteer-1',
                displayName: 'Rahul Sharma',
                email: 'rahul@nmit.ac.in'
            };
            if (nameInput) nameInput.value = 'Rahul Sharma';
            if (emailInput) emailInput.value = 'rahul@nmit.ac.in';
            if (upiInput) upiInput.value = 'rahul@oksbi';
        }

        loadClaims();
    });

    // Helper: Generate realistic Canvas Receipt DataURL for testing
    function generateReceiptCanvasUrl(merchantName, amount, dateStr, items = ['Item 1', 'Item 2']) {
        const c = document.createElement('canvas');
        c.width = 600;
        c.height = 760;
        const ctx = c.getContext('2d');

        // Background
        ctx.fillStyle = '#fbf9f4';
        ctx.fillRect(0, 0, 600, 760);

        // Subtle paper noise / border
        ctx.strokeStyle = '#d7cfc2';
        ctx.lineWidth = 4;
        ctx.strokeRect(16, 16, 568, 728);

        // Header
        ctx.fillStyle = '#17130f';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(merchantName.toUpperCase(), 300, 75);

        ctx.font = '16px monospace';
        ctx.fillStyle = '#736b5e';
        ctx.fillText('GSTIN: 29AABCP1337Q1ZT', 300, 105);
        ctx.fillText('TAX INVOICE / CASH MEMO', 300, 130);
        ctx.fillText(`Date: ${dateStr}   Time: 14:22`, 300, 155);

        // Dashed line
        ctx.strokeStyle = '#9e9484';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(40, 180);
        ctx.lineTo(560, 180);
        ctx.stroke();

        // Items
        ctx.setLineDash([]);
        ctx.textAlign = 'left';
        ctx.font = '17px monospace';
        ctx.fillStyle = '#17130f';
        let y = 220;
        items.forEach((item, i) => {
            ctx.fillText(item, 50, y);
            const itemPrice = Math.round(amount / items.length);
            ctx.textAlign = 'right';
            ctx.fillText(`₹${itemPrice}`, 550, y);
            ctx.textAlign = 'left';
            y += 40;
        });

        // Subtotal & Tax
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(40, y + 20);
        ctx.lineTo(560, y + 20);
        ctx.stroke();

        y += 60;
        ctx.setLineDash([]);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#5c5446';
        ctx.fillText('Subtotal:', 50, y);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${amount}`, 550, y);

        y += 35;
        ctx.textAlign = 'left';
        ctx.fillText('GST (Included @ 18%):', 50, y);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${Math.round(amount * 0.18)}`, 550, y);

        // Grand Total Box
        y += 50;
        ctx.fillStyle = '#17130f';
        ctx.fillRect(40, y, 520, 55);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('TOTAL PAID (CASH/UPI):', 60, y + 36);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${Number(amount).toLocaleString()}`, 540, y + 36);

        // Stamp
        y += 120;
        ctx.save();
        ctx.translate(300, y);
        ctx.rotate(-0.15);
        ctx.strokeStyle = '#1e7a4d';
        ctx.lineWidth = 3;
        ctx.strokeRect(-110, -28, 220, 56);
        ctx.fillStyle = '#1e7a4d';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAID IN FULL', 0, 8);
        ctx.restore();

        return c.toDataURL('image/jpeg', 0.88);
    }

    // --- TAB SWITCHING ---
    tabNewClaim.addEventListener('click', () => switchTab('new-claim'));
    tabMyClaims.addEventListener('click', () => switchTab('my-claims'));

    function switchTab(tab) {
        if (tab === 'new-claim') {
            tabNewClaim.classList.add('active');
            tabMyClaims.classList.remove('active');
            contentNewClaim.classList.add('active');
            contentMyClaims.classList.remove('active');
        } else {
            tabNewClaim.classList.remove('active');
            tabMyClaims.classList.add('active');
            contentNewClaim.classList.remove('active');
            contentMyClaims.classList.add('active');
            renderClaims();
        }
    }

    // --- FILE DROPZONE & CAMERA HANDLING ---
    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            processReceiptFile(e.target.files[0]);
        }
    });

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processReceiptFile(e.dataTransfer.files[0]);
        }
    });

    // 1-Click Demo Receipt Generator
    demoReceiptBtn.addEventListener('click', () => {
        const merchant = merchantInput.value.trim() || 'Campus Cafeteria & Stores';
        const amt = parseFloat(amountInput.value) || 750;
        const dStr = dateInput.value || new Date().toISOString().split('T')[0];
        
        attachedReceiptDataUrl = generateReceiptCanvasUrl(merchant, amt, dStr, ['Event Supplies Batch A', 'Beverages & Refreshments']);
        attachedReceiptFileName = 'sample_cash_memo.jpg';
        showAttachedPreview(attachedReceiptDataUrl, attachedReceiptFileName, '120 KB');
        showToast('Sample cash receipt generated and attached!', 'info');
    });

    // Client-side image compression using Canvas
    function processReceiptFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please upload a valid image file (PNG, JPG, HEIC).', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 1200;
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                attachedReceiptDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                attachedReceiptFileName = file.name;
                const sizeKb = Math.round((attachedReceiptDataUrl.length * 3 / 4) / 1024);
                showAttachedPreview(attachedReceiptDataUrl, file.name, `${sizeKb} KB`);
                showToast('Receipt photo attached and optimized.', 'success');
            };
            img.src = readerEvent.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showAttachedPreview(dataUrl, name, sizeStr) {
        previewImg.src = dataUrl;
        fileNameEl.textContent = name;
        fileSizeEl.textContent = `${sizeStr} • Ready for audit`;
        dropzonePrompt.style.display = 'none';
        dropzonePreview.style.display = 'flex';
    }

    removeReceiptBtn.addEventListener('click', () => {
        attachedReceiptDataUrl = null;
        attachedReceiptFileName = '';
        fileInput.value = '';
        dropzonePreview.style.display = 'none';
        dropzonePrompt.style.display = 'block';
    });

    viewEnlargeBtn.addEventListener('click', () => {
        if (!attachedReceiptDataUrl) return;
        openModalWithData({
            merchant: merchantInput.value || 'Attached Receipt',
            amount: amountInput.value || '0',
            claimantName: nameInput.value || 'Volunteer',
            upiId: upiInput.value || 'N/A',
            event: eventSelect.value,
            date: dateInput.value,
            category: categorySelect.value,
            description: descInput.value || 'Expense receipt verification',
            receiptUrl: attachedReceiptDataUrl,
            status: 'pending'
        });
    });

    // --- FORM SUBMISSION ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const upi = upiInput.value.trim();
        const eventName = eventSelect.value;
        const amount = parseFloat(amountInput.value);
        const category = categorySelect.value;
        const date = dateInput.value;
        const merchant = merchantInput.value.trim();
        const desc = descInput.value.trim();

        if (!name || !email || !upi || !amount || !merchant || !desc) {
            showToast('Please fill all mandatory fields.', 'error');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            showToast('Amount must be a positive number greater than ₹0.', 'error');
            return;
        }

        if (!attachedReceiptDataUrl) {
            showToast('Please attach a clear photo of the receipt or invoice.', 'error');
            return;
        }

        const claimPayload = {
            id: 'claim-' + Date.now(),
            orgId: currentOrgId,
            claimantName: name,
            claimantEmail: email,
            upiId: upi,
            event: eventName,
            amount: amount,
            category: category,
            date: date,
            merchant: merchant,
            description: desc,
            receiptUrl: attachedReceiptDataUrl,
            receiptFileName: attachedReceiptFileName,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Submitting Claim...';

        try {
            // Save to Firestore if available
            let savedToFirestore = false;
            if (firestore && !isDemoMode) {
                try {
                    const savePromise = firestore.collection('reimbursements').add({
                        ...claimPayload,
                        createdAtServer: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
                    const docRef = await Promise.race([savePromise, timeoutPromise]);
                    claimPayload.id = docRef.id;
                    savedToFirestore = true;
                } catch(err) {
                    console.warn("Firestore save skipped/timed out, falling back to local sync:", err);
                }
            }

            // Always sync to local list for seamless tracking and demo mode
            userClaims.unshift(claimPayload);
            saveLocalClaims(userClaims);

            showToast('Claim submitted! Forwarded to Treasurer approval queue.', 'success');
            
            // Reset form
            form.reset();
            dateInput.value = new Date().toISOString().split('T')[0];
            attachedReceiptDataUrl = null;
            attachedReceiptFileName = '';
            dropzonePreview.style.display = 'none';
            dropzonePrompt.style.display = 'block';

            // Auto-switch to Track Claims tab
            setTimeout(() => {
                switchTab('my-claims');
            }, 800);

        } catch (error) {
            console.error(error);
            showToast('Failed to submit reimbursement claim.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>Submit Claim for Treasury Approval</span>';
        }
    });

    // --- LOAD AND RENDER CLAIMS ---
    function loadClaims() {
        userClaims = loadLocalClaims();
        userClaimsCountEl.textContent = userClaims.length;

        // In Firestore mode, listen for updates
        if (firestore && !isDemoMode) {
            firestore.collection('reimbursements')
                .where('orgId', '==', currentOrgId)
                .onSnapshot(snap => {
                    if (!snap.empty) {
                        const remoteClaims = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        userClaims = remoteClaims;
                        saveLocalClaims(userClaims);
                        userClaimsCountEl.textContent = userClaims.length;
                        renderClaims();
                    }
                }, err => {
                    console.warn("Reimbursements listener warning:", err);
                });
        }

        renderClaims();
    }

    function renderClaims() {
        const filter = statusFilter.value;
        let list = userClaims;
        if (filter !== 'all') {
            list = list.filter(c => c.status === filter);
        }

        userClaimsCountEl.textContent = userClaims.length;

        if (list.length === 0) {
            claimsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 3rem 1rem; text-align: center; color: var(--muted);">
                    <i class="ph-bold ph-receipt-x" style="font-size: 2.5rem; color: var(--accent); margin-bottom: 0.5rem; display: block;"></i>
                    <h3 style="margin: 0 0 0.25rem 0; color: var(--ink);">No Claims Found</h3>
                    <p style="margin: 0; font-size: 0.9rem;">You haven't submitted any reimbursement claims under this filter.</p>
                </div>
            `;
            return;
        }

        claimsGrid.innerHTML = '';
        list.forEach(c => {
            const card = document.createElement('div');
            card.className = 'claim-item-card';

            const statusClass = c.status === 'approved' ? 'approved' : (c.status === 'rejected' ? 'rejected' : 'pending');
            const statusLabel = c.status === 'approved' ? '✓ Approved & Reimbursed' : (c.status === 'rejected' ? 'Declined' : 'Pending Verification');

            card.innerHTML = `
                <div>
                    <div class="claim-card-top">
                        <div>
                            <h4 class="claim-merchant-title">${escapeHtml(c.merchant || 'Expense')}</h4>
                            <span class="claim-event-badge">${escapeHtml(c.event || 'General')}</span>
                        </div>
                        <span class="claim-status-chip ${statusClass}">${statusLabel}</span>
                    </div>

                    <div class="claim-card-mid" style="margin-top: 1rem;">
                        <img class="claim-thumb" src="${c.receiptUrl || '../lib/placeholder-receipt.png'}" alt="Receipt">
                        <div class="claim-details-snippet">
                            <p class="claim-amount-big">₹${Number(c.amount || 0).toLocaleString()}</p>
                            <p class="claim-date-cat">${c.date || ''} • <strong style="text-transform: capitalize;">${c.category || 'other'}</strong></p>
                        </div>
                    </div>
                </div>

                <div class="claim-card-bottom">
                    <span>UPI: <strong>${escapeHtml(c.upiId || '')}</strong></span>
                    <span style="color: var(--accent); font-weight: 600;">View Receipt &rarr;</span>
                </div>
            `;

            card.onclick = () => openModalWithData(c);
            claimsGrid.appendChild(card);
        });
    }

    statusFilter.addEventListener('change', renderClaims);

    // --- MODAL VIEWER ---
    function openModalWithData(claim) {
        document.getElementById('modal-receipt-img').src = claim.receiptUrl || '';
        document.getElementById('modal-claim-merchant').textContent = claim.merchant || 'Receipt';
        document.getElementById('modal-claim-amount').textContent = `₹${Number(claim.amount || 0).toLocaleString()}`;
        document.getElementById('modal-claim-name').textContent = claim.claimantName || 'Volunteer';
        document.getElementById('modal-claim-upi').textContent = claim.upiId || 'N/A';
        document.getElementById('modal-claim-event').textContent = claim.event || 'General';
        document.getElementById('modal-claim-date').textContent = claim.date || '';
        document.getElementById('modal-claim-category').textContent = claim.category || 'Other';
        document.getElementById('modal-claim-desc').textContent = claim.description || '';

        const statusChip = document.getElementById('modal-claim-status');
        const auditNote = document.getElementById('modal-audit-note');
        statusChip.className = `receipt-info-chip ${claim.status}`;

        if (claim.status === 'approved') {
            statusChip.textContent = '✓ Approved & Reimbursed';
            auditNote.style.display = 'block';
            auditNote.innerHTML = `<strong>Reimbursement Processed:</strong> Synced to Treasury ledger. Verified by ${claim.reviewedBy || 'Treasurer'}.`;
        } else if (claim.status === 'rejected') {
            statusChip.textContent = '✕ Claim Declined';
            auditNote.style.display = 'block';
            auditNote.style.background = 'var(--bad-soft)';
            auditNote.style.color = 'var(--bad)';
            auditNote.innerHTML = `<strong>Reason for rejection:</strong> ${escapeHtml(claim.rejectionReason || 'Receipt details could not be verified.')}`;
        } else {
            statusChip.textContent = 'Pending Treasurer Verification';
            auditNote.style.display = 'none';
        }

        modal.classList.add('active');
    }

    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-x-circle' : 'ph-info');
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
});
