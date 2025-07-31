import modal from '../admin_main.js';
import billing from '../billing/content.js';
import dataSync from '../data_sync/content.js';

// Get DOM elements - matching the HTML IDs exactly
const checkin_daily_tab1 = document.getElementById('sales_tab1'); // HTML uses sales_tab1
const checkin_daily_tab2 = document.getElementById('sales_tab2'); // HTML uses sales_tab2
const checkinDailySection1Search = document.getElementById('salesSection1Search'); // HTML uses salesSection1Search
const checkinDailySection2Input = document.getElementById('salesSection2Input'); // HTML uses salesSection2Input
const checkinDailySection2MainBtn = document.getElementById('salesSection2MainBtn'); // HTML uses salesSection2MainBtn
const sales_all = document.getElementById('sales_all');
const checkin_daily_recent = document.getElementById('sales_recent'); // HTML uses sales_recent
const salesAllEmpty = document.getElementById('salesAllEmpty');
const checkinDailyRecentEmpty = document.getElementById('salesRecentEmpty'); // HTML uses salesRecentEmpty

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

  const newTab1 = document.getElementById('sales_tab1');
  const newTab2 = document.getElementById('sales_tab2');

  if (tabIndex == 1) {
    newTab1.children[0].classList.remove('text-gray-300');
    newTab1.children[1].children[0].classList.remove('hidden');
    newTab1.children[1].children[1].classList.add('hidden');
    newTab2.children[0].classList.add('text-gray-300');
    newTab2.children[1].children[0].classList.add('hidden');
    newTab2.children[1].children[1].classList.remove('hidden');
  } else {
    newTab1.children[0].classList.add('text-gray-300');
    newTab1.children[1].children[0].classList.add('hidden');
    newTab1.children[1].children[1].classList.remove('hidden');
    newTab2.children[0].classList.remove('text-gray-300');
    newTab2.children[1].children[0].classList.remove('hidden');
    newTab2.children[1].children[1].classList.add('hidden');
  }

  activeTimeout = setTimeout(() => {
    if (tabIndex == 1) {
      newTab2.children[0].classList.remove('text-gray-300');
      newTab2.children[1].children[0].classList.remove('hidden');
      newTab2.children[1].children[1].classList.add('hidden');
    } else {
      newTab1.children[0].classList.remove('text-gray-300');
      newTab1.children[1].children[0].classList.remove('hidden');
      newTab1.children[1].children[1].classList.add('hidden');
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

  // Update search input reference after cloning
  const searchInput = document.getElementById('salesSection1Search');
  searchInput.value = '';
  searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    let children;
    if (tabIndex == 1) {
      children = document.getElementById('sales_all').children;
    } else {
      children = document.getElementById('sales_recent').children;
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
  searchInput.dispatchEvent(new Event('input'));

  if (tabIndex == 1) {
    document.getElementById('sales_all').classList.remove('hidden');
    document.getElementById('sales_recent').classList.add('hidden');
  } else {
    document.getElementById('sales_all').classList.add('hidden');
    document.getElementById('sales_recent').classList.remove('hidden');
  }

  // Update button click handler
  const mainBtn = document.getElementById('salesSection2MainBtn');
  const inputField = document.getElementById('salesSection2Input');
  
  mainBtn.onclick = () => {
    if (modal.checkIfEmpty(inputField.parentElement)) return;

    let user;
    const salesAllContainer = document.getElementById('sales_all');
    for (let i = 3; i < salesAllContainer.children.length; i++) {
      if (salesAllContainer.children[i].dataset.id == inputField.value) {
        user = salesAllContainer.children[i];
        break;
      }
    }

    if (!user) {
      modal.toast("There's no user with that ID!", 'error');
      return;
    }

    const recentContainer = document.getElementById('sales_recent');
    for (let i = 3; i < recentContainer.children.length; i++) {
      if (recentContainer.children[i].dataset.id == user.dataset.id) {
        modal.openConfirmationModal('Multiple pending transaction: User with multiple pending transactions', () => {
          processCheckinUser(user.dataset.id, user.dataset.name, user.dataset.contact,);
          inputField.value = '';
          modal.closeConfirmationModal();
        });
        return;
      }
    }

    processCheckinUser(user.dataset.id, user.dataset.name, user.dataset.contact,);
    inputField.value = '';
  };
}

export function registerNewUser(image, productName, productType, quantity) {
  const templateRow = document.createElement('div');
  templateRow.className = 'grid grid-cols-5 p-3 border-b hover:bg-gray-50';

  templateRow.innerHTML = `
  <p class="font-mono text-lg text-bold whitespace-nowrap truncate"></p> <!-- ID -->
  <div class="flex items-center gap-2 pl-4">
   <img class="w-9 h-9 rounded-full object-cover" />
    <span class="text-lg text-gray-900 truncate max-w-[150px]"></span> <!-- Product Name -->
  </div>
  <p class="text-lg text-gray-900  text-bold pl-4 whitespace-nowrap truncate"></p> <!-- Type of Product -->
  <p class="text-lg text-gray-900 text-bold pl-4 whitespace-nowrap truncate"></p> <!-- Date -->
  <p class="text-lg text-gray-900s text-bold pl-4 whitespace-nowrap truncate"></p> <!-- Quantity -->
`;


  const clone = templateRow.cloneNode(true);

  const randomId = 'U' + Math.floor(100000 + Math.random() * 900000) + '' + Math.floor(100000 + Math.random() * 900000);
  const fullName = `${productName} ${productType}`;

  clone.children[0].textContent = randomId;
  clone.children[1].children[0].src = image;
  clone.children[1].children[1].textContent = productName;
  clone.children[2].textContent = productType;
  clone.children[3].textContent = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  clone.children[4].textContent = quantity;

  clone.dataset.id = randomId;
  clone.dataset.name = fullName;
  clone.dataset.productName = productName;
  clone.dataset.productType = productType;
  clone.dataset.date = clone.children[3].textContent;
  clone.dataset.quantity = quantity;

  function continueRegisterNewUser() {
    const salesAllEmpty = document.getElementById('salesAllEmpty');
    salesAllEmpty.classList.add('hidden');
    salesAllEmpty.insertAdjacentElement('afterend', clone);

    dataSync.enqueue({
      module: 'sales',
      submodule: 'Daily Pass',
      description: 'Register user',
    }, {
      id: clone.dataset.id,
      name: clone.dataset.name,
      quantity: clone.dataset.quantity,
      image: clone.children[1].children[0].src,
      date: clone.dataset.date,
    });

    if (currentActiveTab === 2) {
      const tab1 = document.getElementById('sales_tab1');
      tab1?.lastElementChild?.classList.remove('hidden');
    }

    modal.toast(`${clone.dataset.name}, successfully registered!`, 'success');
    modal.closeModal();
  }

  const salesAllContainer = document.getElementById('sales_all');
  for (let i = 3; i < salesAllContainer.children.length; i++) {
    const user = salesAllContainer.children[i];
    if (user.dataset.name?.toLowerCase().trim() === clone.dataset.name.toLowerCase().trim()) {
      modal.openConfirmationModal('Data duplication: User with same details', continueRegisterNewUser);
      return;
    }
  }

  continueRegisterNewUser();
}



export function processCheckinUser(id, product, quantity) {
  const templateRow = document.createElement('div');
  templateRow.className = 'grid grid-cols-4 p-3 border-b hover:bg-gray-50';

  templateRow.innerHTML = `
    <p class="font-mono text-sm"></p> <!-- ID -->
    <div class="flex items-center gap-2 pl-4">
      <img class="w-9 h-9 rounded-full object-cover" />
      <span class="text-sm text-gray-900"></span> <!-- Product Name -->
    </div>
    <p class="text-sm text-gray-900 pl-4"></p> <!-- Type of Product -->
    <p class="text-sm text-gray-600 pl-4"></p> <!-- Status -->
    <p class="text-sm text-gray-600 pl-4"></p> <!-- Quantity -->
  `;

  const [productName, ...rest] = product.trim().split(' ');
  const productType = rest.join(' ') || '(unspecified)';
  const fullName = `${productName} ${productType}`;

  const clone = templateRow.cloneNode(true);

  clone.children[0].textContent = id;
  clone.children[1].children[0].src = 'https://placehold.co/48x48';
  clone.children[1].children[1].textContent = productName;
  clone.children[2].textContent = productType;
  clone.children[3].textContent = 'Pending';
  clone.children[4].textContent = quantity;

  clone.dataset.id = id;
  clone.dataset.name = fullName;
  clone.dataset.productName = productName;
  clone.dataset.productType = productType;
  clone.dataset.time = 'Pending';
  clone.dataset.quantity = quantity;

  const checkinDailyRecentEmpty = document.getElementById('salesRecentEmpty');
  checkinDailyRecentEmpty.classList.add('hidden');
  checkinDailyRecentEmpty.insertAdjacentElement('afterend', clone);

  const data = {
    id: clone.dataset.id,
    name: clone.dataset.name,
    quantity: clone.dataset.quantity,
    image: clone.children[1].children[0].src,
  };

  dataSync.enqueue({
    module: 'sales',
    submodule: 'Daily Pass',
    description: 'Process check-in user',
  }, data);

  billing.processPayment(data);

  if (currentActiveTab === 1) {
    const tab2 = document.getElementById('sales_tab2');
    tab2?.lastElementChild?.classList.remove('hidden');
  }

  modal.toast(`${clone.dataset.name}, is now ready for check-in payment!`, 'success');
}


export default { registerNewUser, checkInUser: processCheckinUser };

document.addEventListener('DOMContentLoaded', function () {
  showTab(1);
}); 