function setupMobileDropdown() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function () {
      mobileMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', function (event) {
      if (!mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
        mobileMenu.classList.add('hidden');
      }
    });
  }
}

import { signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from './customer_login.js';

function setupLogout() {
  const logoutButtons = document.querySelectorAll('a[href=""][class*="Logout"], a[href=""]:has(svg)');

  logoutButtons.forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault();

      Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Logout',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = '/';
          } catch (error) {
            console.error('Logout Error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Logout Failed',
              text: error.message,
              confirmButtonColor: '#ef4444',
            });
          }
        }
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  setupMobileDropdown();
  setupLogout();

  const fullName = sessionStorage.getItem('full_name') || 'Guest';
  if (fullName === 'Guest') {
    window.location.href = '/';
  }
  document.getElementById('welcomeUser').innerText = fullName;
});
