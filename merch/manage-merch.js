// File: merch/manage-merch.js
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db;
    
    const orgNameMeta = document.getElementById('org-name-meta');
    const viewStoreLink = document.getElementById('view-store-link');
    
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.color = 'var(--text-muted)';
            });
            btn.classList.add('active');
            btn.style.color = 'white';
            
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });
            
            const target = document.getElementById(btn.dataset.target);
            target.classList.add('active');
            target.style.display = 'block';
        });
    });

    // Modals & Forms
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const nameInput = document.getElementById('prod-name');
    const catInput = document.getElementById('prod-category');
    const descInput = document.getElementById('prod-desc');
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
    const orderFilter = document.getElementById('order-filter');
    
    let currentOrgId = null;
    let productsData = [];
    let ordersData = [];
    let editDocId = null;

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        if (!user || sessionStorage.getItem('authType') !== 'admin') {
            window.location.href = '../index.html';
            return;
        }
        try {
            const orgsSnapshot = await firestore.collection('organizations').where('ownerId', '==', user.uid).get();
            if (orgsSnapshot.empty) {
                showToast('Organization not found.', 'error');
                return;
            }
            const orgDoc = orgsSnapshot.docs[0];
            currentOrgId = orgDoc.id;
            orgNameMeta.textContent = orgDoc.data().name;
            viewStoreLink.href = `store.html?org=${currentOrgId}`;
            
            setupRealtimeListeners();
        } catch (error) {
            console.error(error);
        }
    });

    // --- REAL-TIME DATA ---
    function setupRealtimeListeners() {
        // Products
        firestore.collection('merchProducts')
            .where('orgId', '==', currentOrgId)
            .onSnapshot(snap => {
                productsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderProducts();
            });

        // Orders
        firestore.collection('merchOrders')
            .where('orgId', '==', currentOrgId)
            .onSnapshot(snap => {
                ordersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderOrders();
            });
    }

    // --- PRODUCTS ---
    function renderProducts() {
        if (productsData.length === 0) {
            productsList.innerHTML = '<div class="empty-state"><p>No products found. Add one!</p></div>';
            return;
        }
        
        productsList.innerHTML = '';
        productsData.forEach(p => {
            const sizes = p.sizes || {};
            const totalStock = Object.values(sizes).reduce((a,b)=>a+b, 0);
            
            const el = document.createElement('div');
            el.className = 'list-item card';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';
            el.style.padding = '15px 20px';
            
            const activeBadge = p.isActive 
                ? '<span class="badge active" style="background:rgba(16,185,129,0.1); color:#10b981;">Active</span>' 
                : '<span class="badge expired" style="background:rgba(239,68,68,0.1); color:#ef4444;">Inactive</span>';
            
            el.innerHTML = `
                <div style="display:flex; gap:15px; align-items:center;">
                    <div style="font-size:2rem; color:var(--primary);"><i class="ph-fill ph-t-shirt"></i></div>
                    <div>
                        <h3 style="margin:0 0 5px 0;">${p.name} ${activeBadge}</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); display:flex; gap:10px;">
                            <span>₹${p.price} (Member: ₹${p.memberPrice})</span>
                            <span>•</span>
                            <span>Stock: ${totalStock}</span>
                            <span>•</span>
                            <span>Sold: ${p.totalSold || 0}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <button class="secondary-btn edit-btn" style="padding:8px 15px;"><i class="ph-bold ph-pencil-simple"></i> Edit</button>
                </div>
            `;
            
            el.querySelector('.edit-btn').onclick = () => openProductModal(p);
            productsList.appendChild(el);
        });
    }

    document.getElementById('add-product-btn').onclick = () => {
        editDocId = null;
        form.reset();
        document.getElementById('product-modal-title').textContent = 'New Product';
        deleteBtn.style.display = 'none';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Product</span>';
        modal.classList.add('active');
    };

    document.getElementById('close-product-modal').onclick = () => modal.classList.remove('active');
    document.getElementById('cancel-product-btn').onclick = () => modal.classList.remove('active');

    function openProductModal(p) {
        editDocId = p.id;
        nameInput.value = p.name;
        catInput.value = p.category;
        descInput.value = p.description || '';
        priceInput.value = p.price;
        memPriceInput.value = p.memberPrice;
        activeCb.checked = p.isActive;
        
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

        const data = {
            orgId: currentOrgId,
            name: nameInput.value.trim(),
            category: catInput.value,
            description: descInput.value.trim(),
            price: parseFloat(priceInput.value),
            memberPrice: parseFloat(memPriceInput.value),
            isActive: activeCb.checked,
            sizes: {
                'S': parseInt(stockS.value) || 0,
                'M': parseInt(stockM.value) || 0,
                'L': parseInt(stockL.value) || 0,
                'XL': parseInt(stockXL.value) || 0,
                'XXL': parseInt(stockXXL.value) || 0
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validation (Task 3.5)
        if (data.name.length < 2) {
            showToast('Product name must be at least 2 characters.', 'error'); return;
        }
        if (isNaN(data.price) || data.price <= 0) {
            showToast('Price must be a positive number.', 'error'); return;
        }
        if (isNaN(data.memberPrice) || data.memberPrice < 0) {
            showToast('Member price cannot be negative.', 'error'); return;
        }
        if (data.memberPrice > data.price) {
            showToast('Member price should not exceed regular price.', 'error'); return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        try {
            if (editDocId) {
                await firestore.collection('merchProducts').doc(editDocId).update(data);
                showToast('Product updated', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.totalSold = 0;
                await firestore.collection('merchProducts').add(data);
                showToast('Product added', 'success');
            }
            modal.classList.remove('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to save product', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    deleteBtn.onclick = async () => {
        if (!editDocId) return;
        
        // Check if orders exist
        const hasOrders = ordersData.some(o => o.productId === editDocId);
        if (hasOrders) {
            showToast('Cannot delete product with existing orders. Make it inactive instead.', 'error');
            return;
        }
        
        if (!confirm('Delete this product?')) return;
        try {
            await firestore.collection('merchProducts').doc(editDocId).delete();
            showToast('Product deleted', 'success');
            modal.classList.remove('active');
        } catch(err) {
            showToast('Failed to delete', 'error');
        }
    };

    // --- ORDERS ---
    orderFilter.addEventListener('change', renderOrders);

    function renderOrders() {
        const filter = orderFilter.value;
        let filtered = ordersData;
        if (filter !== 'all') {
            filtered = filtered.filter(o => o.fulfillmentStatus === filter);
        }

        // Sort by date desc
        filtered.sort((a,b) => (b.orderedAt?.toMillis()||0) - (a.orderedAt?.toMillis()||0));

        if (filtered.length === 0) {
            ordersList.innerHTML = '<div class="empty-state"><p>No orders found.</p></div>';
            return;
        }
        
        ordersList.innerHTML = '';
        filtered.forEach(o => {
            const el = document.createElement('div');
            el.className = 'list-item card';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';
            el.style.padding = '15px 20px';
            
            const dateStr = o.orderedAt ? new Date(o.orderedAt.toMillis()).toLocaleString() : 'Just now';
            
            let statusColor = '#eab308'; // yellow ordered
            if (o.fulfillmentStatus === 'ready') statusColor = '#3b82f6'; // blue
            if (o.fulfillmentStatus === 'collected') statusColor = '#10b981'; // green

            el.innerHTML = `
                <div>
                    <h4 style="margin:0 0 5px 0;">${o.buyerName} <span style="font-weight:normal; color:var(--text-muted);">(${o.buyerEmail})</span></h4>
                    <div style="font-size:0.85rem; color:var(--text-muted); display:flex; gap:10px;">
                        <span>${o.productName} (Size: ${o.size}) x${o.quantity}</span>
                        <span>•</span>
                        <span style="color:white; font-weight:bold;">₹${o.totalPrice}</span>
                        <span>•</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <select class="custom-select status-update-sel" data-id="${o.id}" style="padding:5px 10px; font-size:0.85rem; border-color:${statusColor}; color:${statusColor}; background:transparent;">
                        <option value="ordered" ${o.fulfillmentStatus==='ordered'?'selected':''} style="color:white;">Ordered</option>
                        <option value="ready" ${o.fulfillmentStatus==='ready'?'selected':''} style="color:white;">Ready for Pickup</option>
                        <option value="collected" ${o.fulfillmentStatus==='collected'?'selected':''} style="color:white;">Collected</option>
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
                    showToast('Order status updated.', 'success');
                } catch(err) {
                    showToast('Failed to update.', 'error');
                }
            });
            
            ordersList.appendChild(el);
        });
    }

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
