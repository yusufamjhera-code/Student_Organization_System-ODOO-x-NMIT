// File: members/register.js
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
                    btn.style.cssText = 'padding: 12px 16px; text-decoration: none; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 10px; color: #fff;';
                    btn.innerHTML = `<strong>${doc.data().name}</strong> <i class="ph-bold ph-arrow-right"></i>`;
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
        orgNameHeader.textContent = organizationData.name;
        orgDesc.textContent = organizationData.description || 'Become a member today.';
        feeAmountEl.textContent = `₹${organizationData.membershipFee || 0}`;
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
        tabDuesBtn.style.background = 'rgba(255,255,255,0.05)';
        tabDuesBtn.style.color = 'var(--text-muted)';
        registerForm.style.display = 'block';
        duesPanel.style.display = 'none';
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
    });

    tabDuesBtn.addEventListener('click', () => {
        tabDuesBtn.style.background = 'var(--primary)';
        tabDuesBtn.style.color = '#fff';
        tabRegisterBtn.style.background = 'rgba(255,255,255,0.05)';
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
                    <div class="message-area error" style="margin-top: 15px;">
                        <i class="ph-bold ph-x-circle"></i> No member record found for <strong>${email}</strong> in this organization. Please join as a new member first.
                    </div>
                `;
            } else {
                const memberDoc = memberSnap.docs[0];
                const member = memberDoc.data();
                duesResult.style.display = 'block';

                if (member.membershipStatus === 'active' && member.duesPaid) {
                    duesResult.innerHTML = `
                        <div class="message-area success" style="margin-top: 15px; text-align: left;">
                            <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 5px;">
                                <i class="ph-bold ph-check-circle"></i> Membership is Active!
                            </div>
                            <p style="margin: 0 0 8px 0; color: #fff;">Hello, <strong>${member.name}</strong>!</p>
                            <p style="margin: 0; font-size: 0.9rem; color: #94a3b8;">
                                Dues Status: <span style="color: #10b981; font-weight: 600;">Paid in Full</span><br>
                                Valid Until: ${member.membershipEndDate || 'Active'}
                            </p>
                        </div>
                    `;
                } else {
                    // Pending dues
                    const amount = member.duesAmount || organizationData.membershipFee || 0;
                    duesResult.innerHTML = `
                        <div style="background: rgba(106, 17, 203, 0.1); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-top: 15px; text-align: left;">
                            <h3 style="margin-top: 0; color: #fff; margin-bottom: 5px;">Member: ${member.name}</h3>
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 12px;">
                                Status: <span style="color: #f59e0b; font-weight: 600;">Pending Activation (Dues Unpaid)</span><br>
                                Amount Due: <strong style="color: var(--primary); font-size: 1.2rem;">₹${amount}</strong>
                            </p>
                            <button type="button" id="pay-dues-action-btn" class="primary-btn" style="width: 100%; justify-content: center; margin-bottom: 12px;">
                                <i class="ph-bold ph-credit-card"></i> Pay Dues (₹${amount}) & Activate
                            </button>
                            <div style="font-size: 0.85rem; color: var(--text-muted); background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border: 1px dashed var(--border);">
                                <i class="ph-bold ph-info"></i> <strong>Paying in Cash or Offline?</strong> You can also pay directly to your club treasurer, who will activate your membership in the Member Directory.
                            </div>
                        </div>
                    `;

                    document.getElementById('pay-dues-action-btn').onclick = async () => {
                        await processDuesPayment(memberDoc.id, member, amount);
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

    // --- REUSABLE DUES PAYMENT PROCESSOR ---
    async function processDuesPayment(memberDocId, memberData, amount) {
        const actionBtn = document.getElementById('pay-dues-action-btn') || document.getElementById('instant-pay-dues-btn');
        if (actionBtn) {
            actionBtn.disabled = true;
            actionBtn.innerHTML = '<i class="ph-bold ph-spinner-gap spin"></i> Processing Payment...';
        }

        try {
            // 1. Update member document to active
            await firestore.collection('members').doc(memberDocId).update({
                membershipStatus: 'active',
                duesPaid: true,
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
                    description: `Membership dues: ${memberData.name}`,
                    recordedBy: 'Member Online Payment',
                    recordedByName: memberData.name,
                    relatedDocId: memberDocId,
                    relatedDocType: 'member_dues',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // 3. Show Success State
            duesResult.style.display = 'block';
            duesResult.innerHTML = `
                <div class="message-area success" style="margin-top: 15px; text-align: left; padding: 20px;">
                    <div style="font-size: 1.2rem; font-weight: 700; color: #10b981; margin-bottom: 8px;">
                        <i class="ph-bold ph-check-circle"></i> Payment Successful!
                    </div>
                    <p style="color: #fff; margin-bottom: 10px;">Welcome, <strong>${memberData.name}</strong>! Your membership is now <strong>ACTIVE</strong>.</p>
                    <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 15px;">You now have full access to member discounts on event tickets and merchandise.</p>
                    <a href="../index.html" class="primary-btn" style="text-decoration: none; display: inline-flex;">
                        ← Back to Home
                    </a>
                </div>
            `;
        } catch (err) {
            console.error("Payment error:", err);
            showError("Payment processing failed. Please try again or contact your treasurer.");
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

        if (name.length < 2) return showError('Name must be at least 2 characters.');
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return showError('Please enter a valid email address.');

        // Phone validation (Task 3.5)
        if (phone) {
            const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/;
            if (!phoneRegex.test(phone)) return showError('Please enter a valid phone number (7-15 digits).');
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
                return showError('This email is already registered with this organization. Use "Pay Dues / Status" to check your status.');
            }

            // Calculate dates
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            const duration = organizationData.membershipDuration || 365;
            const endDate = new Date(now.getTime() + (duration * 24 * 60 * 60 * 1000));
            const endDateStr = endDate.toISOString().split('T')[0];

            const fee = Number(organizationData.membershipFee) || 0;
            const isFree = fee === 0;

            // Add member
            const docRef = await firestore.collection('members').add({
                orgId: orgId,
                name: name,
                email: email,
                phone: phone || null,
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
            });

            registerForm.style.display = 'none';
            
            if (isFree) {
                successEl.innerHTML = `
                    <div style="padding: 10px 0; text-align: left;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: #10b981; margin-bottom: 8px;">
                            <i class="ph-bold ph-check-circle"></i> Registration Successful!
                        </div>
                        <p style="color: #fff; margin-bottom: 12px;">Welcome to <strong>${organizationData.name}</strong>, ${name}! Your membership is <strong>ACTIVE</strong>.</p>
                        <a href="../index.html" class="primary-btn" style="text-decoration: none; display: inline-flex;">← Back to Home</a>
                    </div>
                `;
            } else {
                successEl.innerHTML = `
                    <div style="padding: 10px 0; text-align: left;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: #10b981; margin-bottom: 8px;">
                            <i class="ph-bold ph-check-circle"></i> Registration Recorded!
                        </div>
                        <p style="color: #fff; margin-bottom: 8px;">Welcome, <strong>${name}</strong>!</p>
                        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 15px;">
                            Your membership status is currently <span style="color: #f59e0b; font-weight: 600;">Pending Activation</span>. Pay your dues of <strong>₹${fee}</strong> to activate your membership and unlock member benefits.
                        </p>
                        <button type="button" id="instant-pay-dues-btn" class="primary-btn" style="width: 100%; justify-content: center; margin-bottom: 12px;">
                            <i class="ph-bold ph-credit-card"></i> Pay Dues (₹${fee}) & Activate Now
                        </button>
                        <div style="font-size: 0.85rem; color: var(--text-muted); background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border: 1px dashed var(--border); margin-bottom: 15px;">
                            <i class="ph-bold ph-info"></i> <strong>Paying Offline?</strong> You can also pay cash or UPI to your club treasurer, who will activate your membership in the Member Directory.
                        </div>
                        <a href="../index.html" class="secondary-btn" style="text-decoration: none; display: inline-flex;">← Back to Home</a>
                    </div>
                `;

                document.getElementById('instant-pay-dues-btn').onclick = async () => {
                    await processDuesPayment(docRef.id, { name: name }, fee);
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
