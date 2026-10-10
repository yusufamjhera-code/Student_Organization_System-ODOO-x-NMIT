// File: announcements/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db;
    
    const orgNameMeta = document.getElementById('org-name-meta');
    const listEl = document.getElementById('announcements-list');
    const modal = document.getElementById('post-modal');
    const form = document.getElementById('post-form');
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const notifyCb = document.getElementById('post-notify');
    const deleteBtn = document.getElementById('delete-post-btn');
    const saveBtn = document.getElementById('save-post-btn');
    
    let currentOrgId = null;
    let announcementsData = [];
    let editDocId = null;

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        if (!user || sessionStorage.getItem('authType') !== 'admin') {
            window.location.href = '../index.html';
            return;
        }

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
            console.error("Initialization error:", error);
            showToast('Failed to load data.', 'error');
        }
    });

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
                // Fallback if index is missing
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
        if (announcementsData.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><i class="ph ph-megaphone"></i><p>No announcements posted yet.</p></div>';
            return;
        }
        
        listEl.innerHTML = '';
        announcementsData.forEach(post => {
            const el = document.createElement('div');
            el.className = 'list-item card';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'flex-start';
            el.style.gap = '10px';
            
            const dateStr = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : 'Just now';
            const htmlContent = marked.parse(post.content);

            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <h3 style="margin:0; font-size:1.1rem;">${post.title}</h3>
                    <button class="icon-only-btn edit-btn" data-id="${post.id}"><i class="ph-bold ph-pencil-simple"></i></button>
                </div>
                <small style="color:var(--text-muted);">${dateStr}</small>
                <div class="markdown-preview" style="background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; width:100%; max-height:150px; overflow-y:auto;">
                    ${htmlContent}
                </div>
            `;
            listEl.appendChild(el);
            
            el.querySelector('.edit-btn').onclick = () => openEditModal(post);
        });
    }

    // --- ACTIONS ---
    document.getElementById('post-new-btn').onclick = () => {
        editDocId = null;
        form.reset();
        document.getElementById('post-modal-title').textContent = 'New Announcement';
        deleteBtn.style.display = 'none';
        saveBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>Post</span>';
        modal.classList.add('active');
    };

    document.getElementById('close-post-modal').onclick = () => modal.classList.remove('active');
    document.getElementById('cancel-post-btn').onclick = () => modal.classList.remove('active');

    function openEditModal(post) {
        editDocId = post.id;
        titleInput.value = post.title;
        contentInput.value = post.content;
        notifyCb.checked = false; // Usually don't re-notify on edit
        
        document.getElementById('post-modal-title').textContent = 'Edit Announcement';
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
            title: titleInput.value.trim(),
            content: contentInput.value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (editDocId) {
                await firestore.collection('announcements').doc(editDocId).update(data);
                showToast('Announcement updated', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await firestore.collection('announcements').add(data);
                showToast('Announcement posted', 'success');
                
                if (notifyCb.checked) {
                    await notifyMembers(data.title);
                }
            }
            modal.classList.remove('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to save announcement', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    deleteBtn.onclick = async () => {
        if (!editDocId) return;
        if (!confirm('Delete this announcement?')) return;
        
        try {
            await firestore.collection('announcements').doc(editDocId).delete();
            showToast('Announcement deleted', 'success');
            modal.classList.remove('active');
        } catch(err) {
            showToast('Failed to delete', 'error');
        }
    };

    async function notifyMembers(title) {
        // Optional: Get active members and call GAS
        showToast('Notification emails dispatched (simulation)', 'info');
    }

    // --- UTILS ---
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
