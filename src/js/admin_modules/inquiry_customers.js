import main from '../admin_main.js';
import checkins from './inquiry_checkins.js';
import payments from './payments.js';

const SECTION_NAME = 'inquiry-customers';

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

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  if (!activated) {
    activated = true;
    mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
    subBtn = document.querySelector(`.section-sub-btn[data-section="${SECTION_NAME}"]`);

    mainBtn?.addEventListener('click', () => mainBtnFunction());
    subBtn?.classList.remove('hidden');
    subBtn?.addEventListener('click', () => {});
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
        label: 'Price rate',
        placeholder: 'Select price rate',
        selected: `${isCreating ? priceRate : customer.priceRate}`,
        required: true,
        options: PRICE_RATE,
      },
      {
        label: 'Customer type',
        placeholder: 'Select customer type',
        selected: `${isCreating ? customerType : customer.customerType}`,
        required: true,
        options: CUSTOMER_TYPE,
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
      inputs.spinner[1].locked = true;
    }

    main.openModal(
      mainBtn,
      inputs,
      (result) => {
        if (!isCreating && checkIfSameData(result, customer)) {
          main.toast('You must change anything!', 'error');
          return;
        }

        const image = result.image.src;
        const [firstName, lastName, contact] = result.image.short.map((item) => item.value);
        const name = main.encodeName(firstName, lastName);
        const customerType = main.getSelectedSpinner(result.spinner[1]);
        const priceRate = main.getSelectedSpinner(result.spinner[0]);

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
            };
            mainBtnFunction(customer);
          }
        };

        main.findAtSectionOne(SECTION_NAME, name, 'equal_text', 1, (findResult) => {
          if (findResult && findResult.dataset.id != customer?.id) {
            const { _, __, fullName } = main.decodeName(findResult.dataset.text);

            main.openConfirmationModal(
              `Data duplication - Customer with same details:<br><br>• ID: ${findResult.dataset.id}<br>• Name: ${fullName}`,
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
        main.openConfirmationModal('Archive customer. Cannot be undone.<br><br>• ID: ' + customer.id, () => {
          main.findAtSectionOne(SECTION_NAME, customer.id, 'equal_id', 1, (findResult) => {
            if (findResult) {
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
    main.fixText(main.getSelectedSpinner(newData.spinner[1])) == oldData.customerType &&
    main.fixText(main.getSelectedSpinner(newData.spinner[0])) == oldData.priceRate
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
              placeholder: 'Days duration:',
              value: 30,
              required: true,
              live: '1-2:range',
            },
            {
              placeholder: 'Price:',
              value: main.encodePrice(PRICES_AUTOFILL[`${priceRate}_monthly`]),
              locked: true,
            },
            { placeholder: 'Price rate:', value: main.fixText(priceRate), locked: true },
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
            const startDate = result.short[1].value;
            if (!main.isValidDate(startDate) || main.isPastDate(startDate)) {
              main.toast(`Invalid start date: ${startDate}`, 'error');
              return;
            }
            const days = result.short[2].value;
            if (!main.isValidPaymentAmount(+days)) {
              main.toast(`Invalid days: ${days}`, 'error');
              return;
            }
            const price = +main.decodePrice(result.short[3].value);
            if (!main.isValidPaymentAmount(price)) {
              main.toast(`Invalid price: ${price}`, 'error');
              return;
            }

            const [month, day, year] = startDate.split('-').map(Number);
            const startDateObj = new Date(year, month - 1, day);
            const endDateObj = new Date(startDateObj);
            endDateObj.setDate(endDateObj.getDate() + +days);
            const endDate = endDateObj.toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            });
            const { firstName, lastName, fullName } = main.decodeName(columnsData[1].data[1]);
            main.openConfirmationModal(
              `Monthly registration details:<br><br><span class="text-lg">${fullName}</span><br>from ${main.decodeDate(startDate)}<br>to ${main.decodeDate(endDate)}<br>lasts ${days} day${days > 1 ? 's' : ''}`,
              () => {
                main.closeConfirmationModal();
                columnsData[2] += ' - Pending';
                registerNewCustomer(columnsData, true, price, priceRate, (createResult) => {
                  createResult.dataset.startdate = startDate;
                  createResult.dataset.enddate = endDate.replace(/\//g, '-');
                  createResult.dataset.days = days;
                  createResult.dataset.status = 'pending';
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
      main.createAtSectionOne(SECTION_NAME, columnsData, 1, (createResult) => {
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
      });
    } else {
      updateCustomer(columnsData, findResult, 1);
      if (isMonthlyCustomer) {
        callback(findResult);
        processCheckinPayment(findResult, true, amount, priceRate);
      } else {
        payments.voidCheckinPayment(findResult.dataset.tid);
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

function customerProcessBtnFunction(customer, { firstName, lastName, fullName }) {
  const isMonthlyCustomer = customer.dataset.custom2.toLowerCase().includes('active');
  const inputs = {
    header: {
      title: `Initiate Customer Process ${getEmoji('📒', 26)}`,
    },
    short: [{ placeholder: 'Customer details', value: `${fullName} (${customer.dataset.id})`, locked: true }],
    radio: [
      { label: 'Process options', selected: 1 },
      {
        icon: `${getEmoji('📘', 26)}`,
        title: 'Check-in',
        subtitle: 'Check-in this customer for today',
      },
      {
        icon: `${getEmoji('🎫', 26)}`,
        title: `${isMonthlyCustomer ? 'Renew' : 'Monthly'}`,
        subtitle: `${isMonthlyCustomer ? 'Monthly renewal' : 'Register this customer to monthly'}`,
      },
      {
        icon: `${getEmoji('🛕', 26)}`,
        title: 'Reserve',
        subtitle: 'Reserve facility with this customer',
      },
    ],
    footer: {
      main: `Initiate Process ${getEmoji('📒')}`,
    },
  };

  continueCustomerProcessBtnFunction();

  function continueCustomerProcessBtnFunction() {
    main.openModal('yellow', inputs, (result) => {
      const isMonthlyCustomer = customer.dataset.custom2.toLowerCase().includes('monthly');
      const isPending = customer.dataset.custom2.toLowerCase().includes('pending');
      const priceRate = customer.dataset.custom3.toLowerCase();
      const amount =
        isMonthlyCustomer && isPending
          ? PRICES_AUTOFILL[`${priceRate}_${customer.dataset.custom2.toLowerCase().split(' - ')[0]}`]
          : isMonthlyCustomer
            ? 0
            : PRICES_AUTOFILL[`${priceRate}_${customer.dataset.custom2.toLowerCase()}`];
      if ((isMonthlyCustomer && isPending) || (!isMonthlyCustomer && customer.dataset.tid)) {
        main.findAtSectionOne('payments', customer.dataset.tid, 'equal_id', 1, (findResult) => {
          if (findResult) {
            main.toast(
              `Please complete pending transaction first at Payments module: ${customer.dataset.tid}`,
              'error'
            );
          }
        });
      } else {
        const selectedProcess = main.getSelectedRadio(result.radio);
        if (selectedProcess.toLowerCase().includes('check-in')) {
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
        if (selectedProcess.toLowerCase().includes('monthly') || selectedProcess.toLowerCase().includes('renew')) {
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
            selectedProcess.toLowerCase().includes('renew')
              ? {
                  startDate: customer.dataset.startdate,
                  endDate: customer.dataset.enddate,
                  days: customer.dataset.days,
                }
              : null,
            true,
            true
          );
          return;
        }
        main.closeModal();
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
  };
  mainBtnFunction(customerData);
}

function processCheckinPayment(customer, isMonthlyCustomerPending, amount, priceRate) {
  const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);
  main.toast(`${firstName}, is now ready for check-in payment!`, 'success');
  main.closeModal(() => {
    payments.processCheckinPayment(
      customer.dataset.id,
      customer.dataset.image,
      fullName,
      isMonthlyCustomerPending,
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

        const columnsData = [
          'id_' + findResult1.dataset.id,
          {
            type: 'object_contact',
            data: [findResult1.dataset.image, findResult1.dataset.text, findResult1.dataset.contact],
          },
          findResult1.dataset.startdate,
          findResult1.dataset.enddate,
          findResult1.dataset.days + ' day' + (+findResult1.dataset.days > 1 ? 's' : ''),
          main.formatPrice(amountPaid),
          main.fixText(priceRate),
          'custom_datetime_today'
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
        // checkins.logCheckin(transactionId, findResult1, 2, false);
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

export default { completeCheckinPayment, customerDetailsBtnFunction };
