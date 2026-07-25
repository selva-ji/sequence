// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries
  import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDgmzAySpZYxnk0v32LMJkj10lro1PluqE",
    authDomain: "sequence-94ab3.firebaseapp.com",
    projectId: "sequence-94ab3",
    storageBucket: "sequence-94ab3.firebasestorage.app",
    messagingSenderId: "139857839559",
    appId: "1:139857839559:web:8ba4fa4a83caa2a67285e2"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  const db = getFirestore(app);

/**
 * Saves the current sequence data to Firestore.
 */
export async function saveToCloud(trimbleProjectId, data) {
    if (!trimbleProjectId) return;
    
    try {
        const docRef = doc(db, "projects", trimbleProjectId);
        await setDoc(docRef, data);
        console.log("Cloud sync complete.");
    } catch (error) {
        console.error("Firebase Save Error:", error);
        if (window.showToast) window.showToast("Cloud sync failed.", "error");
    }
}

/**
 * Fetches the sequence data for the current Trimble Connect Project ID.
 */
export async function loadFromCloud(trimbleProjectId) {
    if (!trimbleProjectId) return null;

    try {
        const docRef = doc(db, "projects", trimbleProjectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null; // No data exists for this project yet
        }
    } catch (error) {
        console.error("Firebase Load Error:", error);
        if (window.showToast) window.showToast("Failed to load cloud data.", "error");
        return null;
    }
}
