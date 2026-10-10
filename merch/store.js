// File: merch/store.js
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
    const verifStatus = document.getElementById('member-verification-status');
    const totalEl = document.getElementById('order-total');
    const stockWarn = document.getElementById('stock-warning');
    const checkoutBtn = document.getElementById('checkout-btn');
    const successState = document.getElementById('success-state');

    let productsData = [];
    let currentProduct = null;
    let isMemberVerif = false;
    
    // --- RESOLVE ORGID IF MISSING ---
    let activeOrgId = orgId;
    if (!activeOrgId) {
        try {
            const orgsSnap = await firestore.collection('organizations').limit(10).get();
            if (orgsSnap.empty) {
                spinner.innerHTML = '<p>No student organizations found. Please set up an organization first.</p>';
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
                                    <span>${d.data().name}</span>
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
            spinner.innerHTML = '<p>Error loading store options.</p>';
            return;
        }
    }

    // --- LOAD DATA ---
    try {
        const orgDoc = await firestore.collection('organizations').doc(activeOrgId).get();
        if (!orgDoc.exists) {
            spinner.innerHTML = '<p>Organization not found.</p>';
            return;
        }
        orgNameEl.textContent = orgDoc.data().name;

        firestore.collection('merchProducts')
            .where('orgId', '==', activeOrgId)
            .where('isActive', '==', true)
            .onSnapshot(snap => {
                productsData = snap.docs.map(d => ({id: d.id, ...d.data()}));
                renderProducts();
            });
    } catch (err) {
        console.error("Error loading store:", err);
        spinner.innerHTML = '<p>Failed to load store.</p>';
    }

    function renderProducts() {
        spinner.style.display = 'none';
        productsGrid.style.display = 'grid';
        
        if (productsData.length === 0) {
            productsGrid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align:center; padding:50px;">
                    <i class="ph-bold ph-storefront" style="font-size:3rem; color:var(--primary); margin-bottom:15px;"></i>
                    <h2>Store is Empty</h2>
                    <p style="color:var(--text-muted);">Check back later for new merchandise!</p>
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
            
            const totalStock = Object.values(p.sizes || {}).reduce((a,b)=>a+b, 0);
            
            el.innerHTML = `
                <div class="product-img ${p.category || 'other'}">
                    <i class="ph-fill ${icon}"></i>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-desc">${p.description || ''}</div>
                    <div class="product-price-row">
                        <div class="price-reg">₹${p.price}</div>
                        <div class="price-mem">Member: ₹${p.memberPrice}</div>
                    </div>
                    <button class="primary-btn buy-btn" style="width:100%; justify-content:center;" ${totalStock === 0 ? 'disabled' : ''}>
                        <i class="ph-bold ph-shopping-cart"></i> 
                        <span>${totalStock === 0 ? 'Out of Stock' : 'Buy Now'}</span>
                    </button>
                    ${totalStock > 0 && totalStock < 10 ? `<div class="stock-info">Only ${totalStock} left!</div>` : ''}
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
            if (sizes[s] > 0) {
                sizeSelect.innerHTML += `<option value="${s}">${s} (Stock: ${sizes[s]})</option>`;
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
        const qty = parseInt(qtyInput.value) || 1;
        const unitPrice = isMemberVerif ? currentProduct.memberPrice : currentProduct.price;
        totalEl.textContent = `₹${unitPrice * qty}`;
        
        // Check stock
        const selectedSize = sizeSelect.value;
        if (selectedSize) {
            const avail = currentProduct.sizes[selectedSize] || 0;
            if (qty > avail) {
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
                    .where('orgId', '==', orgId)
                    .where('email', '==', email)
                    .get();

                if (!q.empty) {
                    const member = q.docs[0].data();
                    if (member.membershipStatus === 'active') {
                        isMemberVerif = true;
                        verifStatus.className = 'alert-box success';
                        verifStatus.innerHTML = '<i class="ph-bold ph-check-circle"></i> Active member verified! Discount applied.';
                        verifStatus.style.display = 'flex';
                    } else {
                        isMemberVerif = false;
                        verifStatus.className = 'alert-box warning';
                        verifStatus.innerHTML = '<i class="ph-bold ph-warning-circle"></i> Membership inactive. Regular price applies.';
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
        
        if (!size) {
            showToast("Please select a size.", "danger");
            return;
        }

        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>Processing...</span>';

        const productRef = firestore.collection('merchProducts').doc(currentProduct.id);
        
        try {
            await firestore.runTransaction(async (transaction) => {
                const pDoc = await transaction.get(productRef);
                const pData = pDoc.data();
                
                if (!pData.isActive) throw new Error("Inactive");
                
                const sizes = pData.sizes || {};
                const currentStock = sizes[size] || 0;
                
                if (qty > currentStock) {
                    throw new Error("OutOfStock");
                }
                
                // Decrement stock and inc sold
                sizes[size] = currentStock - qty;
                const newSold = (pData.totalSold || 0) + qty;
                
                transaction.update(productRef, { sizes: sizes, totalSold: newSold });
                
                const unitPrice = isMemberVerif ? pData.memberPrice : pData.price;
                const totalPrice = unitPrice * qty;
                
                // Create Order
                const orderRef = firestore.collection('merchOrders').doc();
                transaction.set(orderRef, {
                    orgId: orgId,
                    productId: pDoc.id,
                    productName: pData.name,
                    buyerName: name,
                    buyerEmail: email,
                    isMember: isMemberVerif,
                    size: size,
                    quantity: qty,
                    unitPrice: unitPrice,
                    totalPrice: totalPrice,
                    paymentStatus: 'paid', // Assuming cash on delivery or instant external pay for now
                    fulfillmentStatus: 'ordered',
                    orderedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Auto-create Transaction for Treasury
                if (totalPrice > 0) {
                    const txnRef = firestore.collection('transactions').doc();
                    transaction.set(txnRef, {
                        orgId: orgId,
                        type: 'income',
                        amount: totalPrice,
                        category: 'merchandise',
                        date: new Date().toISOString().split('T')[0],
                        description: `Merch Order: ${pData.name} (x${qty})`,
                        recordedBy: 'System',
                        recordedByName: 'System',
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
                        type: 'participant', // using participant as a generic hook for now, or you can add merch hook
                        to_name: name,
                        to_email: email,
                        event_name: 'Merchandise Order'
                    })
                }).catch(console.error);
            }

            modal.classList.remove('active');
            productsGrid.style.display = 'none';
            successState.style.display = 'block';

        } catch (err) {
            console.error(err);
            if (err.message === "OutOfStock") {
                showToast(`Sorry, we only have ${currentProduct.sizes[size]} left in size ${size}.`, "danger");
            } else if (err.message === "Inactive") {
                showToast("This product is no longer available.", "danger");
            } else {
                showToast("Order failed. Please try again.", "danger");
            }
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="ph-bold ph-credit-card"></i> <span>Place Order</span>';
        }
    });

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-x-circle';
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
