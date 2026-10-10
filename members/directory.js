// File: members/directory.js
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db; // from firebase-config.js
    
    // DOM Elements
    const logoutBtn = document.getElementById('logout-btn');
    const orgNameMeta = document.getElementById('org-name-meta');
    const memberListEl = document.getElementById('member-list');
    
    // Stats
    const statTotal = document.getElementById('stat-total');
    const statActive = document.getElementById('stat-active');
    const statPending = document.getElementById('stat-pending');
    const statExpired = document.getElementById('stat-expired');
    
    // Controls
    const searchInput = document.getElementById('member-search');
    const filterStatus = document.getElementById('filter-status');
    const sortDropdown = document.getElementById('sort-dropdown');
    
    // Bulk
    const selectAllCb = document.getElementById('select-all-members');
    const bulkBar = document.getElementById('bulk-actions-bar');
    const bulkRemindBtn = document.getElementById('bulk-remind-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const remindExpiringBtn = document.getElementById('remind-expiring-btn');
    
    // Modal
    const modal = document.getElementById('member-modal');
    const closeModalBtn = document.getElementById('close-member-modal');
    
    let currentOrgId = null;
    let currentUser = null;
    let membersData = []; // Store all members for client-side filter/sort
    let unsubscribe = null;
    let activeMemberDocId = null;

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        if (!user || sessionStorage.getItem('authType') !== 'admin') {
            window.location.href = '../index.html';
            return;
        }
        
        currentUser = user;

        try {
            // Get Organization
            const orgsSnapshot = await firestore.collection('organizations').where('ownerId', '==', user.uid).get();
            if (orgsSnapshot.empty) {
                showToast('Organization not found. Please log in again.', 'error');
                setTimeout(() => window.location.href = '../index.html', 2000);
                return;
            }
            
            const orgDoc = orgsSnapshot.docs[0];
            currentOrgId = orgDoc.id;
            orgNameMeta.textContent = orgDoc.data().name;

            // Load Members
            setupRealtimeListeners();
            
        } catch (error) {
            console.error("Initialization error:", error);
            showToast('Failed to load data.', 'error');
        }
    });

    // --- REAL-TIME DATA ---
    function setupRealtimeListeners() {
        if (unsubscribe) unsubscribe();

        unsubscribe = firestore.collection('members')
            .where('orgId', '==', currentOrgId)
            .onSnapshot(snapshot => {
                membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Auto-update expired status based on date
                checkAndExpireMembers(membersData);
                
                updateStats(membersData);
                renderMembers();
            }, error => {
                console.error("Firestore listener error:", error);
                memberListEl.innerHTML = '<div class="empty-state"><p>Error loading members.</p></div>';
            });
    }
    
    async function checkAndExpireMembers(members) {
        const today = new Date().toISOString().split('T')[0];
        const batch = firestore.batch();
        let needsUpdate = false;
        
        members.forEach(member => {
            if (member.membershipStatus === 'active' && member.membershipEndDate < today) {
                const ref = firestore.collection('members').doc(member.id);
                batch.update(ref, { membershipStatus: 'expired' });
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            await batch.commit().catch(console.error);
        }
    }

    // --- STATS ---
    function updateStats(members) {
        let active = 0, pending = 0, expired = 0;
        
        members.forEach(m => {
            if (m.membershipStatus === 'active') active++;
            else if (m.membershipStatus === 'pending') pending++;
            else if (m.membershipStatus === 'expired') expired++;
        });
        
        statTotal.textContent = members.length;
        statActive.textContent = active;
        statPending.textContent = pending;
        statExpired.textContent = expired;
    }

    // --- RENDER ---
    function renderMembers() {
        let filtered = [...membersData];
        
        // 1. Search
        const search = searchInput.value.trim().toLowerCase();
        if (search) {
            filtered = filtered.filter(m => 
                m.name.toLowerCase().includes(search) || 
                m.email.toLowerCase().includes(search) ||
                (m.studentId && m.studentId.toLowerCase().includes(search))
            );
        }
        
        // 2. Filter Status
        const status = filterStatus.value;
        if (status !== 'all') {
            filtered = filtered.filter(m => m.membershipStatus === status);
        }
        
        // 3. Sort
        const sort = sortDropdown.value;
        if (sort === 'alpha') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === 'expiring') {
            filtered.sort((a, b) => new Date(a.membershipEndDate) - new Date(b.membershipEndDate));
        } else { // newest
            filtered.sort((a, b) => (b.joinedAt?.toMillis() || 0) - (a.joinedAt?.toMillis() || 0));
        }
        
        // Render
        if (filtered.length === 0) {
            memberListEl.innerHTML = '<div class="empty-state"><i class="ph ph-users"></i><p>No members found.</p></div>';
            return;
        }
        
        memberListEl.innerHTML = '';
        filtered.forEach(member => {
            const el = document.createElement('div');
            el.className = 'list-item card';
            
            const initials = member.name.substring(0, 2).toUpperCase();
            const dateStr = formatDate(member.membershipEndDate);
            
            el.innerHTML = `
                <div class="checkbox-container">
                    <input type="checkbox" class="member-cb" value="${member.id}">
                    <div class="checkbox-box"></div>
                </div>
                <div class="member-avatar">${initials}</div>
                <div class="member-info" style="cursor:pointer;" onclick="openMemberModal('${member.id}')">
                    <span class="member-name">${member.name}</span>
                    <span class="member-email">${member.email}</span>
                </div>
                <div class="member-dates">
                    <span>Exp: ${dateStr}</span>
                </div>
                <div>
                    <span class="badge ${member.membershipStatus}">${member.membershipStatus.toUpperCase()}</span>
                </div>
                <div class="member-dues">
                    <label class="toggle-switch" title="Toggle Dues Paid">
                        <input type="checkbox" class="dues-toggle-cb" data-id="${member.id}" ${member.duesPaid ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="member-actions">
                    <button class="icon-only-btn" title="View Details" onclick="openMemberModal('${member.id}')">
                        <i class="ph-bold ph-caret-right"></i>
                    </button>
                </div>
            `;
            memberListEl.appendChild(el);
        });
        
        attachCheckboxListeners();
        attachDuesListeners();
    }
    
    // --- ACTIONS ---
    function attachDuesListeners() {
        document.querySelectorAll('.dues-toggle-cb').forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const isPaid = e.target.checked;
                const member = membersData.find(m => m.id === id);
                
                try {
                    const status = isPaid ? 'active' : 'pending';
                    await firestore.collection('members').doc(id).update({
                        duesPaid: isPaid,
                        membershipStatus: status,
                        duesPaidAt: isPaid ? firebase.firestore.FieldValue.serverTimestamp() : null
                    });
                    
                    if (isPaid && member) {
                        // Check for existing transaction to prevent duplicates
                        const existingTxn = await firestore.collection('transactions')
                            .where('relatedDocId', '==', id)
                            .where('relatedDocType', '==', 'member_dues')
                            .get();

                        if (existingTxn.empty) {
                            // Auto-create transaction only if one doesn't exist
                            await firestore.collection('transactions').add({
                                orgId: currentOrgId,
                                type: 'income',
                                amount: member.duesAmount || 0,
                                category: 'dues',
                                date: new Date().toISOString().split('T')[0],
                                description: `Membership dues: ${member.name}`,
                                recordedBy: currentUser.uid,
                                recordedByName: currentUser.displayName || currentUser.email,
                                relatedDocId: id,
                                relatedDocType: 'member_dues',
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    } else if (!isPaid) {
                        // On toggle OFF, remove the corresponding transaction
                        const txnSnap = await firestore.collection('transactions')
                            .where('relatedDocId', '==', id)
                            .where('relatedDocType', '==', 'member_dues')
                            .get();
                        const batch = firestore.batch();
                        txnSnap.forEach(doc => batch.delete(doc.ref));
                        if (!txnSnap.empty) await batch.commit();
                    }
                    
                    showToast(`Dues marked as ${isPaid ? 'paid' : 'unpaid'}.`, 'success');
                } catch (err) {
                    console.error("Dues update error:", err);
                    e.target.checked = !isPaid; // revert
                    showToast('Failed to update dues.', 'error');
                }
            });
        });
    }
    
    // --- MODAL ---
    window.openMemberModal = (id) => {
        const member = membersData.find(m => m.id === id);
        if (!member) return;
        
        activeMemberDocId = id;
        
        document.getElementById('modal-member-name').textContent = member.name;
        const statusEl = document.getElementById('modal-member-status');
        statusEl.textContent = member.membershipStatus.toUpperCase();
        statusEl.className = `modal-subtitle badge ${member.membershipStatus}`;
        
        document.getElementById('modal-member-email').textContent = member.email;
        document.getElementById('modal-member-phone').textContent = member.phone || '--';
        document.getElementById('modal-member-studentid').textContent = member.studentId || '--';
        document.getElementById('modal-member-joined').textContent = formatDate(member.joinedAt?.toDate());
        
        document.getElementById('modal-dues-amount').textContent = `₹${member.duesAmount || 0}`;
        document.getElementById('modal-dues-period').textContent = `Valid till: ${formatDate(member.membershipEndDate)}`;
        
        const toggle = document.getElementById('modal-dues-toggle');
        toggle.checked = member.duesPaid;
        toggle.onchange = async (e) => {
            const isPaid = e.target.checked;
            try {
                const status = isPaid ? 'active' : 'pending';
                await firestore.collection('members').doc(id).update({
                    duesPaid: isPaid,
                    membershipStatus: status,
                    duesPaidAt: isPaid ? firebase.firestore.FieldValue.serverTimestamp() : null
                });
                
                if (isPaid && member) {
                    // Check for existing transaction to prevent duplicates
                    const existingTxn = await firestore.collection('transactions')
                        .where('relatedDocId', '==', id)
                        .where('relatedDocType', '==', 'member_dues')
                        .get();

                    if (existingTxn.empty) {
                        // Auto-create transaction only if one doesn't exist
                        await firestore.collection('transactions').add({
                            orgId: currentOrgId,
                            type: 'income',
                            amount: member.duesAmount || 0,
                            category: 'dues',
                            date: new Date().toISOString().split('T')[0],
                            description: `Membership dues: ${member.name}`,
                            recordedBy: currentUser.uid,
                            recordedByName: currentUser.displayName || currentUser.email,
                            relatedDocId: id,
                            relatedDocType: 'member_dues',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } else if (!isPaid) {
                    // On toggle OFF, remove the corresponding transaction
                    const txnSnap = await firestore.collection('transactions')
                        .where('relatedDocId', '==', id)
                        .where('relatedDocType', '==', 'member_dues')
                        .get();
                    const batch = firestore.batch();
                    txnSnap.forEach(doc => batch.delete(doc.ref));
                    if (!txnSnap.empty) await batch.commit();
                }
                
                showToast(`Dues marked as ${isPaid ? 'paid' : 'unpaid'}.`, 'success');
            } catch(err) {
                e.target.checked = !isPaid;
                showToast('Failed to update.', 'error');
            }
        };
        
        modal.classList.add('active');
    };
    
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    
    document.getElementById('modal-delete-btn').addEventListener('click', async () => {
        if (!activeMemberDocId) return;
        if (!confirm('Are you sure you want to delete this member? This cannot be undone.')) return;
        
        try {
            await firestore.collection('members').doc(activeMemberDocId).delete();
            showToast('Member deleted.', 'success');
            modal.classList.remove('active');
        } catch(err) {
            console.error("Delete error", err);
            showToast('Failed to delete.', 'error');
        }
    });

    // --- BULK ACTIONS ---
    function attachCheckboxListeners() {
        const cbs = document.querySelectorAll('.member-cb');
        
        cbs.forEach(cb => cb.addEventListener('change', updateBulkBar));
        
        selectAllCb.addEventListener('change', (e) => {
            cbs.forEach(cb => cb.checked = e.target.checked);
            updateBulkBar();
        });
    }
    
    function updateBulkBar() {
        const checked = document.querySelectorAll('.member-cb:checked').length;
        if (checked > 0) {
            bulkBar.classList.remove('hidden');
            document.getElementById('bulk-remind-text').textContent = `Remind (${checked})`;
        } else {
            bulkBar.classList.add('hidden');
            selectAllCb.checked = false;
        }
    }
    
    bulkRemindBtn.addEventListener('click', async () => {
        const checked = Array.from(document.querySelectorAll('.member-cb:checked')).map(cb => cb.value);
        if (checked.length === 0) return;

        if (!window.GOOGLE_SCRIPT_URL) {
            showToast(`Would remind ${checked.length} members (email service not configured).`, 'info');
            checked.forEach(id => { const el = document.querySelector(`.member-cb[value="${id}"]`); if (el) el.checked = false; });
            updateBulkBar();
            return;
        }

        let sent = 0;
        for (const id of checked) {
            const member = membersData.find(m => m.id === id);
            if (!member) continue;
            try {
                await fetch(window.GOOGLE_SCRIPT_URL, {
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        security_token: "PT_SECURE_2026",
                        type: 'reminder',
                        to_email: member.email,
                        to_name: member.name,
                        org_name: orgNameMeta.textContent,
                        dues_amount: member.duesAmount || 0,
                        end_date: member.membershipEndDate
                    })
                });
                sent++;
            } catch (err) {
                console.error(`Remind failed for ${member.email}:`, err);
            }
            await new Promise(r => setTimeout(r, 300));
        }
        showToast(`Sent reminders to ${sent} members!`, 'success');
        document.querySelectorAll('.member-cb:checked').forEach(cb => cb.checked = false);
        updateBulkBar();
    });
    
    bulkDeleteBtn.addEventListener('click', async () => {
        const checked = Array.from(document.querySelectorAll('.member-cb:checked')).map(cb => cb.value);
        if (!confirm(`Delete ${checked.length} members?`)) return;
        
        const batch = firestore.batch();
        checked.forEach(id => {
            batch.delete(firestore.collection('members').doc(id));
        });
        
        try {
            await batch.commit();
            showToast('Members deleted.', 'success');
            updateBulkBar();
        } catch(err) {
            showToast('Failed to delete members.', 'error');
        }
    });
    
    remindExpiringBtn.addEventListener('click', async () => {
        const expiring = membersData.filter(m => m.membershipStatus === 'active' && isExpiringSoon(m.membershipEndDate));
        if (expiring.length === 0) {
            showToast('No members expiring soon.', 'info');
            return;
        }

        if (!window.GOOGLE_SCRIPT_URL) {
            showToast(`Would remind ${expiring.length} expiring members (email service not configured).`, 'info');
            return;
        }

        let sent = 0;
        for (const member of expiring) {
            try {
                await fetch(window.GOOGLE_SCRIPT_URL, {
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        security_token: "PT_SECURE_2026",
                        type: 'renewal_reminder',
                        to_email: member.email,
                        to_name: member.name,
                        org_name: orgNameMeta.textContent,
                        end_date: member.membershipEndDate
                    })
                });
                // Update flag
                await firestore.collection('members').doc(member.id).update({ renewalReminderSent: true });
                sent++;
            } catch (err) {
                console.error(`Renewal remind failed for ${member.email}:`, err);
            }
            await new Promise(r => setTimeout(r, 300));
        }
        showToast(`Sent renewal reminders to ${sent} members!`, 'success');
    });

    // --- EVENTS ---
    searchInput.addEventListener('input', renderMembers);
    filterStatus.addEventListener('change', renderMembers);
    sortDropdown.addEventListener('change', renderMembers);
    
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            sessionStorage.clear();
            window.location.href = '../index.html';
        });
    });

    // --- UTILS ---
    function formatDate(dateStringOrObj) {
        if (!dateStringOrObj) return '--';
        const date = new Date(dateStringOrObj);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    function isExpiringSoon(dateString) {
        if (!dateString) return false;
        const end = new Date(dateString);
        const today = new Date();
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 30;
    }
    
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-x-circle' : 'ph-info');
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${message}</span>`;
        
        toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
