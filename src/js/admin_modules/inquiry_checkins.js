import main from '../admin_main.js';
import { API_BASE_URL } from '../_global.js';
import customers from './inquiry_customers.js';

const SECTION_NAME = 'inquiry-checkins';
const MODULE_NAME = 'Inquiry';
const SUBMODULE_NAME = 'Check-Ins';

let activated = false,
  subBtn;

document.addEventListener('ogfmsiAdminMainLoaded', async () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  if (!activated) {
    activated = true;
    subBtn = document.querySelector(`.section-sub-btn[data-section="${SECTION_NAME}"]`);
    subBtn?.classList.remove('hidden');
    subBtn?.addEventListener('click', () => {});

    await loadAllCheckins();
    setupMidnightClear();
  }
});

export function logCheckin(transactionId, customer, tabIndex, showSection) {
  const { firstName } = main.decodeName(customer.dataset.text);
  if (showSection) {
    // Navigate directly to the appropriate tab (1 = Regular, 2 = Monthly)
    main.showSection(SECTION_NAME, tabIndex);
  } else {
    main.createNotifDot(SECTION_NAME, 'sub');
  }

  const columnsData = [
    'id_' + customer.dataset.id,
    {
      type: 'object_contact',
      data: [customer.dataset.image, customer.dataset.text, customer.dataset.contact],
    },
    'custom_datetime_today',
  ];

  main.createAtSectionOne(SECTION_NAME, columnsData, tabIndex, (createResult) => {
    createResult.dataset.tid = transactionId;

    // No action buttons needed for check-ins

    // Persist check-in to backend based on tab index
    const payload = {
      checkin_id: transactionId,
      customer_id: customer.dataset.id,
      customer_name_encoded: customer.dataset.text,
      customer_contact: customer.dataset.contact,
      customer_image_url: customer.dataset.image,
      transaction_id: transactionId,
    };

    if (tabIndex === 1) {
      postCheckin(`${API_BASE_URL}/inquiry/checkins/regular`, payload);
    } else if (tabIndex === 2) {
      postCheckin(`${API_BASE_URL}/inquiry/checkins/monthly`, payload);
    }

    main.toast(`${firstName}, successfully checked-in!`, 'success');

    if (tabIndex == 2) {
      main.createNotifDot(SECTION_NAME, tabIndex);
    }
  });
}

// ngayon read only nalang yung check-ins natin since attendance lang naman siya
// mag c-clear yung mga tabs nayan kada pag tapos ng 12am

export function findLogCheckin(id, tabIndex, callback) {
  main.findAtSectionOne(SECTION_NAME, id, 'equal_id', tabIndex, (findResult) => {
    callback(findResult);
  });
}

export default { logCheckin, findLogCheckin };

async function loadAllCheckins() {
  try {
    const [regularResp, monthlyResp] = await Promise.all([
      fetch(`${API_BASE_URL}/inquiry/checkins/regular`),
      fetch(`${API_BASE_URL}/inquiry/checkins/monthly`),
    ]);

    if (regularResp.ok) {
      const data = await regularResp.json();
      data.result.forEach((r) => renderCheckinFromBackend(r, 1));
    }
    if (monthlyResp.ok) {
      const data = await monthlyResp.json();
      data.result.forEach((r) => renderCheckinFromBackend(r, 2));
    }
  } catch (error) {
    console.error('Failed to load check-ins:', error);
  }
}

function renderCheckinFromBackend(record, tabIndex) {
  const logDate = main.encodeDate(
    record.created_at,
    main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
  );
  const logTime = main.encodeTime(record.created_at, 'long');

  main.findAtSectionOne('inquiry-customers', record.customer_id || record.checkin_id, 'equal_id', 1, (findResult) => {
    let imageSrc = '';
    if (findResult) {
      imageSrc = findResult.dataset.image;
    }
    if (imageSrc === '') {
      imageSrc = record.customer_image_url;
    }

    const columnsData = [
      'id_' + (record.customer_id || record.checkin_id),
      {
        type: 'object_contact',
        data: [imageSrc, record.customer_name_encoded, record.customer_contact],
      },
      `${logDate} - ${logTime}`,
    ];

    main.createAtSectionOne(SECTION_NAME, columnsData, tabIndex, (createResult) => {
      if (record.transaction_id) createResult.dataset.tid = record.transaction_id;
    });
  });
}

async function postCheckin(url, payload) {
  main.sharedState.moduleLoad = SECTION_NAME;
  window.showGlobalLoading?.();
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error('Check-in API error:', resp.status, err);
    }
  } catch (error) {
    console.error('Check-in API request failed:', error);
  } finally {
    window.hideGlobalLoading?.();
  }
}

function setupMidnightClear() {
  const now = new Date();
  let lastClearDate = localStorage.getItem('monthlyCheckinsLastCleared');
  const today = now.toDateString();

  if (lastClearDate !== today) {
    clearAllCheckins();
    localStorage.setItem('monthlyCheckinsLastCleared', today);
  }

  setInterval(() => {
    const currentTime = new Date();
    const currentDate = currentTime.toDateString();

    // refresh lastClearDate from storage to avoid stale closure value
    lastClearDate = localStorage.getItem('monthlyCheckinsLastCleared');
    if (lastClearDate !== currentDate) {
      clearAllCheckins();
      localStorage.setItem('monthlyCheckinsLastCleared', currentDate);
    }
  }, 60000); // 1 minute interval
}

async function clearMonthlyCheckins() {
  try {
    const resp = await fetch(`${API_BASE_URL}/inquiry/checkins/monthly/clear`, {
      method: 'DELETE',
    });

    if (resp.ok) {
      const monthlyTab = document.querySelector(`#${SECTION_NAME}-section .tab-content[data-tab="2"]`);
      if (monthlyTab) {
        const listContainer = monthlyTab.querySelector('.list-container');
        if (listContainer) {
          listContainer.innerHTML =
            '<p class="text-sm text-gray-400 text-center py-4">No monthly customer check-ins yet</p>';
        }
      }
      console.log('Monthly check-ins cleared for new day');
    }
  } catch (error) {
    console.error('Failed to clear monthly check-ins:', error);
  }
}

async function clearRegularCheckins() {
  try {
    const resp = await fetch(`${API_BASE_URL}/inquiry/checkins/regular/clear`, {
      method: 'DELETE',
    });

    if (resp.ok) {
      const regularTab = document.querySelector(`#${SECTION_NAME}-section .tab-content[data-tab="1"]`);
      if (regularTab) {
        const listContainer = regularTab.querySelector('.list-container');
        if (listContainer) {
          listContainer.innerHTML =
            '<p class="text-sm text-gray-400 text-center py-4">No regular customer check-ins yet</p>';
        }
      }
      console.log('Regular check-ins cleared for new day');
    }
  } catch (error) {
    console.error('Failed to clear regular check-ins:', error);
  }
}

async function clearAllCheckins() {
  await Promise.allSettled([clearRegularCheckins(), clearMonthlyCheckins()]);
}
