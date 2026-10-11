// File: announcements/board.js - Public Notice Board Viewer
document.addEventListener('DOMContentLoaded', async () => {
    const firestore = db;

    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('org');

    const spinner = document.getElementById('loading-spinner');
    const postsContainer = document.getElementById('posts-container');
    const orgNameEl = document.getElementById('org-name');
    
    if (!orgId) {
        spinner.innerHTML = '<p style="color:var(--danger);">Error: Missing organization ID parameter.</p>';
        return;
    }

    try {
        let orgDoc = null;
        try {
            orgDoc = await firestore.collection('organizations').doc(orgId).get();
        } catch(e) {}

        if (orgDoc && orgDoc.exists) {
            orgNameEl.textContent = orgDoc.data().name || 'Notice Board';

            // Fetch announcements
            firestore.collection('announcements')
                .where('orgId', '==', orgId)
                .orderBy('createdAt', 'desc')
                .onSnapshot(snap => {
                    const posts = snap.docs.map(d => ({id: d.id, ...d.data()}));
                    renderPosts(posts);
                }, error => {
                    console.error("Announcements query error:", error);
                    // Fallback to client-side sort if index is building
                    firestore.collection('announcements')
                        .where('orgId', '==', orgId)
                        .get()
                        .then(snap => {
                            const posts = snap.docs.map(d => ({id: d.id, ...d.data()}));
                            renderPosts(posts);
                        })
                        .catch(() => {
                            spinner.innerHTML = '<p style="color:var(--danger);">Failed to load notices from database.</p>';
                        });
                });
        } else {
            spinner.innerHTML = '<p style="color:var(--danger); text-align:center;">Organization not found.</p>';
            return;
        }

    } catch (err) {
        console.error("Error loading board:", err);
        spinner.innerHTML = '<p style="color:var(--danger); text-align:center;">Error loading notices.</p>';
    }

    function renderPosts(posts) {
        spinner.style.display = 'none';
        
        if (posts.length === 0) {
            // Auto-seed sample announcement into Firebase if collection is empty
            if (orgId === 'SZR1vhPUuzByjh2aUGUR') {
                firestore.collection('announcements').add({
                    orgId: orgId,
                    eventId: '8L1frodqyHc2JJ4k69o6',
                    title: '🎉 Welcome to Hack 2026: Official Check-in & Event Briefing',
                    content: `Welcome all participants and club members to **Hack 2026**!\n\n### Important Instructions & Event Timeline:\n1. **Check-in Timing:** Station check-ins open sharply at \`09:00 AM IST\` at the main auditorium.\n2. **Digital Pass Required:** Keep your QR pass handy on your mobile phone via the Pass Viewer.\n3. **Merchandise Desk:** Official hoodies and badges can be claimed at Booth #2 upon showing your order QR.\n4. **Food & Snacks:** Lunch coupons will be distributed to active members at 1:00 PM.\n\nGood luck, have fun, and build something epic! 🚀`,
                    category: 'Important',
                    pinned: true,
                    authorName: 'Event Coordinator',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(err => console.log("Auto-seed notice info:", err));
            }

            postsContainer.innerHTML = `
                <div class="card" style="text-align:center; padding:50px 20px; background:#ffffff; border-radius:16px; border:1px solid var(--border);">
                    <i class="ph-bold ph-bell-z" style="font-size:3rem; color:var(--primary); margin-bottom:15px; display:inline-block;"></i>
                    <h2 style="margin: 0 0 8px; color:var(--text-main);">No Announcements Yet</h2>
                    <p style="color:var(--text-muted); margin:0;">Check back later for official club notices and updates.</p>
                </div>
            `;
            return;
        }

        // Pinned first, then newest
        posts.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });
        
        postsContainer.innerHTML = '';
        
        posts.forEach(post => {
            const el = document.createElement('div');
            el.className = `post-card ${post.pinned ? 'pinned-notice' : ''}`;
            el.style.cssText = 'background:#ffffff; border:1px solid var(--border); border-radius:16px; padding:24px; margin-bottom:20px; box-shadow:0 4px 15px rgba(0,0,0,0.02); text-align:left;';
            if (post.pinned) {
                el.style.borderLeft = '4px solid var(--primary)';
            }
            
            const dateStr = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Recent';
            
            const parsed = typeof marked !== 'undefined' ? marked.parse(post.content || '') : (post.content || '');
            const htmlContent = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(parsed) : parsed;
            const category = post.category || 'General';

            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${post.pinned ? '<span style="background:rgba(106,17,203,0.1); color:var(--primary); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;"><i class="ph-bold ph-push-pin"></i> Pinned</span>' : ''}
                        <span style="background:#f1f5f9; color:#475569; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">${category}</span>
                    </div>
                    <span style="font-size:0.8rem; color:var(--text-muted);"><i class="ph-bold ph-calendar-blank"></i> ${dateStr}</span>
                </div>
                <h2 class="post-title" style="margin:0 0 14px; font-size:1.3rem; font-weight:800; color:var(--text-main); line-height:1.3;">${escapeHtml(post.title || '')}</h2>
                <div class="post-content" style="line-height:1.7; color:#334155; font-size:0.95rem;">
                    ${htmlContent}
                </div>
            `;
            
            postsContainer.appendChild(el);
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
