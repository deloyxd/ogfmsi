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
  const logoutButtons = [];
  logoutButtons.push(document.getElementById('logout'));
  logoutButtons.push(document.getElementById('logoutMobile'));

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
    console.log(customerId);

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
          p.innerHTML = dateStr ? `${msg} • ${dateStr}` : msg;

          li.appendChild(b);
          li.appendChild(p);
          frag.appendChild(li);
        });

        listEl.appendChild(frag);

        const openNotif = document.getElementById('openNotif');
        openNotif.dispatchEvent(new Event('click'));
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

  displayMonthlyStatus((result) => {
    if (!result) {
      const monthlyStatus = document.getElementById('monthlyStatus');
      const monthlyStatusMobile = document.getElementById('monthlyStatusMobile');
      monthlyStatus.innerHTML = `
        <div class="text-center">
          <div class="mt-[5px] flex items-center space-x-2">
            <span class="font-bold text-orange-300">🎫</span>
            <span class="text-sm font-medium">Monthly Pass Status</span>
          </div>
          <div class="-mt-[2px] flex items-center justify-center text-xs text-orange-200">
            Unregistered
            <i id="monthlyInfo" class="fa fa-circle-info pl-2 text-lg text-white cursor-pointer"></i>
          </div>
        </div>
      `;
      monthlyStatusMobile.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="font-bold text-orange-300">🎫</span>
            <span class="text-sm font-medium">Monthly Pass Status</span>
          </div>
          <span class="flex items-center justify-center text-xs text-orange-200">
            Unregistered
            <i id="monthlyInfoMobile" class="fa fa-circle-info pl-2 text-lg text-white cursor-pointer"></i>
          </span>
        </div>
      `;
    }
  });

  async function displayMonthlyStatus(callback) {
    const monthlyStatus = document.getElementById('monthlyStatus');
    const monthlyStatusMobile = document.getElementById('monthlyStatusMobile');
    const customerId = sessionStorage.getItem('id');
    if (customerId === 'U123') {
      callback();
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/inquiry/monthly/${customerId}`);
      if (!response.ok) {
        callback();
        return;
      }
      const result = await response.json();
      const customerData = result.result;

      // Get today's date
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Filter out expired monthly passes
      const validMonthly = customerData.filter((item) => new Date(item.customer_end_date) >= now);

      // Separate pending and active passes
      const pendingMonthly = validMonthly.filter((item) => item.customer_pending === 1);
      const activeMonthly = validMonthly.filter((item) => item.customer_pending === 0);

      // Function to calculate remaining days
      const getRemainingDays = (endDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(0, 0, 0, 0);
        const diff = endDateObj - today;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
      };

      let displayHTML = '';
      let displayHTMLMobile = '';

      if (pendingMonthly.length > 0 && activeMonthly.length === 0) {
        displayHTML = `
          <div class="text-center">
            <div class="mt-[5px] flex items-center space-x-2">
              <span class="font-bold text-orange-300">🎫</span>
              <span class="text-sm font-medium">Monthly Pass Status</span>
            </div>
            <div class="-mt-[2px] flex items-center justify-center text-xs text-orange-200">
              Pending
              <i id="monthlyInfo" class="fa fa-circle-info pl-2 text-lg text-white cursor-pointer"></i>
            </div>
          </div>
        `;
        displayHTMLMobile = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="font-bold text-orange-300">🎫</span>
              <span class="text-sm font-medium">Monthly Pass Status</span>
            </div>
            <span class="flex items-center justify-center text-xs text-orange-200">
              Pending
              <i id="monthlyInfoMobile" class="fa fa-circle-info pl-2 text-lg text-white cursor-pointer"></i>
            </span>
          </div>
        `;
      } else if (activeMonthly.length > 0) {
        const active = activeMonthly[0];
        const daysLeft = getRemainingDays(active.customer_end_date);

        displayHTML = `
          <div class="text-center">
            <div class="mt-[5px] flex items-center space-x-2">
              <span class="font-bold text-orange-300">🎫</span>
              <span class="text-sm font-medium">Monthly Pass Status</span>
            </div>
            <div class="-mt-[2px] flex items-center justify-center text-xs text-orange-200">
              ${daysLeft} days left
              <i id="monthlyInfo" class="fa fa-circle-info pl-2 text-lg text-white cursor-pointer"></i>
            </div>
          </div>
        `;
        displayHTMLMobile = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="font-bold text-orange-300">🎫</span>
              <span class="text-sm font-medium">Monthly Pass Status</span>
            </div>
            <span class="flex items-center justify-center text-xs text-orange-200">
              ${daysLeft} days left
              <i id="monthlyInfoMobile" class="fa fa-circle-info pl-2 text-lg text-white cursor-pointer"></i>
            </span>
          </div>
        `;
      }

      // Inject into DOM
      monthlyStatus.innerHTML = displayHTML;
      monthlyStatusMobile.innerHTML = displayHTMLMobile;

      let startDateString, endDateString;
      if (activeMonthly.length > 0) {
        startDateString = new Date(activeMonthly[0].customer_start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: '2-digit',
        });
        endDateString = new Date(activeMonthly[0].customer_end_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: '2-digit',
        });
      }

      // --- Popup Modal HTML ---
      const modalHTML = `
        <div id="monthlyPopup" class="absolute bg-transparent hidden z-50">
          <div class="bg-gray-800 text-white rounded-2xl shadow-lg w-80 p-6 relative">
            <button id="closePopup" class="absolute top-3 right-3 text-gray-400 hover:text-white text-lg">
              <i class="fa fa-times"></i>
            </button>
            <h2 class="text-lg font-semibold mb-3 flex items-center space-x-2">
              <span>🎫</span><span>Monthly Pass Details</span>
            </h2>
            <div class="space-y-2 text-sm text-gray-200">
              <p><strong>Active Monthly:</strong> ${
                activeMonthly.length > 0 ? `<br>${startDateString} - ${endDateString}` : 'None'
              }</p>
              <p><strong>Pending Monthly:</strong> ${pendingMonthly.length}</p>
              <p><strong>Incoming Monthly:</strong> ${activeMonthly.length > 1 ? `${activeMonthly}` : 'None'}</p>
            </div>
          </div>
        </div>
      `;

      // Append modal to body if not already added
      if (!document.getElementById('monthlyPopup')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
      }

      // --- Event Handlers ---
      const popup = document.getElementById('monthlyPopup');
      const closePopup = () => {
        popup.classList.add('hidden');
      };
      const showPopup = (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Position popup slightly offset from cursor
        popup.style.left = `${mouseX + 10}px`;
        popup.style.top = `${mouseY + 10}px`;
        popup.classList.remove('hidden');
      };
      const showPopupMobile = (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Position popup slightly offset from cursor
        popup.style.right = `${mouseX - 10}px`;
        popup.style.top = `${mouseY + 10}px`;
        popup.classList.remove('hidden');
      };

      // Attach listeners
      document.getElementById('monthlyInfo')?.addEventListener('click', showPopup);
      document.getElementById('monthlyInfoMobile')?.addEventListener('click', showPopupMobile);
      document.getElementById('closePopup')?.addEventListener('click', closePopup);
      popup?.addEventListener('click', (e) => {
        if (e.target.id === 'monthlyPopup') closePopup(); // close when clicking outside
      });
    } catch (_) {}
  }

  const openMessage = document.getElementById('openMessage');
  const openMessageMobile = document.getElementById('openMessageMobile');
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
      <div class="text-center">
        <div class="flex items-center justify-center space-x-2">
          <span class="font-bold text-orange-300">🏦</span>
          <span class="text-sm font-medium">Facility Closed</span>
        </div>
        <div class="mt-1 text-xs text-orange-200">Come back during our operating hours</div>
      </div>
    `;
    openMessageMobile.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <span class="font-bold text-orange-300">🏦</span>
          <span class="text-sm font-medium">Facility Closed</span>
        </div>
        <span class="text-xs text-orange-200">Come back during our operating hours</span>
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
