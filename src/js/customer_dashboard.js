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
  const dotEl = document.getElementById('notifDot');
  const dotElMobile = document.getElementById('notifDotMobile');

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
        let items = Array.isArray(data) ? data : Array.isArray(data.result) ? data.result : [];
        // Load read set from localStorage and filter out read notifications
        const readKey = `readNotifs:${customerId}`;
        let readSet = {};
        try {
          readSet = JSON.parse(localStorage.getItem(readKey) || '{}') || {};
        } catch (_) {
          readSet = {};
        }
        countEl.textContent = String(items.length);
        listEl.innerHTML = '';

        // Sort newest first if timestamps exist
        items.sort((a, b) => new Date(b.created_at || b.createdAt || b.created || 0) - new Date(a.created_at || a.createdAt || a.created || 0));

        // Filter out read items
        const keyed = items.map((n) => {
          const title = n.notif_title || n.title || 'Notification';
          const body = n.notif_body || n.message || '';
          const dt = n.created_at || n.createdAt || n.created || '';
          const key = `${title}|${body}|${dt}`;
          return { data: n, key };
        });
        const unread = keyed.filter((k) => !readSet[k.key]).map((k) => k);

        countEl.textContent = String(unread.length);

        if (unread.length === 0) {
          showMessage('No notifications');
          dotEl?.classList.add('hidden');
          dotElMobile?.classList.add('hidden');
          return;
        }

        const frag = document.createDocumentFragment();

        unread.forEach(({ data: n, key }) => {
          const li = document.createElement('li');
          li.className = 'border-b border-gray-100 pb-3 transition-opacity duration-200';
          li.dataset.key = key;

          const b = document.createElement('b');
          const title = n.notif_title || n.title || 'Notification';
          b.textContent = title;

          const p = document.createElement('p');
          p.className = 'text-xs text-gray-500';

          const msg = n.notif_body || n.message || '';
          const dt = n.created_at || n.createdAt || n.created || '';
          let dateStr = '';
          if (dt) {
            const d = new Date(dt);
            dateStr = isNaN(d.getTime()) ? String(dt) : d.toLocaleString();
          }
          p.innerHTML = dateStr ? `${msg}<br><br>${dateStr}` : msg;

          // X button to mark as read (remove locally)
          const x = document.createElement('button');
          x.type = 'button';
          x.title = 'Mark as read';
          x.className = 'float-right -mt-1 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700';
          x.textContent = '✖';
          x.addEventListener('click', () => {
            // Persist as read
            const existing = JSON.parse(localStorage.getItem(readKey) || '{}') || {};
            existing[key] = true;
            localStorage.setItem(readKey, JSON.stringify(existing));

            // UI: turn X to ✓ and fade, then remove
            x.textContent = '✓';
            x.title = 'Read';
            x.className = 'float-right -mt-1 rounded px-2 py-0.5 text-xs text-green-600';
            x.disabled = true;
            li.classList.add('opacity-60');
            li.dataset.markedRead = '1';

            // Update count only (do not remove yet)
            const remaining = Math.max(parseInt(countEl.textContent || '1', 10) - 1, 0);
            countEl.textContent = String(remaining);
            // Keep item visible until dropdown closes
          });

          li.appendChild(b);
          li.appendChild(x);
          li.appendChild(p);
          frag.appendChild(li);
        });

        listEl.appendChild(frag);

        // Green dot based on new items vs last seen
        const newest = items[0]?.created_at || items[0]?.createdAt || items[0]?.created || null;
        const newestTime = newest ? new Date(newest).getTime() : 0;
        const lastSeenKey = `lastSeenNotifAt:${customerId}`;
        const lastSeen = parseInt(localStorage.getItem(lastSeenKey) || '0', 10);
        const hasNew = newestTime && newestTime > lastSeen;
        if (hasNew) {
          dotEl?.classList.remove('hidden');
          dotElMobile?.classList.remove('hidden');
          // Play SFX for new notifications
          try {
            const notifyKey = `lastNotifiedAt:${customerId}`;
            const lastNotified = parseInt(localStorage.getItem(notifyKey) || '0', 10);
            if (newestTime > lastNotified) {
              const audio = document.getElementById('notifSfx');
              if (audio && typeof audio.play === 'function') {
                audio.currentTime = 0;
                audio.play();
              }
              localStorage.setItem(notifyKey, String(newestTime));
            }
          } catch (_) {}
        } else {
          dotEl?.classList.add('hidden');
          dotElMobile?.classList.add('hidden');
        }
      })
      .catch((err) => {
        console.error('Failed to load notifications:', err);
        countEl.textContent = '0';
        showMessage('Failed to load notifications', 'text-xs text-red-600');
        dotEl?.classList.add('hidden');
        dotElMobile?.classList.add('hidden');
      });
  } catch (err) {
    console.error('Failed to load notifications:', err);
    countEl.textContent = '0';
    showMessage('Failed to load notifications', 'text-xs text-red-600');
    dotEl?.classList.add('hidden');
    dotElMobile?.classList.add('hidden');
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

  // Helpers for dropdown animation
  const showDropdown = () => {
    if (!notifPanel) return;
    notifPanel.classList.remove('hidden');
    // Start from initial state (ensure classes are present)
    notifPanel.classList.add('opacity-0', '-translate-y-2', 'scale-95');
    // Next frame remove them to animate in
    requestAnimationFrame(() => {
      notifPanel.classList.remove('opacity-0', '-translate-y-2', 'scale-95');
    });
  };

  const hideDropdown = () => {
    if (!notifPanel) return;
    // Animate out
    notifPanel.classList.add('opacity-0', '-translate-y-2', 'scale-95');
    setTimeout(() => {
      notifPanel.classList.add('hidden');
    }, 200); // Match duration-200
  };

  // Helper: prune items marked read when closing the dropdown
  const pruneReadItems = () => {
    const listEl = document.getElementById('notifList');
    if (!listEl) return;
    const targets = Array.from(listEl.querySelectorAll('li[data-marked-read="1"]'));
    targets.forEach((li) => li.classList.add('opacity-0'));
    // Remove after fade
    setTimeout(() => {
      targets.forEach((li) => li.remove());
      const after = listEl.querySelectorAll('li').length;
      if (after === 0) {
        document.getElementById('notifDot')?.classList.add('hidden');
        document.getElementById('notifDotMobile')?.classList.add('hidden');
        // Show empty state
        const countEl = document.getElementById('notifCount');
        if (countEl) countEl.textContent = '0';
        const msg = document.createElement('li');
        msg.className = 'text-xs text-gray-500';
        msg.textContent = 'No notifications';
        listEl.appendChild(msg);
      }
    }, 200);
  };

  const markAllReadBtn = document.getElementById('markAllRead');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', () => {
      const customerId = sessionStorage.getItem('id');
      if (!customerId) return;
      const readKey = `readNotifs:${customerId}`;
      let existing = {};
      try {
        existing = JSON.parse(localStorage.getItem(readKey) || '{}') || {};
      } catch (_) {
        existing = {};
      }
      const listEl = document.getElementById('notifList');
      if (!listEl) return;
      let changed = false;
      Array.from(listEl.querySelectorAll('li')).forEach((li) => {
        const key = li.dataset.key;
        if (key) {
          existing[key] = true;
          const x = li.querySelector('button[title="Mark as read"]');
          if (x) {
            x.textContent = '✓';
            x.title = 'Read';
            x.className = 'float-right -mt-1 rounded px-2 py-0.5 text-xs text-green-600';
            x.disabled = true;
          }
          li.classList.add('opacity-60');
          li.dataset.markedRead = '1';
          changed = true;
        }
      });
      localStorage.setItem(readKey, JSON.stringify(existing));
      const countEl = document.getElementById('notifCount');
      if (countEl) countEl.textContent = '0';
      document.getElementById('notifDot')?.classList.add('hidden');
      document.getElementById('notifDotMobile')?.classList.add('hidden');
      try {
        localStorage.setItem(`lastSeenNotifAt:${customerId}`, String(Date.now()));
      } catch (_) {}
      if (changed) {
        pruneReadItems();
      }
    });
  }

  // Close: animate out then prune
  closeNotif?.addEventListener('click', () => {
    pruneReadItems();
    hideDropdown();
  });

  // Open: show dropdown and clear new-dot (mark seen)
  const clearNewDot = () => {
    const customerId = sessionStorage.getItem('id');
    if (!customerId) return;
    const firstItem = document.querySelector('#notifList li');
    let newest = 0;
    if (firstItem) {
      // Read newest timestamp from rendered list if present
      const firstData = firstItem.querySelector('p')?.innerHTML || '';
      // We already set new-dot based on API timestamps; safer to just set now
    }
    const now = Date.now();
    localStorage.setItem(`lastSeenNotifAt:${customerId}`, String(now));
    document.getElementById('notifDot')?.classList.add('hidden');
    document.getElementById('notifDotMobile')?.classList.add('hidden');
  };

  openNotif?.addEventListener('click', () => {
    const isHidden = notifPanel.classList.contains('hidden');
    if (isHidden) {
      loadCustomerNotifications();
      showDropdown();
      clearNewDot();
    } else {
      // Closing via toggle
      pruneReadItems();
      hideDropdown();
    }
  });

  openNotifMobile?.addEventListener('click', () => {
    const isHidden = notifPanel.classList.contains('hidden');
    if (isHidden) {
      loadCustomerNotifications();
      showDropdown();
      clearNewDot();
    } else {
      // Closing via toggle (mobile)
      pruneReadItems();
      hideDropdown();
    }
  });

  displayMonthlyStatus((result) => {
    if (!result) {
      const monthlyStatus = document.getElementById('monthlyStatus');
      const monthlyStatusMobile = document.getElementById('monthlyStatusMobile');
      monthlyStatus.innerHTML = `
        <div class="text-center">
          <div class="mt-[5px] flex items-center space-x-2">
            <span class="font-bold text-orange-300">🎫</span>
            <span class="text-sm font-medium">Monthly Pass</span>
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
            <span class="text-sm font-medium">Monthly Pass</span>
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

      if (activeMonthly.length > 0)
        sessionStorage.setItem('activeMonthlyLastEndDate', activeMonthly[activeMonthly.length - 1].customer_end_date);

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
              <span class="text-sm font-medium">Monthly Pass</span>
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
              <span class="text-sm font-medium">Monthly Pass</span>
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
              <span class="text-sm font-medium">Monthly Pass</span>
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
              <span class="text-sm font-medium">Monthly Pass</span>
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

      const formattedPendingMonthly = pendingMonthly
        .map(
          (item) =>
            `• ${new Date(item.customer_start_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: '2-digit',
            })} - ${new Date(item.customer_end_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: '2-digit',
            })}`
        )
        .join('\n');

      const formattedActiveMonthly = activeMonthly
        .slice(1)
        .map(
          (item) =>
            `• ${new Date(item.customer_start_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: '2-digit',
            })} - ${new Date(item.customer_end_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: '2-digit',
            })}`
        )
        .join('\n');

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
              <p><strong>Pending Monthly:</strong> ${pendingMonthly.length > 0 ? `<br>${formattedPendingMonthly}` : 'None'}</p>
              <p><strong>Incoming Monthly:</strong> ${activeMonthly.length > 1 ? `<br>${formattedActiveMonthly}` : 'None'}</p>
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
        popup.style.left = `${mouseX - 320 - 10}px`;
        popup.style.top = `${mouseY + 10}px`;
        popup.classList.remove('hidden');
      };

      // Attach listeners
      document.getElementById('monthlyInfo')?.addEventListener('click', showPopup);
      document.getElementById('monthlyInfoMobile')?.addEventListener('click', showPopup);
      document.getElementById('closePopup')?.addEventListener('click', closePopup);
      popup?.addEventListener('click', (e) => {
        if (e.target.id === 'monthlyPopup') closePopup(); // close when clicking outside
      });
    } catch (_) {}
  }

  const openMessage = document.getElementById('openMessage');
  const openMessageMobile = document.getElementById('openMessageMobile');
  const storeHours = document.getElementById('storeHours');

  if (storeHours) {
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
      if (openMessage) {
        openMessage.innerHTML = `
          <div class="text-center">
            <div class="flex items-center justify-center space-x-2">
              <span class="font-bold text-orange-300">🏦</span>
              <span class="text-sm font-medium">Facility Closed</span>
            </div>
            <div class="mt-1 text-xs text-orange-200">Come back during our operating hours</div>
          </div>
        `;
      }
      if (openMessageMobile) {
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
    }
  }

  const startTimeInput = document.getElementById('startTime');
  const durationSelect = document.getElementById('duration');
  const endTimeInput = document.getElementById('endTime');

  if (startTimeInput && durationSelect && endTimeInput) {
    const updateEndTime = () => {
      const startTimeValue = startTimeInput.value;
      const durationValue = durationSelect.value;
      if (!startTimeValue || !durationValue) return;
      const [hours, minutes] = startTimeValue.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const durationHours = parseInt(durationValue);
      startDate.setHours(startDate.getHours() + durationHours);
      const endHours = startDate.getHours().toString().padStart(2, '0');
      const endMinutes = startDate.getMinutes().toString().padStart(2, '0');
      endTimeInput.value = `${endHours}:${endMinutes}`;
    };

    startTimeInput.addEventListener('change', updateEndTime);
    durationSelect.addEventListener('change', updateEndTime);
  }

  // Load notifications on dashboard init
  loadCustomerNotifications();

  // Realtime polling for notifications
  let notifPoller = null;
  const startNotifPolling = () => {
    if (notifPoller) return;
    notifPoller = setInterval(() => {
      loadCustomerNotifications();
    }, 5000);
  };

  const stopNotifPolling = () => {
    if (!notifPoller) return;
    clearInterval(notifPoller);
    notifPoller = null;
  };
  // Start polling immediately
  startNotifPolling();
  // Refresh when the tab becomes active
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadCustomerNotifications();
      startNotifPolling();
    } else {
      stopNotifPolling();
    }
  });
});