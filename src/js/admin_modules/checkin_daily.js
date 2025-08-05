import main from '../admin_main.js';
import billing from './billing.js';
import datasync from './datasync.js';

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
  main.findAtSectionOne('checkin-daily', searchInput.value, 'search', 1, (result) => {
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
  const name = firstName + ' ' + lastName;
  const columnsData = [
    'id_random',
    {
      type: 'user',
      data: [image, name, emailContact],
    },
    'date_today',
  ];
  main.createAtSectionOne('checkin-daily', columnsData, 1, name, (generated, status) => {
    if (status == 'success') {
      success(generated);
    } else {
      openConfirmationModal(
        `Data duplication: User with same details (ID: ${generated.dataset.id}, Name: ${generated.dataset.name})`,
        () => {
          main.createAtSectionOne('checkin-daily', columnsData, 1, '', (generated, status) => {
            if (status == 'success') {
              success(generated);
              main.closeConfirmationModal();
            }
          });
        }
      );
    }
  });

  function success(generated) {
    const action = {
      module: 'Check-in',
      submodule: 'Daily Pass',
      description: 'Register user',
    };
    const data = {
      id: generated.id,
      image: image,
      name: name,
      contact: emailContact,
      date: generated.date,
    };
    datasync.enqueue(action, data);

    main.createRedDot('checkin-daily', 1);
    main.toast(name + ', successfully registered!', 'success');
    main.closeModal();
  }
}

function processCheckinUser(user) {
  const columnsData = [
    'id_' + user.dataset.id,
    {
      type: 'user',
      data: [user.dataset.image, user.dataset.name, user.dataset.contact],
    },
    'time_Pending',
  ];
  main.createAtSectionOne('checkin-daily', columnsData, 2, '', () => {
    const action = {
      module: 'Check-in',
      submodule: 'Daily Pass',
      description: 'Process check-in user',
    };
    const data = {
      id: user.dataset.id,
      image: user.dataset.image,
      name: user.dataset.name,
      contact: user.dataset.contact,
      time: 'Pending',
    };
    datasync.enqueue(action, data);
    billing.processPayment(data);

    main.createRedDot('checkin-daily', 2);
    main.toast(user.dataset.name + ', is now ready for check-in payment!', 'success');
  });
}
