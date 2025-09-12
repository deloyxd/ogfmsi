import main from '../admin_main.js';
import checkins from './inquiry_checkins.js';
import reservations from './inquiry_reservations.js';
import payments from './payments.js';
import { API_BASE_URL } from '../_global.js';

const SECTION_NAME = 'inquiry-customers';

const PENDING_TRANSACTION_MESSAGE = 'Please complete pending transaction first at Payments module:';

const PRICE_RATE = [
  {
    value: 'regular',
    label: 'Regular',
  },
  {
    value: 'student',
    label: 'Student',
  },
];

const CUSTOMER_TYPE = [
  {
    value: 'daily',
    label: 'Daily',
  },
  {
    value: 'monthly',
    label: 'Monthly',
  },
];

const PRICES_AUTOFILL = {
  regular_daily: 70,
  student_daily: 60,
  regular_monthly: 950,
  student_monthly: 850,
};

let activated = false,
  mainBtn,
  subBtn;

document.addEventListener('ogfmsiAdminMainLoaded', async () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  if (!activated) {
    activated = true;
    mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
    subBtn = document.querySelector(`.section-sub-btn[data-section="${SECTION_NAME}"]`);

    mainBtn?.addEventListener('click', () => mainBtnFunction());
    subBtn?.classList.remove('hidden');
    subBtn?.addEventListener('click', () => {});

    await fetchAllCustomers();
    await fetchAllMonthlyCustomers();

    async function fetchAllCustomers() {
      try {
        const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const customers = await response.json();

        customers.result.forEach((customer) => {
          main.createAtSectionOne(
            SECTION_NAME,
            [
              'id_' + customer.customer_id,
              {
                type: 'object_contact',
                data: [
                  customer.customer_image_url,
                  customer.customer_first_name + ' ' + customer.customer_last_name,
                  customer.customer_contact,
                ],
              },
              main.fixText(customer.customer_type),
              main.fixText(customer.customer_rate),
              'custom_date_' + main.encodeDate(customer.created_at, 'long'),
            ],
            1,
            (createResult) => {
              if (customer.customer_type.includes('monthly')) {
                if (customer.customer_pending == 1) {
                  createResult.dataset.status = 'pending';
                  createResult.dataset.custom2 = main.fixText(customer.customer_type) + ' - Pending';
                } else {
                  createResult.dataset.status = 'active';
                  createResult.dataset.custom2 = main.fixText(customer.customer_type) + ' - Active';
                }
                createResult.children[2].textContent = createResult.dataset.custom2;
              } else {
                if (customer.customer_pending == 1) {
                  createResult.dataset.status = 'pending';
                }
              }
              const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
              customerProcessBtn.addEventListener('click', () =>
                customerProcessBtnFunction(createResult, main.decodeName(createResult.dataset.text))
              );
              const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
              customerEditDetailsBtn.addEventListener('click', () =>
                customerEditDetailsBtnFunction(createResult, main.decodeName(createResult.dataset.text))
              );
            }
          );
        });
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    }

    async function fetchAllMonthlyCustomers() {
      try {
        const response = await fetch(`${API_BASE_URL}/inquiry/customers/monthly`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const customers = await response.json();

        customers.result.forEach((customer) => {
          main.findAtSectionOne(SECTION_NAME, customer.customer_id, 'equal_id', 1, async (findResult) => {
            if (findResult) {
              const endDate = new Date(customer.customer_end_date);
              const today = new Date();
              endDate.setHours(0, 0, 0, 0);
              today.setHours(0, 0, 0, 0);
              const diffTime = endDate - today;
              const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (customer.customer_pending == 1) {
                payments.findPendingTransaction(findResult.dataset.id, (transactionId) => {
                  findResult.dataset.tid = transactionId;
                });
              } else {
                main.createAtSectionOne(
                  SECTION_NAME,
                  [
                    'id_' + customer.customer_id,
                    {
                      type: 'object_contact',
                      data: [findResult.dataset.image, findResult.dataset.text, findResult.dataset.contact],
                    },
                    main.encodeDate(customer.customer_start_date, 'long'),
                    main.encodeDate(customer.customer_end_date, 'long'),
                    daysLeft,
                    main.encodePrice(
                      customer.customer_months * PRICES_AUTOFILL[findResult.dataset.custom3.toLowerCase() + '_monthly']
                    ),
                    findResult.dataset.custom3,
                    'custom_date_' + main.encodeDate(customer.created_at, 'long'),
                  ],
                  2,
                  (createResult) => {
                    const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
                    customerProcessBtn.addEventListener('click', () =>
                      customerProcessBtnFunction(createResult, main.decodeName(createResult.dataset.text))
                    );
                    const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
                    customerEditDetailsBtn.addEventListener('click', () =>
                      customerEditDetailsBtnFunction(createResult, main.decodeName(createResult.dataset.text))
                    );
                  }
                );
              }
            }
          });
        });
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    }
  }
});

function mainBtnFunction(
  customer,
  image = '/src/images/client_logo.jpg',
  firstName = '',
  lastName = '',
  contact = '',
  customerType = 1,
  priceRate = 1
) {
  const isCreating = !customer;
  const inputs = {
    header: {
      title: `${isCreating ? 'Register New' : 'Edit'} Customer ${isCreating ? '' : 'Details'} ${getEmoji(isCreating ? '💪' : '⚙️', 26)}`,
      subtitle: `${isCreating ? 'Register new customer' : 'Edit customer details'} form`,
    },
    image: {
      src: `${isCreating ? image : customer.image}`,
      type: 'normal',
      short: [
        { placeholder: 'First name', value: `${isCreating ? firstName : customer.firstName}`, required: true },
        { placeholder: 'Last name', value: `${isCreating ? lastName : customer.lastName}`, required: true },
        { placeholder: 'Email / contact number', value: `${isCreating ? contact : customer.contact}` },
      ],
    },
    spinner: [
      {
        label: 'Customer type',
        placeholder: 'Select customer type',
        selected: `${isCreating ? customerType : customer.customerType}`,
        required: true,
        options: CUSTOMER_TYPE,
      },
      {
        label: 'Price rate',
        placeholder: 'Select price rate',
        selected: `${isCreating ? priceRate : customer.priceRate}`,
        required: true,
        options: PRICE_RATE,
      },
    ],
    footer: {
      main: `${isCreating ? mainBtn.innerHTML : `Update ${getEmoji('⚙️')}`}`,
      sub: `${isCreating ? `` : `Archive ${getEmoji('🧾')}`}`,
    },
  };

  main.findAtSectionOne(SECTION_NAME, customer?.id || '', 'equal_id', 2, (findResult) => {
    let isMonthlyCustomerAlready = false;
    if (findResult) {
      isMonthlyCustomerAlready = true;
      inputs.spinner[0].locked = true;
    }

    main.openModal(
      mainBtn,
      inputs,
      (result) => {
        if (!isCreating && checkIfSameData(result, customer)) {
          main.toast('You must change anything!', 'error');
          return;
        }

        if (!isCreating && customer.tid) {
          main.toast(`${PENDING_TRANSACTION_MESSAGE} ${customer.tid}`, 'error');
          return;
        }

        const image = result.image.src;
        const [firstName, lastName, contact] = result.image.short.map((item) => item.value);
        const name = main.encodeName(firstName, lastName);
        const customerType = main.getSelectedSpinner(result.spinner[0]);
        const priceRate = main.getSelectedSpinner(result.spinner[1]);

        const columnsData = [
          'id_' + (isCreating ? 'U_random' : customer.id),
          {
            type: 'object_contact',
            data: [image, name, contact],
          },
          main.fixText(customerType),
          main.fixText(priceRate),
          'custom_date_' + (isCreating ? 'today' : customer.date),
        ];

        const goBackCallback = () => {
          if (isCreating) {
            mainBtnFunction(null, image, firstName, lastName, contact, customerType, priceRate);
          } else {
            customer = {
              id: customer.id,
              image,
              firstName,
              lastName,
              contact,
              customerType,
              priceRate,
              date: customer.date,
              tid: customer.tid,
            };
            mainBtnFunction(customer);
          }
        };

        main.findAtSectionOne(SECTION_NAME, name, 'equal_text', 1, (findResult) => {
          if (findResult && findResult.dataset.id != customer?.id) {
            const { _, __, fullName } = main.decodeName(findResult.dataset.text);

            main.openConfirmationModal(
              `Data duplication - Customer with same details:<br><br>ID: ${findResult.dataset.id}<br>Name: ${fullName}`,
              () => {
                main.closeConfirmationModal(() => {
                  validateCustomer(columnsData, goBackCallback, null, true, !isMonthlyCustomerAlready);
                });
              }
            );
            return;
          }

          validateCustomer(columnsData, goBackCallback, null, true, !isMonthlyCustomerAlready);
        });
      },
      () => {
        main.openConfirmationModal('Archive customer. Cannot be undone.<br><br>ID: ' + customer.id, () => {
          main.findAtSectionOne(SECTION_NAME, customer.id, 'equal_id', 1, (findResult) => {
            if (findResult) {
              if (findResult.dataset.tid) payments.cancelCheckinPayment(findResult.dataset.tid);
              const columnsData = [
                'id_' + customer.id,
                {
                  type: 'object_contact',
                  data: [customer.image, main.encodeName(customer.firstName, customer.lastName), customer.contact],
                },
                'custom_datetime_today',
              ];
              main.createAtSectionOne(SECTION_NAME, columnsData, 4, (createResult) => {
                main.createNotifDot(SECTION_NAME, 4);
                main.deleteAtSectionOne(SECTION_NAME, 1, customer.id);

                const customerDetailsBtn = createResult.querySelector(`#customerDetailsBtn`);
                customerDetailsBtn.addEventListener('click', () =>
                  customerDetailsBtnFunction(customer.id, 'Archive Details', '🧾')
                );
              });
            }
          });
          archiveLoop(customer.id);
          main.toast(`Successfully archived customer!`, 'error');
          main.closeConfirmationModal();
          main.closeModal();

          function archiveLoop(customerId) {
            main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 2, (deleteResult) => {
              if (deleteResult) {
                main.deleteAtSectionOne(SECTION_NAME, 2, customerId);
                archiveLoop(customerId);
              }
            });
          }
        });
      }
    );
  });
}

function checkIfSameData(newData, oldData) {
  return (
    newData.image.src == oldData.image &&
    newData.image.short[0].value == oldData.firstName &&
    newData.image.short[1].value == oldData.lastName &&
    newData.image.short[2].value == oldData.contact &&
    main.fixText(main.getSelectedSpinner(newData.spinner[0])) == oldData.customerType &&
    main.fixText(main.getSelectedSpinner(newData.spinner[1])) == oldData.priceRate
  );
}

const STUDENT_VERIFICATION_MESSAGE = `Verification of student discount rate via:<br><br>${getEmoji('📌')} Student ID's picture matches the customer's face<br>${getEmoji('📌')} Student ID's school name is legitimate<br>${getEmoji('📌')} Student ID's validity duration still not expired yet`;

function validateCustomer(
  columnsData,
  goBackCallback,
  renewalData = null,
  checkPriceRate = true,
  checkCustomerType = true
) {
  const priceRate = columnsData[3].toLowerCase();
  if (checkPriceRate) {
    if (priceRate.toLowerCase().includes('student')) {
      main.openConfirmationModal(STUDENT_VERIFICATION_MESSAGE, () => {
        validateCustomer(columnsData, goBackCallback, renewalData, false, checkCustomerType);
        main.closeConfirmationModal();
      });
      return;
    }
  }

  const customerType = columnsData[2].toLowerCase();
  if (checkCustomerType) {
    if (customerType.toLowerCase().includes('monthly')) {
      main.closeModal(() => {
        const startDate = main.encodeDate(new Date(), '2-digit');
        let renewalStartDate = new Date(renewalData?.endDate);
        renewalStartDate.setDate(renewalStartDate.getDate() + 1);
        if (renewalData) renewalStartDate = main.encodeDate(renewalStartDate, '2-digit');
        const inputs = {
          header: {
            title: `${renewalData ? 'Renew' : 'Register New'} Monthly Customer ${getEmoji('🎫', 26)}`,
            subtitle: `Customer monthly ${renewalData ? 'renewal' : 'registration'} form`,
          },
          short: [
            {
              placeholder: 'Total price:',
              value: main.encodePrice(PRICES_AUTOFILL[`${priceRate}_monthly`]),
              locked: true,
            },
            { placeholder: 'Price rate:', value: main.fixText(priceRate), locked: true },
            {
              placeholder: 'Date range:',
              value: '',
              locked: true,
            },
            {
              placeholder: 'Start date (mm-dd-yyyy):',
              value: `${renewalData ? renewalStartDate : startDate}`,
              calendar: true,
              required: true,
            },
            {
              placeholder: 'Month duration:',
              value: 1,
              required: true,
              live: '1| 2:range',
              listener: activeShortListener,
            },
          ],
          footer: {
            main: `Process Payment ${getEmoji('🔏')}`,
            sub: `Go Back`,
          },
        };

        main.openModal(
          'blue',
          inputs,
          (result) => {
            const startDate = result.short[3].value;
            if (!main.isValidDate(startDate) || main.isPastDate(startDate)) {
              main.toast(`Invalid start date: ${startDate}`, 'error');
              return;
            }
            const months = +result.short[4].value;
            if (!main.isValidPaymentAmount(months)) {
              main.toast(`Invalid days: ${months}`, 'error');
              return;
            }
            const price = main.decodePrice(result.short[0].value);

            const [month, day, year] = startDate.split('-').map(Number);
            const startDateObj = new Date(year, month - 1, day);
            const endDateObj = new Date(startDateObj);
            endDateObj.setDate(endDateObj.getDate() + months * 30);
            const endDate = endDateObj.toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            });
            const { firstName, lastName, fullName } = main.decodeName(columnsData[1].data[1]);
            main.openConfirmationModal(
              `Monthly ${renewalData ? 'renewal' : 'registration'} details:<br><br><span class="text-lg">${fullName}</span><br>from ${main.decodeDate(startDate)}<br>to ${main.decodeDate(endDate)}<br>lasts ${months * 30} days<br>total price: ${main.encodePrice(price)}`,
              () => {
                main.closeConfirmationModal();
                columnsData[2] += ' - Pending';
                registerNewCustomer(columnsData, true, price, priceRate, async (createResult) => {
                  createResult.dataset.startdate = main.encodeDate(startDate, 'long');
                  createResult.dataset.enddate = main.encodeDate(endDate.replace(/\//g, '-'), 'long');
                  createResult.dataset.days = months * 30;
                  createResult.dataset.status = 'pending';

                  try {
                    const response = await fetch(`${API_BASE_URL}/inquiry/customers/monthly`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        customer_id: createResult.dataset.id,
                        customer_start_date: main.encodeDate(startDate.replace(/\//g, '-'), '2-digit'),
                        customer_end_date: main.encodeDate(endDate.replace(/\//g, '-'), '2-digit'),
                        customer_months: months,
                        customer_pending: 1,
                      }),
                    });

                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const createdCustomer = await response.json();
                    console.log('Monthly customer created:', createdCustomer);
                  } catch (error) {
                    console.error('Error creating monthly customer:', error);
                  }
                });
              }
            );
          },
          () => {
            main.closeModal(() => {
              goBackCallback();
            });
          }
        );
      });
      return;
    }
  } else {
    columnsData[2] += ' - Active';
  }

  registerNewCustomer(
    columnsData,
    customerType.toLowerCase().includes('monthly'),
    PRICES_AUTOFILL[`${priceRate}_daily`],
    main.getSelectedSpinner(priceRate)
  );
}

function activeShortListener(monthInput, container) {
  const totalPriceInput = container.querySelector(`#input-short-5`);
  const priceRateInput = container.querySelector(`#input-short-6`);
  totalPriceInput.value = main.encodePrice(
    +PRICES_AUTOFILL[`${priceRateInput.value.toLowerCase()}_monthly`] * +monthInput.value
  );
  totalPriceInput.dispatchEvent(new Event('input'));
}

function registerNewCustomer(columnsData, isMonthlyCustomer, amount, priceRate, callback = () => {}) {
  const customerId = columnsData[0].split('_')[1];
  const { firstName } = main.decodeName(columnsData[1].data[1]);
  main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 1, (findResult) => {
    let isCreating = true;
    if (findResult) {
      isCreating = false;
    }
    main.toast(`${firstName}, successfully ${isCreating ? 'registered' : 'updated'}!`, 'success');
    if (isCreating) {
      main.createAtSectionOne(SECTION_NAME, columnsData, 1, async (createResult) => {
        if (isMonthlyCustomer) {
          if (callback) {
            callback(createResult);
            processCheckinPayment(createResult, isMonthlyCustomer, amount, priceRate);
          }
        } else {
          main.closeModal();
        }
        const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
        customerProcessBtn.addEventListener('click', () =>
          customerProcessBtnFunction(createResult, main.decodeName(createResult.dataset.text))
        );
        const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
        customerEditDetailsBtn.addEventListener('click', () =>
          customerEditDetailsBtnFunction(createResult, main.decodeName(createResult.dataset.text))
        );

        const [customer_id, customer_image_url, customer_contact, customerType, priceRate] = [
          createResult.dataset.id,
          createResult.dataset.image,
          createResult.dataset.contact,
          createResult.dataset.custom2,
          createResult.dataset.custom3,
        ];
        const { firstName, lastName } = main.decodeName(createResult.dataset.text);

        try {
          const response = await fetch(`${API_BASE_URL}/inquiry/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer_id,
              customer_image_url,
              customer_first_name: firstName,
              customer_last_name: lastName,
              customer_contact,
              customer_type: customerType.includes('Monthly') ? 'monthly' : 'daily',
              customer_pending: customerType.includes('Pending') ? 1 : 0,
              customer_rate: priceRate.toLowerCase(),
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const newCustomer = await response.json();
          console.log('New customer created:', newCustomer);
        } catch (error) {
          console.error('Error creating customer:', error);
        }
      });
    } else {
      updateCustomer(columnsData, findResult, 1);
      if (isMonthlyCustomer) {
        callback(findResult);
        processCheckinPayment(findResult, true, amount, priceRate);
      } else {
        if (findResult.dataset.tid) payments.cancelCheckinPayment(findResult.dataset.tid);
        main.closeModal();
      }
    }
  });
  if (isMonthlyCustomer) {
    main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 2, (findResult) => {
      if (findResult) {
        updateCustomer(columnsData, findResult, 2);
      }
    });
  }
}

function updateCustomer(newData, oldData, tabIndex) {
  oldData.dataset.image = newData[1].data[0];
  oldData.dataset.text = newData[1].data[1];
  oldData.dataset.contact = newData[1].data[2];
  const { firstName, lastName, fullName } = main.decodeName(newData[1].data[1]);
  oldData.children[1].children[0].children[0].src = newData[1].data[0];
  oldData.children[1].children[0].children[1].textContent = fullName;

  switch (tabIndex) {
    case 1:
      oldData.dataset.custom2 = newData[2];
      oldData.dataset.custom3 = newData[3];
      oldData.children[2].innerHTML = newData[2];
      oldData.children[3].innerHTML = newData[3];
      break;
    case 2:
      break;
  }
}

function autoChangeButtonText(title, button, text) {
  switch (title.toLowerCase()) {
    case 'check-in':
      button.innerHTML = text;
      break;
    case 'renew':
    case 'monthly':
    case 'reserve':
      button.innerHTML = `Initiate Process ${getEmoji('📒')}`;
      break;
  }
}

function customerProcessBtnFunction(customer, { firstName, lastName, fullName }) {
  const isMonthlyCustomer = customer.dataset.custom2.toLowerCase().includes('active');
  const inputs = {
    header: {
      title: `Initiate Customer Process ${getEmoji('📒', 26)}`,
    },
    short: [{ placeholder: 'Customer details', value: `${fullName} (${customer.dataset.id})`, locked: true }],
    radio: [
      { label: 'Process options', selected: 1, autoformat: { type: 'footer:sub', text: `Check-in ${getEmoji('📘')}` } },
      {
        icon: `${getEmoji('📘', 26)}`,
        title: 'Check-in',
        subtitle: 'Check-in this customer for today',
        listener: (title, button, text) => {
          if (isMonthlyCustomer) autoChangeButtonText(title, button, text);
        },
      },
      {
        icon: `${getEmoji('🎫', 26)}`,
        title: `${isMonthlyCustomer ? 'Renew' : 'Monthly'}`,
        subtitle: `${isMonthlyCustomer ? 'Monthly renewal' : 'Register this customer to monthly'}`,
        listener: autoChangeButtonText,
      },
      {
        icon: `${getEmoji('🛕', 26)}`,
        title: 'Reserve',
        subtitle: 'Reserve facility with this customer',
        listener: autoChangeButtonText,
      },
    ],
    footer: {
      main: isMonthlyCustomer ? `Check-in ${getEmoji('📘')}` : `Initiate Process ${getEmoji('📒')}`,
    },
  };

  continueCustomerProcessBtnFunction();

  function continueCustomerProcessBtnFunction() {
    main.openModal('yellow', inputs, (result) => {
      const isMonthlyCustomer = customer.dataset.custom2.toLowerCase().includes('monthly');
      const isPending = customer.dataset.custom2.toLowerCase().includes('pending');
      const priceRate = customer.dataset.custom3.toLowerCase();
      let amount =
        isMonthlyCustomer && isPending
          ? PRICES_AUTOFILL[`${priceRate}_${customer.dataset.custom2.toLowerCase().split(' - ')[0]}`]
          : isMonthlyCustomer
            ? 0
            : PRICES_AUTOFILL[`${priceRate}_${customer.dataset.custom2.toLowerCase()}`];
      const selectedProcess = main.getSelectedRadio(result.radio).toLowerCase();
      if ((isMonthlyCustomer && isPending) || (!isMonthlyCustomer && customer.dataset.tid)) {
        payments.pendingTransaction(customer.dataset.tid, (pendingResult) => {
          if (pendingResult) {
            const purpose = pendingResult.dataset.custom2.toLowerCase();
            if (!isMonthlyCustomer && purpose.includes('daily') && selectedProcess.includes('check-in')) {
              successPending();
            } else if (
              purpose.includes('monthly') &&
              (selectedProcess.includes('monthly') || selectedProcess.includes('renew'))
            ) {
              successPending();
            } else {
              failedPending();
            }

            function successPending() {
              main.closeModal(() => {
                payments.continueProcessCheckinPayment(customer.dataset.tid, fullName);
              });
            }

            function failedPending() {
              main.toast(`${PENDING_TRANSACTION_MESSAGE} ${customer.dataset.tid}`, 'error');
            }
          }
        });
      } else {
        if (selectedProcess.includes('check-in')) {
          checkins.findLogCheckin(customer.dataset.id, isMonthlyCustomer ? 2 : 1, (findLogResult) => {
            if (findLogResult) {
              const logDate = findLogResult.dataset.datetime.split(' - ')[0];
              const logDateObj = new Date(logDate);
              const today = new Date();
              const isToday =
                logDateObj.getFullYear() === today.getFullYear() &&
                logDateObj.getMonth() === today.getMonth() &&
                logDateObj.getDate() === today.getDate();
              if (isToday) {
                main.openConfirmationModal(
                  `Customer already checked-in today:<br><br><span class="text-lg">${fullName}</span><br>ID: ${customer.dataset.id}<br>${findLogResult.dataset.datetime}`,
                  () => {
                    continueCheckinProcess();
                    main.closeConfirmationModal();
                  }
                );
                return;
              }
            }
            continueCheckinProcess();

            function continueCheckinProcess() {
              if (isMonthlyCustomer && !isPending) {
                checkins.logCheckin(customer.dataset.tid, customer, 2, true);
                return;
              } else {
                processCheckinPayment(customer, isMonthlyCustomer, amount, priceRate);
              }
            }
          });

          return;
        }
        if (selectedProcess.includes('monthly') || selectedProcess.includes('renew')) {
          const columnsData = [
            'id_' + customer.dataset.id,
            {
              type: 'object_contact',
              data: [customer.dataset.image, customer.dataset.text, customer.dataset.contact],
            },
            'Monthly',
            customer.dataset.custom3,
            'custom_date_' + customer.dataset.date,
          ];
          validateCustomer(
            columnsData,
            continueCustomerProcessBtnFunction,
            selectedProcess.includes('renew')
              ? {
                  startDate: main.encodeDate(customer.dataset.startdate, 'long'),
                  endDate: main.encodeDate(customer.dataset.enddate, 'long'),
                  days: customer.dataset.days,
                }
              : null,
            true,
            true
          );
          return;
        }
        if (selectedProcess.includes('reserve')) {
          main.sharedState.reserveCustomerId = customer.dataset.id;
          main.closeModal(() => {
            reservations.reserveCustomer();
          });
        }
      }
    });
  }
}

function customerEditDetailsBtnFunction(customer, { firstName, lastName, fullName }) {
  const customerData = {
    id: customer.dataset.id,
    image: customer.dataset.image,
    firstName,
    lastName,
    contact: customer.dataset.contact,
    customerType: customer.dataset.custom2.split(' - ')[0],
    priceRate: customer.dataset.custom3,
    date: customer.dataset.date,
    tid: customer.dataset.tid,
  };
  mainBtnFunction(customerData);
}

function processCheckinPayment(customer, isMonthlyCustomer, amount, priceRate) {
  const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);
  main.toast(`${firstName}, is now ready for check-in payment!`, 'success');
  main.closeModal(() => {
    payments.processCheckinPayment(
      customer.dataset.id,
      customer.dataset.image,
      fullName,
      isMonthlyCustomer,
      amount,
      main.getSelectedOption(priceRate, PRICE_RATE),
      (transactionId) => {
        customer.dataset.tid = transactionId;
      }
    );
  });
}

export function completeCheckinPayment(transactionId, amountPaid, priceRate) {
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', 1, (findResult1) => {
    if (findResult1) {
      const customerType = findResult1.dataset.custom2.split(' - ')[0];
      const isMonthlyCustomer = customerType.toLowerCase().includes('monthly');
      if (isMonthlyCustomer) {
        findResult1.dataset.custom2 = customerType + ' - Active';
        findResult1.children[2].textContent = findResult1.dataset.custom2;
        findResult1.dataset.status = 'active';
        findResult1.dataset.tid = '';

        const columnsData = [
          'id_' + findResult1.dataset.id,
          {
            type: 'object_contact',
            data: [findResult1.dataset.image, findResult1.dataset.text, findResult1.dataset.contact],
          },
          main.encodeDate(findResult1.dataset.startdate, 'long'),
          main.encodeDate(findResult1.dataset.enddate, 'long'),
          findResult1.dataset.days + ' day' + (+findResult1.dataset.days > 1 ? 's' : ''),
          main.formatPrice(amountPaid),
          main.fixText(priceRate),
          'custom_datetime_today',
        ];

        main.createAtSectionOne(SECTION_NAME, columnsData, 2, (createResult) => {
          main.createNotifDot(SECTION_NAME, 2);

          const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
          customerProcessBtn.addEventListener('click', () =>
            customerProcessBtnFunction(findResult1, main.decodeName(findResult1.dataset.text))
          );
          const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
          customerEditDetailsBtn.addEventListener('click', () =>
            customerEditDetailsBtnFunction(findResult1, main.decodeName(findResult1.dataset.text))
          );
        });

        main.showSection(SECTION_NAME);
      } else {
        findResult1.dataset.tid = '';
        checkins.logCheckin(transactionId, findResult1, 1, true);
      }
    }
  });
}

export function customerDetailsBtnFunction(customerId, title, emoji) {
  main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 1, (findResult1) => {
    if (findResult1) {
      continueCustomerDetailsBtnFunction(findResult1);
    } else {
      main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 4, (findResult2) => {
        if (findResult2) {
          continueCustomerDetailsBtnFunction(findResult2);
        } else {
          main.toast("There's no customer with that customer ID anymore!", 'error');
        }
      });
    }
  });

  function continueCustomerDetailsBtnFunction(customer) {
    const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);
    const inputs = {
      header: {
        title: `${title} ${getEmoji(emoji, 26)}`,
        subtitle: `Customer ID: ${customerId}`,
      },
      image: {
        src: customer.dataset.image,
        type: 'normal',
        locked: true,
        short: [
          { placeholder: 'First name', value: firstName, locked: true },
          { placeholder: 'Last name', value: lastName, locked: true },
          { placeholder: 'Email / contact number', value: customer.dataset.contact, locked: true },
        ],
      },
      short: [
        { placeholder: 'Actor ID', value: 'U288343611137', locked: true },
        { placeholder: 'Actor name', value: 'Jestley', locked: true },
        { placeholder: 'Actor role', value: 'Admin', locked: true },
      ],
      footer: {
        main: `Exit View`,
      },
    };
    main.openModal('gray', inputs, (result) => {
      main.closeModal();
    });
  }
}

export function cancelPendingTransaction(transactionId) {
  cancelPendingTransactionLoop(1);

  function cancelPendingTransactionLoop(tabIndex) {
    main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', tabIndex, (findResult) => {
      if (findResult) {
        findResult.dataset.tid = '';
        if (findResult.dataset.status == 'pending') {
          findResult.dataset.startdate = '';
          findResult.dataset.enddate = '';
          findResult.dataset.days = '';
          findResult.dataset.status = '';

          findResult.dataset.custom2 = main.fixText(CUSTOMER_TYPE[0].value);
          findResult.children[2].innerHTML = findResult.dataset.custom2;
        }
        cancelPendingTransactionLoop(2);
      } else if (tabIndex == 1) {
        cancelPendingTransactionLoop(2);
      }
    });
  }
}

export function getReserveCustomer(callback = () => {}) {
  main.findAtSectionOne(SECTION_NAME, main.sharedState.reserveCustomerId, 'equal_id', 1, (result) => {
    callback(result);
  });
}

export default { completeCheckinPayment, customerDetailsBtnFunction, cancelPendingTransaction, getReserveCustomer };
