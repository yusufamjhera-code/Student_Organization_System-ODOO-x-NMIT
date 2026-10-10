// File: members/register.js - Production Member Registration & Dues Controller
document.addEventListener('DOMContentLoaded', async () => {
    const firestore = db; // Initialized in lib/firebase-config.js

    // DOM Elements
    const orgNameHeader = document.getElementById('org-name-header');
    const orgDesc = document.getElementById('org-desc');
    const loadingSpinner = document.getElementById('loading-spinner');
    const registerForm = document.getElementById('register-form');
    const duesPanel = document.getElementById('dues-panel');
    const errorEl = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');
    const feeAmountEl = document.getElementById('fee-amount');
    const durationDaysEl = document.getElementById('duration-days');
    const submitBtn = document.getElementById('submit-btn');

    // Tab buttons
    const tabRegisterBtn = document.getElementById('tab-register-btn');
    const tabDuesBtn = document.getElementById('tab-dues-btn');
    const checkDuesEmail = document.getElementById('check-dues-email');
    const checkDuesBtn = document.getElementById('check-dues-btn');
    const duesResult = document.getElementById('dues-result');

    // Safe HTML Escaping Helper
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    // Get orgId from URL or resolve if missing
    const urlParams = new URLSearchParams(window.location.search);
    let orgId = urlParams.get('org');

    if (!orgId) {
        try {
            const orgsSnap = await firestore.collection('organizations').limit(5).get();
            if (orgsSnap.empty) {
                showError('No organizations found. Please create an organization first.');
                loadingSpinner.style.display = 'none';
                return;
            } else if (orgsSnap.docs.length === 1) {
                orgId = orgsSnap.docs[0].id;
            } else {
                loadingSpinner.style.display = 'none';
                orgNameHeader.textContent = 'Select Organization';
                orgDesc.textContent = 'Choose an organization to join:';
                registerForm.style.display = 'none';
                duesPanel.style.display = 'none';
                
                const selectorList = document.createElement('div');
                selectorList.style.display = 'flex';
                selectorList.style.flexDirection = 'column';
                selectorList.style.gap = '10px';
                selectorList.style.marginTop = '15px';
                
                orgsSnap.docs.forEach(doc => {
                    const btn = document.createElement('a');
                    btn.href = `register.html?org=${doc.id}`;
                    btn.className = 'secondary-btn';
                    btn.style.cssText = 'padding: 12px 16px; text-decoration: none; display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; color: var(--text-main);';
                    btn.innerHTML = `<strong>${escapeHtml(doc.data().name)}</strong> <i class="ph-bold ph-arrow-right"></i>`;
                    selectorList.appendChild(btn);
                });
                
                registerForm.parentNode.appendChild(selectorList);
                return;
            }
        } catch (err) {
            console.error("Error auto-resolving orgId:", err);
            showError('Invalid Link: Missing organization ID.');
            loadingSpinner.style.display = 'none';
            return;
        }
    }

    let organizationData = null;

    // Fetch Organization Data
    try {
        const orgDoc = await firestore.collection('organizations').doc(orgId).get();
        if (!orgDoc.exists) {
            showError('Organization not found.');
            loadingSpinner.style.display = 'none';
            return;
        }

        organizationData = orgDoc.data();
        
        // Update UI
        orgNameHeader.textContent = organizationData.name || 'Organization';
        orgDesc.textContent = organizationData.description || 'Become a member today.';
        feeAmountEl.textContent = `₹${Number(organizationData.membershipFee || 0)}`;
        durationDaysEl.textContent = organizationData.membershipDuration || 365;

        // Show form
        loadingSpinner.style.display = 'none';
        registerForm.style.display = 'block';

    } catch (err) {
        console.error("Error fetching org:", err);
        showError('Failed to load organization details.');
        loadingSpinner.style.display = 'none';
    }

    // --- TAB SWITCHING ---
    tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.style.background = 'var(--primary)';
        tabRegisterBtn.style.color = '#fff';
        tabDuesBtn.style.background = 'var(--bg-card)';
        tabDuesBtn.style.color = 'var(--text-muted)';
        registerForm.style.display = 'block';
        duesPanel.style.display = 'none';
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
    });

    tabDuesBtn.addEventListener('click', () => {
        tabDuesBtn.style.background = 'var(--primary)';
        tabDuesBtn.style.color = '#fff';
        tabRegisterBtn.style.background = 'var(--bg-card)';
        tabRegisterBtn.style.color = 'var(--text-muted)';
        registerForm.style.display = 'none';
        duesPanel.style.display = 'block';
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
    });

    // --- CHECK DUES & STATUS HANDLER ---
    checkDuesBtn.addEventListener('click', async () => {
        const email = checkDuesEmail.value.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showError('Please enter a valid email address.');
            return;
        }

        errorEl.style.display = 'none';
        checkDuesBtn.disabled = true;
        checkDuesBtn.innerHTML = '<i class="ph-bold ph-spinner-gap spin"></i> Checking...';

        try {
            const memberSnap = await firestore.collection('members')
                .where('orgId', '==', orgId)
                .where('email', '==', email)
                .get();

            if (memberSnap.empty) {
                duesResult.style.display = 'block';
                duesResult.innerHTML = `
                    <div class="message-area error" style="margin-top: 15px; text-align: left;">
                        <i class="ph-bold ph-x-circle"></i> No member record found for <strong>${escapeHtml(email)}</strong> in this organization. Please join as a new member first.
                    </div>
                `;
            } else {
                const memberDoc = memberSnap.docs[0];
                const member = memberDoc.data();
                duesResult.style.display = 'block';

                if (member.membershipStatus === 'active' && member.duesPaid) {
                    duesResult.innerHTML = renderActiveMemberCard(member, memberDoc.id);
                } else {
                    // Pending dues
                    const amount = Number(member.duesAmount || organizationData.membershipFee || 0);
                    duesResult.innerHTML = `
                        <div style="background: var(--accent-soft); border: 1px solid var(--accent-border); border-radius: 14px; padding: 22px; margin-top: 15px; text-align: left;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <h3 style="margin: 0; color: var(--text-main); font-size:1.15rem; font-family: var(--serif);">Member: ${escapeHtml(member.name)}</h3>
                                <span style="background:rgba(245,158,11,0.15); color:#b45309; border:1px solid rgba(245,158,11,0.3); padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">
                                    Pending Activation
                                </span>
                            </div>
                            <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:16px;">
                                <div>Email: <strong style="color:var(--text-main);">${escapeHtml(member.email)}</strong></div>
                                ${member.studentId ? `<div>Student ID: <strong style="color:var(--text-main);">${escapeHtml(member.studentId)}</strong></div>` : ''}
                                <div style="margin-top:6px;">Amount Due: <strong style="color:var(--accent); font-size:1.25rem;">₹${amount}</strong></div>
                            </div>
                            <button type="button" id="pay-dues-action-btn" class="primary-btn" style="width: 100%; justify-content: center; margin-bottom: 12px;">
                                <i class="ph-bold ph-credit-card"></i> Pay Dues (₹${amount}) & Activate
                            </button>
                            <div style="font-size: 0.85rem; color: var(--text-muted); background: var(--bg-card); padding: 10px; border-radius: 8px; border: 1px dashed var(--border);">
                                <i class="ph-bold ph-info"></i> <strong>Paying in Cash or Offline?</strong> You can also pay directly to your club treasurer, who will activate your membership in the Member Directory.
                            </div>
                        </div>
                    `;

                    document.getElementById('pay-dues-action-btn').onclick = async () => {
                        await processDuesPayment(memberDoc.id, member, amount, duesResult);
                    };
                }
            }
        } catch (err) {
            console.error("Error checking dues:", err);
            showError("Failed to check member status. Please try again.");
        } finally {
            checkDuesBtn.disabled = false;
            checkDuesBtn.innerHTML = '<i class="ph-bold ph-magnifying-glass"></i> <span>Check Membership & Dues</span>';
        }
    });

    // Helper: Render Active Member Card
    function renderActiveMemberCard(member, docId, paymentDetails = null) {
        return `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 24px; margin-top: 15px; text-align: left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ph-fill ph-shield-check" style="color:#059669; font-size:1.5rem;"></i>
                        <span style="font-size:1.15rem; font-weight:700; color:var(--text-main); font-family:var(--serif);">Membership Active</span>
                    </div>
                    <span style="background:rgba(16, 185, 129, 0.15); color:#059669; padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; letter-spacing:0.5px;">
                        VERIFIED MEMBER
                    </span>
                </div>
                
                <div style="background:var(--bg-card); border-radius:12px; padding:16px; margin-bottom:16px; border:1px solid var(--border);">
                    <div style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin-bottom:4px; font-family:var(--serif);">${escapeHtml(member.name)}</div>
                    <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:8px;">${escapeHtml(member.email)}</div>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.85rem; padding-top:10px; border-top:1px dashed var(--border);">
                        <div>
                            <span style="color:var(--text-muted);">Student ID:</span><br>
                            <strong style="color:var(--text-main);">${escapeHtml(member.studentId || 'N/A')}</strong>
                        </div>
                        <div>
                            <span style="color:var(--text-muted);">Member Since:</span><br>
                            <strong style="color:var(--text-main);">${member.membershipStartDate || 'Active'}</strong>
                        </div>
                        <div>
                            <span style="color:var(--text-muted);">Valid Until:</span><br>
                            <strong style="color:#059669;">${member.membershipEndDate || 'Active'}</strong>
                        </div>
                        <div>
                            <span style="color:var(--text-muted);">Dues Status:</span><br>
                            <strong style="color:#059669;">Paid in Full</strong>
                        </div>
                    </div>
                </div>

                ${paymentDetails ? `
                    <div style="background:rgba(56, 189, 248, 0.1); border:1px dashed #38bdf8; border-radius:8px; padding:10px 12px; font-family:monospace; font-size:0.85rem; color:#38bdf8; margin-bottom:14px;">
                        UPI Payment Ref (UTR): ${escapeHtml(paymentDetails.utr)}
                    </div>
                ` : ''}

                <div style="background:rgba(255,255,255,0.02); border-radius:8px; padding:10px 12px; font-size:0.85rem; color:var(--text-muted); line-height:1.5;">
                    <i class="ph-bold ph-sparkle" style="color:var(--primary);"></i>
                    Your membership qualifies you for discounted event tickets and official merchandise store discounts.
                </div>
            </div>
        `;
    }

    // --- REUSABLE DUES PAYMENT PROCESSOR ---
    async function processDuesPayment(memberDocId, memberData, amount, targetContainer = null) {
        const actionBtn = document.getElementById('pay-dues-action-btn') || document.getElementById('instant-pay-dues-btn');
        if (actionBtn) {
            actionBtn.disabled = true;
            actionBtn.innerHTML = '<i class="ph-bold ph-spinner-gap spin"></i> Processing Payment...';
        }

        try {
            let paymentDetails = null;
            if (amount > 0 && window.PassTrack && window.PassTrack.Payments) {
                if (actionBtn) {
                    actionBtn.innerHTML = '<i class="ph-bold ph-wallet"></i> Awaiting UPI Payment...';
                }
                await new Promise((resolve, reject) => {
                    window.PassTrack.Payments.initiateCheckout({
                        amount: Number(amount),
                        description: `Membership Dues: ${memberData.name}`,
                        orderType: 'dues',
                        metadata: { orgId: orgId, memberId: memberDocId, email: memberData.email },
                        onSuccess: (result) => {
                            paymentDetails = { utr: result.txRef };
                            resolve();
                        },
                        onFailure: (err) => {
                            reject(err);
                        }
                    });
                });
                if (actionBtn) {
                    actionBtn.innerHTML = '<i class="ph-bold ph-spinner-gap spin"></i> Activating Membership...';
                }
            } else if (amount > 0) {
                paymentDetails = { utr: "MOCK_UPI_" + Date.now() };
            }

            // 1. Update member document to active in Firestore
            await firestore.collection('members').doc(memberDocId).update({
                membershipStatus: 'active',
                duesPaid: true,
                paymentMethod: paymentDetails ? 'UPI' : 'free',
                paymentRef: paymentDetails ? paymentDetails.utr : null,
                duesPaidAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Record income in Treasury
            if (amount > 0) {
                await firestore.collection('transactions').add({
                    orgId: orgId,
                    type: 'income',
                    amount: Number(amount),
                    category: 'dues',
                    date: new Date().toISOString().split('T')[0],
                    description: `Membership dues: ${memberData.name}${paymentDetails ? ` [UPI UTR: ${paymentDetails.utr}]` : ''}`,
                    recordedBy: 'Member Online Payment',
                    recordedByName: memberData.name,
                    paymentMethod: 'UPI',
                    paymentRef: paymentDetails ? paymentDetails.utr : null,
                    relatedDocId: memberDocId,
                    relatedDocType: 'member_dues',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // 3. Show Success State in the active container
            const updatedMember = {
                ...memberData,
                membershipStatus: 'active',
                duesPaid: true,
                membershipEndDate: memberData.membershipEndDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
            };

            const successHtml = renderActiveMemberCard(updatedMember, memberDocId, paymentDetails);

            if (targetContainer) {
                targetContainer.style.display = 'block';
                targetContainer.innerHTML = successHtml;
            } else {
                // If called from the registration success panel, update successEl directly
                successEl.style.display = 'block';
                successEl.innerHTML = successHtml;
            }

            showToast("Payment successful! Your membership is now active.", "success");

        } catch (err) {
            console.error("Payment error:", err);
            if (err.message === "PAYMENT_CANCELLED") {
                showError("Payment was cancelled. You can try again whenever ready.");
            } else if (err.message === "PAYMENT_EXPIRED") {
                showError("Payment session timed out. Please try again.");
            } else {
                showError("Payment processing failed. Please try again or contact your treasurer.");
            }
            if (actionBtn) {
                actionBtn.disabled = false;
                actionBtn.innerHTML = '<i class="ph-bold ph-credit-card"></i> Pay Dues & Activate';
            }
        }
    }

    // --- HANDLE REGISTRATION FORM SUBMIT ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('member-name').value.trim();
        const email = document.getElementById('member-email').value.trim().toLowerCase();
        const phone = document.getElementById('member-phone').value.trim();
        const studentId = document.getElementById('member-studentid').value.trim();

        if (name.length < 2) return showError('Full name must be at least 2 characters.');
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return showError('Please enter a valid email address.');

        // Phone validation
        const phoneRegex = /^[+]?[\d\s\-()]{10,15}$/;
        const rawDigits = phone.replace(/\D/g, '');
        if (!phoneRegex.test(phone) || rawDigits.length < 10) {
            return showError('Please enter a valid 10-digit mobile number.');
        }

        // Loading state
        setLoading(true);
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        try {
            // Check if email already exists in this org
            const existingMemberQuery = await firestore.collection('members')
                .where('orgId', '==', orgId)
                .where('email', '==', email)
                .get();

            if (!existingMemberQuery.empty) {
                setLoading(false);
                return showError('This email is already registered with this organization. Use "Pay Dues / Status" tab to check your membership.');
            }

            // Calculate dates
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            const duration = Number(organizationData.membershipDuration) || 365;
            const endDate = new Date(now.getTime() + (duration * 24 * 60 * 60 * 1000));
            const endDateStr = endDate.toISOString().split('T')[0];

            const fee = Number(organizationData.membershipFee) || 0;
            const isFree = fee === 0;

            // Add member to Firestore
            const newMemberData = {
                orgId: orgId,
                name: name,
                email: email,
                phone: phone,
                studentId: studentId || null,
                membershipStatus: isFree ? 'active' : 'pending',
                membershipStartDate: todayStr,
                membershipEndDate: endDateStr,
                duesPaid: isFree,
                duesAmount: fee,
                duesPaidAt: isFree ? firebase.firestore.FieldValue.serverTimestamp() : null,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                renewalReminderSent: false
            };

            const docRef = await firestore.collection('members').add(newMemberData);

            registerForm.style.display = 'none';
            
            if (isFree) {
                successEl.innerHTML = renderActiveMemberCard(newMemberData, docRef.id);
            } else {
                successEl.innerHTML = `
                    <div style="padding: 10px 0; text-align: left;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: #059669; margin-bottom: 8px;">
                            <i class="ph-bold ph-check-circle"></i> Registration Recorded!
                        </div>
                        <p style="color: var(--text-main); margin-bottom: 8px;">Welcome, <strong>${escapeHtml(name)}</strong>!</p>
                        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 16px;">
                            Your membership status is currently <span style="color: #b45309; font-weight: 600;">Pending Activation</span>. Pay your dues of <strong>₹${fee}</strong> to activate your membership and unlock member benefits.
                        </p>
                        <button type="button" id="instant-pay-dues-btn" class="primary-btn" style="width: 100%; justify-content: center; margin-bottom: 12px;">
                            <i class="ph-bold ph-credit-card"></i> Pay Dues (₹${fee}) & Activate Now
                        </button>
                        <div style="font-size: 0.85rem; color: var(--text-muted); background: var(--bg-card); padding: 10px; border-radius: 8px; border: 1px dashed var(--border);">
                            <i class="ph-bold ph-info"></i> <strong>Paying Offline?</strong> You can also pay cash or UPI to your club treasurer, who will activate your membership in the Member Directory.
                        </div>
                    </div>
                `;

                document.getElementById('instant-pay-dues-btn').onclick = async () => {
                    await processDuesPayment(docRef.id, newMemberData, fee, successEl);
                };
            }
            successEl.style.display = 'block';

        } catch (err) {
            console.error("Registration error:", err);
            showError('Failed to register. Please try again.');
            setLoading(false);
        }
    });

    // Helpers
    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-x-circle';
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ph-bold ph-spinner-gap spin" style="font-size:1.2rem; margin:0;"></i> <span>Processing...</span>';
            submitBtn.style.opacity = '0.7';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ph-bold ph-user-plus"></i> <span>Register Now</span>';
            submitBtn.style.opacity = '1';
        }
    }
});
