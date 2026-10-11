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
    function renderMemberPass(member, orgName = 'Student Organization') {
        currentMember = member;

        orgNameEl.textContent = orgName;
        memberNameEl.textContent = member.name || member.fullName || 'Student Member';
        memberRoleEl.textContent = member.clubRole || 'Active Member';
        memberDeptEl.textContent = member.department || 'Engineering';

        const usn = (member.usn || member.studentId || '').trim();
        if (usn && usn !== 'N/A') {
            memberUsnEl.textContent = usn;
        } else {
            memberUsnEl.innerHTML = '<button type="button" class="btn-add-id-pill" id="btn-add-usn-quick">+ Add ID</button>';
            const quickBtn = document.getElementById('btn-add-usn-quick');
            if (quickBtn) {
                quickBtn.onclick = (e) => {
                    e.stopPropagation();
                    openUpdateIdModal();
                };
            }
        }

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
        const endDate = member.membershipEndDate ? new Date(member.membershipEndDate) : new Date(Date.now() + 365*24*60*60*1000);
        validDateEl.textContent = `${String(endDate.getMonth() + 1).padStart(2, '0')}/${endDate.getFullYear()}`;
        
        serialNoEl.textContent = member.serial || `PT-MEM-${(member.usn || (member.id || '0000')).slice(-6)}`;
        issuedDateEl.textContent = member.joinedDate || member.membershipStartDate ? new Date(member.joinedDate || member.membershipStartDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase() : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

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
            name: member.name || member.fullName,
            usn: member.usn || member.studentId,
            exp: member.membershipEndDate,
            sig: 'PT_VERIFIED_' + (member.usn || member.id || 'VALID')
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

    // --- RESOLVE MEMBER FROM URL / FIRESTORE ---
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    const memberEmail = urlParams.get('email');
    const memberUsn = urlParams.get('usn');

    async function loadMember() {
        if (!firestore) return;

        try {
            // 1. Direct Document ID lookup
            if (memberId) {
                const doc = await firestore.collection('members').doc(memberId).get();
                if (doc.exists) {
                    const data = doc.data();
                    const orgName = await fetchOrgName(data.orgId);
                    renderMemberPass({ id: doc.id, ...data }, orgName);
                    return;
                }
            }

            // 2. Email lookup
            if (memberEmail) {
                const snap = await firestore.collection('members').where('email', '==', memberEmail.trim().toLowerCase()).limit(1).get();
                if (!snap.empty) {
                    const doc = snap.docs[0];
                    const data = doc.data();
                    const orgName = await fetchOrgName(data.orgId);
                    renderMemberPass({ id: doc.id, ...data }, orgName);
                    return;
                }
            }

            // 3. USN lookup
            if (memberUsn) {
                const snap = await firestore.collection('members').where('usn', '==', memberUsn.trim().toUpperCase()).limit(1).get();
                if (!snap.empty) {
                    const doc = snap.docs[0];
                    const data = doc.data();
                    const orgName = await fetchOrgName(data.orgId);
                    renderMemberPass({ id: doc.id, ...data }, orgName);
                    return;
                }
            }

            // 4. Logged-in user email lookup
            const user = auth.currentUser;
            if (user && user.email) {
                const snap = await firestore.collection('members').where('email', '==', user.email.toLowerCase()).limit(1).get();
                if (!snap.empty) {
                    const doc = snap.docs[0];
                    const data = doc.data();
                    const orgName = await fetchOrgName(data.orgId);
                    renderMemberPass({ id: doc.id, ...data }, orgName);
                    return;
                }
            }

            // 5. Fetch first member from Firestore
            const firstSnap = await firestore.collection('members').limit(1).get();
            if (!firstSnap.empty) {
                const doc = firstSnap.docs[0];
                const data = doc.data();
                const orgName = await fetchOrgName(data.orgId);
                renderMemberPass({ id: doc.id, ...data }, orgName);
                return;
            }

            // 6. If database has 0 members, render placeholder card
            renderMemberPass({
                id: 'none',
                name: 'No Registered Members',
                clubRole: 'Register in Directory',
                department: 'Student Affairs',
                usn: 'NOT REGISTERED',
                membershipEndDate: new Date(Date.now() + 365*24*60*60*1000).toISOString()
            }, 'PassTrack Network');

        } catch (err) {
            console.error("Error loading membership pass:", err);
        }
    }

    async function fetchOrgName(orgId) {
        if (!orgId) return 'Student Organization';
        try {
            const orgDoc = await firestore.collection('organizations').doc(orgId).get();
            if (orgDoc.exists) return orgDoc.data().name || 'Student Organization';
        } catch(e) {}
        return 'Student Organization';
    }

    auth.onAuthStateChanged(async () => {
        await loadMember();
    });

    // --- LOOKUP MEMBER CONTROLLER ---
    async function executeLookup() {
        const query = (lookupInput.value || '').trim();
        if (!query) return;

        lookupBtn.disabled = true;
        lookupBtn.textContent = 'Searching...';

        try {
            // Search by Email
            let snap = await firestore.collection('members').where('email', '==', query.toLowerCase()).limit(1).get();
            
            // Search by USN
            if (snap.empty) {
                snap = await firestore.collection('members').where('usn', '==', query.toUpperCase()).limit(1).get();
            }

            // Search by ID
            if (snap.empty) {
                const directDoc = await firestore.collection('members').doc(query).get();
                if (directDoc.exists) {
                    const data = directDoc.data();
                    const orgName = await fetchOrgName(data.orgId);
                    renderMemberPass({ id: directDoc.id, ...data }, orgName);
                    lookupInput.value = '';
                    if (walletCard.classList.contains('is-flipped')) toggleCardFlip();
                    return;
                }
            }

            if (!snap.empty) {
                const doc = snap.docs[0];
                const data = doc.data();
                const orgName = await fetchOrgName(data.orgId);
                renderMemberPass({ id: doc.id, ...data }, orgName);
                lookupInput.value = '';
                if (walletCard.classList.contains('is-flipped')) toggleCardFlip();
            } else {
                alert(`No verified member record found in Firestore matching "${query}".`);
            }
        } catch (e) {
            console.error("Lookup error:", e);
            alert("Error searching Firestore members: " + e.message);
        } finally {
            lookupBtn.disabled = false;
            lookupBtn.textContent = 'Lookup';
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

    // --- UPDATE STUDENT ID MODAL LOGIC ---
    const updateIdModal = document.getElementById('update-id-modal');
    const updateIdBtn = document.getElementById('update-student-id-btn');
    const closeUpdateIdModal = document.getElementById('close-update-id-modal');
    const cancelUpdateIdBtn = document.getElementById('cancel-update-id-btn');
    const updateIdForm = document.getElementById('update-id-form');
    const newStudentIdInput = document.getElementById('new-student-id-input');

    function openUpdateIdModal() {
        if (!updateIdModal) return;
        if (currentMember) {
            newStudentIdInput.value = (currentMember.usn || currentMember.studentId || '').replace(/^N\/A$/i, '');
        }
        updateIdModal.style.display = 'flex';
        newStudentIdInput.focus();
    }

    function closeUpdateIdModalHandler() {
        if (updateIdModal) updateIdModal.style.display = 'none';
    }

    if (updateIdBtn) updateIdBtn.addEventListener('click', openUpdateIdModal);
    if (closeUpdateIdModal) closeUpdateIdModal.addEventListener('click', closeUpdateIdModalHandler);
    if (cancelUpdateIdBtn) cancelUpdateIdBtn.addEventListener('click', closeUpdateIdModalHandler);

    if (updateIdForm) {
        updateIdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newId = newStudentIdInput.value.trim().toUpperCase();
            if (!newId) return;

            const saveBtn = document.getElementById('save-update-id-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
            }

            try {
                if (currentMember) {
                    currentMember.usn = newId;
                    currentMember.studentId = newId;

                    // Update member in Firestore if document ID exists
                    if (currentMember.id && firestore) {
                        await firestore.collection('members').doc(currentMember.id).update({
                            usn: newId,
                            studentId: newId,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(err => console.warn('Could not update member doc:', err));
                    }

                    // Also sync with auth user profile if logged in
                    if (auth.currentUser && firestore) {
                        await firestore.collection('userProfiles').doc(auth.currentUser.uid).set({
                            studentId: newId,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true }).catch(err => console.warn('Could not sync user profile:', err));
                    }

                    renderMemberPass(currentMember, orgNameEl.textContent);
                    if (window.PassTrackToast) window.PassTrackToast.success('Student ID updated successfully!');
                    closeUpdateIdModalHandler();
                }
            } catch (err) {
                console.error('Error saving student ID:', err);
                if (window.PassTrackToast) window.PassTrackToast.error('Failed to update Student ID.');
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save ID';
                }
            }
        });
    }
});
