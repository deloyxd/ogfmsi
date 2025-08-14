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
  if (!document.querySelector('#bookmark-styles')) {
    const style = document.createElement('style');
    style.id = 'bookmark-styles';
    style.textContent = `
        @keyframes cloth-sway {
            0%, 100% {
                transform: rotate(0deg);
            }
            20%, 60% {
                transform: rotate(-5deg);
            }
            40%, 80% {
                transform: rotate(5deg);
            }
        }
        
        .bookmark-body {
            animation: cloth-sway 6s ease-out infinite;
        }
    `;
    document.head.appendChild(style);
  }

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
    const dayElement = createDayElement(dayNum, month - 1, year, false);
    calendarGrid.appendChild(dayElement);
  }

  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = createDayElement(day, month, year, isToday(year, month, day));
    calendarGrid.appendChild(dayElement);
  }

  // Add next month's leading days
  const totalCells = calendarGrid.children.length;
  const remainingCells = 6 * 7 - totalCells; // 6 rows × 7 days

  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createDayElement(day, month + 1, year, false);
    calendarGrid.appendChild(dayElement);
  }
}

function createDayElement(day, month, year, isToday) {
  const isPreviousDay =
    day + 31 * month + 366 * year < today.getDate() + 31 * today.getMonth() + 366 * today.getFullYear();
  // get live reservation count at this date
  const reservedCount = Math.max(0, Math.round(Math.random() * 11) - Math.round(Math.random() * 10));
  const dayElement = document.createElement('div');
  dayElement.className = `
    flex justify-center relative p-2 text-center cursor-pointer duration-300
    hover:bg-teal-500/50 ring-inset ring-1 ring-gray-100
    ${isPreviousDay ? 'text-red-500 bg-red-300/30' : 'text-teal-800'}
    ${isToday ? 'ring-inset ring-2 ring-teal-500 font-bold bg-teal-300' : ''}
`;

  let bookmarkColor = 'bg-green-500';
  if (reservedCount > 5) {
    bookmarkColor = 'bg-red-500';
  } else if (reservedCount > 3) {
    bookmarkColor = 'bg-yellow-500';
  }

  dayElement.innerHTML = `
      <div class="self-center">
          <p class="${isPreviousDay ? 'text-xs font-bold opacity-50' : isToday ? 'text-2xl font-black' : 'text-sm font-black'}">${day}</p>
          <div id="bookmark" class="absolute top-1 right-1 ${isPreviousDay || reservedCount == 0 ? 'opacity-0' : ''} duration-300">
              <div class="relative">
                  <div class="bookmark-body ${bookmarkColor} w-6 h-8 rounded-t-sm shadow-md transform origin-top-right z-10">
                      <div class="absolute inset-0 flex items-center justify-center">
                          <span class="text-white text-xs font-bold">${reservedCount}</span>
                      </div>
                  </div>
                  <div class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gray-400 rounded-full shadow-sm z-20"></div>
              </div>
          </div>
      </div>
  `;

  dayElement.addEventListener('click', () => {
    if (selectedDate) {
      selectedDate.classList.remove('bg-teal-400');
      // selectedDate.children[0].children[2].classList.remove('opacity-1');
      // selectedDate.children[0].children[2].classList.remove('cloth-drop');
    }

    if (!isPreviousDay) {
      dayElement.classList.add('bg-teal-400');
      selectedDate = dayElement;
      // selectedDate.children[0].children[2].classList.remove('opacity-0');
      // selectedDate.children[0].children[2].classList.add('cloth-drop');
    }
  });

  dayElement.addEventListener('mouseenter', () => {
    if (isPreviousDay) dayElement.querySelector(`#bookmark`).classList.remove('opacity-0');
    // dayElement.children[0].children[2].innerHTML = `${getEmoji('📅', 14)}${reservedCount}`;
  });

  dayElement.addEventListener('mouseleave', () => {
    if (dayElement == selectedDate) {
      return;
    }
    if (isPreviousDay) dayElement.querySelector(`#bookmark`).classList.add('opacity-0');
  });

  return dayElement;
}

function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}

function isPreviousDay(year, month, day) {
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const inputDateValue = year * 10000 + month * 100 + day;
  const currentDateValue = currentYear * 10000 + (currentMonth + 1) * 100 + currentDay;

  return inputDateValue < currentDateValue;
}
