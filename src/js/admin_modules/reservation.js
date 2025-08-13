import main from '../admin_main.js';
import accesscontrol from './accesscontrol.js';

const SECTION_NAME = 'reservation';

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
    const dayElement = createDayElement(dayNum, true, false);
    calendarGrid.appendChild(dayElement);
  }

  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = createDayElement(day, false, isToday(year, month, day));
    calendarGrid.appendChild(dayElement);
  }

  // Add next month's leading days
  const totalCells = calendarGrid.children.length;
  const remainingCells = 42 - totalCells; // 6 rows × 7 days

  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createDayElement(day, true, false);
    calendarGrid.appendChild(dayElement);
  }
}

function createDayElement(day, isOtherMonth, isToday) {
  const dayElement = document.createElement('div');
  dayElement.className = `
                    relative p-2 text-center cursor-pointer transition-all duration-200
                    border-r border-b border-gray-100 hover:bg-blue-50
                    ${isOtherMonth ? 'text-gray-400 bg-gray-25' : 'text-gray-800'}
                    ${isToday ? 'bg-blue-500 text-white font-semibold hover:bg-blue-600' : ''}
                `;

  dayElement.innerHTML = `
                    <span class="text-sm">${day}</span>
                `;

  // Add click event for date selection
  dayElement.addEventListener('click', () => {
    // Remove previous selection
    if (selectedDate) {
      selectedDate.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-100');
    }

    // Add selection to clicked date (only for current month)
    if (!isOtherMonth) {
      dayElement.classList.add('ring-2', 'ring-blue-400');
      if (!isToday) {
        dayElement.classList.add('bg-blue-100');
      }
      selectedDate = dayElement;
    }
  });

  return dayElement;
}

function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}
