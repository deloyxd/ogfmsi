import { API_BASE_URL } from '../_global.js';
import main from '../admin_main.js';

import { db } from '../firebase.js';
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const CONTAINER_ID = 'customerCalendar';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const RESERVATION_DURATION = [
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '3', label: '3 hours' },
  { value: '4', label: '4 hours' },
  { value: '5', label: '5 hours' },
  { value: '6', label: '6 hours' },
  { value: '7', label: '7 hours' },
];

const today = new Date();
const state = {
  currentDate: new Date(),
  selectedDate: null,
  reservations: [],
  unsubscribe: null,
};

function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}

function renderHeader(container) {
  container.querySelector('[data-cal="month"]').textContent = monthNames[state.currentDate.getMonth()];
  container.querySelector('[data-cal="year"]').textContent = state.currentDate.getFullYear();
}

// -------------------------
// Firestore-backed state and helpers (customer-facing)
// -------------------------

function requestRender() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) render(container);
}

function listenToReservationsFE() {
  const q = query(collection(db, 'reservations'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Exclude 'Canceled' reservations from UI and availability checks
    state.reservations = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((r) => (String(r.status || '')).toLowerCase() !== 'canceled');
    requestRender();
  });
  return unsubscribe;
}

// Count reservations for a given mm-dd-yyyy date
function getReservationCountForDate(mmddyyyy) {
  try {
    const now = new Date();
    return state.reservations.filter((r) => {
      if (!r || r.date !== mmddyyyy) return false;
      const end = parseDateTime(r.date, r.endTime);
      return end > now;
    }).length;
  } catch (e) {
    return 0;
  }
}

// -------------------------
// Firestore CRUD wrappers with loading overlay
// -------------------------
async function createReservationFE(reservation) {
  await setDoc(doc(db, 'reservations', reservation.id), reservation);
}

async function updateReservationFE(reservationId, updated) {
  await updateDoc(doc(db, 'reservations', reservationId), updated);
}

async function deleteReservationFE(reservationId) {
  await deleteDoc(doc(db, 'reservations', reservationId));
}

// -------------------------
// Validation and pricing helpers
// -------------------------
function parseDateTime(dateMMDDYYYY, hhmm) {
  const [mm, dd, yyyy] = (dateMMDDYYYY || '').split('-').map((n) => parseInt(n, 10));
  const [h, m] = (hhmm || '00:00').split(':').map((n) => parseInt(n, 10));
  return new Date(yyyy, (mm || 1) - 1, dd || 1, h || 0, m || 0, 0, 0);
}

function parseHumanDateToMMDDYYYY(human) {
  try {
    const d = new Date(human);
    if (isNaN(d.getTime())) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  } catch {
    return '';
  }
}

function isTimeInPast(dateMMDDYYYY, startHHMM) {
  const selected = parseDateTime(dateMMDDYYYY, startHHMM);
  const current = new Date();
  current.setMinutes(current.getMinutes() - 1);
  return selected < current;
}

function hasTimeConflict(dateMMDDYYYY, startHHMM, endHHMM, excludeId = null) {
  const newStart = parseDateTime(dateMMDDYYYY, startHHMM);
  const newEnd = parseDateTime(dateMMDDYYYY, endHHMM);
  return state.reservations.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    if (r.date !== dateMMDDYYYY) return false;
    const existingStart = parseDateTime(r.date, r.startTime);
    const existingEnd = parseDateTime(r.date, r.endTime);
    return newStart < existingEnd && newEnd > existingStart;
  });
}

function getConflictingReservation(dateMMDDYYYY, startHHMM, endHHMM, excludeId = null) {
  const newStart = parseDateTime(dateMMDDYYYY, startHHMM);
  const newEnd = parseDateTime(dateMMDDYYYY, endHHMM);
  return (
    state.reservations.find((r) => {
      if (excludeId && r.id === excludeId) return false;
      if (r.date !== dateMMDDYYYY) return false;
      const existingStart = parseDateTime(r.date, r.startTime);
      const existingEnd = parseDateTime(r.date, r.endTime);
      return newStart < existingEnd && newEnd > existingStart;
    }) || null
  );
}

function hasMinimumGap(dateMMDDYYYY, startHHMM, endHHMM, excludeId = null) {
  const newStart = parseDateTime(dateMMDDYYYY, startHHMM);
  const newEnd = parseDateTime(dateMMDDYYYY, endHHMM);
  return state.reservations.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    if (r.date !== dateMMDDYYYY) return false;
    const existingStart = parseDateTime(r.date, r.startTime);
    const existingEnd = parseDateTime(r.date, r.endTime);
    const gapAfter = newStart - existingEnd >= 60000;
    const gapBefore = existingStart - newEnd >= 60000;
    return !gapAfter && !gapBefore;
  });
}

function getConflictingReservationForGap(dateMMDDYYYY, startHHMM, endHHMM, excludeId = null) {
  const newStart = parseDateTime(dateMMDDYYYY, startHHMM);
  const newEnd = parseDateTime(dateMMDDYYYY, endHHMM);
  return (
    state.reservations.find((r) => {
      if (excludeId && r.id === excludeId) return false;
      if (r.date !== dateMMDDYYYY) return false;
      const existingStart = parseDateTime(r.date, r.startTime);
      const existingEnd = parseDateTime(r.date, r.endTime);
      const gapAfter = newStart - existingEnd >= 60000;
      const gapBefore = existingStart - newEnd >= 60000;
      return !gapAfter && !gapBefore;
    }) || null
  );
}

function getNextAvailableTime(dateMMDDYYYY, startHHMM, durationHours = 1) {
  const newStart = parseDateTime(dateMMDDYYYY, startHHMM);
  const sameDate = state.reservations.filter((r) => r.date === dateMMDDYYYY);
  if (sameDate.length === 0) return null;
  let closest = null;
  let minDiff = Infinity;
  sameDate.forEach((r) => {
    const existingEnd = parseDateTime(r.date, r.endTime);
    const diff = newStart - existingEnd;
    if (diff >= 0 && diff < minDiff) {
      minDiff = diff;
      closest = existingEnd;
    }
  });
  if (!closest) return null;
  const next = new Date(closest.getTime() + 60000);
  const h = String(next.getHours()).padStart(2, '0');
  const m = String(next.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Pricing parity with admin
function getHourlyRate(hour0to23) {
  return hour0to23 >= 18 ? 200 : 180;
}

function calculateDynamicPrice(startHHMM, durationHours) {
  const safeDuration = Number.isFinite(Number(durationHours)) ? Math.max(1, Math.round(Number(durationHours))) : 1;
  const [h, m] = (startHHMM || '00:00').split(':').map((n) => parseInt(n, 10));
  const baseline = new Date(1970, 0, 1, h || 0, m || 0, 0, 0);
  let total = 0;
  for (let i = 0; i < safeDuration; i++) {
    const slot = new Date(baseline.getTime() + i * 60 * 60 * 1000);
    total += getHourlyRate(slot.getHours());
  }
  return total;
}

function updatePriceDisplay(amountNumber) {
  try {
    const priceInput =
      document.querySelector('#priceAmount') ||
      document.querySelector('input[placeholder*="Amount to pay"]') ||
      document.querySelector('input[placeholder*="Amount"]');
    if (!priceInput) return;
    if ('value' in priceInput) {
      priceInput.value = String(amountNumber);
      priceInput.dispatchEvent(new Event('input'));
    } else {
      priceInput.textContent = String(amountNumber);
    }
  } catch (e) {}
}

// Payment hooks exposed for external integration
function formatTodayDateTimeMMDDYYYY_HHMM() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const HH = String(now.getHours()).padStart(2, '0');
  const MM = String(now.getMinutes()).padStart(2, '0');
  return `${mm}-${dd}-${yyyy} ${HH}:${MM}`;
}

// Returns pseudo-random reservation count for each date
function getReservedCount(year, month, day) {
  const seed = year * 10000 + month * 100 + day;
  let x = Math.sin(seed) * 10000;
  const rand01 = x - Math.floor(x);
  const value = Math.max(0, Math.round(rand01 * 10) - Math.round((1 - rand01) * 6));
  return value;
}

function createDayElement(day, month, year) {
  const dateKey = day + 31 * month + 366 * year;
  const todayKey = today.getDate() + 31 * today.getMonth() + 366 * today.getFullYear();
  const isPrevDay = dateKey < todayKey;

  // Get reservation count for this date
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dateStr = `${mm}-${dd}-${year}`;
  const reservedCount = getReservationCountForDate(dateStr);

  const el = document.createElement('div');
  el.className = [
    'flex items-center justify-center relative p-1 sm:p-2 text-center cursor-pointer duration-300 h-full',
    'hover:bg-orange-500/30 ring-inset ring-1 ring-gray-100',
    isPrevDay ? 'text-red-500 bg-red-300/20' : 'text-orange-900',
    isToday(year, month, day) ? 'font-bold bg-orange-200 ring-2 ring-orange-500' : '',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
  ].join(' ');

  // Set bookmark color based on reservation count
  let bookmarkColor = 'bg-green-500';
  if (reservedCount > 5) bookmarkColor = 'bg-red-500';
  else if (reservedCount > 3) bookmarkColor = 'bg-yellow-500';

  // Add random fold effect for visual variety
  const randomFold = Math.round(Math.random() * 2);
  const randomFoldDirection = randomFold == 1 ? 'rounded-br' : randomFold == 2 ? 'rounded-bl' : '';
  const randomFoldPosition = randomFold == 1 ? 'right-[1px]' : randomFold == 2 ? 'left-[1px]' : 'hidden';

  // Handle touch devices differently for bookmark visibility
  const isCoarsePointer =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const bookmarkHiddenClass = (isPrevDay && !isCoarsePointer) || reservedCount === 0 ? 'opacity-0' : '';

  // Persist metadata to restore correct visibility on selection changes
  el.dataset.reservedCount = String(reservedCount);
  el.dataset.isPrevDay = isPrevDay ? '1' : '0';

  el.innerHTML = `
    <div class="self-center">
      <p class="${
        isPrevDay
          ? 'text-sm sm:text-lg md:text-xl font-bold opacity-60'
          : isToday(year, month, day)
            ? 'text-lg sm:text-2xl md:text-3xl font-black'
            : 'text-base sm:text-xl md:text-2xl font-black'
      }">${day}</p>
      <div class="bookmark absolute top-0.5 sm:top-1 right-0.5 sm:right-1 ${bookmarkHiddenClass} duration-300">
        <div class="relative">
          <div class="bookmark-body ${bookmarkColor} w-4 sm:w-6 h-6 sm:h-8 ${randomFoldDirection}-lg shadow-md shadow-black/50 duration-300 origin-top-right z-10">
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-white text-xs font-bold">${reservedCount}</span>
            </div>
            <div class="absolute ${randomFoldPosition} bottom-[1px] w-1 h-1 ${randomFoldDirection}-md bg-white/30"></div>
          </div>
          <div class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gray-400 rounded-full shadow-sm z-20"></div>
        </div>
      </div>
    </div>
  `;

  // Stagger animation timing
  el.style.setProperty('--animation-delay', `-${Math.random() * 6}s`);

  // Accessibility attributes
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Select ${monthNames[month]} ${day}, ${year}`);
  el.setAttribute('aria-pressed', 'false');

  el.addEventListener('click', () => {
    if (state.selectedDate) {
      state.selectedDate.classList.remove('bg-orange-300');
      state.selectedDate.setAttribute('aria-pressed', 'false');
      const prev = state.selectedDate;
      const prevBookmark = prev.querySelector('.bookmark');
      if (prevBookmark) {
        const prevCount = parseInt(prev.dataset.reservedCount || '0', 10);
        const prevIsPrevDay = prev.dataset.isPrevDay === '1';
        const shouldHide = (prevIsPrevDay && !isCoarsePointer) || prevCount === 0;
        if (shouldHide) prevBookmark.classList.add('opacity-0');
        else prevBookmark.classList.remove('opacity-0');
      }
    }
    el.classList.add('bg-orange-300');
    state.selectedDate = el;
    state.selectedDate.setAttribute('aria-pressed', 'true');
    state.selectedDate.querySelector('.bookmark')?.classList.remove('opacity-0');

    // Persist selected date details for submission
    state.selectedDate.dataset.day = String(day);
    state.selectedDate.dataset.month = String(month + 1);
    state.selectedDate.dataset.year = String(year);

    // Update booking form date field if it exists
    const bookingDateInput = document.getElementById('bookingDate');
    if (bookingDateInput) {
      bookingDateInput.value = `${monthNames[month]} ${day}, ${year}`;
    }

    // Open modal listing reservations for this date only if there is at least 1 reservation
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${mm}-${dd}-${year}`;
    const countForDay = getReservationCountForDate(dateStr);
    if (countForDay > 0) {
      openDateReservationsModal(dateStr);
    }
  });

  // Show bookmark on hover for past days
  el.addEventListener('mouseenter', () => {
    if (!isCoarsePointer && isPrevDay) el.querySelector('.bookmark')?.classList.remove('opacity-0');
  });
  el.addEventListener('mouseleave', () => {
    if (el === state.selectedDate) return;
    if (isPrevDay) el.querySelector('.bookmark')?.classList.add('opacity-0');
  });

  // Keyboard support
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });

  return el;
}

function renderCalendar(container) {
  const grid = container.querySelector('[data-cal="grid"]');
  grid.innerHTML = '';

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Add previous month trailing days
  const prevMonth = new Date(year, month - 1, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const el = createDayElement(dayNum, month - 1, year);
    grid.appendChild(el);
  }

  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const el = createDayElement(day, month, year);
    grid.appendChild(el);
  }

  // Add next month leading days to complete the grid
  const totalCells = grid.children.length;
  const remainingCells = 6 * 7 - totalCells;
  for (let day = 1; day <= remainingCells; day++) {
    const el = createDayElement(day, month + 1, year);
    grid.appendChild(el);
  }
}

function bindEvents(container) {
  container.querySelector('[data-cal="prevMonth"]').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    render(container);
  });
  container.querySelector('[data-cal="nextMonth"]').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    render(container);
  });
  container.querySelector('[data-cal="prevYear"]').addEventListener('click', () => {
    state.currentDate.setFullYear(state.currentDate.getFullYear() - 1);
    render(container);
  });
  container.querySelector('[data-cal="nextYear"]').addEventListener('click', () => {
    state.currentDate.setFullYear(state.currentDate.getFullYear() + 1);
    render(container);
  });
}

function render(container) {
  renderHeader(container);
  renderCalendar(container);
}

function mount() {
  const mountPoint = document.getElementById(CONTAINER_ID);
  if (!mountPoint) return;

  // Build calendar HTML structure
  mountPoint.innerHTML = `
    <div class="flex h-full w-full flex-col bg-white">
      <div class="flex items-center justify-between border-b p-2 sm:p-4">
        <button type="button" data-cal="prevMonth" class="rounded-lg p-2 sm:p-3 transition-colors hover:bg-gray-100">
          <i class="fas fa-chevron-left w-6 sm:w-10 text-lg sm:text-xl"></i>
        </button>
        <div class="flex items-center justify-center gap-2 sm:gap-6">
          <div data-cal="month" class="text-lg sm:text-2xl font-semibold"></div>
          <div class="flex items-center">
            <button type="button" data-cal="prevYear" class="rounded-r px-2 sm:px-3 py-1 sm:py-2 text-gray-600 hover:bg-gray-100">
              <i class="fas fa-chevron-left text-sm sm:text-xl"></i>
            </button>
            <span data-cal="year" class="bg-gray-100 px-2 sm:px-4 py-1 sm:py-2 text-lg sm:text-2xl font-semibold"></span>
            <button type="button" data-cal="nextYear" class="rounded-l px-2 sm:px-3 py-1 sm:py-2 text-gray-600 hover:bg-gray-100">
              <i class="fas fa-chevron-right text-sm sm:text-xl"></i>
            </button>
          </div>
        </div>
        <button type="button" data-cal="nextMonth" class="rounded-lg p-2 sm:p-3 transition-colors hover:bg-gray-100">
          <i class="fas fa-chevron-right w-6 sm:w-10 text-lg sm:text-xl"></i>
        </button>
      </div>
      <div class="grid grid-cols-7 border-b bg-gray-50 p-2 sm:p-4 text-center text-sm sm:text-lg font-medium text-gray-600">
        <p class="text-xs sm:text-base">Sun</p>
        <p class="text-xs sm:text-base">Mon</p>
        <p class="text-xs sm:text-base">Tue</p>
        <p class="text-xs sm:text-base">Wed</p>
        <p class="text-xs sm:text-base">Thu</p>
        <p class="text-xs sm:text-base">Fri</p>
        <p class="text-xs sm:text-base">Sat</p>
      </div>
      <div data-cal="grid" class="grid flex-1 h-full grid-cols-7 grid-rows-6"></div>
    </div>`;

  // Add bookmark animation styles
  if (!document.querySelector('#bookmark-styles')) {
    const style = document.createElement('style');
    style.id = 'bookmark-styles';
    style.textContent = `
      @keyframes cloth-sway {
        0%, 100% { transform: rotate(0deg); }
        20%, 60% { transform: rotate(-5deg); }
        40%, 80% { transform: rotate(5deg); }
      }
      .bookmark-body { animation: cloth-sway 6s ease-out infinite; animation-delay: var(--animation-delay, 0s); }
    `;
    document.head.appendChild(style);
  }

  bindEvents(mountPoint);
  render(mountPoint);

  // Start Firestore listener and setup cleanup
  try {
    state.unsubscribe?.();
  } catch (e) {}
  state.unsubscribe = listenToReservationsFE();
  window.addEventListener('beforeunload', () => state.unsubscribe?.());

  // Enhance service selection UI highlighting
  const serviceRadios = document.querySelectorAll('input[name="service"]');
  if (serviceRadios.length) {
    document.querySelectorAll('.service-selected-badge').forEach((el) => el.remove());

    const applyServiceHighlight = () => {
      serviceRadios.forEach((r) => {
        const label = r.closest('label');
        if (!label) return;
        const isChecked = r.checked;
        label.classList.toggle('bg-orange-100', isChecked);
        label.classList.toggle('border-orange-500', isChecked);
        label.classList.toggle('ring-2', isChecked);
        label.classList.toggle('ring-orange-400', isChecked);

        // Update ARIA attributes
        label.setAttribute('role', 'radio');
        label.setAttribute('aria-checked', String(isChecked));
      });
    };

    serviceRadios.forEach((r) => r.addEventListener('change', applyServiceHighlight));
    applyServiceHighlight();
  }

  // Booking form validation and time suggestions
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');
    const timeError = document.getElementById('timeError');

    const toMinutes = (val) => {
      const [h, m] = (val || '0:0').split(':').map((v) => parseInt(v, 10));
      return h * 60 + m;
    };
    const toHHMM = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Clear error messages
    const clearError = () => {
      if (timeError) {
        timeError.textContent = '';
        timeError.classList.add('hidden');
      }
    };

    startInput?.addEventListener('change', () => {
      if (!endInput || !startInput.value) return;
      clearError();
    });

    endInput?.addEventListener('change', clearError);

    bookingForm.addEventListener('submit', async (e) => {
      const startVal = startInput?.value || '';
      const endVal = endInput?.value || '';

      const showError = (msg) => {
        if (timeError) {
          timeError.textContent = msg;
          timeError.classList.remove('hidden');
          timeError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          alert(msg);
        }
      };

      const WORK_START = toMinutes('09:00'); // 9:00 AM
      const WORK_END = toMinutes('23:59'); // 11:59 PM

      if (startVal && endVal) {
        const startMins = toMinutes(startVal);
        const endMins = toMinutes(endVal);

        if (startMins < WORK_START || startMins > WORK_END) {
          e.preventDefault();
          showError('Start time is outside our operating hours (9:00 AM - 11:59 PM). Please choose a start time within this range.');
          startInput?.focus();
          return;
        }

        if (endMins < WORK_START || endMins > WORK_END) {
          e.preventDefault();
          showError('Start time is outside our operating hours (9:00 AM - 11:59 PM). Please choose a start time within this range.');
          endInput?.focus();
          return;
        }
      }

      // Resolve selected date in mm-dd-yyyy
      const bookingDateInput = document.getElementById('bookingDate');
      let dateMMDDYYYY = '';
      if (state.selectedDate?.dataset?.day && state.selectedDate?.dataset?.month && state.selectedDate?.dataset?.year) {
        const mm = String(parseInt(state.selectedDate.dataset.month, 10)).padStart(2, '0');
        const dd = String(parseInt(state.selectedDate.dataset.day, 10)).padStart(2, '0');
        const yyyy = state.selectedDate.dataset.year;
        dateMMDDYYYY = `${mm}-${dd}-${yyyy}`;
      } else if (bookingDateInput?.value) {
        dateMMDDYYYY = parseHumanDateToMMDDYYYY(bookingDateInput.value);
      }

      if (!dateMMDDYYYY) {
        e.preventDefault();
        showError('Please select a valid reservation date.');
        return;
      }

      // Past date check
      const [mm, dd, yyyy] = dateMMDDYYYY.split('-').map((n) => parseInt(n, 10));
      const selectedMidnight = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      if (selectedMidnight < todayMidnight) {
        e.preventDefault();
        showError('Selected date cannot be in the past.');
        return;
      }

      // Facility hours constraints and duration
      const startMins = toMinutes(startVal || '00:00');
      const endMins = toMinutes(endVal || '00:00');
      const durationSelect = document.getElementById('duration');
      const durationHours = durationSelect.value;

      // Helper: validate that (End - Start) strictly equals the selected duration (in minutes)
      // Returns: { valid: boolean, message: string }
      function validateDuration(startTimeStr, endTimeStr, selectedDurationRaw) {
        const parseTimeToMinutes = (s) => {
          const str = String(s || '').trim();
          if (!str) return NaN;

          // 12-hour format with AM/PM (e.g., "8:00 AM", "12 PM")
          const ampmMatch = str.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)\s*$/i);
          if (ampmMatch) {
            let h = parseInt(ampmMatch[1], 10);
            const m = parseInt(ampmMatch[2] || '0', 10);
            const ap = ampmMatch[3].toLowerCase();
            if (h === 12) h = 0; // 12am -> 0, 12pm handled by adding 12 below
            const hours24 = ap === 'pm' ? h + 12 : h;
            if (hours24 < 0 || hours24 > 23 || m < 0 || m > 59) return NaN;
            return hours24 * 60 + m;
          }

          // 24-hour format "HH:mm"
          const hhmmMatch = str.match(/^\s*(\d{1,2})(?::(\d{2}))\s*$/);
          if (hhmmMatch) {
            const h = parseInt(hhmmMatch[1], 10);
            const m = parseInt(hhmmMatch[2] || '0', 10);
            if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
            return h * 60 + m;
          }

          return NaN;
        };

        const parseDurationToMinutes = (raw) => {
          const val = String(raw ?? '')
            .trim()
            .toLowerCase();
          if (!val) return NaN;

          const numMatch = val.match(/([0-9]*\.?[0-9]+)/);
          if (!numMatch) return NaN;
          const num = parseFloat(numMatch[1]);
          if (!Number.isFinite(num)) return NaN;

          const isMin = /\bmin(s|ute|utes)?\b/.test(val);
          const isHour = /\b(h|hr|hrs|hour|hours)\b/.test(val);

          if (isMin && isHour) return NaN; // ambiguous

          if (isMin) return Math.round(num);
          if (isHour) return Math.round(num * 60);

          // No unit: infer
          if (val.includes('.')) {
            // decimals indicate hours (e.g., "1.5")
            return Math.round(num * 60);
          }
          // Small integers are hours (project uses 1-7 hrs), larger are minutes
          if (num <= 10) return Math.round(num * 60);
          return Math.round(num);
        };

        const s = parseTimeToMinutes(startTimeStr);
        const e = parseTimeToMinutes(endTimeStr);
        const d = parseDurationToMinutes(selectedDurationRaw);

        if (!Number.isFinite(s) || !Number.isFinite(e)) {
          return { valid: false, message: 'Invalid time format. Please use a valid time (e.g., 08:00 or 8:00 AM).' };
        }
        if (!Number.isFinite(d)) {
          return { valid: false, message: 'Could not parse selected duration.' };
        }
        if (e <= s) {
          return { valid: false, message: 'End Time must be later than Start Time.' };
        }

        const delta = e - s;
        if (delta !== d) {
          return {
            valid: false,
            message: 'Selected duration must match the difference between Start Time and End Time.',
          };
        }
        return { valid: true, message: '' };
      }

      if (startMins < 9 * 60) {
        e.preventDefault();
        showError('Reservation cannot start before 09:00 AM.');
        return;
      }
      if (endMins > 23 * 60 + 59) {
        e.preventDefault();
        showError('Reservation cannot end after 11:59 PM.');
        return;
      }
      if (+durationHours < 1) {
        e.preventDefault();
        showError('Reservation must be at least 1 hour.');
        return;
      }
      if (durationHours > 7) {
        e.preventDefault();
        showError('Reservation cannot exceed 7 hours.');
        return;
      }

      // Enforce that (End - Start) equals selected duration exactly
      {
        const durationCheck = validateDuration(startVal, endVal, durationSelect?.value);
        if (!durationCheck.valid) {
          e.preventDefault();
          showError(durationCheck.message);
          return;
        }
      }

      // Same-day past time check
      const now = new Date();
      const todayMM = String(now.getMonth() + 1).padStart(2, '0');
      const todayDD = String(now.getDate()).padStart(2, '0');
      const todayYYYY = now.getFullYear();
      const todayStr = `${todayMM}-${todayDD}-${todayYYYY}`;
      if (dateMMDDYYYY === todayStr && isTimeInPast(dateMMDDYYYY, startVal)) {
        e.preventDefault();
        showError('Cannot book past time slots on the same day.');
        return;
      }

      // Conflicts and minimum gap
      if (hasTimeConflict(dateMMDDYYYY, startVal, endVal)) {
        e.preventDefault();
        const conflict = getConflictingReservation(dateMMDDYYYY, startVal, endVal);
        const conflictTime = conflict ? `${conflict.startTime} to ${conflict.endTime}` : 'the selected time';
        showError(`This time overlaps with an existing booking (${conflictTime}). Please choose a different time.`);
        return;
      }

      if (hasMinimumGap(dateMMDDYYYY, startVal, endVal)) {
        e.preventDefault();
        const conflict = getConflictingReservationForGap(dateMMDDYYYY, startVal, endVal);
        const nextTime = getNextAvailableTime(dateMMDDYYYY, startVal, durationHours) || 'later';
        showError(`Selected time is too close to another booking. Earliest available start: ${nextTime}.`);
        return;
      }

      // Build reservation object (admin parity fields)
      const id = 'R' + Date.now();

      const serviceChecked = document.querySelector('input[name="service"]:checked');
      let reservationType = 'basketball';
      if (serviceChecked) {
        const labelText = serviceChecked.closest('label')?.innerText?.trim();
        reservationType = labelText || serviceChecked.value || 'basketball';
      }

      const amount = calculateDynamicPrice(startVal, durationHours);

      const reservation = {
        id,
        customerName: sessionStorage.getItem('full_name'),
        reservationType,
        date: dateMMDDYYYY,
        startTime: startVal,
        endTime: endVal,
        status: 'Pending',
        amount,
      };

      try {
        e.preventDefault();
        // Clear previous error if any and optionally update any price UI
        if (timeError) {
          timeError.textContent = '';
          timeError.classList.add('hidden');
        }
        // Optionally set tid via updateReservationFE once you get a transactionId
        // await updateReservationFE(reservation.id, { tid: transactionId });
        const prepared = prepareFormData({
          id,
          customerName: sessionStorage.getItem('full_name'),
          reservationType,
          dateMMDDYYYY,
          startVal,
          endVal,
          amount,
        });
        openPaymentModal(reservation, prepared);
      } catch (err) {
        e.preventDefault();
        showError('Error creating reservation. Please try again.');
      }
    });
  }
}

function openPaymentModal(reservation, preparedRegistrationData) {
  const totalAmount = preparedRegistrationData.get('amount');
  const totalLabel = `Total amount to pay: ₱${totalAmount}`;

  const modalHTML = `
      <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-50 hidden" id="monthlyPassPaymentModal">
        <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
          <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-center text-white">
            <p class="text-xl font-medium">💳 Payment Details (GCash)</p>
          </div>
          <div class="p-6 text-left text-sm text-gray-800 space-y-3">
            <p class="font-semibold">${totalLabel}</p>
            <p>Scan QR Code below via GCash</p>
            <div class="flex items-center justify-center">
              <img src="/src/images/qr.jpg" alt="GCash QR Code" class="max-h-56 rounded-md border" />
            </div>
            <div class="space-y-1">
              <p class="font-semibold">Account Details:</p>
              <p>Name: Gerald Luna</p>
              <p>Number: 09633226873</p>
            </div>
            <form id="paymentForm" class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="gcashRef">GCash Reference Number</label>
                <input id="gcashRef" name="gcashRef" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="gcashName">Account Name</label>
                <input id="gcashName" name="gcashName" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1" for="gcashAmount">Amount Paid</label>
                <input id="gcashAmount" name="gcashAmount" type="text" inputmode="decimal" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 cursor-not-allowed" value="${main.encodePrice(totalAmount)}" readonly required />
              </div>
              <p class="text-xs text-gray-600">Please ensure all details are correct before submitting. Payment verification may take a few minutes.</p>
              <p class="inline-validation-msg mt-2 text-xs text-red-600"></p>
            </form>
          </div>
          <div class="flex gap-3 p-6">
            <button type="button" id="mpPayCancel" class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">Cancel</button>
            <button type="button" id="mpPaySubmit" class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600">Submit Payment</button>
          </div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('monthlyPassPaymentModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  // 13-digit limit for GCash Reference Number with early duplicate check
  const gcashRefInput = /** @type {HTMLInputElement|null} */ (document.getElementById('gcashRef'));
  // Add real-time empty-field highlighting
  const gcashNameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('gcashName'));
  const gcashAmountInput = /** @type {HTMLInputElement|null} */ (document.getElementById('gcashAmount'));
  [gcashRefInput, gcashNameInput, gcashAmountInput].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => {
      if (String(el.value).trim()) {
        el.classList.remove('border-red-500');
      }
    });
    el.addEventListener('blur', () => {
      const empty = !String(el.value).trim();
      el.classList.toggle('border-red-500', empty);
    });
  });
  if (gcashRefInput) {
    try {
      gcashRefInput.maxLength = 13;
    } catch (_) {}
    gcashRefInput.setAttribute('inputmode', 'numeric');
    let refCheckAbort = null;
    gcashRefInput.addEventListener('input', async () => {
      const digitsOnly = String(gcashRefInput.value).replace(/\D/g, '');
      if (digitsOnly.length > 13) {
        try {
          if (typeof Toastify === 'function') {
            Toastify({
              text: 'GCash Reference must be 13 digits',
              duration: 2500,
              gravity: 'top',
              position: 'right',
              close: true,
            }).showToast();
          }
        } catch (_) {}
      }
      gcashRefInput.value = digitsOnly.slice(0, 13);

      // Reset UI state unless a duplicate is detected below
      const submitBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('mpPaySubmit'));
      const msg = /** @type {HTMLParagraphElement|null} */ (
        document.querySelector('#paymentForm .inline-validation-msg')
      );
      if (submitBtn) submitBtn.disabled = false;
      gcashRefInput.classList.remove('border-red-500');
      if (msg) msg.textContent = '';

      // Early uniqueness check when exactly 13 digits
      if (gcashRefInput.value.length === 13) {
        try {
          if (refCheckAbort && typeof refCheckAbort.abort === 'function') refCheckAbort.abort();
          refCheckAbort = new AbortController();
          const resp = await fetch(`${API_BASE_URL}/payment/ref/check/${encodeURIComponent(gcashRefInput.value)}`, {
            signal: refCheckAbort.signal,
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.used) {
              if (submitBtn) submitBtn.disabled = true;
              gcashRefInput.classList.add('border-red-500');
              if (msg) msg.textContent = 'This reference number has already been used. Please enter a valid one.';
              try {
                if (typeof Toastify === 'function') {
                  Toastify({
                    text: 'Reference already used',
                    duration: 3000,
                    gravity: 'top',
                    position: 'right',
                    close: true,
                  }).showToast();
                }
              } catch (_) {}
            }
          }
        } catch (e) {}
      }
    });
  }

  const close = () => {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };

  // modal.addEventListener('click', (e) => {
  //   if (e.target === modal) close();
  // });
  document.getElementById('mpPayCancel').addEventListener('click', close);
  document.getElementById('mpPaySubmit').addEventListener('click', () => {
    const earlyBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('mpPaySubmit'));
    if (earlyBtn && earlyBtn.disabled) return; // blocked by early duplicate check
    if (document.getElementById('mpPaySubmit').disabled) {
      return;
    }
    const form = /** @type {HTMLFormElement|null} */ (document.getElementById('paymentForm'));
    const msg = /** @type {HTMLParagraphElement|null} */ (modal.querySelector('.inline-validation-msg'));
    if (!form || !msg) return;
    const gcashRef = /** @type {HTMLInputElement} */ (form.querySelector('#gcashRef'))?.value?.trim();
    const gcashName = /** @type {HTMLInputElement} */ (form.querySelector('#gcashName'))?.value?.trim();
    const gcashAmountRaw = /** @type {HTMLInputElement} */ (form.querySelector('#gcashAmount'))?.value?.trim();

    if (!gcashRef || !gcashName || !gcashAmountRaw) {
      msg.textContent = 'Please fill in all payment details.';
      const refEl = /** @type {HTMLInputElement|null} */ (form.querySelector('#gcashRef'));
      const nameEl = /** @type {HTMLInputElement|null} */ (form.querySelector('#gcashName'));
      const amtEl = /** @type {HTMLInputElement|null} */ (form.querySelector('#gcashAmount'));
      if (refEl && !String(refEl.value).trim()) refEl.classList.add('border-red-500');
      if (nameEl && !String(nameEl.value).trim()) nameEl.classList.add('border-red-500');
      if (amtEl && !String(amtEl.value).trim()) amtEl.classList.add('border-red-500');
      return;
    }

    const refDigits = String(gcashRef).replace(/\D/g, '');
    if (refDigits.length !== 13) {
      msg.textContent = 'Reference number must be exactly 13 digits.';
      try {
        if (typeof Toastify === 'function') {
          Toastify({
            text: 'Reference number must be exactly 13 digits',
            duration: 3000,
            gravity: 'top',
            position: 'right',
            close: true,
          }).showToast();
        }
      } catch (_) {}
      return;
    }

    const normalizeAmount = (val) => {
      const cleaned = String(val).replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      const normalized = parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
      const num = Number(normalized);
      return Number.isFinite(num) ? num : NaN;
    };

    const gcashAmountNum = normalizeAmount(gcashAmountRaw);
    if (!Number.isFinite(gcashAmountNum)) {
      msg.textContent = 'Please enter a valid amount (numbers only).';
      const amtEl = /** @type {HTMLInputElement|null} */ (form.querySelector('#gcashAmount'));
      if (amtEl) amtEl.classList.add('border-red-500');
      return;
    }
    if (Math.abs(gcashAmountNum - totalAmount) > 0.009) {
      msg.textContent = `Amount must be exactly ₱${totalAmount}.`;
      const amtEl = /** @type {HTMLInputElement|null} */ (form.querySelector('#gcashAmount'));
      if (amtEl) amtEl.classList.add('border-red-500');
      return;
    }

    const paymentData = preparePaymentFormData({
      gcashRef,
      gcashName,
      gcashAmount: String(totalAmount),
      totalAmount,
    });

    // Example merging for future submission
    const unified = new FormData();
    preparedRegistrationData.forEach((v, k) => unified.set('reg_' + k, v));
    paymentData.forEach((v, k) => unified.set('pay_' + k, v));

    // Provide user feedback during submission
    const submitBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('mpPaySubmit'));
    const cancelBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('mpPayCancel'));
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }

    // Submit to backend (create customer, monthly record, and pending payment)
    submitMonthlyRegistration(reservation, preparedRegistrationData, paymentData)
      .then(() => {
        close();
        openConfirmationModal();
      })
      .catch((err) => {
        console.error('[MonthlyPass] Submission failed', err);
        if (msg) {
          if (String(err && err.message) === 'DUPLICATE_REF') {
            msg.textContent = 'This reference number has already been used. Please enter a valid one.';
          } else {
            msg.textContent = 'Submission failed. Please try again.';
          }
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Payment';
        }
        if (cancelBtn) {
          cancelBtn.disabled = false;
        }
      });
  });
}

// -------------------------
// Date Reservations Modal (customer-facing)
// -------------------------
function openDateReservationsModal(dateMMDDYYYY) {
  try {
    const modalRoot = document.getElementById('customerModalRoot') || document.body;
    const [mm, dd, yyyy] = (dateMMDDYYYY || '').split('-');
    const humanDate = (() => {
      const mIdx = Math.max(0, parseInt(mm, 10) - 1);
      const dNum = parseInt(dd, 10);
      const yNum = parseInt(yyyy, 10);
      if (!Number.isFinite(mIdx) || !Number.isFinite(dNum) || !Number.isFinite(yNum)) return dateMMDDYYYY;
      return `${monthNames[mIdx]} ${dNum}, ${yNum}`;
    })();

    const to12h = (s) => {
      const str = String(s || '').trim();
      const m = str.match(/^(\d{1,2})(?::(\d{2}))$/);
      if (!m) return '--:--';
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2] || '0', 10);
      if (!Number.isFinite(h) || !Number.isFinite(min)) return '--:--';
      if (h < 0 || h > 23 || min < 0 || min > 59) return '--:--';
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      const mm2 = String(min).padStart(2, '0');
      return `${h}:${mm2} ${ap}`;
    };

    const now = new Date();
    const reservationsForDay = state.reservations
      .filter((r) => r?.date === dateMMDDYYYY)
      .filter((r) => parseDateTime(r.date, r.endTime) > now)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const listItems = reservationsForDay.length
      ? reservationsForDay
          .map((r) => {
            const status = String(r.status || 'Pending');
            const statusColor =
              status === 'Pending'
                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                : 'bg-green-100 text-green-800 border-green-200';
            const time = `${to12h(r.startTime)} – ${to12h(r.endTime)}`;
            const type = r.reservationType || '—';
            return `
              <li class="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                <div class="flex flex-col">
                  <span class="font-semibold text-gray-800">${time}</span>
                  <span class="text-gray-600">${type}</span>
                </div>
                <span class="whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${statusColor}">${status}</span>
              </li>`;
          })
          .join('')
      : `<li class="rounded-md border border-dashed p-4 text-center text-sm text-gray-500">No reservations found for this date.</li>`;

    const modalHTML = `
      <div class="fixed inset-0 z-50 hidden h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300" id="dateReservationsModal">
        <div class="m-auto w-full max-w-lg -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-white">
            <p class="text-base sm:text-lg font-medium">📅 Reservations on ${humanDate}</p>
            <button type="button" class="rounded-md bg-white/20 px-2 py-1 text-sm hover:bg-white/30" id="dateResClose">Close</button>
          </div>
          <div class="p-4 sm:p-6">
            <ul class="flex flex-col gap-2">
              ${listItems}
            </ul>
          </div>
        </div>
      </div>`;

    // Ensure only one instance at a time
    document.getElementById('dateReservationsModal')?.remove();
    modalRoot.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('dateReservationsModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.add('opacity-100');
      modal.children[0].classList.remove('-translate-y-6');
      modal.children[0].classList.add('scale-100');
    }, 10);

    const close = () => {
      modal.classList.remove('opacity-100');
      modal.children[0].classList.add('-translate-y-6');
      modal.children[0].classList.remove('scale-100');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.remove();
      }, 300);
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    modal.querySelector('#dateResClose')?.addEventListener('click', close);
  } catch (_) {
    // no-op
  }
}

function preparePaymentFormData(payload) {
  const data = new FormData();
  data.set('gcashRef', payload.gcashRef);
  data.set('gcashName', payload.gcashName);
  data.set('gcashAmount', payload.gcashAmount);
  data.set('totalExpected', String(payload.totalAmount));
  return data;
}

async function submitMonthlyRegistration(reservation, regData, payData) {
  const amount = regData.get('amount');
  const rate = 'Regular';

  // Generate ids similar to admin-side conventions
  const customerId = sessionStorage.getItem('id');
  const transactionId = `T${Date.now()}`;

  const fullName = String(regData.get('customerName') || '').trim();
  const [firstName, ...lastParts] = fullName.split(/\s+/);
  const lastName = lastParts.join(' ') || '';
  const startDate = String(regData.get('startDate'));
  const endDate = String(regData.get('endDate'));

  // Create pending payment first; only create reservation after backend accepts it

  const resp = await fetch(`${API_BASE_URL}/payment/pending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payment_id: transactionId,
      payment_customer_id: customerId,
      payment_purpose: `Online facility reservation fee - Reference: ${payData.get('gcashRef')} from Account: ${payData.get('gcashName')}`,
      payment_amount_to_pay: amount,
      payment_rate: rate,
      payment_ref: String(payData.get('gcashRef') || ''),
      payment_monthly_url: '',
      payment_student_url: '',
    }),
  });
  if (!resp.ok) {
    if (resp.status === 409) {
      // Duplicate reference: do not create a reservation entry
      throw new Error('DUPLICATE_REF');
    }
    throw new Error(`HTTP_${resp.status}`);
  }

  // Backend accepted the payment pending record; now persist the reservation
  reservation.customerId = customerId;
  reservation.tid = transactionId;
  await createReservationFE(reservation);
}

function openConfirmationModal() {
  const message =
    'We have sent a notification to the email you provided. You will receive verification once your payment is confirmed.';
  const modalHTML = `
      <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-50 hidden" id="calendarConfirmation">
        <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
          <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-center text-white">
            <p class="text-xl font-medium">✅ Confirmation</p>
          </div>
          <div class="p-6 text-left text-sm text-gray-800">
            ${message}
          </div>
          <div class="flex gap-3 p-6">
            <button type="button" id="mpConfOk" class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600">OK</button>
          </div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('calendarConfirmation');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const close = () => {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.getElementById('mpConfOk').addEventListener('click', close);
}

function prepareFormData(payload) {
  const data = new FormData();
  data.set('id', payload.id);
  data.set('customerName', payload.customerName);
  data.set('reservationType', payload.reservationType);
  data.set('dateMMDDYYYY', payload.dateMMDDYYYY);
  data.set('startVal', payload.startVal);
  data.set('endVal', payload.endVal);
  data.set('amount', payload.amount);
  return data;
}

function initializeCalendar() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}

initializeCalendar();
