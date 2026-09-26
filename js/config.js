// js/config.js
// Single shared place to point the frontend at the Node/Express API
// (js/server.js). Previously this was hardcoded to http://localhost:3000
// in two different files, which silently broke "Send to my email" and
// document uploads the moment the site was deployed anywhere else.
//
// Your actual setup: frontend on GitHub Pages, backend on Render — two
// different origins, so this MUST be a full absolute URL (a same-origin
// "" default would silently try to call GitHub Pages itself for /api/...
// and fail). Update this if you ever move the Render service.
export const API_BASE_URL = "https://web-email-server.onrender.com";

// Alternative setup: if you ever deploy js/server.js to serve this whole
// site itself (it can now — see the express.static line in server.js),
// frontend and backend share one origin and you can switch this back to
// an empty string: export const API_BASE_URL = "";

