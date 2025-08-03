import main from '../admin_main.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'maintenance') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
//   subBtn.classList.remove('hidden');
//   subBtn.addEventListener('click', subBtnFunction);
  sectionTwoMainBtn = document.getElementById(`${main.sharedState.sectionName}SectionTwoMainBtn`);
//   sectionTwoMainBtn.addEventListener('click', sectionTwoMainBtnFunction);

  // not default code: sample of custom content setup
  setupHeader();
  setupMaintenanceTasks();
});

function mainBtnFunction() {

}

function setupHeader() {

}

function setupMaintenanceTasks() {}