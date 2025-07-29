import modal from './modal.js';

/* tailwind: dark mode color palette */
// 🔑 CLIENT
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#111626',
          800: '#2d2d2d',
          700: '#3d3d3d',
          600: '#4d4d4d',
        },
      },
    },
  },
};

function checkIfJsShouldNotRun(id) {
  let result = false;
  result = document.getElementById(id) == null;
  return result;
}

function setupLandingHeaderComponent() {
  setupClientLogo();
  setupDarkMode();
  setupLoginDropdown();
  setupMobileLoginDropdown();
}

function setupClientLogo() {
  document.querySelectorAll('.redirect-to-dashboard').forEach((button) => {
    button.addEventListener('click', function () {
      window.location.href = '/index.html';
    });
  });
  document.querySelectorAll('.redirect-to-demo').forEach((button) => {
    button.addEventListener('click', function () {
      showVideoModal();
    });
  });
}

function setupDarkMode() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const html = document.documentElement;

  // check for saved theme preference, otherwise use system preference
  if (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // toggler
  themeToggleBtn.addEventListener('click', () => {
    html.classList.toggle('dark');
    localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light';
  });
}

function setupLoginDropdown() {
  const dropdownToggle = document.getElementById('dropdown-toggle');
  const dropdownMenu = document.getElementById('dropdown-menu');

  // toggler
  dropdownToggle.addEventListener('click', function () {
    dropdownMenu.classList.toggle('hidden');
  });

  // close dropdown when clicking outside
  window.addEventListener('click', function (e) {
    if (
      !dropdownToggle.contains(e.target) &&
      !dropdownMenu.contains(e.target)
    ) {
      dropdownMenu.classList.add('hidden');
    }
  });

  // attach the event listener to the "Admin Login" button
  const adminLoginBtn = document.getElementById('admin-login-btn');
  adminLoginBtn.addEventListener('click', () => {
    modal.showModal('adminLoginModal', 'loginBtn', 'cancelBtn');
    dropdownMenu.classList.add('hidden');
  });
}

function setupMobileLoginDropdown() {
  const mobileMenuBtn = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const adminLoginBtn = document.getElementById('mobile-admin-login-btn');
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
  adminLoginBtn.addEventListener('click', () => {
    modal.showModal('adminLoginModal', 'loginBtn', 'cancelBtn');
  });
}

/* add new functions above 👆 */

document.addEventListener('DOMContentLoaded', function () {
  if (checkIfJsShouldNotRun('apt')) return;
  setupLandingHeaderComponent();
  /* call newly created functions here 👆 */
});
