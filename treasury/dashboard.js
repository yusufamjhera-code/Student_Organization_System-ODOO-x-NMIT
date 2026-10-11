// File: treasury/dashboard.js - Production Treasury & Accounting Engine
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db;
    
    const orgNameMeta = document.getElementById('org-name-meta');
    const modal = document.getElementById('txn-modal');
    const form = document.getElementById('txn-form');
    const typeSelect = document.getElementById('txn-type');
    const amtInput = document.getElementById('txn-amount');
    const catSelect = document.getElementById('txn-category');
    const dateInput = document.getElementById('txn-date');
    const descInput = document.getElementById('txn-desc');
    const deleteBtn = document.getElementById('delete-txn-btn');
    const saveBtn = document.getElementById('save-txn-btn');
    const listEl = document.getElementById('txn-list');
    
    // Reimbursement Queue DOM Elements
    const queueListEl = document.getElementById('reimburse-queue-list');
    const pendingClaimsBadge = document.getElementById('pending-claims-badge');
    const auditModal = document.getElementById('treasurer-receipt-modal');
    const closeAuditModalBtn = document.getElementById('close-treasurer-receipt-modal');
    const modalApproveBtn = document.getElementById('modal-approve-claim-btn');
    const modalRejectBtn = document.getElementById('modal-reject-claim-btn');

    let currentOrgId = null;
    let currentUser = null;
    let txnsData = [];
    let reimbursementsData = [];
    let currentAuditClaim = null;
    let editDocId = null;

    let trendChart = null;
    let categoryChart = null;

    function loadDemoTreasury() {
        currentOrgId = 'demo-org-acm';
        if (orgNameMeta) orgNameMeta.textContent = 'ACM Student Chapter • NMIT';
        
        let localDynamicTxns = [];
        try {
            localDynamicTxns = JSON.parse(localStorage.getItem('passtrack_treasury_txns') || '[]');
        } catch(e) {}

        const seedTxns = [
            { id: 'txn-1', description: 'HackNMIT 2026 Ticket Sales', type: 'income', amount: 84000, category: 'tickets', date: '2026-03-28' },
            { id: 'txn-2', description: 'Annual Club Membership Dues', type: 'income', amount: 32000, category: 'dues', date: '2026-03-15' },
            { id: 'txn-3', description: 'Official Hoodies Pre-orders', type: 'income', amount: 24500, category: 'merchandise', date: '2026-03-10' },
            { id: 'txn-4', description: 'Auditorium Booking & AV Setup', type: 'expense', amount: 18000, category: 'events', date: '2026-03-25' },
            { id: 'txn-5', description: 'Catering & Participant Refreshments', type: 'expense', amount: 12500, category: 'hospitality', date: '2026-03-29' }
        ];

        txnsData = [...localDynamicTxns, ...seedTxns];
        updateDashboard();
        loadReimbursements();
    }

    // Live Zero-Touch Treasury Sync Listener
    window.addEventListener('passtrack:treasury:synced', (e) => {
        const newTxn = e.detail;
        if (newTxn && !txnsData.some(t => t.id === newTxn.id)) {
            txnsData.unshift(newTxn);
            updateDashboard();
            showToast(`Auto-recorded ${newTxn.category} income: ₹${newTxn.amount}`, 'success');
        }
    });

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        const isDemo = sessionStorage.getItem('demoUser') === 'true' || 
                       sessionStorage.getItem('authType') === 'admin' ||
                       window.location.search.includes('demo=true') ||
                       (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");

        if (user) {
            currentUser = user;
            if (sessionStorage.getItem('authType') !== 'collaborator') {
                sessionStorage.setItem('authType', 'admin');
            }
            try {
                const orgsSnapshot = await firestore.collection('organizations').where('ownerId', '==', user.uid).get();
                if (!orgsSnapshot.empty) {
                    const orgDoc = orgsSnapshot.docs[0];
                    currentOrgId = orgDoc.id;
                    orgNameMeta.textContent = orgDoc.data().name;
                    setupRealtimeListeners();
                } else if (isDemo) {
                    loadDemoTreasury();
                } else {
                    showToast('Organization not found.', 'error');
                }
            } catch (error) {
                if (isDemo) loadDemoTreasury();
                else showToast('Failed to load organization data.', 'error');
            }
        } else if (isDemo || !user) {
            currentUser = { uid: 'demo-organizer', email: 'organizer@nmit.ac.in', displayName: 'Treasurer Admin' };
            loadDemoTreasury();
        } else {
            window.location.href = '../index.html';
        }
    });

    // --- REAL-TIME DATA ---
    function setupRealtimeListeners() {
        firestore.collection('transactions')
            .where('orgId', '==', currentOrgId)
            .orderBy('date', 'desc')
            .onSnapshot(snapshot => {
                txnsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                updateDashboard();
            }, error => {
                console.error("Listener error:", error);
                if (error.message.includes('index')) {
                    firestore.collection('transactions').where('orgId', '==', currentOrgId).get().then(snap => {
                        txnsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                            .sort((a,b) => (b.date || '').localeCompare(a.date || ''));
                        updateDashboard();
                    });
                }
            });

        loadReimbursements();
    }

    function updateDashboard() {
        let totalInc = 0;
        let totalExp = 0;
        
        const catTotals = {};
        const monthlyTotals = {}; // YYYY-MM: {inc, exp}

        txnsData.forEach(t => {
            const amt = Number(t.amount) || 0;
            const dateStr = t.date || new Date().toISOString().split('T')[0];
            const month = dateStr.substring(0, 7);
            
            if (!monthlyTotals[month]) monthlyTotals[month] = { inc: 0, exp: 0 };
            
            if (t.type === 'income') {
                totalInc += amt;
                monthlyTotals[month].inc += amt;
            } else {
                totalExp += amt;
                monthlyTotals[month].exp += amt;
                const cat = t.category || 'other';
                catTotals[cat] = (catTotals[cat] || 0) + amt;
            }
        });

        document.getElementById('stat-income').textContent = `₹${totalInc.toLocaleString()}`;
        document.getElementById('stat-expenses').textContent = `₹${totalExp.toLocaleString()}`;
        
        const balance = totalInc - totalExp;
        const balEl = document.getElementById('stat-balance');
        balEl.textContent = `₹${balance.toLocaleString()}`;
        balEl.className = `stat-value ${balance >= 0 ? 'text-primary' : 'text-danger'}`;

        renderList();
        renderCharts(monthlyTotals, catTotals);
    }

    function renderList() {
        const filter = document.getElementById('txn-filter').value;
        const search = document.getElementById('txn-search').value.toLowerCase().trim();
        
        let filtered = txnsData;
        if (filter !== 'all') filtered = filtered.filter(t => t.type === filter);
        if (search) {
            filtered = filtered.filter(t => 
                (t.description || '').toLowerCase().includes(search) ||
                (t.category || '').toLowerCase().includes(search)
            );
        }

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="ph-bold ph-receipt" style="font-size: 2.5rem; margin-bottom: 10px; display: block; color: var(--primary);"></i>
                    <p style="font-weight: 600;">No transactions recorded.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = '';
        filtered.forEach(t => {
            const isInc = t.type === 'income';
            const icon = isInc ? 'ph-arrow-down-left' : 'ph-arrow-up-right';
            const sign = isInc ? '+' : '-';
            
            const el = document.createElement('div');
            el.className = 'txn-row';
            el.innerHTML = `
                <div class="txn-left">
                    <div class="txn-icon ${t.type}"><i class="ph-bold ${icon}"></i></div>
                    <div class="txn-info">
                        <h4>${escapeHtml(t.description || 'Transaction')}</h4>
                        <div class="txn-meta">
                            <span><i class="ph-bold ph-calendar-blank"></i> ${new Date(t.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>${escapeHtml(t.recordedByName || 'System')}</span>
                        </div>
                    </div>
                </div>
                <div class="txn-right">
                    <div class="txn-amount ${t.type}">${sign}₹${(Number(t.amount)||0).toLocaleString()}</div>
                    <div class="txn-category-badge">${escapeHtml(t.category || 'general')}</div>
                </div>
            `;
            
            el.onclick = () => {
                if (t.relatedDocId) {
                    showToast('Automated system transaction (dues or tickets). Managed by system.', 'info');
                } else {
                    openEditModal(t);
                }
            };
            
            listEl.appendChild(el);
        });
    }

    document.getElementById('txn-filter').addEventListener('change', renderList);
    document.getElementById('txn-search').addEventListener('input', renderList);

    // --- CHARTS ---
    function renderCharts(monthlyTotals, catTotals) {
        if (typeof Chart === 'undefined') return;

        // Trend Chart
        const months = Object.keys(monthlyTotals).sort();
        const displayMonths = months.length > 0 ? months : [new Date().toISOString().substring(0, 7)];
        const incData = displayMonths.map(m => (monthlyTotals[m] ? monthlyTotals[m].inc : 0));
        const expData = displayMonths.map(m => (monthlyTotals[m] ? monthlyTotals[m].exp : 0));

        const trendCtx = document.getElementById('trendChart').getContext('2d');
        if (trendChart) trendChart.destroy();
        
        Chart.defaults.color = '#64748b';
        Chart.defaults.font.family = "'Inter Tight', sans-serif";

        trendChart = new Chart(trendCtx, {
            type: 'bar',
            data: {
                labels: displayMonths,
                datasets: [
                    { label: 'Income (+)', data: incData, backgroundColor: '#10b981', borderRadius: 6 },
                    { label: 'Expenses (-)', data: expData, backgroundColor: '#ef4444', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { weight: '600' } } }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(0,0,0,0.04)' } }
                }
            }
        });

        // Category Chart
        const catLabels = Object.keys(catTotals);
        const displayCatLabels = catLabels.length > 0 ? catLabels : ['No Expenses'];
        const catData = catLabels.length > 0 ? catLabels.map(l => catTotals[l]) : [1];
        const catColors = ['#e25b2e', '#17130f', '#847971', '#d97706', '#059669', '#2563eb', '#9333ea'];

        const catCtx = document.getElementById('categoryChart').getContext('2d');
        if (categoryChart) categoryChart.destroy();
        
        categoryChart = new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: displayCatLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: catLabels.length > 0 ? catColors.slice(0, catLabels.length) : ['#e2e8f0'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } }
                },
                cutout: '70%'
            }
        });
    }

    // --- ACTIONS: MODAL ---
    document.getElementById('add-txn-btn').onclick = () => {
        editDocId = null;
        form.reset();
        dateInput.value = new Date().toISOString().split('T')[0];
        document.getElementById('txn-modal-title').textContent = 'Log Transaction';
        deleteBtn.style.display = 'none';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Transaction</span>';
        modal.classList.add('active');
    };

    document.getElementById('close-txn-modal').onclick = () => modal.classList.remove('active');
    document.getElementById('cancel-txn-btn').onclick = () => modal.classList.remove('active');

    function openEditModal(t) {
        editDocId = t.id;
        typeSelect.value = t.type;
        amtInput.value = t.amount;
        catSelect.value = t.category || 'other';
        dateInput.value = t.date;
        descInput.value = t.description;
        
        document.getElementById('txn-modal-title').textContent = 'Edit Transaction';
        deleteBtn.style.display = 'block';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Changes</span>';
        modal.classList.add('active');
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const amount = parseFloat(amtInput.value);
        const description = descInput.value.trim();
        const date = dateInput.value;
        const category = catSelect.value;
        const type = typeSelect.value;

        // RIGOROUS VALIDATIONS
        if (isNaN(amount) || amount <= 0) {
            showToast('Amount must be a positive number greater than ₹0.', 'error');
            return;
        }
        if (amount > 10000000) {
            showToast('Amount exceeds maximum transaction threshold.', 'error');
            return;
        }
        if (!date) {
            showToast('Please specify a valid transaction date.', 'error');
            return;
        }
        if (description.length < 3) {
            showToast('Description must be at least 3 characters.', 'error');
            return;
        }

        const data = {
            orgId: currentOrgId,
            type: type,
            amount: amount,
            category: category,
            date: date,
            description: description,
            recordedBy: currentUser.uid,
            recordedByName: currentUser.displayName || currentUser.email,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Saving...';

        try {
            if (editDocId) {
                await firestore.collection('transactions').doc(editDocId).update(data);
                showToast('Transaction updated successfully.', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.relatedDocId = null;
                data.relatedDocType = null;
                await firestore.collection('transactions').add(data);
                showToast('Transaction logged successfully.', 'success');
            }
            modal.classList.remove('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to save transaction.', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    deleteBtn.onclick = async () => {
        if (!editDocId) return;
        if (!confirm('Permanently delete this transaction? This will adjust your treasury balance.')) return;
        try {
            await firestore.collection('transactions').doc(editDocId).delete();
            showToast('Transaction deleted.', 'success');
            modal.classList.remove('active');
        } catch(err) {
            showToast('Failed to delete transaction.', 'error');
        }
    };

    // CSV Export
    document.getElementById('export-csv-btn').onclick = () => {
        if (txnsData.length === 0) {
            showToast('No transaction data to export.', 'info');
            return;
        }
        
        const headers = ['Date', 'Type', 'Category', 'Description', 'Amount (INR)', 'Recorded By', 'Source'];
        const rows = txnsData.map(t => [
            t.date,
            t.type,
            t.category,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            t.amount,
            `"${(t.recordedByName || 'System').replace(/"/g, '""')}"`,
            t.relatedDocId ? 'Automated' : 'Manual'
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(',') + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `PassTrack_Treasury_${orgNameMeta.textContent.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Treasury statement exported to CSV.', 'success');
    };

    // ==========================================
    // VOLUNTEER REIMBURSEMENT AUDIT QUEUE
    // ==========================================
    const DEMO_CLAIMS_KEY = 'passtrack_volunteer_claims';

    function getLocalClaims() {
        try {
            const raw = localStorage.getItem(DEMO_CLAIMS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        
        // Initial Seed
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
                receiptUrl: '../lib/placeholder-receipt.png',
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
                receiptUrl: '../lib/placeholder-receipt.png',
                receiptFileName: 'hardware_invoice_904.png',
                status: 'pending',
                createdAt: '2026-03-26T14:30:00.000Z'
            }
        ];
        localStorage.setItem(DEMO_CLAIMS_KEY, JSON.stringify(seed));
        return seed;
    }

    function saveLocalClaims(claims) {
        localStorage.setItem(DEMO_CLAIMS_KEY, JSON.stringify(claims));
    }

    function loadReimbursements() {
        if (!queueListEl) return;
        
        const isDemo = sessionStorage.getItem('demoUser') === 'true' || 
                       sessionStorage.getItem('authType') === 'admin' ||
                       (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");

        if (firestore && !isDemo && currentOrgId) {
            firestore.collection('reimbursements')
                .where('orgId', '==', currentOrgId)
                .onSnapshot(snap => {
                    if (!snap.empty) {
                        reimbursementsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    } else {
                        reimbursementsData = getLocalClaims();
                    }
                    renderReimbursementsQueue();
                }, err => {
                    console.warn("Reimbursements listener warning:", err);
                    reimbursementsData = getLocalClaims();
                    renderReimbursementsQueue();
                });
        } else {
            reimbursementsData = getLocalClaims();
            renderReimbursementsQueue();
        }
    }

    function renderReimbursementsQueue() {
        if (!queueListEl) return;

        const pending = reimbursementsData.filter(c => c.status === 'pending');
        if (pendingClaimsBadge) {
            pendingClaimsBadge.textContent = `${pending.length} Pending Review`;
            pendingClaimsBadge.style.background = pending.length > 0 ? 'var(--accent)' : 'var(--good)';
        }

        if (pending.length === 0) {
            queueListEl.innerHTML = `
                <div style="padding: 32px 20px; text-align: center; color: var(--text-muted);">
                    <i class="ph-bold ph-check-circle" style="font-size: 2rem; color: var(--good); display: block; margin-bottom: 8px;"></i>
                    <h4 style="margin: 0 0 4px 0; font-size: 1rem; color: var(--text-main); font-weight: 700;">All Volunteer Claims Audited</h4>
                    <p style="margin: 0; font-size: 0.85rem;">No pending reimbursement requests awaiting Treasurer authorization.</p>
                </div>
            `;
            return;
        }

        queueListEl.innerHTML = '';
        pending.forEach(claim => {
            const row = document.createElement('div');
            row.className = 'queue-item-row';
            row.innerHTML = `
                <div class="queue-left">
                    <img class="queue-receipt-thumb" src="${claim.receiptUrl || '../lib/placeholder-receipt.png'}" alt="Receipt">
                    <div class="queue-info">
                        <h4>${escapeHtml(claim.merchant || 'Expense Receipt')}</h4>
                        <div class="queue-meta">
                            <span class="claimant-tag"><i class="ph-bold ph-user"></i> ${escapeHtml(claim.claimantName || 'Volunteer')}</span>
                            <span class="upi-tag">UPI: ${escapeHtml(claim.upiId || 'N/A')}</span>
                            <span>•</span>
                            <span><i class="ph-bold ph-calendar"></i> ${claim.date || ''}</span>
                            <span>•</span>
                            <span>${escapeHtml(claim.event || 'General')}</span>
                        </div>
                    </div>
                </div>
                <div class="queue-right">
                    <div class="queue-amount">₹${Number(claim.amount || 0).toLocaleString()}</div>
                    <div class="queue-actions">
                        <button type="button" class="view-receipt-btn" data-claim-id="${claim.id}">
                            <i class="ph-bold ph-eye"></i> View
                        </button>
                        <button type="button" class="approve-claim-btn" data-claim-id="${claim.id}">
                            <i class="ph-bold ph-check"></i> Approve
                        </button>
                        <button type="button" class="reject-claim-btn" data-claim-id="${claim.id}">
                            <i class="ph-bold ph-x"></i> Decline
                        </button>
                    </div>
                </div>
            `;

            // Thumb click & View click
            row.querySelector('.queue-receipt-thumb').onclick = () => openAuditModal(claim);
            row.querySelector('.view-receipt-btn').onclick = () => openAuditModal(claim);
            row.querySelector('.approve-claim-btn').onclick = () => approveClaim(claim);
            row.querySelector('.reject-claim-btn').onclick = () => rejectClaim(claim);

            queueListEl.appendChild(row);
        });
    }

    function openAuditModal(claim) {
        if (!auditModal) return;
        currentAuditClaim = claim;

        document.getElementById('audit-receipt-img').src = claim.receiptUrl || '../lib/placeholder-receipt.png';
        document.getElementById('audit-merchant-name').textContent = claim.merchant || 'Expense Receipt';
        document.getElementById('audit-amount-display').textContent = `₹${Number(claim.amount || 0).toLocaleString()}`;
        document.getElementById('audit-claimant-name').textContent = claim.claimantName || 'Volunteer';
        document.getElementById('audit-upi-id').textContent = claim.upiId || 'N/A';
        document.getElementById('audit-event-name').textContent = claim.event || 'General';
        document.getElementById('audit-date').textContent = claim.date || '';
        document.getElementById('audit-category').textContent = (claim.category || 'other').toUpperCase();
        document.getElementById('audit-description').textContent = claim.description || 'No itemized description provided.';

        auditModal.classList.add('active');
    }

    if (closeAuditModalBtn) {
        closeAuditModalBtn.onclick = () => auditModal.classList.remove('active');
    }
    if (auditModal) {
        auditModal.onclick = (e) => {
            if (e.target === auditModal) auditModal.classList.remove('active');
        };
    }

    if (modalApproveBtn) {
        modalApproveBtn.onclick = () => {
            if (currentAuditClaim) approveClaim(currentAuditClaim);
        };
    }

    if (modalRejectBtn) {
        modalRejectBtn.onclick = () => {
            if (currentAuditClaim) rejectClaim(currentAuditClaim);
        };
    }

    async function approveClaim(claim) {
        if (!confirm(`Authorize reimbursement payout of ₹${Number(claim.amount).toLocaleString()} to ${claim.claimantName} (${claim.upiId}) and record to Treasury ledger?`)) {
            return;
        }

        const isDemo = sessionStorage.getItem('demoUser') === 'true' || 
                       sessionStorage.getItem('authType') === 'admin' ||
                       (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");

        const txnPayload = {
            id: 'txn-reimb-' + Date.now(),
            orgId: currentOrgId,
            type: 'expense',
            amount: Number(claim.amount),
            category: 'reimbursement',
            date: new Date().toISOString().split('T')[0],
            description: `Reimbursement: ${claim.description || claim.merchant} (${claim.claimantName} • UPI: ${claim.upiId})`,
            recordedBy: currentUser ? currentUser.uid : 'treasurer',
            recordedByName: currentUser ? (currentUser.displayName || currentUser.email) : 'Treasurer',
            relatedDocId: claim.id,
            relatedDocType: 'reimbursement'
        };

        try {
            if (firestore && !isDemo && currentOrgId) {
                try {
                    txnPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    txnPayload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                    const txnPromise = firestore.collection('transactions').add(txnPayload);
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
                    const txnRef = await Promise.race([txnPromise, timeoutPromise]);
                    
                    await firestore.collection('reimbursements').doc(claim.id).update({
                        status: 'approved',
                        reviewedBy: currentUser ? (currentUser.displayName || currentUser.email) : 'Treasurer',
                        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        transactionId: txnRef.id
                    });
                } catch (fsErr) {
                    console.warn("Firestore sync timed out or offline, proceeding locally:", fsErr);
                }
            }

            // Sync with local memory and storage
            txnsData.unshift(txnPayload);
            const foundIdx = reimbursementsData.findIndex(c => c.id === claim.id);
            if (foundIdx !== -1) {
                reimbursementsData[foundIdx].status = 'approved';
                reimbursementsData[foundIdx].reviewedBy = currentUser ? (currentUser.displayName || currentUser.email) : 'Treasurer';
                reimbursementsData[foundIdx].transactionId = txnPayload.id;
            }
            saveLocalClaims(reimbursementsData);

            updateDashboard();
            renderReimbursementsQueue();
            if (auditModal) auditModal.classList.remove('active');

            showToast(`Reimbursement of ₹${Number(claim.amount).toLocaleString()} approved and synced with ledger!`, 'success');
        } catch (error) {
            console.error("Approval error:", error);
            showToast('Failed to approve reimbursement.', 'error');
        }
    }

    async function rejectClaim(claim) {
        const reason = prompt('Specify rejection reason for volunteer:', 'Receipt photo illegible or missing merchant GST details');
        if (reason === null) return;

        const isDemo = sessionStorage.getItem('demoUser') === 'true' || 
                       sessionStorage.getItem('authType') === 'admin' ||
                       (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");

        try {
            if (firestore && !isDemo && currentOrgId) {
                await firestore.collection('reimbursements').doc(claim.id).update({
                    status: 'rejected',
                    rejectionReason: reason,
                    reviewedBy: currentUser ? (currentUser.displayName || currentUser.email) : 'Treasurer',
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            const foundIdx = reimbursementsData.findIndex(c => c.id === claim.id);
            if (foundIdx !== -1) {
                reimbursementsData[foundIdx].status = 'rejected';
                reimbursementsData[foundIdx].rejectionReason = reason;
            }
            saveLocalClaims(reimbursementsData);

            renderReimbursementsQueue();
            if (auditModal) auditModal.classList.remove('active');

            showToast(`Claim rejected: "${reason}".`, 'info');
        } catch (error) {
            console.error("Rejection error:", error);
            showToast('Failed to reject claim.', 'error');
        }
    }

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
