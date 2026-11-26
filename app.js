/**
 * CartCanvas: LocalMart Linkup - Main Application Logic
 * Implements shop directory, catalog, cart, slots, merchant cockpit, live tracking, and demo flow.
 */

document.addEventListener('DOMContentLoaded', () => {
    const store = window.appStore;
    const soundFx = window.soundFx;

    // DOM Elements
    const elements = {
        // Views
        customerViewContainer: document.getElementById('customerViewContainer'),
        merchantViewContainer: document.getElementById('merchantViewContainer'),
        splitViewContainer: document.getElementById('splitViewContainer'),

        // View toggle buttons
        btnViewCustomer: document.getElementById('btnViewCustomer'),
        btnViewMerchant: document.getElementById('btnViewMerchant'),
        btnViewSplit: document.getElementById('btnViewSplit'),
        btnDemoFlow: document.getElementById('btnDemoFlow'),
        btnResetDemo: document.getElementById('btnResetDemo'),

        // Directory & Catalog
        storeDirectorySection: document.getElementById('storeDirectorySection'),
        storefrontSection: document.getElementById('storefrontSection'),
        storeGrid: document.getElementById('storeGrid'),
        productGrid: document.getElementById('productGrid'),
        categoryPills: document.getElementById('categoryPills'),
        searchInput: document.getElementById('searchInput'),
        sortSelect: document.getElementById('sortSelect'),
        currentStoreHeader: document.getElementById('currentStoreHeader'),
        btnBackToDirectory: document.getElementById('btnBackToDirectory'),

        // Cart Drawer
        cartOverlay: document.getElementById('cartOverlay'),
        cartDrawer: document.getElementById('cartDrawer'),
        btnOpenCart: document.getElementById('btnOpenCart'),
        btnCloseCart: document.getElementById('btnCloseCart'),
        cartBadge: document.getElementById('cartBadge'),
        cartItemsList: document.getElementById('cartItemsList'),
        cartFooter: document.getElementById('cartFooter'),
        minOrderAlert: document.getElementById('minOrderAlert'),
        minOrderText: document.getElementById('minOrderText'),
        minOrderProgress: document.getElementById('minOrderProgress'),
        billSubtotal: document.getElementById('billSubtotal'),
        billDeliveryFee: document.getElementById('billDeliveryFee'),
        billDiscountRow: document.getElementById('billDiscountRow'),
        billDiscount: document.getElementById('billDiscount'),
        billTotal: document.getElementById('billTotal'),
        btnCheckout: document.getElementById('btnCheckout'),

        // Cart Options
        btnDeliveryDoorstep: document.getElementById('btnDeliveryDoorstep'),
        btnDeliveryBopis: document.getElementById('btnDeliveryBopis'),
        dateTabToday: document.getElementById('dateTabToday'),
        dateTabTomorrow: document.getElementById('dateTabTomorrow'),
        slotGrid: document.getElementById('slotGrid'),
        apartmentSelect: document.getElementById('apartmentSelect'),
        poolingAlertBadge: document.getElementById('poolingAlertBadge'),
        payOptionCod: document.getElementById('payOptionCod'),
        payOptionUpi: document.getElementById('payOptionUpi'),

        // UPI Modal
        upiModalBackdrop: document.getElementById('upiModalBackdrop'),
        upiAmountDisplay: document.getElementById('upiAmountDisplay'),
        upiVpaDisplay: document.getElementById('upiVpaDisplay'),
        upiCountdown: document.getElementById('upiCountdown'),
        btnSimulateUpiPay: document.getElementById('btnSimulateUpiPay'),
        btnCloseUpiModal: document.getElementById('btnCloseUpiModal'),

        // Customer Live Tracker
        orderTrackerSection: document.getElementById('orderTrackerSection'),
        trackerOrderId: document.getElementById('trackerOrderId'),
        trackerStoreName: document.getElementById('trackerStoreName'),
        trackerStatusBadge: document.getElementById('trackerStatusBadge'),
        trackerSlotTime: document.getElementById('trackerSlotTime'),
        trackerMilestoneBar: document.getElementById('trackerMilestoneBar'),
        stepReceived: document.getElementById('stepReceived'),
        stepAccepted: document.getElementById('stepAccepted'),
        stepPacked: document.getElementById('stepPacked'),
        stepDispatch: document.getElementById('stepDispatch'),
        stepDelivered: document.getElementById('stepDelivered'),
        riderInfoCard: document.getElementById('riderInfoCard'),
        riderAvatar: document.getElementById('riderAvatar'),
        riderName: document.getElementById('riderName'),
        riderVehicle: document.getElementById('riderVehicle'),
        btnCallRider: document.getElementById('btnCallRider'),
        btnWhatsappPing: document.getElementById('btnWhatsappPing'),
        trackerItemsSummary: document.getElementById('trackerItemsSummary'),
        btnDismissTracker: document.getElementById('btnDismissTracker'),
        mapCanvas: document.getElementById('deliveryMapCanvas'),

        // Merchant Cockpit
        merchantStoreSelect: document.getElementById('merchantStoreSelect'),
        merchantStatNew: document.getElementById('merchantStatNew'),
        merchantStatAccepted: document.getElementById('merchantStatAccepted'),
        merchantStatPacked: document.getElementById('merchantStatPacked'),
        merchantStatDispatched: document.getElementById('merchantStatDispatched'),
        merchantOrdersList: document.getElementById('merchantOrdersList'),
        btnTestAudioChime: document.getElementById('btnTestAudioChime'),
        btnToggleSound: document.getElementById('btnToggleSound'),

        // Split view containers
        splitCustomerPane: document.getElementById('splitCustomerPane'),
        splitMerchantPane: document.getElementById('splitMerchantPane')
    };

    let activeUpiTimer = null;
    let mapAnimationFrame = null;

    // ---------------------------------------------------------
    // Initialization & Event Subscriptions
    // ---------------------------------------------------------

    store.subscribe((event, data) => {
        renderNavigationState();
        renderViewMode();

        if (event === 'DATA_LOADED' || event === 'STORE_SELECTED' || event === 'SORT_CHANGED' || event === 'SEARCH_CHANGED' || event === 'CATEGORY_CHANGED') {
            renderStoreDirectory();
            renderStorefrontCatalog();
        }

        if (event === 'CART_UPDATED' || event === 'DATA_LOADED' || event === 'SLOTS_LOADED') {
            renderCartUI();
            renderSlotPicker();
        }

        if (event === 'ORDERS_UPDATED' || event === 'ORDER_CREATED' || event === 'ORDER_STATUS_UPDATED' || event === 'MERCHANT_STORE_CHANGED') {
            renderMerchantCockpit();
            renderCustomerLiveTracker();
        }

        if (event === 'ORDER_PLACED') {
            renderCustomerLiveTracker();
            renderMerchantCockpit();
        }
    });

    // ---------------------------------------------------------
    // View Switcher & Split-Screen Mode
    // ---------------------------------------------------------

    function setView(mode) {
        store.setViewMode(mode);
    }

    elements.btnViewCustomer.addEventListener('click', () => setView('customer'));
    elements.btnViewMerchant.addEventListener('click', () => setView('merchant'));
    elements.btnViewSplit.addEventListener('click', () => setView('split'));

    function renderNavigationState() {
        const mode = store.state.viewMode;
        elements.btnViewCustomer.classList.toggle('active', mode === 'customer');
        elements.btnViewMerchant.classList.toggle('active', mode === 'merchant');
        elements.btnViewSplit.classList.toggle('active', mode === 'split');
    }

    function renderViewMode() {
        const mode = store.state.viewMode;
        if (mode === 'customer') {
            elements.customerViewContainer.style.display = 'block';
            elements.merchantViewContainer.style.display = 'none';
            elements.splitViewContainer.style.display = 'none';
            // Move containers to main body if previously in split
            if (elements.splitCustomerPane.contains(elements.customerViewContainer)) {
                document.querySelector('.main-content').prepend(elements.customerViewContainer);
                document.querySelector('.main-content').append(elements.merchantViewContainer);
            }
        } else if (mode === 'merchant') {
            elements.customerViewContainer.style.display = 'none';
            elements.merchantViewContainer.style.display = 'block';
            elements.splitViewContainer.style.display = 'none';
            if (elements.splitMerchantPane.contains(elements.merchantViewContainer)) {
                document.querySelector('.main-content').append(elements.merchantViewContainer);
            }
        } else if (mode === 'split') {
            elements.customerViewContainer.style.display = 'block';
            elements.merchantViewContainer.style.display = 'block';
            elements.splitViewContainer.style.display = 'grid';

            elements.splitCustomerPane.appendChild(elements.customerViewContainer);
            elements.splitMerchantPane.appendChild(elements.merchantViewContainer);
        }
    }

    // ---------------------------------------------------------
    // Hyperlocal Shop Directory Rendering
    // ---------------------------------------------------------

    elements.categoryPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.cat-pill');
        if (!pill) return;
        const cat = pill.dataset.category;
        elements.categoryPills.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        store.setCategory(cat);
    });

    elements.searchInput.addEventListener('input', (e) => {
        store.setSearchQuery(e.target.value.trim());
    });

    elements.sortSelect.addEventListener('change', (e) => {
        store.setSortBy(e.target.value);
    });

    function getSortedAndFilteredStores() {
        let list = [...store.state.stores];
        const cat = store.state.activeCategory;
        const query = store.state.searchQuery.toLowerCase();
        const sortBy = store.state.sortBy;

        // Filter by category
        if (cat && cat !== 'All') {
            list = list.filter(s => s.category.toLowerCase().includes(cat.toLowerCase()) || s.specialty.toLowerCase().includes(cat.toLowerCase()));
        }

        // Filter by search query (checks store name, specialty, or products sold)
        if (query) {
            list = list.filter(s => {
                const nameMatch = s.name.toLowerCase().includes(query);
                const specMatch = s.specialty.toLowerCase().includes(query);
                const hasProduct = store.state.products.some(p => p.store_id === s.id && p.name.toLowerCase().includes(query));
                return nameMatch || specMatch || hasProduct;
            });
        }

        // Proximity and criteria sorting
        if (sortBy === 'distance') {
            list.sort((a, b) => a.distance_km - b.distance_km);
        } else if (sortBy === 'rating') {
            list.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'min_order') {
            list.sort((a, b) => a.min_order - b.min_order);
        } else if (sortBy === 'delivery_speed') {
            list.sort((a, b) => a.distance_km - b.distance_km);
        }

        return list;
    }

    function renderStoreDirectory() {
        const stores = getSortedAndFilteredStores();
        if (stores.length === 0) {
            elements.storeGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">
                    <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</p>
                    <p>No neighborhood stores found matching your search. Try another category or keyword.</p>
                </div>
            `;
            return;
        }

        elements.storeGrid.innerHTML = stores.map(s => {
            const isSelected = store.state.selectedStoreId === s.id;
            return `
                <div class="store-card ${isSelected ? 'active-selected' : ''}" data-store-id="${s.id}">
                    <div class="store-img-wrapper">
                        <img class="store-img" src="${s.image_url}" alt="${s.name}" loading="lazy" />
                        <span class="store-distance-badge">📍 ${s.distance_km} km away</span>
                        <span class="store-cat-badge">${s.category}</span>
                    </div>
                    <div class="store-card-body">
                        <div class="store-name-row">
                            <h3 class="store-name">${s.name}</h3>
                            <span class="store-rating">★ ${s.rating.toFixed(1)}</span>
                        </div>
                        <p class="store-specialty">${s.specialty}</p>
                        <div class="store-meta-footer">
                            <span>Min: ₹${s.min_order}</span>
                            <span class="pooling-tag">🔥 Pooling Active</span>
                            <span style="font-weight: 700; color: var(--primary);">Shop Now →</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        elements.storeGrid.querySelectorAll('.store-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.storeId;
                openStorefront(id);
            });
        });
    }

    // ---------------------------------------------------------
    // Storefront Catalog Rendering
    // ---------------------------------------------------------

    function openStorefront(storeId) {
        store.setSelectedStore(storeId);
        elements.storeDirectorySection.style.display = 'none';
        elements.storefrontSection.style.display = 'block';
        window.scrollTo({ top: elements.storefrontSection.offsetTop - 70, behavior: 'smooth' });
    }

    elements.btnBackToDirectory.addEventListener('click', () => {
        elements.storefrontSection.style.display = 'none';
        elements.storeDirectorySection.style.display = 'block';
        window.scrollTo({ top: elements.storeDirectorySection.offsetTop - 70, behavior: 'smooth' });
    });

    function renderStorefrontCatalog() {
        const storeId = store.state.selectedStoreId || 'greenfield';
        const currentStore = store.state.stores.find(s => s.id === storeId);
        if (!currentStore) return;

        // Render Store Header
        elements.currentStoreHeader.innerHTML = `
            <div class="storefront-info">
                <img class="storefront-avatar" src="${currentStore.image_url}" alt="${currentStore.name}" />
                <div>
                    <h2 class="storefront-title">${currentStore.name}</h2>
                    <p class="storefront-sub">${currentStore.specialty} • 📍 ${currentStore.address}</p>
                </div>
            </div>
            <div class="storefront-badges">
                <span class="badge-pill green">★ ${currentStore.rating} (${currentStore.reviews_count} reviews)</span>
                <span class="badge-pill">Min Order ₹${currentStore.min_order}</span>
                <span class="badge-pill">Delivery ₹${currentStore.delivery_fee}</span>
                <span class="badge-pill amber">⚡ BOPIS Curbside Pickup Available</span>
                <a href="https://wa.me/${currentStore.whatsapp}?text=Hello%20${encodeURIComponent(currentStore.name)},%20inquiring%20about%20your%20inventory" target="_blank" class="badge-pill green" style="text-decoration:none;">💬 WhatsApp Store</a>
            </div>
        `;

        // Render Products for this store
        const products = store.state.products.filter(p => p.store_id === storeId);
        elements.productGrid.innerHTML = products.map(p => {
            const cartItem = store.state.cart.items.find(i => i.id === p.id);
            const qty = cartItem ? cartItem.quantity : 0;
            const discountPercent = Math.round(((p.mrp - p.price) / p.mrp) * 100);

            return `
                <div class="product-card" data-product-id="${p.id}">
                    <div class="product-img-wrap">
                        <img class="product-img" src="${p.image_url}" alt="${p.name}" loading="lazy" />
                        <span class="stock-badge ${p.stock_count <= 15 ? 'low-stock' : 'in-stock'}">
                            ${p.stock_count <= 15 ? `Only ${p.stock_count} left` : 'In Stock'}
                        </span>
                        ${discountPercent > 0 ? `<span style="position:absolute; bottom:6px; right:6px; background:#ef4444; color:white; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:12px;">${discountPercent}% OFF</span>` : ''}
                    </div>
                    <div class="product-body">
                        <span class="product-pack-size">${p.pack_size}</span>
                        <h4 class="product-title">${p.name}</h4>
                        <p class="product-desc">${p.description}</p>
                        <div class="product-footer">
                            <div class="product-price-wrap">
                                <span class="price-current">₹${p.price}</span>
                                <span class="price-mrp">₹${p.mrp}</span>
                            </div>
                            <div class="action-btn-wrap">
                                ${qty === 0 ? `
                                    <button class="btn-add-cart" data-id="${p.id}">+ Add</button>
                                ` : `
                                    <div class="stepper-control">
                                        <button class="stepper-btn btn-minus" data-id="${p.id}">−</button>
                                        <span class="stepper-qty">${qty}</span>
                                        <button class="stepper-btn btn-plus" data-id="${p.id}">+</button>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Wire Add and Stepper Buttons
        elements.productGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const prod = products.find(p => p.id === btn.dataset.id);
                if (prod) store.addToCart(prod);
            });
        });

        elements.productGrid.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                store.updateCartQuantity(btn.dataset.id, -1);
            });
        });

        elements.productGrid.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                store.updateCartQuantity(btn.dataset.id, 1);
            });
        });
    }

    // ---------------------------------------------------------
    // Cart Drawer & Minimum Order Logic
    // ---------------------------------------------------------

    function openCart() {
        elements.cartOverlay.classList.add('open');
        elements.cartDrawer.classList.add('open');
    }

    function closeCart() {
        elements.cartOverlay.classList.remove('open');
        elements.cartDrawer.classList.remove('open');
    }

    elements.btnOpenCart.addEventListener('click', openCart);
    elements.btnCloseCart.addEventListener('click', closeCart);
    elements.cartOverlay.addEventListener('click', closeCart);

    // Delivery Type Toggles
    elements.btnDeliveryDoorstep.addEventListener('click', () => {
        elements.btnDeliveryDoorstep.classList.add('active');
        elements.btnDeliveryBopis.classList.remove('active');
        store.setDeliveryType('doorstep');
    });

    elements.btnDeliveryBopis.addEventListener('click', () => {
        elements.btnDeliveryBopis.classList.add('active');
        elements.btnDeliveryDoorstep.classList.remove('active');
        store.setDeliveryType('bopis');
    });

    // Date Toggles
    elements.dateTabToday.addEventListener('click', () => {
        elements.dateTabToday.classList.add('active');
        elements.dateTabTomorrow.classList.remove('active');
        store.setDeliverySlot('Today', store.state.cart.slotTime);
        store.fetchSlots('Today');
    });

    elements.dateTabTomorrow.addEventListener('click', () => {
        elements.dateTabTomorrow.classList.add('active');
        elements.dateTabToday.classList.remove('active');
        store.setDeliverySlot('Tomorrow', store.state.cart.slotTime);
        store.fetchSlots('Tomorrow');
    });

    // Apartment Pooling Selector
    elements.apartmentSelect.addEventListener('change', (e) => {
        store.setApartmentBlock(e.target.value);
    });

    // Payment Mode
    elements.payOptionCod.addEventListener('click', () => {
        elements.payOptionCod.classList.add('active');
        elements.payOptionUpi.classList.remove('active');
        store.setPaymentMethod('COD');
    });

    elements.payOptionUpi.addEventListener('click', () => {
        elements.payOptionUpi.classList.add('active');
        elements.payOptionCod.classList.remove('active');
        store.setPaymentMethod('UPI');
    });

    function renderCartUI() {
        const calcs = store.getCartCalculations();
        const cart = store.state.cart;

        // Badge count
        elements.cartBadge.textContent = calcs.itemCount;
        elements.cartBadge.style.display = calcs.itemCount > 0 ? 'flex' : 'none';

        if (cart.items.length === 0) {
            elements.cartItemsList.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                    <p style="font-size: 2.5rem; margin-bottom: 0.5rem;">🛍️</p>
                    <p style="font-weight: 700; color: var(--text-main);">Your cart is empty</p>
                    <p style="font-size: 0.85rem; margin-top: 0.25rem;">Browse local shops and add fresh goods to your basket!</p>
                </div>
            `;
            elements.minOrderAlert.style.display = 'none';
            elements.billSubtotal.textContent = '₹0';
            elements.billDeliveryFee.textContent = '₹0';
            elements.billDiscountRow.style.display = 'none';
            elements.billTotal.textContent = '₹0';
            elements.btnCheckout.disabled = true;
            elements.btnCheckout.textContent = 'Add Items to Checkout';
            return;
        }

        // Render Items List
        elements.cartItemsList.innerHTML = cart.items.map(i => `
            <div class="cart-item-row">
                <img class="cart-item-thumb" src="${i.image_url}" alt="${i.name}" />
                <div class="cart-item-info">
                    <h5 class="cart-item-title">${i.name}</h5>
                    <p class="cart-item-size">${i.pack_size}</p>
                    <p class="cart-item-price">₹${i.price * i.quantity}</p>
                </div>
                <div class="stepper-control">
                    <button class="stepper-btn cart-minus" data-id="${i.id}">−</button>
                    <span class="stepper-qty">${i.quantity}</span>
                    <button class="stepper-btn cart-plus" data-id="${i.id}">+</button>
                </div>
            </div>
        `).join('');

        elements.cartItemsList.querySelectorAll('.cart-minus').forEach(b => {
            b.addEventListener('click', () => store.updateCartQuantity(b.dataset.id, -1));
        });
        elements.cartItemsList.querySelectorAll('.cart-plus').forEach(b => {
            b.addEventListener('click', () => store.updateCartQuantity(b.dataset.id, 1));
        });

        // Minimum order validation
        elements.minOrderAlert.style.display = 'block';
        if (calcs.meetsMinOrder) {
            elements.minOrderText.innerHTML = `<span>Minimum order of ₹${calcs.minOrder} met!</span><span>🎉 Ready!</span>`;
            elements.minOrderProgress.style.width = '100%';
            elements.minOrderProgress.classList.add('complete');
        } else {
            const pct = Math.min(100, Math.round((calcs.subtotal / calcs.minOrder) * 100));
            elements.minOrderText.innerHTML = `<span>Add ₹${calcs.minOrderDelta} more for minimum order</span><span>₹${calcs.subtotal} / ₹${calcs.minOrder}</span>`;
            elements.minOrderProgress.style.width = `${pct}%`;
            elements.minOrderProgress.classList.remove('complete');
        }

        // Bill Breakdown
        elements.billSubtotal.textContent = `₹${calcs.subtotal}`;
        elements.billDeliveryFee.textContent = calcs.isBopis ? 'FREE (Pickup)' : `₹${calcs.baseDeliveryFee}`;

        if (calcs.poolingDiscount > 0) {
            elements.billDiscountRow.style.display = 'flex';
            elements.billDiscount.textContent = `-₹${calcs.poolingDiscount}`;
            elements.poolingAlertBadge.style.display = 'block';
            elements.poolingAlertBadge.textContent = `🤝 Neighborhood Pooling Active in ${cart.apartmentBlock.split('(')[0]}: ₹${calcs.poolingDiscount} Discount applied!`;
        } else {
            elements.billDiscountRow.style.display = 'none';
            elements.poolingAlertBadge.style.display = 'none';
        }

        elements.billTotal.textContent = `₹${calcs.total}`;

        // Checkout Button state
        if (!calcs.meetsMinOrder) {
            elements.btnCheckout.disabled = true;
            elements.btnCheckout.textContent = `Add ₹${calcs.minOrderDelta} more to checkout`;
        } else {
            elements.btnCheckout.disabled = false;
            elements.btnCheckout.textContent = cart.paymentMethod === 'UPI' ? `Pay ₹${calcs.total} via UPI QR →` : `Place Order with COD (₹${calcs.total}) →`;
        }
    }

    // ---------------------------------------------------------
    // Delivery Slot Picker with Real-Time Capacity Engine
    // ---------------------------------------------------------

    function renderSlotPicker() {
        const slots = store.state.slots;
        if (!slots || slots.length === 0) {
            elements.slotGrid.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); padding:0.5rem;">Loading delivery slots...</div>`;
            return;
        }

        elements.slotGrid.innerHTML = slots.map(s => {
            const isSelected = store.state.cart.slotTime === s.time_window;
            const isFull = s.booked_count >= s.max_capacity;
            const remaining = Math.max(0, s.max_capacity - s.booked_count);

            let capBadge = '';
            if (isFull) {
                capBadge = `<span class="slot-capacity-pill full">FULL (5/5 Booked)</span>`;
            } else if (remaining === 1) {
                capBadge = `<span class="slot-capacity-pill urgent">🔥 1 slot left!</span>`;
            } else {
                capBadge = `<span class="slot-capacity-pill available">${remaining} slots open</span>`;
            }

            return `
                <div class="slot-card ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}" data-window="${s.time_window}" data-full="${isFull}">
                    <span class="slot-time">⏰ ${s.time_window}</span>
                    ${capBadge}
                </div>
            `;
        }).join('');

        elements.slotGrid.querySelectorAll('.slot-card').forEach(card => {
            card.addEventListener('click', () => {
                if (card.dataset.full === 'true') {
                    alert('This delivery slot has reached its maximum capacity of 5 orders. Please choose another window.');
                    return;
                }
                const tw = card.dataset.window;
                store.setDeliverySlot(store.state.cart.slotDate, tw);
            });
        });
    }

    // ---------------------------------------------------------
    // Order Placement & UPI Simulation
    // ---------------------------------------------------------

    elements.btnCheckout.addEventListener('click', async () => {
        const cart = store.state.cart;
        const calcs = store.getCartCalculations();
        if (!calcs.meetsMinOrder) return;

        if (cart.paymentMethod === 'UPI') {
            openUpiModal(calcs.total);
        } else {
            // Confirm Cash on Delivery
            const result = await store.placeOrder();
            if (result.success) {
                closeCart();
                openCustomerTracker(result.order.id);
            }
        }
    });

    function openUpiModal(totalAmount) {
        elements.upiAmountDisplay.textContent = `₹${totalAmount}`;
        const storeObj = store.state.stores.find(s => s.id === store.state.cart.storeId);
        elements.upiVpaDisplay.textContent = storeObj ? storeObj.upi_vpa : 'cartcanvas@upi';

        elements.upiModalBackdrop.classList.add('open');

        let secondsLeft = 180;
        if (activeUpiTimer) clearInterval(activeUpiTimer);
        activeUpiTimer = setInterval(() => {
            secondsLeft--;
            const mins = Math.floor(secondsLeft / 60);
            const secs = secondsLeft % 60;
            elements.upiCountdown.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            if (secondsLeft <= 0) {
                clearInterval(activeUpiTimer);
                closeUpiModal();
                alert('UPI payment window expired. Please try again.');
            }
        }, 1000);
    }

    function closeUpiModal() {
        if (activeUpiTimer) clearInterval(activeUpiTimer);
        elements.upiModalBackdrop.classList.remove('open');
    }

    elements.btnCloseUpiModal.addEventListener('click', closeUpiModal);

    elements.btnSimulateUpiPay.addEventListener('click', async () => {
        elements.btnSimulateUpiPay.disabled = true;
        elements.btnSimulateUpiPay.textContent = 'Verifying UPI Payment...';

        setTimeout(async () => {
            closeUpiModal();
            elements.btnSimulateUpiPay.disabled = false;
            elements.btnSimulateUpiPay.textContent = 'Simulate Instant Payment Checkmark ✓';

            const result = await store.placeOrder();
            if (result.success) {
                closeCart();
                openCustomerTracker(result.order.id);
            }
        }, 800);
    });

    // ---------------------------------------------------------
    // Customer Live Order Tracker (Milestone Timeline & Map)
    // ---------------------------------------------------------

    function openCustomerTracker(orderId) {
        store.state.activeTrackingOrderId = orderId;
        renderCustomerLiveTracker();
        elements.orderTrackerSection.style.display = 'block';
        window.scrollTo({ top: elements.orderTrackerSection.offsetTop - 70, behavior: 'smooth' });
    }

    elements.btnDismissTracker.addEventListener('click', () => {
        elements.orderTrackerSection.style.display = 'none';
    });

    function renderCustomerLiveTracker() {
        const orderId = store.state.activeTrackingOrderId;
        if (!orderId) {
            elements.orderTrackerSection.style.display = 'none';
            return;
        }

        const order = store.state.orders.find(o => o.id === orderId);
        if (!order) return;

        elements.orderTrackerSection.style.display = 'block';
        elements.trackerOrderId.textContent = `#${order.id}`;
        const storeObj = store.state.stores.find(s => s.id === order.store_id);
        elements.trackerStoreName.textContent = storeObj ? storeObj.name : 'LocalMart Store';
        elements.trackerStatusBadge.textContent = order.status;
        elements.trackerSlotTime.textContent = `${order.slot_date} ${order.slot_time}`;

        // Milestone progression: Received -> Accepted -> Packed -> Out for Delivery -> Delivered
        const steps = ['Received', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered'];
        const currentIdx = steps.indexOf(order.status);

        const nodes = [
            elements.stepReceived,
            elements.stepAccepted,
            elements.stepPacked,
            elements.stepDispatch,
            elements.stepDelivered
        ];

        nodes.forEach((node, i) => {
            node.classList.remove('active', 'completed');
            if (i < currentIdx) {
                node.classList.add('completed');
            } else if (i === currentIdx) {
                node.classList.add('active');
            }
        });

        // Progress bar width
        const pct = (Math.max(0, currentIdx) / (steps.length - 1)) * 100;
        elements.trackerMilestoneBar.style.width = `${pct}%`;

        // Rider card details
        if (order.delivery_boy_name) {
            elements.riderInfoCard.style.display = 'flex';
            elements.riderName.textContent = order.delivery_boy_name;
            elements.riderVehicle.textContent = order.delivery_boy_vehicle || 'Delivery Partner';
            elements.btnCallRider.href = `tel:${order.delivery_boy_phone || '+919876543210'}`;
        } else {
            elements.riderInfoCard.style.display = 'none';
        }

        // WhatsApp structured ping
        const whatsappMsg = `🛒 *CartCanvas Order Confirmation*\n` +
            `Order ID: #${order.id}\n` +
            `Store: ${storeObj ? storeObj.name : 'LocalMart'}\n` +
            `Customer: ${order.customer_name}\n` +
            `Address: ${order.address}\n` +
            `Slot: ${order.slot_date} ${order.slot_time}\n` +
            `Total: ₹${order.total_amount} (${order.payment_method})\n` +
            `Items: ${order.items ? order.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'Order items'}`;

        const shopPhone = storeObj ? storeObj.whatsapp : '919845012345';
        elements.btnWhatsappPing.href = `https://wa.me/${shopPhone}?text=${encodeURIComponent(whatsappMsg)}`;

        // Items breakdown
        elements.trackerItemsSummary.innerHTML = (order.items || []).map(i => `
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:0.35rem 0; border-bottom:1px solid #f1f5f9;">
                <span>${i.name} × ${i.quantity}</span>
                <span style="font-weight:700;">₹${i.price * i.quantity}</span>
            </div>
        `).join('') + `
            <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; padding-top:0.5rem; margin-top:0.25rem;">
                <span>Total (${order.payment_method})</span>
                <span>₹${order.total_amount}</span>
            </div>
        `;

        // Animate Simulated Map
        drawSimulatedDeliveryMap(order.status);
    }

    function drawSimulatedDeliveryMap(status) {
        const canvas = elements.mapCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = (canvas.width = canvas.offsetWidth || 500);
        const h = (canvas.height = canvas.offsetHeight || 180);

        if (mapAnimationFrame) cancelAnimationFrame(mapAnimationFrame);

        let t = 0;
        let progressTarget = 0.1;
        if (status === 'Accepted') progressTarget = 0.25;
        if (status === 'Packed') progressTarget = 0.45;
        if (status === 'Out for Delivery') progressTarget = 0.75;
        if (status === 'Delivered') progressTarget = 1.0;

        function renderFrame() {
            ctx.clearRect(0, 0, w, h);

            // Draw Map Background Grid & Roads
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, w, h);

            // Subtle road network
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Main Route from Store (left) to Home (right)
            ctx.beginPath();
            ctx.moveTo(50, h * 0.7);
            ctx.lineTo(w * 0.35, h * 0.7);
            ctx.lineTo(w * 0.6, h * 0.3);
            ctx.lineTo(w - 50, h * 0.3);
            ctx.stroke();

            // Active path line
            ctx.strokeStyle = '#0f766e';
            ctx.lineWidth = 4;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(50, h * 0.7);
            ctx.lineTo(w * 0.35, h * 0.7);
            ctx.lineTo(w * 0.6, h * 0.3);
            ctx.lineTo(w - 50, h * 0.3);
            ctx.stroke();
            ctx.setLineDash([]);

            // Store Pin
            ctx.fillStyle = '#0f766e';
            ctx.beginPath();
            ctx.arc(50, h * 0.7, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.fillText('🏪', 43, h * 0.7 + 4);

            // Home Pin
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.arc(w - 50, h * 0.3, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText('🏠', w - 57, h * 0.3 + 4);

            // Calculate Scooter position along path
            let currentX = 50 + (w - 100) * progressTarget;
            let currentY = h * 0.7 - ((h * 0.7 - h * 0.3) * progressTarget);

            // Pulsing wave around delivery boy
            t += 0.05;
            const waveRadius = 14 + Math.sin(t) * 4;
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(currentX, currentY, waveRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Scooter Icon
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(currentX, currentY, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px sans-serif';
            ctx.fillText('🛵', currentX - 7, currentY + 4);

            mapAnimationFrame = requestAnimationFrame(renderFrame);
        }

        renderFrame();
    }

    // ---------------------------------------------------------
    // Merchant Order Management Cockpit
    // ---------------------------------------------------------

    elements.merchantStoreSelect.addEventListener('change', (e) => {
        store.setMerchantStore(e.target.value);
    });

    elements.btnTestAudioChime.addEventListener('click', () => {
        soundFx.playOrderChime();
    });

    elements.btnToggleSound.addEventListener('click', () => {
        const isMuted = soundFx.toggleMute();
        elements.btnToggleSound.textContent = isMuted ? '🔇 Sound: Off' : '🔊 Sound: On';
    });

    function renderMerchantCockpit() {
        const merchantStoreId = store.state.merchantStoreId || 'greenfield';
        elements.merchantStoreSelect.value = merchantStoreId;

        // Filter orders for this merchant
        const storeOrders = store.state.orders.filter(o => o.store_id === merchantStoreId);

        // Calculate stat counters
        const newCount = storeOrders.filter(o => o.status === 'Received').length;
        const acceptedCount = storeOrders.filter(o => o.status === 'Accepted').length;
        const packedCount = storeOrders.filter(o => o.status === 'Packed').length;
        const dispatchedCount = storeOrders.filter(o => o.status === 'Out for Delivery').length;

        elements.merchantStatNew.textContent = newCount;
        elements.merchantStatAccepted.textContent = acceptedCount;
        elements.merchantStatPacked.textContent = packedCount;
        elements.merchantStatDispatched.textContent = dispatchedCount;

        if (storeOrders.length === 0) {
            elements.merchantOrdersList.innerHTML = `
                <div style="text-align:center; padding: 2.5rem; color: var(--text-muted); background:white; border-radius:var(--radius-lg); border:1px solid var(--border-subtle);">
                    <p style="font-size:2rem; margin-bottom:0.5rem;">📦</p>
                    <p style="font-weight:700;">No orders for this shop yet</p>
                    <p style="font-size:0.85rem;">Incoming customer orders will appear here in real time with audio chime alert.</p>
                </div>
            `;
            return;
        }

        elements.merchantOrdersList.innerHTML = storeOrders.map(o => {
            const isNew = o.status === 'Received';
            const isBopis = o.delivery_type === 'bopis';

            return `
                <div class="merchant-order-card ${isNew ? 'new-order' : ''}" data-order-id="${o.id}">
                    <div class="order-top-row">
                        <div>
                            <span class="order-id-tag">#${o.id}</span>
                            <span style="font-size:0.8rem; color:var(--text-muted); margin-left:0.5rem;">🕒 ${o.created_at}</span>
                        </div>
                        <div style="display:flex; gap:0.4rem; align-items:center;">
                            <span class="order-slot-badge">⏰ ${o.slot_date} ${o.slot_time}</span>
                            <span class="badge-pill ${isBopis ? 'amber' : 'green'}">${isBopis ? '🏬 Curbside Pickup' : '🚀 Doorstep Delivery'}</span>
                            <span class="badge-pill">${o.payment_method} (₹${o.total_amount})</span>
                        </div>
                    </div>

                    <div class="order-cust-details">
                        <div class="cust-name">👤 ${o.customer_name} &bull; <a href="tel:${o.customer_phone}" style="color:var(--primary); font-weight:700;">${o.customer_phone}</a></div>
                        <div class="cust-address">📍 ${o.address} &bull; 🏢 ${o.apartment_block}</div>
                    </div>

                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Item SKU</th>
                                <th>Pack Size</th>
                                <th style="text-align:center;">Qty</th>
                                <th style="text-align:right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(o.items || []).map(i => `
                                <tr>
                                    <td><strong>${i.name}</strong></td>
                                    <td>${i.pack_size || '-'}</td>
                                    <td style="text-align:center;"><strong>${i.quantity}</strong></td>
                                    <td style="text-align:right;">₹${i.price * i.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:700;">
                        <span>Current Status: <span style="color:var(--primary);">${o.status}</span></span>
                        <span>Total: ₹${o.total_amount}</span>
                    </div>

                    <!-- Large Touch-Friendly Merchant Action Buttons -->
                    <div class="merchant-actions-row">
                        ${o.status === 'Received' ? `
                            <button class="btn-merchant-action btn-accept" data-id="${o.id}">
                                ✅ Accept Order
                            </button>
                        ` : ''}

                        ${o.status === 'Accepted' ? `
                            <button class="btn-merchant-action btn-pack" data-id="${o.id}">
                                📦 Mark Packed
                            </button>
                        ` : ''}

                        ${o.status === 'Packed' ? `
                            <button class="btn-merchant-action btn-dispatch" data-id="${o.id}">
                                🛵 Assign Delivery Boy
                            </button>
                        ` : ''}

                        ${o.status === 'Out for Delivery' ? `
                            <button class="btn-merchant-action btn-delivered" data-id="${o.id}">
                                🏁 Mark Delivered
                            </button>
                        ` : ''}

                        ${o.status === 'Delivered' ? `
                            <span style="display:flex; align-items:center; gap:0.35rem; color:var(--success); font-weight:800; font-size:0.95rem; margin:0.5rem auto;">
                                ✓ Order Successfully Delivered
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Wire Action Buttons
        elements.merchantOrdersList.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', () => {
                store.updateOrderStatus(btn.dataset.id, 'Accepted');
            });
        });

        elements.merchantOrdersList.querySelectorAll('.btn-pack').forEach(btn => {
            btn.addEventListener('click', () => {
                store.updateOrderStatus(btn.dataset.id, 'Packed');
            });
        });

        elements.merchantOrdersList.querySelectorAll('.btn-dispatch').forEach(btn => {
            btn.addEventListener('click', () => {
                // Assign delivery boy and set status Out for Delivery
                store.assignDeliveryPartner(btn.dataset.id, {
                    delivery_boy_name: 'Ramesh Kumar',
                    delivery_boy_phone: '+91 98765 43210',
                    delivery_boy_vehicle: 'Honda Activa (KA-03-EB-4120)'
                });
            });
        });

        elements.merchantOrdersList.querySelectorAll('.btn-delivered').forEach(btn => {
            btn.addEventListener('click', () => {
                store.updateOrderStatus(btn.dataset.id, 'Delivered');
            });
        });
    }

    // ---------------------------------------------------------
    // 1-Click Guided Demo Flow
    // ---------------------------------------------------------
    /*
     * The prompt demo flow:
     * "A user selects 'Greenfield Groceries', adds organic oats and fresh sourdough to their cart,
     * and proceeds to checkout. The user selects the 'Tomorrow 8:00 AM - 10:00 AM' delivery slot and confirms COD.
     * The demonstrator opens the Merchant Dashboard in a split window to see the order pop up instantly,
     * clicks 'Accept' and 'Mark Packed', which immediately updates the customer's live tracking timeline."
     */

    elements.btnDemoFlow.addEventListener('click', async () => {
        elements.btnDemoFlow.textContent = '⏳ Running Demo...';
        elements.btnDemoFlow.disabled = true;

        // Step 1: Select Greenfield Groceries
        openStorefront('greenfield');
        store.clearCart();

        // Step 2: Find Organic Oats and Fresh Sourdough Bread
        const oats = store.state.products.find(p => p.store_id === 'greenfield' && p.name.includes('Rolled Oats'));
        const sourdough = store.state.products.find(p => p.store_id === 'greenfield' && p.name.includes('Sourdough Bread'));

        if (oats) store.addToCart(oats);
        if (sourdough) store.addToCart(sourdough);

        // Step 3: Configure slot: Tomorrow 8:00 AM - 10:00 AM & COD
        store.setDeliveryType('doorstep');
        store.setDeliverySlot('Tomorrow', '08:00 AM - 10:00 AM');
        store.setPaymentMethod('COD');
        store.setApartmentBlock('Palm Grove Residency (Tower B)');

        // Open cart briefly to visually show items
        openCart();

        setTimeout(async () => {
            // Step 4: Checkout
            const result = await store.placeOrder({
                customerName: 'Priya Sharma (Demo)',
                customerPhone: '+91 98765 12345',
                address: 'Flat 402, Tower B, Palm Grove Residency'
            });

            closeCart();

            if (result.success) {
                // Step 5: Switch to Split Screen Mode so Customer and Merchant are visible side-by-side
                setView('split');
                store.setMerchantStore('greenfield');
                openCustomerTracker(result.order.id);

                alert(`🎉 Demo Order #${result.order.id} placed!\nNow viewing Split Screen Mode.\n\nNotice on the Right Pane (Merchant Cockpit):\nClick the large green 'Accept Order' and 'Mark Packed' buttons and watch the Left Pane (Customer Tracker) update instantly in real time!`);
            }

            elements.btnDemoFlow.textContent = '🚀 Run Demo Flow';
            elements.btnDemoFlow.disabled = false;
        }, 1200);
    });

    elements.btnResetDemo.addEventListener('click', async () => {
        if (confirm('Reset demo database to fresh initial state?')) {
            await store.resetDemoData();
            alert('Database and slots reset successfully!');
        }
    });
});
