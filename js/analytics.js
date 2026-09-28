// js/analytics.js
// Background usability/activity tracking for the research study.
// Events are linked to the signed-in Firebase user whenever auth is available.

import { auth, db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function getSessionId() {
  let sid = sessionStorage.getItem("compass_session_id");
  if (!sid) {
    sid = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem("compass_session_id", sid);
  }
  return sid;
}

function getCurrentUserSnapshot() {
  const user = auth.currentUser;
  const profile = window.currentUserProfile || {};

  if (!user) {
    return {
      userId: null,
      userEmail: null,
      userName: null,
      authenticated: false
    };
  }

  const firstName = profile.firstName || profile.first_name || "";
  const middleName = profile.middleName || profile.middle_name || "";
  const lastName = profile.lastName || profile.last_name || "";
  const userName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim()
    || profile.fullName
    || profile.name
    || user.displayName
    || null;

  return {
    userId: user.uid,
    userEmail: user.email || profile.email || null,
    userName,
    authenticated: true
  };
}

async function logEvent(type, extra = {}) {
  try {
    const identity = getCurrentUserSnapshot();
    await addDoc(collection(db, "analytics_events"), {
      sessionId: getSessionId(),
      userId: identity.userId,
      userEmail: identity.userEmail,
      userName: identity.userName,
      authenticated: identity.authenticated,
      type,
      page: window.location.pathname.split("/").pop() || "index.html",
      timestamp: new Date().toISOString(),
      ...extra
    });
  } catch (err) {
    // Never let tracking failures affect the student's experience.
    console.error("Analytics log failed:", err);
  }
}

// These return the write's promise so a page can `await` it before
// navigating away (otherwise the browser cancels the write and the
// "completed" event is lost, making completion rates look wrong).
export function trackTaskStart(taskName) {
  return logEvent("task_start", { taskName });
}

export function trackTaskComplete(taskName) {
  return logEvent("task_end", { taskName, outcome: "completed" });
}

export function trackError(taskName, message) {
  return logEvent("error", { taskName, message: String(message).slice(0, 300) });
}

// Wait for a tracking write, but never longer than ms (never block the student).
export function settle(promise, ms = 2000) {
  return Promise.race([
    Promise.resolve(promise).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, ms))
  ]);
}

// Track a page view whenever this module is loaded.
export function trackPageView(pageName = null) {
  logEvent("page_view", {
    pageName: pageName || window.location.pathname.split("/").pop() || "index.html"
  });
}

// Catch-all: any unexpected JavaScript error on the page counts toward
// Error Frequency too, not just the ones explicitly tracked.
window.addEventListener("error", (e) => {
  logEvent("error", { taskName: "javascript", message: String(e.message).slice(0, 300) });
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
  logEvent("error", { taskName: "javascript", message: String(msg).slice(0, 300) });
});

// Delay the initial page-view slightly so Firebase Auth has a chance to
// restore the signed-in user before the event is written.
setTimeout(() => trackPageView(), 700);
