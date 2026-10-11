/**
 * PassTrack Unified Firebase Data Seeder
 * Populates 420 entries (minimum 400+) directly into each core Firestore collection:
 * - members (420 entries)
 * - users (420 attendee passes)
 * - tasks (420 Kanban board tasks)
 * - transactions (420 Treasury ledger records)
 * - reimbursements (420 Volunteer claims)
 * - announcements (420 Notice board posts)
 * - merchOrders (420 Store customer orders)
 * - tickets (420 Ticket tracking tokens)
 * - merchProducts (8 Store catalog items)
 */

const fs = require('fs');
const path = require('path');

// Read .env
const envPath = path.join(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
        const m = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
        if (m) {
            let val = m[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            env[m[1]] = val;
        }
    });
}

const API_KEY = env.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
const PROJECT_ID = env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
    console.error('Missing FIREBASE_API_KEY or FIREBASE_PROJECT_ID in environment or .env');
    process.exit(1);
}

const ORG_ID = 'iow0PVpYW2TPwqV5J3qU';
const EVENT_DOC_ID = 'J3WuyOS4EVY9dY5uDInW';
const EVENT_SLUG = 'vit2';
const ORGANIZER_ID = 'oLwN1BxQjUMzLjICHSMJi6xbyCv2';
const EVENT_NAME = 'TECHNO-VIT 2027';

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
  "Choudhury", "Bose", "Banerjee", "Chatterjee", "Mishra", "Pandey", "Trivedi", "Shukla", "Dubey", "Agarwal",
  "Bansal", "Goel", "Garg", "Jain", "Mehta", "Shah", "Modi", "Chauhan", "Rathore", "Yadav"
];

const DEPARTMENTS = [
  "Computer Science & Engg", "Information Science", "Electronics & Comm",
  "Artificial Intelligence & ML", "Mechanical Engg", "Civil Engg",
  "Data Science", "Cyber Security", "Robotics & Automation"
];

const CLUB_ROLES = [
  "Active Member", "Student Volunteer", "Core Committee", "Technical Lead",
  "Design Associate", "Logistics Coordinator", "PR & Outreach", "Event Lead"
];

function getName(index) {
    const fn = FIRST_NAMES[index % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    return `${fn} ${ln}`;
}

function getEmail(name, index) {
    const clean = name.toLowerCase().replace(/[^a-z]/g, '.');
    return `${clean}.${index + 101}@nmit.ac.in`;
}

function getPhone(index) {
    const base = 9845000000 + (index * 7919) % 1000000;
    return `+91 ${base}`;
}

function getUsn(index) {
    const num = String((index % 250) + 1).padStart(3, '0');
    const branch = ["CS", "IS", "EC", "AI", "DS"][index % 5];
    return `1NT23${branch}${num}`;
}

// Authenticate Seeder Admin to get JWT ID token
async function getAuthToken() {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
    const signRes = await fetch(signInUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'seeder.admin@passtrack.internal',
            password: 'PassTrackSeeder2026!',
            returnSecureToken: true
        })
    });
    const authData = await signRes.json();
    if (!authData.idToken) {
        throw new Error('Could not obtain auth token: ' + JSON.stringify(authData));
    }
    return authData.idToken;
}

// Batch commit helper (batches of 400 writes)
async function commitBatch(token, writes) {
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit?key=${API_KEY}`;
    const res = await fetch(commitUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ writes })
    });
    const result = await res.json();
    if (result.error) {
        throw new Error(`Batch commit error: ${JSON.stringify(result.error)}`);
    }
    return result;
}

// Convert native JS values to Firestore REST fields
function toFirestoreFields(obj) {
    const fields = {};
    for (const [key, val] of Object.entries(obj)) {
        if (val === null || val === undefined) {
            fields[key] = { nullValue: null };
        } else if (typeof val === 'string') {
            fields[key] = { stringValue: val };
        } else if (typeof val === 'number') {
            if (Number.isInteger(val)) {
                fields[key] = { integerValue: String(val) };
            } else {
                fields[key] = { doubleValue: val };
            }
        } else if (typeof val === 'boolean') {
            fields[key] = { booleanValue: val };
        } else if (val instanceof Date) {
            fields[key] = { timestampValue: val.toISOString() };
        } else if (Array.isArray(val)) {
            fields[key] = {
                arrayValue: {
                    values: val.map(item => {
                        if (typeof item === 'string') return { stringValue: item };
                        if (typeof item === 'number') return { integerValue: String(item) };
                        if (typeof item === 'object') return { mapValue: { fields: toFirestoreFields(item) } };
                        return { stringValue: String(item) };
                    })
                }
            };
        } else if (typeof val === 'object') {
            fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
        }
    }
    return fields;
}

async function runSeeder() {
    console.log('🚀 Starting PassTrack Multi-Collection Rapid Seeder...');
    const token = await getAuthToken();
    console.log('✓ Authenticated as Seeder Admin');

    const TOTAL_ENTRIES = 420;

    // -------------------------------------------------------------------------
    // 1. SEED MEMBERS (420 entries)
    // -------------------------------------------------------------------------
    console.log(`\n📦 Seeding ${TOTAL_ENTRIES} members...`);
    const memberWrites = [];
    for (let i = 0; i < TOTAL_ENTRIES; i++) {
        const name = getName(i);
        const email = getEmail(name, i);
        const phone = getPhone(i);
        const usn = getUsn(i);
        const isPaid = (i % 7 !== 0); // ~85% active / paid
        const status = isPaid ? 'active' : 'pending';
        const dept = DEPARTMENTS[i % DEPARTMENTS.length];
        const role = CLUB_ROLES[i % CLUB_ROLES.length];
        const endYear = '2027-04-30';

        const docId = `mem_seed_${String(i + 1).padStart(4, '0')}`;
        const docName = `projects/${PROJECT_ID}/databases/(default)/documents/members/${docId}`;
        
        memberWrites.push({
            update: {
                name: docName,
                fields: toFirestoreFields({
                    orgId: ORG_ID,
                    name: name,
                    email: email,
                    phone: phone,
                    studentId: usn,
                    usn: usn,
                    department: dept,
                    clubRole: role,
                    membershipStatus: status,
                    duesPaid: isPaid,
                    duesPaidAt: isPaid ? new Date(Date.now() - (i * 86400000)) : null,
                    membershipEndDate: endYear,
                    joinedAt: new Date(Date.now() - (i * 86400000 * 1.5)),
                    paymentMethod: ['UPI', 'Card', 'Cash'][i % 3],
                    paymentRef: `PAY-MBR-${10000 + i}`,
                    updatedAt: new Date()
                })
            }
        });
    }

    for (let b = 0; b < memberWrites.length; b += 400) {
        const chunk = memberWrites.slice(b, b + 400);
        await commitBatch(token, chunk);
        console.log(`  ✓ Committed members chunk ${b + 1} - ${b + chunk.length}`);
    }

    // -------------------------------------------------------------------------
    // 2. SEED USERS / ATTENDEES (420 entries)
    // -------------------------------------------------------------------------
    console.log(`\n🎟️ Seeding ${TOTAL_ENTRIES} event attendees (users collection)...`);
    const userWrites = [];
    for (let i = 0; i < TOTAL_ENTRIES; i++) {
        const name = getName(i + 50);
        const contact = getEmail(name, i + 50);
        const isCheckedIn = (i % 3 !== 0); // 66% checked in
        const qrToken = `p-seed-${String(i + 1).padStart(4, '0')}-${Math.random().toString(36).substring(2, 8)}`;
        const hexHash = Math.abs((i * 1928374) ^ 0x811c9dc5).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
        const certId = `PT-CERT-2026-VIT2-${hexHash}`;

        const permissions = {
            "Entrance": {
                status: isCheckedIn ? 'used' : 'issued',
                scannedAt: isCheckedIn ? new Date(Date.now() - (i * 3600000)) : null,
                scannedBy: isCheckedIn ? 'Entrance Gate Staff' : null
            }
        };

        const docId = `usr_seed_${String(i + 1).padStart(4, '0')}`;
        const docName = `projects/${PROJECT_ID}/databases/(default)/documents/users/${docId}`;

        userWrites.push({
            update: {
                name: docName,
                fields: toFirestoreFields({
                    organizerId: ORGANIZER_ID,
                    eventDocId: EVENT_DOC_ID,
                    eventId: EVENT_SLUG,
                    name: name,
                    contact: contact,
                    status: isCheckedIn ? 'used' : 'issued',
                    permissions: permissions,
                    qrToken: qrToken,
                    certificateId: isCheckedIn ? certId : null,
                    eventName: EVENT_NAME,
                    orgName: 'NMIT',
                    eventDate: '2026-10-11',
                    paymentStatus: 'paid',
                    ticketType: (i % 5 === 0) ? 'VIP All-Access' : 'General Attendee',
                    amountPaid: (i % 5 === 0) ? 799 : 499,
                    createdAt: new Date(Date.now() - (i * 7200000)),
                    updatedAt: new Date()
                })
            }
        });
    }

    for (let b = 0; b < userWrites.length; b += 400) {
        const chunk = userWrites.slice(b, b + 400);
        await commitBatch(token, chunk);
        console.log(`  ✓ Committed attendees chunk ${b + 1} - ${b + chunk.length}`);
    }

    // -------------------------------------------------------------------------
    // 3. SEED TASKS (420 entries)
    // -------------------------------------------------------------------------
    console.log(`\n📋 Seeding ${TOTAL_ENTRIES} kanban tasks...`);
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

    const taskWrites = [];
    for (let i = 0; i < TOTAL_ENTRIES; i++) {
        const tpl = TASK_TEMPLATES[i % TASK_TEMPLATES.length];
        const round = Math.floor(i / TASK_TEMPLATES.length) + 1;
        const title = `${tpl} (Round #${round})`;
        const status = ['todo', 'inprogress', 'done'][i % 3];
        const priority = ['low', 'medium', 'high'][i % 3];
        const assignee = getName(i % 50);
        const dueDays = (i % 30) - 5;
        const dueDate = new Date(Date.now() + (dueDays * 86400000)).toISOString().split('T')[0];

        const docId = `task_seed_${String(i + 1).padStart(4, '0')}`;
        const docName = `projects/${PROJECT_ID}/databases/(default)/documents/tasks/${docId}`;

        taskWrites.push({
            update: {
                name: docName,
                fields: toFirestoreFields({
                    orgId: ORG_ID,
                    title: title,
                    description: `Standardized operational task for NMIT operations. Assigned to ${assignee}. Priority: ${priority.toUpperCase()}. Status updated automatically.`,
                    status: status,
                    priority: priority,
                    assignee: assignee,
                    dueDate: dueDate,
                    createdAt: new Date(Date.now() - (i * 3600000 * 4)),
                    updatedAt: new Date()
                })
            }
        });
    }

    for (let b = 0; b < taskWrites.length; b += 400) {
        const chunk = taskWrites.slice(b, b + 400);
        await commitBatch(token, chunk);
        console.log(`  ✓ Committed tasks chunk ${b + 1} - ${b + chunk.length}`);
    }

    // -------------------------------------------------------------------------
    // 4. SEED TRANSACTIONS (420 entries)
    // -------------------------------------------------------------------------
    console.log(`\n💰 Seeding ${TOTAL_ENTRIES} treasury transactions...`);
    const txnWrites = [];
    const INCOME_CATS = ['tickets', 'merchandise', 'dues', 'sponsorship', 'grant'];
    const EXPENSE_CATS = ['venue', 'catering', 'sound', 'printing', 'prizes', 'logistics', 'decor', 'reimbursement'];

    for (let i = 0; i < TOTAL_ENTRIES; i++) {
        const isIncome = (i % 2 === 0);
        const type = isIncome ? 'income' : 'expense';
        const cat = isIncome ? INCOME_CATS[i % INCOME_CATS.length] : EXPENSE_CATS[i % EXPENSE_CATS.length];
        
        let amount = 500;
        if (cat === 'tickets') amount = 1500 + (i % 10) * 350;
        else if (cat === 'merchandise') amount = 850 + (i % 8) * 200;
        else if (cat === 'dues') amount = 2000;
        else if (cat === 'sponsorship') amount = 25000 + (i % 5) * 10000;
        else if (cat === 'grant') amount = 35000;
        else if (cat === 'venue') amount = 4500 + (i % 5) * 1200;
        else if (cat === 'catering') amount = 3200 + (i % 7) * 800;
        else if (cat === 'sound') amount = 5000 + (i % 4) * 1500;
        else if (cat === 'printing') amount = 1200 + (i % 6) * 400;
        else if (cat === 'prizes') amount = 10000 + (i % 3) * 5000;
        else amount = 750 + (i % 10) * 250;

        // Distribute dates over 2026 (Jan to Oct)
        const dayOffset = (i % 280);
        const txnDate = new Date(Date.now() - (dayOffset * 86400000)).toISOString().split('T')[0];

        const docId = `txn_seed_${String(i + 1).padStart(4, '0')}`;
        const docName = `projects/${PROJECT_ID}/databases/(default)/documents/transactions/${docId}`;

        txnWrites.push({
            update: {
                name: docName,
                fields: toFirestoreFields({
                    orgId: ORG_ID,
                    type: type,
                    amount: amount,
                    category: cat,
                    date: txnDate,
                    desc: `${isIncome ? 'Inflow' : 'Disbursement'}: ${cat.toUpperCase()} for student operations (#${i + 1})`,
                    paymentMethod: ['UPI', 'Bank Transfer', 'Cash', 'Gateway'][i % 4],
                    reference: `REF-TXN-${20260000 + i}`,
                    recordedBy: ORGANIZER_ID,
                    createdAt: new Date(Date.now() - (dayOffset * 86400000)),
                    updatedAt: new Date()
                })
            }
        });
    }

    for (let b = 0; b < txnWrites.length; b += 400) {
        const chunk = txnWrites.slice(b, b + 400);
        await commitBatch(token, chunk);
        console.log(`  ✓ Committed transactions chunk ${b + 1} - ${b + chunk.length}`);
    }

    // -------------------------------------------------------------------------
    // 5. SEED REIMBURSEMENTS (420 entries)
    // -------------------------------------------------------------------------
    console.log(`\n🧾 Seeding ${TOTAL_ENTRIES} volunteer reimbursements...`);
    const reimbWrites = [];
    const VENDORS = [
        "Kalyan Stationery & Xerox", "Star Digital Flex Printers", "Bengaluru Sound Works",
        "Metro Electrical Supplies", "Chai Point Campus Express", "Shri Ganesh Hardware",
        "Amazon India Marketplace", "Blinkit Instant Supplies", "Sri Balaji Floral Decor",
        "Maharaja Sweets & Snacks"
    ];

    for (let i = 0; i < TOTAL_ENTRIES; i++) {
        const name = getName(i + 100);
        const email = getEmail(name, i + 100);
        const vendor = VENDORS[i % VENDORS.length];
        const status = (i % 3 === 0) ? 'pending' : ((i % 5 === 0) ? 'rejected' : 'approved');
        const amount = 250 + (i % 40) * 120;
        const upi = `${name.toLowerCase().split(' ')[0]}${i + 10}@okhdfcbank`;
        const dayOffset = (i % 90);
        const dateStr = new Date(Date.now() - (dayOffset * 86400000)).toISOString().split('T')[0];

        const docId = `reimb_seed_${String(i + 1).padStart(4, '0')}`;
        const docName = `projects/${PROJECT_ID}/databases/(default)/documents/reimbursements/${docId}`;

        reimbWrites.push({
            update: {
                name: docName,
                fields: toFirestoreFields({
                    orgId: ORG_ID,
                    claimantName: name,
                    claimantEmail: email,
                    merchant: vendor,
                    amount: amount,
                    status: status,
                    upiId: upi,
                    payoutUpi: upi,
                    date: dateStr,
                    event: EVENT_NAME,
                    category: ['printing', 'logistics', 'catering', 'decor', 'hardware'][i % 5],
                    description: `Volunteer expense for ${vendor} items procured during ${EVENT_NAME} preparations.`,
                    receiptUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400&auto=format&fit=crop&q=80',
                    createdAt: new Date(Date.now() - (dayOffset * 86400000)),
                    updatedAt: new Date()
                })
            }
        });
    }

    for (let b = 0; b < reimbWrites.length; b += 400) {
        const chunk = reimbWrites.slice(b, b + 400);
        await commitBatch(token, chunk);
        console.log(`  ✓ Committed reimbursements chunk ${b + 1} - ${b + chunk.length}`);
    }

    // -------------------------------------------------------------------------
    // 6. SEED ANNOUNCEMENTS (420 entries)
    // -------------------------------------------------------------------------
    console.log(`\n📢 Seeding ${TOTAL_ENTRIES} notices / announcements...`);
    const ANNOUNCE_TOPICS = [
        { title: "🎉 Official Check-in Protocols for Main Auditorium", cat: "Important" },
        { title: "🚀 Call for Student Mentors & Track Coordinators", cat: "Opportunity" },
        { title: "🛠️ Workshop on Cloud Infrastructure & Firebase SDK", cat: "Workshop" },
        { title: "☕ Evening Refreshments & Networking Hour Schedule", cat: "Event Update" },
        { title: "⚠️ Parking Pass Guidelines at Campus Gate 2", cat: "General" },
        { title: "🏆 Announcing Preliminary Round Hackathon Problem Statements", cat: "Important" },
        { title: "🎨 UI/UX Design Sprint Submissions Deadline Extension", cat: "Urgent" },
        { title: "📦 Merchandise Collection Desk Open at Student Center", cat: "Event Update" },
        { title: "💡 Innovation Fund Grant Applications Now Open", cat: "Opportunity" },
        { title: "📜 Digital Participation Certificates Issuance Timeline", cat: "General" }
    ];

    const announceWrites = [];
    for (let i = 0; i < TOTAL_ENTRIES; i++) {
        const topic = ANNOUNCE_TOPICS[i % ANNOUNCE_TOPICS.length];
        const round = Math.floor(i / ANNOUNCE_TOPICS.length) + 1;
        const title = `${topic.title} (Bulletin #${round})`;
        const pinned = (i < 5); // top 5 pinned
        const dayOffset = (i % 180);

        const docId = `ann_seed_${String(i + 1).padStart(4, '0')}`;
        const docName = `projects/${PROJECT_ID}/databases/(default)/documents/announcements/${docId}`;

        announceWrites.push({
            update: {
                name: docName,
                fields: toFirestoreFields({
                    orgId: ORG_ID,
                    eventId: EVENT_DOC_ID,
                    title: title,
                    content: `### Official Notice from NMIT Technical Chapter\n\nThis is an automated communication regarding **${topic.title}**.\n\n* **Academic Term:** 2026-2027\n* **Audience:** All Registered Members & Event Participants\n* **Coordinator:** Executive Council Operations Desk\n\nPlease check your PassTrack mobile wallet pass and student directory profile for real-time credentials. For escalations, reach out to your club mentor.`,
                    category: topic.cat,
                    pinned: pinned,
                    authorName: (i % 2 === 0) ? 'Executive Council' : 'Faculty Advisor',
                    createdAt: new Date(Date.now() - (dayOffset * 86400000)),
                    updatedAt: new Date()
                })
            }
        });
    }

    for (let b = 0; b < announceWrites.length; b += 400) {
        const chunk = announceWrites.slice(b, b + 400);
        await commitBatch(token, chunk);
        console.log(`  ✓ Committed announcements chunk ${b + 1} - ${b + chunk.length}`);
    }

    // -------------------------------------------------------------------------
    // 7. SEED MERCH PRODUCTS & ORDERS (420 entries)
    // -------------------------------------------------------------------------
    console.log(`\n🛍️ Seeding merchProducts and ${TOTAL_ENTRIES} merchOrders...`);
    
    // Seed 8 catalog products first
    const PRODUCTS = [
        { id: "prod_hoodie", name: "NMIT Official Tech Fest Hoodie", category: "clothing", price: 799, memberPrice: 649, desc: "Premium 380 GSM fleece oversized hoodie with embroidered PassTrack emblem." },
        { id: "prod_tshirt", name: "PassTrack Campus Oversized Tee", category: "clothing", price: 449, memberPrice: 379, desc: "100% combed cotton boxy fit t-shirt with screen-printed back graphic." },
        { id: "prod_bottle", name: "Insulated Stainless Steel Sipper Bottle", category: "drinkware", price: 399, memberPrice: 329, desc: "Double-walled 750ml thermal flask keeps drinks cold for 24h." },
        { id: "prod_lanyard", name: "Embroidered Lanyard & Enamel Pin Set", category: "accessories", price: 149, memberPrice: 119, desc: "Durable woven neck lanyard with metallic safety buckle and enamel pin." },
        { id: "prod_notebook", name: "Hardcover Dot-Grid Engineering Journal", category: "stationery", price: 249, memberPrice: 199, desc: "A5 hardcover 120 GSM bleed-proof dot-grid notebook." },
        { id: "prod_cap", name: "Classic Structured Snapback Cap", category: "clothing", price: 349, memberPrice: 289, desc: "6-panel cotton twill snapback cap with embroidered front patch." },
        { id: "prod_tote", name: "Heavyweight Canvas Laptop Tote Bag", category: "accessories", price: 299, memberPrice: 249, desc: "Reinforced 14oz organic cotton canvas tote bag with inner zipped pocket." },
        { id: "prod_stickers", name: "Holographic Vinyl Tech Sticker Pack", category: "accessories", price: 99, memberPrice: 79, desc: "Pack of 10 weather-proof die-cut vinyl laptop stickers." }
    ];

    const prodWrites = PRODUCTS.map(p => ({
        update: {
            name: `projects/${PROJECT_ID}/databases/(default)/documents/merchProducts/${p.id}`,
            fields: toFirestoreFields({
                orgId: ORG_ID,
                name: p.name,
                category: p.category,
                price: p.price,
                memberPrice: p.memberPrice,
                description: p.desc,
                imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
                active: true,
                sizes: { S: 50, M: 80, L: 80, XL: 60, XXL: 30 },
                totalSold: 420,
                createdAt: new Date(),
                updatedAt: new Date()
            })
        }
    }));
    await commitBatch(token, prodWrites);
    console.log(`  ✓ Committed ${PRODUCTS.length} catalog products`);

    // Seed 420 customer orders
    const orderWrites = [];
    for (let i = 0; i < TOTAL_ENTRIES; i++) {
        const prod = PRODUCTS[i % PRODUCTS.length];
        const buyer = getName(i + 150);
        const buyerEmail = getEmail(buyer, i + 150);
        const buyerPhone = getPhone(i + 150);
        const size = ['S', 'M', 'L', 'XL', 'XXL'][i % 5];
        const qty = (i % 4 === 0) ? 2 : 1;
        const total = prod.price * qty;
        const status = ['ordered', 'ready', 'collected'][i % 3];
        const dayOffset = (i % 60);

        const docId = `order_seed_${String(i + 1).padStart(4, '0')}`;
        const docName = `projects/${PROJECT_ID}/databases/(default)/documents/merchOrders/${docId}`;

        orderWrites.push({
            update: {
                name: docName,
                fields: toFirestoreFields({
                    orgId: ORG_ID,
                    productId: prod.id,
                    productName: prod.name,
                    buyerName: buyer,
                    buyerEmail: buyerEmail,
                    buyerPhone: buyerPhone,
                    size: size,
                    quantity: qty,
                    totalPrice: total,
                    paymentStatus: 'paid',
                    fulfillmentStatus: status,
                    orderedAt: new Date(Date.now() - (dayOffset * 86400000)),
                    createdAt: new Date(Date.now() - (dayOffset * 86400000))
                })
            }
        });
    }

    for (let b = 0; b < orderWrites.length; b += 400) {
        const chunk = orderWrites.slice(b, b + 400);
        await commitBatch(token, chunk);
        console.log(`  ✓ Committed merch orders chunk ${b + 1} - ${b + chunk.length}`);
    }

    // -------------------------------------------------------------------------
    // 8. SEED TICKETS (420 entries)
    // -------------------------------------------------------------------------
    console.log(`\n🎟️ Seeding ${TOTAL_ENTRIES} tracking tickets...`);
    const ticketWrites = [];
    for (let i = 0; i < TOTAL_ENTRIES; i++) {
        const docId = `tkt_seed_${String(i + 1).padStart(4, '0')}`;
        const docName = `projects/${PROJECT_ID}/databases/(default)/documents/tickets/${docId}`;
        const isUsed = (i % 3 !== 0);

        ticketWrites.push({
            update: {
                name: docName,
                fields: toFirestoreFields({
                    eventId: EVENT_SLUG,
                    eventDocId: EVENT_DOC_ID,
                    orgId: ORG_ID,
                    ticketNumber: `TKT-${10000 + i}`,
                    status: isUsed ? 'used' : 'valid',
                    usedAt: isUsed ? new Date(Date.now() - (i * 3600000)) : null,
                    updatedAt: new Date()
                })
            }
        });
    }

    for (let b = 0; b < ticketWrites.length; b += 400) {
        const chunk = ticketWrites.slice(b, b + 400);
        await commitBatch(token, chunk);
        console.log(`  ✓ Committed tickets chunk ${b + 1} - ${b + chunk.length}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 SUCCESS: All 7 collections seeded with 420+ dynamic records in Firebase!');
    console.log('   - members: 420 entries');
    console.log('   - users (attendees): 420 entries');
    console.log('   - tasks: 420 entries');
    console.log('   - transactions: 420 entries');
    console.log('   - reimbursements: 420 entries');
    console.log('   - announcements: 420 entries');
    console.log('   - merchOrders: 420 entries');
    console.log('   - tickets: 420 entries');
    console.log('   - merchProducts: 8 catalog items');
    console.log('===============================================================');
}

runSeeder().catch(err => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
});
