import main from '../admin_main.js';

const SECTION_NAME = 'inquiry-checkins';
const MODULE_NAME = 'Inquiry';
const SUBMODULE_NAME = 'Check-Ins';

let subBtn;

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  subBtn = document.querySelector(`.section-sub-btn[data-section="${SECTION_NAME}"]`);
  subBtn?.classList.remove('hidden');
  subBtn?.addEventListener('click', () => {});
});

export function logCheckin(transactionId, customer, tabIndex, showSection) {
  const { firstName } = main.decodeName(customer.dataset.text);
  if (showSection) {
    main.showSection(SECTION_NAME);
  } else {
    main.createRedDot(SECTION_NAME, 'sub');
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

    main.toast(`${firstName}, successfully checked-in!`, 'success');

    if (tabIndex == 2) {
      main.createRedDot(SECTION_NAME, tabIndex);
    }
  });
}

function checkinArchiveBtnFunction(checkin, tabIndex) {
  main.openConfirmationModal('Archive check-in log. Cannot be undone.' + checkin.dataset.id, () => {
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
        main.createAtSectionOne(SECTION_NAME, columnsData, 3, () => {
          main.createRedDot(SECTION_NAME, 3);
          main.deleteAtSectionOne(SECTION_NAME, tabIndex, checkin.dataset.id);
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
