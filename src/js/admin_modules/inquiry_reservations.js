// nilagyan ko comment every function para mas madali maintindihan
import main from '../admin_main.js';
import customers from './inquiry_customers.js';
import payments from './payments.js';
import accesscontrol from './maintenance_accesscontrol.js';
import { computeAndUpdateDashboardStats } from './dashboard.js';
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
let buildVersion = 0; // guards against overlapping snapshot rebuilds

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
  getDoc,
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

// Support the global "See list now" breakdown modal from admin_stats.js
document.addEventListener('ogfmsi:statsBreakdown', (e) => {
  try {
    const { section, type, container, setTitle } = e.detail || {};
    const sec = String(section || '');
    const current = String(main.sharedState.sectionName || '');
    if (!(sec.includes(SECTION_NAME) || (!sec && current === SECTION_NAME))) return;

    const t = String(type || '').toLowerCase();

    function rowsFromTab(tabIndex) {
      const emptyText = document.getElementById(`${SECTION_NAME}SectionOneListEmpty${tabIndex}`);
      if (!emptyText) return [];
      const tbody = emptyText.parentElement?.parentElement;
      if (!tbody) return [];
      const out = [];
      for (let i = 1; i < tbody.children.length; i++) out.push(tbody.children[i]);
      return out;
    }

    let rows = [];
    let title = 'Reservations';

    if (t.includes('active')) {
      rows = rowsFromTab(2);
      title = 'Active Reservations';
    } else if (t.includes('past') || t.includes('expired')) {
      rows = rowsFromTab(3);
      title = 'Past Reservations';
    } else if (t.includes('total')) {
      rows = [...rowsFromTab(2), ...rowsFromTab(3)];
      title = 'Total Reservations';
    } else {
      rows = rowsFromTab(2);
      title = 'Reservations';
    }

    try {
      setTitle?.(title);
    } catch (_) {}

    const items = rows
      .map((r) => {
        const img = r.querySelector('img')?.src || '/src/images/client_logo.jpg';
        const id = r.dataset?.id || '';
        // cells: [0]=Reservation ID, [1]=Customer (object_cid), [2]=Type, [3]=Schedule, [4]=Status
        const name = (r.children?.[1]?.innerText || '').trim();
        const typeText = (r.children?.[2]?.innerText || '').trim();
        const schedText = (r.children?.[3]?.innerText || '').trim();
        const meta = [typeText, schedText].filter(Boolean).join(' • ');
        return `
        <div style="background:#fff;border:1px solid #e5e7eb;padding:14px 16px;border-radius:12px;margin-bottom:10px;display:flex;gap:12px;align-items:center">
          <img src="${img}" alt="" style="width:40px;height:40px;border-radius:10px;object-fit:cover"/>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;color:#111827;font-size:14px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name || 'Reservation'}</div>
            <div style="color:#6b7280;font-size:12px;line-height:1.5">ID: <span style="font-family:monospace;background:#f9fafb;padding:2px 6px;border-radius:4px">${id}</span>${meta ? ` • ${meta}` : ''}</div>
          </div>
        </div>`;
      })
      .join('');

    container.innerHTML =
      items ||
      '<div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px">📭 No matching reservations.</div>';
    container.dataset.filled = '1';
  } catch (_) {}
});

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

// Safely build a Date from 'mm-dd-yyyy' and 'HH:mm'
function buildDateTime(dateStr, timeStr) {
  const [m, d, y] = (dateStr || '').split('-').map(Number);
  const [hh, mm] = (timeStr || '').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
}

// Checks if a new reservation conflicts with existing ones
function hasTimeConflict(newStartTime, newEndTime, newDate) {
  const [month, day, year] = newDate.split('-').map(Number);
  const [newStartHour, newStartMinute] = newStartTime.split(':').map(Number);
  const [newEndHour, newEndMinute] = newEndTime.split(':').map(Number);

  const newStart = new Date(year, month - 1, day, newStartHour, newStartMinute, 0, 0);
  const newEnd = new Date(year, month - 1, day, newEndHour, newEndMinute, 0, 0);

  return existingReservations.some((reservation) => {
    const [rm, rd, ry] = (reservation.date || '').split('-').map(Number);
    if (!(rm === month && rd === day && ry === year)) return false;

    const [existingStartHour, existingStartMinute] = reservation.startTime.split(':').map(Number);
    const [existingEndHour, existingEndMinute] = reservation.endTime.split(':').map(Number);

    const existingStart = new Date(year, month - 1, day, existingStartHour, existingStartMinute, 0, 0);
    const existingEnd = new Date(year, month - 1, day, existingEndHour, existingEndMinute, 0, 0);

    // Allow adjacency: starting exactly when another ends is OK
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
    const [rm, rd, ry] = (reservation.date || '').split('-').map(Number);
    if (!(rm === month && rd === day && ry === year)) return false;

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

    const gapAfterMs = newStart - existingEnd;
    const gapBeforeMs = existingStart - newEnd;
    const violatesAfter = gapAfterMs >= 0 && gapAfterMs < 60000; // starts within 1 min after existing end
    const violatesBefore = gapBeforeMs >= 0 && gapBeforeMs < 60000; // ends within 1 min before existing start

    return violatesAfter || violatesBefore;
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

    const gapAfterMs = newStart - existingEnd;
    const gapBeforeMs = existingStart - newEnd;
    const violatesAfter = gapAfterMs >= 0 && gapAfterMs < 60000;
    const violatesBefore = gapBeforeMs >= 0 && gapBeforeMs < 60000;

    return violatesAfter || violatesBefore;
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
    const reservationEnd = buildDateTime(reservation.date, reservation.endTime);
    return reservationEnd > now;
  });
}

// Comprehensive cleanup: removes expired reservations and moves them to past schedules
function cleanupExpiredReservations() {
  const now = new Date();
  const expiredReservations = [];

  existingReservations.forEach((reservation) => {
    const reservationEnd = buildDateTime(reservation.date, reservation.endTime);
    if (reservationEnd <= now) {
      expiredReservations.push(reservation);
    }
  });

  expiredReservations.forEach((reservation) => {
    main.findAtSectionOne(SECTION_NAME, reservation.id, 'equal_id', 3, (alreadyPast) => {
      if (alreadyPast) return;
      main.findAtSectionOne(SECTION_NAME, reservation.id, 'equal_id', 2, (findResult) => {
        if (findResult) {
          const { _, __, fullName } = main.decodeName(reservation.customerName);
          const columnsData = [
            'id_' + reservation.id,
            {
              type: 'object_cid',
              data: ['/src/images/client_logo.jpg', fullName, reservation.customerId],
            },
            reservation.reservationType,
            `${main.decodeDate(reservation.date)} - ${main.decodeTime(reservation.startTime)} to ${main.decodeTime(reservation.endTime)}`,
            `custom_datetime_${reservation.status}`,
          ];
          try {
            findResult.remove?.();
          } catch (e) {}
          main.createAtSectionOne(SECTION_NAME, columnsData, 3, (createResult) => {
            try {
              createResult.dataset.id = reservation.id;
            } catch (e) {}
            main.toast('A reservation has expired', 'info');
          });
        }
      });
    });
  });

  render();
}

async function loadExistingReservations() {
  listenToReservationsFE(async (reservations) => {
    // Exclude 'Canceled' reservations from UI and conflict checks
    existingReservations = (reservations || []).filter((r) => (r.status || '').toLowerCase() !== 'canceled');
    const myBuild = ++buildVersion;

    main.deleteAllAtSectionOne(SECTION_NAME, 2);
    main.deleteAllAtSectionOne(SECTION_NAME, 3);

    // 1) Create rows first with placeholder images and collect customerIds
    const createdRows = []; // { reservation, createdItem }
    const customerIdSet = new Set();
    const processedIds = new Set();

    await Promise.all(
      existingReservations.map((reservation) => {
        return new Promise((resolveCreate) => {
          const { id, customerId, customerName, reservationType, date, startTime, endTime, status, tid } = reservation;
          const { firstName, lastName, fullName } = main.decodeName(customerName?.trim() || '');

          // collect customerId
          customerIdSet.add(customerId);

          const reservationEnd = buildDateTime(date, endTime);
          const isPast = reservationEnd <= new Date();
          const tabIndex = isPast ? 3 : 2;

          // Remove any existing row with same id in both tabs before creating
          try {
            main.findAtSectionOne(SECTION_NAME, id, 'equal_id', 2, (dup) => {
              try {
                dup?.remove?.();
              } catch (e) {}
            });
            main.findAtSectionOne(SECTION_NAME, id, 'equal_id', 3, (dup) => {
              try {
                dup?.remove?.();
              } catch (e) {}
            });
          } catch (e) {}

          // Skip if this build became stale
          if (myBuild !== buildVersion) return resolveCreate();

          // Per-build de-duplication by id
          if (processedIds.has(id)) return resolveCreate();
          processedIds.add(id);

          const reservationTypeText =
            typeof reservationType === 'number'
              ? RESERVATION_TYPES[reservationType].label
              : main.fixText(reservationType);

          // NOTE: put placeholder '' for image for now
          const columnsData = [
            'id_' + id,
            {
              type: 'object_cid',
              data: ['/src/images/client_logo.jpg', fullName, customerId], // image is empty now
            },
            reservationTypeText,
            `${main.decodeDate(date)} - ${main.decodeTime(startTime)} to ${main.decodeTime(endTime)}`,
            `custom_datetime_${status}`,
          ];

          if (myBuild !== buildVersion) return resolveCreate();
          main.createAtSectionOne(SECTION_NAME, columnsData, tabIndex, (createdItem) => {
            if (myBuild !== buildVersion) {
              try {
                createdItem.remove?.();
              } catch (e) {}
              return resolveCreate();
            }
            try {
              createdItem.dataset.id = id;
            } catch (e) {}
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

            const reschedBtn = createdItem.querySelector('[id^="reservationReschedBtn"]');
            if (reschedBtn) {
              reschedBtn.addEventListener('click', () => {
                rescheduleReservation(reservation);
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
    // Skip if stale
    if (myBuild !== buildVersion) return;

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
    if (myBuild !== buildVersion) return;
    createdRows.forEach(({ reservation, createdItem }) => {
      const cid = reservation.customerId;
      const img = imageByCustomerId[cid] || '/src/images/client_logo.jpg';

      createdItem.querySelector('img').src = img;
    });

    // Finally, dedupe and render now that images are applied
    if (myBuild !== buildVersion) return;
    dedupeSectionOneTab(2);
    dedupeSectionOneTab(3);
    render();
  });
}

// Counts how many reservations exist for a specific date
function getReservationCountForDate(date) {
  const targetDate = main.encodeDate(new Date(date), '2-digit');
  const now = new Date();
  return existingReservations.filter((reservation) => {
    if (reservation.date !== targetDate) return false;
    const reservationEnd = buildDateTime(reservation.date, reservation.endTime);
    return reservationEnd > now;
  }).length;
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
async function sectionTwoMainBtnFunction() {
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

      const buildHourOptions = () => {
        const to12 = (hour24) => {
          const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
          const ap = hour24 >= 12 ? 'PM' : 'AM';
          return `${h}:00 ${ap}`;
        };
        const opts = [];
        for (let h = 9; h <= 23; h++) {
          const startH = String(h).padStart(2, '0');
          opts.push({ value: `${startH}:00`, label: `${to12(h)}` });
        }
        return opts;
      };

      // Track current selections to compute price reliably regardless of DOM order
      let __currentDuration = 0;
      let __currentStart = '09:00';

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
            label: 'Duration',
            placeholder: 'Select duration',
            selected: 0,
            required: true,
            options: DURATION_OPTIONS.map((d) => ({ value: String(d.value), label: d.label })),
            listener: (selectedIndex, container) => {
              try {
                __currentDuration = DURATION_OPTIONS[selectedIndex - 1]?.value || 0;
                updatePriceDisplay(__currentDuration, __currentStart, container);
              } catch (_) {}
            },
          },
          {
            label: 'Start time',
            placeholder: 'Select start time',
            selected: 0,
            required: true,
            options: buildHourOptions(),
            listener: (selectedIndex, container) => {
              try {
                __currentStart = buildHourOptions()[selectedIndex - 1]?.value || '09:00';
                updatePriceDisplay(__currentDuration, __currentStart, container);
              } catch (_) {}
            },
          },
        ],
        short3: [
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

        const durationOpt =
          (result.spinner2 && result.spinner2[0] && DURATION_OPTIONS[result.spinner2[0].selected - 1]) || null;
        const startOpt =
          (result.spinner2 && result.spinner2[1] && buildHourOptions()[result.spinner2[1].selected - 1]) || null;
        if (!durationOpt) {
          main.toast('Please select a valid duration.', 'error');
          return;
        }
        if (!startOpt) {
          main.toast('Please select a valid start time.', 'error');
          return;
        }
        const selectedDuration = durationOpt.value;
        const startTime = startOpt.value;
        const startParts = startTime.split(':').map((n) => parseInt(n, 10));
        const endTotal = startParts[0] * 60 + startParts[1] + selectedDuration * 60;
        const endTime =
          endTotal === 24 * 60
            ? '00:00'
            : `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;

        try {
          const start = new Date(`1970-01-01T${startTime}:00`);
          let end = new Date(`1970-01-01T${endTime}:00`);
          if (end < start) {
            end.setDate(end.getDate() + 1);
          }
          const diffMs = end - start;
          const durationHours = diffMs / (1000 * 60 * 60);

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

          // Enforce hard cutoff at 12:00 AM (midnight)
          {
            const [sh, sm] = startTime.split(':').map((n) => parseInt(n, 10));
            const computedEndTotalMinutes = sh * 60 + sm + selectedDuration * 60;
            if (computedEndTotalMinutes > 24 * 60) {
              throw new Error('The reservation must finish by 12:00 AM.');
            }
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

            throw new Error(`This time slot is already booked by ${conflictingCustomerName} (${conflictingTime}).`);
          }
        } catch (error) {
          main.toast(error.message, 'error');
          return;
        }

        main.openConfirmationModal(
          `Reserve for<br><p class="text-lg">${fullName}</p>at ${main.decodeDate(
            reservationDate
          )}<br>from ${main.decodeTime(startTime)} to ${main.decodeTime(endTime)}`,
          () => {
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
              amount: main.decodePrice(result.short3[0].value),
            };

            try {
              main.toast('Reservation is now ready for payment!', 'success');
              main.closeConfirmationModal(() => {
                main.closeModal(async () => {
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
                });
              });
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
  computeAndUpdateDashboardStats();
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
    // Only show reservations that have not yet ended
    const now = new Date();
    const upcomingReservations = reservationsAtTargetDate.filter((r) => {
      const end = buildDateTime(r.date, r.endTime);
      return end > now;
    });
    upcomingReservations.forEach((reservationAtTargetDate) => {
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
                  <p class="text-sm text-gray-500">Start time: ${main.decodeTime(reservationAtTargetDate.startTime)}</p>
                  <p class="text-sm text-gray-500">End time: ${main.decodeTime(reservationAtTargetDate.endTime)}</p>
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
  const items = Array.from(emptyText.parentElement?.parentElement?.children || []);
  // Count all rows except the header empty-text row
  return Math.max(0, items.length - 1);
}

function updateReservationStats() {
  try {
    const statElementsAll = document.querySelectorAll(`[id*="${SECTION_NAME}"][id*="SectionStats"]`);
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

// Remove any accidental duplicate DOM rows by dataset.id in a Section One tab
function dedupeSectionOneTab(tabIndex) {
  try {
    const emptyText = document.getElementById(`${SECTION_NAME}SectionOneListEmpty${tabIndex}`);
    if (!emptyText) return;
    const listRoot = emptyText.parentElement?.parentElement;
    if (!listRoot || !listRoot.children || listRoot.children.length <= 1) return;
    const seen = new Set();
    const toRemove = [];
    Array.from(listRoot.children)
      .slice(1)
      .forEach((item) => {
        const id = item?.dataset?.id;
        if (!id) return;
        if (seen.has(id)) toRemove.push(item);
        else seen.add(id);
      });
    toRemove.forEach((el) => {
      try {
        el.remove();
      } catch (e) {}
    });
  } catch (e) {}
}

// Public function to initiate reservation process
export async function reserveCustomer() {
  autoselect = true;
  main.showSection(SECTION_NAME);
  await sectionTwoMainBtnFunction();
  render();
}

// Handles cancellation of pending payment transactions
export async function cancelPendingTransaction(transactionId) {
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', 2, async (findResult) => {
    if (findResult) {
      try {
        const resId = findResult.dataset.id;
        const snap = await getDoc(doc(db, 'reservations', resId));
        const data = snap.exists() ? snap.data() : {};
        const statusLc = String(data.status || '').toLowerCase();
        // If this is a newly created reservation awaiting initial payment, remove it entirely
        if (statusLc === 'pending' && !data.pendingDate && !data.pendingStartTime && !data.pendingEndTime) {
          await deleteReservationFE(resId);
          try {
            main.toast('Pending reservation canceled and removed. Slot is now available.', 'info');
          } catch (_) {}
        } else {
          // Otherwise it's a reschedule payment cancel: clear pending fields and keep original schedule
          await updateReservationFE(resId, {
            tid: '',
            pendingDate: '',
            pendingStartTime: '',
            pendingEndTime: '',
            pendingAmount: 0,
          });
          try {
            main.toast('Reschedule canceled. Original schedule retained.', 'info');
          } catch (_) {}
        }
      } catch (_) {}
    }
  });
}

// Completes the reservation payment process and updates status
export async function completeReservationPayment(transactionId) {
  main.showSection(SECTION_NAME, 2);
  const { datetime } = main.getDateOrTimeOrBoth();
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', 2, async (findResult) => {
    if (!findResult) return;
    try {
      const snap = await getDoc(doc(db, 'reservations', findResult.dataset.id));
      const data = snap.exists() ? snap.data() : {};
      const newDate = data.pendingDate || data.date;
      const newStart = data.pendingStartTime || data.startTime;
      const newEnd = data.pendingEndTime || data.endTime;
      const newAmount =
        typeof data.pendingAmount === 'number' && data.pendingAmount > 0 ? data.pendingAmount : data.amount;
      await updateReservationFE(findResult.dataset.id, {
        date: newDate,
        startTime: newStart,
        endTime: newEnd,
        amount: newAmount,
        status: datetime,
        tid: '',
        pendingDate: '',
        pendingStartTime: '',
        pendingEndTime: '',
        pendingAmount: 0,
      });
    } catch (e) {
      try {
        main.toast('Payment completed but failed to apply schedule update. Please refresh.', 'error');
      } catch (_) {}
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
            const start = new Date(`1970-01-01T${startTime}:00`);
            const end = new Date(`1970-01-01T${endTime}:00`);
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

function rescheduleReservation(reservation) {
  const { id, customerId, customerName, date, startTime, endTime } = reservation;
  const { fullName } = main.decodeName(customerName);

  // Disallow rescheduling for Pending reservations
  try {
    const statusLc = (reservation.status || '').toLowerCase();
    if (statusLc === 'pending') {
      main.toast('Cannot reschedule a Pending reservation.', 'error');
      return;
    }
  } catch (e) {}

  // Block rescheduling if the reservation is currently ongoing
  try {
    const now = new Date();
    const startDt = buildDateTime(date, startTime);
    const endDt = buildDateTime(date, endTime);
    if (now >= startDt && now <= endDt) {
      main.toast('Cannot reschedule an ongoing reservation.', 'error');
      return;
    }
  } catch (e) {}

  // Restrict rescheduling to at least 1 day before the scheduled start time
  try {
    const now = new Date();
    const originalStart = buildDateTime(date, startTime);
    const cutoff = new Date(originalStart.getTime() - 24 * 60 * 60 * 1000);
    if (now > cutoff) {
      main.toast('Rescheduling is only allowed at least 1 day before the scheduled date.', 'error');
      return;
    }
  } catch (e) {}

  const buildHourOptions = () => {
    const to12 = (hour24) => {
      const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
      const ap = hour24 >= 12 ? 'PM' : 'AM';
      return `${h}:00 ${ap}`;
    };
    const opts = [];
    for (let h = 9; h <= 23; h++) {
      const startH = String(h).padStart(2, '0');
      opts.push({ value: `${startH}:00`, label: `${to12(h)}` });
    }
    return opts;
  };

  // Track current selections for accurate price recompute and preselect based on existing reservation
  let __rDuration = 1;
  let __rStart = startTime || '09:00';
  try {
    const s = buildDateTime(date, startTime);
    let e = buildDateTime(date, endTime);
    if (e <= s) e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
    __rDuration = Math.max(1, Math.min(7, Math.round((e - s) / (1000 * 60 * 60))));
  } catch (_) {}
  const initialDurIdx = Math.max(0, DURATION_OPTIONS.findIndex((d) => d.value === __rDuration)) + 1;
  const initialStartIdx = Math.max(0, buildHourOptions().findIndex((o) => o.value === __rStart)) + 1;

  const inputs = {
    header: {
      title: `Reschedule ${getEmoji('📆', 26)}`,
      subtitle: 'Select new date and time',
    },
    short: [
      { placeholder: 'Customer details', value: `${fullName} (${customerId})`, locked: true },
      { placeholder: 'Reservation date (mm-dd-yyyy)', value: date, required: true, calendar: true },
    ],
    spinner: [
      {
        label: 'Duration',
        placeholder: 'Select duration',
        selected: initialDurIdx,
        required: true,
        options: DURATION_OPTIONS.map((d) => ({ value: String(d.value), label: d.label })),
        listener: (selectedIndex, container) => {
          try {
            __rDuration = DURATION_OPTIONS[selectedIndex - 1]?.value || 0;
            updateReschedulePrices(container);
          } catch (_) {}
        },
      },
      {
        label: 'Start time',
        placeholder: 'Select start time',
        selected: initialStartIdx,
        required: true,
        options: buildHourOptions(),
        listener: (selectedIndex, container) => {
          try {
            __rStart = buildHourOptions()[selectedIndex - 1]?.value || '09:00';
            updateReschedulePrices(container);
          } catch (_) {}
        },
      },
    ],
    short2: [],
    footer: { main: `Confirm ${getEmoji('📆')}` },
  };

  main.openModal('blue', inputs, async (result) => {
    const newDate = result.short[1].value;
    const durOpt = (result.spinner && result.spinner[0] && DURATION_OPTIONS[result.spinner[0].selected - 1]) || null;
    const startOpt = (result.spinner && result.spinner[1] && buildHourOptions()[result.spinner[1].selected - 1]) || null;
    if (!durOpt) {
      main.toast('Please select a valid duration.', 'error');
      return;
    }
    if (!startOpt) {
      main.toast('Please select a valid start time.', 'error');
      return;
    }
    const selectedDuration = durOpt.value;
    const newStart = startOpt.value;

    const [sh, sm] = newStart.split(':').map((n) => parseInt(n, 10));
    const endTotal = sh * 60 + sm + selectedDuration * 60;
    const newEnd = endTotal === 24 * 60
          ? '00:00'
          : `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;

    let newTotalAmount = 0;
    let additionalDue = 0;
    try {
      newTotalAmount = calculateDynamicPrice(selectedDuration, newStart);
      const prevAmount = Number(reservation.amount) || 0;
      additionalDue = Math.max(0, newTotalAmount - prevAmount);
    } catch (_) {
      newTotalAmount = Number(reservation.amount) || 0;
      additionalDue = 0;
    }

    try {
      const s = new Date(`1970-01-01T${newStart}:00`);
      let e = new Date(`1970-01-01T${newEnd}:00`);
      if (e <= s) throw new Error('End time must be after start time');

      const diffHours = (e - s) / (1000 * 60 * 60);
      if (diffHours < 1) throw new Error('Reservation must be at least 1 hour');
      if (diffHours > 7) throw new Error('Reservation cannot exceed 7 hours');
      if (Math.abs(diffHours - selectedDuration) > 0.1) {
        throw new Error(`Duration must match selected duration of ${selectedDuration} hour${selectedDuration > 1 ? 's' : ''}`);
      }

      const startHour = s.getHours();
      if (startHour < 9) throw new Error('Reservation cannot start before 9:00 AM');

      if (endTotal > 23 * 60 + 59) throw new Error('The reservation must finish before midnight.');

      const todayFormatted = main.encodeDate(new Date(), '2-digit');
      if (newDate === todayFormatted && isTimeInPast(newDate, newStart)) {
        throw new Error('Cannot book past time slots on the same day');
      }

      const others = existingReservations.filter((r) => r.id !== id);
      const conflictExists = (() => {
        const [m, d, y] = newDate.split('-').map(Number);
        const [nsh, nsm] = newStart.split(':').map(Number);
        const [neh, nem] = newEnd.split(':').map(Number);
        const nStart = new Date(y, m - 1, d, nsh, nsm, 0, 0);
        const nEnd = (() => {
          const base = new Date(y, m - 1, d, neh, nem, 0, 0);
          if (endTotal === 24 * 60 && (neh === 0 && nem === 0)) {
            base.setDate(base.getDate() + 1);
          }
          return base;
        })();
        return others.some((res) => {
          const [rm, rd, ry] = (res.date || '').split('-').map(Number);
          if (!(rm === m && rd === d && ry === y)) return false;
          const [esh, esm] = res.startTime.split(':').map(Number);
          const [eeh, eem] = res.endTime.split(':').map(Number);
          const eStart = new Date(y, m - 1, d, esh, esm, 0, 0);
          const eEnd = new Date(y, m - 1, d, eeh, eem, 0, 0);
          // Allow adjacency between reservations
          return nStart < eEnd && nEnd > eStart;
        });
      })();
      if (conflictExists) throw new Error('Selected time is already booked.');
    } catch (error) {
      main.toast(error.message, 'error');
      return;
    }

    main.openConfirmationModal(
      `Reschedule for<br><p class="text-lg">${fullName}</p>to ${main.decodeDate(newDate)}<br>from ${main.decodeTime(newStart)} to ${main.decodeTime(newEnd)}${additionalDue > 0 ? `<br><br>New total: ${main.encodePrice(newTotalAmount)}<br>Additional to pay: ${main.encodePrice(additionalDue)}` : ''}`,
      async () => {
        try {
          if (additionalDue > 0) {
            let imageSrc = '';
            try {
              await new Promise((resolve) => {
                main.findAtSectionOne('inquiry-customers', customerId, 'equal_id', 1, (findResult) => {
                  if (findResult) imageSrc = findResult.dataset.image || '';
                  resolve();
                });
              });
            } catch (_) {}

            payments.processReservationPayment(
              {
                image: imageSrc || '/src/images/client_logo.jpg',
                name: reservation.customerName,
                cid: customerId,
                amount: additionalDue,
                purpose: 'Reschedule adjustment (facility reservation)',
              },
              async (pendingId) => {
                try {
                  await updateReservationFE(id, {
                    tid: pendingId,
                    pendingDate: newDate,
                    pendingStartTime: newStart,
                    pendingEndTime: newEnd,
                    pendingAmount: newTotalAmount,
                  });
                } catch (_) {}
              }
            );

            main.toast(
              `Additional payment created for ${main.encodePrice(additionalDue)}. Schedule will update after payment.`,
              'success'
            );
          } else {
            await updateReservationFE(id, { date: newDate, startTime: newStart, endTime: newEnd, amount: newTotalAmount });
            main.toast('Reservation rescheduled successfully!', 'success');
          }
          main.closeConfirmationModal();
          main.closeModal();
        } catch (e) {
          main.toast(`Error rescheduling: ${e.message}`, 'error');
        }
      }
    );
  });
}

export default { reserveCustomer, cancelPendingTransaction, completeReservationPayment };
