// File: index.js

const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

let currentTargetUrl = '';
let currentType = ''; // 'org' or 'event'

function openSelector(type, targetUrl) {
    if (event) event.preventDefault();
    
    if (!db) {
        alert("Firebase is not properly initialized. Please check your config.");
        return;
    }

    currentTargetUrl = targetUrl;
    currentType = type;

    const modal = document.getElementById('selector-modal');
    const title = document.getElementById('selector-title');
    const subtitle = document.getElementById('selector-subtitle');
    const list = document.getElementById('selector-list');

    list.innerHTML = '<p style="text-align:center; padding:1rem;">Loading...</p>';
    modal.style.display = 'flex';

    if (type === 'org') {
        title.textContent = 'Select Organization';
        subtitle.textContent = 'Choose the student organization you want to join/view:';
        fetchOrganizations();
    } else if (type === 'event') {
        title.textContent = 'Select Event';
        subtitle.textContent = 'Choose the event you want to buy tickets for:';
        fetchEvents();
    }
}

function closeSelector() {
    document.getElementById('selector-modal').style.display = 'none';
}

async function fetchOrganizations() {
    const list = document.getElementById('selector-list');
    try {
        const snap = await db.collection('organizations').orderBy('createdAt', 'desc').limit(20).get();
        if (snap.empty) {
            list.innerHTML = '<p style="text-align:center; color:#666;">No organizations found.</p>';
            return;
        }

        list.innerHTML = '';
        snap.forEach(doc => {
            const org = doc.data();
            const btn = document.createElement('button');
            btn.className = 'selector-item-btn';
            btn.innerHTML = `<strong>${org.name}</strong>`;
            btn.style.cssText = 'padding: 12px; text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; margin-bottom: 8px; transition: 0.2s;';
            btn.onmouseover = () => btn.style.background = '#e2e8f0';
            btn.onmouseout = () => btn.style.background = '#f8fafc';
            btn.onclick = () => {
                window.location.href = `${currentTargetUrl}?org=${doc.id}`;
            };
            list.appendChild(btn);
        });
    } catch (err) {
        console.error("Error fetching organizations:", err);
        list.innerHTML = '<p style="color:red; text-align:center;">Failed to load options. Ensure Firebase config is valid.</p>';
    }
}

async function fetchEvents() {
    const list = document.getElementById('selector-list');
    try {
        const today = new Date().toISOString().split('T')[0];
        // Fetch upcoming events
        const snap = await db.collection('events').where('eventDate', '>=', today).limit(20).get();
        
        if (snap.empty) {
            list.innerHTML = '<p style="text-align:center; color:#666;">No upcoming events found.</p>';
            return;
        }

        list.innerHTML = '';
        snap.forEach(doc => {
            const ev = doc.data();
            const btn = document.createElement('button');
            btn.className = 'selector-item-btn';
            btn.innerHTML = `<strong>${ev.name}</strong><br><small style="color:#64748b;">${new Date(ev.eventDate).toLocaleDateString()}</small>`;
            btn.style.cssText = 'padding: 12px; text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; margin-bottom: 8px; transition: 0.2s; line-height: 1.4;';
            btn.onmouseover = () => btn.style.background = '#e2e8f0';
            btn.onmouseout = () => btn.style.background = '#f8fafc';
            btn.onclick = () => {
                window.location.href = `${currentTargetUrl}?event=${doc.id}`;
            };
            list.appendChild(btn);
        });
    } catch (err) {
        console.error("Error fetching events:", err);
        list.innerHTML = '<p style="color:red; text-align:center;">Failed to load options. Ensure Firebase config is valid.</p>';
    }
}
