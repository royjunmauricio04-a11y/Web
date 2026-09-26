import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration ng WebEnroll App
const firebaseConfig = {
  apiKey: "AIzaSyC2NADIO_38zC6TadCHPZpilaOacTFiJ4A",
  authDomain: "webenrollapp.firebaseapp.com",
  projectId: "webenrollapp",
  storageBucket: "webenrollapp.firebasestorage.app",
  messagingSenderId: "563093291937",
  appId: "1:563093291937:web:cefe2c21e185f9fcf501e0",
  measurementId: "G-YK6ED35JMS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {

    // 1. Firebase Auth Observer: Siguraduhing naka-login ang user
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadUserProfile(user);
            await renderUserApplications(user.email);
        } else {
            // Pag hindi naka-login, ibalik sa login page
            window.location.href = 'login.html';
        }
    });

    // 2. Application Requirements Tracker (Save/Load Checkbox state)
    setupChecklistTracker();

    // 3. Logout Handler
    const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const confirmLogout = confirm("Sigurado ka bang gusto mong mag-logout?");
            if (confirmLogout) {
                try {
                    await signOut(auth);
                    localStorage.removeItem('currentUser');
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error("Logout Error:", error);
                    alert("Error sa pag-logout: " + error.message);
                }
            }
        });
    }
});

// Load Profile details mula sa Firestore at Auth user
async function loadUserProfile(authUser) {
    const userEmail = authUser.email || 'student@example.com';
    const initial = userEmail.charAt(0).toUpperCase();

    let userData = {
        id: authUser.uid,
        email: userEmail,
        fullName: userEmail.split('@')[0],
        track: 'TVL - ICT Student'
    };

    try {
        const userRef = doc(db, "users", authUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const firestoreData = userSnap.data();
            const nameParts = [firestoreData.firstName, firestoreData.middleName, firestoreData.lastName].filter(Boolean).join(' ');
            userData.fullName = nameParts || firestoreData.fullName || userData.fullName;
            userData.id = firestoreData.lrn || authUser.uid;
            
            if (firestoreData.gradeLevel) {
                userData.track = `${firestoreData.gradeLevel} Student`;
            } else if (firestoreData.school) {
                userData.track = firestoreData.school;
            }
        }
    } catch (error) {
        console.error("Error fetching Firestore user profile:", error);
    }

    // Populating elements (Sinuportahan ang dalawang uri ng HTML ID structure)
    setElementText(['userName', 'profile-name'], userData.fullName);
    setElementText(['userEmail', 'profile-email'], userData.email);
    setElementText(['userAvatar', 'user-avatar'], initial);
    setElementText(['userTrack', 'profile-role-badge'], userData.track);
    setElementText(['profile-id'], userData.id);
}

// Checklist Progress Tracker
function setupChecklistTracker() {
    const checkboxes = document.querySelectorAll('.checklist-item input');
    checkboxes.forEach((chk, index) => {
        const savedState = localStorage.getItem(`req_state_${index}`);
        if (savedState === 'true') chk.checked = true;

        chk.addEventListener('change', () => {
            localStorage.setItem(`req_state_${index}`, chk.checked);
        });
    });
}

// Render Submitted Applications mula sa Firestore (o localStorage fallback)
async function renderUserApplications(userEmail) {
    const listContainer = document.getElementById('user-applications-list');
    if (!listContainer) return;

    let myApps = [];

    try {
        const appsQuery = query(collection(db, "applications"), where("studentEmail", "==", userEmail));
        const querySnapshot = await getDocs(appsQuery);
        querySnapshot.forEach((docSnap) => {
            myApps.push({ id: docSnap.id, ...docSnap.data() });
        });
    } catch (error) {
        console.warn("Firestore apps fetch failed, checking localStorage fallback...", error);
    }

    // Fallback sa localStorage kung wala pang record sa Firestore
    if (myApps.length === 0) {
        const allApplications = JSON.parse(localStorage.getItem('app_all_applications')) || [
            { id: 'APP-101', studentEmail: userEmail, college: 'Department of Computer Science', status: 'Pending', date: '2026-02-15' },
            { id: 'APP-102', studentEmail: userEmail, college: 'School of Business Analytics', status: 'Approved', date: '2026-02-14' }
        ];
        myApps = allApplications.filter(app => app.studentEmail === userEmail || app.studentName === userEmail);
    }

    if (myApps.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted, #64748b); padding: 1.5rem;">
                    You have not submitted any enrollment applications yet.
                </td>
            </tr>
        `;
        return;
    }

    listContainer.innerHTML = myApps.map(app => `
        <tr>
            <td><strong>${app.id}</strong></td>
            <td>${app.college || 'N/A'}</td>
            <td>${app.date || 'Recently'}</td>
            <td>
                <span class="status-badge ${(app.status || 'pending').toLowerCase()}">
                    ${app.status || 'Pending'}
                </span>
            </td>
        </tr>
    `).join('');
}

// Helper function para maglagay ng text gamit ang mga posibleng IDs
function setElementText(ids, text) {
    const idList = Array.isArray(ids) ? ids : [ids];
    for (const id of idList) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
            break;
        }
    }
}
