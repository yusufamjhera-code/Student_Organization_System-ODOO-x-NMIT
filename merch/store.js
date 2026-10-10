// File: merch/store.js - Enhanced Merchandise Store Controller
document.addEventListener('DOMContentLoaded', async () => {
    const firestore = db;

    const urlParams = new URLSearchParams(window.location.search);
    let orgId = urlParams.get('org');

    const spinner = document.getElementById('loading-spinner');
    const productsGrid = document.getElementById('products-grid');
    const orgNameEl = document.getElementById('org-name');
    
    // Modal elements
    const modal = document.getElementById('order-modal');
    const form = document.getElementById('order-form');
    const productIdInput = document.getElementById('order-product-id');
    const sizeSelect = document.getElementById('order-size');
    const qtyInput = document.getElementById('order-quantity');
    const nameInput = document.getElementById('buyer-name');
    const emailInput = document.getElementById('buyer-email');
    const phoneInput = document.getElementById('buyer-phone');
    const verifStatus = document.getElementById('member-verification-status');
    const totalEl = document.getElementById('order-total');
    const stockWarn = document.getElementById('stock-warning');
    const checkoutBtn = document.getElementById('checkout-btn');
    const successState = document.getElementById('success-state');
    const orderConfirmationDetails = document.getElementById('order-confirmation-details');

    // My Orders modal elements
    const myOrdersBtn = document.getElementById('my-orders-btn');
    const myOrdersModal = document.getElementById('my-orders-modal');
    const closeMyOrdersModal = document.getElementById('close-my-orders-modal');
    const lookupEmailInput = document.getElementById('lookup-email-input');
    const lookupOrdersBtn = document.getElementById('lookup-orders-btn');
    const lookupResults = document.getElementById('lookup-results');
    const successViewOrdersBtn = document.getElementById('success-view-orders-btn');

    let productsData = [];
    let currentProduct = null;
    let isMemberVerif = false;
    let lastPlacedEmail = '';

    // Helper: Safe HTML Escaping
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    // --- RESOLVE ORGID IF MISSING ---
    let activeOrgId = orgId;
    if (!activeOrgId) {
        try {
            const orgsSnap = await firestore.collection('organizations').limit(10).get();
            if (orgsSnap.empty) {
                spinner.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No student organizations found. Please set up an organization first.</p>';
                return;
            } else if (orgsSnap.docs.length === 1) {
                activeOrgId = orgsSnap.docs[0].id;
                orgId = activeOrgId;
            } else {
                spinner.style.display = 'none';
                productsGrid.style.display = 'block';
                productsGrid.innerHTML = `
                    <div class="card" style="grid-column: 1 / -1; max-width: 550px; margin: 40px auto; padding: 30px; text-align: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;">
                        <i class="ph-bold ph-storefront" style="font-size: 3rem; color: var(--primary); margin-bottom: 15px;"></i>
                        <h2 style="margin-bottom: 10px; color: #fff;">Choose Organization</h2>
                        <p style="color: var(--text-muted); margin-bottom: 25px;">Select an organization to view its merchandise catalog:</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${orgsSnap.docs.map(d => `
                                <a href="store.html?org=${d.id}" class="secondary-btn" style="padding: 14px 20px; text-decoration: none; font-weight: 600; justify-content: space-between; display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 10px; color: #fff;">
                                    <span>${escapeHtml(d.data().name)}</span>
                                    <i class="ph-bold ph-arrow-right"></i>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
                return;
            }
        } catch (err) {
            console.error("Error finding organizations:", err);
            spinner.innerHTML = '<p style="color:var(--danger);">Error loading store options.</p>';
            return;
        }
    }

    function loadDemoStoreProducts() {
        productsData = [
            {
                id: 'prod-1',
                name: 'ACM Official Heavyweight Hoodie',
                description: '380 GSM brushed fleece with embroidered ACM crest on chest and HackNMIT sleeve badge.',
                category: 'apparel',
                memberPrice: 850,
                nonMemberPrice: 1100,
                stock: 45,
                sizes: ['S', 'M', 'L', 'XL'],
                imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80'
            },
            {
                id: 'prod-2',
                name: 'HackNMIT 2026 Minimalist Tee',
                description: '100% bio-washed combed cotton with glow-in-the-dark terminal matrix graphic.',
                category: 'apparel',
                memberPrice: 350,
                nonMemberPrice: 450,
                stock: 120,
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'
            },
            {
                id: 'prod-3',
                name: 'Developer Ceramic Thermal Tumbler',
                description: 'Double-walled vacuum insulated mug with spill-resistant lid and laser-etched binary logo.',
                category: 'accessories',
                memberPrice: 400,
                nonMemberPrice: 550,
                stock: 28,
                sizes: ['Standard 450ml'],
                imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
            },
            {
                id: 'prod-4',
                name: 'Die-Cut Holographic Sticker Pack',
                description: 'Set of 8 waterproof vinyl laptop stickers featuring Git, Linux, Vim, Rust, and ACM stickers.',
                category: 'stickers',
                memberPrice: 80,
                nonMemberPrice: 120,
                stock: 200,
                sizes: ['Pack of 8'],
                imageUrl: 'https://images.unsplash.com/photo-1589384267710-7a25be15f793?w=600&auto=format&fit=crop&q=80'
            }
        ];
        renderProducts();
    }

    // --- LOAD STORE DATA ---
    try {
        let orgDoc = null;
        try {
            orgDoc = await firestore.collection('organizations').doc(activeOrgId).get();
        } catch(e) {}

        const isDemo = activeOrgId === 'demo-org-acm' ||
                       sessionStorage.getItem('demoUser') === 'true' ||
                       sessionStorage.getItem('authType') === 'admin' ||
                       (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");

        if (orgDoc && orgDoc.exists) {
            orgNameEl.textContent = orgDoc.data().name || 'Store';

            firestore.collection('merchProducts')
                .where('orgId', '==', activeOrgId)
                .where('isActive', '==', true)
                .onSnapshot(snap => {
                    productsData = snap.docs.map(d => ({id: d.id, ...d.data()}));
                    renderProducts();
                }, err => {
                    if (isDemo) loadDemoStoreProducts();
                    else spinner.innerHTML = '<p style="color:var(--danger);">Failed to load products.</p>';
                });
        } else if (isDemo) {
            orgNameEl.textContent = 'ACM Student Chapter • NMIT';
            loadDemoStoreProducts();
        } else {
            spinner.innerHTML = '<p style="color:var(--danger); text-align:center;">Organization not found.</p>';
            return;
        }
    } catch (err) {
        console.error("Error loading store:", err);
        loadDemoStoreProducts();
    }

    function renderProducts() {
        spinner.style.display = 'none';
        productsGrid.style.display = 'grid';
        
        if (productsData.length === 0) {
            productsGrid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:16px; border:1px solid var(--border);">
                    <i class="ph-bold ph-storefront" style="font-size:3.5rem; color:var(--primary); margin-bottom:15px; display:inline-block;"></i>
                    <h2 style="color:#fff; margin-bottom:8px;">Store is Empty</h2>
                    <p style="color:var(--text-muted); margin:0;">Check back later for official merchandise and club gear!</p>
                </div>
            `;
            return;
        }
        
        productsGrid.innerHTML = '';
        
        productsData.forEach(p => {
            const el = document.createElement('div');
            el.className = 'product-card';
            
            let icon = 'ph-t-shirt';
            if (p.category === 'hoodie') icon = 'ph-t-shirt';
            if (p.category === 'cap') icon = 'ph-baseball-cap';
            if (p.category === 'other') icon = 'ph-tote';
            
            const totalStock = Object.values(p.sizes || {}).reduce((a,b) => a + Number(b || 0), 0);
            
            const imageDisplay = p.imageUrl ? 
                `<div class="product-img" style="background-image:url('${escapeHtml(p.imageUrl)}'); background-size:cover; background-position:center;"></div>` :
                `<div class="product-img ${escapeHtml(p.category || 'other')}"><i class="ph-fill ${icon}"></i></div>`;

            el.innerHTML = `
                ${imageDisplay}
                <div class="product-info">
                    <h3 class="product-title">${escapeHtml(p.name)}</h3>
                    <div class="product-desc">${escapeHtml(p.description || '')}</div>
                    <div class="product-price-row">
                        <div class="price-reg">₹${Number(p.price || 0)}</div>
                        <div class="price-mem">Member: ₹${Number(p.memberPrice || p.price || 0)}</div>
                    </div>
                    <button class="primary-btn buy-btn" style="width:100%; justify-content:center;" ${totalStock <= 0 ? 'disabled' : ''}>
                        <i class="ph-bold ph-shopping-cart"></i> 
                        <span>${totalStock <= 0 ? 'Out of Stock' : 'Buy Now'}</span>
                    </button>
                    ${totalStock > 0 && totalStock < 10 ? `<div class="stock-info">Only ${totalStock} left in stock!</div>` : ''}
                </div>
            `;
            
            const buyBtn = el.querySelector('.buy-btn');
            if (totalStock > 0) {
                buyBtn.onclick = () => openOrderModal(p);
            }
            
            productsGrid.appendChild(el);
        });
    }

    // --- MODAL LOGIC ---
    function openOrderModal(p) {
        currentProduct = p;
        productIdInput.value = p.id;
        document.getElementById('order-product-name').textContent = p.name;
        
        // Populate sizes
        sizeSelect.innerHTML = '<option value="">Select a size...</option>';
        const sizes = p.sizes || {};
        ['S', 'M', 'L', 'XL', 'XXL'].forEach(s => {
            if (Number(sizes[s]) > 0) {
                sizeSelect.innerHTML += `<option value="${s}">${s} (${sizes[s]} available)</option>`;
            }
        });
        
        qtyInput.value = 1;
        qtyInput.max = 10;
        isMemberVerif = false;
        verifStatus.style.display = 'none';
        updateTotal();
        
        modal.classList.add('active');
    }

    document.getElementById('close-order-modal').onclick = () => modal.classList.remove('active');

    function updateTotal() {
        if (!currentProduct) return;
        const qty = Math.max(1, parseInt(qtyInput.value) || 1);
        const unitPrice = isMemberVerif ? Number(currentProduct.memberPrice || currentProduct.price) : Number(currentProduct.price);
        totalEl.textContent = `₹${unitPrice * qty}`;
        
        // Check stock for selected size
        const selectedSize = sizeSelect.value;
        if (selectedSize) {
            const avail = Number(currentProduct.sizes?.[selectedSize] || 0);
            if (qty > avail) {
                stockWarn.textContent = `Only ${avail} item(s) left in size ${selectedSize}!`;
                stockWarn.style.display = 'block';
                checkoutBtn.disabled = true;
            } else {
                stockWarn.style.display = 'none';
                checkoutBtn.disabled = false;
            }
        }
    }
    
    sizeSelect.addEventListener('change', updateTotal);
    qtyInput.addEventListener('input', updateTotal);

    // Member Email verification (Debounced)
    let debounceTimer;
    emailInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const email = e.target.value.trim().toLowerCase();
        
        if (!email.includes('@')) {
            isMemberVerif = false;
            verifStatus.style.display = 'none';
            updateTotal();
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const q = await firestore.collection('members')
                    .where('orgId', '==', activeOrgId)
                    .where('email', '==', email)
                    .get();

                if (!q.empty) {
                    const member = q.docs[0].data();
                    if (member.membershipStatus === 'active') {
                        isMemberVerif = true;
                        verifStatus.className = 'alert-box success';
                        verifStatus.innerHTML = '<i class="ph-bold ph-check-circle"></i> Active member verified! Member discount applied.';
                        verifStatus.style.display = 'flex';
                    } else {
                        isMemberVerif = false;
                        verifStatus.className = 'alert-box warning';
                        verifStatus.innerHTML = '<i class="ph-bold ph-warning-circle"></i> Membership inactive. Regular pricing applies.';
                        verifStatus.style.display = 'flex';
                    }
                } else {
                    isMemberVerif = false;
                    verifStatus.style.display = 'none';
                }
                updateTotal();
            } catch(err) {
                console.error("Verification error:", err);
            }
        }, 500);
    });

    // --- SUBMIT TRANSACTION ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const size = sizeSelect.value;
        const qty = parseInt(qtyInput.value);
        const name = nameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput.value.trim();
        
        if (!size) {
            showToast("Please select a size.", "danger");
            return;
        }

        if (name.length < 2) {
            showToast("Please enter a valid full name (min 2 characters).", "danger");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast("Please enter a valid email address.", "danger");
            return;
        }

        const phoneRegex = /^[+]?[\d\s\-()]{10,15}$/;
        const rawDigits = phone.replace(/\D/g, '');
        if (!phoneRegex.test(phone) || rawDigits.length < 10) {
            showToast("Please enter a valid 10-digit mobile number.", "danger");
            return;
        }

        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>Processing...</span>';

        const productRef = firestore.collection('merchProducts').doc(currentProduct.id);
        
        try {
            const unitPrice = isMemberVerif ? Number(currentProduct.memberPrice || currentProduct.price) : Number(currentProduct.price);
            const totalPrice = unitPrice * qty;

            let paymentDetails = null;
            if (totalPrice > 0 && window.PassTrack && window.PassTrack.Payments) {
                checkoutBtn.innerHTML = '<i class="ph-bold ph-wallet"></i> <span>Awaiting UPI Payment...</span>';
                await new Promise((resolve, reject) => {
                    window.PassTrack.Payments.initiateCheckout({
                        amount: totalPrice,
                        description: `Merch: ${currentProduct.name} (${size}) x${qty}`,
                        orderType: 'merch',
                        metadata: { orgId: activeOrgId, productId: currentProduct.id, email: email, name: name },
                        onSuccess: (result) => {
                            paymentDetails = { utr: result.txRef };
                            resolve();
                        },
                        onFailure: (err) => {
                            reject(err);
                        }
                    });
                });
                checkoutBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>Placing Order...</span>';
            } else if (totalPrice > 0) {
                paymentDetails = { utr: "MOCK_UPI_" + Date.now() };
            }

            let createdOrderId = null;

            await firestore.runTransaction(async (transaction) => {
                const pDoc = await transaction.get(productRef);
                if (!pDoc.exists) throw new Error("ProductNotFound");
                const pData = pDoc.data();
                
                if (!pData.isActive) throw new Error("Inactive");
                
                const sizes = pData.sizes || {};
                const currentStock = Number(sizes[size] || 0);
                
                if (qty > currentStock) {
                    throw new Error("OutOfStock");
                }
                
                // Decrement stock and increment sold
                sizes[size] = currentStock - qty;
                const newSold = (Number(pData.totalSold) || 0) + qty;
                
                transaction.update(productRef, { sizes: sizes, totalSold: newSold });
                
                // Create Order
                const orderRef = firestore.collection('merchOrders').doc();
                createdOrderId = orderRef.id;

                transaction.set(orderRef, {
                    orgId: activeOrgId,
                    productId: pDoc.id,
                    productName: pData.name,
                    buyerName: name,
                    buyerEmail: email,
                    buyerPhone: phone,
                    isMember: isMemberVerif,
                    size: size,
                    quantity: qty,
                    unitPrice: unitPrice,
                    totalPrice: totalPrice,
                    paymentStatus: 'paid',
                    paymentMethod: paymentDetails ? 'UPI' : 'free',
                    paymentRef: paymentDetails ? paymentDetails.utr : null,
                    fulfillmentStatus: 'ordered',
                    orderedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Auto-create Transaction for Treasury
                if (totalPrice > 0) {
                    const txnRef = firestore.collection('transactions').doc();
                    transaction.set(txnRef, {
                        orgId: activeOrgId,
                        type: 'income',
                        amount: totalPrice,
                        category: 'merchandise',
                        date: new Date().toISOString().split('T')[0],
                        description: `Merch Order: ${pData.name} (${size} x${qty})${paymentDetails ? ` [UPI UTR: ${paymentDetails.utr}]` : ''}`,
                        recordedBy: 'Storefront Online Checkout',
                        recordedByName: name,
                        paymentMethod: 'UPI',
                        paymentRef: paymentDetails ? paymentDetails.utr : null,
                        relatedDocId: orderRef.id,
                        relatedDocType: 'merch_order',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
            
            // Optional Email trigger
            if (window.GOOGLE_SCRIPT_URL) {
                fetch(window.GOOGLE_SCRIPT_URL, {
                    method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'merch_order',
                        to_name: name,
                        to_email: email,
                        order_id: createdOrderId,
                        item_name: currentProduct.name,
                        size: size,
                        quantity: qty,
                        total_price: totalPrice
                    })
                }).catch(console.error);
            }

            lastPlacedEmail = email;
            modal.classList.remove('active');
            productsGrid.style.display = 'none';

            // Show rich confirmation details
            orderConfirmationDetails.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:12px;">
                    <div>
                        <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Order Reference</div>
                        <div style="font-family:monospace; font-weight:700; color:var(--primary); font-size:1.05rem;">#${createdOrderId.slice(0, 10).toUpperCase()}</div>
                    </div>
                    <span style="background:rgba(16,185,129,0.1); color:var(--success); padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:700;">
                        <i class="ph-bold ph-check"></i> Paid
                    </span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.9rem; margin-bottom:12px;">
                    <div><span style="color:var(--text-muted);">Item:</span> <strong style="color:#fff;">${escapeHtml(currentProduct.name)}</strong></div>
                    <div><span style="color:var(--text-muted);">Size & Qty:</span> <strong style="color:#fff;">${size} (x${qty})</strong></div>
                    <div><span style="color:var(--text-muted);">Customer:</span> <strong style="color:#fff;">${escapeHtml(name)}</strong></div>
                    <div><span style="color:var(--text-muted);">Phone:</span> <strong style="color:#fff;">${escapeHtml(phone)}</strong></div>
                </div>
                ${paymentDetails ? `
                    <div style="background:rgba(56,189,248,0.08); border:1px dashed #38bdf8; border-radius:8px; padding:10px; margin-bottom:12px; font-size:0.85rem; font-family:monospace; color:#38bdf8;">
                        UPI UTR Reference: ${paymentDetails.utr}
                    </div>
                ` : ''}
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--border); padding-top:12px; font-size:1.1rem;">
                    <span style="color:var(--text-muted);">Total Amount Paid:</span>
                    <strong style="color:var(--primary); font-size:1.3rem;">₹${totalPrice}</strong>
                </div>
            `;

            successState.style.display = 'block';

        } catch (err) {
            console.error("Order execution error:", err);
            if (err.message === "OutOfStock") {
                showToast(`Sorry, we only have ${currentProduct.sizes[size]} left in size ${size}.`, "danger");
            } else if (err.message === "Inactive" || err.message === "ProductNotFound") {
                showToast("This product is no longer available in the store.", "danger");
            } else if (err.message === "PAYMENT_CANCELLED") {
                showToast("Payment was cancelled.", "warning");
            } else if (err.message === "PAYMENT_EXPIRED") {
                showToast("Payment session timed out.", "danger");
            } else {
                showToast("Order placement failed. Please try again.", "danger");
            }
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="ph-bold ph-credit-card"></i> <span>Place Order</span>';
        }
    });

    // --- MY ORDERS / HISTORY MODAL ---
    if (myOrdersBtn && myOrdersModal) {
        myOrdersBtn.onclick = () => {
            if (lastPlacedEmail && !lookupEmailInput.value) {
                lookupEmailInput.value = lastPlacedEmail;
            }
            myOrdersModal.classList.add('active');
            if (lookupEmailInput.value) {
                performOrdersLookup();
            }
        };

        closeMyOrdersModal.onclick = () => myOrdersModal.classList.remove('active');
    }

    if (successViewOrdersBtn) {
        successViewOrdersBtn.onclick = () => {
            if (lastPlacedEmail) lookupEmailInput.value = lastPlacedEmail;
            myOrdersModal.classList.add('active');
            performOrdersLookup();
        };
    }

    if (lookupOrdersBtn) {
        lookupOrdersBtn.onclick = performOrdersLookup;
    }

    if (lookupEmailInput) {
        lookupEmailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performOrdersLookup();
        });
    }

    async function performOrdersLookup() {
        const email = lookupEmailInput.value.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showToast("Please enter a valid email address.", "danger");
            return;
        }

        lookupOrdersBtn.disabled = true;
        lookupOrdersBtn.innerHTML = '<i class="ph-bold ph-spinner-gap spin"></i>';
        lookupResults.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px 0;"><i class="ph-bold ph-spinner-gap spin"></i> Finding your orders...</p>';

        try {
            const snap = await firestore.collection('merchOrders')
                .where('buyerEmail', '==', email)
                .where('orgId', '==', activeOrgId)
                .get();

            lookupOrdersBtn.disabled = false;
            lookupOrdersBtn.innerHTML = '<i class="ph-bold ph-magnifying-glass"></i> <span>Search</span>';

            if (snap.empty) {
                lookupResults.innerHTML = `
                    <div style="text-align:center; padding:30px 0; color:var(--text-muted);">
                        <i class="ph-bold ph-shopping-bag" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:10px; display:inline-block;"></i>
                        <p style="margin:0;">No orders found for <strong>${escapeHtml(email)}</strong> in this store.</p>
                    </div>
                `;
                return;
            }

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a,b) => (b.orderedAt?.toMillis() || 0) - (a.orderedAt?.toMillis() || 0));

            lookupResults.innerHTML = orders.map(ord => {
                const dateStr = ord.orderedAt ? new Date(ord.orderedAt.toMillis()).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                }) : 'Recent';

                let statusColor = '#f59e0b';
                let statusText = 'Ordered';
                if (ord.fulfillmentStatus === 'ready') {
                    statusColor = '#38bdf8';
                    statusText = 'Ready for Pickup';
                } else if (ord.fulfillmentStatus === 'collected') {
                    statusColor = '#10b981';
                    statusText = 'Collected';
                }

                return `
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:12px; text-align:left;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                            <div>
                                <span style="font-family:monospace; font-size:0.8rem; color:var(--text-muted);">ORDER #${ord.id.slice(0, 8).toUpperCase()}</span>
                                <h4 style="margin:2px 0 0; color:#fff; font-size:1.05rem;">${escapeHtml(ord.productName || 'Merch Item')}</h4>
                            </div>
                            <span style="background:${statusColor}22; color:${statusColor}; border:1px solid ${statusColor}44; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">
                                ${statusText}
                            </span>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:8px; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">
                            <div>Size: <strong style="color:#fff;">${escapeHtml(ord.size || '-')}</strong></div>
                            <div>Qty: <strong style="color:#fff;">${ord.quantity || 1}</strong></div>
                            <div>Paid: <strong style="color:var(--primary);">₹${ord.totalPrice || 0}</strong></div>
                            <div>Date: <strong style="color:#fff;">${dateStr}</strong></div>
                        </div>
                        ${ord.paymentRef ? `<div style="font-family:monospace; font-size:0.75rem; color:#38bdf8;">UPI UTR: ${escapeHtml(ord.paymentRef)}</div>` : ''}
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error("Lookup error:", err);
            lookupOrdersBtn.disabled = false;
            lookupOrdersBtn.innerHTML = '<i class="ph-bold ph-magnifying-glass"></i> <span>Search</span>';
            lookupResults.innerHTML = '<p style="text-align:center; color:var(--danger); padding:20px 0;">Error fetching orders. Please try again.</p>';
        }
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
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
});
