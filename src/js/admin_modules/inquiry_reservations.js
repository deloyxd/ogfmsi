import main from '../admin_main.js';
import customers from './inquiry_customers.js';
import payments from './payments.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'inquiry-reservations';
const MODULE_NAME = 'Inquiry';
const SUBMODULE_NAME = 'Reservations';

// Time selection now uses native time inputs; removed old 5/15-minute slot logic

const RESERVATION_TYPES = [
  { value: 'zumba', label: 'Zumba' },
  { value: 'basketball', label: 'Basketball' },
];

let mainBtn, sectionTwoMainBtn;
let bindActivated = false;
let autoselect = true;

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
    if (main.sharedState.reserveCustomerId === '') {
      main.toast('Please select a customer at customers module first!', 'error');
      return;
    }
    main.toast('Please select a date first!', 'error');
    return;
  }

  customers.getReserveCustomer((customer) => {
    if (customer) {
      const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);
      const inputs = {
        header: {
          title: `Reserve Facility ${getEmoji('📅', 26)}`,
          subtitle: 'Reservation form',
        },
        short: [
          { placeholder: 'Customer details', value: `${fullName} (${customer.dataset.id})`, locked: true },
          {
            placeholder: 'Price per hour',
            value: main.encodePrice(180),
            locked: true,
          },
          {
            placeholder: 'Reservation date (mm-dd-yyyy)',
            value: `${main.encodeDate(new Date(selectedDate.dataset.year, selectedDate.dataset.month - 1, selectedDate.dataset.day), '2-digit')}`,
            required: true,
            calendar: true,
          },
          {
            placeholder: 'Start time',
            value: '',
            required: true,
            type: 'time',
            // listener: (input, container) => {
            //   // Auto-set end time to 1 hour after start time
            //   try {
            //     const start = input.value;
            //     if (!/^\d{2}:\d{2}$/.test(start)) return;
            //     const [h, m] = start.split(':').map((n) => parseInt(n, 10));
            //     const endMinutes = (h * 60 + m + 60) % 1440;
            //     const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0');
            //     const endM = (endMinutes % 60).toString().padStart(2, '0');
            //     const endInput = container.querySelector('#input-short-9');
            //     if (endInput && !endInput.value) {
            //       endInput.value = `${endH}:${endM}`;
            //       endInput.dispatchEvent(new Event('input'));
            //     }
            //   } catch (e) {}
            // },
          },
          {
            placeholder: 'End time',
            value: '',
            required: true,
            type: 'time',
            offset: 60,
          },
        ],
        spinner: [
          {
            label: 'Reservation type',
            placeholder: 'Select reservation type',
            selected: 0,
            required: true,
            options: RESERVATION_TYPES,
          },
        ],
        footer: {
          main: `Reserve ${getEmoji('📅')}`,
        },
      };
      main.openModal('orange', inputs, (result) => {
        const startTime = result.short[3].value;
        const endTime = result.short[4].value;
        main.openConfirmationModal(
          `<p class="text-lg">${fullName}</p>at ${main.decodeDate(result.short[2].value)}<br>from ${main.decodeTime(startTime)} to ${main.decodeTime(endTime)}`,
          () => {
            const columnsData = [
              'id_R_random',
              { type: 'object_cid', data: [customer.dataset.image, fullName, customer.dataset.id] },
              main.fixText(main.getSelectedSpinner(result.spinner[0])),
              `${main.decodeDate(result.short[2].value)} - ${main.decodeTime(startTime)} to ${main.decodeTime(endTime)}`, // dataset.custom3
              'custom_datetime_Pending',
            ];
            main.createAtSectionOne(SECTION_NAME, columnsData, 2, (createResult) => {
              main.createNotifDot(SECTION_NAME, 2);

              main.toast('Successfully reserved facility!', 'success');
              main.closeConfirmationModal();
              main.closeModal(() => {
                // const actionData = {
                //   module: MODULE_NAME,
                //   submodule: SUBMODULE_NAME,
                //   description: 'Process customer reservation',
                // };
                const reservationData = {
                  id: createResult.dataset.id,
                  image: customer.dataset.image,
                  name: customer.dataset.text,
                  cid: customer.dataset.id,
                  amount: 1 * main.decodePrice(result.short[1].value),
                };
                // accesscontrol.log(actionData, reservationData);
                payments.processReservationPayment(reservationData, (transactionId) => {
                  createResult.dataset.tid = transactionId;
                });
              });
            });
          }
        );
      });
    }
  });
}

// Removed activeSpinnerListener: pricing no longer depends on a time slot spinner

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
  const remainingCells = 5 * 7 - totalCells; // 6 rows × 7 days

  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createDayElement(day, month + 1, year, false);
    calendarGrid.appendChild(dayElement);
  }
}

function createDayElement(day, month, year, isToday) {
  const isPreviousDay =
    day + 31 * month + 366 * year < today.getDate() + 31 * today.getMonth() + 366 * today.getFullYear();
  // todo, get live reservation count at this date
  const reservedCount = Math.max(0, Math.round(Math.random() * 10) - Math.round(Math.random() * 10));
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
          <p class="${isPreviousDay ? 'text-xs font-bold opacity-50' : isToday ? 'text-xl font-black' : 'text-sm font-black'}">${day}</p>
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

    customers.getReserveCustomer((customer) => {
      const inquiryReservationQuick = document.getElementById(`inquiryReservationQuick`).children[0];
      inquiryReservationQuick.children[1].classList.remove('hidden');
      inquiryReservationQuick.children[1].classList.add('text-black', 'mt-2');
      if (customer) {
        const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);

        inquiryReservationQuick.children[0].innerHTML = `Reserve for:<p class="text-lg">${fullName}</p><br>Reserve date:<p class="text-lg">${monthNames[month]} ${day}, ${year}</p>Reserved slots: ${reservedCount}/10`;
        inquiryReservationQuick.children[0].classList.add('text-black');

        dayElement.classList.add('bg-blue-400');
        selectedDate = dayElement;
        selectedDate.dataset.day = day;
        selectedDate.dataset.month = month + 1;
        selectedDate.dataset.year = year;
        inquiryReservationQuick.children[1].innerHTML = `<br>Click the button below ${getEmoji('👇', 12)} to reserve this date.`;
      } else {
        inquiryReservationQuick.children[0].innerHTML = `Reserve date:<p class="text-lg">${monthNames[month]} ${day}, ${year}</p>Reserved slots: ${reservedCount}/10`;
        inquiryReservationQuick.children[0].classList.add('text-black');
        inquiryReservationQuick.children[1].innerHTML = `<br>${getEmoji('⚠️', 12)} There's no selected customer yet.`;
      }
      if (isPreviousDay) {
        inquiryReservationQuick.children[1].innerHTML = `<br>${getEmoji('⚠️', 12)} Past dates cannot be reserved anymore.`;
      }
    });
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

  if (autoselect && isToday) {
    autoselect = false;
    selectedDate = dayElement;
    selectedDate.dataset.day = day;
    selectedDate.dataset.month = month + 1;
    selectedDate.dataset.year = year;
  }

  return dayElement;
}

function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}

export function reserveCustomer() {
  autoselect = true;
  main.showSection(SECTION_NAME);
  sectionTwoMainBtnFunction();
}

export default { reserveCustomer };
