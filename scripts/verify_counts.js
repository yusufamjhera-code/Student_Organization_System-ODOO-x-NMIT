const fs = require('fs');
const path = require('path');

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
    return authData.idToken;
}

const collections = [
  'members',
  'users',
  'tasks',
  'transactions',
  'reimbursements',
  'announcements',
  'merchOrders',
  'tickets',
  'merchProducts',
  'events',
  'organizations'
];

async function verifyCounts() {
  const token = await getAuthToken();
  console.log('--- FIRESTORE VERIFICATION REPORT ---');

  for (const col of collections) {
    let count = 0;
    let pageToken = null;
    do {
      let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${col}?key=${API_KEY}&pageSize=300`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.documents) {
        count += data.documents.length;
      }
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    console.log(`✓ Collection [${col.padEnd(16)}]: ${count} documents in Firebase`);
  }
}

verifyCounts().catch(console.error);
