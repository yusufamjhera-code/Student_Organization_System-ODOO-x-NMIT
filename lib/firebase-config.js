// File: lib/firebase-config.js
// Universal Client-Side Firebase Adapter & Demonstration Mock Store
// Designed to run seamlessly in both offline/GitHub Pages demo and live environments.

(function () {
    // 1. Safe Client Configuration
    const firebaseConfig = {
        apiKey: "AIzaSyDemoKeyPasstrackForDemonstrationOnly",
        authDomain: "passtrack-odoo-nmit.firebaseapp.com",
        projectId: "passtrack-odoo-nmit",
        storageBucket: "passtrack-odoo-nmit.appspot.com",
        messagingSenderId: "100000000000",
        appId: "1:100000000000:web:demopasstracktoken",
        measurementId: "G-DEMOPASSTRACK"
    };

    window.firebaseConfig = firebaseConfig;
    window.GOOGLE_SCRIPT_URL = window.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyDemoPlaceholder/exec";

    // 2. Safe Firebase App Initialization
    if (typeof firebase !== 'undefined') {
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
        } catch (initErr) {
            console.warn("[PassTrack] Firebase initializeApp note:", initErr.message);
        }
    }

    // 3. Rich In-Memory Demonstration Collections
    const demoCollections = {
        organizations: [
            {
                id: 'demo-org-acm',
                name: 'ACM Student Chapter • NMIT',
                ownerId: 'demo-organizer-uid',
                description: 'Premier Computing and Engineering Society at NMIT',
                treasuryBalance: 42850,
                membershipFee: 250,
                activeMembers: 142,
                createdAt: new Date().toISOString()
            }
        ],
        events: [
            {
                id: 'hacknmit-2026',
                name: 'HackNMIT 2026',
                eventId: 'hacknmit-2026',
                organizerId: 'demo-organizer-uid',
                orgId: 'demo-org-acm',
                eventDate: new Date().toISOString().split('T')[0],
                eventEndDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                distributorCode: 'STAFF2026',
                collaboratorEmails: ['volunteer@nmit.ac.in', 'organizer@nmit.ac.in'],
                stations: [
                    { name: "Main Entrance", dateFrom: "all", dateTo: "all", start: "08:00", end: "22:00" },
                    { name: "Food & Refreshments", dateFrom: "all", dateTo: "all", start: "12:00", end: "15:00" },
                    { name: "Hardware Lab", dateFrom: "all", dateTo: "all", start: "09:00", end: "18:00" }
                ],
                createdAt: new Date()
            },
            {
                id: 'codesprint-2026',
                name: 'CodeSprint Algorithmic Challenge',
                eventId: 'codesprint-2026',
                organizerId: 'demo-organizer-uid',
                orgId: 'demo-org-acm',
                eventDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
                eventEndDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
                distributorCode: 'SPRINT26',
                stations: [{ name: "Lab 3 Gate", dateFrom: "all", dateTo: "all", start: "10:00", end: "17:00" }],
                createdAt: new Date()
            }
        ],
        members: [
            { id: 'mem-1', name: 'Aarav Sharma', email: 'aarav.sharma@nmit.ac.in', studentId: '1NT23CS014', role: 'member', duesPaid: true, membershipStatus: 'active', orgId: 'demo-org-acm' },
            { id: 'mem-2', name: 'Diya Patel', email: 'diya.patel@nmit.ac.in', studentId: '1NT23IS028', role: 'member', duesPaid: true, membershipStatus: 'active', orgId: 'demo-org-acm' },
            { id: 'mem-3', name: 'Rohan Verma', email: 'rohan.verma@nmit.ac.in', studentId: '1NT22EC089', role: 'member', duesPaid: false, membershipStatus: 'pending', orgId: 'demo-org-acm' },
            { id: 'mem-4', name: 'Ananya Rao', email: 'ananya.rao@nmit.ac.in', studentId: '1NT23AI005', role: 'member', duesPaid: true, membershipStatus: 'active', orgId: 'demo-org-acm' }
        ],
        transactions: [
            { id: 'txn-1', orgId: 'demo-org-acm', type: 'income', amount: 15000, category: 'Tickets', description: 'Early-Bird Passes batch', date: new Date().toISOString().split('T')[0], status: 'approved' },
            { id: 'txn-2', orgId: 'demo-org-acm', type: 'income', amount: 7500, category: 'Merchandise', description: 'ACM Hoodies pre-order batch', date: new Date().toISOString().split('T')[0], status: 'approved' },
            { id: 'txn-3', orgId: 'demo-org-acm', type: 'expense', amount: 3200, category: 'Printing', description: 'Event badges and lanyards', date: new Date().toISOString().split('T')[0], status: 'approved' },
            { id: 'txn-4', orgId: 'demo-org-acm', type: 'expense', amount: 4800, category: 'Refreshments', description: 'Volunteer snacks & hydration', date: new Date().toISOString().split('T')[0], status: 'approved' }
        ],
        reimbursements: [
            { id: 'claim-1', orgId: 'demo-org-acm', volunteerName: 'Kunal Sen', volunteerEmail: 'kunal@nmit.ac.in', amount: 1250, category: 'Stationery', description: 'Whiteboard markers & chart sheets', status: 'pending', receiptUrl: '', date: new Date().toISOString().split('T')[0] },
            { id: 'claim-2', orgId: 'demo-org-acm', volunteerName: 'Sneha Roy', volunteerEmail: 'sneha@nmit.ac.in', amount: 800, category: 'Travel', description: 'Volunteer cab fare for banner delivery', status: 'pending', receiptUrl: '', date: new Date().toISOString().split('T')[0] }
        ],
        tasks: [
            { id: 'task-1', orgId: 'demo-org-acm', title: 'Door scanner orientation', assignedTo: 'Volunteers', status: 'completed' },
            { id: 'task-2', orgId: 'demo-org-acm', title: 'Audit participant credential list', assignedTo: 'Core Lead', status: 'in-progress' }
        ],
        users: [
            { id: 'pass-1', eventDocId: 'hacknmit-2026', eventId: 'hacknmit-2026', qrToken: 'demo-attendee-token-88', organizerId: 'demo-organizer-uid', name: 'Aarav Sharma', email: 'aarav.sharma@nmit.ac.in', passType: 'VIP Hackathon Pass', permissions: { "Main Entrance": { status: "used" }, "Food & Refreshments": { status: "used" } } },
            { id: 'pass-2', eventDocId: 'hacknmit-2026', eventId: 'hacknmit-2026', qrToken: 'demo-attendee-token-89', organizerId: 'demo-organizer-uid', name: 'Diya Patel', email: 'diya.patel@nmit.ac.in', passType: 'Standard Delegate', permissions: { "Main Entrance": { status: "used" } } },
            { id: 'pass-3', eventDocId: 'hacknmit-2026', eventId: 'hacknmit-2026', qrToken: 'demo-attendee-token-90', organizerId: 'demo-organizer-uid', name: 'Rohan Verma', email: 'rohan.verma@nmit.ac.in', passType: 'Student Pass', permissions: { "Main Entrance": { status: "valid" } } }
        ],
        products: [
            { id: 'prod-1', orgId: 'demo-org-acm', title: 'Official ACM Tech Hoodie', price: 899, stock: 45, category: 'Apparel', description: 'Heavyweight organic cotton hoodie with embroidered crest' },
            { id: 'prod-2', orgId: 'demo-org-acm', title: 'Developer Sticker Pack', price: 99, stock: 120, category: 'Accessories', description: 'Die-cut vinyl laptop stickers' }
        ],
        orders: [
            { id: 'ord-1', orgId: 'demo-org-acm', buyerName: 'Kavya Nair', buyerEmail: 'kavya@nmit.ac.in', itemsSummary: '1x Official ACM Tech Hoodie', total: 899, paymentStatus: 'paid', status: 'ready', date: new Date().toISOString() }
        ],
        announcements: [
            { id: 'ann-1', orgId: 'demo-org-acm', title: 'HackNMIT 2026 Check-in Procedures', category: 'Events', content: 'Door scanning starts at 08:00 AM in Audi-2. Please present your digital wallet pass.', priority: 'high', pinned: true, createdAt: new Date() },
            { id: 'ann-2', orgId: 'demo-org-acm', title: 'Q1 Volunteer Reimbursements Window Open', category: 'Finance', content: 'Submit receipts via Treasury Portal before Friday for instant UPI disbursement.', priority: 'normal', pinned: false, createdAt: new Date() }
        ]
    };

    // 4. Lightweight Mock Firestore Collection Builder with Query Support
    function createMockQuery(sourceItems) {
        let currentItems = [...sourceItems];

        return {
            where: function (field, op, val) {
                const filtered = currentItems.filter(item => {
                    if (!item) return false;
                    const itemVal = item[field];
                    if (op === '==' || op === '===') return String(itemVal).toLowerCase() === String(val).toLowerCase();
                    if (op === '!=') return itemVal !== val;
                    if (op === 'in') return Array.isArray(val) && val.includes(itemVal);
                    if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(val);
                    return true;
                });
                return createMockQuery(filtered);
            },
            orderBy: function () { return this; },
            limit: function (n) {
                return createMockQuery(currentItems.slice(0, n));
            },
            get: async function () {
                return {
                    empty: currentItems.length === 0,
                    size: currentItems.length,
                    docs: currentItems.map(d => ({ id: d.id, data: () => d }))
                };
            },
            onSnapshot: function (callback, errCallback) {
                setTimeout(() => {
                    try {
                        callback({
                            empty: currentItems.length === 0,
                            size: currentItems.length,
                            docs: currentItems.map(d => ({ id: d.id, data: () => d })),
                            forEach: fn => currentItems.forEach(d => fn({ id: d.id, data: () => d }))
                        });
                    } catch (e) {
                        if (errCallback) errCallback(e);
                    }
                }, 10);
                return () => {};
            }
        };
    }

    function createMockCollection(name) {
        if (!demoCollections[name]) demoCollections[name] = [];
        let items = demoCollections[name];

        const baseQuery = createMockQuery(items);

        return {
            ...baseQuery,
            where: function (field, op, val) {
                return createMockQuery(items).where(field, op, val);
            },
            limit: function (n) {
                return createMockQuery(items).limit(n);
            },
            orderBy: function () {
                return createMockQuery(items);
            },
            get: async function () {
                return createMockQuery(items).get();
            },
            onSnapshot: function (cb, errCb) {
                return createMockQuery(items).onSnapshot(cb, errCb);
            },
            doc: function (id) {
                return {
                    id: id,
                    get: async function () {
                        const found = items.find(i => i.id === id);
                        return {
                            exists: !!found,
                            id: id,
                            data: () => found || {}
                        };
                    },
                    set: async function (data, opts) {
                        const idx = items.findIndex(i => i.id === id);
                        const merged = opts && opts.merge && idx >= 0 ? { ...items[idx], ...data } : { id: id, ...data };
                        if (idx >= 0) items[idx] = merged; else items.push(merged);
                        return merged;
                    },
                    update: async function (data) {
                        const idx = items.findIndex(i => i.id === id);
                        if (idx >= 0) items[idx] = { ...items[idx], ...data };
                        return true;
                    },
                    delete: async function () {
                        const idx = items.findIndex(i => i.id === id);
                        if (idx >= 0) items.splice(idx, 1);
                        return true;
                    },
                    onSnapshot: function (callback) {
                        const found = items.find(i => i.id === id);
                        setTimeout(() => callback({ exists: !!found, id: id, data: () => found || {} }), 10);
                        return () => {};
                    }
                };
            },
            add: async function (data) {
                const newId = 'doc-' + Math.random().toString(36).substr(2, 9);
                const doc = { id: newId, ...data };
                items.unshift(doc);
                return { id: newId };
            }
        };
    }

    // 5. Global db instance that never throws
    let dbInstance = null;
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            dbInstance = firebase.firestore();
        } catch (e) {
            console.warn("[PassTrack] Native firestore init deferred to mock:", e.message);
        }
    }

    if (!dbInstance) {
        dbInstance = {
            collection: function (name) { return createMockCollection(name); },
            batch: function () {
                return {
                    set: function () {},
                    update: function () {},
                    delete: function () {},
                    commit: async function () { return true; }
                };
            }
        };
    }

    // Export global db references
    window.db = dbInstance;
    window.firestore = dbInstance;

    // Export mock auth if native auth is unavailable or restricted
    if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
            window.auth = firebase.auth();
        } catch (e) {
            window.auth = {
                currentUser: { uid: 'demo-organizer-uid', email: 'organizer@nmit.ac.in', displayName: 'Demo Organizer' },
                onAuthStateChanged: function (cb) {
                    setTimeout(() => cb(window.auth.currentUser), 10);
                    return () => {};
                },
                signOut: async function () { return true; }
            };
        }
    } else {
        window.auth = {
            currentUser: { uid: 'demo-organizer-uid', email: 'organizer@nmit.ac.in', displayName: 'Demo Organizer' },
            onAuthStateChanged: function (cb) {
                setTimeout(() => cb(window.auth.currentUser), 10);
                return () => {};
            },
            signOut: async function () { return true; }
        };
    }

    console.info("[PassTrack] Client database adapter loaded. Ready for demonstration & live sync.");
})();
