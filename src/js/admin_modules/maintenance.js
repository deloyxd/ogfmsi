import main from '../admin_main.js';
import accesscontrol from './accesscontrol.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'maintenance') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
});

function mainBtnFunction() {
  const inputs = {
    header: {
      title: 'Register Equipment 🧊',
      subtitle: 'Equipment registration form',
    },
    image: {
      src: '/src/images/client_logo.jpg',
      type: 'normal',
      short: [
        { placeholder: 'Equipment name', value: '', required: true },
        { placeholder: 'Initial quantity', value: '', required: true },
      ],
    },
    spinner: [
      {
        label: 'Equipment category',
        placeholder: 'Select an Equipment category',
        selected: 0,
        required: true,
        options: [
          { value: 'Machine', label: 'Machine' },
          { value: 'Non-Machine', label: 'Non-Machine' },
        ],
      },
    ],
  };

  main.openModal(mainBtn, inputs, (result) => {
    if (!main.isValidPaymentAmount(+result.image.short[1].value)) {
      main.toast(`Invalid quantity: ${result.image.short[1].value}`, 'error');
      return;
    }
    if (result.spinner[0].selected < 1) {
      main.toast(`Invalid category`, 'error');
      return;
    }
    registerNewProduct(
      result.image.src,
      result.image.short[0].value,
      +result.image.short[1].value,
      result.spinner[0].options[result.spinner[0].selected - 1].value
    );
  });
}

function registerNewProduct(image, name, quantity, category) {
  const columnsData = [
    'id_EQ_random',
    {
      type: 'product',
      data: ['', image, name.replace(/\s+/g, ':://')],
    },
    quantity + '',
    category,
    '<p class="text-green-600 font-bold">Good Condition ✅</p>',
    'custom_date_today',
  ];

  main.createAtSectionOne('maintenance', columnsData, 1, name, (result, status) => {
    if (status == 'success') {
      const action = {
        module: 'Maintenance',
        submodule: 'Equipment',
        description: 'Register equipment',
      };
      const data = {
        id: result.dataset.id,
        image: image,
        name: name,
        quantity: quantity,
        category: category,
        condition: 'Good Condition',
        date: result.dataset.date,
        type: 'equipment',
      };
      accesscontrol.log(action, data);

      main.createRedDot('maintenance', 1);
      main.toast(`${name}, successfully registered!`, 'success');
      main.closeModal();
    } else {
      main.toast('Error: Equipment duplication detected: ' + result.dataset.id, 'error');
    }
  });
}

function refreshAllTabs() {}
