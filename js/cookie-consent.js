// js/cookie-consent.js
// A small, self-contained cookie/privacy notice. Loads on every page,
// remembers the student's choice in localStorage, and links to the
// full Privacy Policy page for anyone who wants details.

(function () {
  const CONSENT_KEY = "compass_cookie_consent"; // "accepted" | "declined"

  function alreadyChosen() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (e) {
      return null; // localStorage unavailable (private mode, etc.)
    }
  }

  function saveChoice(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch (e) {
      // Ignore — worst case we ask again next visit.
    }
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #cookieConsentBanner {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        background: #1c2430;
        color: #f3f5f8;
        padding: 18px 20px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 14px;
        font-size: 14px;
        box-shadow: 0 -4px 18px rgba(0,0,0,0.18);
      }
      #cookieConsentBanner p {
        margin: 0;
        max-width: 560px;
        line-height: 1.5;
        color: #dfe4ea;
      }
      #cookieConsentBanner a {
        color: #7db2ff;
        text-decoration: underline;
      }
      #cookieConsentBanner .cc-actions {
        display: flex;
        gap: 10px;
        flex-shrink: 0;
      }
      #cookieConsentBanner button {
        border: none;
        border-radius: 8px;
        padding: 10px 18px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      #cookieConsentBanner .cc-accept {
        background: #2f6fed;
        color: #fff;
      }
      #cookieConsentBanner .cc-decline {
        background: transparent;
        color: #dfe4ea;
        border: 1px solid #4a5568;
      }
      @media (max-width: 640px) {
        #cookieConsentBanner {
          flex-direction: column;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function showBanner() {
    injectStyles();
    const banner = document.createElement("div");
    banner.id = "cookieConsentBanner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie and privacy notice");
    banner.innerHTML = `
      <p>
        We use cookies and local storage to keep you signed in and remember your
        checklist progress. We don't sell your data or share it with advertisers.
        Read our <a href="privacy-policy.html">Privacy Policy</a> to learn more.
      </p>
      <div class="cc-actions">
        <button type="button" class="cc-decline" id="cookieDeclineBtn">Decline optional</button>
        <button type="button" class="cc-accept" id="cookieAcceptBtn">Accept</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById("cookieAcceptBtn").addEventListener("click", () => {
      saveChoice("accepted");
      banner.remove();
    });
    document.getElementById("cookieDeclineBtn").addEventListener("click", () => {
      saveChoice("declined");
      banner.remove();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!alreadyChosen()) {
      showBanner();
    }
  });
})();
