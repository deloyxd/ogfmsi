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

// function sectionTwoMainBtnFunction() {
//   const searchInput = document.getElementById(`${SECTION_NAME}SectionTwoSearch`);
//   main.findAtSectionTwo(SECTION_NAME, searchInput.value.trim(), 'equal_id', (result) => {
//     const transaction = result;

//     if (!transaction) {
//       main.toast("There's no pending transaction with that ID!", 'error');
//       return;
//     }

//     const inputs = {
//       header: {
//         subtitle: 'Pending payment processing form',
//       },
//       short: [
//         { placeholder: 'Amount paid', value: '', required: true },
//         { placeholder: 'Reference number', value: 'N/A', required: true },
//       ],
//       spinner: [
//         {
//           label: 'Rate',
//           placeholder: 'Select payment rate',
//           selected: 1,
//           options: [
//             { value: 'regular', label: 'Regular' },
//             { value: 'student', label: 'Student Discount' },
//           ],
//         },
//       ],
//       radio: [
//         { label: 'Payment', selected: 1 },
//         {
//           icon: `${getEmoji('💵')}`,
//           title: 'Cash',
//           subtitle: 'Traditional payment method',
//         },
//         {
//           icon: `${getEmoji('💳')}`,
//           title: 'Cashless',
//           subtitle: 'Digital payment method',
//         },
//       ],
//       payment: {
//         actor: {
//           id: transaction.dataset.actorid,
//           data: transaction.children[1].lastElementChild.innerHTML.split('<br>').map((item) => item.trim()),
//         },
//         user: {
//           id: transaction.dataset.userid,
//           data: transaction.children[3].lastElementChild.innerHTML.split('<br>').map((item) => item.trim()),
//         },
//         purpose: transaction.children[2].textContent.trim(),
//       },
//       footer: {
//         main: `Complete payment transaction ${getEmoji('🔏')}`,
//       },
//     };
//     const { fullName } = main.decodeName(inputs.payment.user.data[1]);
//     inputs.header.title = `${fullName} ${getEmoji('🔏', 26)}`;

//     const isReservation = transaction.dataset.type.includes('reservation');
//     if (isReservation) {
//       inputs.short[0].value = inputs.payment.user.data[3];
//       inputs.short[0].locked = true;
//       inputs.spinner[0].locked = true;
//     }

//     main.openModal('green', inputs, (result) => {
//       if (!main.isValidPaymentAmount(+result.short[0].value)) {
//         main.toast(`Invalid amount: ${result.short[0].value}`, 'error');
//         return;
//       }
//       if (
//         result.radio[0].selected == 2 &&
//         ((result.short[1].value != 'N/A' && /[^0-9]/.test(result.short[1].value)) ||
//           result.short[1].value == 'N/A' ||
//           result.short[1].value == '')
//       ) {
//         main.toast(`Invalid reference: ${result.short[1].value}`, 'error');
//         return;
//       }
//       if (result.radio[0].selected == 1) {
//         result.short[1].value = 'N/A';
//       }
//       main.openConfirmationModal(`Complete transaction: ${fullName} (${transaction.dataset.id})`, () => {
//         completeTransaction(transaction.dataset.id, result, isReservation);
//         searchInput.value = '';
//         searchInput.dispatchEvent(new Event('input'));
//       });
//     });
//   });
// }

// function completeTransaction(id, result, isReservation) {
//   const columnsData = [
//     'id_' + id,
//     {
//       type: 'object_refnum',
//       data: [result.payment.user.data[0], result.payment.user.id, result.short[1].value],
//     },
//     'custom_datetime_today',
//   ];
//   console.log(columnsData);
//   main.createAtSectionOne(SECTION_NAME, columnsData, 1, '', (_, status1) => {
//     if (status1 == 'success') {
//       main.createAtSectionOne(SECTION_NAME, columnsData, 2, '', (editedResult, status2) => {
//         if (status2 == 'success') {
//           const action = {
//             module: MODULE_NAME,
//             description: 'Transaction complete',
//           };
//           const data = {
//             id: id,
//             user_id: result.payment.user.id,
//             payment_type: result.radio[result.radio[0].selected].title.toLowerCase(),
//             payment_amount: result.short[0].value,
//             payment_refnum: result.short[1].value,
//             payment_rate: result.spinner[0].options[result.spinner[0].selected - 1].value,
//             purpose: result.payment.purpose
//               .replace(/^T\d+\s+/gm, '')
//               .replace(/\s+/g, ' ')
//               .trim(),
//             datetime: editedResult.dataset.datetime,
//             type: 'transaction',
//           };
//           accesscontrol.log(action, data);

//           main.deleteAtSectionTwo(SECTION_NAME, id);

//           // updating "Pending" value
//           let items;
//           if (isReservation) {
//             items = document.getElementById('inquiry-reservationSectionOneListEmpty2').parentElement.parentElement
//               .children;
//             for (let i = 1; i < items.length; i++) {
//               if (items[i].dataset.tid == id) {
//                 items[i].dataset.amount = data.payment_amount;
//                 items[i].dataset.datetime = editedResult.dataset.datetime;
//                 items[i].children[4].innerHTML = editedResult.dataset.datetime;
//                 break;
//               }
//             }
//           } else {
//             items = document.getElementById('inquiry-regularSectionOneListEmpty2').parentElement.parentElement.children;
//             for (let i = 1; i < items.length; i++) {
//               if (items[i].dataset.tid == id) {
//                 items[i].dataset.amount = data.payment_amount;
//                 items[i].dataset.time = editedResult.dataset.datetime.split(' - ')[1];
//                 items[i].dataset.datetime = editedResult.dataset.datetime;
//                 items[i].children[2].innerHTML = editedResult.dataset.datetime;
//                 break;
//               }
//             }
//           }

//           main.createRedDot(SECTION_NAME, 1);
//           main.createRedDot(SECTION_NAME, 2);
//           if (isReservation) {
//             main.createRedDot('inquiry-reservation', 'sub');
//             main.createRedDot('inquiry-reservation', 2);
//           } else {
//             main.createRedDot('inquiry-regular', 'sub');
//             main.createRedDot('inquiry-regular', 2);
//           }

//           main.toast('Transaction successfully completed!', 'success');
//           main.closeConfirmationModal();
//           main.closeModal();
//         }
//       });
//     }
//   });
// }

export function processCheckinPayment(customerId, image, fullName, isMonthlyPass, amountToPay, priceRate, callback) {
  main.showSection(SECTION_NAME);
  const purpose = `${isMonthlyPass ? 'Monthly ' : 'Daily '} pass check-in${isMonthlyPass ? '' : ' (Regular walk-in)'}`;
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
      completeCheckinPayment(result.dataset.id, purpose, fullName, amountToPay, priceRate);
    });
    const transactionVoidBtn = result.querySelector('#transactionVoidBtn');
    transactionVoidBtn.addEventListener('click', () => {
      main.openConfirmationModal('Void transaction: ' + result.dataset.id, () => {
        main.deleteAtSectionOne(SECTION_NAME, 1, result.dataset.id);
        main.toast('Transaction successfully voided!', 'error');
      });
    });
    completeCheckinPayment(result.dataset.id, purpose, fullName, amountToPay, priceRate);
  });
}

function completeCheckinPayment(id, purpose, fullName, amountToPay, priceRate) {
  const inputs = {
    header: {
      title: `${fullName} ${getEmoji('🔏', 26)}`,
      subtitle: 'Pending payment processing form',
    },
    short: [
      { placeholder: 'Amount to pay', value: main.encodePrice(amountToPay), locked: true },
      { placeholder: 'Payment amount', value: amountToPay, required: true },
      { placeholder: 'Change amount', value: main.encodePrice(0), locked: true, live: '1-2:subtract' },
      { placeholder: 'Reference number', value: 'N/A', required: true },
    ],
    spinner: [
      {
        label: 'Rate',
        placeholder: 'Select payment rate',
        selected: priceRate,
        locked: true,
        options: [
          { value: 'regular', label: 'Regular' },
          { value: 'student', label: 'Student' },
        ],
      },
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
    ],
    footer: {
      main: `Complete payment transaction ${getEmoji('🔏')}`,
    },
  };

  main.openModal('yellow', inputs, (result) => {
    let amountPaid = result.short[1].value;
    if (!main.isValidPaymentAmount(+amountPaid) || +amountPaid < +amountToPay) {
      main.toast(`Invalid payment amount: ${amountPaid}`, 'error');
      return;
    }
    const change = result.short[2].value;

    const refNum = result.short[3].value;
    if (
      result.radio[0].selected == 2 &&
      ((refNum != 'N/A' && /[^0-9]/.test(refNum)) || refNum == 'N/A' || refNum == '')
    ) {
      main.toast(`Invalid reference number: ${refNum}`, 'error');
      return;
    }

    const priceRate = main.getSelectedSpinner(result.spinner[0]);

    const columnsData = [
      'id_' + id,
      purpose,
      main.encodePrice(amountToPay),
      main.encodePrice(amountPaid),
      change,
      main.fixText(priceRate),
      main.fixText(main.getSelectedRadio(result.radio)),
      'custom_datetime_today',
    ];

    main.createAtSectionOne(SECTION_NAME, columnsData, 2, () => {
      main.toast(`Transaction successfully completed!`, 'success');
      main.createRedDot(SECTION_NAME, 2);
      main.deleteAtSectionOne(SECTION_NAME, 1, id);

      main.closeModal(() => {
        customers.completeCheckinPayment(id, amountPaid, priceRate);
      });
    });
  });
}

export default { processCheckinPayment };
