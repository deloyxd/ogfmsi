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
];

const today = new Date();
const state = {
  currentDate: new Date(),
  selectedDate: null,
};

function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}

function renderHeader(container) {
  container.querySelector('[data-cal="month"]').textContent = monthNames[state.currentDate.getMonth()];
  container.querySelector('[data-cal="year"]').textContent = state.currentDate.getFullYear();
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
  const reservedCount = getReservedCount(year, month, day);

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
    }
    el.classList.add('bg-orange-300');
    state.selectedDate = el;
    state.selectedDate.setAttribute('aria-pressed', 'true');

    // Update booking form date field if it exists
    const bookingDateInput = document.getElementById('bookingDate');
    if (bookingDateInput) {
      bookingDateInput.value = `${monthNames[month]} ${day}, ${year}`;
    }
  });

  // Show bookmark on hover for past days
  el.addEventListener('mouseenter', () => {
    if (!isCoarsePointer && isPrevDay) el.querySelector('.bookmark')?.classList.remove('opacity-0');
  });
  el.addEventListener('mouseleave', () => {
    if (el === state.selectedDate) return;
    if (!isCoarsePointer && isPrevDay) el.querySelector('.bookmark')?.classList.add('opacity-0');
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
      endInput.min = startInput.value;
      if (toMinutes(endInput.value) <= toMinutes(startInput.value)) {
        // Suggest end time 60 minutes after start time
        const suggested = toMinutes(startInput.value) + 60;
        const max = endInput.max ? toMinutes(endInput.max) : Infinity;
        endInput.value = toHHMM(Math.min(suggested, max));
      }
      clearError();
    });

    endInput?.addEventListener('change', clearError);

    bookingForm.addEventListener('submit', (e) => {
      const startVal = startInput?.value || '';
      const endVal = endInput?.value || '';
      if (startVal && endVal && toMinutes(endVal) <= toMinutes(startVal)) {
        e.preventDefault();
        if (timeError) {
          timeError.textContent = 'Please select an end time later than the start time.';
          timeError.classList.remove('hidden');
          timeError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        endInput?.focus();
      }
    });
  }
}

function initializeCalendar() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}

initializeCalendar();
