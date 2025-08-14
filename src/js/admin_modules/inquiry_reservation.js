import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'inquiry-reservation';

let mainBtn;

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
  mainBtn?.addEventListener('click', mainBtnFunction);

  bindEvents();
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
}

function render() {
  renderHeader();
  renderCalendar();
}

function renderHeader() {
  const monthYear = document.getElementById('monthYear');
  monthYear.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
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
  const remainingCells = 42 - totalCells; // 6 rows × 7 days

  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createDayElement(day, month + 1, false);
    calendarGrid.appendChild(dayElement);
  }
}

function createDayElement(day, month, isToday) {
  const isPreviousDay = day + 30 * month < today.getDate() + 30 * today.getMonth();
  const dayElement = document.createElement('div');
  dayElement.className = `
      relative p-2 text-center cursor-pointer duration-300
      hover:bg-teal-500/50
      ${isPreviousDay ? 'text-gray-400 bg-teal-25' : 'text-teal-800'}
      ${isToday ? 'ring-inset ring-2 ring-teal-500 font-bold bg-teal-300' : ''}
  `;

  dayElement.innerHTML = `<span class="text-sm">${day}</span>`;

  dayElement.addEventListener('click', () => {
    if (selectedDate) {
      selectedDate.classList.remove('bg-teal-400');
    }

    if (!isPreviousDay) {
      dayElement.classList.add('bg-teal-400');
      selectedDate = dayElement;
    }
  });

  return dayElement;
}

function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}
