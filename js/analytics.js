// js/analytics.js
// Automatic, background usability tracking for the research study.
// Students don't see or do anything — every page that loads this file
// quietly logs task start/finish/error events to Firestore, tagged with
// a per-browser-tab session ID. The admin dashboard reads this collection
// to compute Time on Task, Error Frequency, and Task Completion Rate.

import { db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function getSessionId() {
  let sid = sessionStorage.getItem("compass_session_id");
  if (!sid) {
    sid = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem("compass_session_id", sid);
  }
  return sid;
}

async function logEvent(type, extra = {}) {
  try {
    await addDoc(collection(db, "analytics_events"), {
      sessionId: getSessionId(),
      type, // "task_start" | "task_end" | "error"
      page: window.location.pathname.split("/").pop() || "index.html",
      timestamp: new Date().toISOString(),
      ...extra
    });
  } catch (err) {
    // Never let tracking failures affect the student's experience.
    console.error("Analytics log failed:", err);
  }
}

export function trackTaskStart(taskName) {
  logEvent("task_start", { taskName });
}

export function trackTaskComplete(taskName) {
  logEvent("task_end", { taskName, outcome: "completed" });
}

export function trackError(taskName, message) {
  logEvent("error", { taskName, message: String(message).slice(0, 300) });
}

// Catch-all: any unexpected JavaScript error on the page counts toward
// Error Frequency too, not just the ones we explicitly track.
window.addEventListener("error", (e) => {
  logEvent("error", { taskName: "javascript", message: String(e.message).slice(0, 300) });
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
  logEvent("error", { taskName: "javascript", message: String(msg).slice(0, 300) });
});
