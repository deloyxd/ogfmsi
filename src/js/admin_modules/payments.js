import main from '../admin_main.js';
import customers from './inquiry_customers.js';

const SECTION_NAME = 'payments';
const MODULE_NAME = 'Payments';

let activated = false,
  mainBtn,
  subBtn;

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName != SECTION_NAME) return;

  if (!activated) {
    activated = true;

    mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
    mainBtn.addEventListener('click', mainBtnFunction);
    subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
    subBtn.classList.remove('hidden');
    subBtn.addEventListener('click', subBtnFunction);
  }
});

function mainBtnFunction() {}

function subBtnFunction() {}

export function processCheckinPayment(customerId, image, fullName, isMonthlyType, amountToPay, priceRate, callback) {
  const purpose = `${isMonthlyType ? 'Monthly' : 'Daily'} ${isMonthlyType ? 'registration fee' : 'check-in (Walk-in)'}`;
  const columnsData = [
    'id_T_random',
    {
      type: 'object',
      data: [image, customerId],
    },
    purpose,
    main.formatPrice(amountToPay),
    main.fixText(priceRate),
    'custom_datetime_today',
  ];
  main.createAtSectionOne(SECTION_NAME, columnsData, 1, (createResult) => {
    const transactionProcessBtn = createResult.querySelector('#transactionProcessBtn');
    transactionProcessBtn.addEventListener('click', () => {
      completeCheckinPayment(
        createResult.dataset.id,
        createResult.dataset.image,
        createResult.dataset.text,
        createResult.dataset.custom2,
        fullName,
        amountToPay,
        priceRate
      );
    });
    const transactionCancelBtn = createResult.querySelector('#transactionCancelBtn');
    transactionCancelBtn.addEventListener('click', () => {
      main.openConfirmationModal(
        'Cancel pending transaction. Cannot be undone.<br><br>• ID: ' + createResult.dataset.id,
        () => {
          cancelCheckinPayment(createResult.dataset.id);
          main.closeConfirmationModal();
        }
      );
    });
    continueProcessCheckinPayment(createResult.dataset.id, fullName);
    callback(createResult.dataset.id);
  });
}

export function continueProcessCheckinPayment(transactionId, fullName) {
  main.showSection(SECTION_NAME);
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_id', 1, (findResult) => {
    if (findResult) {
      completeCheckinPayment(
        findResult.dataset.id,
        findResult.dataset.image,
        findResult.dataset.text,
        findResult.dataset.custom2,
        fullName,
        main.deformatPrice(findResult.dataset.custom3),
        findResult.dataset.custom4
      );
    }
  });
}

export function pendingTransaction(transactionId, callback) {
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_id', 1, (findResult) => callback(findResult));
}

function activeRadioListener(title, input, container, inputGroup) {
  const amountToPay = main.decodePrice(inputGroup.short[1].value);
  const cashInput = container.querySelector(`#input-short-7`);
  const cashlessInput = container.querySelector(`#input-short-8`);
  switch (title.toLowerCase()) {
    case 'cash':
      if (input.value.trim() == '') input.value = 'N/A';
      cashInput.parentElement.classList.remove('hidden');
      cashlessInput.parentElement.classList.add('hidden');
      break;
    case 'cashless':
      if (input.value == 'N/A') input.value = '';
      input.focus();
      cashInput.parentElement.classList.add('hidden');
      cashlessInput.parentElement.classList.remove('hidden');
      break;
    case 'hybrid':
      if (input.value == 'N/A') input.value = '';
      input.focus();
      cashInput.parentElement.classList.remove('hidden');
      cashlessInput.parentElement.classList.remove('hidden');
      break;
  }
  inputGroup.short[2].hidden = cashInput.parentElement.classList.contains('hidden');
  inputGroup.short[3].hidden = cashlessInput.parentElement.classList.contains('hidden');
  if (inputGroup.short[2].hidden) {
    cashInput.previousElementSibling.innerHTML =
      inputGroup.short[2].placeholder + (inputGroup.short[2].required ? ' *' : '');
    cashInput.value = main.encodePrice(0);
    inputGroup.short[2].value = 0;
  } else {
    if (title.toLowerCase() == 'hybrid') {
      cashInput.previousElementSibling.innerHTML =
        inputGroup.short[2].placeholder + ' (cash)' + (inputGroup.short[2].required ? ' *' : '');
      cashInput.value = main.encodePrice(0);
      inputGroup.short[2].value = 0;
    } else {
      cashInput.previousElementSibling.innerHTML =
        inputGroup.short[2].placeholder + (inputGroup.short[2].required ? ' *' : '');
      cashInput.value = main.encodePrice(amountToPay);
      inputGroup.short[2].value = amountToPay;
    }
  }
  if (inputGroup.short[3].hidden) {
    cashlessInput.previousElementSibling.innerHTML =
      inputGroup.short[3].placeholder + (inputGroup.short[3].required ? ' *' : '');
    cashlessInput.value = main.encodePrice(0);
    inputGroup.short[3].value = 0;
  } else {
    if (title.toLowerCase() == 'hybrid') {
      cashlessInput.previousElementSibling.innerHTML =
        inputGroup.short[3].placeholder + ' (cashless)' + (inputGroup.short[3].required ? ' *' : '');
    } else {
      cashlessInput.previousElementSibling.innerHTML =
        inputGroup.short[3].placeholder + (inputGroup.short[3].required ? ' *' : '');
    }
    cashlessInput.value = main.encodePrice(amountToPay);
    inputGroup.short[3].value = amountToPay;
  }
  cashInput.dispatchEvent(new Event('input'));
  cashlessInput.dispatchEvent(new Event('input'));
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
      { placeholder: 'Payment amount', value: amountToPay, required: true, autoformat: 'price' },
      { placeholder: 'Payment amount', value: 0, required: true, autoformat: 'price', hidden: true },
      { placeholder: 'Change amount', value: main.encodePrice(0), locked: true, live: '1|+2|-3:arithmetic' },
      { placeholder: 'Price rate', value: main.fixText(priceRate), locked: true },
      { placeholder: 'Reference number', value: 'N/A', required: true },
    ],
    radio: [
      { label: 'Payment method', selected: 1, autoformat: { type: 'short', index: 11 } },
      {
        icon: `${getEmoji('💵', 26)}`,
        title: 'Cash',
        subtitle: 'Traditional payment method',
        listener: activeRadioListener,
      },
      {
        icon: `${getEmoji('💳', 26)}`,
        title: 'Cashless',
        subtitle: 'Digital payment method',
        listener: activeRadioListener,
      },
      {
        icon: `${getEmoji('💵', 20)} + ${getEmoji('💳', 20)}`,
        title: 'Hybrid',
        subtitle: 'Both physical and digital payment method',
        listener: activeRadioListener,
      },
    ],
    footer: {
      main: `Complete payment transaction ${getEmoji('🔏')}`,
    },
  };

  main.openModal('yellow', inputs, (result) => {
    const paymentMethod = main.getSelectedRadio(result.radio).toLowerCase();
    if (!main.isValidPaymentAmount(+result.short[2].value) && paymentMethod == 'cash') {
      main.toast(`Invalid payment amount (cash): ${result.short[2].value}`, 'error');
      return;
    }
    if (
      !main.isValidPaymentAmount(+result.short[3].value) &&
      (paymentMethod.includes('cashless') || paymentMethod.includes('hybrid'))
    ) {
      main.toast(`Invalid payment amount (cashless): ${result.short[3].value}`, 'error');
      return;
    }
    let amountPaid = Number(result.short[2].value) + Number(result.short[3].value);
    if (!main.isValidPaymentAmount(+amountPaid) || +amountPaid < +amountToPay) {
      main.toast(`Invalid payment amount (total): ${amountPaid}`, 'error');
      return;
    }
    const change = result.short[4].value;

    const refNum = result.short[6].value;
    if (result.radio[0].selected > 1) {
      if ((refNum != 'N/A' && /[^0-9]/.test(refNum)) || refNum == 'N/A') {
        main.toast(`Invalid reference number: ${refNum}`, 'error');
        return;
      }
    } else if (refNum != 'N/A') {
      main.toast(`Cash payment method doesn't need reference number: ${refNum}`, 'error');
      return;
    }

    const columnsData = [
      'id_' + id,
      {
        type: 'object',
        data: [image, customerId],
      },
      purpose,
      main.formatPrice(amountToPay),
      main.formatPrice(result.short[2].value),
      main.formatPrice(result.short[3].value),
      main.formatPrice(main.decodePrice(change)),
      main.fixText(priceRate),
      main.fixText(paymentMethod),
      'custom_datetime_today',
    ];

    main.createAtSectionOne(SECTION_NAME, columnsData, 3, (createResult) => {
      createResult.dataset.refnum = refNum;

      main.toast(`Transaction successfully completed!`, 'success');
      main.createNotifDot(SECTION_NAME, 'main');
      main.createNotifDot(SECTION_NAME, 3);
      main.deleteAtSectionOne(SECTION_NAME, 1, id);

      const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
      transactionDetailsBtn.addEventListener('click', () =>
        customers.customerDetailsBtnFunction(customerId, 'Transaction Details', '🔏')
      );

      main.closeModal(() => {
        customers.completeCheckinPayment(id, amountPaid, priceRate);
      });
    });
  });
}

export function cancelCheckinPayment(transactionId) {
  customers.cancelPendingTransaction(transactionId);
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

      main.createAtSectionOne(SECTION_NAME, columnsData, 2, (createResult) => {
        const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
        transactionDetailsBtn.addEventListener('click', () =>
          customers.customerDetailsBtnFunction(createResult.dataset.text, 'Transaction Details', '🔏')
        );

        main.deleteAtSectionOne(SECTION_NAME, 1, transactionId);
        main.toast(`${transactionId}, successfully cancelled pending transaction!`, 'error');
        main.createNotifDot(SECTION_NAME, 2);
      });
    }
  });
}

export default { processCheckinPayment, continueProcessCheckinPayment, pendingTransaction, cancelCheckinPayment };
