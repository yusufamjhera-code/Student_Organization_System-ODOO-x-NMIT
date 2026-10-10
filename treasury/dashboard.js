// File: treasury/dashboard.js
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
    
    let currentOrgId = null;
    let currentUser = null;
    let txnsData = [];
    let editDocId = null;

    let trendChart = null;
    let categoryChart = null;

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        if (!user || sessionStorage.getItem('authType') !== 'admin') {
            window.location.href = '../index.html';
            return;
        }
        currentUser = user;
        try {
            const orgsSnapshot = await firestore.collection('organizations').where('ownerId', '==', user.uid).get();
            if (orgsSnapshot.empty) {
                showToast('Organization not found.', 'error');
                return;
            }
            const orgDoc = orgsSnapshot.docs[0];
            currentOrgId = orgDoc.id;
            orgNameMeta.textContent = orgDoc.data().name;
            setupRealtimeListeners();
        } catch (error) {
            console.error(error);
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
                console.error(error);
                if (error.message.includes('index')) {
                    firestore.collection('transactions').where('orgId', '==', currentOrgId).get().then(snap => {
                        txnsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                            .sort((a,b) => b.date.localeCompare(a.date));
                        updateDashboard();
                    });
                }
            });
    }

    function updateDashboard() {
        let totalInc = 0;
        let totalExp = 0;
        
        const catTotals = {};
        const monthlyTotals = {}; // YYYY-MM: {inc, exp}

        txnsData.forEach(t => {
            const amt = t.amount || 0;
            const month = t.date.substring(0, 7);
            
            if (!monthlyTotals[month]) monthlyTotals[month] = { inc: 0, exp: 0 };
            
            if (t.type === 'income') {
                totalInc += amt;
                monthlyTotals[month].inc += amt;
            } else {
                totalExp += amt;
                monthlyTotals[month].exp += amt;
                catTotals[t.category] = (catTotals[t.category] || 0) + amt;
            }
        });

        document.getElementById('stat-income').textContent = `₹${totalInc.toLocaleString()}`;
        document.getElementById('stat-expenses').textContent = `₹${totalExp.toLocaleString()}`;
        document.getElementById('stat-balance').textContent = `₹${(totalInc - totalExp).toLocaleString()}`;

        renderList();
        renderCharts(monthlyTotals, catTotals);
    }

    function renderList() {
        const filter = document.getElementById('txn-filter').value;
        const search = document.getElementById('txn-search').value.toLowerCase();
        
        let filtered = txnsData;
        if (filter !== 'all') filtered = filtered.filter(t => t.type === filter);
        if (search) filtered = filtered.filter(t => (t.description||'').toLowerCase().includes(search));

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><p>No transactions found.</p></div>';
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
                        <h4>${t.description}</h4>
                        <div class="txn-meta">
                            <span>${new Date(t.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>${t.recordedByName || 'System'}</span>
                        </div>
                    </div>
                </div>
                <div class="txn-right">
                    <div class="txn-amount ${t.type}">${sign}₹${(t.amount||0).toLocaleString()}</div>
                    <div class="txn-category-badge">${t.category}</div>
                </div>
            `;
            
            el.onclick = () => {
                // Only allow editing manual transactions
                if (t.relatedDocId) {
                    showToast('Auto-generated transactions cannot be edited directly.', 'info');
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
        // Trend Chart
        const months = Object.keys(monthlyTotals).sort();
        const incData = months.map(m => monthlyTotals[m].inc);
        const expData = months.map(m => monthlyTotals[m].exp);

        const trendCtx = document.getElementById('trendChart').getContext('2d');
        if (trendChart) trendChart.destroy();
        
        Chart.defaults.color = '#94a3b8';
        trendChart = new Chart(trendCtx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Income', data: incData, backgroundColor: '#10b981' },
                    { label: 'Expenses', data: expData, backgroundColor: '#ef4444' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Category Chart
        const catLabels = Object.keys(catTotals);
        const catData = catLabels.map(l => catTotals[l]);
        
        const catCtx = document.getElementById('categoryChart').getContext('2d');
        if (categoryChart) categoryChart.destroy();
        categoryChart = new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: ['#6a11cb', '#2563eb', '#db2777', '#ea580c', '#eab308', '#14b8a6']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }

    // --- ACTIONS ---
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
        catSelect.value = t.category;
        dateInput.value = t.date;
        descInput.value = t.description;
        
        document.getElementById('txn-modal-title').textContent = 'Edit Transaction';
        deleteBtn.style.display = 'block';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Changes</span>';
        modal.classList.add('active');
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        const data = {
            orgId: currentOrgId,
            type: typeSelect.value,
            amount: parseFloat(amtInput.value),
            category: catSelect.value,
            date: dateInput.value,
            description: descInput.value.trim(),
            recordedBy: currentUser.uid,
            recordedByName: currentUser.displayName || currentUser.email,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (editDocId) {
                await firestore.collection('transactions').doc(editDocId).update(data);
                showToast('Transaction updated', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.relatedDocId = null;
                data.relatedDocType = null;
                await firestore.collection('transactions').add(data);
                showToast('Transaction logged', 'success');
            }
            modal.classList.remove('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to save transaction', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    deleteBtn.onclick = async () => {
        if (!editDocId) return;
        if (!confirm('Delete this transaction? This will permanently affect your balance.')) return;
        try {
            await firestore.collection('transactions').doc(editDocId).delete();
            showToast('Transaction deleted', 'success');
            modal.classList.remove('active');
        } catch(err) {
            showToast('Failed to delete', 'error');
        }
    };

    // CSV Export
    document.getElementById('export-csv-btn').onclick = () => {
        if (txnsData.length === 0) {
            showToast('No data to export', 'info');
            return;
        }
        
        const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Recorded By', 'Auto/Manual'];
        const rows = txnsData.map(t => [
            t.date,
            t.type,
            t.category,
            `"${t.description.replace(/"/g, '""')}"`,
            t.amount,
            `"${t.recordedByName || 'System'}"`,
            t.relatedDocId ? 'Auto' : 'Manual'
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(',') + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `pass_track_treasury_${currentOrgId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-x-circle' : 'ph-info');
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
