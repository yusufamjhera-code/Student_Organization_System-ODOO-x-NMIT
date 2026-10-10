const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'lib');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const config = `
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.FIREBASE_APP_ID}",
  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"
};

window.GOOGLE_SCRIPT_URL = "${process.env.GOOGLE_SCRIPT_URL}";

// Initialize Firebase using the global firebase object
firebase.initializeApp(firebaseConfig);

// Get a reference to the Firestore database service
const db = firebase.firestore();

console.log("Firebase config loaded and initialized successfully!");
`;

fs.writeFileSync(path.join(dir, 'firebase-config.js'), config);
console.log('Successfully generated lib/firebase-config.js');
