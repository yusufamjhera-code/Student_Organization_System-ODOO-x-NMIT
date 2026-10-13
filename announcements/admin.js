// File: announcements/admin.js - Production Announcement Management Controller
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db;
    
    const orgNameMeta = document.getElementById('org-name-meta');
    const listEl = document.getElementById('announcements-list');
    const modal = document.getElementById('post-modal');
    const form = document.getElementById('post-form');
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const categorySelect = document.getElementById('post-category');
    const pinnedCb = document.getElementById('post-pinned');
    const notifyCb = document.getElementById('post-notify');
    const deleteBtn = document.getElementById('delete-post-btn');
    const saveBtn = document.getElementById('save-post-btn');
    
    // Header actions
    const viewBoardLink = document.getElementById('view-board-link');
    const shareBoardBtn = document.getElementById('share-board-btn');
    
    // Controls
    const searchInput = document.getElementById('announcement-search');
    const filterSelect = document.getElementById('announcement-filter');
    
    // Markdown Tabs
    const tabWrite = document.getElementById('tab-write');
    const tabPreview = document.getElementById('tab-preview');
    const previewPane = document.getElementById('post-preview-pane');

    let currentOrgId = null;
    let currentUser = null;
    let announcementsData = [];
    let editDocId = null;

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        const isDemo = sessionStorage.getItem('demoUser') === 'true' ||
            window.location.search.includes('demo=true') ||
            window.location.hostname.includes('github.io');

        if (user || isDemo) {
            currentUser = user || {
                uid: 'demo-organizer-uid',
                email: 'organizer@nmit.ac.in',
                displayName: 'Demo Host'
            };

            if (sessionStorage.getItem('authType') !== 'collaborator') {
                sessionStorage.setItem('authType', 'admin');
            }

            try {
                let orgSnap = await firestore.collection('organizations').where('ownerId', '==', currentUser.uid).limit(1).get();
                if (orgSnap.empty) {
                    orgSnap = await firestore.collection('organizations').limit(1).get();
                }

                if (orgSnap.empty) {
                    if (orgNameMeta) orgNameMeta.textContent = 'ACM Student Chapter • NMIT';
                    currentOrgId = 'demo-org-acm';
                    if (viewBoardLink) {
                        viewBoardLink.href = `board.html?org=${currentOrgId}`;
                    }
                    setupRealtimeListeners();
                    return;
                }
                
                const orgDoc = orgSnap.docs[0];
                currentOrgId = orgDoc.id;
                if (orgNameMeta) orgNameMeta.textContent = orgDoc.data().name || 'ACM Student Chapter • NMIT';

                // Wire up public links
                if (viewBoardLink) {
                    viewBoardLink.href = `board.html?org=${currentOrgId}`;
                }

                setupRealtimeListeners();
                
            } catch (error) {
                console.error("Initialization error:", error);
                if (orgNameMeta) orgNameMeta.textContent = 'ACM Student Chapter • NMIT';
                currentOrgId = 'demo-org-acm';
                if (viewBoardLink) {
                    viewBoardLink.href = `board.html?org=${currentOrgId}`;
                }
                setupRealtimeListeners();
            }
        } else {
            window.location.href = '../index.html';
        }
    });

    if (shareBoardBtn) {
        shareBoardBtn.onclick = () => {
            if (!currentOrgId) return;
            const boardUrl = `${window.location.origin}/announcements/board.html?org=${currentOrgId}`;
            navigator.clipboard.writeText(boardUrl).then(() => {
                showToast('Notice Board link copied to clipboard!', 'success');
            }).catch(() => {
                prompt('Notice Board public link:', boardUrl);
            });
        };
    }

    // --- MARKDOWN TABS ---
    if (tabWrite && tabPreview && previewPane) {
        tabWrite.onclick = () => {
            tabWrite.classList.add('active');
            tabPreview.classList.remove('active');
            contentInput.style.display = 'block';
            previewPane.style.display = 'none';
        };

        tabPreview.onclick = () => {
            tabPreview.classList.add('active');
            tabWrite.classList.remove('active');
            contentInput.style.display = 'none';
            previewPane.style.display = 'block';

            const rawText = contentInput.value.trim();
            if (!rawText) {
                previewPane.innerHTML = '<p style="color:var(--text-muted); font-style:italic;">Nothing to preview yet.</p>';
            } else {
                const parsed = typeof marked !== 'undefined' ? marked.parse(rawText) : rawText;
                previewPane.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(parsed) : parsed;
            }
        };
    }

    // --- REAL-TIME DATA ---
    function setupRealtimeListeners() {
        firestore.collection('announcements')
            .where('orgId', '==', currentOrgId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderList();
            }, error => {
                console.error("Firestore error:", error);
                if (error.message.includes('index')) {
                    firestore.collection('announcements').where('orgId', '==', currentOrgId).get().then(snap => {
                        announcementsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                            .sort((a,b) => (b.createdAt?.toMillis()||0) - (a.createdAt?.toMillis()||0));
                        renderList();
                    });
                }
            });
    }

    function renderList() {
        let filtered = [...announcementsData];

        // Filter by Tag
        if (filterSelect && filterSelect.value !== 'all') {
            filtered = filtered.filter(p => (p.category || 'General') === filterSelect.value);
        }

        // Search
        if (searchInput && searchInput.value.trim()) {
            const query = searchInput.value.trim().toLowerCase();
            filtered = filtered.filter(p => 
                (p.title || '').toLowerCase().includes(query) || 
                (p.content || '').toLowerCase().includes(query)
            );
        }

        // Sort: Pinned posts first, then newest
        filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="ph-bold ph-megaphone" style="font-size: 2.5rem; margin-bottom: 10px; display: block; color: var(--primary);"></i>
                    <p style="font-weight: 600; margin-bottom: 6px;">No announcements published yet.</p>
                    <p style="font-size: 0.85rem; margin: 0;">Click "Post Announcement" above to publish your first notice to members.</p>
                </div>
            `;
            return;
        }
        
        listEl.innerHTML = '';
        filtered.forEach(post => {
            const el = document.createElement('div');
            el.className = `announcement-card ${post.pinned ? 'pinned' : ''}`;
            
            const dateStr = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Just now';
            
            const category = post.category || 'General';
            const parsed = typeof marked !== 'undefined' ? marked.parse(post.content || '') : (post.content || '');
            const sanitized = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(parsed) : parsed;

            el.innerHTML = `
                <div class="announcement-card-header">
                    <div style="flex: 1;">
                        <div class="announcement-title-row">
                            ${post.pinned ? '<span class="pinned-badge"><i class="ph-bold ph-push-pin"></i> Pinned</span>' : ''}
                            <span class="tag-badge ${category}">${category}</span>
                            <h3 class="announcement-title">${escapeHtml(post.title || 'Untitled')}</h3>
                        </div>
                        <div class="announcement-meta" style="margin-top: 6px;">
                            <span><i class="ph-bold ph-calendar-blank"></i> ${dateStr}</span>
                        </div>
                    </div>
                    <div>
                        <button class="secondary-btn edit-btn" style="padding: 6px 12px; font-size: 0.85rem;" data-id="${post.id}">
                            <i class="ph-bold ph-pencil-simple"></i> <span>Edit</span>
                        </button>
                    </div>
                </div>
                <div class="announcement-content-box">
                    ${sanitized}
                </div>
            `;
            listEl.appendChild(el);
            
            el.querySelector('.edit-btn').onclick = () => openEditModal(post);
        });
    }

    if (searchInput) searchInput.addEventListener('input', renderList);
    if (filterSelect) filterSelect.addEventListener('change', renderList);

    // --- ACTIONS: MODAL ---
    document.getElementById('post-new-btn').onclick = () => {
        editDocId = null;
        form.reset();
        if (tabWrite) tabWrite.click();
        document.getElementById('post-modal-title').textContent = 'New Announcement';
        deleteBtn.style.display = 'none';
        saveBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>Post Announcement</span>';
        modal.classList.add('active');
    };

    document.getElementById('close-post-modal').onclick = () => modal.classList.remove('active');
    document.getElementById('cancel-post-btn').onclick = () => modal.classList.remove('active');

    function openEditModal(post) {
        editDocId = post.id;
        titleInput.value = post.title || '';
        contentInput.value = post.content || '';
        if (categorySelect) categorySelect.value = post.category || 'General';
        if (pinnedCb) pinnedCb.checked = !!post.pinned;
        notifyCb.checked = false; // Don't blast re-notifications on edit
        
        if (tabWrite) tabWrite.click();
        document.getElementById('post-modal-title').textContent = 'Edit Announcement';
        deleteBtn.style.display = 'block';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Changes</span>';
        modal.classList.add('active');
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const category = categorySelect ? categorySelect.value : 'General';
        const pinned = pinnedCb ? pinnedCb.checked : false;

        // RIGOROUS VALIDATION
        if (title.length < 3) {
            showToast('Announcement title must be at least 3 characters.', 'error');
            return;
        }
        if (title.length > 100) {
            showToast('Announcement title cannot exceed 100 characters.', 'error');
            return;
        }
        if (content.length < 10) {
            showToast('Announcement message must be at least 10 characters.', 'error');
            return;
        }

        const data = {
            orgId: currentOrgId,
            title: title,
            content: content,
            category: category,
            pinned: pinned,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Saving...';

        try {
            if (editDocId) {
                await firestore.collection('announcements').doc(editDocId).update(data);
                showToast('Announcement updated successfully.', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await firestore.collection('announcements').add(data);
                showToast('Announcement published to board!', 'success');
                
                if (notifyCb.checked) {
                    await notifyMembers(data.title, data.content);
                }
            }
            modal.classList.remove('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to save announcement.', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    deleteBtn.onclick = async () => {
        if (!editDocId) return;
        if (!confirm('Are you sure you want to delete this announcement?')) return;
        
        try {
            await firestore.collection('announcements').doc(editDocId).delete();
            showToast('Announcement deleted from board.', 'success');
            modal.classList.remove('active');
        } catch(err) {
            showToast('Failed to delete announcement.', 'error');
        }
    };

    async function notifyMembers(title, content = '') {
        try {
            const membersSnap = await firestore.collection('members')
                .where('orgId', '==', currentOrgId)
                .where('membershipStatus', '==', 'active')
                .get();

            if (membersSnap.empty) {
                showToast('No active members to notify.', 'info');
                return;
            }

            if (!window.GOOGLE_SCRIPT_URL || window.GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_URL") {
                showToast(`Simulated: Would notify ${membersSnap.size} active members.`, 'info');
                return;
            }

            let sent = 0;
            for (const doc of membersSnap.docs) {
                const member = doc.data();
                try {
                    await fetch(window.GOOGLE_SCRIPT_URL, {
                        method: 'POST', mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            security_token: "PT_SECURE_2026",
                            type: 'announcement',
                            to_email: member.email,
                            to_name: member.name,
                            announcement_title: title,
                            announcement_content: content,
                            org_name: orgNameMeta?.textContent || 'Student Organization'
                        })
                    });
                    sent++;
                } catch (emailErr) {
                    console.error(`Failed to notify ${member.email}:`, emailErr);
                }
                await new Promise(r => setTimeout(r, 250));
            }
            showToast(`Broadcast sent to ${sent} active members!`, 'success');
        } catch (err) {
            console.error("Notify error:", err);
            showToast('Failed to send broadcast.', 'error');
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
