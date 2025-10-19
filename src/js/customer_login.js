import global from './_global.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { app } from './firebase.js';
import { API_BASE_URL } from './_global.js';

export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export function showTermsAndConditions() {
  const termsContainer = document.querySelector('.terms-container');
  termsContainer.classList.remove('hidden');
  Swal.fire({
    width: '600px',
    html: termsContainer.innerHTML,
    showConfirmButton: true,
    confirmButtonText: 'Accept & Continue',
    confirmButtonColor: '#ea580c',
    allowOutsideClick: false,
    allowEscapeKey: false,
    background: '#ffffff',
    preConfirm: () => {
      const agreeCheckbox = Swal.getPopup().querySelector('#agreeCheckbox');
      if (!agreeCheckbox.checked) {
        Swal.showValidationMessage('You must agree to the terms to proceed');
      }
      return agreeCheckbox.checked;
    },
    willClose: () => {
      termsContainer.classList.add('hidden');
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const loginForm = document.getElementById('loginForm');
const authIcon = document.getElementById('authIcon');
const authDivider = document.getElementById('authDivider');
const username = document.getElementById('username');
const password = document.getElementById('password');
const confirmPasswordField = document.getElementById('confirmPasswordField');
const confirmPassword = document.getElementById('confirmPassword');
const firstName = document.getElementById('firstName');
const firstNameField = document.getElementById('firstNameField');
const lastName = document.getElementById('lastName');
const lastNameField = document.getElementById('lastNameField');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const toggleText = document.getElementById('toggleText');
const toggleButton = document.getElementById('toggleForm');
const welcomeText = document.getElementById('welcomeText');
const submitBtnLabel = document.getElementById('submitBtnLabel');
const googleSignInBtn = document.getElementById('googleSignInBtn');

function setupLoginForm() {
  googleSignInBtn.addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const info = getAdditionalUserInfo(result);
      const isNewUser = info?.isNewUser ?? false;

      // Disable Google Sign-In button
      googleSignInBtn.disabled = true;
      googleSignInBtn.innerHTML = 'Logged in';

      // localStorage.setItem("fitworxUser", JSON.stringify({
      //   name: user.displayName,
      //   email: user.email,
      //   photo: user.photoURL
      // }));

      if (isNewUser) {
        const fullName = user.displayName || '';
        const [defaultFirst, ...rest] = fullName.split(' ');
        const defaultLast = rest.join(' ');

        const {
          value: formValues,
          isConfirmed,
          isDismissed,
        } = await Swal.fire({
          title: 'Welcome to Fitworx Gym! 🏋️‍♀️',
          html: `
                  <p class="text-gray-700 mb-3">Please confirm or edit your name below to complete your registration.</p>
                  <input id="swal-first" class="swal2-input" placeholder="First Name" value="${defaultFirst || ''}">
                  <input id="swal-last" class="swal2-input" placeholder="Last Name" value="${defaultLast || ''}">
                `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#f97316',
          preConfirm: () => {
            const first = Swal.getPopup().querySelector('#swal-first').value.trim();
            const last = Swal.getPopup().querySelector('#swal-last').value.trim();
            if (!first || !last) {
              Swal.showValidationMessage('Please fill out both first and last name.');
              return false;
            }
            return { first, last };
          },
        });

        if (!isConfirmed) {
          try {
            await user.delete();
            Swal.fire({
              icon: 'info',
              title: 'Registration Cancelled',
              text: 'Your Google sign-in has been cancelled. No account was created.',
              confirmButtonColor: '#ef4444',
            });
          } catch (err) {
            console.error('⚠️ Error deleting temporary user:', err);
          }
          return;
        }

        const { first, last } = formValues;

        try {
          const id = `U${Date.now()}`;
          const response = await fetch(`${API_BASE_URL}/inquiry/customers/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer_id: id,
              customer_image_url: user.photoURL,
              customer_first_name: first,
              customer_last_name: last,
              customer_contact: user.email,
              customer_type: 'daily',
              customer_tid: '',
              customer_pending: 0,
              customer_rate: 'regular',
            }),
          });

          if (response.status !== 201) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const newCustomer = await response.json();
          sessionStorage.setItem('id', id);
          sessionStorage.setItem('full_name', first + ' ' + last);
          sessionStorage.setItem('email', user.email);

          Toastify({
            text: 'Login successful!',
            duration: 3000,
            close: true,
            gravity: 'top',
            position: 'center',
            backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
            stopOnFocus: true,
            callback: () => (window.location.href = '/src/html/customer_dashboard.html'),
          }).showToast();
        } catch (error) {
          console.error('Error creating customer:', error);
        }
      } else {
        try {
          const response = await fetch(`${API_BASE_URL}/inquiry/customers/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer_contact: user.email,
            }),
          });

          if (response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const customer = await response.json();
          sessionStorage.setItem('id', customer.customer_id);
          sessionStorage.setItem('full_name', customer.customer_first_name + ' ' + customer.customer_last_name);
          sessionStorage.setItem('email', user.email);

          Toastify({
            text: 'Login successful!',
            duration: 3000,
            close: true,
            gravity: 'top',
            position: 'center',
            backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
            stopOnFocus: true,
            callback: () => (window.location.href = '/src/html/customer_dashboard.html'),
          }).showToast();
        } catch (error) {
          console.error('Error fetching customer:', error);
        }
      }
    } catch (error) {
      console.error('❌ Google Sign-In Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Google Sign-In Failed',
        text: error.message,
        confirmButtonColor: '#ef4444',
      });
    }
  });

  const showPassword1Button = document.getElementById('showPassword1');
  const showPassword2Button = document.getElementById('showPassword2');

  resetInputFields();

  loginForm.addEventListener('submit', submitClicked);
  showPassword1Button.addEventListener('click', showPassword1Clicked);
  showPassword2Button.addEventListener('click', showPassword2Clicked);
  toggleButton.addEventListener('click', toggleFormClicked);
}

function resetInputFields() {
  username.value = '';
  password.value = '';
  confirmPassword.value = '';
  firstName.value = '';
  lastName.value = '';
}

async function submitClicked(e) {
  e.preventDefault();

  const isLoginMode = formTitle.textContent.includes('Sign in');
  const sanitizedEmail = sanitizeInput(username.value.trim());
  const sanitizedPassword = password.value.trim();
  const sanitizedConfirmPassword = confirmPassword.value.trim();
  const sanitizedFirst = sanitizeInput(firstName.value.trim());
  const sanitizedLast = sanitizeInput(lastName.value.trim());

  const submitBtn = document.getElementById('loginForm').lastChild.previousSibling;
  const oldSubmitBtn = submitBtn.innerHTML;

  // Spinner
  submitBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
      5.291A7.962 7.962 0 014 12H0c0 3.042 
      1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>`;
  submitBtn.disabled = true;

  try {
    if (!isLoginMode) {
      // Check empty fields
      if (!sanitizedFirst || !sanitizedLast || !sanitizedEmail || !sanitizedPassword || !sanitizedConfirmPassword) {
        throw new Error('Please fill out all required fields.');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }

      // Check password match
      if (sanitizedPassword !== sanitizedConfirmPassword) {
        throw new Error('Passwords do not match. Please try again.');
      }

      // Check password strength
      if (sanitizedPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      // 🔹 Sign Up
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${sanitizedFirst} ${sanitizedLast}`,
      });

      try {
        const id = `U${Date.now()}`;
        const response = await fetch(`${API_BASE_URL}/inquiry/customers/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: id,
            customer_image_url: user.photoURL,
            customer_first_name: sanitizedFirst,
            customer_last_name: sanitizedLast,
            customer_contact: sanitizedEmail,
            customer_type: 'daily',
            customer_tid: '',
            customer_pending: 0,
            customer_rate: 'regular',
          }),
        });

        if (response.status !== 201) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newCustomer = await response.json();
        sessionStorage.setItem('id', id);
        sessionStorage.setItem('full_name', user.displayName);
        sessionStorage.setItem('email', user.email);

        Toastify({
          text: 'Account created successfully!',
          duration: 3000,
          close: true,
          gravity: 'top',
          position: 'center',
          backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
          stopOnFocus: true,
          callback: () => toggleFormClicked(e),
        }).showToast();
      } catch (error) {
        console.error('Error creating customer:', error);
      }
    } else {
      if (!sanitizedEmail || !sanitizedPassword) {
        throw new Error('Please enter your email and password.');
      }
      // 🔹 Login
      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
      const user = userCredential.user;

      try {
        const response = await fetch(`${API_BASE_URL}/inquiry/customers/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_contact: user.email,
          }),
        });

        if (response.status !== 200) throw new Error(`HTTP error! status: ${response.status}`);
        const customer = await response.json();
        if (!customer) throw new Error('Customer not found');
        sessionStorage.setItem('id', customer.customer_id);
        sessionStorage.setItem('full_name', customer.customer_first_name + ' ' + customer.customer_last_name);
        sessionStorage.setItem('email', user.email);

        Toastify({
          text: 'Login successful!',
          duration: 3000,
          close: true,
          gravity: 'top',
          position: 'center',
          backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
          stopOnFocus: true,
          callback: () => (window.location.href = '/src/html/customer_dashboard.html'),
        }).showToast();
      } catch (error) {
        console.error('Error fetching customer:', error);
      }
    }
  } catch (error) {
    console.error('Firebase Auth Error:', error);
    Swal.fire({
      title: 'Authentication Error',
      text: error.message,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#ef4444',
    });
    submitBtn.innerHTML = oldSubmitBtn;
    submitBtn.disabled = false;
  }
}

function showPassword1Clicked() {
  const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
  password.setAttribute('type', type);

  this.querySelector('i').classList.toggle('fa-eye');
  this.querySelector('i').classList.toggle('fa-eye-slash');
}

function showPassword2Clicked() {
  const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
  confirmPassword.setAttribute('type', type);

  this.querySelector('i').classList.toggle('fa-eye');
  this.querySelector('i').classList.toggle('fa-eye-slash');
}

function toggleFormClicked(e) {
  e.preventDefault();

  resetInputFields();

  const isLoginMode = formTitle.textContent.includes('Sign in');

  // 🔑 CLIENT
  formTitle.textContent = isLoginMode ? 'Create Account' : 'Sign in to an Account';
  formSubtitle.textContent = isLoginMode
    ? 'Join us and start your fitness journey'
    : 'Start your fitness journey today';

  toggleText.textContent = isLoginMode ? 'Already have an account?' : "Don't have an account?";
  toggleButton.innerHTML =
    (isLoginMode ? 'Sign in here ' : 'Sign up for free ') +
    `<span class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>`;

  updatePanelText(isLoginMode);

  authIcon.classList.toggle('hidden', isLoginMode);
  authDivider.classList.toggle('hidden', isLoginMode);
  firstNameField.classList.toggle('hidden', !isLoginMode);
  lastNameField.classList.toggle('hidden', !isLoginMode);
  confirmPasswordField.classList.toggle('hidden', !isLoginMode);

  // 🔹 Dynamically handle required attributes
  if (!isLoginMode) {
    // Switch to SIGN UP
    firstName.setAttribute('required', 'true');
    lastName.setAttribute('required', 'true');
    confirmPassword.setAttribute('required', 'true');
  } else {
    // Switch to SIGN IN
    firstName.removeAttribute('required');
    lastName.removeAttribute('required');
    confirmPassword.removeAttribute('required');
  }

  submitBtnLabel.innerText = isLoginMode ? 'Sign Up' : 'Sign In';
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
                Welcome to<br />
                <!-- 🔑 CLIENT -->
                <span class="bg-gradient-to-r from-yellow-300 to-orange-100 bg-clip-text text-transparent drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] uppercase">Fitworx Gym</span>
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

document.addEventListener('DOMContentLoaded', function () {
  if (checkIfJsShouldNotRun('customer_login')) return;
  setupLoginForm();
  updatePanelText(false);
  showTermsAndConditions();
  /* call newly created functions here 👆 */
});
