// nilagyan ko comment every function para mas madali maintindihan
import main from '../admin_main.js';
import customers from './inquiry_customers.js';
import payments from './payments.js';
import accesscontrol from './maintenance_accesscontrol.js';
import { refreshDashboardStats } from './dashboard.js';
import { API_BASE_URL } from '../_global.js';

const SECTION_NAME = 'inquiry-reservations';
const MODULE_NAME = 'Inquiry';
const SUBMODULE_NAME = 'Reservations';

const RESERVATION_TYPES = [
  { value: 'basketball', label: 'Basketball' },
  { value: 'zumba', label: 'Zumba' },
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
let selectedDate = null;
const today = new Date();
const currentDate = new Date();

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

// -------------------------
// |    CRUD Functions     |
// -------------------------
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

function listenToReservationsFE(callback) {
  const q = query(collection(db, 'reservations'));
  return onSnapshot(q, (snapshot) => {
    const reservations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(reservations);
  });
}

async function createReservation(reservation) {
  const response = await fetch(`${API_BASE_URL}/inquiry/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservation),
  });
  if (!response.ok) throw new Error('Failed to create reservation.');
  return response.json();
}

async function createReservationFE(reservation) {
  console.log('test')
  main.sharedState.moduleLoad = SECTION_NAME;
  window.showGlobalLoading?.();
  try {
    await setDoc(doc(db, 'reservations', reservation.id), reservation);
  } catch (e) {
  } finally {
    window.hideGlobalLoading?.();
  }
}

async function readReservations() {
  const response = await fetch(`${API_BASE_URL}/inquiry/reservations`);
  if (!response.ok) throw new Error('Failed to read reservations.');
  return response.json();
}

async function updateReservation(reservationId, updatedData) {
  const response = await fetch(`${API_BASE_URL}/inquiry/reservations/${reservationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  });
  if (!response.ok) throw new Error('Failed to update reservation.');
  return response.json();
}

async function updateReservationFE(reservationId, updatedData) {
  await updateDoc(doc(db, 'reservations', reservationId), updatedData);
}

async function deleteReservation(reservationId) {
  const response = await fetch(`${API_BASE_URL}/inquiry/reservations/${reservationId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete reservation.');
}

async function deleteReservationFE(reservationId) {
  main.sharedState.moduleLoad = SECTION_NAME;
  window.showGlobalLoading?.();
  try {
    await deleteDoc(doc(db, 'reservations', reservationId));
  } catch (e) {
  } finally {
    window.hideGlobalLoading?.();
  }
}

// -------------------------
// |  Generic Functions    |
// -------------------------

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

// Calculates dynamic pricing per-hour bucket relative to 6:00 PM cutoff
// Each hour slot is priced based on the slot's starting time
function calculateDynamicPrice(duration, startTime) {
  try {
    const safeDuration = Number.isFinite(duration) ? Math.max(1, Math.round(duration)) : 1;
    if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
      return safeDuration * 180;
    }

    const [startHour, startMinute] = startTime.split(':').map((n) => parseInt(n, 10));
    // Use a fixed date baseline; only time-of-day matters
    const baseline = new Date(1970, 0, 1, startHour, startMinute, 0, 0);
    let total = 0;
    for (let i = 0; i < safeDuration; i++) {
      const slotStart = new Date(baseline.getTime() + i * 60 * 60 * 1000);
      const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
      total += slotStartMinutes >= 18 * 60 ? 200 : 180;
    }
    return total;
  } catch (e) {
    return Math.max(1, Math.round(duration || 1)) * 180;
  }
}

// Updates the price display based on selected duration and start time
function updatePriceDisplay(duration, startTime, container) {
  const priceInput =
    container.querySelector('#input-short-2') ||
    container.querySelector('input[placeholder*="Amount to pay"]') ||
    container.querySelector('input[placeholder*="Amount"]');

  if (priceInput) {
    const totalAmount = calculateDynamicPrice(duration, startTime);
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

  render();
}

async function loadExistingReservations() {
  listenToReservationsFE(async (reservations) => {
    existingReservations = reservations;

    main.deleteAllAtSectionOne(SECTION_NAME, 2);

    // 1) Create rows first with placeholder images and collect customerIds
    const createdRows = []; // { reservation, createdItem }
    const customerIdSet = new Set();

    await Promise.all(
      existingReservations.map((reservation) => {
        return new Promise((resolveCreate) => {
          const { id, customerId, customerName, reservationType, date, startTime, endTime, status, tid } = reservation;
          const { fullName } = main.decodeName(customerName);

          // collect customerId
          customerIdSet.add(customerId);

          const reservationEnd = new Date(`${date}T${endTime}`);
          const isPast = reservationEnd <= new Date();
          const tabIndex = isPast ? 3 : 2;

          const reservationTypeText =
            typeof reservationType === 'number'
              ? RESERVATION_TYPES[reservationType].label
              : main.fixText(reservationType);

          // NOTE: put placeholder '' for image for now
          const columnsData = [
            'id_' + id,
            {
              type: 'object_cid',
              data: ['', fullName, customerId], // image is empty now
            },
            reservationTypeText,
            `${main.decodeDate(date)} - ${main.decodeTime(startTime)} to ${main.decodeTime(endTime)}`,
            `custom_datetime_${status}`,
          ];

          main.createAtSectionOne(SECTION_NAME, columnsData, tabIndex, (createdItem) => {
            createdItem.dataset.tid = tid || '';

            // Add event listeners (unchanged)
            const viewDetailsBtn = createdItem.querySelector('[id^="reservationViewDetailsBtn"]');
            if (viewDetailsBtn) {
              viewDetailsBtn.addEventListener('click', () => {
                editReservation(reservation);
              });
            }

            const voidBtn = createdItem.querySelector('[id^="reservationVoidBtn"]');
            if (voidBtn) {
              voidBtn.addEventListener('click', async () => {
                main.openConfirmationModal('Are you sure you want to void this reservation?', async () => {
                  try {
                    await deleteReservationFE(id);
                    main.toast('Reservation voided successfully!', 'success');
                    main.closeConfirmationModal();
                  } catch (error) {
                    main.toast(`Error voiding reservation: ${error.message}`, 'error');
                  }
                });
              });
            }

            // store link so we can update the image later
            createdRows.push({ reservation, createdItem });
            resolveCreate();
          });
        });
      })
    );

    // 2) Fetch images for all unique customerIds in parallel
    const customerIds = Array.from(customerIdSet);
    const imageByCustomerId = {}; // { [customerId]: imageString }

    await Promise.all(
      customerIds.map((cid) => {
        return new Promise((resolveImg) => {
          main.findAtSectionOne('inquiry-customers', cid, 'equal_id', 1, (findResult) => {
            const img = findResult && findResult.dataset && findResult.dataset.image ? findResult.dataset.image : '';
            imageByCustomerId[cid] = img;
            resolveImg();
          });
        });
      })
    );

    // 3) Update created rows with fetched images
    // Implementation depends slightly on how your object_cid cell is rendered inside createdItem.
    // Below we try a few sensible approaches (in order). If your DOM structure differs, adjust the selector.
    createdRows.forEach(({ reservation, createdItem }) => {
      const cid = reservation.customerId;
      const img = imageByCustomerId[cid] || '';

      createdItem.querySelector('img').src = img;
    });

    // Finally, render now that images are applied
    render();
  });
}

// Counts how many reservations exist for a specific date
function getReservationCountForDate(date) {
  const targetDate = main.encodeDate(new Date(date), '2-digit');
  return existingReservations.filter((reservation) => reservation.date === targetDate).length;
}

function getReservationsForDate(date) {
  const targetDate = main.encodeDate(new Date(date), '2-digit');
  return existingReservations.filter((reservation) => reservation.date === targetDate);
}

// Refreshes the calendar display after reservation changes
function refreshCalendar() {
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
    loadExistingReservations();

    main.updateDateAndTime(SECTION_NAME);
    setInterval(main.updateDateAndTime, 1000);

    setInterval(cleanupExpiredReservations, 60000);
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
      const { fullName } = main.decodeName(customer.dataset.text);

      const inputs = {
        header: {
          title: `Reserve Facility ${getEmoji('📅', 26)}`,
          subtitle: 'Reservation form',
        },
        short: [{ placeholder: 'Customer details', value: `${fullName} (${customer.dataset.id})`, locked: true }],
        spinner: [
          {
            label: 'Reservation type',
            placeholder: 'Select reservation type',
            selected: 0,
            required: true,
            options: RESERVATION_TYPES,
          },
        ],
        short2: [
          {
            placeholder: 'Reservation date (mm-dd-yyyy)',
            value: `${main.encodeDate(
              new Date(selectedDate.dataset.year, selectedDate.dataset.month - 1, selectedDate.dataset.day),
              '2-digit'
            )}`,
            required: true,
            calendar: true,
          },
        ],
        spinner2: [
          {
            label: 'Time duration',
            placeholder: 'Select duration',
            selected: 1,
            required: true,
            options: DURATION_OPTIONS,
            listener: (selectedIndex, container) => {
              try {
                const selectedDuration = DURATION_OPTIONS[selectedIndex - 1]?.value || 1;

                const startInput =
                  container.querySelector('input[placeholder="Start time"]') ||
                  container.querySelector('#input-short-25') ||
                  container.querySelector('input[type="time"]');
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

                const endInput =
                  container.querySelector('input[placeholder="End time"]') ||
                  container.querySelector('#input-short-9') ||
                  container.querySelectorAll('input[type="time"]')[1];
                if (endInput) {
                  endInput.value = `${endH}:${endM}`;
                  endInput.dispatchEvent(new Event('input'));
                }
              } catch (e) {}
            },
          },
        ],
        short3: [
          {
            placeholder: 'Start time',
            value: '',
            required: true,
            type: 'time',
            listener: (input, container) => {
              try {
                const start = input.value;
                if (!/^\d{2}:\d{2}$/.test(start)) return;

                // Get the selected duration
                const durationSelect = container.querySelector('#input-spinner-25');
                const selectedDuration = DURATION_OPTIONS[durationSelect?.selectedIndex - 1]?.value || 1;

                const [h, m] = start.split(':').map((n) => parseInt(n, 10));
                const endMinutes = (h * 60 + m + selectedDuration * 60) % 1440;
                const endH = Math.floor(endMinutes / 60)
                  .toString()
                  .padStart(2, '0');
                const endM = (endMinutes % 60).toString().padStart(2, '0');

                const endInput =
                  container.querySelector('input[placeholder="End time"]') ||
                  container.querySelector('#input-short-10') ||
                  container.querySelectorAll('input[type="time"]')[1];
                if (endInput) {
                  endInput.value = `${endH}:${endM}`;
                  endInput.dispatchEvent(new Event('input'));
                }

                updatePriceDisplay(selectedDuration, start, container);
              } catch (e) {}
            },
          },
          {
            placeholder: 'End time',
            value: '',
            required: true,
            type: 'time',
            locked: true,
          },
          {
            placeholder: 'Amount to pay',
            value: main.encodePrice(180),
            locked: true,
          },
        ],
        footer: {
          main: `Reserve ${getEmoji('📅')}`,
        },
      };

      main.openModal('orange', inputs, async (result) => {
        const reservationDate = result.short2[0].value;

        try {
          const [month, day, year] = reservationDate.split('-').map(Number);
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

        const startTime = result.short3[0].value;
        const endTime = result.short3[1].value;
        const selectedDuration = DURATION_OPTIONS[result.spinner2[0].selected - 1]?.value || 1;

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

          if (hasTimeConflict(startTime, endTime, reservationDate)) {
            const conflictingReservation = getConflictingReservation(startTime, endTime, reservationDate);
            const conflictingCustomerName = conflictingReservation
              ? main.decodeName(conflictingReservation.customerName).fullName
              : 'Another customer';
            const conflictingTime = conflictingReservation
              ? `${main.decodeTime(conflictingReservation.startTime)} to ${main.decodeTime(
                  conflictingReservation.endTime
                )}`
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
          `Reserve for<br><p class="text-lg">${fullName}</p>at ${main.decodeDate(
            reservationDate
          )}<br>from ${main.decodeTime(startTime)} to ${main.decodeTime(endTime)}`,
          async () => {
            const reservationId = 'R' + new Date().getTime();
            const reservationData = {
              id: reservationId,
              customerId: customer.dataset.id,
              customerName: customer.dataset.text,
              reservationType: main.getSelectedSpinner(result.spinner[0]),
              date: reservationDate,
              startTime: startTime,
              endTime: endTime,
              status: 'Pending',
              amount: main.decodePrice(result.short3[2].value),
            };

            try {
              main.toast('Reservation is now ready for payment!', 'success');
              main.closeConfirmationModal();
              main.closeModal();
              await createReservationFE(reservationData);
              payments.processReservationPayment(
                {
                  id: reservationData.id,
                  image: customer.dataset.image,
                  name: customer.dataset.text,
                  cid: customer.dataset.id,
                  amount: reservationData.amount,
                },
                async (transactionId) => {
                  await updateReservationFE(reservationData.id, { tid: transactionId });
                }
              );
            } catch (error) {
              main.toast(`Error creating reservation: ${error.message}`, 'error');
            }
          }
        );
      });
    }
  });
}

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
  updateReservationStats();
  refreshDashboardStats();
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
  const remainingCells = 42 - totalCells; // Ensure 6 rows

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
          <p class="${
            isPreviousDay ? 'text-xs font-bold opacity-50' : isToday ? 'text-xl font-black' : 'text-sm font-black'
          }">${day}</p>
          <div id="bookmark" class="absolute top-1 right-1 ${
            isPreviousDay || reservedCount == 0 ? 'opacity-0' : ''
          } duration-300">
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
      selectedDate.querySelector(`#bookmark`).classList.add('opacity-0');
    }

    main.deleteAllAtSectionTwo(SECTION_NAME);
    const reservationsAtTargetDate = getReservationsForDate(dateString);
    reservationsAtTargetDate.forEach((reservationAtTargetDate) => {
      const data = {
        id: reservationAtTargetDate.id,
        action: {
          module: MODULE_NAME,
          submodule: SUBMODULE_NAME,
          description: 'Reservation details',
        },
      };
      main.findAtSectionOne('inquiry-customers', reservationAtTargetDate.customerId, 'equal_id', 1, (findResult) => {
        if (findResult) {
          const { firstName, lastName, fullName } = main.decodeName(reservationAtTargetDate.customerName);
          main.createAtSectionTwo(SECTION_NAME, data, (createResult) => {
            createResult.classList.add('grid-cols-2');
            createResult.innerHTML += `
              <!-- Column 1: Image -->
              <div class="w-24 h-24 flex-shrink-0">
                  <img src="${findResult.dataset.image}" class="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onclick="showImageModal(this.src, '${fullName}')">
              </div>
      
              <!-- Column 2: Name and Category -->
              <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-wrap text-lg">${fullName}</h3>
                  <p class="text-sm text-gray-500">Date: ${reservationAtTargetDate.date}</p>
                  <p class="text-sm text-gray-500">Start time: ${reservationAtTargetDate.startTime}</p>
                  <p class="text-sm text-gray-500">End time: ${reservationAtTargetDate.endTime}</p>
                  <p class="text-sm text-gray-500">Type: ${main.fixText(reservationAtTargetDate.reservationType)}</p>
              </div>
        `;
          });
        }
      });
    });

    customers.getReserveCustomer((customer) => {
      const emptyText = document.getElementById(`${SECTION_NAME}SectionTwoListEmpty`).children[0];
      if (emptyText.children[0]) {
        emptyText.children[0].remove();
      }
      emptyText.innerText = '';
      emptyText.classList.add('text-black');
      const emptyTextDescription = document.createElement('p');

      if (customer) {
        const { fullName } = main.decodeName(customer.dataset.text);

        emptyText.innerHTML = `Reserve for:<p class="text-lg">${fullName}</p><br>Reserve date:<p class="text-lg">${
          monthNames[month]
        } ${day}, ${year}</p>Reserved slots: ${reservedCount}/10`;

        dayElement.classList.add('bg-blue-400');
        selectedDate = dayElement;
        selectedDate.dataset.day = day;
        selectedDate.dataset.month = month + 1;
        selectedDate.dataset.year = year;
        emptyText.appendChild(emptyTextDescription);
        emptyTextDescription.classList.add('text-black', 'mt-2');
        emptyTextDescription.innerHTML = `<br>Click the button below ${getEmoji('👇', 12)} to reserve this date.`;
      } else {
        emptyText.innerHTML = `Reserve date:<p class="text-lg">${monthNames[month]} ${day}, ${year}</p>Reserved slots: ${reservedCount}/10`;
        emptyText.appendChild(emptyTextDescription);
        emptyTextDescription.classList.add('text-black', 'mt-2');
        emptyTextDescription.innerHTML = `<br>${getEmoji('⚠️', 12)} There's no selected customer yet.`;
      }

      if (isPreviousDay) {
        emptyText.appendChild(emptyTextDescription);
        emptyTextDescription.classList.add('text-black', 'mt-2');
        emptyTextDescription.innerHTML = `<br>${getEmoji('⚠️', 12)} Past dates cannot be reserved anymore.`;
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
    dayElement.click();
  }

  return dayElement;
}

// Checks if the given date is today
function isToday(year, month, day) {
  return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
}

// Computes and updates the stats cards (Active Reservations, Total Reservations)
function getReservationCountForTab(tabIndex) {
  const emptyText = document.getElementById(`${SECTION_NAME}SectionOneListEmpty${tabIndex}`);
  if (!emptyText) return 0;
  const items = emptyText.parentElement.parentElement.children;
  // Skip header/placeholder row
  return Math.max(0, items.length - 1);
}

function updateReservationStats() {
  try {
    const statElementsAll = document.querySelectorAll(`#${SECTION_NAME}SectionStats`);
    const statElements = Array.from(statElementsAll).filter((el) => !el.classList.contains('hidden'));
    if (!statElements || statElements.length < 2) return;
    const activeCount = getReservationCountForTab(2);
    const totalCount = activeCount + getReservationCountForTab(3);
    const activeEl = statElements[0]?.querySelector('.section-stats-c');
    const totalEl = statElements[1]?.querySelector('.section-stats-c');
    if (activeEl) activeEl.textContent = activeCount;
    if (totalEl) totalEl.textContent = totalCount;
  } catch (e) {}
}

// Public function to initiate reservation process
export function reserveCustomer() {
  autoselect = true;
  main.showSection(SECTION_NAME);
  render();
  sectionTwoMainBtnFunction();
}

// Handles cancellation of pending payment transactions
export async function cancelPendingTransaction(transactionId) {
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', 2, async (findResult) => {
    if (findResult) {
      await updateReservationFE(findResult.dataset.id, { status: 'Canceled', tid: '' });
    }
  });
}

// Completes the reservation payment process and updates status
export async function completeReservationPayment(transactionId) {
  main.showSection(SECTION_NAME, 2);
  const { date, time, datetime } = main.getDateOrTimeOrBoth();
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', 2, async (findResult) => {
    if (findResult) {
      await updateReservationFE(findResult.dataset.id, { status: datetime, tid: '' });
    }
  });
}

function editReservation(reservation) {
  const { id, customerId, customerName, reservationType, date, startTime, endTime, amount } = reservation;
  const { fullName } = main.decodeName(customerName);

  const inputs = {
    header: {
      title: `Edit Reservation ${getEmoji('📅', 26)}`,
      subtitle: 'Update reservation details below',
    },
    short: [
      { placeholder: 'Customer details', value: `${fullName} (${customerId})`, locked: true },
      { placeholder: 'Amount to pay', value: main.encodePrice(amount), locked: true },
      {
        placeholder: 'Reservation date (mm-dd-yyyy)',
        value: date,
        required: true,
        calendar: true,
      },
      {
        placeholder: 'Start time',
        value: startTime,
        required: true,
        type: 'time',
        listener: (input, container) => {
          try {
            const start = input.value;
            if (!/^\d{2}:\d{2}$/.test(start)) return;

            const durationSelect = container.querySelector('select');
            const selectedDuration = DURATION_OPTIONS[durationSelect.selectedIndex - 1]?.value || 1;
            updatePriceDisplay(selectedDuration, start, container);
          } catch (e) {
            console.error(e);
          }
        },
      },
      {
        placeholder: 'End time',
        value: endTime,
        required: true,
        type: 'time',
      },
    ],
    spinner: [
      {
        label: 'Time duration',
        placeholder: 'Select duration',
        selected:
          DURATION_OPTIONS.findIndex((d) => {
            const start = new Date(`1970-01-01T${startTime}`);
            const end = new Date(`1970-01-01T${endTime}`);
            return d.value === (end - start) / (1000 * 60 * 60);
          }) + 1,
        required: true,
        options: DURATION_OPTIONS,
        listener: (selectedIndex, container) => {
          const selectedDuration = DURATION_OPTIONS[selectedIndex - 1]?.value || 1;
          const startInput =
            container.querySelector('input[placeholder="Start time"]') ||
            container.querySelector('#input-short-3') ||
            container.querySelector('input[type="time"]');
          const startTimeValue = startInput?.value || '';

          updatePriceDisplay(selectedDuration, startTimeValue, container);

          if (!startInput || !startInput.value) return;

          const start = startInput.value;
          if (!/^\d{2}:\d{2}$/.test(start)) return;

          const [h, m] = start.split(':').map((n) => parseInt(n, 10));
          const endMinutes = (h * 60 + m + selectedDuration * 60) % 1440;
          const endH = Math.floor(endMinutes / 60)
            .toString()
            .padStart(2, '0');
          const endM = (endMinutes % 60).toString().padStart(2, '0');

          const endInput = container.querySelector('#input-short-4'); // Corrected a bug here
          if (endInput) {
            endInput.value = `${endH}:${endM}`;
            endInput.dispatchEvent(new Event('input'));
          }
        },
      },
      {
        label: 'Reservation type',
        placeholder: 'Select reservation type',
        selected: RESERVATION_TYPES.findIndex((type) => type.value === reservationType) + 1,
        required: true,
        options: RESERVATION_TYPES,
      },
    ],
    footer: {
      main: `Update ${getEmoji('📅')}`,
    },
  };

  main.openModal('orange', async (result) => {
    const updatedData = {
      date: result.short[2].value,
      startTime: result.short[3].value,
      endTime: result.short[4].value,
      reservationType: main.getSelectedSpinner(result.spinner[1]), // Corrected a bug here
      amount: main.decodePrice(result.short[1].value),
    };

    try {
      await updateReservationFE(id, updatedData);
      main.toast('Reservation updated successfully!', 'success');
      main.closeModal();
    } catch (error) {
      main.toast(`Error updating reservation: ${error.message}`, 'error');
    }
  });
}

export default { reserveCustomer, cancelPendingTransaction, completeReservationPayment };
