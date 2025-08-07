import main from '../admin_main.js';

// default codes:
let mainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'accesscontrol') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
});

function mainBtnFunction() {}

export function log(action, data) {
  const columnsData = [
    'U288343611137',
    {
      type: 'user',
      data: ['U288343611137', '', 'Jestley', 'Admin'],
    },
    action.module,
    action.description,
    'datetime_today',
  ];
  main.createAtSectionOne('accesscontrol', columnsData, 4, '', (editedResult, status) => {
    if (status == 'success') {
      const btns = editedResult.children[editedResult.children.length - 1].children[0];
      const actionDetailsBtn = btns.querySelector('#actionDetailsBtn');
      actionDetailsBtn.addEventListener('click', () => {
        actionDetailsBtnFunction(data);
      });

      main.createRedDot('accesscontrol', 'main');
      main.createRedDot('accesscontrol', 4);
    }
  });
}

export default { log };

function actionDetailsBtnFunction(actionData) {
  console.log(actionData);
}
