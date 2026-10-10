// File: announcements/board.js
document.addEventListener('DOMContentLoaded', async () => {
    const firestore = db;

    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('org');

    const spinner = document.getElementById('loading-spinner');
    const postsContainer = document.getElementById('posts-container');
    const orgNameEl = document.getElementById('org-name');
    
    if (!orgId) {
        spinner.innerHTML = '<p>Error: Missing organization ID.</p>';
        return;
    }

    try {
        const orgDoc = await firestore.collection('organizations').doc(orgId).get();
        if (!orgDoc.exists) {
            spinner.innerHTML = '<p>Organization not found.</p>';
            return;
        }
        orgNameEl.textContent = orgDoc.data().name;

        // Fetch announcements
        firestore.collection('announcements')
            .where('orgId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                const posts = snap.docs.map(d => ({id: d.id, ...d.data()}));
                renderPosts(posts);
            }, error => {
                console.error("Firestore error:", error);
                // Fallback for missing index
                if (error.message.includes('index')) {
                    firestore.collection('announcements').where('orgId', '==', orgId).get().then(snap => {
                        const posts = snap.docs.map(d => ({id: d.id, ...d.data()}))
                            .sort((a,b) => (b.createdAt?.toMillis()||0) - (a.createdAt?.toMillis()||0));
                        renderPosts(posts);
                    });
                }
            });

    } catch (err) {
        console.error("Error loading board:", err);
        spinner.innerHTML = '<p>Failed to load notice board.</p>';
    }

    function renderPosts(posts) {
        spinner.style.display = 'none';
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="card" style="text-align:center; padding:50px;">
                    <i class="ph-bold ph-bell-z" style="font-size:3rem; color:var(--primary); margin-bottom:15px;"></i>
                    <h2>No Announcements</h2>
                    <p style="color:var(--text-muted);">Check back later for updates.</p>
                </div>
            `;
            return;
        }
        
        postsContainer.innerHTML = '';
        
        posts.forEach(post => {
            const el = document.createElement('div');
            el.className = 'post-card';
            
            const dateStr = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
            }) : '';
            
            const htmlContent = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(marked.parse(post.content)) : marked.parse(post.content);

            el.innerHTML = `
                <h2 class="post-title">${post.title}</h2>
                <div class="post-meta">
                    <i class="ph-bold ph-calendar-blank"></i> ${dateStr}
                </div>
                <div class="post-content">
                    ${htmlContent}
                </div>
            `;
            
            postsContainer.appendChild(el);
        });
    }
});
