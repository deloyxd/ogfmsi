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
            sessionStorage.clear();
            window.location.href = '/';
            await signOut(auth);
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

import { DEV_MODE, API_BASE_URL } from './_global.js';

function loadCustomerNotifications() {
  const listEl = document.getElementById('notifList');
  const countEl = document.getElementById('notifCount');

  if (!listEl || !countEl) return;

  const showMessage = (message, className = 'text-xs text-gray-500') => {
    listEl.innerHTML = '';
    const li = document.createElement('li');
    li.className = className;
    li.textContent = message;
    listEl.appendChild(li);
  };

  try {
    const customerId = sessionStorage.getItem('id');
    if (!customerId) {
      countEl.textContent = '0';
      showMessage('No notifications');
      return;
    }

    fetch(`${API_BASE_URL}/notif/${encodeURIComponent(customerId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : Array.isArray(data.result) ? data.result : [];
        countEl.textContent = String(items.length);
        listEl.innerHTML = '';

        if (items.length === 0) {
          showMessage('No notifications');
          return;
        }

        const frag = document.createDocumentFragment();

        items.forEach((n) => {
          const li = document.createElement('li');
          li.className = 'border-b border-orange-100 pb-2';

          const b = document.createElement('b');
          b.textContent = n.notif_title || n.title || 'Notification';

          const p = document.createElement('p');
          p.className = 'text-xs text-gray-500';

          const msg = n.notif_body || n.message || '';
          const dt = n.created_at || n.createdAt || n.created || '';
          let dateStr = '';
          if (dt) {
            const d = new Date(dt);
            dateStr = isNaN(d.getTime()) ? String(dt) : d.toLocaleString();
          }
          p.textContent = dateStr ? `${msg} • ${dateStr}` : msg;

          li.appendChild(b);
          li.appendChild(p);
          frag.appendChild(li);
        });

        listEl.appendChild(frag);
      })
      .catch((err) => {
        console.error('Failed to load notifications:', err);
        countEl.textContent = '0';
        showMessage('Failed to load notifications', 'text-xs text-red-600');
      });
  } catch (err) {
    console.error('Failed to load notifications:', err);
    countEl.textContent = '0';
    showMessage('Failed to load notifications', 'text-xs text-red-600');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  let fullName = sessionStorage.getItem('full_name') || 'Guest';
  if (DEV_MODE) {
    sessionStorage.setItem('id', 'U123');
    sessionStorage.setItem('first_name', 'Team');
    sessionStorage.setItem('last_name', 'Biboy');
    sessionStorage.setItem('full_name', 'Team Biboy');
    sessionStorage.setItem('email', 'teambiboy@gmail.com');
    fullName = sessionStorage.getItem('full_name');
  } else {
    if (fullName === 'Guest') {
      window.location.href = '/';
      return;
    }
  }
  setupMobileDropdown();
  setupLogout();
  document.getElementById('welcomeUser').innerText = fullName;

  const notifPanel = document.getElementById('notificationPanel');
  const closeNotif = document.getElementById('closeNotif');
  const openNotif = document.getElementById('openNotif');
  const openNotifMobile = document.getElementById('openNotifMobile');

  // Close animation: slide to right
  closeNotif.addEventListener('click', () => {
    notifPanel.classList.add('translate-x-full');
  });

  // Open animation: slide back in
  openNotif.addEventListener('click', () => {
    if (!notifPanel.classList.contains('translate-x-full')) {
      closeNotif.dispatchEvent(new Event('click'));
      return;
    }
    notifPanel.classList.remove('translate-x-full');
  });

  // Open animation: slide back in
  openNotifMobile.addEventListener('click', () => {
    if (!notifPanel.classList.contains('translate-x-full')) {
      closeNotif.dispatchEvent(new Event('click'));
      return;
    }
    notifPanel.classList.remove('translate-x-full');
  });

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
  const startTimeInput = document.getElementById('startTime');
  const durationSelect = document.getElementById('duration');
  const endTimeInput = document.getElementById('endTime');

  function updateEndTime() {
    const startTimeValue = startTimeInput.value;
    const durationValue = durationSelect.value;
    if (!startTimeValue || !durationValue) {
      return;
    }
    const [hours, minutes] = startTimeValue.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const durationHours = parseInt(durationValue);
    startDate.setHours(startDate.getHours() + durationHours);
    const endHours = startDate.getHours().toString().padStart(2, '0');
    const endMinutes = startDate.getMinutes().toString().padStart(2, '0');
    endTimeInput.value = `${endHours}:${endMinutes}`;
  }

  startTimeInput.addEventListener('change', updateEndTime);
  durationSelect.addEventListener('change', updateEndTime);

  // Load notifications on dashboard init
  loadCustomerNotifications();
});
