/* =========================================
   WEBENROLL
   Main JavaScript & Navigation Logic
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.getElementById("menuButton");
    const closeButton = document.getElementById("closeButton");
    const mobileMenu = document.getElementById("mobileMenu");

    /* =========================================
       GLOBAL BROKEN IMAGE FALLBACK
    ========================================= */
    document.addEventListener('error', function (event) {
        if (event.target.tagName && event.target.tagName.toLowerCase() === 'img') {
            event.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80';
        }
    }, true);

    /* =========================================
       OPEN MENU
    ========================================= */
    function openMenu() {
        if (!mobileMenu || !menuButton) return;
        mobileMenu.classList.add("open");
        document.body.classList.add("menu-open");
        menuButton.setAttribute("aria-expanded", "true");
        mobileMenu.setAttribute("aria-hidden", "false");
    }

    /* =========================================
       CLOSE MENU
    ========================================= */
    function closeMenu() {
        if (!mobileMenu || !menuButton) return;
        mobileMenu.classList.remove("open");
        document.body.classList.remove("menu-open");
        menuButton.setAttribute("aria-expanded", "false");
        mobileMenu.setAttribute("aria-hidden", "true");
    }

    if (menuButton) menuButton.addEventListener("click", openMenu);
    if (closeButton) closeButton.addEventListener("click", closeMenu);

    if (mobileMenu) {
        const menuLinks = mobileMenu.querySelectorAll("a");
        menuLinks.forEach((link) => {
            link.addEventListener("click", closeMenu);
        });
    }

    /* =========================================
       ESC KEY & RESIZE
    ========================================= */
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && mobileMenu && mobileMenu.classList.contains("open")) {
            closeMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            closeMenu();
        }
    });

    // Note: header login-state updates (Sign In -> My Profile) are handled
    // by js/authGuard.js, which knows the real Firebase auth state.
});
