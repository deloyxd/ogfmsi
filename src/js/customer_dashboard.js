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
  const fullName = sessionStorage.getItem('full_name') || 'Guest';
  if (fullName === 'Guest') {
    window.location.href = '/';
    return;
  }
  setupMobileDropdown();
  setupLogout();
  document.getElementById('welcomeUser').innerText = fullName;

  const openMessage = document.getElementById('openMessage');
  const hoursMessage = document.getElementById('hoursMessage');
  const storeHours = document.getElementById('storeHours');

  const operatingHoursText = storeHours.textContent.trim();
  const [openingTimeStr, closingTimeStr] = operatingHoursText.split(' - ');
  const convertTo24Hour = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours;
  };

  const openingTime = convertTo24Hour(openingTimeStr);
  const closingTime = convertTo24Hour(closingTimeStr);

  const currentDate = new Date();
  const currentHour = currentDate.getHours();

  // Check if the store is open
  const isOpen = currentHour >= openingTime && currentHour < closingTime;

  if (!isOpen) {
    openMessage.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="font-bold text-orange-300">🏦</span>
        <span class="text-sm font-medium">Facility Closed</span>
      </div>
      <div class="mt-1 text-xs text-orange-200">Come back during our operating hours</div>
    `;
    hoursMessage.innerHTML = `
      <div class="text-center">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-orange-300">⏰</span>
          <!-- 🔑 CLIENT -->
          <span class="text-sm font-medium">7:00 AM - 11:00 PM</span>
        </div>
        <div class="mt-1 text-xs text-orange-200">Operating Hours</div>
      </div>
    `;
  }
});
