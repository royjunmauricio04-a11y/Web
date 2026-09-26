import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { trackTaskStart, trackTaskComplete, trackError } from "./analytics.js";

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("signupForm");
    if (!form) return;

    trackTaskStart("signup");

    /* =========================================
       SETTINGS & ELEMENTS
    ========================================= */
    const steps = Array.from(document.querySelectorAll(".signup-step"));
    const TOTAL_STEPS = steps.length;
    let currentStep = 1;

    const nextButtons = document.querySelectorAll("[data-next]");
    const backButtons = document.querySelectorAll("[data-back]");
    const stepLabel = document.getElementById("stepLabel");
    const progressPercent = document.getElementById("progressPercent");
    const progressFill = document.getElementById("progressFill");
    const formError = document.getElementById("formError");

    showStep(currentStep);

    /* =========================================
       NEXT & BACK NAVIGATION
    ========================================= */
    nextButtons.forEach(button => {
        button.addEventListener("click", () => {
            const step = getCurrentStepElement();
            if (!step || !validateStep(step)) return;

            if (currentStep < TOTAL_STEPS) {
                currentStep++;
                showStep(currentStep);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    });

    backButtons.forEach(button => {
        button.addEventListener("click", () => {
            clearError();
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    });

    /* =========================================
       SUBMIT / CREATE ACCOUNT (FIREBASE INTEGRATED)
    ========================================= */
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearError();

        const step = getCurrentStepElement();
        if (!validateStep(step) || !validatePassword() || !validateTerms()) {
            return;
        }

        const email = getValue("email").toLowerCase();
        const password = document.getElementById("password").value;

        try {
            // Step A: Create User sa Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Step B: Kunan ng data ang onboarding steps at i-save sa Firestore Database
            const accountData = buildAccountData(user.uid);
            await setDoc(doc(db, "users", user.uid), accountData);

            alert("Matagumpay ang paglikha ng iyong account!");
            trackTaskComplete("signup");
            window.location.href = "login.html";

        } catch (error) {
            console.error("Firebase Registration Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                showError("May nakarehistro nang account sa email na ito.");
                trackError("signup", "email-already-in-use");
            } else {
                showError("Error sa paggawa ng account: " + error.message);
                trackError("signup", error.message);
            }
        }
    });

    /* =========================================
       HELPER FUNCTIONS
    ========================================= */
    function showStep(stepNumber) {
        steps.forEach(step => {
            const number = Number(step.dataset.step);
            if (number === stepNumber) {
                step.classList.add("active");
                step.removeAttribute("hidden");
            } else {
                step.classList.remove("active");
                step.setAttribute("hidden", "");
            }
        });
        updateProgress(stepNumber);
        clearError();
    }

    function getCurrentStepElement() {
        return document.querySelector(`.signup-step[data-step="${currentStep}"]`);
    }

    function updateProgress(stepNumber) {
        const percentage = Math.round((stepNumber / TOTAL_STEPS) * 100);
        if (stepLabel) stepLabel.textContent = `Step ${stepNumber} of ${TOTAL_STEPS}`;
        if (progressPercent) progressPercent.textContent = `${percentage}%`;
        if (progressFill) progressFill.style.width = `${percentage}%`;
    }

    function validateStep(step) {
        if (!step) return false;
        clearError();
        const stepNumber = Number(step.dataset.step);

        const fields = step.querySelectorAll("input, select, textarea");
        for (const field of fields) {
            if (field.type === "radio") continue;
            if (field.type === "checkbox" && !field.required) continue;
            if (!field.checkValidity()) {
                field.reportValidity();
                field.focus();
                return false;
            }
        }

        if (stepNumber === 1) {
            const firstName = document.getElementById("firstName");
            const lastName = document.getElementById("lastName");
            if (!firstName || firstName.value.trim().length < 2) {
                showError("Please enter your first name.");
                return false;
            }
            if (!lastName || lastName.value.trim().length < 2) {
                showError("Please enter your last name.");
                return false;
            }
        }

        if (stepNumber === 2) {
            const lrn = document.getElementById("lrn");
            if (lrn) {
                const cleanLRN = lrn.value.replace(/\D/g, "").slice(0, 12);
                lrn.value = cleanLRN;
                if (cleanLRN.length !== 12) {
                    showError("Your LRN must contain exactly 12 digits.");
                    return false;
                }
            }
        }

        if (stepNumber === 3 && getCheckedValues("interest").length === 0) {
            showError("Please select at least one field of interest.");
            return false;
        }

        if (stepNumber === 4 && !getCheckedValue("location")) {
            showError("Please select your preferred study location.");
            return false;
        }

        if (stepNumber === 5 && !getCheckedValue("schoolType")) {
            showError("Please select a school type preference.");
            return false;
        }

        if (stepNumber === 6) {
            if (getCheckedValues("priority").length === 0) {
                showError("Please select at least one priority.");
                return false;
            }
            const financialAid = document.getElementById("financialAid");
            if (financialAid && !financialAid.value) {
                showError("Please select your financial assistance preference.");
                return false;
            }
        }

        if (stepNumber === 7) {
            const email = document.getElementById("email");
            if (!email || !email.checkValidity()) {
                showError("Please enter a valid email address.");
                return false;
            }
        }
        return true;
    }

    function validatePassword() {
        const password = document.getElementById("password");
        const confirmPassword = document.getElementById("confirmPassword");
        if (!password || !confirmPassword) return false;
        if (password.value.length < 8) {
            showError("Your password must contain at least 8 characters.");
            return false;
        }
        if (password.value !== confirmPassword.value) {
            showError("Your passwords do not match.");
            return false;
        }
        return true;
    }

    function validateTerms() {
        const terms = document.getElementById("terms");
        if (!terms || !terms.checked) {
            showError("Please agree to the terms before creating your account.");
            return false;
        }
        return true;
    }

    function buildAccountData(uid) {
        return {
            uid: uid,
            role: "student",
            firstName: getValue("firstName"),
            middleName: getValue("middleName"),
            lastName: getValue("lastName"),
            lrn: getValue("lrn"),
            birthDate: getValue("birthDate"),
            gradeLevel: getValue("gradeLevel"),
            school: getValue("school"),
            interests: getCheckedValues("interest"),
            location: getCheckedValue("location"),
            schoolType: getCheckedValue("schoolType"),
            priorities: getCheckedValues("priority"),
            financialAid: getValue("financialAid"),
            email: getValue("email").toLowerCase(),
            createdAt: new Date().toISOString(),
            profileComplete: true
        };
    }

    function getValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : "";
    }

    function getCheckedValues(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);
    }

    function getCheckedValue(name) {
        const selected = document.querySelector(`input[name="${name}"]:checked`);
        return selected ? selected.value : "";
    }

    function showError(message) {
        trackError("signup", message);
        if (!formError) { alert(message); return; }
        formError.textContent = message;
        formError.hidden = false;
        formError.classList.add("show");
        formError.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function clearError() {
        if (!formError) return;
        formError.textContent = "";
        formError.hidden = true;
        formError.classList.remove("show");
    }

    // Dynamic LRN Filter
    const lrnInput = document.getElementById("lrn");
    if (lrnInput) {
        lrnInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "").slice(0, 12);
        });
    }

    form.addEventListener("input", e => {
        if (e.target.matches("input, select, textarea")) clearError();
    });
});
