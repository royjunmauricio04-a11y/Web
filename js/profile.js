// js/profile.js
// Real profile-page logic for a logged-in student:
//   - Header info (name/email/avatar/track) from the Firestore profile
//     authGuard.js already fetched (no second Firebase app, no duplication).
//   - Requirements checklist, saved per-device in localStorage.
//   - Saved Colleges: real Firestore array (users/{uid}.savedColleges),
//     kept in sync with the Save button on colleges.html.
//   - My Applications: real Firestore query against "applications" — shows
//     an honest empty state instead of fake demo rows when there's nothing.
//   - Logout, via the AuthController authGuard.js exposes on window.

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;

// Escape text before placing it in innerHTML.
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// authGuard.js fires this once it has checked Firebase auth state and (for
// protected pages) loaded the student's Firestore profile document.
document.addEventListener("authReady", async (e) => {
  currentUser = e.detail.user;
  if (!currentUser) return; // authGuard.js already redirects to login.html

  const profile = e.detail.profile || {};
  renderHeader(currentUser, profile);
  await renderSavedColleges(profile.savedColleges || []);
  await renderApplications(currentUser.email);
});

document.addEventListener("DOMContentLoaded", () => {
  setupChecklistTracker();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const confirmLogout = confirm("Sigurado ka bang gusto mong mag-logout?");
      if (!confirmLogout) return;
      if (window.AuthController) {
        await window.AuthController.clearSession();
      } else {
        window.location.href = "login.html";
      }
    });
  }
});

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderHeader(user, profile) {
  const firstName = String(profile.firstName || profile.first_name || profile.givenName || "").trim();
  const middleName = String(profile.middleName || profile.middle_name || profile.middleInitial || "").trim();
  const lastName = String(profile.lastName || profile.last_name || profile.surname || "").trim();
  const displayName = String(profile.displayName || profile.fullName || profile.name || user.displayName || "").trim();

  let fullName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
  if (!fullName && displayName) fullName = displayName;

  const email = String(profile.email || user.email || "email@example.com").trim();
  if (!fullName) fullName = email.split("@")[0] || "Student";

  const avatarLetter = fullName.charAt(0).toUpperCase();
  const strand = profile.strand || profile.track || (profile.interests && profile.interests[0]) || "TVL - ICT";

  setText("userName", fullName);
  setText("userEmail", email);
  setText("userAvatar", avatarLetter);
  setText("userTrack", `${strand} Student`);
}

/* ---------------- Requirements checklist (per-device, localStorage) ---------------- */
function setupChecklistTracker() {
  const checkboxes = document.querySelectorAll(".checklist-item input");
  checkboxes.forEach((chk, index) => {
    const savedState = localStorage.getItem(`req_state_${index}`);
    if (savedState === "true") chk.checked = true;

    chk.addEventListener("change", () => {
      localStorage.setItem(`req_state_${index}`, chk.checked);
    });
  });
}

/* ---------------- Saved colleges (real, Firestore-backed) ---------------- */
async function renderSavedColleges(savedIds) {
  const listEl = document.getElementById("savedCollegesList");
  if (!listEl) return;

  if (!savedIds.length) {
    listEl.innerHTML = `<li class="empty-state">You haven't saved any colleges yet. <a href="colleges.html">Browse colleges</a> and tap "Save" on the ones you like.</li>`;
    return;
  }

  // Look up display names from Firestore's "colleges" collection.
  // Falls back to showing the raw ID if a name can't be found.
  let collegesById = {};
  try {
    const snap = await getDocs(collection(db, "colleges"));
    snap.forEach((d) => { collegesById[d.id] = d.data(); });
  } catch (err) {
    console.error("Could not load college names:", err);
  }

  listEl.innerHTML = savedIds.map((id) => {
    const college = collegesById[id];
    const name = college ? `${college.name}${college.shortName ? ` (${college.shortName})` : ""}` : id;
    return `
      <li class="saved-item" data-id="${esc(id)}">
        <span class="saved-item-title">${esc(name)}</span>
        <span class="saved-actions">
          <a href="college-detail.html?id=${encodeURIComponent(id)}" class="primary-button small">View</a>
          <button type="button" class="remove-saved-btn" data-id="${esc(id)}">Remove</button>
        </span>
      </li>
    `;
  }).join("");

  listEl.querySelectorAll(".remove-saved-btn").forEach((btn) => {
    btn.addEventListener("click", () => removeSavedCollege(btn.dataset.id));
  });
}

async function removeSavedCollege(collegeId) {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      savedColleges: arrayRemove(collegeId)
    });
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    const updatedIds = (snap.exists() && snap.data().savedColleges) || [];
    await renderSavedColleges(updatedIds);
  } catch (err) {
    console.error("Could not remove saved college:", err);
    alert("Could not remove this college right now. Please try again.");
  }
}

/* ---------------- My Applications (real, Firestore-backed, no fake data) ---------------- */
async function renderApplications(userEmail) {
  const listContainer = document.getElementById("user-applications-list");
  if (!listContainer) return;

  let myApps = [];
  try {
    const appsQuery = query(collection(db, "applications"), where("studentEmail", "==", userEmail));
    const querySnapshot = await getDocs(appsQuery);
    querySnapshot.forEach((docSnap) => myApps.push({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.error("Could not load applications:", err);
    listContainer.innerHTML = `<tr><td colspan="4" class="empty-state">Could not load your applications right now.</td></tr>`;
    return;
  }

  if (!myApps.length) {
    listContainer.innerHTML = `<tr><td colspan="4" class="empty-state">You have not submitted any enrollment applications yet.</td></tr>`;
    return;
  }

  listContainer.innerHTML = myApps.map((app) => `
    <tr>
      <td><strong>${esc(app.id)}</strong></td>
      <td>${esc(app.college || "N/A")}</td>
      <td>${esc(app.date || "Recently")}</td>
      <td><span class="status-badge ${esc((app.status || "pending").toLowerCase().replace(/[^a-z]/g, ""))}">${esc(app.status || "Pending")}</span></td>
    </tr>
  `).join("");
}
