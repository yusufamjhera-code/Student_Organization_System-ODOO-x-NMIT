// Generated Firebase configuration (Safe for Client Bundle)
// On Netlify, this file is dynamically generated at build time via setup-firebase.js using Netlify environment variables.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

window.GOOGLE_SCRIPT_URL = "YOUR_GOOGLE_SCRIPT_URL";

// Initialize Firebase using global compat SDK
if (typeof firebase !== 'undefined' && !firebase.apps.length && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
  firebase.initializeApp(firebaseConfig);
}

// Global Firestore reference
const db = typeof firebase !== 'undefined' && firebase.apps.length ? firebase.firestore() : null;

console.log("Firebase config loaded.");
