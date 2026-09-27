// js/auth.js
// Real Firebase sign-in for login.html only.
// (Auto-redirect if you're already logged in, or page protection for other
// pages, is handled centrally by authGuard.js.)

import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { trackTaskStart, trackTaskComplete, trackError } from "./analytics.js";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePassword");
const forgotPasswordLink = document.getElementById("forgotPassword");
const rememberCheckbox = document.getElementById("remember");

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
  loginError.classList.add("show");
}

function hideLoginError() {
  if (!loginError) return;
  loginError.hidden = true;
  loginError.classList.remove("show");
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideLoginError();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      // Remember me checked -> stay signed in after the browser closes.
      // Unchecked -> session-only, cleared when the tab/browser closes.
      const persistence = rememberCheckbox && rememberCheckbox.checked
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(auth, persistence);

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

/* Show / Hide password toggle */
if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePasswordBtn.textContent = isHidden ? "Hide" : "Show";
    togglePasswordBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
}

/* Forgot password -> Firebase password reset email */
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (e) => {
    e.preventDefault();
    hideLoginError();

    const emailField = document.getElementById("email");
    const email = emailField ? emailField.value.trim() : "";

    if (!email) {
      showLoginError("Enter your email address above first, then click \"Forgot password?\" again.");
      if (emailField) emailField.focus();
      return;
    }

    const originalText = forgotPasswordLink.textContent;
    forgotPasswordLink.textContent = "Sending...";
    try {
      await sendPasswordResetEmail(auth, email);
      if (loginError) {
        loginError.style.color = "#1c7a34";
        loginError.textContent = `Password reset link sent to ${email}. Check your inbox (and spam folder).`;
        loginError.hidden = false;
        loginError.classList.add("show");
      } else {
        alert(`Password reset link sent to ${email}.`);
      }
      trackTaskComplete("forgot_password");
    } catch (error) {
      console.error("Password reset error:", error.code);
      let message = "Could not send reset email. Please try again.";
      if (error.code === "auth/invalid-email") message = "Please enter a valid email address.";
      if (error.code === "auth/user-not-found") message = "No account found with that email.";
      if (loginError) {
        loginError.style.color = "";
        loginError.textContent = message;
        loginError.hidden = false;
        loginError.classList.add("show");
      } else {
        alert(message);
      }
      trackError("forgot_password", error.code || error.message);
    } finally {
      forgotPasswordLink.textContent = originalText;
    }
  });
}
