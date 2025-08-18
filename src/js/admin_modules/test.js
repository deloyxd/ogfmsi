import main from '../admin_main.js';
import payments from './payments.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'inquiry-customers';
const MODULE_NAME = 'Inquiry';
const SUBMODULE_NAME = 'Customers';

const DISCOUNT_RATE = [
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

const STUDENT_VERIFICATION_MESSAGE = `Verification of student discount rate via:<br>${getEmoji('📌')} Student ID's picture matches the customer's face<br>${getEmoji('📌')} Student ID's school name is legitimate<br>${getEmoji('📌')} Student ID's validity duration still not expired yet`;

let mainBtn, subBtn;

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${SECTION_NAME}"]`);

  mainBtn?.addEventListener('click', () => mainBtnFunction());
  subBtn?.classList.remove('hidden');
  subBtn?.addEventListener('click', () => {});
});

function mainBtnFunction(
  imageSrc = '/src/images/client_logo.jpg',
  firstName = '',
  lastName = '',
  contact = '',
  checkinPassType = 1,
  discountRate = 1
) {
  const inputs = {
    header: {
      title: `Register New Customer ${getEmoji('💪', 26)}`,
      subtitle: 'New customer form',
    },
    image: {
      src: imageSrc,
      type: 'normal',
      short: [
        { placeholder: 'First name', value: firstName, required: true },
        { placeholder: 'Last name', value: lastName, required: true },
        { placeholder: 'Email / contact number', value: contact },
      ],
    },
    spinner: [
      {
        label: 'Discount rate',
        placeholder: 'Select discount rate',
        selected: discountRate,
        required: true,
        options: DISCOUNT_RATE,
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
    if (main.getSelectedSpinner(result.spinner[0]).includes('student')) {
      main.openConfirmationModal(STUDENT_VERIFICATION_MESSAGE, () => {
        continueProcess(result);
        main.closeConfirmationModal();
      });
      return;
    }

    if (main.getSelectedSpinner(result.spinner[1]).includes('monthly')) {
      const customerResult = result;
      main.closeModal(() => {
        const startDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
        const endDateObj = new Date();
        endDateObj.setMonth(endDateObj.getMonth() + 1);
        const endDate = endDateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
        const inputs = {
          header: {
            title: `Register New Monthly Pass Customer ${getEmoji('💪', 26)}`,
            subtitle: 'New monthly pass customer form',
          },
          short: [
            {
              placeholder: 'Monthly pass start date (mm-dd-yyyy):',
              value: startDate.replace(/\//g, '-'),
              required: true,
            },
            { placeholder: 'Monthly pass end date (mm-dd-yyyy):', value: endDate.replace(/\//g, '-'), required: true },
            { placeholder: 'Discount rate:', value: main.getSelectedSpinner(result.spinner[0]), locked: true },
          ],
          footer: {
            main: `Process Payment ${getEmoji('🔏')}`,
            sub: `Go Back`,
          },
        };
        main.openModal(
          'orange',
          inputs,
          (result) => {
            if (!main.isValidDate(result.short[0].value)) {
              main.toast(`Invalid start date: ${result.short[0].value}`, 'error');
              return;
            }
            if (!main.isValidDate(result.short[1].value)) {
              main.toast(`Invalid end date: ${result.short[1].value}`, 'error');
              return;
            }
            continueProcess(customerResult);
          },
          () => {
            main.closeModal(() => {
              mainBtnFunction(
                result.image.src,
                result.image.short[0].value,
                result.image.short[1].value,
                result.image.short[2].value,
                result.spinner[1].selected,
                result.spinner[0].selected
              );
            });
          }
        );
      });
      return;
    }

    continueProcess(result);
  });

  function continueProcess(result) {
    const [firstName, lastName, contact] = result.image.short.map((item) => item.value);
    registerNewCustomer(result.image.src, firstName, lastName, contact, result.spinner[1], result.spinner[0]);
  }
}

function registerNewCustomer(image, firstName, lastName, contact, checkinPassType, discountRate) {
  const name = main.encodeName(firstName, lastName);
  const checkinPassTypeSelected = main.getSelectedSpinner(checkinPassType);
  const discountRateSelected = main.getSelectedSpinner(discountRate);

  const columnsData = createCustomerColumnsData(
    'id_U_random',
    image,
    name,
    contact,
    checkinPassTypeSelected,
    discountRateSelected
  );

  main.createAtSectionOne(SECTION_NAME, columnsData, 1, name, (result, status) => {
    if (status === 'success') {
      handleSuccessfulRegistration(result, image, name, contact, checkinPassTypeSelected, discountRateSelected);
    } else {
      handleDuplicateCustomer(result, columnsData, image, name, contact);
    }
  });
}

function handleSuccessfulRegistration(result, image, name, contact, checkinPassType, discountRate) {
  const customerEditDetailsBtn = result.querySelector('#customerEditDetailsBtn');
  customerEditDetailsBtn?.addEventListener('click', () => customerEditDetailsBtnFunction(result, false));

  logAction('Register customer', {
    id: result.dataset.id,
    image,
    name,
    contact,
    checkinPassType,
    discountRate,
    date: result.dataset.date,
  });

  const { firstName } = main.decodeName(name);
  main.toast(`${firstName}, successfully registered!`, 'success');
  main.createRedDot(SECTION_NAME, 1);
  main.closeModal();
}

function handleDuplicateCustomer(result, columnsData, image, name, contact) {
  const { _, __, fullName } = main.decodeName(result.dataset.text);

  main.openConfirmationModal(
    `Data duplication - Customer with same details:<br>• ID: ${result.dataset.id}<br>• Name: ${fullName}`,
    () => {
      main.createAtSectionOne(SECTION_NAME, columnsData, 1, '', (newResult, status) => {
        if (status === 'success') {
          handleSuccessfulRegistration(newResult, image, name, contact);
          main.closeConfirmationModal();
        }
      });
    }
  );
}

function customerEditDetailsBtnFunction(customer, isViewMode) {
  const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);

  if (isViewMode) {
    showCustomerViewModal(customer, firstName, lastName);
  } else {
    showCustomerEditModal(customer, firstName, lastName, fullName);
  }
}

function showCustomerViewModal(customer, firstName, lastName) {
  const inputs = {
    header: {
      title: `View Customer Details ${getEmoji('📙', 26)}`,
      subtitle: `View mode: ${customer.dataset.id}`,
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
      {
        placeholder: 'Amount paid',
        value: customer.dataset.amount ? main.encodePrice(+customer.dataset.amount) : 'Not yet paid',
        locked: true,
      },
    ],
    spinner: [
      {
        label: 'Discount rate',
        placeholder: 'Select discount rate',
        selected: customer.dataset.custom3,
        locked: true,
        options: DISCOUNT_RATE,
      },
      {
        label: 'Check-in pass type',
        placeholder: 'Select check-in pass type',
        selected: customer.dataset.custom2,
        locked: true,
        options: CHECKIN_PASS_TYPE,
      },
    ],
    footer: {
      main: 'Exit view',
    },
  };

  main.openModal('gray', inputs, main.closeModal);
}

function showCustomerEditModal(customer, firstName, lastName, fullName) {
  const inputs = {
    header: {
      title: `Update Customer Details ${getEmoji('📌', 26)}`,
      subtitle: `Customer details form: ${customer.dataset.id}`,
    },
    image: {
      src: customer.dataset.image,
      type: 'normal',
      short: [
        { placeholder: 'First name', value: firstName, required: true },
        { placeholder: 'Last name', value: lastName, required: true },
        { placeholder: 'Email / contact number', value: customer.dataset.contact },
      ],
    },
    spinner: [
      {
        label: 'Discount rate',
        placeholder: 'Select discount rate',
        selected: customer.dataset.custom3,
        required: true,
        options: DISCOUNT_RATE,
      },
      {
        label: 'Check-in pass type',
        placeholder: 'Select check-in pass type',
        selected: customer.dataset.custom2,
        required: true,
        options: CHECKIN_PASS_TYPE,
      },
    ],
    footer: {
      main: `Update ${getEmoji('📌')}`,
      sub: `Delete ${getEmoji('💀')}`,
    },
  };

  const customerData = {
    image: customer.dataset.image,
    firstName: customer.dataset.text.split(':://')[0],
    lastName: customer.dataset.text.split(':://')[1],
    contact: customer.dataset.contact,
    checkinPassType: customer.dataset.custom2,
    discountRate: customer.dataset.custom3,
  };

  main.openModal(
    'orange',
    inputs,
    (result) => {
      if (checkIfSameData(result, customerData)) {
        main.toast('You must change anything!', 'error');
        return;
      }
      updateCustomer(customer, result, fullName);
    },
    () => deleteCustomer(customer, fullName)
  );
}

function checkIfSameData(newData, oldData) {
  return (
    newData.image.src == oldData.image &&
    newData.image.short[0].value == oldData.firstName &&
    newData.image.short[1].value == oldData.lastName &&
    newData.image.short[2].value == oldData.contact &&
    main.getSelectedSpinner(newData.spinner[1]) == oldData.checkinPassType &&
    main.getSelectedSpinner(newData.spinner[0]) == oldData.discountRate
  );
}

function updateCustomer(customer, result, originalFullName) {
  main.findAtSectionOne(
    SECTION_NAME,
    main.encodeName(result.image.short[0].value, result.image.short[1].value),
    'any',
    1,
    (findResult) => {
      if (findResult && findResult != customer) {
        main.toast('That name already exist!', 'error');
        return;
      }

      main.openConfirmationModal(`Update customer: ${originalFullName}`, () => {
        const [newFirstName, newLastName, newContact] = result.image.short.map((item) => item.value);
        const newName = main.encodeName(newFirstName, newLastName);
        const newCheckinPassType = main.getSelectedSpinner(result.spinner[1]);
        const newDiscountRate = main.getSelectedSpinner(result.spinner[0]);

        if (newDiscountRate.includes('student')) {
          main.closeConfirmationModal(() => {
            main.openConfirmationModal(STUDENT_VERIFICATION_MESSAGE, () => {
              continueProcess(customer, result);
            });
          });
          return;
        }

        continueProcess(customer, result);

        function continueProcess(customer, result) {
          const columnsData = createCustomerColumnsData(
            `id_${customer.dataset.id}`,
            result.image.src,
            newName,
            newContact,
            newCheckinPassType,
            newDiscountRate,
            `custom_date_${customer.dataset.date}`
          );

          main.updateAtSectionOne(SECTION_NAME, columnsData, 1, customer.dataset.id, (updatedResult) => {
            logAction('Update customer details', {
              id: updatedResult.dataset.id,
              image: updatedResult.dataset.image,
              name: updatedResult.dataset.text,
              contact: updatedResult.dataset.contact,
              checkinPassType: updatedResult.dataset.custom2,
              discountRate: updatedResult.dataset.custom3,
            });

            main.toast('Successfully updated customer details!', 'info');
            main.closeConfirmationModal();
            main.closeModal();
          });
        }
      });
    }
  );
}

function deleteCustomer(customer, fullName) {
  main.openConfirmationModal(`Delete customer: ${fullName}`, () => {
    const { datetime } = main.getDateOrTimeOrBoth();

    logAction('Delete customer record', {
      id: customer.dataset.id,
      image: customer.dataset.image,
      name: customer.dataset.text,
      contact: customer.dataset.contact,
      checkinPassType: customer.dataset.custom2,
      discountRate: customer.dataset.custom3,
      datetime,
    });

    main.deleteAtSectionOne(SECTION_NAME, 1, customer.dataset.id);
    main.toast('Successfully deleted customer record!', 'error');
    main.closeConfirmationModal();
    main.closeModal();
  });
}

function customerVoidBtnFunction(customer) {
  const { firstName } = main.decodeName(customer.dataset.text);

  const CUSTOMER_VOID_LOG_MESSAGE = `Void customer log: ${firstName}<br><br>Take Note ${getEmoji('📕')}:<br>Voiding this log will also void any related<br>log or pending transaction under Payments module.`;

  main.openConfirmationModal(CUSTOMER_VOID_LOG_MESSAGE, () => {
    const { datetime } = main.getDateOrTimeOrBoth();

    logAction('Void customer check-in log', {
      id: customer.dataset.id,
      image: customer.dataset.image,
      name: customer.dataset.text,
      contact: customer.dataset.contact,
      amount: customer.dataset.amount,
      checkinPassType: customer.dataset.custom2,
      discountRate: customer.dataset.custom3,
      datetime,
      type: 'customer_transaction',
    });

    if (customer.dataset.amount) {
      main.deleteAtSectionOne('payments', 1, customer.dataset.tid);
      main.deleteAtSectionOne('payments', 2, customer.dataset.tid);
    } else {
      main.deleteAtSectionTwo('payments', customer.dataset.tid);
    }

    main.deleteAtSectionOne(SECTION_NAME, 2, customer.dataset.id);
    main.toast('Successfully voided customer log!', 'error');
    main.closeConfirmationModal();
  });
}

function processCheckinUser(customer) {
  const columnsData = createCustomerColumnsData(
    `id_${customer.dataset.id}`,
    customer.dataset.image,
    customer.dataset.text,
    customer.dataset.contact,
    customer.dataset.custom2,
    customer.dataset.custom3,
    'custom_time_Pending'
  );

  main.createAtSectionOne(SECTION_NAME, columnsData, 2, '', (result, status) => {
    if (status === 'success') {
      setupCheckinButtons(result);

      const customerData = {
        id: result.dataset.id,
        image: result.dataset.image,
        name: result.dataset.text,
        contact: result.dataset.contact,
        checkinPassType: result.dataset.custom2,
        discountRate: result.dataset.custom3,
      };

      logAction('Process check-in customer', customerData);
      payments.processCheckinPayment(customerData);

      const { firstName } = main.decodeName(result.dataset.text);
      main.createRedDot(SECTION_NAME, 2);
      main.toast(`${firstName}, is now ready for check-in payment!`, 'success');
    }
  });
}

function setupCheckinButtons(result) {
  const customerViewDetailsBtn = result.querySelector('#customerViewDetailsBtn');
  const customerVoidBtn = result.querySelector('#customerVoidBtn');

  customerViewDetailsBtn?.addEventListener('click', () => customerEditDetailsBtnFunction(result, true));
  customerVoidBtn?.addEventListener('click', () => customerVoidBtnFunction(result));
}

const logAction = (description, data) => {
  accesscontrol.log(
    {
      module: MODULE_NAME,
      submodule: SUBMODULE_NAME,
      description,
    },
    { ...data, type: data.type || 'customer' }
  );
};

const createCustomerColumnsData = (
  id,
  image,
  name,
  contact,
  discountRate,
  checkinPassType,
  dateTime = 'custom_date_today'
) => [
  id,
  {
    type: 'object_contact',
    data: [image, name, contact],
  },
  discountRate,
  checkinPassType,
  dateTime,
];
