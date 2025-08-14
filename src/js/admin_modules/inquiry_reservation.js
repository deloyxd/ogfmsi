import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'inquiry-reservation';

let mainBtn;
let bindActivated = false;

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
  mainBtn?.addEventListener('click', mainBtnFunction);

  if (!bindActivated) {
    bindActivated = true;
    bindEvents();
  }
  render();
});

function mainBtnFunction() {}

const currentDate = new Date();
const today = new Date();
let selectedDate = null;

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

function bindEvents() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
  });

  document.getElementById('prevYear').addEventListener('click', () => {
    currentDate.setFullYear(currentDate.getFullYear() - 1);
    render();
  });

  document.getElementById('nextYear').addEventListener('click', () => {
    currentDate.setFullYear(currentDate.getFullYear() + 1);
    render();
  });
}

function render() {
  renderHeader();
  renderCalendar();
}

function renderHeader() {
  document.getElementById('month').innerHTML = `${monthNames[currentDate.getMonth()]}`;
  document.getElementById('year').innerHTML = `${currentDate.getFullYear()}`;
}

function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  calendarGrid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of the month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Previous month's trailing days
  const prevMonth = new Date(year, month - 1, 0);
  const prevMonthDays = prevMonth.getDate();

  // Add previous month's trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const dayElement = createDayElement(dayNum, month - 1, false);
    calendarGrid.appendChild(dayElement);
  }

  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = createDayElement(day, month, isToday(year, month, day));
    calendarGrid.appendChild(dayElement);
  }

  // Add next month's leading days
  const totalCells = calendarGrid.children.length;
  const remainingCells = 6 * 7 - totalCells; // 6 rows × 7 days

  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createDayElement(day, month + 1, false);
    calendarGrid.appendChild(dayElement);
  }
}

function createDayElement(day, month, isToday) {
  const isPreviousDay = day + 30 * month < today.getDate() + 30 * today.getMonth();
  // get live reservation count at this date
  const reservedCount = Math.max(0, Math.round(Math.random() * 11) - 5);
  const dayElement = document.createElement('div');
  dayElement.className = `
      relative p-2 text-center cursor-pointer duration-300
      hover:bg-teal-500/50
      ${isPreviousDay ? 'text-red-500 bg-red-300/30' : 'text-teal-800'}
      ${isToday ? 'ring-inset ring-2 ring-teal-500 font-bold bg-teal-300' : ''}
  `;

  dayElement.innerHTML = `
      <div class="flex flex-col gap-1 justify-center items-center">
          <p class="text-sm">${day}</p>
          <div class="duration-300 opacity-0 text-xs font-black bg-gray-200/50 rounded-full px-4 py-1 emoji">${getEmoji('📅', 14)}</div>
          <div id="dot" class="absolute right-2 top-2 ${reservedCount <= 0 || isPreviousDay ? 'hidden' : ''}">
            <div class="relative h-2 w-2">
              <div class="absolute h-full w-full scale-105 animate-ping rounded-full opacity-75"></div>
              <div class="absolute h-2 w-2 rounded-full"></div>
            </div>
          </div>
      </div>
  `;
  if (reservedCount > 5) {
    dayElement.querySelector(`#dot`).children[0].children[0].classList.add('bg-red-500');
    dayElement.querySelector(`#dot`).children[0].children[1].classList.add('bg-red-500');
  } else if (reservedCount > 3) {
    dayElement.querySelector(`#dot`).children[0].children[0].classList.add('bg-yellow-500');
    dayElement.querySelector(`#dot`).children[0].children[1].classList.add('bg-yellow-500');
  } else {
    dayElement.querySelector(`#dot`).children[0].children[0].classList.add('bg-green-500');
    dayElement.querySelector(`#dot`).children[0].children[1].classList.add('bg-green-500');
  }

  dayElement.addEventListener('click', () => {
    if (selectedDate) {
      selectedDate.classList.remove('bg-teal-400');
      selectedDate.children[0].children[1].classList.add('opacity-0');
    }

    if (!isPreviousDay) {
      dayElement.classList.add('bg-teal-400');
      selectedDate = dayElement;
      selectedDate.children[0].children[1].classList.remove('opacity-0');
    }
  });

  dayElement.addEventListener('mouseenter', () => {
    dayElement.children[0].children[1].classList.remove('opacity-0');
    dayElement.children[0].children[1].innerHTML = `${getEmoji('📅', 14)}${reservedCount}`;
  });

  dayElement.addEventListener('mouseleave', () => {
    if (dayElement == selectedDate) {
      return;
    }
    dayElement.children[0].children[1].classList.add('opacity-0');
  });

  return dayElement;
}

function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}
