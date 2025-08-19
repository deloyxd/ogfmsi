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

const CHECKIN_PASS_TYPE = [
  {
    value: 'daily',
    label: 'Daily Pass',
  },
  {
    value: 'monthly',
    label: 'Monthly Pass',
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
  image = '/src/images/client_logo.jpg',
  firstName = '',
  lastName = '',
  contact = '',
  checkinPassType = 1,
  priceRate = 1
) {
  const inputs = {
    header: {
      title: `Register New Customer ${getEmoji('💪', 26)}`,
      subtitle: 'New customer form',
    },
    image: {
      src: image,
      type: 'normal',
      short: [
        { placeholder: 'First name', value: firstName, required: true },
        { placeholder: 'Last name', value: lastName, required: true },
        { placeholder: 'Email / contact number', value: contact },
      ],
    },
    spinner: [
      {
        label: 'Price rate',
        placeholder: 'Select price rate',
        selected: priceRate,
        required: true,
        options: PRICE_RATE,
      },
      {
        label: 'Check-in pass type',
        placeholder: 'Select check-in pass type',
        selected: checkinPassType,
        required: true,
        options: CHECKIN_PASS_TYPE,
      },
    ],
  };

  main.openModal(mainBtn, inputs, (result) => {
    const image = result.image.src;
    const [firstName, lastName, contact] = result.image.short.map((item) => item.value);
    const name = main.encodeName(firstName, lastName);
    const checkinPassType = main.getSelectedSpinner(result.spinner[1]);
    const priceRate = main.getSelectedSpinner(result.spinner[0]);

    const columnsData = [
      'id_U_random',
      {
        type: 'object_contact',
        data: [image, name, contact],
      },
      main.fixText(checkinPassType),
      main.fixText(priceRate),
      'custom_date_today',
    ];

    const goBackCallback = () => {
      mainBtnFunction(image, firstName, lastName, contact, checkinPassType, priceRate);
    };

    main.findAtSectionOne(SECTION_NAME, name, 'equal_text', 1, (findResult) => {
      if (findResult) {
        const { _, __, fullName } = main.decodeName(findResult.dataset.text);

        main.openConfirmationModal(
          `Data duplication - Customer with same details:<br><br>• ID: ${findResult.dataset.id}<br>• Name: ${fullName}`,
          () => {
            main.closeConfirmationModal(() => {
              validateRegisterNewCustomer(columnsData, goBackCallback);
            });
          }
        );
        return;
      }

      validateRegisterNewCustomer(columnsData, goBackCallback);
    });
  });
}

const STUDENT_VERIFICATION_MESSAGE = `Verification of student discount rate via:<br><br>${getEmoji('📌')} Student ID's picture matches the customer's face<br>${getEmoji('📌')} Student ID's school name is legitimate<br>${getEmoji('📌')} Student ID's validity duration still not expired yet`;

function validateRegisterNewCustomer(columnsData, goBackCallback, checkPriceRate = true) {
  const priceRate = columnsData[3].toLowerCase();
  if (checkPriceRate) {
    if (priceRate.toLowerCase().includes('student')) {
      main.openConfirmationModal(STUDENT_VERIFICATION_MESSAGE, () => {
        validateRegisterNewCustomer(columnsData, goBackCallback, false);
        main.closeConfirmationModal();
      });
      return;
    }
  }

  const checkinPassType = columnsData[2].toLowerCase();
  if (checkinPassType.toLowerCase().includes('monthly')) {
    main.closeModal(() => {
      const { startDate: startDateNumeric } = main.getStartAndEndDates('2-digit');
      const { startDate: startDateLong, endDate: endDateLong } = main.getStartAndEndDates('long');
      const inputs = {
        header: {
          title: `Register New Monthly Pass Customer ${getEmoji('🤩', 26)}`,
          subtitle: 'New monthly pass customer form',
        },
        short: [
          {
            placeholder: 'Date range:',
            value: `from ${startDateLong} to ${endDateLong}`,
            locked: true,
          },
          {
            placeholder: 'Start date (mm-dd-yyyy):',
            value: startDateNumeric,
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
            value: PRICES_AUTOFILL[`${priceRate}_monthly`],
            required: true,
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
          if (!main.isValidDate(startDate)) {
            main.toast(`Invalid start date: ${startDate}`, 'error');
            return;
          }
          const days = result.short[2].value;
          if (!main.isValidPaymentAmount(+days)) {
            main.toast(`Invalid days: ${days}`, 'error');
            return;
          }
          const price = +result.short[3].value;
          if (!main.isValidPaymentAmount(price)) {
            main.toast(`Invalid price: ${price}`, 'error');
            return;
          }
          const daysChanged = days != 30;
          const priceChanged = price != PRICES_AUTOFILL[`${priceRate}_monthly`];
          if (daysChanged || priceChanged) {
            main.openConfirmationModal(
              `Monthly pass ${daysChanged ? 'days' : ''}${daysChanged && priceChanged ? ' and ' : ''}${priceChanged ? 'price' : ''}:<br>${daysChanged ? `<br>• ${days} days` : ''}${priceChanged ? `<br>• ${main.encodePrice(price)}` : ''}`,
              () => {
                continueMonthlyPassProcess(columnsData, true, price, priceRate);
                main.closeConfirmationModal();
              }
            );
            return;
          }
          continueMonthlyPassProcess(columnsData, true, price, priceRate);

          function continueMonthlyPassProcess(columnsData, isMonthlyPassCustomer, price, priceRate) {
            const [month, day, year] = startDate.split('-').map(Number);
            const startDateObj = new Date(year, month - 1, day);
            const endDateObj = new Date(startDateObj);
            endDateObj.setDate(endDateObj.getDate() + +days);
            const endDate = endDateObj.toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            });
            registerNewCustomer(columnsData, isMonthlyPassCustomer, price, priceRate, (createResult) => {
              createResult.dataset.startdate = startDate;
              createResult.dataset.enddate = endDate.replace('/', '-');
              createResult.dataset.days = days;
              createResult.dataset.status = 'pending';
            });
          }
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

  registerNewCustomer(columnsData, false, PRICES_AUTOFILL[`${priceRate}_daily`], main.getSelectedSpinner(priceRate));
}

function registerNewCustomer(columnsData, isMonthlyPassCustomer, amount, priceRate, callback) {
  const { firstName } = main.decodeName(columnsData[1].data[1]);
  if (isMonthlyPassCustomer) {
    columnsData[2] += ' - Pending';
  }
  main.createAtSectionOne(SECTION_NAME, columnsData, 1, (createResult) => {
    main.toast(`${firstName}, successfully registered!`, 'success');
    if (isMonthlyPassCustomer) {
      callback(createResult);
      processCheckinPayment(createResult, isMonthlyPassCustomer, amount, priceRate);
    }
    const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
    customerProcessBtn.addEventListener('click', () => customerProcessBtnFunction(createResult));
    const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
    customerEditDetailsBtn.addEventListener('click', () => customerEditDetailsBtnFunction(createResult));
    if (!isMonthlyPassCustomer) main.closeModal();
  });
}

function customerProcessBtnFunction(customer) {
  const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);
  const inputs = {
    header: {
      title: `Initiate Customer Process ${getEmoji('📒', 26)}`,
      subtitle: 'Initiate process options',
    },
    short: [{ placeholder: 'Customer details', value: `${fullName} (${customer.dataset.id})`, locked: true }],
    radio: [
      { label: 'Process options', selected: 1 },
      {
        icon: `${getEmoji('📙', 26)}`,
        title: 'Check-in',
        subtitle: 'Check-in this customer',
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
  main.openModal('yellow', inputs, (result) => {
    const selectedProcess = main.getSelectedRadio(result.radio);
    if (selectedProcess.toLowerCase().includes('check-in')) {
      const isMonthlyPassCustomer = customer.dataset.custom2.toLowerCase().includes('monthly');
      const priceRate = customer.dataset.custom3.toLowerCase();
      const amount = isMonthlyPassCustomer
        ? PRICES_AUTOFILL[`${priceRate}_${customer.dataset.custom2.toLowerCase().split(' - ')[0]}`]
        : PRICES_AUTOFILL[`${priceRate}_${customer.dataset.custom2.toLowerCase()}`];
      if (customer.dataset.tid) {
        main.findAtSectionOne('payments', customer.dataset.tid, 'equal_id', 1, (findResult) => {
          if (findResult) {
            main.toast(
              `Please complete pending transaction first at Payments module: ${customer.dataset.tid}`,
              'error'
            );
          }
        });
      } else {
        processCheckinPayment(customer, isMonthlyPassCustomer, amount, priceRate);
      }
      return;
    }
    main.closeModal();
  });
}

function customerEditDetailsBtnFunction(customer) {}

function processCheckinPayment(customer, isMonthlyPassCustomer, amount, priceRate) {
  const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);
  main.toast(`${firstName}, is now ready for check-in payment!`, 'success');
  main.closeModal(() => {
    payments.processCheckinPayment(
      customer.dataset.id,
      customer.dataset.image,
      fullName,
      isMonthlyPassCustomer,
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
      findResult1.dataset.tid = '';
      const checkinPassType = findResult1.children[2].textContent.split(' - ')[0];
      const isMonthlyPassCustomer = checkinPassType.toLowerCase().includes('monthly');
      if (isMonthlyPassCustomer) {
        findResult1.children[2].textContent = checkinPassType + ' - Active';
        findResult1.dataset.status = 'active';

        const columnsData = [
          'id_' + findResult1.dataset.id,
          {
            type: 'object_contact',
            data: [findResult1.dataset.image, findResult1.dataset.text, findResult1.dataset.contact],
          },
          findResult1.dataset.startdate,
          findResult1.dataset.enddate,
          findResult1.dataset.days + ' days',
          main.encodePrice(amountPaid),
          main.fixText(priceRate),
        ];

        main.createAtSectionOne(SECTION_NAME, columnsData, 2, () => {
          main.createRedDot(SECTION_NAME, 2);
        });

        main.showSection(SECTION_NAME);
        checkins.logCheckin(transactionId, findResult1, 2);
      } else {
        checkins.logCheckin(transactionId, findResult1, 1);
      }
    }
  });
}

export default { completeCheckinPayment };
