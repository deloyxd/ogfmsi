import main from '../admin_main.js';
import customers from './inquiry_customers.js';

const SECTION_NAME = 'payments';
const MODULE_NAME = 'Payments';

let mainBtn, subBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName != SECTION_NAME) return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  subBtn.classList.remove('hidden');
  subBtn.addEventListener('click', subBtnFunction);
});

function mainBtnFunction() {}

function subBtnFunction() {}

export function processCheckinPayment(customerId, image, fullName, isMonthlyPass, amountToPay, priceRate, callback) {
  main.showSection(SECTION_NAME);
  const purpose = `${isMonthlyPass ? 'Monthly ' : 'Daily '} pass ${isMonthlyPass ? 'registration fee' : 'check-in (Regular walk-in)'}`;
  const columnsData = [
    'id_T_random',
    {
      type: 'object',
      data: [image, customerId],
    },
    purpose,
    main.encodePrice(amountToPay),
    main.fixText(priceRate),
    'custom_datetime_today',
  ];
  main.createAtSectionOne(SECTION_NAME, columnsData, 1, (result) => {
    callback(result.dataset.id);
    const transactionProcessBtn = result.querySelector('#transactionProcessBtn');
    transactionProcessBtn.addEventListener('click', () => {
      completeCheckinPayment(
        result.dataset.id,
        result.dataset.image,
        result.dataset.text,
        purpose,
        fullName,
        amountToPay,
        priceRate
      );
    });
    const transactionVoidBtn = result.querySelector('#transactionVoidBtn');
    transactionVoidBtn.addEventListener('click', () => {
      main.openConfirmationModal('Void pending transaction. Cannot be undone.<br><br>• ID: ' + result.dataset.id, () => {
        main.deleteAtSectionOne(SECTION_NAME, 1, result.dataset.id);
        main.toast('Transaction successfully voided!', 'error');
      });
    });
    completeCheckinPayment(
      result.dataset.id,
      result.dataset.image,
      result.dataset.text,
      purpose,
      fullName,
      amountToPay,
      priceRate
    );
  });
}

function completeCheckinPayment(id, image, customerId, purpose, fullName, amountToPay, priceRate) {
  const inputs = {
    header: {
      title: `Transaction ID: ${id} ${getEmoji('🔏', 26)}`,
      subtitle: `Purpose: ${purpose}`,
    },
    short: [
      { placeholder: 'Customer details', value: `${fullName} (${customerId})`, locked: true },
      { placeholder: 'Amount to pay', value: main.encodePrice(amountToPay), locked: true },
      { placeholder: 'Payment amount', value: amountToPay, required: true },
      { placeholder: 'Change amount', value: main.encodePrice(0), locked: true, live: '1-2:subtract' },
      { placeholder: 'Price rate', value: main.fixText(priceRate), locked: true },
      { placeholder: 'Reference number', value: 'N/A', required: true },
    ],
    radio: [
      { label: 'Payment method', selected: 1 },
      {
        icon: `${getEmoji('💵', 26)}`,
        title: 'Cash',
        subtitle: 'Traditional payment method',
      },
      {
        icon: `${getEmoji('💳', 26)}`,
        title: 'Cashless',
        subtitle: 'Digital payment method',
      },
      {
        icon: `${getEmoji('💵', 20)} + ${getEmoji('💳', 20)}`,
        title: 'Hybrid',
        subtitle: 'Both physical and digital payment method',
      },
    ],
    footer: {
      main: `Complete payment transaction ${getEmoji('🔏')}`,
    },
  };

  main.openModal('yellow', inputs, (result) => {
    let amountPaid = result.short[2].value;
    if (!main.isValidPaymentAmount(+amountPaid) || +amountPaid < +amountToPay) {
      main.toast(`Invalid payment amount: ${amountPaid}`, 'error');
      return;
    }
    const change = result.short[3].value;

    const refNum = result.short[5].value;
    if (
      result.radio[0].selected > 1 &&
      ((refNum != 'N/A' && /[^0-9]/.test(refNum)) || refNum == 'N/A' || refNum == '')
    ) {
      main.toast(`Invalid reference number: ${refNum}`, 'error');
      return;
    }

    const columnsData = [
      'id_' + id,
      {
        type: 'object',
        data: [image, customerId],
      },
      purpose,
      main.encodePrice(amountToPay),
      main.encodePrice(amountPaid),
      change,
      main.fixText(priceRate),
      main.fixText(main.getSelectedRadio(result.radio)),
      'custom_datetime_today',
    ];

    main.createAtSectionOne(SECTION_NAME, columnsData, 3, () => {
      main.toast(`Transaction successfully completed!`, 'success');
      main.createRedDot(SECTION_NAME, 'main');
      main.createRedDot(SECTION_NAME, 3);
      main.deleteAtSectionOne(SECTION_NAME, 1, id);

      main.closeModal(() => {
        customers.completeCheckinPayment(id, amountPaid, priceRate);
      });
    });
  });
}

export function voidCheckinPayment(transactionId) {
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_id', 1, (findResult) => {
    if (findResult) {
      const columnsData = [
        'id_' + findResult.dataset.id,
        {
          type: 'object',
          data: [findResult.dataset.image, findResult.dataset.text],
        },
        findResult.dataset.custom2,
        'custom_datetime_today',
      ];

      main.createAtSectionOne(SECTION_NAME, columnsData, 2, () => {
        main.deleteAtSectionOne(SECTION_NAME, 1, transactionId);
        main.toast(`${transactionId}, successfully voided pending transaction!`, 'error');
        main.createRedDot(SECTION_NAME, 'main');
        main.createRedDot(SECTION_NAME, 2);
      });
    }
  });
}

export default { processCheckinPayment, voidCheckinPayment };
