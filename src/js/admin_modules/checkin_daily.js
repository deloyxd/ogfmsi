import main from '../admin_main.js';
import billing from './billing.js';
import datasync from './datasync.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
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
});

function mainBtnFunction() {
  mainBtn.dataset.title = 'Register New User 💪';
  mainBtn.dataset.subtitle = 'New user form';

  const inputs = {
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
  if (main.checkIfEmpty(searchInput.value)) return;

  let user = null;
  let columnCount = document.getElementById(`checkin-daily_tab1`).dataset.columncount;
  let emptyText = document.getElementById(`checkin-dailySectionOneListEmpty1`);
  let items = emptyText.parentElement.children;
  for (let i = +columnCount + 1; i < items.length; i += columnCount) {
    if (items[i].dataset.id.includes(searchInput.value)) {
      if (!user) user = items[i];
    }
  }

  if (!user) {
    main.toast("There's no user with that ID!", 'error');
    return;
  }

  columnCount = document.getElementById(`checkin-daily_tab2`).dataset.columncount;
  emptyText = document.getElementById(`checkin-dailySectionOneListEmpty2`);
  items = emptyText.parentElement.children;
  for (let i = +columnCount + 1; i < items.length; i += columnCount) {
    if (items[i].dataset.id == user.dataset.id) {
      main.openConfirmationModal('Multiple pending transaction: User with multiple pending transactions', () => {
        processCheckinUser(user.dataset.id, user.dataset.name, user.dataset.contact);
        searchInput.value = '';
        main.closeConfirmationModal();
      });
      return;
    }
  }

  processCheckinUser(user);
  searchInput.value = '';
}

function registerNewUser(image, firstName, lastName, emailContact) {
  const emptyText = document.getElementById('checkin-dailySectionOneListEmpty1');

  const cloneUserId = emptyText.nextElementSibling.cloneNode(true);
  const cloneUser = emptyText.nextElementSibling.nextElementSibling.cloneNode(true);
  const cloneUserData = document.createElement('div');
  cloneUserData.className = 'items-center font-medium text-gray-900';
  cloneUserData.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="/src/images/client_logo.jpg" class="h-10 w-10 rounded-full object-cover" />
        <p></p>
      </div>
  `;
  cloneUser.appendChild(cloneUserData);
  const cloneDateRegistered = emptyText.nextElementSibling.nextElementSibling.nextElementSibling.cloneNode(true);

  const randomId_A = Math.floor(100000 + Math.random() * 900000);
  const randomId_B = Math.floor(100000 + Math.random() * 900000);
  cloneUserId.textContent = 'U' + randomId_A + '' + randomId_B;
  cloneUserData.children[0].children[0].src = image;
  cloneUserData.children[0].children[1].textContent = `${firstName} ${lastName}`;
  const dateToday = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  cloneDateRegistered.innerHTML += dateToday;

  cloneUserId.classList.remove('hidden');
  cloneUser.classList.remove('hidden');
  cloneDateRegistered.classList.remove('hidden');

  cloneUserId.dataset.id = cloneUserId.textContent;
  cloneUserId.dataset.image = cloneUserData.children[0].children[0].src;
  cloneUserId.dataset.name = cloneUserData.children[0].children[1].textContent;
  cloneUserId.dataset.contact = emailContact;
  cloneUserId.dataset.date = dateToday;

  function continueRegisterNewUser() {
    emptyText.classList.add('hidden');
    const insertAfterElement = emptyText.nextElementSibling.nextElementSibling.nextElementSibling;
    insertAfterElement.insertAdjacentElement('afterend', cloneDateRegistered);
    insertAfterElement.insertAdjacentElement('afterend', cloneUser);
    insertAfterElement.insertAdjacentElement('afterend', cloneUserId);

    const action = {
      module: 'Check-in',
      submodule: 'Daily Pass',
      description: 'Register user',
    };
    const data = {
      id: cloneUserId.dataset.id,
      image: cloneUserId.dataset.image,
      name: cloneUserId.dataset.name,
      contact: cloneUserId.dataset.contact,
      date: cloneUserId.dataset.date,
    };
    datasync.enqueue(action, data);

    if (main.sharedState.activeTab == 2)
      document.getElementById(`checkin-daily_tab1`).lastElementChild.classList.remove('hidden');

    main.toast(cloneUserId.dataset.name + ', successfully registered!', 'success');
    main.closeModal();
  }

  const columnCount = document.getElementById(`checkin-daily_tab1`).dataset.columncount;
  for (let i = +columnCount + 1; i < emptyText.parentElement.children.length; i += columnCount) {
    const user = emptyText.parentElement.children[i];
    if (user.dataset.name.toLowerCase().trim() == cloneUserId.dataset.name.toLowerCase().trim()) {
      main.openConfirmationModal(
        `Data duplication: User with same details (ID: ${user.dataset.id})`,
        continueRegisterNewUser
      );
      return;
    }
  }

  continueRegisterNewUser();
}

function processCheckinUser(user) {
  const emptyText = document.getElementById(`checkin-dailySectionOneListEmpty2`);

  const cloneUserId = emptyText.nextElementSibling.cloneNode(true);
  const cloneUser = emptyText.nextElementSibling.nextElementSibling.cloneNode(true);
  const cloneUserData = document.createElement('div');
  cloneUserData.className = 'items-center font-medium text-gray-900';
  cloneUserData.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="/src/images/client_logo.jpg" class="h-10 w-10 rounded-full object-cover" />
        <p></p>
      </div>
  `;
  cloneUser.appendChild(cloneUserData);
  const cloneDateRegistered = emptyText.nextElementSibling.nextElementSibling.nextElementSibling.cloneNode(true);

  cloneUserId.textContent = user.dataset.id;
  cloneUserData.children[0].children[0].src = user.dataset.image;
  cloneUserData.children[0].children[1].textContent = user.dataset.name;
  cloneDateRegistered.innerHTML += 'Pending';

  cloneUserId.classList.remove('hidden');
  cloneUser.classList.remove('hidden');
  cloneDateRegistered.classList.remove('hidden');

  cloneUserId.dataset.id = user.dataset.id;
  cloneUserId.dataset.image = user.dataset.image;
  cloneUserId.dataset.name = user.dataset.name;
  cloneUserId.dataset.contact = user.dataset.contact;
  cloneUserId.dataset.time = 'Pending';

  emptyText.classList.add('hidden');
  const insertAfterElement = emptyText.nextElementSibling.nextElementSibling.nextElementSibling;
  insertAfterElement.insertAdjacentElement('afterend', cloneDateRegistered);
  insertAfterElement.insertAdjacentElement('afterend', cloneUser);
  insertAfterElement.insertAdjacentElement('afterend', cloneUserId);

  const action = {
    module: 'Check-in',
    submodule: 'Daily Pass',
    description: 'Process check-in user',
  };
  const data = {
    id: cloneUserId.dataset.id,
    image: cloneUserId.dataset.image,
    name: cloneUserId.dataset.name,
    contact: cloneUserId.dataset.contact,
    time: cloneUserId.dataset.time,
  };
  datasync.enqueue(action, data);
  billing.processPayment(data);

  if (main.sharedState.activeTab == 1)
    document.getElementById(`checkin-daily_tab2`).lastElementChild.classList.remove('hidden');

  main.toast(user.dataset.name + ', is now ready for check-in payment!', 'success');
}
