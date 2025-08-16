import main from '../admin_main.js';
import payment from './payment.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'inquiry-regular';
const MODULE_NAME = 'Inquiry';
const SUBMODULE_NAME = 'Regular Check-In';

let mainBtn, subBtn, sectionTwoMainBtn;
let liveActivated = false;

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${SECTION_NAME}"]`);
  sectionTwoMainBtn = document.getElementById(`${SECTION_NAME}SectionTwoMainBtn`);

  mainBtn?.addEventListener('click', mainBtnFunction);
  subBtn?.classList.remove('hidden');
  subBtn?.addEventListener('click', () => {});
  sectionTwoMainBtn?.addEventListener('click', sectionTwoMainBtnFunction);

  if (!liveActivated) {
    liveActivated = true;
    main.updateDateAndTime(SECTION_NAME);
    setInterval(main.updateDateAndTime, 10000);
  }
});

function mainBtnFunction() {
  const inputs = {
    header: {
      title: `Register New User ${getEmoji('💪', 26)}`,
      subtitle: 'New user form',
    },
    image: {
      src: '/src/images/client_logo.jpg',
      type: 'normal',
      short: [
        { placeholder: 'First name', value: '', required: true },
        { placeholder: 'Last name', value: '', required: true },
        { placeholder: 'Email / contact', value: '' },
      ],
    },
  };

  main.openModal(mainBtn, inputs, (result) => {
    const [firstName, lastName, contact] = result.image.short.map((item) => item.value);
    registerNewUser(result.image.src, firstName, lastName, contact);
  });
}

function sectionTwoMainBtnFunction() {
  const searchInput = document.getElementById(`${SECTION_NAME}SectionTwoSearch`);
  const searchValue = searchInput.value.trim();

  main.findAtSectionOne(SECTION_NAME, searchValue, 'equal_id', 1, (user) => {
    if (!user) {
      main.toast("There's no user with that ID!", 'error');
      return;
    }

    main.findAtSectionOne(SECTION_NAME, user.dataset.id, 'pending', 2, (result) => {
      if (result) {
        main.openConfirmationModal('Multiple pending transaction: User with multiple pending transactions', () => {
          processCheckinUser(user);
          searchInput.value = '';
          main.closeConfirmationModal();
        });
        return;
      }

      processCheckinUser(user);
      searchInput.value = '';
    });
  });
}

function registerNewUser(image, firstName, lastName, contact) {
  const name = main.encodeName(firstName, lastName);
  const columnsData = createUserColumnsData('id_U_random', image, name, contact);

  main.createAtSectionOne(SECTION_NAME, columnsData, 1, name, (result, status) => {
    if (status === 'success') {
      handleSuccessfulRegistration(result, image, name, contact);
    } else {
      handleDuplicateUser(result, columnsData, image, name, contact);
    }
  });
}

function handleSuccessfulRegistration(result, image, name, contact) {
  const userEditDetailsBtn = result.querySelector('#userEditDetailsBtn');
  userEditDetailsBtn?.addEventListener('click', () => userViewDetailsBtnFunction(result, false));

  logAction('Register user', {
    id: result.dataset.id,
    image,
    name,
    contact,
    date: result.dataset.date,
  });

  const { firstName } = main.decodeName(result.dataset.text);
  main.createRedDot(SECTION_NAME, 1);
  main.toast(`${firstName}, successfully registered!`, 'success');
  main.closeModal();
}

function handleDuplicateUser(result, columnsData, image, name, contact) {
  const { _, __, fullName } = main.decodeName(result.dataset.text);

  main.openConfirmationModal(
    `Data duplication: User with same details (ID: ${result.dataset.id}, Name: ${fullName})`,
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

function userViewDetailsBtnFunction(user, isViewMode) {
  const { firstName, lastName, fullName } = main.decodeName(user.dataset.text);

  if (isViewMode) {
    showUserViewModal(user, firstName, lastName);
  } else {
    showUserEditModal(user, firstName, lastName, fullName);
  }
}

function showUserViewModal(user, firstName, lastName) {
  const inputs = {
    header: {
      title: `View User Details ${getEmoji('📙', 26)}`,
      subtitle: `View mode: ${user.dataset.id}`,
    },
    image: {
      src: user.dataset.image,
      type: 'normal',
      locked: true,
      short: [
        { placeholder: 'First name', value: firstName, locked: true },
        { placeholder: 'Last name', value: lastName, locked: true },
        { placeholder: 'Email / contact', value: user.dataset.contact, locked: true },
      ],
    },
    short: [
      {
        placeholder: 'Amount paid',
        value: user.dataset.amount ? main.encodePrice(+user.dataset.amount) : 'Not yet paid',
        locked: true,
      },
    ],
    footer: {
      main: 'Exit view',
    },
  };

  main.openModal('gray', inputs, main.closeModal);
}

function showUserEditModal(user, firstName, lastName, fullName) {
  const inputs = {
    header: {
      title: `Update User Details ${getEmoji('📌', 26)}`,
      subtitle: `User details form: ${user.dataset.id}`,
    },
    image: {
      src: user.dataset.image,
      type: 'normal',
      short: [
        { placeholder: 'First name', value: firstName, required: true },
        { placeholder: 'Last name', value: lastName, required: true },
        { placeholder: 'Email / contact', value: user.dataset.contact },
      ],
    },
    footer: {
      main: `Update ${getEmoji('📌')}`,
      sub: `Delete ${getEmoji('💀')}`,
    },
  };

  main.openModal(
    'orange',
    inputs,
    (result) => updateUser(user, result, fullName),
    () => deleteUser(user, fullName)
  );
}

function updateUser(user, result, originalFullName) {
  main.findAtSectionOne(
    SECTION_NAME,
    main.encodeName(result.image.short[0].value, result.image.short[1].value),
    'any',
    1,
    (findResult) => {
      if (findResult && findResult != user) {
        main.toast('That name already exist!', 'error');
        return;
      }

      main.openConfirmationModal(`Update user: ${originalFullName}`, () => {
        const [newFirstName, newLastName, newContact] = result.image.short.map((item) => item.value);
        const newName = main.encodeName(newFirstName, newLastName);

        const columnsData = createUserColumnsData(
          `id_${user.dataset.id}`,
          result.image.src,
          newName,
          newContact,
          `custom_date_${user.dataset.date}`
        );

        main.updateAtSectionOne(SECTION_NAME, columnsData, 1, user.dataset.id, (updatedResult) => {
          logAction('Update user details', {
            id: updatedResult.dataset.id,
            image: updatedResult.dataset.image,
            name: updatedResult.dataset.text,
            contact: updatedResult.dataset.contact,
          });

          main.toast('Successfully updated user details!', 'info');
          main.closeConfirmationModal();
          main.closeModal();
        });
      });
    }
  );
}

function deleteUser(user, fullName) {
  main.openConfirmationModal(`Delete user: ${fullName}`, () => {
    const { datetime } = main.getDateOrTimeOrBoth();

    logAction('Delete user record', {
      id: user.dataset.id,
      image: user.dataset.image,
      name: user.dataset.text,
      contact: user.dataset.contact,
      datetime,
    });

    main.deleteAtSectionOne(SECTION_NAME, 1, user.dataset.id);
    main.toast('Successfully deleted user record!', 'error');
    main.closeConfirmationModal();
    main.closeModal();
  });
}

function userVoidBtnFunction(user) {
  const { firstName } = main.decodeName(user.dataset.text);

  const confirmationMessage = `Void user log: ${firstName}<br><br>Note ${getEmoji('📕')}:<br>Voiding this log will also void any related log or pending transaction under Invoicing module.`;

  main.openConfirmationModal(confirmationMessage, () => {
    const { datetime } = main.getDateOrTimeOrBoth();

    logAction('Void user check-in log', {
      id: user.dataset.id,
      image: user.dataset.image,
      name: user.dataset.text,
      contact: user.dataset.contact,
      amount: user.dataset.amount,
      datetime,
      type: 'user_transaction',
    });

    if (user.dataset.amount) {
      main.deleteAtSectionOne('payment', 1, user.dataset.tid);
      main.deleteAtSectionOne('payment', 2, user.dataset.tid);
    } else {
      main.deleteAtSectionTwo('payment', user.dataset.tid);
    }

    main.deleteAtSectionOne(SECTION_NAME, 2, user.dataset.id);
    main.toast('Successfully voided user log!', 'error');
    main.closeConfirmationModal();
  });
}

function processCheckinUser(user) {
  const columnsData = createUserColumnsData(
    `id_${user.dataset.id}`,
    user.dataset.image,
    user.dataset.text,
    user.dataset.contact,
    'custom_time_Pending'
  );

  main.createAtSectionOne(SECTION_NAME, columnsData, 2, '', (result, status) => {
    if (status === 'success') {
      setupCheckinButtons(result);

      const userData = {
        id: result.dataset.id,
        image: result.dataset.image,
        name: result.dataset.text,
        contact: result.dataset.contact,
      };

      logAction('Process check-in user', userData);
      payment.processCheckinPayment(userData);

      const { firstName } = main.decodeName(result.dataset.text);
      main.createRedDot(SECTION_NAME, 2);
      main.toast(`${firstName}, is now ready for check-in payment!`, 'success');
    }
  });
}

function setupCheckinButtons(result) {
  const userViewDetailsBtn = result.querySelector('#userViewDetailsBtn');
  const userVoidBtn = result.querySelector('#userVoidBtn');

  userViewDetailsBtn?.addEventListener('click', () => userViewDetailsBtnFunction(result, true));
  userVoidBtn?.addEventListener('click', () => userVoidBtnFunction(result));
}

const logAction = (description, data) => {
  accesscontrol.log(
    {
      module: MODULE_NAME,
      submodule: SUBMODULE_NAME,
      description,
    },
    { ...data, type: data.type || 'user' }
  );
};

const createUserColumnsData = (id, image, name, contact, dateTime = 'custom_date_today') => [
  id,
  {
    type: 'object_contact',
    data: [image, name, contact],
  },
  dateTime,
];
