// nilagyan ko comment every function para mas madali maintindihan
import main from '../admin_main.js';
import customers from './inquiry_customers.js';
import payments from './payments.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'inquiry-reservations';
const MODULE_NAME = 'Inquiry';
const SUBMODULE_NAME = 'Reservations';

const RESERVATION_TYPES = [
  { value: 'basketball', label: 'basketball' },
  { value: 'zumba', label: 'zumba' },
];

const DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 3, label: '3 hours' },
  { value: 4, label: '4 hours' },
  { value: 5, label: '5 hours' },
  { value: 6, label: '6 hours' },
  { value: 7, label: '7 hours' },
];

let mainBtn, sectionTwoMainBtn;
let bindActivated = false;
let autoselect = true;
let existingReservations = [];

// Checks if the selected time is in the past
function isTimeInPast(date, time) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const [month, day, year] = date.split('-').map(Number);

  const selectedDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const currentDateTime = new Date();
  currentDateTime.setMinutes(currentDateTime.getMinutes() - 1);

  return selectedDateTime < currentDateTime;
}

// Checks if a new reservation conflicts with existing ones
function hasTimeConflict(newStartTime, newEndTime, newDate) {
  const [month, day, year] = newDate.split('-').map(Number);
  const [newStartHour, newStartMinute] = newStartTime.split(':').map(Number);
  const [newEndHour, newEndMinute] = newEndTime.split(':').map(Number);

  const newStart = new Date(year, month - 1, day, newStartHour, newStartMinute, 0, 0);
  const newEnd = new Date(year, month - 1, day, newEndHour, newEndMinute, 0, 0);

  return existingReservations.some((reservation) => {
    if (reservation.date !== newDate) return false;

    const [existingStartHour, existingStartMinute] = reservation.startTime.split(':').map(Number);
    const [existingEndHour, existingEndMinute] = reservation.endTime.split(':').map(Number);

    const existingStart = new Date(year, month - 1, day, existingStartHour, existingStartMinute, 0, 0);
    const existingEnd = new Date(year, month - 1, day, existingEndHour, existingEndMinute, 0, 0);

    return newStart < existingEnd && newEnd > existingStart;
  });
}

// Gets the hourly rate based on start time (180 before 6PM, 200 after)
function getHourlyRate(startTime) {
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
    return 180;
  }

  const [hours, minutes] = startTime.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  const sixPMInMinutes = 18 * 60;

  return timeInMinutes >= sixPMInMinutes ? 200 : 180;
}

// Updates the price display based on selected duration and start time
function updatePriceDisplay(duration, startTime, container) {
  const allInputs = container.querySelectorAll('input');

  const priceInput =
    container.querySelector('#input-short-2') ||
    container.querySelector('input[placeholder*="Amount to pay"]') ||
    container.querySelector('input[placeholder*="Amount"]');

  if (priceInput) {
    const hourlyRate = getHourlyRate(startTime);
    const totalAmount = duration * hourlyRate;
    priceInput.value = main.encodePrice(totalAmount);
    priceInput.dispatchEvent(new Event('input'));
  }
}

// Gets the specific reservation that conflicts with the new time slot
function getConflictingReservation(newStartTime, newEndTime, newDate) {
  const [month, day, year] = newDate.split('-').map(Number);
  const [newStartHour, newStartMinute] = newStartTime.split(':').map(Number);
  const [newEndHour, newEndMinute] = newEndTime.split(':').map(Number);

  const newStart = new Date(year, month - 1, day, newStartHour, newStartMinute, 0, 0);
  const newEnd = new Date(year, month - 1, day, newEndHour, newEndMinute, 0, 0);

  return existingReservations.find((reservation) => {
    if (reservation.date !== newDate) return false;

    const [existingStartHour, existingStartMinute] = reservation.startTime.split(':').map(Number);
    const [existingEndHour, existingEndMinute] = reservation.endTime.split(':').map(Number);

    const existingStart = new Date(year, month - 1, day, existingStartHour, existingStartMinute, 0, 0);
    const existingEnd = new Date(year, month - 1, day, existingEndHour, existingEndMinute, 0, 0);

    return newStart < existingEnd && newEnd > existingStart;
  });
}

// Ensures minimum 1-minute gap between consecutive reservations
function hasMinimumGap(newStartTime, newEndTime, newDate) {
  const [month, day, year] = newDate.split('-').map(Number);
  const [newStartHour, newStartMinute] = newStartTime.split(':').map(Number);
  const [newEndHour, newEndMinute] = newEndTime.split(':').map(Number);

  const newStart = new Date(year, month - 1, day, newStartHour, newStartMinute, 0, 0);
  const newEnd = new Date(year, month - 1, day, newEndHour, newEndMinute, 0, 0);

  return existingReservations.some((reservation) => {
    if (reservation.date !== newDate) return false;

    const [existingStartHour, existingStartMinute] = reservation.startTime.split(':').map(Number);
    const [existingEndHour, existingEndMinute] = reservation.endTime.split(':').map(Number);

    const existingStart = new Date(year, month - 1, day, existingStartHour, existingStartMinute, 0, 0);
    const existingEnd = new Date(year, month - 1, day, existingEndHour, existingEndMinute, 0, 0);

    const gapAfter = newStart - existingEnd >= 60000;
    const gapBefore = existingStart - newEnd >= 60000;

    return !gapAfter && !gapBefore;
  });
}

// Finds the reservation that violates the minimum gap requirement
function getConflictingReservationForGap(newStartTime, newEndTime, newDate) {
  const [month, day, year] = newDate.split('-').map(Number);
  const [newStartHour, newStartMinute] = newStartTime.split(':').map(Number);
  const [newEndHour, newEndMinute] = newEndTime.split(':').map(Number);

  const newStart = new Date(year, month - 1, day, newStartHour, newStartMinute, 0, 0);
  const newEnd = new Date(year, month - 1, day, newEndHour, newEndMinute, 0, 0);

  return existingReservations.find((reservation) => {
    if (reservation.date !== newDate) return false;

    const [existingStartHour, existingStartMinute] = reservation.startTime.split(':').map(Number);
    const [existingEndHour, existingEndMinute] = reservation.endTime.split(':').map(Number);

    const existingStart = new Date(year, month - 1, day, existingStartHour, existingStartMinute, 0, 0);
    const existingEnd = new Date(year, month - 1, day, existingEndHour, existingEndMinute, 0, 0);

    const gapAfter = newStart - existingEnd >= 60000;
    const gapBefore = existingStart - newEnd >= 60000;

    return !gapAfter && !gapBefore;
  });
}

// Suggests the next available time slot after a conflicting reservation
function getNextAvailableTime(newStartTime, newEndTime, newDate) {
  const [month, day, year] = newDate.split('-').map(Number);
  const [newStartHour, newStartMinute] = newStartTime.split(':').map(Number);

  const newStart = new Date(year, month - 1, day, newStartHour, newStartMinute, 0, 0);
  const sameDateReservations = existingReservations.filter((reservation) => reservation.date === newDate);

  if (sameDateReservations.length === 0) {
    return null;
  }

  let closestReservation = null;
  let minTimeDiff = Infinity;

  sameDateReservations.forEach((reservation) => {
    const [existingEndHour, existingEndMinute] = reservation.endTime.split(':').map(Number);
    const existingEnd = new Date(year, month - 1, day, existingEndHour, existingEndMinute, 0, 0);
    const timeDiff = Math.abs(newStart - existingEnd);

    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestReservation = reservation;
    }
  });

  if (closestReservation) {
    const [existingEndHour, existingEndMinute] = closestReservation.endTime.split(':').map(Number);
    const existingEnd = new Date(year, month - 1, day, existingEndHour, existingEndMinute, 0, 0);

    const nextAvailableTime = new Date(existingEnd.getTime() + 60000);
    const hours = nextAvailableTime.getHours().toString().padStart(2, '0');
    const minutes = nextAvailableTime.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  return null;
}

// Adds a new reservation to the in-memory tracking system
function addReservation(reservation) {
  existingReservations.push(reservation);
}

// Removes reservations that have already ended
function removeExpiredReservations() {
  const now = new Date();
  existingReservations = existingReservations.filter((reservation) => {
    const reservationEnd = new Date(`${reservation.date}T${reservation.endTime}`);
    return reservationEnd > now;
  });
}

// Comprehensive cleanup: removes expired reservations and moves them to past schedules
function cleanupExpiredReservations() {
  const now = new Date();
  const expiredReservations = [];

  existingReservations.forEach((reservation) => {
    const reservationEnd = new Date(`${reservation.date}T${reservation.endTime}`);
    if (reservationEnd <= now) {
      expiredReservations.push(reservation);
    }
  });

  expiredReservations.forEach((reservation) => {
    main.findAtSectionOne(SECTION_NAME, reservation.id, 'equal_id', 2, (findResult) => {
      if (findResult) {
        main.moveToPastSchedules(SECTION_NAME, findResult, reservation);
      }
    });
  });

  existingReservations = existingReservations.filter((reservation) => {
    const reservationEnd = new Date(`${reservation.date}T${reservation.endTime}`);
    return reservationEnd > now;
  });
}

// Loads existing reservations from the DOM into memory
function loadExistingReservations() {
  const selectors = [
    `[data-section="${SECTION_NAME}"] .section-one-item`,
    `.section-one-item`,
    `#${SECTION_NAME}SectionOne .section-one-item`,
    `[data-section="${SECTION_NAME}"] .item`,
    `.item`,
    `[data-section="${SECTION_NAME}"] div[data-id]`,
    `div[data-id]`,
    `[data-section="${SECTION_NAME}"] [data-id^="R"]`,
    `[data-id^="R"]`,
  ];

  let reservationElements = [];

  for (const selector of selectors) {
    reservationElements = document.querySelectorAll(selector);
    if (reservationElements.length > 0) {
      break;
    }
  }

  if (reservationElements.length === 0) {
    return;
  }

  existingReservations = [];

  reservationElements.forEach((element, index) => {
    const dateTimeText = element.children[3]?.textContent;

    if (dateTimeText && dateTimeText.includes(' - ')) {
      const [datePart, timePart] = dateTimeText.split(' - ');
      const [startTime, endTime] = timePart.split(' to ');

      if (datePart && startTime && endTime) {
        const reservationDate = main.encodeDate(new Date(datePart), '2-digit');

        const parseTime = (timeStr) => {
          const time = timeStr.trim();
          if (time.includes('PM') || time.includes('AM')) {
            const [timePart, ampm] = time.split(' ');
            const [hours, minutes] = timePart.split(':');
            let hour24 = parseInt(hours);
            if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
            if (ampm === 'AM' && hour24 === 12) hour24 = 0;
            return `${hour24.toString().padStart(2, '0')}:${minutes}`;
          } else {
            return time;
          }
        };

        const reservation = {
          id: element.dataset.id,
          date: reservationDate,
          startTime: parseTime(startTime),
          endTime: parseTime(endTime),
          customerId: element.dataset.cid,
          customerName: element.dataset.text,
        };

        existingReservations.push(reservation);
      }
    }
  });
}

// Counts how many reservations exist for a specific date
function getReservationCountForDate(date) {
  const targetDate = main.encodeDate(new Date(date), '2-digit');
  return existingReservations.filter((reservation) => reservation.date === targetDate).length;
}

// Refreshes the calendar display after reservation changes
function refreshCalendar() {
  loadExistingReservations();
  render();
}

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

    setInterval(cleanupExpiredReservations, 60000);

    loadExistingReservations();
  }
  render();
});

// Main section button handler
function mainBtnFunction() {}

// Handles the Reserve Facility button click - opens the reservation form modal
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
            placeholder: 'Amount to pay',
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
            listener: (input, container) => {
              try {
                const start = input.value;
                if (!/^\d{2}:\d{2}$/.test(start)) return;

                const durationSelect = container.querySelector('#input-spinner-1');
                if (durationSelect) {
                  durationSelect.selectedIndex = 0;
                  durationSelect.dispatchEvent(new Event('change'));
                }

                const [h, m] = start.split(':').map((n) => parseInt(n, 10));
                const endMinutes = (h * 60 + m + 60) % 1440;
                const endH = Math.floor(endMinutes / 60)
                  .toString()
                  .padStart(2, '0');
                const endM = (endMinutes % 60).toString().padStart(2, '0');

                const endInput = container.querySelector('#input-short-9');
                if (endInput) {
                  endInput.value = `${endH}:${endM}`;
                  endInput.dispatchEvent(new Event('input'));
                }

                updatePriceDisplay(1, start, container);
              } catch (e) {}
            },
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
            label: 'Time duration',
            placeholder: 'Select duration',
            selected: 0,
            required: true,
            options: DURATION_OPTIONS,
            listener: (selectedIndex, container) => {
              try {
                const selectedDuration = DURATION_OPTIONS[selectedIndex - 1]?.value || 1;

                const startInput = container.querySelector('#input-short-8');
                const startTime = startInput?.value || '';

                updatePriceDisplay(selectedDuration, startTime, container);

                if (!startInput || !startInput.value) return;

                const start = startInput.value;
                if (!/^\d{2}:\d{2}$/.test(start)) return;

                const [h, m] = start.split(':').map((n) => parseInt(n, 10));
                const endMinutes = (h * 60 + m + selectedDuration * 60) % 1440;
                const endH = Math.floor(endMinutes / 60)
                  .toString()
                  .padStart(2, '0');
                const endM = (endMinutes % 60).toString().padStart(2, '0');

                const endInput = container.querySelector('#input-short-9');
                if (endInput) {
                  endInput.value = `${endH}:${endM}`;
                  endInput.dispatchEvent(new Event('input'));
                }
              } catch (e) {}
            },
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
          main: `Reserve ${getEmoji('📅')}`,
        },
      };

      main.openModal('orange', inputs, (result) => {
        const dateStart = result.short[2].value;

        try {
          const [month, day, year] = dateStart.split('-').map(Number);
          const selectedDate = new Date(year, month - 1, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            throw new Error('Selected date cannot be in the past');
          }
        } catch (error) {
          main.toast(error.message, 'error');
          return;
        }

        const startTime = result.short[3].value;
        const endTime = result.short[4].value;
        const reservationDate = result.short[2].value;
        const selectedDuration = DURATION_OPTIONS[result.spinner[0].selected - 1]?.value || 1;

        try {
          const start = new Date(`1970-01-01T${startTime}`);
          const end = new Date(`1970-01-01T${endTime}`);
          const durationHours = (end - start) / (1000 * 60 * 60);

          if (end <= start) {
            throw new Error('End time must be after start time');
          }

          if (durationHours < 1) {
            throw new Error('Reservation must be at least 1 hour');
          }

          if (durationHours > 7) {
            throw new Error('Reservation cannot exceed 7 hours');
          }

          if (Math.abs(durationHours - selectedDuration) > 0.1) {
            throw new Error(
              `Duration must match selected duration of ${selectedDuration} hour${selectedDuration > 1 ? 's' : ''}`
            );
          }

          const startHour = start.getHours();
          const endHour = end.getHours();
          const endMinutes = end.getMinutes();

          if (startHour < 9) {
            throw new Error('Reservation cannot start before 9:00 AM');
          }

          if (endHour > 23 || (endHour === 23 && endMinutes === 60)) {
            throw new Error('Reservation cannot end after 11:59 PM');
          }

          const todayFormatted = main.encodeDate(new Date(), '2-digit');

          if (reservationDate === todayFormatted && isTimeInPast(reservationDate, startTime)) {
            throw new Error('Cannot book past time slots on the same day');
          }

          loadExistingReservations();

          if (existingReservations.length === 0) {
            const allElements = document.querySelectorAll('[data-id^="R"]');
            allElements.forEach((element) => {
              const dateTimeText = element.children[3]?.textContent;
              if (dateTimeText && dateTimeText.includes(' - ')) {
                const [datePart, timePart] = dateTimeText.split(' - ');
                const [startTime, endTime] = timePart.split(' to ');

                if (datePart && startTime && endTime) {
                  const reservationDate = main.encodeDate(new Date(datePart), '2-digit');

                  const parseTime = (timeStr) => {
                    const time = timeStr.trim();
                    if (time.includes('PM') || time.includes('AM')) {
                      const [timePart, ampm] = time.split(' ');
                      const [hours, minutes] = timePart.split(':');
                      let hour24 = parseInt(hours);
                      if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
                      if (ampm === 'AM' && hour24 === 12) hour24 = 0;
                      return `${hour24.toString().padStart(2, '0')}:${minutes}`;
                    } else {
                      return time;
                    }
                  };

                  const reservation = {
                    id: element.dataset.id,
                    date: reservationDate,
                    startTime: parseTime(startTime),
                    endTime: parseTime(endTime),
                    customerId: element.dataset.cid,
                    customerName: element.dataset.text,
                  };

                  existingReservations.push(reservation);
                }
              }
            });
          }

          if (hasTimeConflict(startTime, endTime, reservationDate)) {
            const conflictingReservation = getConflictingReservation(startTime, endTime, reservationDate);
            const conflictingCustomerName = conflictingReservation
              ? main.decodeName(conflictingReservation.customerName).fullName
              : 'Another customer';
            const conflictingTime = conflictingReservation
              ? `${main.decodeTime(conflictingReservation.startTime)} to ${main.decodeTime(conflictingReservation.endTime)}`
              : 'the same time';

            throw new Error(`This time slot is already booked by ${conflictingCustomerName} (${conflictingTime})`);
          }

          if (hasMinimumGap(startTime, endTime, reservationDate)) {
            const conflictingReservation = getConflictingReservationForGap(startTime, endTime, reservationDate);
            const conflictingCustomerName = conflictingReservation
              ? main.decodeName(conflictingReservation.customerName).fullName
              : 'Another customer';
            const nextAvailableTime = getNextAvailableTime(startTime, endTime, reservationDate);

            let nextAvailableTimeFormatted = 'later';
            if (nextAvailableTime) {
              const [hours, minutes] = nextAvailableTime.split(':');
              const hour24 = parseInt(hours);
              const minute = parseInt(minutes);

              if (!isNaN(hour24) && !isNaN(minute)) {
                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                const ampm = hour24 >= 12 ? 'PM' : 'AM';
                const minuteFormatted = minute.toString().padStart(2, '0');

                nextAvailableTimeFormatted = `${hour12}:${minuteFormatted} ${ampm}`;
              }
            }

            throw new Error(
              `This hour is booked by ${conflictingCustomerName}. Next booking is available in ${nextAvailableTimeFormatted}`
            );
          }
        } catch (error) {
          main.toast(error.message, 'error');
          return;
        }

        main.openConfirmationModal(
          `<p class="text-lg">${fullName}</p>at ${main.decodeDate(result.short[2].value)}<br>from ${main.decodeTime(startTime)} to ${main.decodeTime(endTime)}`,
          () => {
            const columnsData = [
              'id_R_random',
              { type: 'object_cid', data: [customer.dataset.image, fullName, customer.dataset.id] },
              main.fixText(main.getSelectedSpinner(result.spinner[1])),
              `${main.decodeDate(result.short[2].value)} - ${main.decodeTime(startTime)} to ${main.decodeTime(endTime)}`,
              'custom_datetime_Pending',
            ];

            main.createAtSectionOne(SECTION_NAME, columnsData, 2, (createResult) => {
              main.createNotifDot(SECTION_NAME, 2);

              const reservationDate = result.short[2].value;
              const newReservation = {
                id: createResult.dataset.id,
                date: reservationDate,
                startTime: startTime,
                endTime: endTime,
                customerId: customer.dataset.id,
                customerName: customer.dataset.text,
              };
              addReservation(newReservation);

              main.toast('Successfully reserved facility!', 'success');
              main.closeConfirmationModal();
              main.closeModal(() => {
                refreshCalendar();

                const calculatedAmount = main.decodePrice(result.short[1].value);

                const reservationData = {
                  id: createResult.dataset.id,
                  image: customer.dataset.image,
                  name: customer.dataset.text,
                  cid: customer.dataset.id,
                  amount: calculatedAmount,
                };

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

// Binds event listeners for calendar navigation and applies CSS animations
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

// Main render function - updates both header and calendar grid
function render() {
  renderHeader();
  renderCalendar();
}

// Updates the calendar header with current month and year
function renderHeader() {
  document.getElementById('month').innerHTML = `${monthNames[currentDate.getMonth()]}`;
  document.getElementById('year').innerHTML = `${currentDate.getFullYear()}`;
}

// Renders the complete calendar grid with all days and reservation indicators
function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  calendarGrid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const prevMonth = new Date(year, month - 1, 0);
  const prevMonthDays = prevMonth.getDate();

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const dayElement = createDayElement(dayNum, month - 1, year, false);
    calendarGrid.appendChild(dayElement);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = createDayElement(day, month, year, isToday(year, month, day));
    calendarGrid.appendChild(dayElement);
  }

  const totalCells = calendarGrid.children.length;
  const remainingCells = 5 * 7 - totalCells;

  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createDayElement(day, month + 1, year, false);
    calendarGrid.appendChild(dayElement);
  }
}

// Creates a single day element for the calendar grid with reservation indicators
function createDayElement(day, month, year, isToday) {
  const isPreviousDay =
    day + 31 * month + 366 * year < today.getDate() + 31 * today.getMonth() + 366 * today.getFullYear();

  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const reservedCount = getReservationCountForDate(dateString);

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

// Checks if the given date is today
function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}

// Public function to initiate reservation process
export function reserveCustomer() {
  autoselect = true;
  main.showSection(SECTION_NAME);
  sectionTwoMainBtnFunction();
}

// Handles cancellation of pending payment transactions
export function cancelPendingTransaction(transactionId) {}

// Completes the reservation payment process and updates status
export function completeReservationPayment(transactionId) {
  main.showSection(SECTION_NAME, 2);
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', 2, (findResult) => {
    if (findResult) {
      findResult.dataset.tid = '';
      const { date, time, datetime } = main.getDateOrTimeOrBoth();
      findResult.dataset.datetime = datetime;
      findResult.children[4].innerHTML = datetime;
    }
  });
}

export default { reserveCustomer, cancelPendingTransaction, completeReservationPayment };
