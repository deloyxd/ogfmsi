import main from '../admin_main.js';
import datasync from './datasync.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'billing') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  subBtn.classList.remove('hidden');
  subBtn.addEventListener('click', subBtnFunction);
  sectionTwoMainBtn = document.getElementById(`${main.sharedState.sectionName}SectionTwoMainBtn`);
  sectionTwoMainBtn.addEventListener('click', sectionTwoMainBtnFunction);
});

function mainBtnFunction() {}

function subBtnFunction() {}

function sectionTwoMainBtnFunction() {
  const searchInput = document.getElementById('billingSectionTwoSearch');
  if (main.checkIfEmpty(searchInput.value)) return;

  let transaction = null;
  const emptyText = document.getElementById(`billingSectionTwoListEmpty`);
  for (let i = 2; i < emptyText.parentElement.children.length; i++) {
    if (emptyText.parentElement.children[i].children[0].textContent.trim().split(/\s+/)[0] == searchInput.value) {
      transaction = emptyText.parentElement.children[i];
      i = 9999;
    }
  }

  if (!transaction) {
    main.toast("There's no transaction with that ID!", 'error');
    return;
  }

  const id = transaction.children[0].textContent.trim().split(/\s+/)[0];
  const inputs = {
    short: [{ placeholder: 'Amount', value: '', required: true }],
    radio_label: 'Payment',
    radio: [
      {
        icon: '💵',
        title: 'Cash',
        subtitle: 'Traditional payment method',
      },
      {
        icon: '💳',
        title: 'Cashless',
        subtitle: 'Digital payment method',
      },
    ],
    payment: {
      actor: {
        id: transaction.children[1].textContent.trim().split(' ')[0].trim(),
        data: transaction.children[1].lastElementChild.innerHTML.split('<br>').map((item) => item.trim()),
      },
      user: {
        id: transaction.children[2].textContent.trim().split(' ')[0].trim(),
        data: transaction.children[2].lastElementChild.innerHTML.split('<br>').map((item) => item.trim()),
      },
      type: 'cash',
      purpose: transaction.children[0].textContent.trim(),
    },
  };

  main.openModal(
    'green//Process Pending Transaction 🔏//Pending payment processing form//Proceed 🔏',
    inputs,
    (result) => {
      main.openConfirmationModal('Complete transaction: ' + id, () => {
        completeTransaction(id, result);
        searchInput.value = '';
      });
    }
  );
}

function completeTransaction(id, result) {
  const emptyText1 = document.getElementById('billingSectionOneListEmpty1');
  const emptyText2 = document.getElementById('billingSectionOneListEmpty2');

  const cloneUserId1 = emptyText1.nextElementSibling.cloneNode(true);
  const cloneUser1 = emptyText1.nextElementSibling.nextElementSibling.cloneNode(true);
  const cloneUserData1 = document.createElement('div');
  cloneUserData1.className = 'items-center font-medium text-gray-900';
  cloneUserData1.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="/src/images/client_logo.jpg" class="h-10 w-10 rounded-full object-cover" />
        <p></p>
      </div>
  `;
  cloneUser1.appendChild(cloneUserData1);
  const cloneDateRegistered1 = emptyText1.nextElementSibling.nextElementSibling.nextElementSibling.cloneNode(true);
  const cloneUserId2 = emptyText2.nextElementSibling.cloneNode(true);
  const cloneUser2 = emptyText2.nextElementSibling.nextElementSibling.cloneNode(true);
  const cloneUserData2 = document.createElement('div');
  cloneUserData2.className = 'items-center font-medium text-gray-900';
  cloneUserData2.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="/src/images/client_logo.jpg" class="h-10 w-10 rounded-full object-cover" />
        <p></p>
      </div>
  `;
  cloneUser2.appendChild(cloneUserData2);
  const cloneDateRegistered2 = emptyText2.nextElementSibling.nextElementSibling.nextElementSibling.cloneNode(true);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  cloneUserId1.textContent = id;
  cloneUserData1.children[0].children[0].src = result.payment.user.data[0];
  cloneUserData1.children[0].children[1].textContent = result.payment.user.id;
  cloneDateRegistered1.innerHTML += today + ' - ' + time;
  cloneUserId2.textContent = id;
  cloneUserData2.children[0].children[0].src = result.payment.user.data[0];
  cloneUserData2.children[0].children[1].textContent = result.payment.user.id;
  cloneDateRegistered2.innerHTML += today + ' - ' + time;

  cloneUserId1.classList.remove('hidden');
  cloneUser1.classList.remove('hidden');
  cloneDateRegistered1.classList.remove('hidden');
  cloneUserId2.classList.remove('hidden');
  cloneUser2.classList.remove('hidden');
  cloneDateRegistered2.classList.remove('hidden');

  emptyText1.classList.add('hidden');
  emptyText2.classList.add('hidden');
  const insertAfterElement1 = emptyText1.nextElementSibling.nextElementSibling.nextElementSibling;
  insertAfterElement1.insertAdjacentElement('afterend', cloneDateRegistered1);
  insertAfterElement1.insertAdjacentElement('afterend', cloneUser1);
  insertAfterElement1.insertAdjacentElement('afterend', cloneUserId1);
  const insertAfterElement2 = emptyText2.nextElementSibling.nextElementSibling.nextElementSibling;
  insertAfterElement2.insertAdjacentElement('afterend', cloneDateRegistered2);
  insertAfterElement2.insertAdjacentElement('afterend', cloneUser2);
  insertAfterElement2.insertAdjacentElement('afterend', cloneUserId2);

  const emptyText = document.getElementById(`billingSectionTwoListEmpty`);
  for (let i = 2; i < emptyText.parentElement.children.length; i++) {
    if (emptyText.parentElement.children[i].children[0].textContent.trim().split(/\s+/)[0] == id) {
      emptyText.parentElement.children[i].remove();
      if (emptyText.parentElement.children.length == 2) emptyText.classList.remove('hidden');
      i = 9999;
    }
  }

  const columnCount = document.getElementById(`checkin-daily_tab2`).dataset.columncount;
  const items = document.getElementById('checkin-dailySectionOneListEmpty2').parentElement.children;
  for (let i = +columnCount + 1; i < items.length; i += columnCount) {
    if (items[i].dataset.id == result.payment.user.id) {
      items[i].dataset.time = time;
      const btns = items[i + 2].children[0].cloneNode(true);
      items[i + 2].textContent = time;
      items[i + 2].appendChild(btns);
      i = 9999;
    }
  }

  const action = {
    module: 'Billing',
    description: 'Transaction complete',
  };
  const editedResult = {
    id: id,
    user_id: result.payment.user.id,
    type: result.payment.type,
    amount: result.short[0].value,
    purpose: result.payment.purpose,
    time: time,
  };
  datasync.enqueue(action, editedResult);

  if (main.sharedState.activeTab == 1) {
    document.getElementById(`billing_tab2`).lastElementChild.classList.remove('hidden');
  } else {
    document.getElementById(`billing_tab1`).lastElementChild.classList.remove('hidden');
  }

  document.querySelector(`.sidebar-main-btn[data-section="checkin"]`).lastElementChild.classList.remove('hidden');
  document.querySelector(`.sidebar-sub-btn[data-section="checkin-daily"]`).lastElementChild.classList.remove('hidden');
  document.getElementById(`checkin-daily_tab2`).lastElementChild.classList.remove('hidden');

  main.toast('Transaction successfully completed!', 'success');
  main.closeConfirmationModal();
  main.closeModal();
}

export function processPayment(user) {
  const emptyText = document.getElementById(`billingSectionTwoListEmpty`);
  const billingItem = emptyText.nextElementSibling.cloneNode(true);

  const randomId_A = Math.floor(100000 + Math.random() * 900000);
  const randomId_B = Math.floor(100000 + Math.random() * 900000);
  const id = 'T' + randomId_A + '' + randomId_B;

  const actor = {
    name: 'Jestley',
    role: 'Admin',
    id: 'U288343611137',
  };
  const action = {
    module: 'Billing',
    description: 'Enqueue check-in transaction',
  };

  billingItem.innerHTML = `
    <div class="overflow-hidden text-ellipsis">
      ${id}<br>
      <small>
        ${action.module}<br>
        ${action.description}
      </small>
    </div>
    <div class="overflow-hidden text-ellipsis">
      ${actor.id}<br>
      <small>
        ${actor.name}<br>
        ${actor.role}
      </small>
    </div>
    <div class="overflow-hidden text-ellipsis">
      ${user.id}<br>
      <small>
        ${Object.entries(user)
          .filter(([key]) => !['id'].includes(key))
          .map(([_, value]) => (value ? `${value}` : 'N/A'))
          .filter(Boolean)
          .join('<br>')}
      </small>
    </div>
  `;

  user.type = 'daily pass';
  user.rate = 'regular';
  datasync.enqueue(action, user);

  document.querySelector(`.sidebar-main-btn[data-section="billing"]`).lastElementChild.classList.remove('hidden');

  billingItem.classList.remove('hidden');
  emptyText.classList.add('hidden');
  emptyText.nextElementSibling.insertAdjacentElement('afterend', billingItem);
}

export default { processPayment };
