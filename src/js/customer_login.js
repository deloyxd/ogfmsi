import global from "./_global.js";

export function showTermsAndConditions() {
  const termsContainer = document.querySelector(".terms-container");
  termsContainer.classList.remove("hidden");
  Swal.fire({
    width: "600px",
    html: termsContainer.innerHTML,
    showConfirmButton: true,
    confirmButtonText: "Accept & Continue",
    confirmButtonColor: "#ea580c",
    allowOutsideClick: false,
    allowEscapeKey: false,
    background: "#ffffff",
    preConfirm: () => {
      const agreeCheckbox = Swal.getPopup().querySelector("#agreeCheckbox");
      if (!agreeCheckbox.checked) {
        Swal.showValidationMessage("You must agree to the terms to proceed");
      }
      return agreeCheckbox.checked;
    },
    willClose: () => {
      termsContainer.classList.add("hidden");
    },
  });
}

export default {
  showTermsAndConditions,
};

function checkIfJsShouldNotRun(id) {
  let result = false;
  result = document.getElementById(id) == null;
  return result;
}

const sanitizeInput = (input) => {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

const username = document.getElementById("username");
const password = document.getElementById("password");
const fullName = document.getElementById("fullName");
const fullNameField = document.getElementById("fullNameField");
const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const toggleText = document.getElementById("toggleText");
const toggleButton = document.getElementById("toggleForm");
const welcomeText = document.getElementById("welcomeText");

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const showPasswordButton = document.getElementById("showPassword");

  resetInputFields();

  loginForm.addEventListener("submit", submitClicked);
  showPasswordButton.addEventListener("click", showPasswordClicked);
  toggleButton.addEventListener("click", toggleFormClicked);
}

function resetInputFields() {
  username.value = "";
  password.value = "";
  fullName.value = "";
}

async function submitClicked(e) {
  e.preventDefault();

  const submitBtn =
    document.getElementById("loginForm").lastChild.previousSibling;
  console.log(submitBtn);
  const isLoginMode = formTitle.textContent.includes("Sign in");
  const sanitizedUsername = sanitizeInput(username.value.trim());
  const sanitizedPassword = password.value;
  const sanitizedFullName = isLoginMode
    ? ""
    : sanitizeInput(fullName.value.trim());

  const oldSubmitBtn = submitBtn.innerHTML;
  submitBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>`;
  submitBtn.disabled = true;
  try {
    const endpoint = isLoginMode ? "/login" : "/register";
    const requestBody = isLoginMode
      ? { username: sanitizedUsername, password: sanitizedPassword }
      : {
          full_name: sanitizedFullName,
          username: sanitizedUsername,
          password: sanitizedPassword,
        };

    const response = await fetch(`${global.API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (response.ok) {
      global.playSFX("success-sfx");

      if (isLoginMode) {
        sessionStorage.setItem("full_name", data.user.full_name);

        Toastify({
          text: "Login successful!",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "center",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
          callback: () =>
            (window.location.href =
              "/src/modules_html/customer_side/dashboard.html"),
        }).showToast();
      } else {
        Toastify({
          text: "Your account has been created successfully!",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "center",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
          callback: toggleForms,
        }).showToast();
      }
    } else {
      Toastify({
        text:
          data.error ||
          (isLoginMode
            ? "Login Failed. Please check your credentials."
            : "Registration Failed. Please try again."),
        duration: 3000,
        close: true,
        gravity: "top",
        position: "center",
        backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true,
      }).showToast();
    }
  } catch (error) {
    global.playSFX("error-sfx");

    /* 💀 DANGEROUS 💀 REMOVE BEFORE DEPLOYING TO PRODUCTION */
    // console.error("API Error:", error); // 👈
    /* 💀 DANGEROUS 💀 REMOVE BEFORE DEPLOYING TO PRODUCTION */

    Swal.fire({
      title: "Oops!",
      text: "Something went wrong. Please try again later.",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#ef4444",
      background: "#fef2f2",
      iconColor: "#b91c1c",
      color: "#7f1d1d",
    });
  }

  submitBtn.innerHTML = oldSubmitBtn;
  submitBtn.disabled = false;
}

function showPasswordClicked() {
  const type =
    password.getAttribute("type") === "password" ? "text" : "password";
  password.setAttribute("type", type);

  this.querySelector("i").classList.toggle("fa-eye");
  this.querySelector("i").classList.toggle("fa-eye-slash");
}

function toggleFormClicked(e) {
  e.preventDefault();

  resetInputFields();

  const isLoginMode = formTitle.textContent.includes("Sign in");

  // 🔑 CLIENT
  formTitle.textContent = isLoginMode
    ? "Create Account"
    : "Sign in to an Account";
  formSubtitle.textContent = isLoginMode
    ? "Join us and start your fitness journey"
    : "Start your fitness journey today";

  toggleText.textContent = isLoginMode
    ? "Already have an account?"
    : "Don't have an account?";
  toggleButton.innerHTML =
    (isLoginMode ? "Sign in here " : "Sign up for free ") +
    `<span class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>`;

  updatePanelText(isLoginMode);

  fullNameField.classList.toggle("hidden", !isLoginMode);
}

function updatePanelText(isLoginMode) {
  welcomeText.innerHTML = isLoginMode
    ? `<div class="space-y-4">
              <div
                class="inline-block px-4 py-2 bg-white bg-opacity-20 rounded-full text-white text-sm font-medium backdrop-blur-sm"
              >
                <!-- 🔑 CLIENT -->
                🤸‍♀️ Join Our Community
              </div>
              <h1
                class="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight tracking-tight uppercase"
              >
                Hello,<br />
                <!-- 🔑 CLIENT -->
                <span class="bg-gradient-to-r from-yellow-300 to-orange-100 bg-clip-text text-transparent drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] uppercase">Friend!</span>
              </h1>
              <p class="text-white text-xl sm:text-2xl opacity-90 font-light">
                <!-- 🔑 CLIENT -->
                Fill in your details and start your<br />journey with us today.
              </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 pt-6 sm:justify-center lg:justify-start">
              <!-- 🔑 CLIENT (items) -->
              <div class="flex items-center space-x-3 text-white">
                <div
                  class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                        <i class="fas fa-user-plus text-white"></i>
                </div>
                <div>
                  <p class="font-semibold">Quick Registration</p>
                  <p class="text-sm opacity-75">Join in seconds</p>
                </div>
              </div>
              <div class="flex items-center space-x-3 text-white">
                <div
                  class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                        <i class="fas fa-gift text-white"></i>
                </div>
                <div>
                  <p class="font-semibold">Book now</p>
                  <p class="text-sm opacity-75">Start your journey</p>
                </div>
              </div>
            </div>
          </div>`
    : `<div class="space-y-4">
              <div
                class="inline-block px-4 py-2 bg-white bg-opacity-20 rounded-full text-white text-sm font-medium backdrop-blur-sm"
              >
                <!-- 🔑 CLIENT -->
                🏋️‍♀️ Premium Fitness Experience
              </div>
              <h1
                class="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight tracking-tight uppercase"
              >
                Welcome to<br />
                <!-- 🔑 CLIENT -->
                <span class="bg-gradient-to-r from-yellow-300 to-orange-100 bg-clip-text text-transparent drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] uppercase">Fitworx Gym</span>
              </h1>
              <p class="text-white text-xl sm:text-2xl opacity-90 font-light">
                <!-- 🔑 CLIENT -->
                Transform your body, transform your<br />life with our premium
                fitness experience.
              </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 pt-6 sm:justify-center lg:justify-start">
              <!-- 🔑 CLIENT (items) -->
              <div class="flex items-center space-x-3 text-white">
                <div
                  class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                  <i class="fas fa-dumbbell text-white"></i>
                </div>
                <div>
                  <p class="font-semibold">State-of-art Equipment</p>
                  <p class="text-sm opacity-75">Latest fitness technology</p>
                </div>
              </div>
              <div class="flex items-center space-x-3 text-white">
                <div
                  class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                  <i class="fas fa-users text-white"></i>
                </div>
                <div>
                  <p class="font-semibold">Freelance Trainers</p>
                  <p class="text-sm opacity-75">Professional guidance</p>
                </div>
              </div>
            </div>
          </div>`;
}

document.addEventListener("DOMContentLoaded", function () {
  if (checkIfJsShouldNotRun("customer_login")) return;
  setupLoginForm();
  updatePanelText(false);
  showTermsAndConditions();
  /* call newly created functions here 👆 */
});
