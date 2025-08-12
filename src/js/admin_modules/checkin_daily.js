import main from '../admin_main.js';
import invoicing from './invoicing.js';
import accesscontrol from './accesscontrol.js';

const SECTION_NAME = 'checkin-daily';
const MODULE_NAME = 'Check-In';
const SUBMODULE_NAME = 'Daily Pass';

let mainBtn, subBtn, sectionTwoMainBtn;
let liveActivated = false;

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  initializeButtons();
  initializeLiveUpdates();
});

const formatDateTime = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { date, time, datetime: `${date} - ${time}` };
};

const parseUserName = (nameString) => {
  const parts = nameString.split(':://');
  return {
    firstName: parts[0],
    lastName: parts[1],
    fullName: `${parts[0]} ${parts[1]}`,
  };
};

const combineUserName = (firstName, lastName) => `${firstName}:://${lastName}`;

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

function initializeButtons() {
  mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${SECTION_NAME}"]`);
  sectionTwoMainBtn = document.getElementById(`${SECTION_NAME}SectionTwoMainBtn`);

  mainBtn?.addEventListener('click', showRegisterUserModal);
  subBtn?.classList.remove('hidden');
  subBtn?.addEventListener('click', () => {});
  sectionTwoMainBtn?.addEventListener('click', handleCheckinSearch);
}

function initializeLiveUpdates() {
  if (!liveActivated) {
    liveActivated = true;
    updateDateAndTime();
    setInterval(updateDateAndTime, 10000);
  }
}

function updateDateAndTime() {
  if (main.sharedState.sectionName === SECTION_NAME) {
    const { date, time } = formatDateTime();
    const headerElement =
      document.getElementById('checkin-daily-section-header')?.children[0]?.children[1]?.children[0]?.children[0];

    if (headerElement) {
      headerElement.textContent = `📆 ${date} ⌚ ${time}`;
    }
  }
}

function showRegisterUserModal() {
  const inputs = {
    header: {
      title: 'Register New User 💪',
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

function handleCheckinSearch() {
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
  const name = combineUserName(firstName, lastName);
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
  setupUserEditButton(result);

  logAction('Register user', {
    id: result.dataset.id,
    image,
    name,
    contact,
    date: result.dataset.date,
  });

  const { firstName } = parseUserName(result.dataset.text);
  main.createRedDot(SECTION_NAME, 1);
  main.toast(`${firstName}, successfully registered!`, 'success');
  main.closeModal();
}

function handleDuplicateUser(result, columnsData, image, name, contact) {
  const { fullName } = parseUserName(result.dataset.text);

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

function setupUserEditButton(result) {
  const userEditDetailsBtn = result.querySelector('#userEditDetailsBtn');
  userEditDetailsBtn?.addEventListener('click', () => showUserDetailsModal(result, false));
}

function showUserDetailsModal(user, isViewMode) {
  const { firstName, lastName, fullName } = parseUserName(user.dataset.text);

  if (isViewMode) {
    showUserViewModal(user, firstName, lastName);
  } else {
    showUserEditModal(user, firstName, lastName, fullName);
  }
}

function showUserViewModal(user, firstName, lastName) {
  const formatAmount = (amount) => `₱${amount.toFixed(2)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const inputs = {
    header: {
      title: 'View User Details 📙',
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
        value: user.dataset.amount ? formatAmount(+user.dataset.amount) : 'Not yet paid',
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
      title: 'Update User Details 📌',
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
      main: 'Update 📌',
      sub: 'Delete 💀',
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
    combineUserName(result.image.short[0].value, result.image.short[1].value),
    'any',
    1,
    (findResult) => {
      if (findResult && findResult != user) {
        main.toast('That name already exist!', 'error');
        return;
      }

      main.openConfirmationModal(`Update user: ${originalFullName}`, () => {
        const [newFirstName, newLastName, newContact] = result.image.short.map((item) => item.value);
        const newName = combineUserName(newFirstName, newLastName);

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
    const { datetime } = formatDateTime();

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

function voidUserLog(user) {
  const { fullName } = parseUserName(user.dataset.text);

  const confirmationMessage = `Void user log: ${fullName}<br><br>Note 📕:<br>Voiding this log will also void any related log or pending transaction under Invoicing module.`;

  main.openConfirmationModal(confirmationMessage, () => {
    const { datetime } = formatDateTime();

    logAction('Void user check-in log', {
      id: user.dataset.id,
      image: user.dataset.image,
      name: user.dataset.text,
      contact: user.dataset.contact,
      amount: user.dataset.amount,
      datetime,
      type: 'user_transaction',
    });

    // Handle invoicing cleanup
    if (user.dataset.amount) {
      main.deleteAtSectionOne('invoicing', 1, user.dataset.tid);
      main.deleteAtSectionOne('invoicing', 2, user.dataset.tid);
    } else {
      main.deleteAtSectionTwo('invoicing', user.dataset.tid);
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
        datetime: 'Pending',
      };

      logAction('Process check-in user', userData);
      invoicing.processPayment(userData);

      const { firstName } = parseUserName(result.dataset.text);
      main.createRedDot(SECTION_NAME, 2);
      main.toast(`${firstName}, is now ready for check-in payment!`, 'success');
    }
  });
}

function setupCheckinButtons(result) {
  const userViewDetailsBtn = result.querySelector('#userViewDetailsBtn');
  const userVoidBtn = result.querySelector('#userVoidBtn');

  userViewDetailsBtn?.addEventListener('click', () => showUserDetailsModal(result, true));
  userVoidBtn?.addEventListener('click', () => voidUserLog(result));
}
