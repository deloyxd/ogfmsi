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

export function logCheckin(customer, tabIndex) {
  if (tabIndex == 1) {
    main.showSection(SECTION_NAME);
  } else {
    main.createRedDot(SECTION_NAME, 'sub');
    main.createRedDot(SECTION_NAME, 2);
  }
}

export default { logCheckin };
