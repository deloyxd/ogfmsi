import main from '../admin_main.js';

// default codes:
let mainBtn, subBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'settings') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  //   subBtn.classList.remove('hidden');
  subBtn.addEventListener('click', subBtnFunction);
});

function mainBtnFunction() {
  main.toast('Settings saved!', 'success');
}

function subBtnFunction() {}
