// js/documents.js
// Lets a logged-in student upload their TOR, Enrollment Form, and TCR.
// Files are uploaded to our own Node/Express server (js/server.js), NOT
// Firebase Storage (that would require the paid Blaze plan). The server
// saves the file and returns a URL; we save that URL + status on the
// student's Firestore user doc so the admin dashboard can read it.

import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Point this at wherever js/server.js is actually running.
// Locally that's http://localhost:3000 — update it once you deploy the backend.
const API_BASE_URL = "http://localhost:3000";

const DOC_TYPES = ["tor", "ef", "tcr"];
const MAX_FILE_SIZE_MB = 10;

function setRowStatus(type, text, isError) {
  const statusEl = document.getElementById(`${type}Status`);
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#c0392b" : "#2f6fed";
}

async function handleUpload(type, file, uid) {
  if (!file) return;

  if (!file.type.includes("pdf") && !file.type.includes("image")) {
    setRowStatus(type, "Please upload a PDF or image file.", true);
    return;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    setRowStatus(type, `File is too large (max ${MAX_FILE_SIZE_MB}MB).`, true);
    return;
  }

  setRowStatus(type, "Uploading...", false);

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uid", uid);
    formData.append("docType", type);

    const response = await fetch(`${API_BASE_URL}/api/upload-document`, {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (!data.success) {
      setRowStatus(type, data.message || "Upload failed.", true);
      return;
    }

    await updateDoc(doc(db, "users", uid), {
      [`documents.${type}`]: {
        fileName: data.fileName,
        url: data.url,
        uploadedAt: new Date().toISOString()
      }
    });

    setRowStatus(type, `Uploaded: ${data.fileName}`, false);
  } catch (error) {
    console.error(`Upload error (${type}):`, error);
    setRowStatus(type, "Could not reach the server. Is js/server.js running?", true);
  }
}

document.addEventListener("authReady", (e) => {
  if (!e.detail.user) return;
  const uid = e.detail.user.uid;
  const profile = e.detail.profile || {};

  DOC_TYPES.forEach((type) => {
    const input = document.getElementById(`${type}Input`);
    if (!input) return;

    input.addEventListener("change", () => {
      handleUpload(type, input.files[0], uid);
    });

    // Show existing upload, if any, when the page loads.
    const existing = profile.documents && profile.documents[type];
    if (existing) {
      setRowStatus(type, `Uploaded: ${existing.fileName}`, false);
    }
  });
});
