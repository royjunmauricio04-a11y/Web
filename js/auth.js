// js/auth.js
// Real Firebase sign-in for login.html only.
// (Auto-redirect if you're already logged in, or page protection for other
// pages, is handled centrally by authGuard.js.)

import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { trackTaskStart, trackTaskComplete, trackError } from "./analytics.js";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

if (loginForm) {
  trackTaskStart("login");
}

function showLoginError(message) {
  trackError("login", message);
  if (!loginError) {
    alert(message);
    return;
  }
  loginError.textContent = message;
  loginError.hidden = false;
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) loginError.hidden = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      trackTaskComplete("login");
      window.location.href = "colleges.html";
    } catch (error) {
      console.error("Login error:", error.code);
      let message = "Something went wrong. Please try again.";
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        message = "Incorrect email or password.";
      } else if (error.code === "auth/user-not-found") {
        message = "No account found with that email.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please wait a moment and try again.";
      }
      showLoginError(message);
    }
  });
}
