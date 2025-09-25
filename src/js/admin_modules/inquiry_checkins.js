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
  }
});

export function logCheckin(transactionId, customer, tabIndex, showSection) {
  const { firstName } = main.decodeName(customer.dataset.text);
  if (showSection) {
    main.showSection(SECTION_NAME);
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

    const checkinArchiveBtn = createResult.querySelector(`#checkinArchiveBtn`);
    checkinArchiveBtn.addEventListener('click', () => checkinArchiveBtnFunction(createResult, tabIndex));

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

function checkinArchiveBtnFunction(checkin, tabIndex) {
  main.openConfirmationModal('Archive check-in log. Cannot be undone.<br><br>ID: ' + checkin.dataset.id, () => {
    main.findAtSectionOne(SECTION_NAME, checkin.dataset.id, 'equal_id', tabIndex, (findResult) => {
      if (findResult) {
        const columnsData = [
          'id_' + checkin.dataset.id,
          {
            type: 'object_contact',
            data: [checkin.dataset.image, checkin.dataset.text, checkin.dataset.contact],
          },
          'custom_datetime_today',
        ];
        main.createAtSectionOne(SECTION_NAME, columnsData, 3, (createResult) => {
          main.createNotifDot(SECTION_NAME, 3);
          main.deleteAtSectionOne(SECTION_NAME, tabIndex, checkin.dataset.id);

          const checkinDetailsBtn = createResult.querySelector(`#checkinDetailsBtn`);
          checkinDetailsBtn.addEventListener('click', () =>
            customers.customerDetailsBtnFunction(checkin.dataset.id, 'Archive Details', '🧾')
          );

          // Persist archive to backend
          const sourceType = tabIndex === 1 ? 'regular' : 'monthly';
          const archivePayload = {
            archive_id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            source_type: sourceType,
            checkin_id: checkin.dataset.tid || checkin.dataset.id,
            customer_id: checkin.dataset.id,
            customer_name_encoded: checkin.dataset.text,
            customer_contact: checkin.dataset.contact,
            customer_image_url: checkin.dataset.image,
            transaction_id: checkin.dataset.tid || '',
          };
          postCheckin(`${API_BASE_URL}/inquiry/checkins/archived`, archivePayload);
        });
      }
    });
    // archiveLoop(checkin.dataset.id);
    main.toast(`Successfully archived check-in log!`, 'error');
    main.closeConfirmationModal();
    main.closeModal();

    // function archiveLoop(checkinId) {
    //   main.findAtSectionOne(SECTION_NAME, checkinId, 'equal_id', tabIndex, (deleteResult) => {
    //     if (deleteResult) {
    //       deleteResult.remove();
    //       archiveLoop(checkinId);
    //     }
    //   });
    // }
  });
}

export function findLogCheckin(id, tabIndex, callback) {
  main.findAtSectionOne(SECTION_NAME, id, 'equal_id', tabIndex, (findResult) => {
    callback(findResult);
  });
}

export default { logCheckin, findLogCheckin };

async function loadAllCheckins() {
  try {
    const [regularResp, monthlyResp, archivedResp] = await Promise.all([
      fetch(`${API_BASE_URL}/inquiry/checkins/regular`),
      fetch(`${API_BASE_URL}/inquiry/checkins/monthly`),
      fetch(`${API_BASE_URL}/inquiry/checkins/archived`),
    ]);

    if (regularResp.ok) {
      const data = await regularResp.json();
      data.result.forEach((r) => renderCheckinFromBackend(r, 1));
    }
    if (monthlyResp.ok) {
      const data = await monthlyResp.json();
      data.result.forEach((r) => renderCheckinFromBackend(r, 2));
    }
    if (archivedResp.ok) {
      const data = await archivedResp.json();
      data.result.forEach((r) => renderCheckinFromBackend(r, 3));
    }
  } catch (error) {
    console.error('Failed to load check-ins:', error);
  }
}

function renderCheckinFromBackend(record, tabIndex) {
  const columnsData = [
    'id_' + (record.customer_id || record.checkin_id),
    {
      type: 'object_contact',
      data: [record.customer_image_url, record.customer_name_encoded, record.customer_contact],
    },
    'custom_datetime_today',
  ];

  main.createAtSectionOne(SECTION_NAME, columnsData, tabIndex, (createResult) => {
    if (record.transaction_id) createResult.dataset.tid = record.transaction_id;

    if (tabIndex === 3) {
      const checkinDetailsBtn = createResult.querySelector(`#checkinDetailsBtn`);
      checkinDetailsBtn?.addEventListener('click', () =>
        customers.customerDetailsBtnFunction(createResult.dataset.id, 'Archive Details', '🧾')
      );
    } else {
      const checkinArchiveBtn = createResult.querySelector(`#checkinArchiveBtn`);
      checkinArchiveBtn?.addEventListener('click', () => checkinArchiveBtnFunction(createResult, tabIndex));
    }
  });
}

async function postCheckin(url, payload) {
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
  }
}