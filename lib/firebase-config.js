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

    // 3. Realistic Demo Data Generator (250 items per core collection)
    const FIRST_NAMES = [
        "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Muhammad", "Sai", "Ayaan", "Krishna",
        "Ishaan", "Shaurya", "Atharva", "Aadhya", "Aryan", "Dhruv", "Kabir", "Rudra", "Ananya", "Diya",
        "Ira", "Pari", "Saanvi", "Myra", "Aanya", "Aarohi", "Prisha", "Riya", "Aditi", "Anaya",
        "Rohan", "Siddharth", "Rahul", "Varun", "Vikram", "Sneha", "Priya", "Pooja", "Tanvi", "Neha",
        "Kavya", "Meera", "Swati", "Tarun", "Naveen", "Akash", "Kunal", "Harsh", "Deepak", "Manish",
        "Suresh", "Gaurav", "Nikhil", "Amit", "Sumit", "Rajesh", "Karthik", "Abhishek", "Rishabh", "Divya",
        "Shruti", "Shreya", "Nikita", "Monika", "Pallavi", "Ankita", "Bhavna", "Kritika", "Preeti", "Simran"
    ];

    const LAST_NAMES = [
        "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Rao", "Gupta", "Joshi", "Kulkarni",
        "Deshmukh", "Menon", "Pillai", "Singhal", "Nambiar", "Bhat", "Hegde", "Shetty", "Kumar", "Singh",
        "Choudhury", "Bose", "Banerjee", "Chatterjee", "Mishra", "Pandey", "Trivedi", "Shukla", "Dubey", "Agarwal"
    ];

    const DEPARTMENTS = [
        "Computer Science & Engg", "Information Science", "Electronics & Comm",
        "Artificial Intelligence & ML", "Mechanical Engg", "Data Science", "Cyber Security"
    ];

    const CLUB_ROLES = [
        "Active Member", "Student Volunteer", "Core Committee", "Technical Lead",
        "Design Associate", "Logistics Coordinator", "PR & Outreach", "Event Lead"
    ];

    function generateSampleMembers(count = 250) {
        const list = [];
        for (let i = 0; i < count; i++) {
            const fn = FIRST_NAMES[i % FIRST_NAMES.length];
            const ln = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
            const name = `${fn} ${ln}`;
            const clean = name.toLowerCase().replace(/[^a-z]/g, '.');
            const email = `${clean}.${i + 101}@nmit.ac.in`;
            const branch = ["CS", "IS", "EC", "AI", "DS"][i % 5];
            const num = String((i % 250) + 1).padStart(3, '0');
            const usn = `1NT23${branch}${num}`;
            const isPaid = (i % 6 !== 0); // ~84% active
            const isExpired = (i % 18 === 0);
            const status = isExpired ? 'expired' : (isPaid ? 'active' : 'pending');
            const dept = DEPARTMENTS[i % DEPARTMENTS.length];
            const role = CLUB_ROLES[i % CLUB_ROLES.length];
            const phone = `+91 98450${String(10000 + (i * 73) % 90000)}`;
            const joinedDays = (i % 300) + 10;
            const joinedAt = new Date(Date.now() - joinedDays * 86400000);

            list.push({
                id: `mem-${i + 1}`,
                orgId: 'demo-org-acm',
                name: name,
                email: email,
                phone: phone,
                studentId: usn,
                usn: usn,
                department: dept,
                clubRole: role,
                role: role,
                membershipStatus: status,
                duesPaid: status === 'active',
                joinedAt: { toMillis: () => joinedAt.getTime(), toDate: () => joinedAt },
                membershipEndDate: isExpired ? '2025-12-31' : '2027-05-31',
                paymentMethod: ['UPI', 'Card', 'Cash'][i % 3],
                createdAt: joinedAt.toISOString()
            });
        }
        return list;
    }

    function generateSampleUsers(count = 250) {
        const list = [];
        for (let i = 0; i < count; i++) {
            const fn = FIRST_NAMES[(i + 10) % FIRST_NAMES.length];
            const ln = LAST_NAMES[Math.floor((i + 10) / FIRST_NAMES.length) % LAST_NAMES.length];
            const name = `${fn} ${ln}`;
            const clean = name.toLowerCase().replace(/[^a-z]/g, '.');
            const email = `${clean}.${i + 301}@nmit.ac.in`;
            const isCheckedIn = (i % 3 === 0);
            const isFoodUsed = (i % 4 === 0);
            const qrToken = i === 0 ? 'demo-attendee-token-88' : `p-pass-${String(i + 1).padStart(3, '0')}`;
            const passType = (i % 8 === 0) ? 'VIP Hackathon Pass' : ((i % 4 === 0) ? 'Hacker Pass' : 'Standard Delegate');
            const createdTime = Date.now() - i * 3600000;

            list.push({
                id: `pass-${i + 1}`,
                eventDocId: 'hacknmit-2026',
                eventId: 'hacknmit-2026',
                organizerId: 'demo-organizer-uid',
                name: name,
                email: email,
                contact: email,
                passType: passType,
                ticketType: passType,
                qrToken: qrToken,
                permissions: {
                    "Main Entrance": { status: isCheckedIn ? "used" : "valid" },
                    "Food & Refreshments": { status: isFoodUsed ? "used" : "valid" },
                    "Hardware Lab": { status: (i % 5 === 0) ? "valid" : "revoked" }
                },
                createdAt: { toMillis: () => createdTime, toDate: () => new Date(createdTime) }
            });
        }
        return list;
    }

    function generateSampleTransactions(count = 250) {
        const list = [];
        const INCOME_CATS = ['Tickets', 'Merchandise', 'Sponsorship', 'Grant', 'Dues'];
        const EXPENSE_CATS = ['Refreshments', 'Printing', 'Logistics', 'Venue', 'Hardware', 'Prizes', 'Speakers'];

        for (let i = 0; i < count; i++) {
            const isIncome = (i % 2 === 0);
            const type = isIncome ? 'income' : 'expense';
            const cat = isIncome ? INCOME_CATS[i % INCOME_CATS.length] : EXPENSE_CATS[i % EXPENSE_CATS.length];
            let amount = 500;
            if (cat === 'Tickets') amount = 1500 + (i % 8) * 350;
            else if (cat === 'Merchandise') amount = 899 + (i % 6) * 200;
            else if (cat === 'Sponsorship') amount = 15000 + (i % 5) * 5000;
            else if (cat === 'Grant') amount = 25000;
            else if (cat === 'Dues') amount = 2500 + (i % 4) * 500;
            else if (cat === 'Refreshments') amount = 1200 + (i % 7) * 450;
            else if (cat === 'Printing') amount = 850 + (i % 5) * 250;
            else if (cat === 'Venue') amount = 4500 + (i % 4) * 1000;
            else if (cat === 'Prizes') amount = 8000 + (i % 3) * 3000;
            else amount = 650 + (i % 9) * 180;

            const dayOffset = (i % 180);
            const dateStr = new Date(Date.now() - dayOffset * 86400000).toISOString().split('T')[0];

            list.push({
                id: `txn-${i + 1}`,
                orgId: 'demo-org-acm',
                type: type,
                amount: amount,
                category: cat,
                description: `${isIncome ? 'Inflow' : 'Disbursement'}: ${cat} for ACM Student Chapter operations (#${i + 1})`,
                date: dateStr,
                recordedByName: 'Treasurer Lead',
                status: 'approved'
            });
        }
        return list;
    }

    function generateSampleReimbursements(count = 250) {
        const list = [];
        const VENDORS = [
            "Kalyan Stationery & Xerox", "Star Digital Flex Printers", "Bengaluru Sound Works",
            "Metro Electrical Supplies", "Chai Point Campus Express", "Shri Ganesh Hardware",
            "Amazon India Marketplace", "Blinkit Instant Supplies", "Sri Balaji Floral Decor",
            "Maharaja Sweets & Snacks"
        ];
        const CATS = ['Stationery', 'Travel', 'Refreshments', 'Printing', 'Hardware', 'Logistics'];

        for (let i = 0; i < count; i++) {
            const fn = FIRST_NAMES[(i + 20) % FIRST_NAMES.length];
            const ln = LAST_NAMES[Math.floor((i + 20) / FIRST_NAMES.length) % LAST_NAMES.length];
            const name = `${fn} ${ln}`;
            const clean = name.toLowerCase().replace(/[^a-z]/g, '.');
            const email = `${clean}.${i + 501}@nmit.ac.in`;
            const vendor = VENDORS[i % VENDORS.length];
            const status = (i % 5 === 0) ? 'pending' : ((i % 10 === 0) ? 'rejected' : 'approved');
            const amount = 350 + (i % 35) * 85;
            const upi = `${name.toLowerCase().split(' ')[0]}${i + 11}@okhdfcbank`;
            const dayOffset = (i % 90);
            const dateStr = new Date(Date.now() - dayOffset * 86400000).toISOString().split('T')[0];
            const cat = CATS[i % CATS.length];

            list.push({
                id: `claim-${i + 1}`,
                orgId: 'demo-org-acm',
                volunteerName: name,
                claimantName: name,
                volunteerEmail: email,
                claimantEmail: email,
                volunteerUpi: upi,
                upiId: upi,
                payoutUpi: upi,
                amount: amount,
                category: cat,
                merchant: vendor,
                event: 'HackNMIT 2026',
                description: `Volunteer reimbursement for ${vendor} supplies procured during HackNMIT 2026.`,
                status: status,
                receiptUrl: '',
                date: dateStr,
                createdAt: new Date(Date.now() - dayOffset * 86400000).toISOString()
            });
        }
        return list;
    }

    function generateSampleTasks(count = 250) {
        const list = [];
        const TASK_TEMPLATES = [
            "Stage soundbox and mic calibration in Main Audi",
            "Coordinate sponsor banner placements at Campus Plaza",
            "Review attendee credential check-in logs with gate volunteers",
            "Verify hospitality water stations and faculty tea service",
            "Print high-resolution participant certificate backups",
            "Upload real-time social media stories and event reels",
            "Distribute official merchandise kits to VIP registrants",
            "Conduct smoke test on offline QR scanner fallback",
            "Reconcile ticketing cash desk register with Treasury",
            "Inspect campus Wi-Fi AP bandwidth for hackathon participants",
            "Prepare keynote speaker welcome dossier and bouquet",
            "Review volunteer reimbursement slips for travel allowances",
            "Check first aid booth readiness and emergency contact cards",
            "Deploy PassTrack token distro system update to gate tablets",
            "Archive event photography into official cloud drive",
            "Audit semester handover ledger before executive signing",
            "Collect feedback forms from robotics arena judges",
            "Setup extension power boards in Hackathon Bay 3",
            "Confirm catering delivery count for 500 boxed lunches",
            "Conduct core team evening debrief and shift handoff"
        ];

        for (let i = 0; i < count; i++) {
            const tpl = TASK_TEMPLATES[i % TASK_TEMPLATES.length];
            const round = Math.floor(i / TASK_TEMPLATES.length) + 1;
            const title = `${tpl} #${round}`;
            const status = ['todo', 'inprogress', 'done'][i % 3];
            const priority = ['low', 'medium', 'high'][i % 3];
            const assignee = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
            const dueDays = (i % 25) - 5;
            const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().split('T')[0];

            list.push({
                id: `task-${i + 1}`,
                orgId: 'demo-org-acm',
                title: title,
                description: `Operational task for ACM Chapter. Assigned to ${assignee}. Priority: ${priority.toUpperCase()}.`,
                status: status,
                priority: priority,
                assignedTo: assignee,
                dueDate: dueDate,
                createdAt: new Date(Date.now() - i * 3600000).toISOString()
            });
        }
        return list;
    }

    function generateSampleAnnouncements(count = 30) {
        const ANNOUNCE_TOPICS = [
            { title: "🎉 Official Check-in Protocols for Main Auditorium", cat: "Important" },
            { title: "🚀 Call for Student Mentors & Track Coordinators", cat: "Opportunity" },
            { title: "🛠️ Workshop on Cloud Infrastructure & Web Components", cat: "Workshop" },
            { title: "☕ Evening Refreshments & Networking Hour Schedule", cat: "Event Update" },
            { title: "⚠️ Parking Pass Guidelines at Campus Gate 2", cat: "General" },
            { title: "🏆 Announcing Preliminary Round Hackathon Problem Statements", cat: "Important" },
            { title: "🎨 UI/UX Design Sprint Submissions Deadline Extension", cat: "Urgent" },
            { title: "📦 Merchandise Collection Desk Open at Student Center", cat: "Event Update" },
            { title: "💡 Innovation Fund Grant Applications Now Open", cat: "Opportunity" },
            { title: "📜 Digital Participation Certificates Issuance Timeline", cat: "General" }
        ];

        const list = [];
        for (let i = 0; i < count; i++) {
            const topic = ANNOUNCE_TOPICS[i % ANNOUNCE_TOPICS.length];
            const round = Math.floor(i / ANNOUNCE_TOPICS.length) + 1;
            const title = `${topic.title} (Bulletin #${round})`;
            const pinned = (i < 3);

            list.push({
                id: `ann-${i + 1}`,
                orgId: 'demo-org-acm',
                title: title,
                category: topic.cat,
                pinned: pinned,
                content: `Official chapter update regarding ${topic.title}. All active members please take note of the deadlines and reporting venues.`,
                createdAt: new Date(Date.now() - i * 86400000).toISOString()
            });
        }
        return list;
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
                activeMembers: 250,
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
        members: generateSampleMembers(250),
        users: generateSampleUsers(250),
        transactions: generateSampleTransactions(250),
        reimbursements: generateSampleReimbursements(250),
        tasks: generateSampleTasks(250),
        announcements: generateSampleAnnouncements(30),
        products: [
            { id: 'prod-1', orgId: 'demo-org-acm', title: 'Official ACM Tech Hoodie', price: 899, stock: 45, category: 'Apparel', description: 'Heavyweight organic cotton hoodie with embroidered crest' },
            { id: 'prod-2', orgId: 'demo-org-acm', title: 'Developer Sticker Pack', price: 99, stock: 120, category: 'Accessories', description: 'Die-cut vinyl laptop stickers' }
        ],
        orders: [
            { id: 'ord-1', orgId: 'demo-org-acm', buyerName: 'Kavya Nair', buyerEmail: 'kavya@nmit.ac.in', itemsSummary: '1x Official ACM Tech Hoodie', total: 899, paymentStatus: 'paid', status: 'ready', date: new Date().toISOString() }
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

    // 5. Offline-Safe Demonstration Mock Database & Auth System
    const mockStore = {
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

    const mockAuth = {
        currentUser: { uid: 'demo-organizer-uid', email: 'organizer@nmit.ac.in', displayName: 'Demo Organizer' },
        onAuthStateChanged: function (cb) {
            setTimeout(() => cb(mockAuth.currentUser), 10);
            return () => {};
        },
        signInWithEmailAndPassword: async function () { return { user: mockAuth.currentUser }; },
        createUserWithEmailAndPassword: async function () { return { user: mockAuth.currentUser }; },
        signOut: async function () { return true; }
    };

    // Override or initialize global firebase functions so no page crashes or makes external calls
    if (typeof firebase !== 'undefined') {
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
        } catch (e) {}

        firebase.firestore = function () { return mockStore; };
        firebase.auth = function () { return mockAuth; };
    } else {
        window.firebase = {
            initializeApp: function () {},
            firestore: function () { return mockStore; },
            auth: function () { return mockAuth; },
            apps: [{ name: '[DEFAULT]' }]
        };
    }

    // Export global references
    window.db = mockStore;
    window.firestore = mockStore;
    window.auth = mockAuth;

    console.info("[PassTrack] Client database adapter loaded with 250 sample records per collection. Offline demonstration ready.");
})();
