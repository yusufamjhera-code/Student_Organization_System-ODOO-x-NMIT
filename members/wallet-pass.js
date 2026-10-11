// File: members/wallet-pass.js - 3D Digital Membership Wallet Pass Controller
document.addEventListener('DOMContentLoaded', async () => {
    const auth = firebase.auth();
    const firestore = db;

    // Elements
    const walletCard = document.getElementById('wallet-card');
    const flipBtn = document.getElementById('flip-card-btn');
    const downloadBtn = document.getElementById('download-pass-btn');
    const printBtn = document.getElementById('print-pass-btn');
    const qrContainer = document.getElementById('pass-qrcode');

    // Card Fields
    const orgNameEl = document.getElementById('card-org-name');
    const tierBadge = document.getElementById('card-tier-badge');
    const tierText = document.getElementById('card-tier-text');
    const memberNameEl = document.getElementById('card-member-name');
    const memberRoleEl = document.getElementById('card-member-role');
    const memberDeptEl = document.getElementById('card-member-dept');
    const memberUsnEl = document.getElementById('card-member-usn');
    const validDateEl = document.getElementById('card-valid-date');
    const serialNoEl = document.getElementById('card-serial-no');
    const issuedDateEl = document.getElementById('card-issued-date');

    // Lookup Box
    const lookupInput = document.getElementById('lookup-member-input');
    const lookupBtn = document.getElementById('lookup-member-btn');
    const quickPills = document.querySelectorAll('.pill-btn');

    // Demo Data
    const DEMO_MEMBERS = [
        {
            id: 'mem-1',
            name: 'Arjun Nambiar',
            email: 'arjun.nambiar@nmit.ac.in',
            usn: '1NT23CS042',
            department: 'Computer Science',
            clubRole: 'President',
            tier: 'core',
            membershipStatus: 'active',
            membershipEndDate: '2026-07-31',
            joinedDate: '2025-08-01',
            serial: 'PT-MEM-2026-9481'
        },
        {
            id: 'mem-2',
            name: 'Ananya Sharma',
            email: 'ananya.s@nmit.ac.in',
            usn: '1NT23IS019',
            department: 'Information Science',
            clubRole: 'Vice President & Tech Lead',
            tier: 'core',
            membershipStatus: 'active',
            membershipEndDate: '2026-07-31',
            joinedDate: '2025-08-01',
            serial: 'PT-MEM-2026-9482'
        },
        {
            id: 'mem-3',
            name: 'Karthik Hegde',
            email: 'karthik.hegde@nmit.ac.in',
            usn: '1NT23EC088',
            department: 'Electronics & Comm.',
            clubRole: 'Treasury Lead',
            tier: 'core',
            membershipStatus: 'active',
            membershipEndDate: '2026-07-31',
            joinedDate: '2025-08-01',
            serial: 'PT-MEM-2026-9483'
        },
        {
            id: 'mem-4',
            name: 'Pooja Kulkarni',
            email: 'pooja.k@nmit.ac.in',
            usn: '1NT23CS112',
            department: 'Computer Science',
            clubRole: 'Active Member',
            tier: 'active',
            membershipStatus: 'active',
            membershipEndDate: '2026-06-30',
            joinedDate: '2025-09-10',
            serial: 'PT-MEM-2026-9484'
        },
        {
            id: 'mem-5',
            name: 'Vikramaditya Rao',
            email: 'vikram.rao@nmit.ac.in',
            usn: '1NT20CS099',
            department: 'Computer Science',
            clubRole: 'Alumni Mentor',
            tier: 'alumni',
            membershipStatus: 'active',
            membershipEndDate: '2027-12-31',
            joinedDate: '2021-08-01',
            serial: 'PT-MEM-2026-9485'
        }
    ];

    let currentMember = null;
    let qrInstance = null;

    // --- 3D FLIP CONTROLS ---
    function toggleCardFlip() {
        if (!walletCard) return;
        walletCard.classList.toggle('is-flipped');
    }

    if (walletCard) {
        walletCard.addEventListener('click', toggleCardFlip);
        walletCard.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                toggleCardFlip();
            }
        });
    }

    if (flipBtn) {
        flipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCardFlip();
        });
    }

    // --- RENDER MEMBER DATA ON PASS ---
    function renderMemberPass(member, orgName = 'ACM Student Chapter • NMIT') {
        currentMember = member;

        orgNameEl.textContent = orgName;
        memberNameEl.textContent = member.name || member.fullName || 'Club Member';
        memberRoleEl.textContent = member.clubRole || 'Active Member';
        memberDeptEl.textContent = member.department || 'Engineering';
        memberUsnEl.textContent = member.usn || member.studentId || '1NT23CS000';

        // Calculate Tier
        const roleLower = (member.clubRole || '').toLowerCase();
        let tier = 'active';
        if (roleLower.includes('president') || roleLower.includes('lead') || roleLower.includes('core')) {
            tier = 'core';
        } else if (roleLower.includes('alumni') || roleLower.includes('mentor')) {
            tier = 'alumni';
        }

        tierBadge.className = `tier-badge tier-${tier}`;
        tierText.textContent = tier === 'core' ? 'CORE TEAM' : (tier === 'alumni' ? 'ALUMNI' : 'ACTIVE MEMBER');

        // Dates & Serials
        const endDate = member.membershipEndDate ? new Date(member.membershipEndDate) : new Date(Date.now() + 300*24*60*60*1000);
        validDateEl.textContent = `${String(endDate.getMonth() + 1).padStart(2, '0')}/${endDate.getFullYear()}`;
        
        serialNoEl.textContent = member.serial || `PT-MEM-2026-${(member.usn || '0000').slice(-4)}`;
        issuedDateEl.textContent = member.joinedDate ? new Date(member.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase() : 'AUG 2025';

        // Dynamic QR Generation
        generatePassQR(member);
    }

    // --- QR CODE GENERATION ---
    function generatePassQR(member) {
        if (!qrContainer) return;
        qrContainer.innerHTML = '';
        
        const payload = JSON.stringify({
            app: 'PassTrack',
            type: 'MEMBERSHIP_PASS',
            id: member.id || member.email,
            name: member.name,
            usn: member.usn || member.studentId,
            exp: member.membershipEndDate,
            sig: 'PT_VERIFIED_' + (member.usn || 'OK')
        });

        qrInstance = new QRCode(qrContainer, {
            text: payload,
            width: 70,
            height: 70,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    }

    // --- RESOLVE MEMBER FROM URL / FIRESTORE / DEMO ---
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    const memberEmail = urlParams.get('email');
    const memberUsn = urlParams.get('usn');

    async function loadMember() {
        // 1. Try finding in demo dataset first if query matches
        const queryTerm = (memberId || memberEmail || memberUsn || '').toLowerCase();
        if (queryTerm) {
            const foundDemo = DEMO_MEMBERS.find(m => 
                m.id.toLowerCase() === queryTerm ||
                m.email.toLowerCase() === queryTerm ||
                m.usn.toLowerCase() === queryTerm
            );
            if (foundDemo) {
                renderMemberPass(foundDemo);
                return;
            }
        }

        // 2. Query Firestore if live credentials exist
        if (firestore && (memberId || memberEmail)) {
            try {
                if (memberId) {
                    const doc = await firestore.collection('members').doc(memberId).get();
                    if (doc.exists) {
                        renderMemberPass({ id: doc.id, ...doc.data() });
                        return;
                    }
                }
                if (memberEmail) {
                    const snap = await firestore.collection('members').where('email', '==', memberEmail).limit(1).get();
                    if (!snap.empty) {
                        renderMemberPass({ id: snap.docs[0].id, ...snap.docs[0].data() });
                        return;
                    }
                }
            } catch (err) {
                console.warn("Firestore member query note:", err);
            }
        }

        // 3. Fallback: Default to demo leader Arjun
        renderMemberPass(DEMO_MEMBERS[0]);
    }

    await loadMember();

    // --- LOOKUP MEMBER CONTROLLER ---
    function executeLookup() {
        const query = (lookupInput.value || '').trim().toLowerCase();
        if (!query) return;

        const match = DEMO_MEMBERS.find(m => 
            m.email.toLowerCase().includes(query) ||
            m.usn.toLowerCase().includes(query) ||
            m.name.toLowerCase().includes(query)
        );

        if (match) {
            renderMemberPass(match);
            lookupInput.value = '';
            if (walletCard.classList.contains('is-flipped')) {
                toggleCardFlip();
            }
        } else {
            alert(`No member pass found matching: "${query}". Try quick demo buttons below.`);
        }
    }

    if (lookupBtn) lookupBtn.addEventListener('click', executeLookup);
    if (lookupInput) {
        lookupInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeLookup();
        });
    }

    // Quick demo buttons
    quickPills.forEach(btn => {
        btn.addEventListener('click', () => {
            const email = btn.dataset.email;
            const match = DEMO_MEMBERS.find(m => m.email === email);
            if (match) {
                renderMemberPass(match);
                if (walletCard.classList.contains('is-flipped')) {
                    toggleCardFlip();
                }
            }
        });
    });

    // --- DOWNLOAD PASS AS HIGH-DPI PNG ---
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            exportCardAsPNG();
        });
    }

    // --- PRINT CARD ---
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    function exportCardAsPNG() {
        const canvas = document.getElementById('export-canvas');
        if (!canvas || !currentMember) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Background Gradient
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1a162b');
        grad.addColorStop(0.5, '#100d1c');
        grad.addColorStop(1, '#08060f');
        ctx.fillStyle = grad;
        ctx.roundRect ? ctx.roundRect(0, 0, w, h, 36) : ctx.rect(0, 0, w, h);
        ctx.fill();

        // Golden Rim Border
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        // Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillText('ACM Student Chapter • NMIT', 60, 90);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px Inter, sans-serif';
        ctx.fillText('OFFICIAL DIGITAL MEMBERSHIP PASS', 60, 130);

        // Tier Ribbon
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 24px Inter, sans-serif';
        const role = (currentMember.clubRole || 'Active Member').toUpperCase();
        ctx.fillText(`★ ${role}`, w - 380, 90);

        // Smart Chip Graphic
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(60, 170, 90, 65);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.strokeRect(60, 170, 90, 65);

        // Member Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.fillText(currentMember.name || 'Member', 60, 320);

        // Department
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '26px Inter, sans-serif';
        ctx.fillText(`Department: ${currentMember.department || 'Computer Science'}`, 60, 370);

        // USN
        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px Space Mono, monospace';
        ctx.fillText('STUDENT ID / USN', 60, 470);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 34px Space Mono, monospace';
        ctx.fillText(currentMember.usn || '1NT23CS000', 60, 520);

        // Valid Until
        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px Space Mono, monospace';
        ctx.fillText('VALID THRU', 420, 470);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 34px Space Mono, monospace';
        ctx.fillText(validDateEl.textContent, 420, 520);

        // Status
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 26px Inter, sans-serif';
        ctx.fillText('✓ VERIFIED & ACTIVE', 420, 570);

        // Draw QR Code onto Canvas
        const qrImg = qrContainer.querySelector('img');
        if (qrImg && qrImg.src) {
            const qrCanvasImg = new Image();
            qrCanvasImg.crossOrigin = 'anonymous';
            qrCanvasImg.onload = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(w - 260, 260, 200, 200);
                ctx.drawImage(qrCanvasImg, w - 250, 270, 180, 180);
                triggerDownload(canvas);
            };
            qrCanvasImg.src = qrImg.src;
        } else {
            triggerDownload(canvas);
        }
    }

    function triggerDownload(canvas) {
        const link = document.createElement('a');
        link.download = `PassTrack_Membership_${(currentMember.name || 'Member').replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
