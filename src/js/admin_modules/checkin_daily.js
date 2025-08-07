import main from '../admin_main.js';
import billing from './billing.js';
import accesscontrol from './accesscontrol.js';

// default codes:
let mainBtn,
  subBtn,
  sectionTwoMainBtn,
  liveActivated = false;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'checkin-daily') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  subBtn.classList.remove('hidden');
  subBtn.addEventListener('click', subBtnFunction);
  sectionTwoMainBtn = document.getElementById(`${main.sharedState.sectionName}SectionTwoMainBtn`);
  sectionTwoMainBtn.addEventListener('click', sectionTwoMainBtnFunction);

  if (!liveActivated) {
    liveActivated = true;
    updateDateAndTime();
    setInterval(updateDateAndTime, 10000);
  }
});

function mainBtnFunction() {
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
    registerNewUser(
      result.image.src,
      result.image.short[0].value,
      result.image.short[1].value,
      result.image.short[2].value
    );
  });
}

function subBtnFunction() {}

function sectionTwoMainBtnFunction() {
  const searchInput = document.getElementById('checkin-dailySectionTwoSearch');
  main.findAtSectionOne('checkin-daily', searchInput.value.trim(), 'equal', 1, (result) => {
    const user = result;

    if (!user) {
      main.toast("There's no user with that ID!", 'error');
      return;
    }

    main.findAtSectionOne('checkin-daily', user.dataset.id, 'pending', 2, (result) => {
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

function updateDateAndTime() {
  if (main.sharedState.sectionName === 'checkin-daily') {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    document.getElementById(
      'checkin-daily-section-header'
    ).children[0].children[1].children[0].children[0].textContent = `📆 ${date} ⌚ ${time}`;
  }
}

function registerNewUser(image, firstName, lastName, emailContact) {
  const name = firstName + ':://' + lastName;
  const columnsData = [
    'id_random',
    {
      type: 'user',
      data: ['', image, name, emailContact],
    },
    'custom_date_today',
  ];
  main.createAtSectionOne('checkin-daily', columnsData, 1, name, (result, status) => {
    if (status == 'success') {
      success(result);
    } else {
      const resultUserFirstName = result.dataset.name.split(':://')[0];
      const resultUserLastName = result.dataset.name.split(':://')[1];
      openConfirmationModal(
        `Data duplication: User with same details (ID: ${result.dataset.id}, Name: ${resultUserFirstName + ' ' + resultUserLastName})`,
        () => {
          main.createAtSectionOne('checkin-daily', columnsData, 1, '', (result, status) => {
            if (status == 'success') {
              success(result);
              main.closeConfirmationModal();
            }
          });
        }
      );
    }
  });

  function success(result) {
    const dataBtns = result.children[result.children.length - 1].children[0];
    const userEditDetailsBtn = dataBtns.querySelector('#userEditDetailsBtn');
    userEditDetailsBtn.addEventListener('click', () => userDetailsBtnFunction(result, false));

    const action = {
      module: 'Check-In',
      submodule: 'Daily Pass',
      description: 'Register user',
    };
    const data = {
      id: result.dataset.id,
      image: image,
      name: name,
      contact: emailContact,
      date: result.dataset.date,
      type: 'user',
    };

    accesscontrol.log(action, data);

    main.createRedDot('checkin-daily', 1);
    main.toast(result.dataset.name.split(':://')[0] + ', successfully registered!', 'success');
    main.closeModal();
  }
}

function userDetailsBtnFunction(user, isViewMode) {
  const userFirstName = user.dataset.name.split(':://')[0];
  const userLastName = user.dataset.name.split(':://')[1];
  if (isViewMode) {
    const inputs = {
      header: {
        title: 'View User Details 📙',
        subtitle: 'View mode',
      },
      image: {
        src: user.dataset.image,
        type: 'normal',
        locked: true,
        short: [
          { placeholder: 'First name', value: userFirstName, locked: true },
          { placeholder: 'Last name', value: userLastName, locked: true },
          { placeholder: 'Email / contact', value: user.dataset.contact, locked: true },
        ],
      },
      short: [
        { placeholder: 'Amount paid', value: user.dataset.amount ? user.dataset.amount : 'Not yet paid', locked: true },
      ],
      footer: {
        main: 'Exit view',
      },
    };
    main.openModal('gray', inputs, main.closeModal);
  } else {
    const userProperName = userFirstName + ' ' + userLastName;
    const inputs = {
      header: {
        title: 'Update User Details 📌',
        subtitle: 'User details form',
      },
      image: {
        src: user.dataset.image,
        type: 'normal',
        short: [
          { placeholder: 'First name', value: userFirstName, required: true },
          { placeholder: 'Last name', value: userLastName, required: true },
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
      (result) => {
        main.openConfirmationModal('Update user: ' + userProperName, () => {
          const resultUserFirstName = result.image.short[0].value;
          const resultUserLastName = result.image.short[1].value;

          user.dataset.image = result.image.src;
          user.dataset.name = resultUserFirstName + ':://' + resultUserLastName;
          user.dataset.contact = result.image.short[2].value;

          user.children[1].children[0].children[0].src = result.image.src;
          user.children[1].children[0].children[1].textContent = resultUserFirstName + ' ' + resultUserLastName;

          const action = {
            module: 'Check-In',
            submodule: 'Daily Pass',
            description: 'Update user details',
          };
          const data = {
            id: user.dataset.id,
            image: user.dataset.image,
            name: user.dataset.name,
            contact: user.dataset.contact,
            type: 'user',
          };

          accesscontrol.log(action, data);

          main.toast('Successfully updated user details!', 'info');
          main.closeConfirmationModal();
          main.closeModal();
        });
      },
      () => {
        main.openConfirmationModal('Delete user: ' + userProperName, () => {
          const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          const action = {
            module: 'Check-In',
            submodule: 'Daily Pass',
            description: 'Delete user record',
          };
          const data = {
            id: user.dataset.id,
            image: user.dataset.image,
            name: user.dataset.name,
            contact: user.dataset.contact,
            datetime: date + ' - ' + time,
            type: 'user',
          };
          accesscontrol.log(action, data);

          main.deleteAtSectionOne('checkin-daily', 1, user.dataset.id);

          main.toast('Successfully deleted user record!', 'error');
          main.closeConfirmationModal();
          main.closeModal();
        });
      }
    );
  }
}

function userVoidBtnFunction(user) {
  const userFirstName = user.dataset.name.split(':://')[0];
  const userLastName = user.dataset.name.split(':://')[1];
  const userProperName = userFirstName + ' ' + userLastName;
  main.openConfirmationModal('Void user log: ' + userProperName, () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const action = {
      module: 'Check-In',
      submodule: 'Daily Pass',
      description: 'Void user check-in log',
    };
    const data = {
      id: user.dataset.id,
      image: user.dataset.image,
      name: user.dataset.name,
      contact: user.dataset.contact,
      amount: user.dataset.amount,
      datetime: date + ' - ' + time,
      type: 'user_transaction',
    };

    accesscontrol.log(action, data);
    if (user.dataset.amount) {
      main.deleteAtSectionOne('billing', 1, user.dataset.tid);
      main.deleteAtSectionOne('billing', 2, user.dataset.tid);
    } else {
      main.deleteAtSectionTwo('billing', user.dataset.tid);
    }
    main.deleteAtSectionOne('checkin-daily', 2, user.dataset.id);

    main.toast('Successfully voided user log!', 'error');
    main.closeConfirmationModal();
  });
}

function processCheckinUser(user) {
  const columnsData = [
    'id_' + user.dataset.id,
    {
      type: 'user',
      data: [user.dataset.id, user.dataset.image, user.dataset.name, user.dataset.contact],
    },
    'custom_time_Pending',
  ];
  main.createAtSectionOne('checkin-daily', columnsData, 2, '', (result, status) => {
    if (status == 'success') {
      const dataBtns = result.children[result.children.length - 1].children[0];
      const userViewDetailsBtn = dataBtns.querySelector('#userViewDetailsBtn');
      const userVoidBtn = dataBtns.querySelector('#userVoidBtn');
      userViewDetailsBtn.addEventListener('click', () => userDetailsBtnFunction(result, true));
      userVoidBtn.addEventListener('click', () => userVoidBtnFunction(result));
      const action = {
        module: 'Check-In',
        submodule: 'Daily Pass',
        description: 'Process check-in user',
      };
      const data = {
        id: result.dataset.id,
        image: result.dataset.image,
        name: result.dataset.name,
        contact: result.dataset.contact,
        datetime: 'Pending',
        type: 'user',
      };

      accesscontrol.log(action, data);
      billing.processPayment(data);

      main.createRedDot('checkin-daily', 2);
      main.toast(result.dataset.name.split(':://')[0] + ', is now ready for check-in payment!', 'success');
    }
  });
}
