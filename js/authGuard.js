// js/authGuard.js
// Load this (as type="module") on every page. It decides, per page, what
// "logged in" should mean for that page:
//
//   - colleges.html / profile.html  -> PROTECTED: bounce to login.html if
//                                       nobody is signed in.
//   - login.html / signup.html      -> if you're ALREADY signed in, skip
//                                       straight to colleges.html.
//   - index.html (and anything else)-> PUBLIC: just update the header
//                                       (Sign In/Get Started -> My Profile).
//
// It also fetches the student's Firestore profile doc and stores it on
// window.currentUserProfile, and fires a "authReady" event so a page's own
// inline script (e.g. profile.html) can react once the check is done.

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const path = window.location.pathname.toLowerCase();
const isProtectedPage = path.endsWith("colleges.html") || path.endsWith("profile.html");
const isAuthPage = path.endsWith("login.html") || path.endsWith("signup.html");

function updateHeaderForLoggedInUser() {
  const headerActions = document.getElementById("headerActions");
  if (headerActions) {
    headerActions.innerHTML = `<a href="profile.html" class="primary-button small">My Profile</a>`;
  }
  const mobileSignIn = document.getElementById("mobileSignIn");
  if (mobileSignIn) mobileSignIn.style.display = "none";
  const mobileSignUp = document.getElementById("mobileSignUp");
  if (mobileSignUp) {
    mobileSignUp.href = "profile.html";
    mobileSignUp.textContent = "My Profile";
  }
  const heroCta = document.getElementById("heroCta");
  if (heroCta) {
    heroCta.href = "profile.html";
    heroCta.textContent = "My Profile";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (isProtectedPage) {
      window.location.href = "login.html";
    }
    // On public/auth pages with nobody logged in, there's nothing else to do.
    document.dispatchEvent(new CustomEvent("authReady", { detail: { user: null, profile: null } }));
    return;
  }

  // Somebody is logged in.
  // signup.js sets this flag while it is still saving the student's profile
  // to Firestore. Redirecting now would cancel that write and leave an Auth
  // account with no profile (which is why the admin Students table and
  // charts stayed empty). signup.js redirects by itself when it's done.
  if (window.__signupInProgress) return;

  if (isAuthPage) {
    window.location.href = "colleges.html";
    return;
  }

  updateHeaderForLoggedInUser();

  let profile = null;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      profile = snap.data();
    } else {
      // Self-heal: an Auth account exists but its Firestore profile is
      // missing (e.g. created before this fix). Create a minimal student
      // profile so the student shows up in the admin dashboard.
      const [first = "", ...rest] = (user.displayName || "").trim().split(" ");
      const minimal = {
        uid: user.uid,
        role: "student",
        firstName: first,
        lastName: rest.join(" "),
        email: (user.email || "").toLowerCase(),
        createdAt: user.metadata && user.metadata.creationTime
          ? new Date(user.metadata.creationTime).toISOString()
          : new Date().toISOString(),
        profileComplete: false
      };
      try {
        await setDoc(doc(db, "users", user.uid), minimal);
        profile = minimal;
      } catch (createErr) {
        console.error("Could not create missing profile:", createErr);
      }
    }
  } catch (err) {
    console.error("Could not load profile from Firestore:", err);
  }
  window.currentUserProfile = profile;
  document.dispatchEvent(new CustomEvent("authReady", { detail: { user, profile } }));
});

// Backward-compatible logout helper for the button in profile.html.
window.AuthController = {
  clearSession: async () => {
    await signOut(auth);
    window.location.href = "login.html";
  }
};
