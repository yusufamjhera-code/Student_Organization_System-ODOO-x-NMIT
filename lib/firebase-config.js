// Generated Firebase configuration (Safe for Client Bundle)
const firebaseConfig = {
  apiKey: "AIzaSyB8NsUhf21l2ABCWaZPaR-h6TWRhuF5IVg",
  authDomain: "passtrack-nmit.firebaseapp.com",
  projectId: "passtrack-nmit",
  storageBucket: "passtrack-nmit.firebasestorage.app",
  messagingSenderId: "232199724963",
  appId: "1:232199724963:web:054741718890dabe458416",
  measurementId: "G-543H79LR7E"
};

window.GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMr0fopLa-Eh4hY6yAeXkP6Vg8IPkIVHrnf5boaLdRRC2ditd2AjI--Aq-yg1_PqGBow/exec";

// Initialize Firebase using global compat SDK
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Global Firestore reference
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

console.log("Firebase config loaded and initialized successfully!");
