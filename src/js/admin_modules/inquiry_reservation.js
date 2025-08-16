import main from '../admin_main.js';
import invoicing from './invoicing.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'inquiry-reservation';
const MODULE_NAME = 'Inquiry';
const SUBMODULE_NAME = 'Reservation';

const RESERVATION_DURATION = [
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '3', label: '3 hours' },
  { value: '4', label: '4 hours' },
  { value: '5', label: '5 hours' },
  { value: '6', label: '6 hours' },
];

const RESERVATION_TIME = [
  { value: '8:00', label: '8:00 AM' },
  { value: '9:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
];

const RESERVATION_TYPES = [
  { value: 'zumba', label: 'Zumba' },
  { value: 'basketball', label: 'Basketball' },
];

let mainBtn, sectionTwoMainBtn;
let bindActivated = false;

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
  mainBtn?.addEventListener('click', mainBtnFunction);
  sectionTwoMainBtn = document.getElementById(`${SECTION_NAME}SectionTwoMainBtn`);
  sectionTwoMainBtn?.addEventListener('click', sectionTwoMainBtnFunction);

  if (!bindActivated) {
    bindActivated = true;
    bindEvents();

    main.updateDateAndTime(SECTION_NAME);
    setInterval(main.updateDateAndTime, 10000);
  }
  render();
});

function mainBtnFunction() {}

function sectionTwoMainBtnFunction() {
  if (!selectedDate) {
    main.toast('Please select a date first!', 'error');
    return;
  }

  const inputs = {
    header: {
      title: `Reserve Facility ${getEmoji('📆', 26)}`,
      subtitle: 'Reservation form',
    },
    short: [
      { placeholder: 'User ID', value: '', required: true },
      { placeholder: 'Price per hour', value: '60', required: true },
      {
        placeholder: 'Reservation date (mm-dd-yyyy)',
        value: `${selectedDate.dataset.month}-${selectedDate.dataset.day}-${selectedDate.dataset.year}`,
        required: true,
      },
    ],
    spinner: [
      {
        label: 'Reservation duration',
        placeholder: 'Select reservation duration',
        selected: 0,
        required: true,
        options: RESERVATION_DURATION,
      },
      {
        label: 'Reservation time',
        placeholder: 'Select reservation time',
        selected: 0,
        required: true,
        options: RESERVATION_TIME,
      },
      {
        label: 'Reservation type',
        placeholder: 'Select reservation type',
        selected: 0,
        required: true,
        options: RESERVATION_TYPES,
      },
    ],
    footer: {
      main: `Reserve ${getEmoji('📆')}`,
    },
  };
  main.openModal('orange', inputs, (result) => {
    if (!main.isValidPaymentAmount(parseInt(result.short[1].value))) {
      main.toast(`Invalid price per hour: ${result.short[1].value}`, 'error');
      return;
    }

    main.findAtSectionOne('inquiry-regular', result.short[0].value, 'equal_id', 1, (user) => {
      if (!user) {
        main.toast("There's no user with that ID!", 'error');
        return;
      }

      const { _, __, fullName } = main.decodeName(user.dataset.text);
      main.openConfirmationModal(`Reservation for user: ${fullName}`, () => {
        const columnsData = [
          'id_R_random',
          { type: 'object_userid', data: [user.dataset.image, fullName, user.dataset.id] },
          main.getSelectedSpinner(result.spinner[2]), // dataset.custom2
          `${main.getSelectedSpinner(result.spinner[1])} - ${parseInt(main.getSelectedSpinner(result.spinner[1]).split(':')) + parseInt(main.getSelectedSpinner(result.spinner[0])) + ':00'}`, // dataset.custom3
          'custom_datetime_Pending',
        ];
        main.createAtSectionOne(SECTION_NAME, columnsData, 2, '', (reservation, status) => {
          if (status == 'success') {
            const actionData = {
              module: MODULE_NAME,
              submodule: SUBMODULE_NAME,
              description: 'Process user reservation',
            };
            const reservationData = {
              id: reservation.dataset.id,
              image: user.dataset.image,
              name: user.dataset.text,
              userid: user.dataset.id,
              amount: parseInt(main.getSelectedSpinner(result.spinner[0])) * parseInt(result.short[1].value),
            };
            accesscontrol.log(actionData, reservationData);
            invoicing.processReservationPayment(reservationData);

            main.createRedDot(SECTION_NAME, 2);

            main.toast('Successfully reserved facility!', 'success');
            main.closeConfirmationModal();
            main.closeModal();
          }
        });
      });
    });
  });
}

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
            animation-delay: var(--animation-delay, 0s);
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
  // todo, get live reservation count at this date
  const reservedCount = Math.max(0, Math.round(Math.random() * 11) - Math.round(Math.random() * 10));
  const dayElement = document.createElement('div');
  dayElement.className = `
    flex justify-center relative p-2 text-center cursor-pointer duration-300
    hover:bg-blue-500/50 ring-inset ring-1 ring-gray-100
    ${isPreviousDay ? 'text-red-500 bg-red-300/30' : 'text-blue-800'}
    ${isToday ? 'font-bold bg-blue-300' : ''}
    ${isToday ? 'ring-inset ring-2 ring-blue-500' : ''}
`;

  let bookmarkColor = 'bg-green-500';
  if (reservedCount > 5) {
    bookmarkColor = 'bg-red-500';
  } else if (reservedCount > 3) {
    bookmarkColor = 'bg-yellow-500';
  }

  const randomFold = Math.round(Math.random() * 2);
  const randomFoldDirection = randomFold == 1 ? 'rounded-br' : randomFold == 2 ? 'rounded-bl' : '';
  const randomFoldPosition = randomFold == 1 ? 'right-[1px]' : randomFold == 2 ? 'left-[1px]' : 'hidden';
  dayElement.innerHTML = `
      <div class="self-center">
          <p class="${isPreviousDay ? 'text-xs font-bold opacity-50' : isToday ? 'text-2xl font-black' : 'text-sm font-black'}">${day}</p>
          <div id="bookmark" class="absolute top-1 right-1 ${isPreviousDay || reservedCount == 0 ? 'opacity-0' : ''} duration-300">
              <div class="relative">
                  <div class="bookmark-body ${bookmarkColor} w-6 h-8 ${randomFoldDirection}-lg shadow-md shadow-black/50 duration-300 origin-top-right z-10">
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

  dayElement.style.setProperty('--animation-delay', `-${Math.random() * 6}s`);

  dayElement.addEventListener('click', () => {
    if (selectedDate) {
      selectedDate.classList.remove('bg-blue-400');
    }

    const inquiryReservationQuick = document.getElementById(`inquiryReservationQuick`).children[0];
    inquiryReservationQuick.children[0].textContent = `${monthNames[month]} ${day}, ${year} - Reservations: ${reservedCount}`;
    inquiryReservationQuick.children[1].classList.remove('hidden');
    inquiryReservationQuick.children[0].classList.add('text-black');
    inquiryReservationQuick.children[1].classList.add('text-black', 'mt-2');

    if (isPreviousDay) {
      inquiryReservationQuick.children[1].innerHTML = `${getEmoji('‼️', 12)} Past dates cannot be reserved anymore.`;
    } else {
      dayElement.classList.add('bg-blue-400');
      selectedDate = dayElement;
      selectedDate.dataset.day = day;
      selectedDate.dataset.month = month + 1;
      selectedDate.dataset.year = year;
      inquiryReservationQuick.children[1].innerHTML = `Click the button below ${getEmoji('👇', 12)} to reserve this date.`;
    }
  });

  dayElement.addEventListener('mouseenter', () => {
    if (isPreviousDay) dayElement.querySelector(`#bookmark`).classList.remove('opacity-0');
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
