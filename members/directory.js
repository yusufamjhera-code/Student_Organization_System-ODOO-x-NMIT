// File: members/directory.js - Production Grade Directory Controller
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db; // from firebase-config.js
    
    // DOM Elements
    const logoutBtn = document.getElementById('logout-btn');
    const orgNameMeta = document.getElementById('org-name-meta');
    const memberListEl = document.getElementById('member-list');
    
    // Header Actions
    const addMemberBtn = document.getElementById('add-member-btn');
    const shareRegBtn = document.getElementById('share-reg-btn');
    
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
    
    // Add Member Modal
    const addModal = document.getElementById('add-member-modal');
    const closeAddModalBtn = document.getElementById('close-add-member-modal');
    const cancelAddModalBtn = document.getElementById('cancel-add-member-btn');
    const addMemberForm = document.getElementById('add-member-form');
    const newPaidCb = document.getElementById('new-member-paid');
    const newPaidLabel = document.getElementById('new-member-paid-label');
    
    // Member Detail / Edit Modal
    const memberModal = document.getElementById('member-modal');
    const closeMemberModalBtn = document.getElementById('close-member-modal');
    const cancelEditMemberBtn = document.getElementById('cancel-edit-member-btn');
    const editMemberForm = document.getElementById('edit-member-form');
    const modalDeleteBtn = document.getElementById('modal-delete-btn');
    
    let currentOrgId = null;
    let currentUser = null;
    let membersData = []; // Store all members for client-side filter/sort
    let unsubscribe = null;
    let activeMemberDocId = null;

    // --- AUTH GUARD & DYNAMIC INITIALIZATION ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if (sessionStorage.getItem('authType') !== 'collaborator') {
                sessionStorage.setItem('authType', 'admin');
            }

            try {
                // Get Organization
                const orgsSnapshot = await firestore.collection('organizations').where('ownerId', '==', user.uid).get();
                if (!orgsSnapshot.empty) {
                    const orgDoc = orgsSnapshot.docs[0];
                    currentOrgId = orgDoc.id;
                    if (orgNameMeta) orgNameMeta.textContent = orgDoc.data().name || 'Student Organization';
                    setupRealtimeListeners();
                } else {
                    const anyOrg = await firestore.collection('organizations').limit(1).get();
                    if (!anyOrg.empty) {
                        const orgDoc = anyOrg.docs[0];
                        currentOrgId = orgDoc.id;
                        if (orgNameMeta) orgNameMeta.textContent = orgDoc.data().name || 'Student Organization';
                        setupRealtimeListeners();
                    } else {
                        membersData = [];
                        updateStats(membersData);
                        renderMembers();
                    }
                }
            } catch (error) {
                console.error("Initialization error:", error);
                membersData = [];
                updateStats(membersData);
                renderMembers();
            }
        } else {
            // Check active session or resolve any organization (demo friendly)
            const isDemo = sessionStorage.getItem('demoUser') === 'true' ||
                window.location.search.includes('demo=true') ||
                window.location.hostname.includes('github.io');

            try {
                const anyOrg = await firestore.collection('organizations').limit(1).get();
                if (!anyOrg.empty) {
                    const orgDoc = anyOrg.docs[0];
                    currentOrgId = orgDoc.id;
                    if (orgNameMeta) orgNameMeta.textContent = orgDoc.data().name || 'ACM Student Chapter • NMIT';
                    setupRealtimeListeners();
                } else if (isDemo) {
                    currentOrgId = 'demo-org-acm';
                    if (orgNameMeta) orgNameMeta.textContent = 'ACM Student Chapter • NMIT';
                    setupRealtimeListeners();
                } else {
                    window.location.href = '../index.html';
                }
            } catch(e) {
                if (isDemo) {
                    currentOrgId = 'demo-org-acm';
                    if (orgNameMeta) orgNameMeta.textContent = 'ACM Student Chapter • NMIT';
                    setupRealtimeListeners();
                } else {
                    window.location.href = '../index.html';
                }
            }
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
            if (member.membershipStatus === 'active' && member.membershipEndDate && member.membershipEndDate < today) {
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
                (m.name || '').toLowerCase().includes(search) || 
                (m.email || '').toLowerCase().includes(search) ||
                (m.phone || '').includes(search) ||
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
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sort === 'expiring') {
            filtered.sort((a, b) => new Date(a.membershipEndDate || '9999-12-31') - new Date(b.membershipEndDate || '9999-12-31'));
        } else { // newest
            filtered.sort((a, b) => (b.joinedAt?.toMillis() || 0) - (a.joinedAt?.toMillis() || 0));
        }
        
        // Render
        if (filtered.length === 0) {
            memberListEl.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="ph-bold ph-users" style="font-size: 2.5rem; margin-bottom: 10px; display: block; color: var(--primary);"></i>
                    <p style="font-weight: 600;">No members match your criteria.</p>
                </div>
            `;
            return;
        }
        
        memberListEl.innerHTML = '';
        filtered.forEach(member => {
            const el = document.createElement('div');
            el.className = 'list-item';
            
            const initials = (member.name || 'M').substring(0, 2).toUpperCase();
            const dateStr = formatDate(member.membershipEndDate);
            const statusBadge = (member.membershipStatus || 'pending').toLowerCase();
            const studentIdText = member.studentId ? `ID: ${member.studentId}` : (member.phone || '--');
            
            el.innerHTML = `
                <div class="list-item-top">
                    <div class="checkbox-container">
                        <input type="checkbox" class="member-cb" value="${member.id}">
                        <div class="checkbox-box"></div>
                    </div>
                    <div class="member-avatar">${initials}</div>
                    <div class="member-info" style="cursor:pointer;" onclick="openMemberModal('${member.id}')">
                        <span class="member-name">${escapeHtml(member.name || 'Unnamed Member')}</span>
                        <span class="member-email">${escapeHtml(member.email || '')}</span>
                    </div>
                    <div class="member-meta-tag">${escapeHtml(studentIdText)}</div>
                    <div class="member-dates">
                        <span>Exp: ${dateStr}</span>
                    </div>
                    <div>
                        <span class="badge ${statusBadge}">${statusBadge.toUpperCase()}</span>
                    </div>
                    <div class="member-dues">
                        <label class="toggle-switch" title="Toggle Dues Paid">
                            <input type="checkbox" class="dues-toggle-cb" data-id="${member.id}" ${member.duesPaid ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="member-actions">
                        <button class="icon-only-btn" title="View & Edit" onclick="openMemberModal('${member.id}')">
                            <i class="ph-bold ph-caret-right"></i>
                        </button>
                    </div>
                </div>
                <div class="list-item-bottom" style="display: none;">
                    <!-- Rendered for mobile screens via media queries -->
                </div>
            `;
            memberListEl.appendChild(el);
        });
        
        attachCheckboxListeners();
        attachDuesListeners();
    }
    
    // --- ACTIONS: TOGGLE DUES ---
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
                        duesPaidAt: isPaid ? firebase.firestore.FieldValue.serverTimestamp() : null,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Auto-sync transaction if possible, without breaking member dues update
                    try {
                        if (isPaid && member) {
                            const existingTxn = await firestore.collection('transactions')
                                .where('relatedDocId', '==', id)
                                .where('relatedDocType', '==', 'member_dues')
                                .get();

                            if (existingTxn.empty) {
                                const duesAmt = Number(member.duesAmount) || 500;
                                const recUid = (currentUser && currentUser.uid) || (auth.currentUser && auth.currentUser.uid) || 'admin';
                                const recName = (currentUser && (currentUser.displayName || currentUser.email)) || 'Organization Admin';
                                await firestore.collection('transactions').add({
                                    orgId: currentOrgId,
                                    type: 'income',
                                    amount: duesAmt,
                                    category: 'dues',
                                    date: new Date().toISOString().split('T')[0],
                                    description: `Membership dues: ${member.name}`,
                                    recordedBy: recUid,
                                    recordedByName: recName,
                                    relatedDocId: id,
                                    relatedDocType: 'member_dues',
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        } else if (!isPaid) {
                            const txnSnap = await firestore.collection('transactions')
                                .where('relatedDocId', '==', id)
                                .where('relatedDocType', '==', 'member_dues')
                                .get();
                            const batch = firestore.batch();
                            txnSnap.forEach(doc => batch.delete(doc.ref));
                            if (!txnSnap.empty) await batch.commit();
                        }
                    } catch (txnErr) {
                        console.warn("Ledger auto-sync warning (non-fatal):", txnErr);
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

    // --- ADD MEMBER MODAL & VALIDATION ---
    if (addMemberBtn) {
        addMemberBtn.onclick = () => {
            addMemberForm.reset();
            newPaidCb.checked = true;
            newPaidLabel.textContent = 'Paid';
            newPaidLabel.style.color = 'var(--success)';
            addModal.classList.add('active');
        };
    }

    if (closeAddModalBtn) closeAddModalBtn.onclick = () => addModal.classList.remove('active');
    if (cancelAddModalBtn) cancelAddModalBtn.onclick = () => addModal.classList.remove('active');

    if (newPaidCb) {
        newPaidCb.onchange = () => {
            if (newPaidCb.checked) {
                newPaidLabel.textContent = 'Paid';
                newPaidLabel.style.color = 'var(--success)';
            } else {
                newPaidLabel.textContent = 'Unpaid';
                newPaidLabel.style.color = 'var(--warning)';
            }
        };
    }

    addMemberForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('new-member-name').value.trim();
        const email = document.getElementById('new-member-email').value.trim().toLowerCase();
        const phone = document.getElementById('new-member-phone').value.trim();
        const studentId = document.getElementById('new-member-studentid').value.trim();
        const planMonths = parseInt(document.getElementById('new-member-plan').value) || 12;
        const duesAmount = parseFloat(document.getElementById('new-member-dues').value);
        const isPaid = newPaidCb.checked;

        // VALIDATIONS
        if (name.length < 2) {
            showToast('Full name must be at least 2 characters.', 'error'); return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address.', 'error'); return;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
            showToast('Please enter a valid 10-digit phone number.', 'error'); return;
        }
        if (studentId.length < 2) {
            showToast('Please enter a valid Student ID / Roll No.', 'error'); return;
        }
        if (isNaN(duesAmount) || duesAmount < 0) {
            showToast('Dues amount must be 0 or a positive number.', 'error'); return;
        }

        const saveBtn = document.getElementById('save-new-member-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>Saving...</span>';

        try {
            // Check for duplicate in org
            const existing = await firestore.collection('members')
                .where('orgId', '==', currentOrgId)
                .where('email', '==', email)
                .get();

            if (!existing.empty) {
                showToast('A member with this email already exists in this organization.', 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Add Member</span>';
                return;
            }

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const expiryDate = new Date(now.getTime() + (planMonths * 30.5 * 24 * 60 * 60 * 1000));
            const expiryStr = expiryDate.toISOString().split('T')[0];

            const memberDoc = await firestore.collection('members').add({
                orgId: currentOrgId,
                name,
                email,
                phone,
                studentId,
                duesAmount,
                duesPaid: isPaid,
                membershipStatus: isPaid ? 'active' : 'pending',
                membershipStartDate: todayStr,
                membershipEndDate: expiryStr,
                duesPaidAt: isPaid ? firebase.firestore.FieldValue.serverTimestamp() : null,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                renewalReminderSent: false
            });

            if (isPaid && duesAmount > 0) {
                await firestore.collection('transactions').add({
                    orgId: currentOrgId,
                    type: 'income',
                    amount: duesAmount,
                    category: 'dues',
                    date: todayStr,
                    description: `Membership dues: ${name}`,
                    recordedBy: currentUser.uid,
                    recordedByName: currentUser.displayName || currentUser.email,
                    relatedDocId: memberDoc.id,
                    relatedDocType: 'member_dues',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            showToast(`Member ${name} added successfully!`, 'success');
            addModal.classList.remove('active');
        } catch (err) {
            console.error("Add member error:", err);
            showToast('Failed to add member.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Add Member</span>';
        }
    };

    // --- SHARE REGISTRATION LINK ---
    if (shareRegBtn) {
        shareRegBtn.onclick = () => {
            if (!currentOrgId) return;
            const regUrl = `${window.location.origin}/members/register.html?org=${currentOrgId}`;
            navigator.clipboard.writeText(regUrl).then(() => {
                showToast('Registration link copied to clipboard!', 'success');
            }).catch(() => {
                prompt('Copy this member registration link:', regUrl);
            });
        };
    }
    
    // --- MEMBER DETAIL / EDIT MODAL ---
    window.openMemberModal = (id) => {
        const member = membersData.find(m => m.id === id);
        if (!member) return;
        
        activeMemberDocId = id;
        
        document.getElementById('modal-member-name').textContent = member.name;
        const statusEl = document.getElementById('modal-member-status');
        const status = (member.membershipStatus || 'pending').toLowerCase();
        statusEl.textContent = status.toUpperCase();
        statusEl.className = `modal-subtitle badge ${status}`;
        
        document.getElementById('edit-member-name').value = member.name || '';
        document.getElementById('edit-member-email').value = member.email || '';
        document.getElementById('edit-member-phone').value = member.phone || '';
        document.getElementById('edit-member-studentid').value = member.studentId || '';
        document.getElementById('edit-member-enddate').value = member.membershipEndDate || '';
        
        const viewPassBtn = document.getElementById('modal-view-pass-btn');
        if (viewPassBtn) {
            viewPassBtn.href = `wallet-pass.html?email=${encodeURIComponent(member.email || '')}&id=${member.id || ''}`;
        }
        
        document.getElementById('modal-dues-amount').textContent = `₹${member.duesAmount || 0}`;
        document.getElementById('modal-dues-period').textContent = `Valid till: ${formatDate(member.membershipEndDate)}`;
        
        const toggle = document.getElementById('modal-dues-toggle');
        toggle.checked = member.duesPaid || false;
        document.getElementById('modal-dues-label').textContent = member.duesPaid ? 'Paid' : 'Mark as Paid';
        
        toggle.onchange = async (e) => {
            const isPaid = e.target.checked;
            try {
                const newStatus = isPaid ? 'active' : 'pending';
                await firestore.collection('members').doc(id).update({
                    duesPaid: isPaid,
                    membershipStatus: newStatus,
                    duesPaidAt: isPaid ? firebase.firestore.FieldValue.serverTimestamp() : null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (isPaid) {
                    const duesAmt = Number(member.duesAmount || 500);
                    if (window.PassTrack && window.PassTrack.Payments) {
                        await window.PassTrack.Payments.recordTreasuryIncome({
                            orgId: currentOrgId,
                            amount: duesAmt,
                            category: 'dues',
                            referenceId: id,
                            description: `Membership dues: ${member.name}`,
                            customerName: member.name
                        });
                    }
                }
                
                statusEl.textContent = newStatus.toUpperCase();
                statusEl.className = `modal-subtitle badge ${newStatus}`;
                document.getElementById('modal-dues-label').textContent = isPaid ? 'Paid' : 'Mark as Paid';
                showToast(`Dues marked as ${isPaid ? 'paid' : 'unpaid'}${isPaid ? ' & auto-recorded to Treasury ledger' : ''}.`, 'success');
            } catch(err) {
                e.target.checked = !isPaid;
                showToast('Failed to update dues.', 'error');
            }
        };
        
        memberModal.classList.add('active');
    };
    
    if (closeMemberModalBtn) closeMemberModalBtn.onclick = () => memberModal.classList.remove('active');
    if (cancelEditMemberBtn) cancelEditMemberBtn.onclick = () => memberModal.classList.remove('active');
    
    // Save edits
    editMemberForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!activeMemberDocId) return;

        const name = document.getElementById('edit-member-name').value.trim();
        const email = document.getElementById('edit-member-email').value.trim().toLowerCase();
        const phone = document.getElementById('edit-member-phone').value.trim();
        const studentId = document.getElementById('edit-member-studentid').value.trim();
        const endDate = document.getElementById('edit-member-enddate').value;

        if (name.length < 2) {
            showToast('Full name must be at least 2 characters.', 'error'); return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address.', 'error'); return;
        }
        if (phone) {
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits.length < 10 || phoneDigits.length > 15) {
                showToast('Phone number must have 10 to 15 digits.', 'error'); return;
            }
        }
        if (!endDate) {
            showToast('Please specify a membership expiry date.', 'error'); return;
        }

        const saveBtn = document.getElementById('save-edit-member-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Saving...';

        try {
            await firestore.collection('members').doc(activeMemberDocId).update({
                name,
                email,
                phone: phone || null,
                studentId: studentId || null,
                membershipEndDate: endDate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('Member details updated successfully.', 'success');
            memberModal.classList.remove('active');
        } catch(err) {
            console.error("Save edit error:", err);
            showToast('Failed to save changes.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> Save Changes';
        }
    };

    if (modalDeleteBtn) {
        modalDeleteBtn.onclick = async () => {
            if (!activeMemberDocId) return;
            if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) return;
            
            try {
                await firestore.collection('members').doc(activeMemberDocId).delete();
                showToast('Member removed from directory.', 'success');
                memberModal.classList.remove('active');
            } catch(err) {
                console.error("Delete error", err);
                showToast('Failed to delete member.', 'error');
            }
        };
    }

    // --- BULK ACTIONS ---
    function attachCheckboxListeners() {
        const cbs = document.querySelectorAll('.member-cb');
        cbs.forEach(cb => cb.addEventListener('change', updateBulkBar));
        
        selectAllCb.onchange = (e) => {
            cbs.forEach(cb => cb.checked = e.target.checked);
            updateBulkBar();
        };
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
    
    bulkRemindBtn.onclick = async () => {
        const checked = Array.from(document.querySelectorAll('.member-cb:checked')).map(cb => cb.value);
        if (checked.length === 0) return;

        if (!window.GOOGLE_SCRIPT_URL || window.GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_URL") {
            showToast(`Would send dues reminders to ${checked.length} members (Google Apps Script configured).`, 'info');
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
            await new Promise(r => setTimeout(r, 250));
        }
        showToast(`Sent reminders to ${sent} members!`, 'success');
        document.querySelectorAll('.member-cb:checked').forEach(cb => cb.checked = false);
        updateBulkBar();
    };
    
    bulkDeleteBtn.onclick = async () => {
        const checked = Array.from(document.querySelectorAll('.member-cb:checked')).map(cb => cb.value);
        if (!confirm(`Permanently delete ${checked.length} selected members?`)) return;
        
        const batch = firestore.batch();
        checked.forEach(id => batch.delete(firestore.collection('members').doc(id)));
        
        try {
            await batch.commit();
            showToast('Selected members deleted.', 'success');
            updateBulkBar();
        } catch(err) {
            showToast('Failed to delete members.', 'error');
        }
    };
    
    remindExpiringBtn.onclick = async () => {
        const expiring = membersData.filter(m => m.membershipStatus === 'active' && isExpiringSoon(m.membershipEndDate));
        if (expiring.length === 0) {
            showToast('No members expiring within the next 30 days.', 'info');
            return;
        }

        if (!window.GOOGLE_SCRIPT_URL || window.GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_URL") {
            showToast(`Would send renewal reminders to ${expiring.length} members.`, 'info');
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
                await firestore.collection('members').doc(member.id).update({ renewalReminderSent: true });
                sent++;
            } catch (err) {
                console.error(`Renewal remind failed:`, err);
            }
            await new Promise(r => setTimeout(r, 250));
        }
        showToast(`Sent renewal notices to ${sent} members!`, 'success');
    };

    // --- EVENTS & FILTERS ---
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
        if (isNaN(date.getTime())) return '--';
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
