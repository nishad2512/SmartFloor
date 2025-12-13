const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const togglePassword = document.getElementById("togglePassword");
const toggleIcon = document.getElementById("toggleIcon");

// Toggle password visibility
togglePassword.addEventListener("click", () => {
    const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    toggleIcon.textContent =
        type === "password" ? "visibility_off" : "visibility";
});

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function clearErrors() {
    emailError.classList.remove("show");
    passwordError.classList.remove("show");
    emailInput.classList.remove("input-error");
    passwordInput.classList.remove("input-error");
}

function showError(inputElement, errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add("show");
    inputElement.classList.add("input-error");
}

// Form validation on submit
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let isValid = true;

    // Validate email
    if (!email) {
        showError(emailInput, emailError, "Email is required");
        isValid = false;
    } else if (!validateEmail(email)) {
        showError(emailInput, emailError, "Please enter a valid email address");
        isValid = false;
    }

    // Validate password
    if (!password) {
        showError(passwordInput, passwordError, "Password is required");
        isValid = false;
    } else if (!validatePassword(password)) {
        showError(
            passwordInput,
            passwordError,
            "Password must be at least 6 characters"
        );
        isValid = false;
    }

    // Submit form if valid
    if (isValid) {
        loginForm.submit();
    }
});

// Real-time validation on blur
emailInput.addEventListener("blur", () => {
    const email = emailInput.value.trim();
    if (email && !validateEmail(email)) {
        showError(emailInput, emailError, "Please enter a valid email address");
    } else {
        emailError.classList.remove("show");
        emailInput.classList.remove("input-error");
    }
});

passwordInput.addEventListener("blur", () => {
    const password = passwordInput.value;
    if (password && !validatePassword(password)) {
        showError(
            passwordInput,
            passwordError,
            "Password must be at least 6 characters"
        );
    } else {
        passwordError.classList.remove("show");
        passwordInput.classList.remove("input-error");
    }
});
