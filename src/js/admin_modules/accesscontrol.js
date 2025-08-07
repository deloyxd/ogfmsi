import main from '../admin_main.js';
import datasync from './datasync.js';

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
  datasync.enqueue(action, data);
  const columnsData = [
    'U288343611137',
    {
      type: 'user',
      data: ['U288343611137', '', 'Jestley', 'Admin'],
    },
    action.module + (action.submodule ? ': ' + action.submodule : ''),
    action.description,
    'custom_datetime_today',
  ];
  main.createAtSectionOne('accesscontrol', columnsData, 4, '', (editedResult, status) => {
    if (status == 'success') {
      const btns = editedResult.children[editedResult.children.length - 1].children[0];
      const actionDetailsBtn = btns.querySelector('#actionDetailsBtn');
      actionDetailsBtn.addEventListener('click', () => actionDetailsBtnFunction(data));

      main.createRedDot('accesscontrol', 'main');
      main.createRedDot('accesscontrol', 4);
    }
  });
}

export default { log };

function actionDetailsBtnFunction(actionData) {
  let inputs = {};
  switch (actionData.type) {
    case 'user':
    case 'user_transaction':
      const userFirstName = actionData.name.split(':://')[0];
      const userLastName = actionData.name.split(':://')[1];
      inputs = {
        header: {
          title: 'View Action Details 🔧',
          subtitle: 'User ID: ' + actionData.id,
        },
        image: {
          src: actionData.image,
          type: 'normal',
          locked: true,
          short: [
            { placeholder: 'First name', value: userFirstName, locked: true },
            { placeholder: 'Last name', value: userLastName, locked: true },
            { placeholder: 'Email / contact', value: actionData.contact, locked: true },
          ],
        },
        footer: {
          main: 'Exit view',
        },
      };
      if (actionData.type == 'user_transaction')
        inputs.short = [
          {
            placeholder: 'Amount paid',
            value: actionData.amount ? actionData.amount : "Wasn't able to pay",
            locked: true,
          },
        ];
      break;
    case 'transaction':
      inputs = {
        header: {
          title: 'View Action Details 🔧',
          subtitle: 'Transaction ID: ' + actionData.id,
        },
        short: [
          { placeholder: 'User ID', value: actionData.user_id, locked: true },
          { placeholder: 'Payment type', value: actionData.payment_type, locked: true },
          { placeholder: 'Payment amount', value: actionData.payment_amount, locked: true },
          { placeholder: 'Payment reference number', value: actionData.payment_refnum, locked: true },
          { placeholder: 'Payment rate', value: actionData.payment_rate, locked: true },
          { placeholder: 'Payment purpose', value: actionData.purpose, locked: true },
        ],
        footer: {
          main: 'Exit view',
        },
      };
      break;
  }
  main.openModal('gray', inputs, main.closeModal);
}
