import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANUVSkxZSF74Qn9qR90vDG6WBfAXc6Pnk",
  authDomain: "dti-lab-project-portal.firebaseapp.com",
  projectId: "dti-lab-project-portal",
  storageBucket: "dti-lab-project-portal.firebasestorage.app",
  messagingSenderId: "151527193501",
  appId: "1:151527193501:web:a4379deb498e6e51c2cd74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Export app for use in other modules
export default app;

