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

export function logCheckin(transactionId, customer, tabIndex) {
  if (tabIndex == 1) {
    main.showSection(SECTION_NAME);
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

    const { firstName } = main.decodeName(createResult.dataset.text);
    main.toast(`${firstName}, successfully checked-in!`, 'success');

    if (tabIndex == 2) {
      main.createRedDot(SECTION_NAME, 'sub');
      main.createRedDot(SECTION_NAME, tabIndex);
    }
  });
}

export default { logCheckin };
