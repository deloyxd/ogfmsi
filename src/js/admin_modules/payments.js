import main from '../admin_main.js';
import customers from './inquiry_customers.js';
import reservations from './inquiry_reservations.js';
import cart from './ecommerce_cart.js';
import { refreshDashboardStats } from './dashboard.js';
import { API_BASE_URL } from '../_global.js';

const SECTION_NAME = 'payments';
const MODULE_NAME = 'Payments';

let activated = false,
  mainBtn,
  subBtn;

// Cache of completed payments used for stats computation
let completedPaymentsCache = [];

document.addEventListener('ogfmsiAdminMainLoaded', async function () {
  if (main.sharedState.sectionName != SECTION_NAME) return;

  if (!activated) {
    activated = true;

    mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
    mainBtn.addEventListener('click', mainBtnFunction);
    subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
    subBtn.classList.remove('hidden');
    subBtn.addEventListener('click', subBtnFunction);

    await fetchAllPendingPayments();
    await fetchAllCompletePayments();

    async function fetchAllPendingPayments() {
      try {
        const response = await fetch(`${API_BASE_URL}/payment/pending`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pendingPayments = await response.json();

        pendingPayments.result.forEach((pendingPayment) => {
          main.findAtSectionOne(
            'inquiry-customers',
            pendingPayment.payment_customer_id,
            'equal_id',
            1,
            (findResult) => {
              if (findResult) {
                main.createAtSectionOne(
                  SECTION_NAME,
                  [
                    'id_' + pendingPayment.payment_id,
                    {
                      type: 'object',
                      data: [findResult.dataset.image, findResult.dataset.id],
                    },
                    pendingPayment.payment_purpose,
                    main.formatPrice(pendingPayment.payment_amount_to_pay),
                    main.fixText(pendingPayment.payment_rate),
                    'custom_datetime_' +
                      main.encodeDate(
                        pendingPayment.created_at,
                        main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                      ),
                  ],
                  1,
                  (createResult) => {
                    const { firstName, lastName, fullName } = main.decodeName(findResult.dataset.text);
                    const transactionProcessBtn = createResult.querySelector('#transactionProcessBtn');
                    transactionProcessBtn.addEventListener('click', () => {
                      completePayment(
                        'customers',
                        createResult.dataset.id,
                        createResult.dataset.image,
                        createResult.dataset.text,
                        createResult.dataset.custom2,
                        fullName,
                        pendingPayment.payment_amount_to_pay,
                        pendingPayment.payment_rate
                      );
                    });
                    const transactionCancelBtn = createResult.querySelector('#transactionCancelBtn');
                    transactionCancelBtn.addEventListener('click', () => {
                      main.openConfirmationModal(
                        'Cancel pending transaction. Cannot be undone.<br><br>ID: ' + createResult.dataset.id,
                        () => {
                          cancelCheckinPayment(createResult.dataset.id);
                          main.closeConfirmationModal();
                        }
                      );
                    });
                  }
                );
              }
            }
          );
        });
      } catch (error) {
        console.error('Error fetching pending payments:', error);
      }
    }

    async function fetchAllCompletePayments() {
      try {
        const response = await fetch(`${API_BASE_URL}/payment/complete`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const completePayments = await response.json();

        // update cache and stats
        completedPaymentsCache = Array.isArray(completePayments.result) ? completePayments.result : [];
        computeAndUpdatePaymentStats(completedPaymentsCache);

        completePayments.result.forEach((completePayment) => {
          main.findAtSectionOne(
            'inquiry-customers',
            completePayment.payment_customer_id,
            'equal_id',
            1,
            (findResult) => {
              const customerImage = findResult ? findResult.dataset.image : '';
              const customerIdSafe = findResult ? findResult.dataset.id : completePayment.payment_customer_id;
              main.createAtSectionOne(
                SECTION_NAME,
                [
                  'id_' + completePayment.payment_id,
                  {
                    type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                    data: [
                      customerImage,
                      customerIdSafe,
                      completePayment.payment_purpose,
                      main.formatPrice(completePayment.payment_amount_to_pay),
                      main.formatPrice(completePayment.payment_amount_paid_cash),
                      main.formatPrice(completePayment.payment_amount_paid_cashless),
                      main.formatPrice(completePayment.payment_amount_change),
                      main.fixText(completePayment.payment_rate),
                      main.fixText(completePayment.payment_method),
                      `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
                    ],
                  },
                  `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
                ],
                3,
                (createResult) => {
                  const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                  transactionDetailsBtn.addEventListener('click', () => openTransactionDetails(createResult));
                }
              );
            }
          );
        });
      } catch (error) {
        console.error('Error fetching pending payments:', error);
      }
    }
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
  main.createAtSectionOne(SECTION_NAME, columnsData, 1, async (createResult) => {
    const transactionProcessBtn = createResult.querySelector('#transactionProcessBtn');
    transactionProcessBtn.addEventListener('click', () => {
      completePayment(
        'customers',
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
        'Cancel pending transaction. Cannot be undone.<br><br>ID: ' + createResult.dataset.id,
        () => {
          cancelCheckinPayment(createResult.dataset.id);
          main.closeConfirmationModal();
        }
      );
    });
    continueProcessCheckinPayment(createResult.dataset.id, fullName);
    callback(createResult.dataset.id);

    try {
      const response = await fetch(`${API_BASE_URL}/payment/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: createResult.dataset.id,
          payment_customer_id: createResult.dataset.text,
          payment_purpose: purpose,
          payment_amount_to_pay: amountToPay,
          payment_rate: priceRate,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error('Error creating pending payment:', error);
    }
  });
}

export function continueProcessCheckinPayment(transactionId, fullName) {
  main.showSection(SECTION_NAME);
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_id', 1, (findResult) => {
    if (findResult) {
      completePayment(
        'customers',
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

export function continueProcessCheckoutPayment(transactionId, fullName) {
  main.showSection(SECTION_NAME);
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_id', 1, (findResult) => {
    if (findResult) {
      completePayment(
        'cart',
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

// Attach select-all behavior for quick overwrite on focus/click
function attachSelectAll(el) {
  if (!el || el.__selectAllBound) return;
  const handler = () => requestAnimationFrame(() => el.select());
  el.addEventListener('focus', handler);
  el.addEventListener('click', handler);
  el.__selectAllBound = true;
}

function activeRadioListener(title, input, container, inputGroup) {
  const amountToPay = main.decodePrice(inputGroup.short[1].value);
  const cashInput = container.querySelector(`#input-short-7`);
  const cashlessInput = container.querySelector(`#input-short-8`);
  const refInput = container.querySelector(`#input-short-11`);
  switch (title.toLowerCase()) {
    case 'cash':
      if (input.value.trim() == '') input.value = 'N/A';
      cashInput.parentElement.classList.remove('hidden');
      cashlessInput.parentElement.classList.add('hidden');
      // Hide reference number for cash
      if (refInput) {
        refInput.parentElement.classList.add('hidden');
        refInput.value = 'N/A';
      }
      break;
    case 'cashless':
      if (input.value == 'N/A') input.value = '';
      input.focus();
      cashInput.parentElement.classList.add('hidden');
      cashlessInput.parentElement.classList.remove('hidden');
      // Show reference number for cashless
      if (refInput) {
        refInput.parentElement.classList.remove('hidden');
        if (refInput.value == 'N/A') refInput.value = '';
      }
      break;
    case 'hybrid':
      if (input.value == 'N/A') input.value = '';
      input.focus();
      cashInput.parentElement.classList.remove('hidden');
      cashlessInput.parentElement.classList.remove('hidden');
      // Show reference number for hybrid
      if (refInput) {
        refInput.parentElement.classList.remove('hidden');
        if (refInput.value == 'N/A') refInput.value = '';
      }
      break;
  }
  inputGroup.short[2].hidden = cashInput.parentElement.classList.contains('hidden');
  inputGroup.short[3].hidden = cashlessInput.parentElement.classList.contains('hidden');
  if (refInput) {
    inputGroup.short[6].hidden = refInput.parentElement.classList.contains('hidden');
  }
  if (inputGroup.short[2].hidden) {
    cashInput.previousElementSibling.innerHTML =
      inputGroup.short[2].placeholder + (inputGroup.short[2].required ? ' *' : '');
    cashInput.value = main.encodePrice(0);
  } else {
    if (title.toLowerCase() == 'hybrid') {
      cashInput.previousElementSibling.innerHTML =
        inputGroup.short[2].placeholder + ' (cash)' + (inputGroup.short[2].required ? ' *' : '');
      cashInput.value = main.encodePrice(0);
    } else {
      cashInput.previousElementSibling.innerHTML =
        inputGroup.short[2].placeholder + (inputGroup.short[2].required ? ' *' : '');
      cashInput.value = main.encodePrice(0);
    }
  }
  if (inputGroup.short[3].hidden) {
    cashlessInput.previousElementSibling.innerHTML =
      inputGroup.short[3].placeholder + (inputGroup.short[3].required ? ' *' : '');
    cashlessInput.value = main.encodePrice(0);
  } else {
    if (title.toLowerCase() == 'hybrid') {
      cashlessInput.previousElementSibling.innerHTML =
        inputGroup.short[3].placeholder + ' (cashless)' + (inputGroup.short[3].required ? ' *' : '');
    } else {
      cashlessInput.previousElementSibling.innerHTML =
        inputGroup.short[3].placeholder + (inputGroup.short[3].required ? ' *' : '');
    }
    cashlessInput.value = main.encodePrice(0);
  }
  cashInput.dispatchEvent(new Event('input'));
  cashlessInput.dispatchEvent(new Event('input'));

  // Ensure quick editing UX: auto-select contents on focus/click
  attachSelectAll(cashInput);
  attachSelectAll(cashlessInput);
}

function completePayment(type, id, image, customerId, purpose, fullName, amountToPay, priceRate) {
  const inputs = {
    header: {
      title: `Transaction ID: ${id} ${getEmoji('🔏', 26)}`,
      subtitle: `Purpose: ${purpose}`,
    },
    short: [
      { placeholder: type === 'cart' ? 'Service details' : 'Customer details', value: type === 'cart' ? `${fullName}` : `${fullName} (${customerId})`, locked: true },
      { placeholder: 'Amount to pay', value: main.encodePrice(amountToPay), locked: true },
      { placeholder: 'Payment amount', value: 0, required: true, autoformat: 'price' },
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
    const cashVal = Number(result.short[2].value) || 0;
    const cashlessVal = Number(result.short[3].value) || 0;

    // Show specific message when no amount entered at all
    if (cashVal === 0 && cashlessVal === 0) {
      main.toast('No amount tendered', 'error');
      return;
    }
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

    const dateTimeText = `${main.getDateOrTimeOrBoth().date} - ${main.getDateOrTimeOrBoth().time}`;
    const columnsData = [
      'id_' + id,
      {
        type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
        data: [
          image,
          customerId,
          purpose,
          main.formatPrice(amountToPay),
          main.formatPrice(result.short[2].value),
          main.formatPrice(result.short[3].value),
          main.formatPrice(main.decodePrice(change)),
          main.fixText(priceRate),
          main.fixText(paymentMethod),
          dateTimeText,
        ],
      },
      dateTimeText,
    ];

    main.createAtSectionOne(SECTION_NAME, columnsData, 3, async (createResult) => {
      createResult.dataset.refnum = refNum;

      main.toast(`Transaction successfully completed!`, 'success');
      main.createNotifDot(SECTION_NAME, 'main');
      main.createNotifDot(SECTION_NAME, 3);
      main.deleteAtSectionOne(SECTION_NAME, 1, id);

      const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
      transactionDetailsBtn.addEventListener('click', () => openTransactionDetails(createResult));

      main.closeModal(() => {
        switch (type) {
          case 'customers':
            customers.completeCheckinPayment(id, amountPaid, priceRate);
            break;
          case 'reservations':
            reservations.completeReservationPayment(id);
            break;
          case 'cart':
            cart.completeProcessCheckout(
              amountToPay,
              main.fixText(paymentMethod),
              result.short[2].value + result.short[3].value,
              main.decodePrice(change),
              refNum
            );
        }
      });

      try {
        const response = await fetch(`${API_BASE_URL}/payment/complete/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_amount_paid_cash: result.short[2].value,
            payment_amount_paid_cashless: result.short[3].value,
            payment_amount_change: main.decodePrice(change),
            payment_method: paymentMethod,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await response.json();

        // Reflect the newly completed transaction in stats immediately
        try {
          const nowIso = new Date().toISOString();
          completedPaymentsCache.push({
            payment_amount_paid_cash: Number(result.short[2].value) || 0,
            payment_amount_paid_cashless: Number(result.short[3].value) || 0,
            payment_method: paymentMethod,
            created_at: nowIso,
          });
          computeAndUpdatePaymentStats(completedPaymentsCache);
          // Refresh dashboard stats when new payment is completed
          refreshDashboardStats();
        } catch (_) {}
      } catch (error) {
        console.error('Error creating complete payment:', error);
      }
    });
  });

  setTimeout(() => {
    const cashInput = document.querySelector('#input-short-6');
    const cashlessInput = document.querySelector('#input-short-7');
    attachSelectAll(cashInput);
    attachSelectAll(cashlessInput);
  }, 0);
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

export function processReservationPayment(reservation, callback = () => {}) {
  const { firstName, lastName, fullName } = main.decodeName(reservation.name);
  const purpose = `Reservation fee`;
  const columnsData = [
    'id_T_random',
    {
      type: 'object',
      data: [reservation.image, reservation.cid],
    },
    purpose,
    main.formatPrice(reservation.amount),
    'Regular',
    'custom_datetime_today',
  ];
  main.createAtSectionOne(SECTION_NAME, columnsData, 1, async (createResult) => {
    const transactionProcessBtn = createResult.querySelector('#transactionProcessBtn');
    transactionProcessBtn.addEventListener('click', () => {
      completePayment(
        'reservations',
        createResult.dataset.id,
        createResult.dataset.image,
        createResult.dataset.text,
        purpose,
        fullName,
        reservation.amount,
        'Regular'
      );
    });
    const transactionCancelBtn = createResult.querySelector('#transactionCancelBtn');
    transactionCancelBtn.addEventListener('click', () => {
      main.openConfirmationModal(
        'Cancel pending transaction. Cannot be undone.<br><br>ID: ' + createResult.dataset.id,
        () => {
          cancelReservationPayment(createResult.dataset.id);
          main.closeConfirmationModal();
        }
      );
    });
    continueProcessReservationPayment(createResult.dataset.id, fullName);
    callback(createResult.dataset.id);

    try {
      const response = await fetch(`${API_BASE_URL}/payment/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: createResult.dataset.id,
          payment_customer_id: createResult.dataset.text,
          payment_purpose: purpose,
          payment_amount_to_pay: reservation.amount,
          payment_rate: 'Regular',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error('Error creating pending payment:', error);
    }
  });
}

export function continueProcessReservationPayment(transactionId, fullName) {
  main.showSection(SECTION_NAME);
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_id', 1, (findResult) => {
    if (findResult) {
      completePayment(
        'reservations',
        findResult.dataset.id,
        findResult.dataset.image,
        findResult.dataset.text,
        findResult.dataset.custom2,
        fullName,
        main.decodePrice(findResult.dataset.custom3),
        'Regular'
      );
    }
  });
}

export function cancelReservationPayment(transactionId) {
  reservations.cancelPendingTransaction(transactionId);
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

export function findPendingTransaction(customerId, callback = () => {}) {
  main.findAtSectionOne(SECTION_NAME, customerId, 1, 'equal_text', (findResult) => {
    if (findResult) {
      callback(findResult.dataset.id);
    }
  });
}

// ===== Stats computation & display =====
function computeAndUpdatePaymentStats(payments) {
  if (!Array.isArray(payments)) return;

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const today = new Date();
  const todayKey = [today.getFullYear(), today.getMonth(), today.getDate()].join('-');

  let todaysCash = 0;
  let todaysCashless = 0;

  const dayTotals = new Map(); // key: YYYY-M-D -> sum
  const weekTotals = new Map(); // key: YYYY-W -> sum (ISO week)
  const monthTotals = new Map(); // key: YYYY-M -> sum

  for (const p of payments) {
    if (!p) continue;
    const created = new Date(p.created_at || p.createdAt || Date.now());
    const keyDay = [created.getFullYear(), created.getMonth(), created.getDate()].join('-');
    const keyMonth = [created.getFullYear(), created.getMonth()].join('-');
    const isoWeek = getIsoWeek(created);
    const keyWeek = [created.getFullYear(), isoWeek].join('-');

    const paidCash = toNumber(p.payment_amount_paid_cash);
    const paidCashless = toNumber(p.payment_amount_paid_cashless);
    const totalPaid = paidCash + paidCashless;

    if (keyDay === todayKey) {
      // Include both pure cash and the cash component of hybrid
      todaysCash += paidCash;
      // Include both pure cashless and the cashless component of hybrid
      todaysCashless += paidCashless;
    }

    dayTotals.set(keyDay, (dayTotals.get(keyDay) || 0) + totalPaid);
    weekTotals.set(keyWeek, (weekTotals.get(keyWeek) || 0) + totalPaid);
    monthTotals.set(keyMonth, (monthTotals.get(keyMonth) || 0) + totalPaid);
  }

  const avg = (mapObj) => {
    const values = Array.from(mapObj.values());
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  };

  const stats = {
    todays_cash: todaysCash,
    todays_cashless: todaysCashless,
    avg_daily: avg(dayTotals),
    avg_weekly: avg(weekTotals),
    avg_monthly: avg(monthTotals),
  };

  updatePaymentStatsDisplay(stats);
}

function updatePaymentStatsDisplay(stats) {
  try {
    const statElements = document.querySelectorAll(`#${SECTION_NAME}SectionStats`);
    if (!statElements || statElements.length < 1) return;

    statElements.forEach((card) => {
      const header = card.querySelector('.section-stats-h');
      const valueEl = card.querySelector('.section-stats-c');
      if (!header || !valueEl) return;
      const label = (header.textContent || '').toLowerCase();
      if (label.includes('cashless') && label.includes('today')) {
        valueEl.textContent = main.encodePrice(stats.todays_cashless || 0);
      } else if (label.includes('cash sales') || (label.includes('cash') && label.includes('today'))) {
        valueEl.textContent = main.encodePrice(stats.todays_cash || 0);
      } else if (label.includes('daily')) {
        valueEl.textContent = main.encodePrice(stats.avg_daily || 0);
      } else if (label.includes('weekly')) {
        valueEl.textContent = main.encodePrice(stats.avg_weekly || 0);
      } else if (label.includes('monthly')) {
        valueEl.textContent = main.encodePrice(stats.avg_monthly || 0);
      }
    });
  } catch (_) {}
}

function getIsoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function openTransactionDetails(row) {
  const transactionId = row.dataset.id;
  const customerId = row.dataset.text;
  const purpose = row.dataset.purpose || row.dataset.custom2 || 'N/A';
  const amountToPay = main.encodePrice(main.deformatPrice(row.dataset.amounttopay || 0));
  const paidCash = main.encodePrice(main.deformatPrice(row.dataset.amountpaidcash || 0));
  const paidCashless = main.encodePrice(main.deformatPrice(row.dataset.amountpaidcashless || 0));
  const changeAmount = main.encodePrice(main.deformatPrice(row.dataset.changeamount || 0));
  const priceRate = row.dataset.pricerate || 'N/A';
  const paymentMethod = row.dataset.paymentmethod || 'N/A';
  const dateTime = row.dataset.datetime || row.dataset.datetime_text || 'N/A';

  const inputs = {
    header: {
      title: `Transaction Details ${getEmoji('🔏', 26)}`,
      subtitle: `Transaction ID: ${transactionId}`,
    },
    short: [
      { placeholder: 'Customer', value: customerId, locked: true },
      { placeholder: 'Purpose', value: purpose, locked: true },
      { placeholder: 'Amount to Pay', value: amountToPay, locked: true },
      { placeholder: 'Amount Paid: Cash', value: paidCash, locked: true },
      { placeholder: 'Amount Paid: Cashless', value: paidCashless, locked: true },
      { placeholder: 'Change Amount', value: changeAmount, locked: true },
      { placeholder: 'Price Rate', value: main.fixText(priceRate), locked: true },
      { placeholder: 'Payment Method', value: main.fixText(paymentMethod), locked: true },
    ],
    footer: {
      main: 'Close',
    },
  };

  main.openModal('gray', inputs, () => main.closeModal());
}

export function processCheckoutPayment(purpose, amountToPay) {
  const priceRate = 'Regular';
  const columnsData = [
    'id_T_random',
    {
      type: 'object',
      data: ['', 'Service: Cart Checkout'],
    },
    purpose,
    main.formatPrice(amountToPay),
    priceRate,
    'custom_datetime_today',
  ];
  main.createAtSectionOne(SECTION_NAME, columnsData, 1, async (createResult) => {
    const transactionProcessBtn = createResult.querySelector('#transactionProcessBtn');
    transactionProcessBtn.addEventListener('click', () => {
      completePayment(
        'cart',
        createResult.dataset.id,
        createResult.dataset.image,
        createResult.dataset.text,
        createResult.dataset.custom2,
        createResult.dataset.text,
        amountToPay,
        priceRate
      );
    });
    const transactionCancelBtn = createResult.querySelector('#transactionCancelBtn');
    transactionCancelBtn.addEventListener('click', () => {
      main.openConfirmationModal(
        'Cancel pending transaction. Cannot be undone.<br><br>ID: ' + createResult.dataset.id,
        () => {
          cancelCheckinPayment(createResult.dataset.id);
          main.closeConfirmationModal();
        }
      );
    });
    continueProcessCheckoutPayment(createResult.dataset.id, createResult.dataset.text);

    try {
      const response = await fetch(`${API_BASE_URL}/payment/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: createResult.dataset.id,
          payment_customer_id: createResult.dataset.text,
          payment_purpose: purpose,
          payment_amount_to_pay: amountToPay,
          payment_rate: priceRate,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error('Error creating pending payment:', error);
    }
  });
}

export default {
  processCheckinPayment,
  continueProcessCheckinPayment,
  cancelCheckinPayment,
  processReservationPayment,
  continueProcessReservationPayment,
  cancelReservationPayment,
  pendingTransaction,
  findPendingTransaction,
  processCheckoutPayment,
  continueProcessCheckoutPayment,
};
