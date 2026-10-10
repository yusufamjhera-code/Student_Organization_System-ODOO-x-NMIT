// File: merch/manage-merch.js - Production Merchandise Management Controller
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db;
    
    const orgNameMeta = document.getElementById('org-name-meta');
    const viewStoreLink = document.getElementById('view-store-link');
    const shareStoreBtn = document.getElementById('share-store-btn');
    
    // Tabs
    const tabBtns = document.querySelectorAll('.merch-tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });
            
            const target = document.getElementById(btn.dataset.target);
            if (target) {
                target.classList.add('active');
                target.style.display = 'block';
            }
        });
    });

    // Modals & Forms
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const nameInput = document.getElementById('prod-name');
    const catInput = document.getElementById('prod-category');
    const descInput = document.getElementById('prod-desc');
    const imageInput = document.getElementById('prod-image');
    const priceInput = document.getElementById('prod-price');
    const memPriceInput = document.getElementById('prod-member-price');
    const activeCb = document.getElementById('prod-active');
    
    const stockS = document.getElementById('stock-s');
    const stockM = document.getElementById('stock-m');
    const stockL = document.getElementById('stock-l');
    const stockXL = document.getElementById('stock-xl');
    const stockXXL = document.getElementById('stock-xxl');

    const saveBtn = document.getElementById('save-product-btn');
    const deleteBtn = document.getElementById('delete-product-btn');
    
    const productsList = document.getElementById('products-list');
    const ordersList = document.getElementById('orders-list');
    
    const prodSearch = document.getElementById('prod-search');
    const prodCatFilter = document.getElementById('prod-cat-filter');
    const orderSearch = document.getElementById('order-search');
    const orderFilter = document.getElementById('order-filter');
    
    const badgeProductsCount = document.getElementById('badge-products-count');
    const badgeOrdersCount = document.getElementById('badge-orders-count');
    
    let currentOrgId = null;
    let productsData = [];
    let ordersData = [];
    let editDocId = null;

    function loadDemoMerch() {
        currentOrgId = 'demo-org-acm';
        if (orgNameMeta) orgNameMeta.textContent = 'ACM Student Chapter • NMIT';
        if (viewStoreLink) viewStoreLink.href = `store.html?org=${currentOrgId}`;

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

        ordersData = [
            {
                id: 'ord-101',
                customerName: 'Aarav Sharma',
                customerEmail: 'aarav.sharma@nmit.ac.in',
                items: [{ productName: 'ACM Official Heavyweight Hoodie', size: 'L', quantity: 1, price: 850 }],
                totalAmount: 850,
                isMember: true,
                orderStatus: 'ready',
                paymentStatus: 'paid',
                createdAt: { toMillis: () => Date.now() - 3600000 * 24 }
            },
            {
                id: 'ord-102',
                customerName: 'Priya Patel',
                customerEmail: 'priya.p@nmit.ac.in',
                items: [
                    { productName: 'HackNMIT 2026 Minimalist Tee', size: 'M', quantity: 1, price: 350 },
                    { productName: 'Die-Cut Holographic Sticker Pack', size: 'Pack of 8', quantity: 2, price: 80 }
                ],
                totalAmount: 510,
                isMember: true,
                orderStatus: 'fulfilled',
                paymentStatus: 'paid',
                createdAt: { toMillis: () => Date.now() - 3600000 * 48 }
            },
            {
                id: 'ord-103',
                customerName: 'Rohan Deshmukh',
                customerEmail: 'rohan.d@nmit.ac.in',
                items: [{ productName: 'Developer Ceramic Thermal Tumbler', size: 'Standard 450ml', quantity: 1, price: 550 }],
                totalAmount: 550,
                isMember: false,
                orderStatus: 'pending',
                paymentStatus: 'paid',
                createdAt: { toMillis: () => Date.now() - 3600000 * 3 }
            }
        ];

        if (badgeProductsCount) badgeProductsCount.textContent = productsData.length;
        if (badgeOrdersCount) badgeOrdersCount.textContent = ordersData.length;
        renderProducts();
        renderOrders();
    }

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        const isDemo = sessionStorage.getItem('demoUser') === 'true' || 
                       sessionStorage.getItem('authType') === 'admin' ||
                       (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");

        if (user) {
            if (sessionStorage.getItem('authType') !== 'collaborator') {
                sessionStorage.setItem('authType', 'admin');
            }

            try {
                const orgsSnapshot = await firestore.collection('organizations').where('ownerId', '==', user.uid).get();
                if (orgsSnapshot.empty) {
                    if (isDemo) loadDemoMerch();
                    else showToast('Organization not found.', 'error');
                    return;
                }
                const orgDoc = orgsSnapshot.docs[0];
                currentOrgId = orgDoc.id;
                orgNameMeta.textContent = orgDoc.data().name;
                
                if (viewStoreLink) {
                    viewStoreLink.href = `store.html?org=${currentOrgId}`;
                }
                
                setupRealtimeListeners();
            } catch (error) {
                if (isDemo) loadDemoMerch();
                else {
                    console.error("Auth init error:", error);
                    showToast('Failed to load store management.', 'error');
                }
            }
        } else if (isDemo) {
            loadDemoMerch();
        } else {
            window.location.href = '../index.html';
        }
    });

    if (shareStoreBtn) {
        shareStoreBtn.onclick = () => {
            if (!currentOrgId) return;
            const storeUrl = `${window.location.origin}/merch/store.html?org=${currentOrgId}`;
            navigator.clipboard.writeText(storeUrl).then(() => {
                showToast('Storefront link copied to clipboard!', 'success');
            }).catch(() => {
                prompt('Storefront public link:', storeUrl);
            });
        };
    }

    // --- REAL-TIME DATA ---
    function setupRealtimeListeners() {
        // Products
        firestore.collection('merchProducts')
            .where('orgId', '==', currentOrgId)
            .onSnapshot(snap => {
                productsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (badgeProductsCount) badgeProductsCount.textContent = productsData.length;
                renderProducts();
            });

        // Orders
        firestore.collection('merchOrders')
            .where('orgId', '==', currentOrgId)
            .onSnapshot(snap => {
                ordersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (badgeOrdersCount) badgeOrdersCount.textContent = ordersData.length;
                renderOrders();
            });
    }

    // --- PRODUCTS RENDERING ---
    function renderProducts() {
        let filtered = [...productsData];

        if (prodCatFilter && prodCatFilter.value !== 'all') {
            filtered = filtered.filter(p => (p.category || 'other') === prodCatFilter.value);
        }

        if (prodSearch && prodSearch.value.trim()) {
            const query = prodSearch.value.trim().toLowerCase();
            filtered = filtered.filter(p => 
                (p.name || '').toLowerCase().includes(query) ||
                (p.description || '').toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            productsList.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="ph-bold ph-t-shirt" style="font-size: 2.5rem; margin-bottom: 10px; display: block; color: var(--primary);"></i>
                    <p style="font-weight: 600;">No merchandise products found. Click "+ Add Product" to add items.</p>
                </div>
            `;
            return;
        }
        
        productsList.innerHTML = '';
        filtered.forEach(p => {
            const sizes = p.sizes || [];
            const isSizesArray = Array.isArray(sizes);
            const totalStock = p.stock !== undefined ? p.stock : (isSizesArray ? sizes.length * 10 : Object.values(sizes).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0));
            
            const el = document.createElement('div');
            el.className = 'product-row-card';
            
            const isActive = p.isActive !== false;
            const activeBadge = isActive 
                ? '<span class="badge active" style="background:rgba(16,185,129,0.12); color:#059669; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">Active</span>' 
                : '<span class="badge expired" style="background:rgba(239,68,68,0.12); color:#dc2626; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">Inactive</span>';
            
            const thumbHtml = p.imageUrl 
                ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" class="product-thumb" onerror="this.outerHTML='<div class=\\'product-thumb-fallback\\'><i class=\\'ph-fill ph-t-shirt\\'></i></div>'">` 
                : `<div class="product-thumb-fallback"><i class="ph-fill ph-t-shirt"></i></div>`;

            const sizeBreakdown = isSizesArray ? sizes.join(', ') : Object.entries(sizes).map(([k, v]) => `${k}:${v}`).join(' | ');
            const regularPrice = p.nonMemberPrice || p.price || 0;
            const memberPrice = p.memberPrice || regularPrice;

            el.innerHTML = `
                <div class="product-media-wrap">
                    ${thumbHtml}
                    <div class="product-details">
                        <div class="product-title-row">
                            <h3 class="product-title">${escapeHtml(p.name || 'Unnamed Gear')}</h3>
                            ${activeBadge}
                        </div>
                        <div class="product-meta-row">
                            <span style="font-weight: 700; color: var(--text-main);">₹${regularPrice}</span>
                            <span style="color: var(--primary); font-weight: 600;">(Member: ₹${memberPrice})</span>
                            <span>•</span>
                            <span>Sizes: <strong>${sizeBreakdown}</strong></span>
                            <span>•</span>
                            <span>Stock: <strong>${totalStock}</strong></span>
                            <span>•</span>
                            <span>Sold: <strong>${p.totalSold || 14}</strong></span>
                        </div>
                    </div>
                </div>
                <div>
                    <button class="secondary-btn edit-btn" style="padding: 7px 14px; font-size: 0.88rem;">
                        <i class="ph-bold ph-pencil-simple"></i> <span>Edit</span>
                    </button>
                </div>
            `;
            
            el.querySelector('.edit-btn').onclick = () => openProductModal(p);
            productsList.appendChild(el);
        });
    }

    if (prodSearch) prodSearch.addEventListener('input', renderProducts);
    if (prodCatFilter) prodCatFilter.addEventListener('change', renderProducts);

    document.getElementById('add-product-btn').onclick = () => {
        editDocId = null;
        form.reset();
        activeCb.checked = true;
        stockS.value = 10;
        stockM.value = 15;
        stockL.value = 15;
        stockXL.value = 10;
        stockXXL.value = 5;
        document.getElementById('product-modal-title').textContent = 'New Product';
        deleteBtn.style.display = 'none';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Product</span>';
        modal.classList.add('active');
    };

    document.getElementById('close-product-modal').onclick = () => modal.classList.remove('active');
    document.getElementById('cancel-product-btn').onclick = () => modal.classList.remove('active');

    function openProductModal(p) {
        editDocId = p.id;
        nameInput.value = p.name || '';
        catInput.value = p.category || 'hoodie';
        descInput.value = p.description || '';
        if (imageInput) imageInput.value = p.imageUrl || '';
        priceInput.value = p.price || 0;
        memPriceInput.value = p.memberPrice || 0;
        activeCb.checked = p.isActive !== false;
        
        const sizes = p.sizes || {};
        stockS.value = sizes['S'] || 0;
        stockM.value = sizes['M'] || 0;
        stockL.value = sizes['L'] || 0;
        stockXL.value = sizes['XL'] || 0;
        stockXXL.value = sizes['XXL'] || 0;
        
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        deleteBtn.style.display = 'block';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Changes</span>';
        modal.classList.add('active');
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const category = catInput.value;
        const description = descInput.value.trim();
        const imageUrl = imageInput ? imageInput.value.trim() : '';
        const price = parseFloat(priceInput.value);
        const memberPrice = parseFloat(memPriceInput.value);

        // STRICT VALIDATIONS
        if (name.length < 2) {
            showToast('Product name must be at least 2 characters.', 'error'); return;
        }
        if (name.length > 80) {
            showToast('Product name cannot exceed 80 characters.', 'error'); return;
        }
        if (isNaN(price) || price <= 0) {
            showToast('Regular price must be greater than ₹0.', 'error'); return;
        }
        if (isNaN(memberPrice) || memberPrice < 0) {
            showToast('Member price cannot be negative.', 'error'); return;
        }
        if (memberPrice > price) {
            showToast('Member price should not exceed regular price.', 'error'); return;
        }
        if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
            showToast('Image URL must start with http:// or https://', 'error'); return;
        }

        const sizes = {
            'S': Math.max(0, parseInt(stockS.value) || 0),
            'M': Math.max(0, parseInt(stockM.value) || 0),
            'L': Math.max(0, parseInt(stockL.value) || 0),
            'XL': Math.max(0, parseInt(stockXL.value) || 0),
            'XXL': Math.max(0, parseInt(stockXXL.value) || 0)
        };

        const data = {
            orgId: currentOrgId,
            name: name,
            category: category,
            description: description,
            imageUrl: imageUrl || null,
            price: price,
            memberPrice: memberPrice,
            isActive: activeCb.checked,
            sizes: sizes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Saving...';

        try {
            if (editDocId) {
                await firestore.collection('merchProducts').doc(editDocId).update(data);
                showToast('Product details updated.', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.totalSold = 0;
                await firestore.collection('merchProducts').add(data);
                showToast('New product added to store!', 'success');
            }
            modal.classList.remove('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to save product.', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    deleteBtn.onclick = async () => {
        if (!editDocId) return;
        const hasOrders = ordersData.some(o => o.productId === editDocId);
        if (hasOrders) {
            showToast('Cannot delete product with existing customer orders. Set it to Inactive instead.', 'error');
            return;
        }
        
        if (!confirm('Are you sure you want to permanently delete this product?')) return;
        try {
            await firestore.collection('merchProducts').doc(editDocId).delete();
            showToast('Product deleted.', 'success');
            modal.classList.remove('active');
        } catch(err) {
            showToast('Failed to delete product.', 'error');
        }
    };

    // --- ORDERS RENDERING ---
    if (orderFilter) orderFilter.addEventListener('change', renderOrders);
    if (orderSearch) orderSearch.addEventListener('input', renderOrders);

    function renderOrders() {
        const filter = orderFilter ? orderFilter.value : 'all';
        let filtered = [...ordersData];

        if (filter !== 'all') {
            filtered = filtered.filter(o => o.fulfillmentStatus === filter);
        }

        if (orderSearch && orderSearch.value.trim()) {
            const query = orderSearch.value.trim().toLowerCase();
            filtered = filtered.filter(o => 
                (o.buyerName || '').toLowerCase().includes(query) ||
                (o.buyerEmail || '').toLowerCase().includes(query) ||
                (o.buyerPhone || '').includes(query) ||
                (o.id || '').toLowerCase().includes(query) ||
                (o.productName || '').toLowerCase().includes(query)
            );
        }

        filtered.sort((a, b) => (b.orderedAt?.toMillis() || 0) - (a.orderedAt?.toMillis() || 0));

        if (filtered.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="ph-bold ph-shopping-bag" style="font-size: 2.5rem; margin-bottom: 10px; display: block; color: var(--primary);"></i>
                    <p style="font-weight: 600;">No customer orders found.</p>
                </div>
            `;
            return;
        }
        
        ordersList.innerHTML = '';
        filtered.forEach(o => {
            const el = document.createElement('div');
            el.className = 'order-row-card';
            
            const dateStr = o.orderedAt ? new Date(o.orderedAt.toMillis()).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Recent';
            
            const status = o.fulfillmentStatus || 'ordered';
            let statusBadge = '<span class="badge pending">Ordered (Awaiting Pickup)</span>';
            if (status === 'ready') statusBadge = '<span class="badge" style="background:rgba(37,99,235,0.12); color:#2563eb;">Ready for Pickup</span>';
            if (status === 'collected') statusBadge = '<span class="badge active">Collected (Fulfilled)</span>';

            const phoneText = o.buyerPhone ? `• Phone: <a href="tel:${o.buyerPhone}" style="color:var(--text-main); font-weight:600;">${o.buyerPhone}</a>` : '';

            el.innerHTML = `
                <div style="flex: 1;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                        <h4 class="order-buyer-name">${escapeHtml(o.buyerName || 'Customer')}</h4>
                        ${statusBadge}
                    </div>
                    <div class="order-meta-info">
                        <span>Email: <a href="mailto:${o.buyerEmail}" style="color:var(--primary);">${escapeHtml(o.buyerEmail || '')}</a></span>
                        ${phoneText}
                        <span>•</span>
                        <span>Item: <strong>${escapeHtml(o.productName || 'Merch')}</strong> (Size: ${o.size || 'M'}) x${o.quantity || 1}</span>
                        <span>•</span>
                        <span style="font-weight: 700; color: var(--text-main);">₹${o.totalPrice || 0}</span>
                        <span>•</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
                <div class="order-actions-wrap">
                    <select class="custom-select status-update-sel" data-id="${o.id}" style="padding:6px 10px; font-size:0.85rem; width:auto;">
                        <option value="ordered" ${status === 'ordered' ? 'selected' : ''}>Ordered</option>
                        <option value="ready" ${status === 'ready' ? 'selected' : ''}>Ready for Pickup</option>
                        <option value="collected" ${status === 'collected' ? 'selected' : ''}>Collected</option>
                    </select>
                </div>
            `;
            
            el.querySelector('.status-update-sel').addEventListener('change', async (e) => {
                const newStatus = e.target.value;
                try {
                    await firestore.collection('merchOrders').doc(o.id).update({
                        fulfillmentStatus: newStatus,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showToast(`Order marked as ${newStatus}.`, 'success');
                } catch(err) {
                    showToast('Failed to update order status.', 'error');
                }
            });
            
            ordersList.appendChild(el);
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-x-circle' : 'ph-info');
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
});
