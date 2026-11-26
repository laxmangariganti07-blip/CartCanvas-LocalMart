/**
 * CartCanvas: LocalMart Linkup - State & Sync Management
 * Hybrid REST API + LocalStorage + BroadcastChannel for real-time split-screen and multi-tab sync.
 */

const SYNC_CHANNEL_NAME = 'cartcanvas_localmart_sync';
const LOCAL_STORAGE_KEY = 'cartcanvas_state_v1';

class AppStore {
    constructor() {
        this.apiBase = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8000';
        this.broadcastChannel = null;
        if ('BroadcastChannel' in window) {
            this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
            this.broadcastChannel.onmessage = (event) => this.handleBroadcastMessage(event.data);
        }

        window.addEventListener('storage', (e) => {
            if (e.key === LOCAL_STORAGE_KEY) {
                this.loadFromStorage();
                this.notifySubscribers('STORAGE_SYNC', this.state);
            }
        });

        this.subscribers = [];
        this.pollInterval = null;

        this.state = {
            stores: [],
            selectedStoreId: 'greenfield',
            products: [],
            activeCategory: 'All',
            searchQuery: '',
            sortBy: 'distance', // distance, rating, delivery_speed, min_order
            
            // Cart state
            cart: {
                storeId: null,
                items: [], // [{ id, name, price, pack_size, quantity, image_url }]
                deliveryType: 'doorstep', // 'doorstep' or 'bopis'
                slotDate: 'Tomorrow',
                slotTime: '08:00 AM - 10:00 AM',
                apartmentBlock: 'Palm Grove Residency (Tower B)',
                address: 'Flat 402, Tower B, Palm Grove Residency, Indiranagar',
                customerName: 'Priya Sharma',
                customerPhone: '+91 98765 12345',
                paymentMethod: 'COD', // 'COD' or 'UPI'
                isUpiPaid: false
            },

            // Delivery slots
            slots: [],

            // Order management
            orders: [],
            activeTrackingOrderId: null,

            // Merchant Cockpit View
            merchantStoreId: 'greenfield',
            merchantFilterStatus: 'All',

            // Global UI mode
            viewMode: 'customer' // 'customer', 'merchant', 'split'
        };

        this.init();
    }

    async init() {
        // First try to load cached state from localStorage
        this.loadFromStorage();
        // Fetch from API (or fall back to seed data if server is down)
        await this.fetchInitialData();
        // Start polling for real-time live sync
        this.startLiveSyncPolling();
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        // Initial call
        callback('INIT', this.state);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    notifySubscribers(eventType, payload) {
        this.saveToStorage();
        this.subscribers.forEach(cb => {
            try {
                cb(eventType, payload || this.state);
            } catch (err) {
                console.error('Subscriber error:', err);
            }
        });
    }

    broadcast(type, payload) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
        }
    }

    handleBroadcastMessage(msg) {
        if (!msg || !msg.type) return;
        // Reload fresh orders or slots
        if (msg.type === 'ORDER_CREATED') {
            this.state.orders.unshift(msg.payload);
            // Refresh slots if affected
            this.fetchSlots(this.state.cart.slotDate);
            this.notifySubscribers('ORDER_CREATED', msg.payload);
        } else if (msg.type === 'ORDER_STATUS_UPDATED') {
            const index = this.state.orders.findIndex(o => o.id === msg.payload.id);
            if (index !== -1) {
                this.state.orders[index] = { ...this.state.orders[index], ...msg.payload };
            }
            this.notifySubscribers('ORDER_STATUS_UPDATED', msg.payload);
        } else if (msg.type === 'STATE_RESET') {
            this.fetchInitialData();
            this.notifySubscribers('STATE_RESET', null);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                cart: this.state.cart,
                activeTrackingOrderId: this.state.activeTrackingOrderId,
                merchantStoreId: this.state.merchantStoreId,
                selectedStoreId: this.state.selectedStoreId,
                viewMode: this.state.viewMode,
                orders: this.state.orders,
                slots: this.state.slots
            }));
        } catch (e) {
            console.warn('LocalStorage save failed:', e);
        }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.cart) this.state.cart = { ...this.state.cart, ...parsed.cart };
                if (parsed.activeTrackingOrderId) this.state.activeTrackingOrderId = parsed.activeTrackingOrderId;
                if (parsed.merchantStoreId) this.state.merchantStoreId = parsed.merchantStoreId;
                if (parsed.selectedStoreId) this.state.selectedStoreId = parsed.selectedStoreId;
                if (parsed.viewMode) this.state.viewMode = parsed.viewMode;
                if (parsed.orders && Array.isArray(parsed.orders) && parsed.orders.length > 0) {
                    this.state.orders = parsed.orders;
                }
                if (parsed.slots && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
                    this.state.slots = parsed.slots;
                }
            }
        } catch (e) {
            console.warn('LocalStorage load failed:', e);
        }
    }

    async fetchInitialData() {
        // First initialize from embedded seed data for immediate zero-latency readiness
        if (window.SEED_STORES && this.state.stores.length === 0) {
            this.state.stores = [...window.SEED_STORES];
        }
        if (window.SEED_PRODUCTS && this.state.products.length === 0) {
            this.state.products = [...window.SEED_PRODUCTS];
        }
        if (this.state.slots.length === 0 && window.generateDefaultSlots) {
            this.state.slots = window.generateDefaultSlots(this.state.selectedStoreId || 'greenfield', this.state.cart.slotDate);
        }

        try {
            const [storesRes, productsRes, ordersRes] = await Promise.all([
                fetch(`${this.apiBase}/api/stores`).then(r => r.json()).catch(() => null),
                fetch(`${this.apiBase}/api/products`).then(r => r.json()).catch(() => null),
                fetch(`${this.apiBase}/api/orders`).then(r => r.json()).catch(() => null)
            ]);

            if (storesRes && storesRes.stores && storesRes.stores.length > 0) {
                this.state.stores = storesRes.stores;
            }
            if (productsRes && productsRes.products && productsRes.products.length > 0) {
                this.state.products = productsRes.products;
            }
            if (ordersRes && ordersRes.orders && ordersRes.orders.length > 0) {
                this.state.orders = ordersRes.orders;
            }

            await this.fetchSlots(this.state.cart.slotDate);
        } catch (err) {
            console.warn('API fetch failed, utilizing embedded local store', err);
        }

        this.notifySubscribers('DATA_LOADED', this.state);
    }

    async fetchSlots(date = 'Tomorrow') {
        const storeId = this.state.selectedStoreId || 'greenfield';
        try {
            const res = await fetch(`${this.apiBase}/api/slots?store_id=${storeId}&date=${date}`);
            const data = await res.json();
            if (data.slots && data.slots.length > 0) {
                this.state.slots = data.slots;
                this.notifySubscribers('SLOTS_LOADED', this.state.slots);
                return;
            }
        } catch (err) {
            // Local fallback
        }

        if (window.generateDefaultSlots) {
            this.state.slots = window.generateDefaultSlots(storeId, date);
            this.notifySubscribers('SLOTS_LOADED', this.state.slots);
        }
    }

    startLiveSyncPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`${this.apiBase}/api/orders`);
                const data = await res.json();
                if (data && data.orders) {
                    const prevCount = this.state.orders.length;
                    const prevJson = JSON.stringify(this.state.orders);
                    const newJson = JSON.stringify(data.orders);

                    if (prevJson !== newJson) {
                        this.state.orders = data.orders;
                        this.notifySubscribers('ORDERS_UPDATED', this.state.orders);
                    }
                }
            } catch (e) {
                // Ignore transient network hiccups
            }
        }, 2500);
    }

    // --- Actions ---

    setViewMode(mode) {
        this.state.viewMode = mode;
        this.notifySubscribers('VIEW_MODE_CHANGED', mode);
    }

    setSelectedStore(storeId) {
        this.state.selectedStoreId = storeId;
        this.fetchSlots(this.state.cart.slotDate);
        this.notifySubscribers('STORE_SELECTED', storeId);
    }

    setMerchantStore(storeId) {
        this.state.merchantStoreId = storeId;
        this.notifySubscribers('MERCHANT_STORE_CHANGED', storeId);
    }

    setCategory(category) {
        this.state.activeCategory = category;
        this.notifySubscribers('CATEGORY_CHANGED', category);
    }

    setSearchQuery(query) {
        this.state.searchQuery = query;
        this.notifySubscribers('SEARCH_CHANGED', query);
    }

    setSortBy(sortKey) {
        this.state.sortBy = sortKey;
        this.notifySubscribers('SORT_CHANGED', sortKey);
    }

    // --- Cart Management ---

    addToCart(product) {
        // If cart has items from a different store, ask or switch
        if (this.state.cart.items.length > 0 && this.state.cart.storeId !== product.store_id) {
            const prevStore = this.state.stores.find(s => s.id === this.state.cart.storeId)?.name || 'another shop';
            const proceed = confirm(`Your cart currently has items from ${prevStore}. Reset cart to add items from this shop?`);
            if (!proceed) return false;
            this.clearCart();
        }

        this.state.cart.storeId = product.store_id;
        const existing = this.state.cart.items.find(i => i.id === product.id);

        if (existing) {
            existing.quantity += 1;
        } else {
            this.state.cart.items.push({
                id: product.id,
                store_id: product.store_id,
                name: product.name,
                pack_size: product.pack_size,
                price: product.price,
                image_url: product.image_url,
                quantity: 1
            });
        }

        if (window.soundFx) window.soundFx.playClick();
        this.notifySubscribers('CART_UPDATED', this.state.cart);
        return true;
    }

    updateCartQuantity(productId, delta) {
        const item = this.state.cart.items.find(i => i.id === productId);
        if (!item) return;

        item.quantity += delta;
        if (item.quantity <= 0) {
            this.state.cart.items = this.state.cart.items.filter(i => i.id !== productId);
        }

        if (this.state.cart.items.length === 0) {
            this.state.cart.storeId = null;
        }

        if (window.soundFx) window.soundFx.playClick();
        this.notifySubscribers('CART_UPDATED', this.state.cart);
    }

    clearCart() {
        this.state.cart.items = [];
        this.state.cart.storeId = null;
        this.notifySubscribers('CART_UPDATED', this.state.cart);
    }

    setDeliveryType(type) {
        this.state.cart.deliveryType = type; // 'doorstep' or 'bopis'
        this.notifySubscribers('CART_UPDATED', this.state.cart);
    }

    setDeliverySlot(date, timeWindow) {
        this.state.cart.slotDate = date;
        this.state.cart.slotTime = timeWindow;
        this.notifySubscribers('CART_UPDATED', this.state.cart);
    }

    setApartmentBlock(block) {
        this.state.cart.apartmentBlock = block;
        this.notifySubscribers('CART_UPDATED', this.state.cart);
    }

    setPaymentMethod(method) {
        this.state.cart.paymentMethod = method;
        this.notifySubscribers('CART_UPDATED', this.state.cart);
    }

    getCartCalculations() {
        const store = this.state.stores.find(s => s.id === this.state.cart.storeId) || {
            min_order: 150,
            delivery_fee: 30
        };

        const subtotal = this.state.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const minOrder = store.min_order;
        const meetsMinOrder = subtotal >= minOrder;
        const minOrderDelta = Math.max(0, minOrder - subtotal);

        // BOPIS curbside pickup eliminates delivery fee
        const isBopis = this.state.cart.deliveryType === 'bopis';
        const baseDeliveryFee = isBopis ? 0 : store.delivery_fee;

        // Neighborhood pooling discount:
        // Discount ₹30 if resident apartment block has pooling in that slot
        const isPoolingEligible = !isBopis && (
            this.state.cart.apartmentBlock.includes('Palm Grove') ||
            this.state.cart.apartmentBlock.includes('Green Valley') ||
            this.state.cart.apartmentBlock.includes('Sunrise')
        );
        const poolingDiscount = isPoolingEligible ? Math.min(baseDeliveryFee, 30) : 0;
        const deliveryFee = Math.max(0, baseDeliveryFee - poolingDiscount);

        const total = subtotal + deliveryFee;

        return {
            subtotal,
            minOrder,
            meetsMinOrder,
            minOrderDelta,
            isBopis,
            baseDeliveryFee,
            isPoolingEligible,
            poolingDiscount,
            deliveryFee,
            total,
            itemCount: this.state.cart.items.reduce((sum, item) => sum + item.quantity, 0)
        };
    }

    // --- Order Checkout ---

    async placeOrder(orderDetails = {}) {
        const calcs = this.getCartCalculations();
        if (!calcs.meetsMinOrder) {
            alert(`Minimum order value for this store is ₹${calcs.minOrder}. Please add ₹${calcs.minOrderDelta} more.`);
            return { success: false, error: 'Minimum order amount not met' };
        }

        const payload = {
            store_id: this.state.cart.storeId,
            customer_name: orderDetails.customerName || this.state.cart.customerName,
            customer_phone: orderDetails.customerPhone || this.state.cart.customerPhone,
            apartment_block: this.state.cart.apartmentBlock,
            address: orderDetails.address || this.state.cart.address,
            delivery_type: this.state.cart.deliveryType,
            slot_date: this.state.cart.slotDate,
            slot_time: this.state.cart.slotTime,
            payment_method: this.state.cart.paymentMethod,
            subtotal: calcs.subtotal,
            delivery_fee: calcs.deliveryFee,
            pooling_discount: calcs.poolingDiscount,
            total_amount: calcs.total,
            items: this.state.cart.items
        };

        try {
            const res = await fetch(`${this.apiBase}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                alert(data.error || 'Failed to place order');
                return { success: false, error: data.error };
            }

            const createdOrder = data.order;
            this.state.orders.unshift(createdOrder);
            this.state.activeTrackingOrderId = createdOrder.id;

            // Clear cart
            this.clearCart();

            // Broadcast to other windows / tabs
            this.broadcast('ORDER_CREATED', createdOrder);

            // Play incoming order chime on merchant side if listening
            if (window.soundFx) window.soundFx.playOrderChime();

            // Refresh slots
            await this.fetchSlots(payload.slot_date);

            this.notifySubscribers('ORDER_PLACED', createdOrder);
            return { success: true, order: createdOrder };
        } catch (err) {
            console.error('Order placement API failed:', err);
            // Local fallback order generation
            const fallbackId = `CC-${Math.floor(1000 + Math.random() * 9000)}`;
            const localOrder = {
                id: fallbackId,
                ...payload,
                status: 'Received',
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };

            // Deplete slot locally if doorstep delivery
            if (payload.delivery_type === 'doorstep') {
                const slot = this.state.slots.find(s => s.time_window === payload.slot_time && s.date === payload.slot_date);
                if (slot) {
                    slot.booked_count = Math.min(slot.max_capacity, slot.booked_count + 1);
                    slot.is_full = slot.booked_count >= slot.max_capacity;
                    slot.remaining_capacity = Math.max(0, slot.max_capacity - slot.booked_count);
                }
            }

            this.state.orders.unshift(localOrder);
            this.state.activeTrackingOrderId = localOrder.id;
            this.clearCart();
            if (window.soundFx) window.soundFx.playOrderChime();
            this.broadcast('ORDER_CREATED', localOrder);
            this.notifySubscribers('ORDER_PLACED', localOrder);
            return { success: true, order: localOrder };
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const res = await fetch(`${this.apiBase}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success && data.order) {
                const idx = this.state.orders.findIndex(o => o.id === orderId);
                if (idx !== -1) {
                    this.state.orders[idx] = data.order;
                }
                this.broadcast('ORDER_STATUS_UPDATED', data.order);
                if (window.soundFx) window.soundFx.playStatusChime();
                this.notifySubscribers('ORDER_STATUS_UPDATED', data.order);
                return data.order;
            }
        } catch (err) {
            console.warn('Status update API error, falling back locally', err);
            const ord = this.state.orders.find(o => o.id === orderId);
            if (ord) {
                ord.status = newStatus;
                ord.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
                if (newStatus === 'Out for Delivery' && !ord.delivery_boy_name) {
                    ord.delivery_boy_name = 'Ramesh Kumar';
                    ord.delivery_boy_phone = '+91 98765 43210';
                    ord.delivery_boy_vehicle = 'Honda Activa (KA-03-EB-4120)';
                }
                this.broadcast('ORDER_STATUS_UPDATED', ord);
                if (window.soundFx) window.soundFx.playStatusChime();
                this.notifySubscribers('ORDER_STATUS_UPDATED', ord);
                return ord;
            }
        }
        return null;
    }

    async assignDeliveryPartner(orderId, partnerDetails) {
        try {
            const res = await fetch(`${this.apiBase}/api/orders/${orderId}/assign-delivery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(partnerDetails)
            });
            const data = await res.json();
            if (data.success && data.order) {
                const idx = this.state.orders.findIndex(o => o.id === orderId);
                if (idx !== -1) {
                    this.state.orders[idx] = data.order;
                }
                this.broadcast('ORDER_STATUS_UPDATED', data.order);
                if (window.soundFx) window.soundFx.playStatusChime();
                this.notifySubscribers('ORDER_STATUS_UPDATED', data.order);
                return data.order;
            }
        } catch (e) {
            console.warn('Assign delivery fallback', e);
        }
    }

    async resetDemoData() {
        try {
            await fetch(`${this.apiBase}/api/reset`, { method: 'POST' });
        } catch (e) {}
        this.clearCart();
        this.state.activeTrackingOrderId = null;
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        this.broadcast('STATE_RESET', null);
        await this.fetchInitialData();
        this.notifySubscribers('STATE_RESET', null);
    }
}

window.appStore = new AppStore();
