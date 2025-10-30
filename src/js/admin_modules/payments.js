import main from '../admin_main.js';
import customers from './inquiry_customers.js';
import reservations from './inquiry_reservations.js';
import cart from './ecommerce_cart.js';
import { refreshDashboardStats } from './dashboard.js';
import { API_BASE_URL } from '../_global.js';

import { db } from '../firebase.js';
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const SECTION_NAME = 'payments';
const MODULE_NAME = 'Payments';

let activated = false,
  mainBtn,
  subBtn;

// Cache of completed payments used for stats computation
let completedPaymentsCache = [];
// Track pending IDs to avoid duplicate rows when polling
const seenPendingPaymentIds = new Set();

// Helper function to resolve customer metadata (image, id, name) with backend fallback
async function resolveCustomerInfo(customerId) {
  // Try DOM lookup first
  return new Promise((resolve) => {
    main.findAtSectionOne('inquiry-customers', customerId, 'equal_id', 1, async (findResult) => {
      if (findResult) {
        const customerName = findResult.dataset.text ? main.decodeName(findResult.dataset.text).fullName : '';
        resolve({
          image: findResult.dataset.image || '',
          id: findResult.dataset.id || customerId,
          name: customerName,
        });
      } else {
        // Fallback to backend API
        try {
          const response = await fetch(`${API_BASE_URL}/inquiry/customers/${encodeURIComponent(customerId)}`);
          if (response.ok) {
            const data = await response.json();
            const customer = data.result || {};
            const fullName = `${customer.customer_first_name || ''} ${customer.customer_last_name || ''}`.trim();
            resolve({
              image: customer.customer_image_url || '',
              id: customer.customer_id || customerId,
              name: fullName,
            });
          } else {
            resolve({ image: '', id: customerId, name: '' });
          }
        } catch (error) {
          console.error('Error fetching customer from backend:', error);
          resolve({ image: '', id: customerId, name: '' });
        }
      }
    });
  });
}

document.addEventListener('ogfmsiAdminMainLoaded', async function () {
  if (main.sharedState.sectionName != SECTION_NAME) return;

  if (!activated) {
    activated = true;

    mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
    mainBtn.addEventListener('click', mainBtnFunction);
    subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
    // subBtn.classList.remove('hidden');
    subBtn.addEventListener('click', subBtnFunction);

    await fetchAllPendingPayments();
    await fetchAllServicePayments();
    await fetchAllSalesPayments();
    await fetchAllCanceledPayments();

    // Light polling so new portal-submitted pendings show up without reload
    setInterval(() => {
      // Only poll while Payments module is active to reduce load
      if (main.sharedState.sectionName === SECTION_NAME) {
        fetchAllPendingPayments();
      }
    }, 5000);

    async function fetchAllPendingPayments() {
      try {
        const response = await fetch(`${API_BASE_URL}/payment/pending`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pendingPayments = await response.json();

        pendingPayments.result.forEach((pendingPayment) => {
          if (!pendingPayment || !pendingPayment.payment_id) return;
          if (seenPendingPaymentIds.has(pendingPayment.payment_id)) return;
          seenPendingPaymentIds.add(pendingPayment.payment_id);
          // Normalize optional fields coming from customer portal
          const refFromPortal = pendingPayment.payment_ref || pendingPayment.payment_reference || '';
          const methodHint = (pendingPayment.payment_method_hint || '').toLowerCase();
          const fromCustomerPortal = String(pendingPayment.payment_source || '') === 'customer_portal';

          main.findAtSectionOne(
            'inquiry-customers',
            pendingPayment.payment_customer_id,
            'equal_id',
            1,
            async (findResult) => {
              let imageSrc = '';
              let customerIdText = pendingPayment.payment_customer_id;
              let fullName = '';
              if (findResult) {
                imageSrc = findResult.dataset.image || '';
                customerIdText = findResult.dataset.id || customerIdText;
                try {
                  fullName = main.decodeName(findResult.dataset.text).fullName;
                } catch (_) {}
              } else if (pendingPayment.payment_customer_id !== 'U123') {
                // fallback: fetch from backend in case DOM not yet populated
                try {
                  const resp = await fetch(`${API_BASE_URL}/inquiry/customers/${encodeURIComponent(customerIdText)}`);
                  if (resp.ok) {
                    const data = await resp.json();
                    const c = data.result || {};
                    imageSrc = c.customer_image_url || '';
                    fullName = `${c.customer_first_name || ''} ${c.customer_last_name || ''}`.trim();
                  }
                } catch (_) {}
              }

              main.createAtSectionOne(
                SECTION_NAME,
                [
                  'id_' + pendingPayment.payment_id,
                  {
                    type: 'object',
                    data: [imageSrc, customerIdText],
                  },
                  pendingPayment.payment_purpose,
                  main.formatPrice(pendingPayment.payment_amount_to_pay),
                  main.fixText(pendingPayment.payment_rate),
                  'custom_datetime_' +
                    main.encodeDate(
                      pendingPayment.created_at,
                      main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                    ) +
                    ' - ' +
                    main.encodeTime(pendingPayment.created_at),
                ],
                1,
                async (createResult) => {
                  const isOnlineTransaction = pendingPayment.payment_purpose.toLowerCase().includes('online');
                  const isOnlineFacility = pendingPayment.payment_purpose.toLowerCase().includes('facility');
                  let customer;
                  if (isOnlineTransaction && pendingPayment.payment_customer_id !== 'U123') {
                    try {
                      const resp = await fetch(
                        `${API_BASE_URL}/inquiry/customers/${pendingPayment.payment_customer_id}`
                      );
                      if (resp.ok) {
                        const data = await resp.json();
                        customer = data.result;
                      }
                    } catch (_) {}
                  }
                  if (fromCustomerPortal && refFromPortal) {
                    createResult.dataset.refnum = refFromPortal;
                  }
                  const transactionProcessBtn = createResult.querySelector('#transactionProcessBtn');
                  transactionProcessBtn.addEventListener('click', () => {
                    completePayment(
                      isOnlineFacility ? 'reservations' : 'customers',
                      createResult.dataset.id,
                      isOnlineTransaction
                        ? customer?.customer_image_url || '/src/images/client_logo.jpg'
                        : createResult.dataset.image,
                      isOnlineTransaction ? pendingPayment.payment_customer_id : createResult.dataset.text,
                      createResult.dataset.custom2,
                      isOnlineTransaction
                        ? customer
                          ? customer.customer_first_name + ' ' + customer.customer_last_name
                          : ''
                        : fullName,
                      Number(pendingPayment.payment_amount_to_pay) || 0,
                      pendingPayment.payment_rate,
                      { methodHint, refFromPortal, displayId: pendingPayment.payment_id }
                    );
                  });
                  const transactionCancelBtn = createResult.querySelector('#transactionCancelBtn');
                  transactionCancelBtn.addEventListener('click', () => {
                    main.openConfirmationModal(
                      isOnlineTransaction
                        ? `
                        Cancel pending transaction. Cannot be undone.<br><br>
                        ID: ${createResult.dataset.id}<br><br>
                        <label for="cancelReasonSelect"><b>Reason for cancellation:</b></label><br>
                        <select id="cancelReasonSelect" style="
                          width: 100%;
                          margin-top: 8px;
                          padding: 6px;
                          border-radius: 6px;
                          border: 1px solid #000000ff;
                          background-color: black;
                        ">
                          <option value="" disabled selected>Select a reason...</option>
                          <option value="ref-num-issue">Invalid reference number</option>
                          <option value="payment-issue">Payment insufficient amount</option>
                        </select>
                      `
                        : 'Cancel pending transaction. Cannot be undone.<br><br>ID: ' + createResult.dataset.id,
                      () => {
                        if (isOnlineTransaction) {
                          const reasonSelect = document.getElementById('cancelReasonSelect');
                          const selectedReason = reasonSelect ? reasonSelect.value : '';

                          if (!selectedReason) {
                            main.toast('Please select a reason for cancellation.', 'error');
                            return;
                          }

                          const transactionId = createResult.dataset.id;

                          // Listen for reservations and find matching one by tid
                          onSnapshot(query(collection(db, 'reservations')), async (snapshot) => {
                            const reservations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                            const matchingReservation = reservations.find((r) => r.tid === transactionId);

                            if (!matchingReservation) {
                              main.toast('No matching reservation found for this transaction.', 'error');
                              cancelCheckinPayment(transactionId);
                            main.closeConfirmationModal();
                              return;
                            }

                            const reservationId = matchingReservation.id;
                            const fullReason = `${reservationId}:ID:facility:${selectedReason}`;

                            try {
                              await fetch(`${API_BASE_URL}/notif`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  notif_customer_id: pendingPayment.payment_customer_id,
                                  notif_title: 'Your Transaction has been Cancelled',
                                  notif_body: 'Reason: ' + selectedReason + '<br><br>TID: ' + createResult.dataset.id,
                                  notif_type: '',
                                }),
                              });

                              cancelCheckinPayment(transactionId, fullReason);
                            } catch (_) {}
                            main.closeConfirmationModal();
                          });

                          return;
                        }

                        cancelCheckinPayment(createResult.dataset.id);
                        main.closeConfirmationModal();
                      }
                    );
                  });
                }
              );
            }
          );
        });
      } catch (error) {
        console.error('Error fetching pending payments:', error);
      }
    }

    async function fetchAllServicePayments() {
      try {
        const response = await fetch(`${API_BASE_URL}/payment/service`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const completePayments = await response.json();

        const servicePayments = Array.isArray(completePayments.result) ? completePayments.result : [];
        completedPaymentsCache = [
          ...completedPaymentsCache.filter(
            (p) => !p.payment_id || !servicePayments.find((sp) => sp.payment_id === p.payment_id)
          ),
          ...servicePayments,
        ];
        computeAndUpdatePaymentStats(completedPaymentsCache);

        // Use for...of to support async/await
        for (const completePayment of completePayments.result) {
          if (!completePayment.payment_customer_id.startsWith('U')) continue;
          const customerInfo = await resolveCustomerInfo(completePayment.payment_customer_id);
          if (customerInfo.name === '') {
            continue;
          }

          // First, add to the original Service Transactions tab (tab 3) - shows all service transactions
          main.createAtSectionOne(
            SECTION_NAME,
            [
              'id_' + completePayment.payment_id,
              {
                type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                data: [
                  customerInfo.image,
                  customerInfo.id,
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
              customerInfo.name,
              `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
            ],
            3, // Service Transactions tab (all service transactions)
            (createResult) => {
              const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
              transactionDetailsBtn.addEventListener('click', () => openTransactionDetails('services', createResult));
            }
          );

          // Determine which specific tab to place the transaction based on payment method
          const paymentMethod = completePayment.payment_method?.toLowerCase() || '';
          let tabIndex;

          if (paymentMethod === 'cash') {
            tabIndex = 4; // Service (Cash) tab
          } else if (paymentMethod === 'cashless') {
            tabIndex = 5; // Service (Cashless) tab
          } else if (paymentMethod === 'hybrid') {
            // For hybrid payments, we'll place them in both cash and cashless tabs
            // First, add to cash tab (only cash portion)
            main.createAtSectionOne(
              SECTION_NAME,
              [
                'id_' + completePayment.payment_id + '_cash',
                {
                  type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                  data: [
                    customerInfo.image,
                    customerInfo.id,
                    completePayment.payment_purpose,
                    main.formatPrice(completePayment.payment_amount_to_pay),
                    main.formatPrice(completePayment.payment_amount_paid_cash),
                    main.formatPrice(0), // No cashless for cash tab
                    main.formatPrice(completePayment.payment_amount_change),
                    main.fixText(completePayment.payment_rate),
                    'Cash (Hybrid)',
                    `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
                  ],
                },
                customerInfo.name,
                `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
              ],
              4, // Service (Cash) tab
              (createResult) => {
                const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                transactionDetailsBtn.addEventListener('click', () => openTransactionDetails('services', createResult));
              }
            );

            // Then, add to cashless tab (only cashless portion)
            main.createAtSectionOne(
              SECTION_NAME,
              [
                'id_' + completePayment.payment_id + '_cashless',
                {
                  type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                  data: [
                    customerInfo.image,
                    customerInfo.id,
                    completePayment.payment_purpose,
                    main.formatPrice(completePayment.payment_amount_to_pay),
                    main.formatPrice(0), // No cash for cashless tab
                    main.formatPrice(completePayment.payment_amount_paid_cashless),
                    main.formatPrice(completePayment.payment_amount_change),
                    main.fixText(completePayment.payment_rate),
                    'Cashless (Hybrid)',
                    `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
                  ],
                },
                customerInfo.name,
                `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
              ],
              5, // Service (Cashless) tab
              (createResult) => {
                const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                transactionDetailsBtn.addEventListener('click', () => openTransactionDetails('services', createResult));
              }
            );
            continue; // Skip the regular creation below for hybrid payments
          } else {
            // Default to cash tab for unknown payment methods
            tabIndex = 4;
          }

          // Add to specific payment method tab (cash or cashless)
          if (paymentMethod !== 'hybrid') {
            main.createAtSectionOne(
              SECTION_NAME,
              [
                'id_' + completePayment.payment_id + '_' + paymentMethod,
                {
                  type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                  data: [
                    customerInfo.image,
                    customerInfo.id,
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
                customerInfo.name,
                `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
              ],
              tabIndex,
              (createResult) => {
                const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                transactionDetailsBtn.addEventListener('click', () => openTransactionDetails('services', createResult));
              }
            );
          }
        }
      } catch (error) {
        console.error('Error fetching service payments:', error);
      }
    }

    async function fetchAllSalesPayments() {
      try {
        const response = await fetch(`${API_BASE_URL}/payment/sales`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const completePayments = await response.json();

        const salesPayments = Array.isArray(completePayments.result) ? completePayments.result : [];
        completedPaymentsCache = [
          ...completedPaymentsCache.filter(
            (p) => !p.payment_id || !salesPayments.find((sp) => sp.payment_id === p.payment_id)
          ),
          ...salesPayments,
        ];
        computeAndUpdatePaymentStats(completedPaymentsCache);

        completePayments.result.forEach((completePayment) => {
          main.findAtSectionOne(
            'inquiry-customers',
            completePayment.payment_customer_id,
            'equal_id',
            1,
            (findResult) => {
              const customerImage =
                completePayment.payment_customer_id === 'Sales: Cart Checkout'
                  ? '/src/images/🛒.png'
                  : findResult
                    ? findResult.dataset.image
                    : '';
              const customerIdSafe = findResult ? findResult.dataset.id : completePayment.payment_customer_id;
              // For normal customer-linked sales, show "Name | ID"; keep as-is for cart checkout
              const customerDisplay =
                completePayment.payment_customer_id === 'Sales: Cart Checkout'
                  ? customerIdSafe
                  : findResult
                    ? `${main.decodeName(findResult.dataset.text).fullName} | ${customerIdSafe}`
                    : customerIdSafe;

              // First, add to the original Sales Transactions tab (tab 6) - shows all sales transactions
              main.createAtSectionOne(
                SECTION_NAME,
                [
                  'id_' + completePayment.payment_id,
                  {
                    type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                    data: [
                      customerImage,
                      customerDisplay,
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
                6, // Sales Transactions tab (all sales transactions)
                (createResult) => {
                  const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                  transactionDetailsBtn.addEventListener('click', () => openTransactionDetails('sales', createResult));
                }
              );

              // Determine which specific tab to place the transaction based on payment method
              const paymentMethod = completePayment.payment_method?.toLowerCase() || '';
              let tabIndex;

              if (paymentMethod === 'cash') {
                tabIndex = 7; // Sales (Cash) tab
              } else if (paymentMethod === 'cashless') {
                tabIndex = 8; // Sales (Cashless) tab
              } else if (paymentMethod === 'hybrid') {
                // For hybrid payments, we'll place them in both cash and cashless tabs
                // First, add to cash tab (only cash portion)
                main.createAtSectionOne(
                  SECTION_NAME,
                  [
                    'id_' + completePayment.payment_id + '_cash',
                    {
                      type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                      data: [
                        customerImage,
                        customerDisplay,
                        completePayment.payment_purpose,
                        main.formatPrice(completePayment.payment_amount_to_pay),
                        main.formatPrice(completePayment.payment_amount_paid_cash),
                        main.formatPrice(0), // No cashless for cash tab
                        main.formatPrice(completePayment.payment_amount_change),
                        main.fixText(completePayment.payment_rate),
                        'Cash (Hybrid)',
                        `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
                      ],
                    },
                    `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
                  ],
                  7, // Sales (Cash) tab
                  (createResult) => {
                    const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                    transactionDetailsBtn.addEventListener('click', () =>
                      openTransactionDetails('sales', createResult)
                    );
                  }
                );

                // Then, add to cashless tab (only cashless portion)
                main.createAtSectionOne(
                  SECTION_NAME,
                  [
                    'id_' + completePayment.payment_id + '_cashless',
                    {
                      type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                      data: [
                        customerImage,
                        customerDisplay,
                        completePayment.payment_purpose,
                        main.formatPrice(completePayment.payment_amount_to_pay),
                        main.formatPrice(0), // No cash for cashless tab
                        main.formatPrice(completePayment.payment_amount_paid_cashless),
                        main.formatPrice(completePayment.payment_amount_change),
                        main.fixText(completePayment.payment_rate),
                        'Cashless (Hybrid)',
                        `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
                      ],
                    },
                    `${main.encodeDate(completePayment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(completePayment.created_at, 'long')}`,
                  ],
                  8, // Sales (Cashless) tab
                  (createResult) => {
                    const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                    transactionDetailsBtn.addEventListener('click', () =>
                      openTransactionDetails('sales', createResult)
                    );
                  }
                );
                return; // Skip the regular creation below for hybrid payments
              } else {
                // Default to cash tab for unknown payment methods
                tabIndex = 7;
              }

              // Add to specific payment method tab (cash or cashless)
              if (paymentMethod !== 'hybrid') {
                main.createAtSectionOne(
                  SECTION_NAME,
                  [
                    'id_' + completePayment.payment_id + '_' + paymentMethod,
                    {
                      type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                      data: [
                        customerImage,
                        customerDisplay,
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
                  tabIndex,
                  (createResult) => {
                    const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                    transactionDetailsBtn.addEventListener('click', () =>
                      openTransactionDetails('sales', createResult)
                    );
                  }
                );
              }
            }
          );
        });
      } catch (error) {
        console.error('Error fetching sales payments:', error);
      }
    }

    async function fetchAllCanceledPayments() {
      try {
        const response = await fetch(`${API_BASE_URL}/payment/canceled`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const canceledPayments = await response.json();

        const list = Array.isArray(canceledPayments.result) ? canceledPayments.result : [];
        list.forEach((payment) => {
          main.findAtSectionOne('inquiry-customers', payment.payment_customer_id, 'equal_id', 1, (findResult) => {
            const customerImage = findResult ? findResult.dataset.image : '';
            const customerIdSafe = findResult ? findResult.dataset.id : payment.payment_customer_id;
            const customerName = findResult ? main.decodeName(findResult.dataset.text).fullName : '';
            main.createAtSectionOne(
              SECTION_NAME,
              [
                'id_' + payment.payment_id,
                {
                  type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                  data: [
                    customerImage,
                    customerIdSafe,
                    payment.payment_purpose || 'N/A',
                    main.formatPrice(payment.payment_amount_to_pay || 0),
                    main.formatPrice(0),
                    main.formatPrice(0),
                    main.formatPrice(0),
                    main.fixText(payment.payment_rate || 'N/A'),
                    'canceled',
                    `${main.encodeDate(payment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(payment.created_at, 'long')}`,
                  ],
                },
                payment.payment_purpose || 'N/A',
                `${main.encodeDate(payment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(payment.created_at, 'long')}`,
              ],
              2,
              (createResult) => {
                // Set the proper data attributes for the details modal
                createResult.dataset.purpose = payment.payment_purpose || 'N/A';
                createResult.dataset.amounttopay = main.formatPrice(payment.payment_amount_to_pay || 0);
                createResult.dataset.amountpaidcash = main.formatPrice(0);
                createResult.dataset.amountpaidcashless = main.formatPrice(0);
                createResult.dataset.changeamount = main.formatPrice(0);
                createResult.dataset.pricerate = payment.payment_rate || 'N/A';
                createResult.dataset.paymentmethod = 'canceled';
                createResult.dataset.datetime = `${main.encodeDate(payment.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(payment.created_at, 'long')}`;

                const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                transactionDetailsBtn.addEventListener('click', () => openTransactionDetails('canceled', createResult));
              }
            );
          });
        });
      } catch (error) {
        console.error('Error fetching canceled payments:', error);
      }
    }
  }
});

function mainBtnFunction() {
  openConsolidateTransactionsModal();
}

function subBtnFunction() {}

// ===== Consolidate Transactions Modal =====
function openConsolidateTransactionsModal() {
  // Build modal shell
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/30 opacity-0 duration-300 z-20 hidden" id="consolidateTransactionsModal">
      <div class="m-auto w-full max-w-4xl -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-emerald-500 to-emerald-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Consolidate Transactions</p>
          <p class="text-xs">Showing first 10 recent Service and Sales transactions</p>
        </div>
        <div class="p-4">
          <div class="mb-3">
            <label class="mb-1 block text-sm font-medium text-gray-700">Filter transactions by date range</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="date" id="consolidateStartDate" 
                     class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="date" id="consolidateEndDate" 
                     class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="consolidateGrid">
            <div class="flex flex-col gap-2 border rounded-lg p-3" id="serviceCol">
              <div class="sticky top-0 z-10 rounded bg-white/80 px-1 py-1 backdrop-blur flex items-center justify-between">
                <p class="text-sm font-semibold text-emerald-700">Service</p>
                <label class="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" id="serviceSelectAll" class="h-4 w-4 border-gray-300 rounded" />
                  <span>Select all</span>
                </label>
              </div>
              <div class="text-sm text-gray-600" id="serviceListLoading">Loading...</div>
              <div class="flex flex-col gap-2" id="serviceList"></div>
            </div>
            <div class="flex flex-col gap-2 border rounded-lg p-3" id="salesCol">
              <div class="sticky top-0 z-10 rounded bg-white/80 px-1 py-1 backdrop-blur flex items-center justify-between">
                <p class="text-sm font-semibold text-cyan-700">Sales</p>
                <label class="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" id="salesSelectAll" class="h-4 w-4 border-gray-300 rounded" />
                  <span>Select all</span>
                </label>
              </div>
              <div class="text-sm text-gray-600" id="salesListLoading">Loading...</div>
              <div class="flex flex-col gap-2" id="salesList"></div>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end gap-2">
            <span class="text-xs md:text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md" id="selectedCountText" aria-live="polite">Selected: 0</span>
            <button type="button" id="processConsolidateBtn" class="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">Process</button>
            <button type="button" id="closeConsolidateBtn" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">Close</button>
          </div>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('consolidateTransactionsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  // Close handlers (overlay click disabled by request; keep Close button and Escape)
  const closeBtn = document.getElementById('closeConsolidateBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeConsolidateTransactionsModal);
  const processBtn = document.getElementById('processConsolidateBtn');
  if (processBtn)
    processBtn.addEventListener('click', () => {
      // Do not open Process modal if nothing is selected
      if (consolidatedSelected.size === 0) return;
      openProcessConsolidatedModal();
    });
  const handleEscape = (e) => {
    if (e.key === 'Escape') closeConsolidateTransactionsModal();
  };
  document.addEventListener('keydown', handleEscape);
  modal.dataset.escapeHandler = 'true';

  // Initialize button state based on current selection (likely zero on open)
  updateSelectedCountUI();

  // Fetch and render first 10 of each
  fetchFirstFiveTransactions();
  // Wire up date range pickers
  const startInput = document.getElementById('consolidateStartDate');
  const endInput = document.getElementById('consolidateEndDate');
  const onRangeChange = debounce(() => {
    const startVal = (startInput?.value || '').trim();
    const endVal = (endInput?.value || '').trim();
    consolidateRange.start = startVal ? new Date(startVal) : null;
    consolidateRange.end = endVal ? new Date(endVal) : null;

    // Swap if out of order
    if (consolidateRange.start && consolidateRange.end && consolidateRange.start > consolidateRange.end) {
      const tmp = consolidateRange.start;
      consolidateRange.start = consolidateRange.end;
      consolidateRange.end = tmp;
    }

    // Prune selections that are outside the current range
    pruneSelectionsByRange(consolidatedServiceData, consolidatedSalesData, consolidateRange);
    // Re-render using cached data
    renderConsolidatedTransactions(consolidatedServiceData, consolidatedSalesData, '');
  }, 200);
  if (startInput) startInput.addEventListener('input', onRangeChange);
  if (endInput) endInput.addEventListener('input', onRangeChange);
}

function closeConsolidateTransactionsModal() {
  const modal = document.getElementById('consolidateTransactionsModal');
  if (!modal) return;
  // Clear all selections when closing the consolidate modal
  try {
    consolidatedSelected.clear();
  } catch (_) {}
  // Also ensure the Process button state is reset
  try {
    updateSelectedCountUI();
  } catch (_) {}
  
  // Reset date range inputs
  const startInput = document.getElementById('consolidateStartDate');
  const endInput = document.getElementById('consolidateEndDate');
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
  
  // Reset the date range filter
  consolidateRange = { start: null, end: null };
  
  // Re-fetch and display the original first 10 transactions
  fetchFirstFiveTransactions();
  
  modal.classList.remove('opacity-100');
  modal.children[0].classList.add('-translate-y-6');
  modal.children[0].classList.remove('scale-100');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.remove();
  }, 300);
}

// Cache for search filtering
let consolidatedServiceData = [];
let consolidatedSalesData = [];
// Current active date range filter for consolidate modal
let consolidateRange = { start: null, end: null };
// Track selected items across renders (key format: `${type}:${payment_id}`)
const consolidatedSelected = new Set();

// Simple debounce utility
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// Set lists to loading state during search/fetch
function setConsolidateListsLoading() {
  const serviceListEl = document.getElementById('serviceList');
  const salesListEl = document.getElementById('salesList');
  if (serviceListEl) serviceListEl.innerHTML = '<div class="text-sm text-gray-600">Loading...</div>';
  if (salesListEl) salesListEl.innerHTML = '<div class="text-sm text-gray-600">Loading...</div>';
}

// Remove any selected transactions that are not within the given date range
function pruneSelectionsByRange(serviceList, salesList, range) {
  const toKeep = new Set();
  const within = (tx) => {
    const start = range.start;
    const end = range.end;
    const d = new Date(tx.created_at);
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (start && end) {
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return t.getTime() >= s.getTime() && t.getTime() <= e.getTime();
    }
    if (start) {
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      return t.getTime() >= s.getTime();
    }
    if (end) {
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return t.getTime() <= e.getTime();
    }
    return true;
  };
  (Array.isArray(serviceList) ? serviceList : []).forEach((tx) => {
    if (within(tx)) toKeep.add(`service:${tx.payment_id}`);
  });
  (Array.isArray(salesList) ? salesList : []).forEach((tx) => {
    if (within(tx)) toKeep.add(`sales:${tx.payment_id}`);
  });
  // Delete anything not in toKeep
  Array.from(consolidatedSelected).forEach((key) => {
    if (!toKeep.has(key)) consolidatedSelected.delete(key);
  });
  updateSelectedCountUI();
}

// Fetch filtered service and sales lists from backend using a query
async function fetchConsolidatedByQuery(query) {
  try {
    const [serviceRes, salesRes] = await Promise.all([
      fetch(`${API_BASE_URL}/payment/service?q=${encodeURIComponent(query)}`),
      fetch(`${API_BASE_URL}/payment/sales?q=${encodeURIComponent(query)}`),
    ]);

    let serviceList = [];
    let salesList = [];
    try {
      if (serviceRes.ok) {
        const s = await serviceRes.json();
        serviceList = Array.isArray(s.result) ? s.result : [];
      }
    } catch (_) {}
    try {
      if (salesRes.ok) {
        const s = await salesRes.json();
        salesList = Array.isArray(s.result) ? s.result : [];
      }
    } catch (_) {}

    // Filter out selected transactions that don't match the search date
    const searchDate = query ? new Date(query) : null;
    if (searchDate && !isNaN(searchDate.getTime())) {
      // Remove selected transactions that don't match the search date
      const selectedToRemove = new Set();

      // Check service transactions
      serviceList = serviceList.filter((tx) => {
        const txDate = new Date(tx.created_at);
        const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
        const searchDateOnly = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
        const matchesDate = txDateOnly.getTime() === searchDateOnly.getTime();

        if (!matchesDate) {
          const key = `service:${tx.payment_id}`;
          if (consolidatedSelected.has(key)) {
            selectedToRemove.add(key);
          }
        }
        return matchesDate;
      });

      // Check sales transactions
      salesList = salesList.filter((tx) => {
        const txDate = new Date(tx.created_at);
        const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
        const searchDateOnly = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
        const matchesDate = txDateOnly.getTime() === searchDateOnly.getTime();

        if (!matchesDate) {
          const key = `sales:${tx.payment_id}`;
          if (consolidatedSelected.has(key)) {
            selectedToRemove.add(key);
          }
        }
        return matchesDate;
      });

      // Remove selected transactions that don't match the date
      const removedCount = selectedToRemove.size;
      selectedToRemove.forEach((key) => consolidatedSelected.delete(key));

      // Notify user if transactions were removed from selection
      if (removedCount > 0) {
        main.toast(
          `${removedCount} selected transaction${removedCount > 1 ? 's' : ''} removed (not from search date)`,
          'info'
        );
      }
    }

    consolidatedServiceData = serviceList;
    consolidatedSalesData = salesList;
    // When using search-by-date, map it into range for consistent filtering
    consolidateRange = { start: query ? new Date(query) : null, end: query ? new Date(query) : null };
    pruneSelectionsByRange(consolidatedServiceData, consolidatedSalesData, consolidateRange);
    renderConsolidatedTransactions(serviceList, salesList, '');
  } catch (error) {
    console.error('Error fetching consolidated transactions by query:', error);
    renderConsolidatedTransactions([], [], '');
  }
}

function updateSelectedCountUI() {
  const el = document.getElementById('selectedCountText');
  if (el) el.textContent = `Selected: ${consolidatedSelected.size}`;
  // Also toggle the Process button state and styling
  const processBtn = document.getElementById('processConsolidateBtn');
  if (processBtn) {
    const isDisabled = consolidatedSelected.size === 0;
    processBtn.disabled = isDisabled;
    processBtn.classList.toggle('opacity-50', isDisabled);
    processBtn.classList.toggle('cursor-not-allowed', isDisabled);
  }
}

async function fetchFirstFiveTransactions() {
  try {
    // Parallel fetch
    const [serviceRes, salesRes] = await Promise.all([
      fetch(`${API_BASE_URL}/payment/service`),
      fetch(`${API_BASE_URL}/payment/sales`),
    ]);

    let serviceList = [];
    let salesList = [];
    try {
      if (serviceRes.ok) {
        const s = await serviceRes.json();
        serviceList = Array.isArray(s.result) ? s.result : [];
      }
    } catch (_) {}
    try {
      if (salesRes.ok) {
        const s = await salesRes.json();
        salesList = Array.isArray(s.result) ? s.result : [];
      }
    } catch (_) {}

    // Save to cache and render initial (first 10) view
    consolidatedServiceData = serviceList;
    consolidatedSalesData = salesList;
    renderConsolidatedTransactions(consolidatedServiceData, consolidatedSalesData, '');
  } catch (error) {
    console.error('Error fetching consolidated transactions:', error);
    consolidatedServiceData = [];
    consolidatedSalesData = [];
    renderConsolidatedTransactions([], [], '');
  }
}

function renderConsolidatedTransactions(service, sales, query = '') {
  const serviceLoading = document.getElementById('serviceListLoading');
  const salesLoading = document.getElementById('salesListLoading');
  if (serviceLoading) serviceLoading.remove();
  if (salesLoading) salesLoading.remove();

  const serviceListEl = document.getElementById('serviceList');
  const salesListEl = document.getElementById('salesList');

  const renderRow = (tx, type) => {
    const datetime = `${main.encodeDate(tx.created_at, main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long')} - ${main.encodeTime(tx.created_at, 'long')}`;
    const idText = tx.payment_id || 'N/A';
    return `
      <div class="consolidate-item flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 hover:shadow-sm" data-id="${idText}" data-type="${type}">
        <div class="flex items-center gap-2">
          <input type="checkbox" class="h-4 w-4 border-gray-300 rounded consolidate-check" data-id="${idText}" />
          <div class="text-sm font-medium text-gray-900">${idText}</div>
        </div>
        <div class="text-xs text-gray-600">${datetime}</div>
      </div>`;
  };

  const matcher = (tx) => {
    const start = consolidateRange.start;
    const end = consolidateRange.end;
    if (!start && !end) return true;
    const txDate = new Date(tx.created_at);
    const txOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
    if (start && end) {
      const sOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const eOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return txOnly.getTime() >= sOnly.getTime() && txOnly.getTime() <= eOnly.getTime();
    }
    if (start) {
      const sOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      return txOnly.getTime() >= sOnly.getTime();
    }
    if (end) {
      const eOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return txOnly.getTime() <= eOnly.getTime();
    }
    return true;
  };

  if (serviceListEl) {
    const filtered = (Array.isArray(service) ? service : []).filter(matcher).slice(0, 10);
    if (filtered.length === 0) {
      serviceListEl.innerHTML = '<div class="text-sm text-gray-500">No service transactions found</div>';
    } else {
      serviceListEl.innerHTML = filtered.map((tx) => renderRow(tx, 'service')).join('');
    }
    // Sync Select All header checkbox state (checked/indeterminate)
    const serviceSelectAll = document.getElementById('serviceSelectAll');
    if (serviceSelectAll) {
      const selectedCount = filtered.reduce(
        (acc, tx) => acc + (consolidatedSelected.has(`service:${tx.payment_id}`) ? 1 : 0),
        0
      );
      serviceSelectAll.indeterminate = selectedCount > 0 && selectedCount < filtered.length;
      serviceSelectAll.checked = filtered.length > 0 && selectedCount === filtered.length;
      // Click to select/deselect all visible
      serviceSelectAll.onchange = () => {
        const targetChecked = !!serviceSelectAll.checked;
        Array.from(serviceListEl.querySelectorAll('.consolidate-item')).forEach((row) => {
          const cb = row.querySelector('.consolidate-check');
          const id = row.dataset.id;
          const key = `service:${id}`;
          cb.checked = targetChecked;
          if (targetChecked) consolidatedSelected.add(key);
          else consolidatedSelected.delete(key);
        });
        // After bulk change, clear indeterminate
        serviceSelectAll.indeterminate = false;
        updateSelectedCountUI();
      };
    }
    Array.from(serviceListEl.querySelectorAll('.consolidate-check')).forEach((cb) => {
      const id = cb.dataset.id;
      const key = `service:${id}`;
      cb.checked = consolidatedSelected.has(key);
      cb.addEventListener('change', () => {
        if (cb.checked) consolidatedSelected.add(key);
        else consolidatedSelected.delete(key);
        updateSelectedCountUI();
        // Update header checkbox state on individual change
        const serviceSelectAll = document.getElementById('serviceSelectAll');
        if (serviceSelectAll) {
          const filtered = Array.from(serviceListEl.querySelectorAll('.consolidate-item'));
          const total = filtered.length;
          const selected = filtered.reduce(
            (acc, row) => acc + (row.querySelector('.consolidate-check').checked ? 1 : 0),
            0
          );
          serviceSelectAll.indeterminate = selected > 0 && selected < total;
          serviceSelectAll.checked = total > 0 && selected === total;
        }
      });
    });
    // Make entire row clickable to toggle selection
    Array.from(serviceListEl.querySelectorAll('.consolidate-item')).forEach((row) => {
      row.addEventListener('click', (e) => {
        // Ignore clicks originating from the checkbox itself to prevent double toggles
        if (e.target.closest('input[type="checkbox"]')) return;
        const cb = row.querySelector('.consolidate-check');
        const id = row.dataset.id;
        const key = `service:${id}`;
        cb.checked = !cb.checked;
        if (cb.checked) consolidatedSelected.add(key);
        else consolidatedSelected.delete(key);
        updateSelectedCountUI();
        // Update header checkbox state on row click
        const serviceSelectAll = document.getElementById('serviceSelectAll');
        if (serviceSelectAll) {
          const filtered = Array.from(serviceListEl.querySelectorAll('.consolidate-item'));
          const total = filtered.length;
          const selected = filtered.reduce(
            (acc, row) => acc + (row.querySelector('.consolidate-check').checked ? 1 : 0),
            0
          );
          serviceSelectAll.indeterminate = selected > 0 && selected < total;
          serviceSelectAll.checked = total > 0 && selected === total;
        }
      });
    });
  }
  if (salesListEl) {
    const filtered = (Array.isArray(sales) ? sales : []).filter(matcher).slice(0, 10);
    if (filtered.length === 0) {
      salesListEl.innerHTML = '<div class="text-sm text-gray-500">No sales transactions found</div>';
    } else {
      salesListEl.innerHTML = filtered.map((tx) => renderRow(tx, 'sales')).join('');
    }
    // Sync Select All header checkbox state (checked/indeterminate)
    const salesSelectAll = document.getElementById('salesSelectAll');
    if (salesSelectAll) {
      const selectedCount = filtered.reduce(
        (acc, tx) => acc + (consolidatedSelected.has(`sales:${tx.payment_id}`) ? 1 : 0),
        0
      );
      salesSelectAll.indeterminate = selectedCount > 0 && selectedCount < filtered.length;
      salesSelectAll.checked = filtered.length > 0 && selectedCount === filtered.length;
      // Click to select/deselect all visible
      salesSelectAll.onchange = () => {
        const targetChecked = !!salesSelectAll.checked;
        Array.from(salesListEl.querySelectorAll('.consolidate-item')).forEach((row) => {
          const cb = row.querySelector('.consolidate-check');
          const id = row.dataset.id;
          const key = `sales:${id}`;
          cb.checked = targetChecked;
          if (targetChecked) consolidatedSelected.add(key);
          else consolidatedSelected.delete(key);
        });
        salesSelectAll.indeterminate = false;
        updateSelectedCountUI();
      };
    }
    Array.from(salesListEl.querySelectorAll('.consolidate-check')).forEach((cb) => {
      const id = cb.dataset.id;
      const key = `sales:${id}`;
      cb.checked = consolidatedSelected.has(key);
      cb.addEventListener('change', () => {
        if (cb.checked) consolidatedSelected.add(key);
        else consolidatedSelected.delete(key);
        updateSelectedCountUI();
        // Update header checkbox state on individual change
        const salesSelectAll = document.getElementById('salesSelectAll');
        if (salesSelectAll) {
          const filtered = Array.from(salesListEl.querySelectorAll('.consolidate-item'));
          const total = filtered.length;
          const selected = filtered.reduce(
            (acc, row) => acc + (row.querySelector('.consolidate-check').checked ? 1 : 0),
            0
          );
          salesSelectAll.indeterminate = selected > 0 && selected < total;
          salesSelectAll.checked = total > 0 && selected === total;
        }
      });
    });
    // Make entire row clickable to toggle selection
    Array.from(salesListEl.querySelectorAll('.consolidate-item')).forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('input[type="checkbox"]')) return;
        const cb = row.querySelector('.consolidate-check');
        const id = row.dataset.id;
        const key = `sales:${id}`;
        cb.checked = !cb.checked;
        if (cb.checked) consolidatedSelected.add(key);
        else consolidatedSelected.delete(key);
        updateSelectedCountUI();
        // Update header checkbox state on row click
        const salesSelectAll = document.getElementById('salesSelectAll');
        if (salesSelectAll) {
          const filtered = Array.from(salesListEl.querySelectorAll('.consolidate-item'));
          const total = filtered.length;
          const selected = filtered.reduce(
            (acc, row) => acc + (row.querySelector('.consolidate-check').checked ? 1 : 0),
            0
          );
          salesSelectAll.indeterminate = selected > 0 && selected < total;
          salesSelectAll.checked = total > 0 && selected === total;
        }
      });
    });
  }

  updateSelectedCountUI();
}

// Opens a follow-up modal (same size) when Process is clicked
async function openProcessConsolidatedModal() {
  // Build rows from selected keys
  const ids = Array.from(consolidatedSelected)
    .map((k) => (k || '').split(':')[1])
    .filter(Boolean);

  const uniqueIds = Array.from(new Set(ids));

  // Fetch purposes and amounts for each unique ID
  const purposes = [];
  const amounts = [];
  let grandTotal = 0;

  // Create an array of fetch promises for each uniqueId
  const fetchPromises = uniqueIds.map(async (id) => {
    return fetch(`${API_BASE_URL}/payment/complete/${id}`)
      .then((res) => res.json())
      .then((data) => {
        const salesTransaction = data.result[0].payment_purpose.includes('<b>');
        if (salesTransaction) {
          let purposeStr = '';
          let amountStr = '';

          let cleanStr = data.result[0].payment_purpose.replace(/Purchasing /, '');
          let regex = /(\d+)x <b>(.*?)<\/b>₱([\d,\.]+)/g;
          let match;
          while ((match = regex.exec(cleanStr)) !== null) {
            let quantity = parseInt(match[1]);
            let itemName = match[2];
            let price = parseFloat(match[3].replace(/,/g, ''));
            let totalPrice = +price / +quantity;
            purposeStr += `${itemName}<br>`;
            if (quantity > 1) {
              amountStr += `x${quantity} * ${main.encodePrice(totalPrice)} = <b>${main.encodePrice(price)}</b><br>`;
            } else {
              amountStr += `<b>${main.encodePrice(price)}</b><br>`;
            }
            grandTotal += price;
          }

          purposes.push(purposeStr);
          amounts.push(amountStr);
        } else {
          purposes.push(data.result[0].payment_purpose);
          amounts.push('<b>' + main.encodePrice(data.result[0].payment_amount_to_pay) + '</b>');
          grandTotal += +data.result[0].payment_amount_to_pay;
        }
      })
      .catch((error) => {
        console.error(`Error fetching data for ID ${id}:`, error);
      });
  });
  await Promise.all(fetchPromises);

  const rowsHTML =
    uniqueIds.length === 0
      ? '<tr><td colspan="3" class="px-3 py-2 text-sm text-gray-500 text-center">No transactions selected</td></tr>'
      : uniqueIds
          .map(
            (id, index) => `
            <tr class="border-b last:border-0 hover:bg-gray-50">
              <td class="px-3 py-2 text-sm text-gray-900">${id}</td>
              <td class="px-3 py-2 text-sm text-gray-600">${purposes[index].toLowerCase().includes('online') ? purposes[index].split(' - Reference:')[0] : purposes[index]}</td>
              <td class="px-3 py-2 text-sm text-gray-600 text-right">${amounts[index]}</td>
            </tr>`
          )
          .join('');
  const grandTotalRow = `
    <tr class="border-t bg-gray-50">
      <td colspan="2" class="px-3 py-2 text-sm font-semibold text-gray-900 text-right">Grand Total</td>
      <td class="px-3 py-2 text-sm text-gray-600 text-right"><b>${main.encodePrice(grandTotal)}</b></td>
    </tr>`;

  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/30 opacity-0 duration-300 z-30 hidden" id="consolidateProcessModal">
      <div class="m-auto w-full max-w-4xl -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-emerald-500 to-emerald-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Process Consolidated Transactions</p>
          <p class="text-xs">Selected: ${consolidatedSelected.size}</p>
        </div>
        <div class="p-4">
          <div class="overflow-x-auto rounded-lg border border-gray-200">
            <table id="consolidateProcessTable" class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Transaction ID</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700 text-right">Amount</th>
                </tr>
              </thead>
              <tbody class="bg-white">${rowsHTML}${grandTotalRow}</tbody>
            </table>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" id="exportProcessConsolidateBtn" class="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500">Export</button>
            <button type="button" id="closeProcessConsolidateBtn" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">Close</button>
          </div>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('consolidateProcessModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const close = () => closeProcessConsolidatedModal();
  const closeBtn = document.getElementById('closeProcessConsolidateBtn');
  if (closeBtn) closeBtn.addEventListener('click', close);
  // Overlay click disabled by request; only Close button and Escape key will close
  const handleEscape = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', handleEscape);
  modal.dataset.escapeHandler = 'true';

  // Export handler
  const exportBtn = document.getElementById('exportProcessConsolidateBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const table = document.getElementById('consolidateProcessTable');
      if (!table) return;
      const printWin = window.open('', '', 'width=900,height=700');
      if (!printWin) return;
      const styles = `
        <style>
          * { box-sizing: border-box; }
          body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; padding: 28px; color:#111827; }
          .header { text-align:center; line-height:1.35; margin-bottom:20px; }
          .header .name { font-weight:600; font-size:14px; }
          .header .small { font-size:11px; color:#374151; }
          .header .title { margin-top:4px; font-size:12px; color:#111827; }
          table { width:100%; border-collapse:collapse; margin-top:14px; }
          thead th { font-size:11px; font-weight:600; color:#111827; padding:8px 10px; text-align:left; border-bottom:1px solid #e5e7eb; }
          tbody td { font-size:11px; color:#111827; padding:8px 10px; border-bottom:1px solid #f3f4f6; vertical-align:top; }
          .amount { text-align:right; white-space:pre-line; }
          .footer { margin-top:36px; display:flex; justify-content:space-between; align-items:flex-start; font-size:11px; }
          .footer .left { max-width:50%; }
          .footer .right { text-align:right; }
          .footer .label { color:#374151; }
          .footer .value { font-weight:600; }
          @media print { @page { margin: 16mm; } }
        </style>`;

      // Build rows for export (exclude the last grand total row from table)
      const tbody = table.querySelector('tbody');
      const tableRows = Array.from(tbody ? tbody.rows : []);
      const hasRows = tableRows.length > 0;
      const grandTotalText = `<b>${main.encodePrice(grandTotal)}</b>`;
      const printableRows = hasRows ? tableRows.slice(0, -1) : [];
      const rowsHtml = printableRows
        .map((tr) => {
          const c0 = tr.cells[0] ? tr.cells[0].textContent : '';
          const c1 = tr.cells[1] ? tr.cells[1].innerHTML : '';
          const c2 = tr.cells[2] ? tr.cells[2].innerHTML : '';

          // Clean up the amount formatting - replace HTML line breaks with actual line breaks
          const cleanAmount = c2.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');

          return `<tr><td>${c0}</td><td>${c1}</td><td class=\"amount\">${cleanAmount}</td></tr>`;
        })
        .join('');

      const generatedAt = new Date().toLocaleString();
      const preparedName = sessionStorage.getItem('systemUserFullname') || 'Cashier or admin';
      const preparedRole = sessionStorage.getItem('systemUserRole') || '';
      const preparedBy = preparedRole ? `${preparedName} (${preparedRole})` : preparedName;
      const reportHtml = `
        <!doctype html>
        <html></html>
          <head>
            <meta charset=\"utf-8\" />
            <title>Consolidated Reports</title>
            ${styles}
          </head>
          <body>
            <div class=\"header\">
              <div class=\"name\">Fitworx Gym</div>
              <div class=\"small\">Q28V+QMG, Capt. F. S. Samano, Caloocan, Metro Manila</div>
              <div class=\"small\">0939 874 5377</div>
              <div class=\"title\">
                Consolidated Transaction${
                  (() => {
                    const s = consolidateRange.start;
                    const e = consolidateRange.end;
                    if (!s && !e) return '';
                    const fmt = (d) =>
                      main.encodeDate(
                        d,
                        main.getUserPrefs().dateFormat === 'DD-MM-YYYY'
                          ? 'numeric'
                          : 'long'
                      );
                    if (s && e) {
                      const same =
                        s.getFullYear() === e.getFullYear() &&
                        s.getMonth() === e.getMonth() &&
                        s.getDate() === e.getDate();
                      return same ? ` — ${fmt(s)}` : ` — ${fmt(s)} to ${fmt(e)}`;
                    }
                    return s ? ` — from ${fmt(s)}` : ` — until ${fmt(e)}`;
                  })()
                }
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Particulars</th>
                  <th class=\"amount\">Amount</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div class=\"footer\">
              <div class=\"left\">
                <span class=\"label\">Prepared by:</span> <span class=\"value\">${preparedBy}</span>
              </div>
              <div class=\"right\">
                <div><span class=\"label\">Grand Total:</span> <span class=\"value\">${grandTotalText}</span></div>
                <div><span class=\"label\">Generated:</span> <span class=\"value\">${generatedAt}</span></div>
              </div>
            </div>
          </body>
        </html>`;

      printWin.document.write(reportHtml);
      printWin.document.close();
      // Give the window a moment to render before printing
      printWin.focus();
      setTimeout(() => {
        try {
          printWin.print();
        } catch (_) {}
        try {
          printWin.close();
        } catch (_) {}
      }, 250);
    });
  }
}

function closeProcessConsolidatedModal() {
  const modal = document.getElementById('consolidateProcessModal');
  if (!modal) return;
  modal.classList.remove('opacity-100');
  modal.children[0].classList.add('-translate-y-6');
  modal.children[0].classList.remove('scale-100');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.remove();
  }, 300);
}

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
    // Prevent duplicate insertion when polling picks up this newly-created pending
    try {
      seenPendingPaymentIds.add(createResult.dataset.id);
    } catch (_) {}
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
        findResult.dataset.text + ' ' + findResult.dataset.custom2,
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
  const titleLower = title.toLowerCase();
  // Clean up any previous hybrid auto-fill listener to prevent duplicates
  if (cashInput && cashInput.__autoFillListener) {
    cashInput.removeEventListener('input', cashInput.__autoFillListener);
    cashInput.__autoFillListener = null;
  }
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
      // Focus cash amount on cash method
      requestAnimationFrame(() => {
        if (cashInput) cashInput.focus();
      });
      break;
    case 'cashless':
      if (input.value == 'N/A') input.value = '';
      cashInput.parentElement.classList.add('hidden');
      cashlessInput.parentElement.classList.remove('hidden');
      // Show reference number for cashless
      if (refInput) {
        refInput.parentElement.classList.remove('hidden');
        if (refInput.value == 'N/A') refInput.value = '';
      }
      // Focus cashless amount on cashless method
      requestAnimationFrame(() => {
        if (cashlessInput) cashlessInput.focus();
      });
      // Autofill cashless tendered to the full amount due when Cashless is selected
      if (cashlessInput) {
        cashlessInput.value = main.encodePrice(amountToPay);
      }
      break;
    case 'hybrid':
      if (input.value == 'N/A') input.value = '';
      cashInput.parentElement.classList.remove('hidden');
      cashlessInput.parentElement.classList.remove('hidden');
      // Show reference number for hybrid
      if (refInput) {
        refInput.parentElement.classList.remove('hidden');
        if (refInput.value == 'N/A') refInput.value = '';
      }
      // Prefer focusing cash amount first on hybrid
      requestAnimationFrame(() => {
        if (cashInput) cashInput.focus();
      });
      // In Hybrid: set cashless to the remaining needed (amountToPay - cash)
      if (cashInput && cashlessInput) {
        const updateCashlessRemaining = () => {
          const cashVal = cashInput.value.includes('₱')
            ? +main.decodePrice(cashInput.value)
            : Number(cashInput.value) || 0;
          const remaining = Math.max(0, Number(amountToPay) - cashVal);
          cashlessInput.value = main.encodePrice(remaining);
          cashlessInput.dispatchEvent(new Event('input'));
        };
        // Attach and remember the listener for cleanup on next switch
        cashInput.__autoFillListener = updateCashlessRemaining;
        cashInput.addEventListener('input', updateCashlessRemaining);
        // Initialize once immediately
        updateCashlessRemaining();
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
  } else {
    if (title.toLowerCase() == 'hybrid') {
      cashlessInput.previousElementSibling.innerHTML =
        inputGroup.short[3].placeholder + ' (cashless)' + (inputGroup.short[3].required ? ' *' : '');
    } else {
      cashlessInput.previousElementSibling.innerHTML =
        inputGroup.short[3].placeholder + (inputGroup.short[3].required ? ' *' : '');
    }
  }
  // Default autofill behavior after visibility/labels are set
  // If payment is locked (online) OR Cashless tab is selected, autofill cashless with amount to pay.
  // Hybrid is handled above with a live listener, so do not override here for hybrid.
  if (titleLower !== 'hybrid') {
    if (inputGroup.radio[0].locked || titleLower === 'cashless') {
      cashlessInput.value = main.encodePrice(amountToPay);
    } else {
      cashlessInput.value = main.encodePrice(0);
    }
  }
  cashInput.dispatchEvent(new Event('input'));
  cashlessInput.dispatchEvent(new Event('input'));

  // Ensure quick editing UX: auto-select contents on focus/click
  if (!inputGroup.radio[0].locked) {
    attachSelectAll(cashInput);
    attachSelectAll(cashlessInput);
  }
}

function completePayment(type, id, image, customerId, purpose, fullName, amountToPay, priceRate, opts = {}) {
  const isOnlineTransaction =
    purpose.includes('Online facility reservation fee') || purpose.includes('Online monthly registration fee');
  const effectiveId = opts.displayId || id;
  const inputs = {
    header: {
      title: `Transaction ID: ${effectiveId} ${getEmoji('🔏', 26)}`,
      subtitle: `Purpose: ${isOnlineTransaction ? purpose.split(' - Reference: ')[0] : purpose}`,
    },
    short: [
      {
        placeholder: type === 'cart' ? 'Purchase details' : 'Service details',
        value: type === 'cart' ? `${fullName}` : `for customer ${fullName} (${customerId})`,
        locked: true,
      },
      { placeholder: 'Amount to pay', value: main.encodePrice(amountToPay), locked: true },
      { placeholder: 'Amount tendered', value: 0, required: true, autoformat: 'price', hidden: isOnlineTransaction },
      {
        placeholder: 'Amount tendered',
        value: isOnlineTransaction ? amountToPay : 0,
        required: !isOnlineTransaction,
        hidden: !isOnlineTransaction,
        locked: isOnlineTransaction,
      },
      {
        placeholder: 'Change amount',
        value: main.encodePrice(0),
        locked: true,
        live: '1|+2|-3:arithmetic',
        hidden: isOnlineTransaction,
      },
      { placeholder: 'Price rate', value: main.fixText(priceRate), locked: true },
      {
        placeholder: `Reference number${isOnlineTransaction ? ` from: <b>${purpose.split(' from Account: ')[1]}</b>` : ''}`,
        value: isOnlineTransaction ? purpose.split(' - Reference: ')[1].split(' from Account: ')[0] : 'N/A',
        required: !isOnlineTransaction,
        locked: isOnlineTransaction,
      },
    ],
    radio: [
      {
        label: 'Payment method',
        selected: isOnlineTransaction ? 2 : 1,
        autoformat: { type: 'short', index: 11 },
        locked: isOnlineTransaction,
      },
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
  if (!isOnlineTransaction) {
    inputs.short[3].autoformat = 'price';
  }

  main.openModal('yellow', inputs, (result) => {
    const paymentMethod = main.getSelectedRadio(result.radio).toLowerCase();
    const cashVal = result.short[2].value.includes('₱')
      ? +main.decodePrice(result.short[2].value)
      : Number(result.short[2].value) || 0;
    const cashlessVal = result.short[3].value.includes('₱')
      ? +main.decodePrice(result.short[3].value)
      : Number(result.short[3].value) || 0;

    // Show specific message when no amount entered at all
    if (cashVal === 0 && cashlessVal === 0) {
      main.toast('No amount tendered', 'error');
      return;
    }
    if (!main.isValidPaymentAmount(+cashVal) && paymentMethod == 'cash') {
      main.toast(`Invalid payment amount (cash): ${cashVal}`, 'error');
      return;
    }
    if (
      !main.isValidPaymentAmount(cashlessVal) &&
      (paymentMethod.includes('cashless') || paymentMethod.includes('hybrid'))
    ) {
      main.toast(`Invalid payment amount (cashless): ${main.encodePrice(cashlessVal)}`, 'error');
      return;
    }
    let amountPaid = Number(cashVal) + cashlessVal;
    // Validate numeric/format first
    if (!main.isValidPaymentAmount(+amountPaid)) {
      main.toast(`Invalid payment amount: ${amountPaid}`, 'error');
      return;
    }
    // Then check for insufficiency against amount due
    if (+amountPaid < +amountToPay) {
      const shortBy = (+amountToPay) - (+amountPaid);
      main.toast(
        `Insufficient payment amount. Short by ${main.encodePrice(shortBy)} (Required: ${main.encodePrice(amountToPay)}, Tendered: ${main.encodePrice(amountPaid)})`,
        'error'
      );
      return;
    }
    const change = result.short[4].value;

    let refNum = result.short[6].value;
    if (result.radio[0].selected > 1) {
      if (!isOnlineTransaction) {
        const refDigits = String(refNum || '').replace(/\D/g, '');
        if (refNum == 'N/A' || refDigits.length !== 13) {
          main.toast('Reference number must be exactly 13 digits', 'error');
          return;
        }
      } else {
        refNum = purpose.split(' - Reference: ')[1].split(' from Account: ')[0];
      }
    } else if (refNum != 'N/A') {
      main.toast(`Cash payment method doesn't need reference number: ${refNum}`, 'error');
      return;
    }
    if (refNum === 'N/A') refNum = '';

    function continueProcessPayment() {
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
                main.formatPrice(cashVal),
                main.formatPrice(cashlessVal),
                main.formatPrice(main.decodePrice(change)),
                main.fixText(priceRate),
                main.fixText(paymentMethod),
                dateTimeText,
              ],
            },
            // For service transactions (non-cart), insert Customer Name column before date/time
            ...(type === 'cart' ? [] : [fullName]),
            dateTimeText,
          ];

          // Determine which tab to place the completed transaction based on payment method
          let completedTabIndex;
          if (type === 'cart') {
            // For sales transactions
            if (paymentMethod === 'cash') {
              completedTabIndex = 7; // Sales (Cash) tab
            } else if (paymentMethod === 'cashless') {
              completedTabIndex = 8; // Sales (Cashless) tab
            } else if (paymentMethod === 'hybrid') {
              // For hybrid sales, we'll create entries in both tabs
              // First, create cash entry
              const cashColumnsData = [
                'id_' + id + '_cash',
                {
                  type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                  data: [
                    image,
                    customerId,
                    purpose,
                    main.formatPrice(amountToPay),
                    main.formatPrice(cashVal),
                    main.formatPrice(0), // No cashless for cash tab
                    main.formatPrice(main.decodePrice(change)),
                    main.fixText(priceRate),
                    'Cash (Hybrid)',
                    dateTimeText,
                  ],
                },
                dateTimeText,
              ];

              main.createAtSectionOne(SECTION_NAME, cashColumnsData, 7, (createResult) => {
                createResult.dataset.refnum = refNum;
                const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                transactionDetailsBtn.addEventListener('click', () => openTransactionDetails(type, createResult));
              });

              // Then, create cashless entry
              const cashlessColumnsData = [
                'id_' + id + '_cashless',
                {
                  type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                  data: [
                    image,
                    customerId,
                    purpose,
                    main.formatPrice(amountToPay),
                    main.formatPrice(0), // No cash for cashless tab
                    main.formatPrice(cashlessVal),
                    main.formatPrice(main.decodePrice(change)),
                    main.fixText(priceRate),
                    'Cashless (Hybrid)',
                    dateTimeText,
                  ],
                },
                dateTimeText,
              ];

              main.createAtSectionOne(SECTION_NAME, cashlessColumnsData, 8, (createResult) => {
                createResult.dataset.refnum = refNum;
                const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                transactionDetailsBtn.addEventListener('click', () => openTransactionDetails(type, createResult));
              });

              // Continue with the rest of the completion logic
              main.toast(`Transaction successfully completed!`, 'success');
              main.createNotifDot(SECTION_NAME, 'main');
              main.createNotifDot(SECTION_NAME, 7);
              main.createNotifDot(SECTION_NAME, 8);
              main.deleteAtSectionOne(SECTION_NAME, 1, id);
              try {
                seenPendingPaymentIds.delete(effectiveId);
              } catch (_) {}

              main.closeModal(() => {
                switch (type) {
                  case 'customers':
                    customers.completeCheckinPayment(effectiveId, amountPaid, priceRate);
                    // Fallback: ensure All Registered Customers is marked Active if TID lookup fails
                    try {
                      // Update DOM by ID as backup
                      main.findAtSectionOne('inquiry-customers', customerId, 'equal_id', 1, (row) => {
                        if (row && (row.dataset.custom2 || '').toLowerCase().includes('pending')) {
                          const baseType = (row.dataset.custom2 || '').split(' - ')[0] || 'Monthly';
                          row.dataset.custom2 = baseType + ' - Active';
                          row.children[2].textContent = row.dataset.custom2;
                          row.dataset.status = 'active';
                          row.dataset.tid = '';
                        }
                      });
                    } catch (_) {}
                    break;
                  case 'reservations':
                    reservations.completeReservationPayment(id);
                    break;
                  case 'cart':
                    cart.completeProcessCheckout(
                      amountToPay,
                      main.fixText(paymentMethod),
                      cashVal + cashlessVal,
                      main.decodePrice(change),
                      refNum
                    );
                }
              });

              // Handle backend operations asynchronously
              (async () => {
                try {
                  // Pre-check reference uniqueness before updating backend
                  if (refNum && (paymentMethod.includes('cashless') || paymentMethod.includes('hybrid'))) {
                    try {
                      const refChk = await fetch(`${API_BASE_URL}/payment/ref/check/${encodeURIComponent(refNum)}`);
                      if (refChk.ok) {
                        const data = await refChk.json();
                        if (data.used) {
                          main.toast('This reference number has already been used. Please enter a valid one.', 'error');
                          return;
                        }
                      }
                    } catch (_) {}
                  }

                  // First, remove from pending in backend (mark type/service) to avoid resurrecting after reload

                  const response = await fetch(
                    `${API_BASE_URL}/payment/${type === 'cart' ? 'sales' : 'service'}/${effectiveId}`,
                    {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        payment_amount_to_pay: Number(amountToPay) || 0,
                        payment_amount_paid_cash: cashVal,
                        payment_amount_paid_cashless: cashlessVal,
                        payment_amount_change: main.decodePrice(change),
                        payment_method: paymentMethod,
                        payment_ref: refNum,
                        payment_rate: priceRate,
                      }),
                    }
                  );

                  if (!response.ok) {
                    if (response.status === 409) {
                      main.toast('This reference number has already been used. Please enter a valid one.', 'error');
                      return;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  await response.json();

                  // Reflect the newly completed transaction in stats immediately
                  try {
                    const nowIso = new Date().toISOString();
                    completedPaymentsCache.push({
                      payment_id: id,
                      payment_amount_paid_cash: Number(cashVal) || 0,
                      payment_amount_paid_cashless: Number(cashlessVal) || 0,
                      payment_method: paymentMethod,
                      created_at: nowIso,
                    });
                    computeAndUpdatePaymentStats(completedPaymentsCache);
                    await refreshDashboardStats();
                  } catch (_) {}

                  // Ensure backend flags for customer/monthly are set to active (defensive for portal-created pending rows)
                  try {
                    await fetch(`${API_BASE_URL}/inquiry/customers/pending/${encodeURIComponent(customerId)}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ customer_type: 'monthly', customer_tid: '', customer_pending: 0 }),
                    });
                  } catch (_) {}
                  try {
                    await fetch(`${API_BASE_URL}/inquiry/monthly/${encodeURIComponent(customerId)}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ customer_tid: '', customer_pending: 0 }),
                    });
                  } catch (_) {}
                } catch (error) {
                  console.error('Error creating complete payment:', error);
                }
              })();

              return; // Exit early for hybrid sales
            } else {
              completedTabIndex = 7; // Default to cash tab
            }
          } else {
            // For service transactions
            if (paymentMethod === 'cash') {
              completedTabIndex = 4; // Service (Cash) tab
            } else if (paymentMethod === 'cashless') {
              completedTabIndex = 5; // Service (Cashless) tab
            } else if (paymentMethod === 'hybrid') {
              // For hybrid services, we'll create entries in both tabs
              // First, create cash entry
              const cashColumnsData = [
                'id_' + id + '_cash',
                {
                  type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                  data: [
                    image,
                    customerId,
                    purpose,
                    main.formatPrice(amountToPay),
                    main.formatPrice(cashVal),
                    main.formatPrice(0), // No cashless for cash tab
                    main.formatPrice(main.decodePrice(change)),
                    main.fixText(priceRate),
                    'Cash (Hybrid)',
                    dateTimeText,
                  ],
                },
                fullName,
                dateTimeText,
              ];

              main.createAtSectionOne(SECTION_NAME, cashColumnsData, 4, async (createResult) => {
                createResult.dataset.refnum = refNum;
                const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                transactionDetailsBtn.addEventListener('click', () => openTransactionDetails(type, createResult));
              });

              // Then, create cashless entry
              const cashlessColumnsData = [
                'id_' + id + '_cashless',
                {
                  type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
                  data: [
                    image,
                    customerId,
                    purpose,
                    main.formatPrice(amountToPay),
                    main.formatPrice(0), // No cash for cashless tab
                    main.formatPrice(cashlessVal),
                    main.formatPrice(main.decodePrice(change)),
                    main.fixText(priceRate),
                    'Cashless (Hybrid)',
                    dateTimeText,
                  ],
                },
                fullName,
                dateTimeText,
              ];

              main.createAtSectionOne(SECTION_NAME, cashlessColumnsData, 5, async (createResult) => {
                createResult.dataset.refnum = refNum;
                const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
                transactionDetailsBtn.addEventListener('click', () => openTransactionDetails(type, createResult));
              });

              // Continue with the rest of the completion logic
              main.toast(`Transaction successfully completed!`, 'success');
              main.createNotifDot(SECTION_NAME, 'main');
              main.createNotifDot(SECTION_NAME, 4);
              main.createNotifDot(SECTION_NAME, 5);
              main.deleteAtSectionOne(SECTION_NAME, 1, id);
              try {
                seenPendingPaymentIds.delete(effectiveId);
              } catch (_) {}

              main.closeModal(() => {
                switch (type) {
                  case 'customers':
                    customers.completeCheckinPayment(effectiveId, amountPaid, priceRate);
                    // Fallback: ensure All Registered Customers is marked Active if TID lookup fails
                    try {
                      // Update DOM by ID as backup
                      main.findAtSectionOne('inquiry-customers', customerId, 'equal_id', 1, (row) => {
                        if (row && (row.dataset.custom2 || '').toLowerCase().includes('pending')) {
                          const baseType = (row.dataset.custom2 || '').split(' - ')[0] || 'Monthly';
                          row.dataset.custom2 = baseType + ' - Active';
                          row.children[2].textContent = row.dataset.custom2;
                          row.dataset.status = 'active';
                          row.dataset.tid = '';
                        }
                      });
                    } catch (_) {}
                    break;
                  case 'reservations':
                    reservations.completeReservationPayment(id);
                    break;
                  case 'cart':
                    cart.completeProcessCheckout(
                      amountToPay,
                      main.fixText(paymentMethod),
                      cashVal + cashlessVal,
                      main.decodePrice(change),
                      refNum
                    );
                }
              });

              // Handle backend operations asynchronously
              (async () => {
                try {
                  // Pre-check reference uniqueness before updating backend
                  if (refNum && (paymentMethod.includes('cashless') || paymentMethod.includes('hybrid'))) {
                    try {
                      const refChk = await fetch(`${API_BASE_URL}/payment/ref/check/${encodeURIComponent(refNum)}`);
                      if (refChk.ok) {
                        const data = await refChk.json();
                        if (data.used) {
                          main.toast('This reference number has already been used. Please enter a valid one.', 'error');
                          return;
                        }
                      }
                    } catch (_) {}
                  }

                  // First, remove from pending in backend (mark type/service) to avoid resurrecting after reload

                  const response = await fetch(
                    `${API_BASE_URL}/payment/${type === 'cart' ? 'sales' : 'service'}/${effectiveId}`,
                    {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        payment_amount_to_pay: Number(amountToPay) || 0,
                        payment_amount_paid_cash: cashVal,
                        payment_amount_paid_cashless: cashlessVal,
                        payment_amount_change: main.decodePrice(change),
                        payment_method: paymentMethod,
                        payment_ref: refNum,
                        payment_rate: priceRate,
                      }),
                    }
                  );

                  if (!response.ok) {
                    if (response.status === 409) {
                      main.toast('This reference number has already been used. Please enter a valid one.', 'error');
                      return;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  await response.json();

                  // Reflect the newly completed transaction in stats immediately
                  try {
                    const nowIso = new Date().toISOString();
                    completedPaymentsCache.push({
                      payment_id: id,
                      payment_amount_paid_cash: Number(cashVal) || 0,
                      payment_amount_paid_cashless: Number(cashlessVal) || 0,
                      payment_method: paymentMethod,
                      created_at: nowIso,
                    });
                    computeAndUpdatePaymentStats(completedPaymentsCache);
                    await refreshDashboardStats();
                  } catch (_) {}

                  // Ensure backend flags for customer/monthly are set to active (defensive for portal-created pending rows)
                  try {
                    await fetch(`${API_BASE_URL}/inquiry/customers/pending/${encodeURIComponent(customerId)}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ customer_type: 'monthly', customer_tid: '', customer_pending: 0 }),
                    });
                  } catch (_) {}
                  try {
                    await fetch(`${API_BASE_URL}/inquiry/monthly/${encodeURIComponent(customerId)}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ customer_tid: '', customer_pending: 0 }),
                    });
                  } catch (_) {}
                } catch (error) {
                  console.error('Error creating complete payment:', error);
                }
              })();

              return; // Exit early for hybrid services
            } else {
              completedTabIndex = 4; // Default to cash tab
            }
          }

          // Create entry in the original Service/Sales Transactions tab first
          const originalTabIndex = type === 'cart' ? 6 : 3; // Sales Transactions (tab 6) or Service Transactions (tab 3)
          main.createAtSectionOne(SECTION_NAME, columnsData, originalTabIndex, async (createResult) => {
            createResult.dataset.refnum = refNum;
            const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
            transactionDetailsBtn.addEventListener('click', () => openTransactionDetails(type, createResult));
          });

          // Then create entry in the specific payment method tab
          main.createAtSectionOne(SECTION_NAME, columnsData, completedTabIndex, async (createResult) => {
            createResult.dataset.refnum = refNum;

            main.toast(`Transaction successfully completed!`, 'success');
            main.createNotifDot(SECTION_NAME, 'main');
            main.createNotifDot(SECTION_NAME, originalTabIndex);
            main.createNotifDot(SECTION_NAME, completedTabIndex);
            main.deleteAtSectionOne(SECTION_NAME, 1, id);
            try {
              seenPendingPaymentIds.delete(effectiveId);
            } catch (_) {}

            const transactionDetailsBtn = createResult.querySelector(`#transactionDetailsBtn`);
            transactionDetailsBtn.addEventListener('click', () => openTransactionDetails(type, createResult));

            main.closeModal(() => {
              switch (type) {
                case 'customers':
                  customers.completeCheckinPayment(effectiveId, amountPaid, priceRate);
                  // Fallback: ensure All Registered Customers is marked Active if TID lookup fails
                  try {
                    // Update DOM by ID as backup
                    main.findAtSectionOne('inquiry-customers', customerId, 'equal_id', 1, (row) => {
                      if (row && (row.dataset.custom2 || '').toLowerCase().includes('pending')) {
                        const baseType = (row.dataset.custom2 || '').split(' - ')[0] || 'Monthly';
                        row.dataset.custom2 = baseType + ' - Active';
                        row.children[2].textContent = row.dataset.custom2;
                        row.dataset.status = 'active';
                        row.dataset.tid = '';
                      }
                    });
                  } catch (_) {}
                  break;
                case 'reservations':
                  reservations.completeReservationPayment(id);
                  break;
                case 'cart':
                  cart.completeProcessCheckout(
                    amountToPay,
                    main.fixText(paymentMethod),
                    cashVal + cashlessVal,
                    main.decodePrice(change),
                    refNum
                  );
              }
            });

            try {
              // Pre-check reference uniqueness before updating backend
              if (refNum && (paymentMethod.includes('cashless') || paymentMethod.includes('hybrid'))) {
                try {
                  const refChk = await fetch(`${API_BASE_URL}/payment/ref/check/${encodeURIComponent(refNum)}`);
                  if (refChk.ok) {
                    const data = await refChk.json();
                    if (data.rows[0].payment_id !== id && data.used) {
                      main.toast('This reference number has already been used. Please enter a valid one.', 'error');
                      return;
                    }
                  }
                } catch (_) {}
              }

              const response = await fetch(
                `${API_BASE_URL}/payment/${type === 'cart' ? 'sales' : 'service'}/${effectiveId}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    payment_amount_to_pay: Number(amountToPay) || 0,
                    payment_amount_paid_cash: cashVal,
                    payment_amount_paid_cashless: cashlessVal,
                    payment_amount_change: main.decodePrice(change),
                    payment_method: paymentMethod,
                    payment_ref: refNum,
                    payment_rate: priceRate,
                  }),
                }
              );

              if (!response.ok) {
                if (response.status === 409) {
                  main.toast('This reference number has already been used. Please enter a valid one.', 'error');
                  return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              await response.json();

              // Reflect the newly completed transaction in stats immediately
              try {
                const nowIso = new Date().toISOString();
                completedPaymentsCache.push({
                  payment_id: id,
                  payment_amount_paid_cash: Number(cashVal) || 0,
                  payment_amount_paid_cashless: Number(cashlessVal) || 0,
                  payment_method: paymentMethod,
                  created_at: nowIso,
                });
                computeAndUpdatePaymentStats(completedPaymentsCache);
                await refreshDashboardStats();
              } catch (_) {}

              // Ensure backend flags for customer/monthly are set to active (defensive for portal-created pending rows)
              if (type === 'customers') {
                try {
                  await fetch(`${API_BASE_URL}/inquiry/customers/pending/${encodeURIComponent(customerId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer_type: 'monthly', customer_tid: '', customer_pending: 0 }),
                  });
                } catch (_) {}
                try {
                  await fetch(`${API_BASE_URL}/inquiry/monthly/${encodeURIComponent(customerId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer_tid: '', customer_pending: 0 }),
                  });
                } catch (_) {}
              }
            } catch (error) {
              console.error('Error creating complete payment:', error);
            }
          });
    }

    if (isOnlineTransaction) {
      main.openConfirmationModal('Confirming the gcash reference number is valid', () => {
        main.closeConfirmationModal(() => {
          continueProcessPayment();
        });
      });
    } else {
      continueProcessPayment();
    }
  });

  setTimeout(() => {
    if (!isOnlineTransaction) {
      const cashInput = document.querySelector('#input-short-7');
      const cashlessInput = document.querySelector('#input-short-8');
      attachSelectAll(cashInput);
      attachSelectAll(cashlessInput);
      // Auto-focus visible payment field on open (default cash)
      if (cashInput && !cashInput.parentElement.classList.contains('hidden')) {
        cashInput.focus();
      } else if (cashlessInput && !cashlessInput.parentElement.classList.contains('hidden')) {
        cashlessInput.focus();
      }
    }
  }, 0);
}

export function cancelCheckinPayment(transactionId, reason = '') {
  customers.cancelPendingTransaction(transactionId);
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_id', 1, async (findResult) => {
    if (!findResult) return;

    try {
      const res = await fetch(`${API_BASE_URL}/payment/canceled/${transactionId}`, { method: 'PUT' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    } catch (e) {
      console.error('Error marking payment as canceled:', e);
    }

    if (reason !== '') {
      if (reason.includes('facility')) {
        const reservationId = reason.split(':ID:')[0];
        main.sharedState.moduleLoad = SECTION_NAME;
        window.showGlobalLoading?.();
        try {
          await deleteDoc(doc(db, 'reservations', reservationId));
        } catch (e) {
        } finally {
          window.hideGlobalLoading?.();
        }
      }
    }

    // Reflect in UI: move to Canceled Transactions Log (tab index 2)
    const columnsData = [
      'id_' + transactionId,
      {
        type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
        data: [
          findResult.dataset.image || '',
          findResult.dataset.text || '',
          findResult.dataset.custom2 || 'N/A',
          main.formatPrice(main.deformatPrice(findResult.dataset.custom3 || 0)),
          main.formatPrice(0),
          main.formatPrice(0),
          main.formatPrice(0),
          main.fixText(findResult.dataset.custom4 || 'N/A'),
          'canceled',
          `${main.getDateOrTimeOrBoth().date} - ${main.getDateOrTimeOrBoth().time}`,
        ],
      },
      findResult.dataset.custom2 || 'N/A',
      `${main.getDateOrTimeOrBoth().date} - ${main.getDateOrTimeOrBoth().time}`,
    ];
    main.createAtSectionOne(SECTION_NAME, columnsData, 2, () => {});

    // Remove from pending list
    main.deleteAtSectionOne(SECTION_NAME, 1, transactionId);
    try {
      seenPendingPaymentIds.delete(transactionId);
    } catch (_) {}
    main.toast(`${transactionId}, successfully cancelled pending transaction!`, 'error');
  });
}

export function processReservationPayment(reservation, callback = () => {}) {
  const { firstName, lastName, fullName } = main.decodeName(reservation.name);
  const purpose = `Manual facility reservation fee`;
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
    // Prevent duplicate insertion when polling picks up this newly-created pending
    try {
      seenPendingPaymentIds.add(createResult.dataset.id);
    } catch (_) {}
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
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_id', 1, async (findResult) => {
    if (!findResult) return;

    try {
      const res = await fetch(`${API_BASE_URL}/payment/canceled/${transactionId}`, { method: 'PUT' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    } catch (e) {
      console.error('Error marking reservation payment as canceled:', e);
    }

    const columnsData = [
      'id_' + transactionId,
      {
        type: 'object_purpose_amounttopay_amountpaidcash_amountpaidcashless_changeamount_pricerate_paymentmethod_datetime',
        data: [
          findResult.dataset.image || '',
          findResult.dataset.text || '',
          findResult.dataset.custom2 || 'Reservation fee',
          main.formatPrice(main.deformatPrice(findResult.dataset.custom3 || 0)),
          main.formatPrice(0),
          main.formatPrice(0),
          main.formatPrice(0),
          'Regular',
          'canceled',
          `${main.getDateOrTimeOrBoth().date} - ${main.getDateOrTimeOrBoth().time}`,
        ],
      },
      findResult.dataset.custom2 || 'Reservation fee',
      `${main.getDateOrTimeOrBoth().date} - ${main.getDateOrTimeOrBoth().time}`,
    ];
    main.createAtSectionOne(SECTION_NAME, columnsData, 2, () => {});

    main.deleteAtSectionOne(SECTION_NAME, 1, transactionId);
    try {
      seenPendingPaymentIds.delete(transactionId);
    } catch (_) {}
    main.toast(`${transactionId}, successfully cancelled pending transaction!`, 'error');
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
    todays_overall_total: todaysCash + todaysCashless,
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
      } else if (label.includes('overall') && label.includes('total')) {
        valueEl.textContent = main.encodePrice(stats.todays_overall_total || 0);
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

function openTransactionDetails(type, row) {
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
      {
        placeholder: type === 'cart' ? 'Sales' : 'Customer',
        value:
          customerId && typeof customerId === 'string' && customerId.includes(':')
            ? customerId.split(':')[1].split('Purchasing')[0].trim()
            : customerId || 'N/A',
        locked: true,
      },
      { placeholder: 'Purpose', value: purpose.replace(/<b>/g, '').replace(/<\/b>/g, ''), locked: true },
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

export function processCheckoutPayment(purpose, amountToPay, productImage = '') {
  const priceRate = 'Regular';
  const columnsData = [
    'id_T_random',
    {
      type: 'object',
      data: [productImage, 'Sales: Cart Checkout'],
    },
    purpose,
    main.formatPrice(amountToPay),
    priceRate,
    'custom_datetime_today',
  ];
  main.createAtSectionOne(SECTION_NAME, columnsData, 1, async (createResult) => {
    // Prevent duplicate insertion when polling picks up this newly-created pending
    try {
      seenPendingPaymentIds.add(createResult.dataset.id);
    } catch (_) {}
    const transactionProcessBtn = createResult.querySelector('#transactionProcessBtn');
    transactionProcessBtn.addEventListener('click', () => {
      completePayment(
        'cart',
        createResult.dataset.id,
        productImage,
        createResult.dataset.text + ' ' + createResult.dataset.custom2,
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
          payment_customer_id: 'Sales: Cart Checkout',
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
