import main from '../admin_main.js';

const SECTION_NAME = 'maintenance-accesscontrol';

let mainBtn;

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName != SECTION_NAME) return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
});

function mainBtnFunction() {}

export function log(action, data) {
  // Only attempt to render log rows when the Maintenance Access Control section is active.
  // This avoids errors when other modules (e.g., Dashboard) call log() while the
  // section's DOM is not mounted yet.
  if (main.sharedState.sectionName !== SECTION_NAME) {
    // Optionally: queue logs for later rendering if needed.
    // For now, safely no-op to prevent runtime errors.
    return;
  }

  const columnsData = [
    'id_U288343611137',
    {
      type: 'object_role',
      data: ['', 'Jestley', 'Admin'],
    },
    action.module + (action.submodule ? ': ' + action.submodule : ''),
    action.description,
    'custom_datetime_today',
  ];
  main.createAtSectionOne(SECTION_NAME, columnsData, 4, (editedResult) => {
    const btns = editedResult.children[editedResult.children.length - 1].children[0];
    const actionDetailsBtn = btns.querySelector('#actionDetailsBtn');
    actionDetailsBtn.addEventListener('click', () => main.openModal('gray', getInputs(data), main.closeModal));

    main.createNotifDot(SECTION_NAME, 'sub');
    main.createNotifDot(SECTION_NAME, 4);
  });
}

export default { log };

function getInputs(actionData) {
  if (actionData.type.includes('user')) {
    const userFirstName = actionData.name.split(':://')[0];
    const userLastName = actionData.name.split(':://')[1];
    const inputs = {
      header: {
        title: `View Action Details ${getEmoji('🔧', 26)}`,
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
    if (actionData.type.includes('transaction'))
      inputs.short = [
        {
          placeholder: 'Amount paid',
          value: actionData.amount ? actionData.amount : 'Not yet paid',
          locked: true,
        },
      ];
    return inputs;
  }

  if (actionData.type.includes('transaction')) {
    const inputs = {
      header: {
        title: `View Action Details ${getEmoji('🔧', 26)}`,
        subtitle: 'Transaction ID: ' + actionData.id,
      },
      short: [
        { placeholder: 'User ID', value: actionData.user_id, locked: true },
        { placeholder: 'Payment type', value: actionData.payment_type, locked: true },
        { placeholder: 'Payment amount', value: main.encodePrice(actionData.payment_amount), locked: true },
        { placeholder: 'Payment reference number', value: actionData.payment_refnum, locked: true },
        { placeholder: 'Payment rate', value: actionData.payment_rate, locked: true },
        { placeholder: 'Payment purpose', value: actionData.purpose, locked: true },
      ],
      footer: {
        main: 'Exit view',
      },
    };
    return inputs;
  }

  if (actionData.type.includes('product')) {
    const inputs = {
      header: {
        title: `View Action Details ${getEmoji('🔧', 26)}`,
        subtitle: 'Product ID: ' + actionData.id,
      },
      image: {
        src: actionData.image,
        type: 'normal',
        locked: true,
        short: [
          { placeholder: 'Product name', value: actionData.name, locked: true },
          { placeholder: 'Price', value: actionData.price, locked: true },
        ],
      },
      short: [
        {
          placeholder: 'Measurement',
          value: actionData.measurement != '' ? actionData.measurement : 'N/A',
          locked: true,
        },
        {
          placeholder: 'Measurement unit',
          value: actionData.measurementUnit != '' ? actionData.measurementUnit : 'N/A',
          locked: true,
        },
        { placeholder: 'Product category ID', value: actionData.category, locked: true },
      ],
      footer: {
        main: 'Exit view',
      },
    };

    if (!actionData.type.includes('delete')) {
      inputs.image.short.push({ placeholder: 'Quantity', value: actionData.quantity, locked: true });
    }

    return inputs;
  }
}
