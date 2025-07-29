import modal from '../admin_main.js';
import billing from '../billing/content.js';
import dataSync from '../data_sync/content.js';

const active = checkin_daily_tab1.className;
const inactive = checkin_daily_tab2.className;
let currentActiveTab;

let lastTabSwitchTime = 0;
const TAB_SWITCH_DELAY = 1000;
let activeTimeout = null;

function showTab(tabIndex) {
  const now = Date.now();
  if (now - lastTabSwitchTime < TAB_SWITCH_DELAY) {
    return;
  }
  lastTabSwitchTime = now;
  currentActiveTab = tabIndex;

  if (tabIndex == 1) {
    checkin_daily_tab1.lastElementChild.classList.add('hidden');
  } else {
    checkin_daily_tab2.lastElementChild.classList.add('hidden');
  }

  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }

  const tab1Clone = checkin_daily_tab1.cloneNode(true);
  const tab2Clone = checkin_daily_tab2.cloneNode(true);
  checkin_daily_tab1.replaceWith(tab1Clone);
  checkin_daily_tab2.replaceWith(tab2Clone);

  const newTab1 = document.getElementById('checkin_daily_tab1');
  const newTab2 = document.getElementById('checkin_daily_tab2');

  newTab1.children[0].classList.remove('text-gray-300');
  newTab1.children[1].classList.remove('hidden');
  newTab1.children[2].classList.add('hidden');
  newTab2.children[0].classList.remove('text-gray-300');
  newTab2.children[1].classList.remove('hidden');
  newTab2.children[2].classList.add('hidden');

  if (tabIndex == 1) {
    newTab1.children[0].classList.remove('text-gray-300');
    newTab1.children[1].classList.remove('hidden');
    newTab1.children[2].classList.add('hidden');
    newTab2.children[0].classList.add('text-gray-300');
    newTab2.children[1].classList.add('hidden');
    newTab2.children[2].classList.remove('hidden');
  } else {
    newTab1.children[0].classList.add('text-gray-300');
    newTab1.children[1].classList.add('hidden');
    newTab1.children[2].classList.remove('hidden');
    newTab2.children[0].classList.remove('text-gray-300');
    newTab2.children[1].classList.remove('hidden');
    newTab2.children[2].classList.add('hidden');
  }

  activeTimeout = setTimeout(() => {
    if (tabIndex == 1) {
      newTab2.children[0].classList.remove('text-gray-300');
      newTab2.children[1].classList.remove('hidden');
      newTab2.children[2].classList.add('hidden');
    } else {
      newTab1.children[0].classList.remove('text-gray-300');
      newTab1.children[1].classList.remove('hidden');
      newTab1.children[2].classList.add('hidden');
    }
    activeTimeout = null;
  }, TAB_SWITCH_DELAY);

  newTab1.addEventListener('click', () => {
    showTab(1);
  });

  newTab2.addEventListener('click', () => {
    showTab(2);
  });

  if (tabIndex === 1) {
    newTab1.className = active;
    newTab2.className = inactive;
  } else if (tabIndex === 2) {
    newTab1.className = inactive;
    newTab2.className = active;
  }

  checkinDailySection1Search.value = '';
  checkinDailySection1Search.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    let children;
    if (tabIndex == 1) {
      children = checkin_daily_all.children;
    } else {
      children = checkin_daily_recent.children;
    }

    for (let i = 3; i < children.length; i++) {
      const child = children[i];
      const textContent = child.textContent.toLowerCase();

      if (textContent.includes(searchTerm)) {
        child.classList.remove('hidden');
      } else {
        child.classList.add('hidden');
      }
    }
  });
  checkinDailySection1Search.dispatchEvent(new Event('input'));

  if (tabIndex == 1) {
    checkin_daily_all.classList.remove('hidden');
    checkin_daily_recent.classList.add('hidden');
  } else {
    checkin_daily_all.classList.add('hidden');
    checkin_daily_recent.classList.remove('hidden');
  }

  checkinDailySection2MainBtn.onclick = () => {
    if (modal.checkIfEmpty(checkinDailySection2Input.parentElement)) return;

    let user;
    for (let i = 3; i < checkin_daily_all.children.length; i++) {
      if (checkin_daily_all.children[i].dataset.id == checkinDailySection2Input.value) {
        user = checkin_daily_all.children[i];
        i = 9999;
      }
    }

    if (!user) {
      modal.toast("There's no user with that ID!", 'error');
      return;
    }

    for (let i = 3; i < checkin_daily_recent.children.length; i++) {
      if (checkin_daily_recent.children[i].dataset.id == user.dataset.id) {
        modal.openConfirmationModal('Multiple pending transaction: User with multiple pending transactions', () => {
          processCheckinUser(user.dataset.id, user.dataset.name, user.dataset.contact);
          checkinDailySection2Input.value = '';
          modal.closeConfirmationModal();
        });
        return;
      }
    }

    processCheckinUser(user.dataset.id, user.dataset.name, user.dataset.contact);
    checkinDailySection2Input.value = '';
  };
}

export function registerNewUser(image, firstName, lastName, emailContact) {
  const clone = checkinDailyAllEmpty.nextElementSibling.cloneNode(true);

  const randomId_A = Math.floor(100000 + Math.random() * 900000);
  const randomId_B = Math.floor(100000 + Math.random() * 900000);
  clone.children[0].textContent = 'U' + randomId_A + '' + randomId_B;
  clone.children[1].children[0].src = image;
  clone.children[1].children[1].textContent = `${firstName} ${lastName}`;
  clone.children[2].textContent = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  clone.dataset.id = clone.children[0].textContent;
  clone.dataset.name = clone.children[1].children[1].textContent;
  clone.dataset.date = clone.children[2].textContent;
  clone.dataset.contact = emailContact;

  clone.classList.remove('hidden');

  function continueRegisterNewUser() {
    checkinDailyAllEmpty.classList.add('hidden');
    checkinDailyAllEmpty.nextElementSibling.insertAdjacentElement('afterend', clone);

    const action = {
      module: 'Check-in',
      submodule: 'Daily Pass',
      description: 'Register user',
    };
    const data = {
      id: clone.dataset.id,
      name: clone.dataset.name,
      contact: clone.dataset.contact,
      image: clone.children[1].children[0].src,
      date: clone.dataset.date,
    };
    dataSync.enqueue(action, data);

    if (currentActiveTab == 2) checkin_daily_tab1.lastElementChild.classList.remove('hidden');

    modal.toast(clone.dataset.name + ', successfully registered!', 'success');
    modal.closeModal();
  }

  for (let i = 3; i < checkin_daily_all.children.length; i++) {
    const user = checkin_daily_all.children[i];
    if (user.dataset.name.toLowerCase().trim() == clone.dataset.name.toLowerCase().trim()) {
      modal.openConfirmationModal('Data duplication: User with same details', continueRegisterNewUser);
      return;
    }
  }

  continueRegisterNewUser();
}

export function processCheckinUser(id, username, emailContact) {
  const clone = checkinDailyRecentEmpty.nextElementSibling.cloneNode(true);

  clone.children[0].textContent = id;
  clone.children[1].children[1].textContent = username;
  clone.children[2].textContent = 'Pending';

  clone.dataset.id = id;
  clone.dataset.name = username;
  clone.dataset.time = clone.children[2].textContent;
  clone.dataset.contact = emailContact;

  clone.classList.remove('hidden');
  checkinDailyRecentEmpty.classList.add('hidden');
  checkinDailyRecentEmpty.nextElementSibling.insertAdjacentElement('afterend', clone);

  const action = {
    module: 'Check-in',
    submodule: 'Daily Pass',
    description: 'Process check-in user',
  };
  const data = {
    id: clone.dataset.id,
    name: clone.dataset.name,
    contact: clone.dataset.contact,
    image: clone.children[1].children[0].src,
  };
  dataSync.enqueue(action, data);
  billing.processPayment(data);

  if (currentActiveTab == 1) checkin_daily_tab2.lastElementChild.classList.remove('hidden');

  modal.toast(username + ', is now ready for check-in payment!', 'success');
}

export default { registerNewUser, checkInUser: processCheckinUser };

document.addEventListener('DOMContentLoaded', function () {
  showTab(1);
});
