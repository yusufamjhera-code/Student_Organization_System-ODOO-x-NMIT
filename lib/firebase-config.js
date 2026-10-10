// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase using the global firebase object
firebase.initializeApp(firebaseConfig);

// Get a reference to the Firestore database service
const db = firebase.firestore();

// Google Apps Script URL for email dispatch (replace with your deployed GAS URL)
window.GOOGLE_SCRIPT_URL = window.GOOGLE_SCRIPT_URL || "YOUR_GOOGLE_SCRIPT_URL";

console.log("Firebase config loaded and initialized successfully!");
