import main from '../admin_main.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'reports') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  //   subBtn.classList.remove('hidden');
  subBtn.addEventListener('click', subBtnFunction);
});

function mainBtnFunction() {
  //   const content = document.getElementById(tabContentIds[currentActiveTab]);
  //   if (!content) return;
  //   html2pdf()
  //     .set({
  //       margin: 0.5,
  //       filename: 'report.pdf',
  //       image: { type: 'jpeg', quality: 0.98 },
  //       html2canvas: { scale: 2 },
  //       jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
  //     })
  //     .from(content)
  //     .save();
}

function subBtnFunction() {}
