const fs = require('fs');
const path = require('path');

// Read local .env if running locally and process.env is not already set
if (!process.env.FIREBASE_API_KEY && fs.existsSync(path.join(__dirname, '.env'))) {
    try {
        const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
            if (match) {
                let val = match[2].trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                process.env[match[1]] = val;
            }
        });
    } catch (e) {
        console.warn('Could not read local .env file:', e.message);
    }
}

const dir = path.join(__dirname, 'lib');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const apiKey = process.env.FIREBASE_API_KEY || "YOUR_API_KEY";
const authDomain = process.env.FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN";
const projectId = process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID";
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET";
const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID";
const appId = process.env.FIREBASE_APP_ID || "YOUR_APP_ID";
const measurementId = process.env.FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID";
const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL || "YOUR_GOOGLE_SCRIPT_URL";

const config = `// Generated Firebase configuration (Safe for Client Bundle)
const firebaseConfig = {
  apiKey: "${apiKey}",
  authDomain: "${authDomain}",
  projectId: "${projectId}",
  storageBucket: "${storageBucket}",
  messagingSenderId: "${messagingSenderId}",
  appId: "${appId}",
  measurementId: "${measurementId}"
};

window.GOOGLE_SCRIPT_URL = "${googleScriptUrl}";

// Initialize Firebase using global compat SDK
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Global Firestore reference
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

console.log("Firebase config loaded and initialized successfully!");
`;

fs.writeFileSync(path.join(dir, 'firebase-config.js'), config);
console.log('Successfully generated lib/firebase-config.js');
