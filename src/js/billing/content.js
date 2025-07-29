import modal from '../admin_main.js';
import dataSync from '../data_sync/content.js';

const active = billing_tab1.className;
const inactive = billing_tab2.className;
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
    billing_tab1.lastElementChild.classList.add('hidden');
  } else {
    billing_tab2.lastElementChild.classList.add('hidden');
  }

  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }

  const tab1Clone = billing_tab1.cloneNode(true);
  const tab2Clone = billing_tab2.cloneNode(true);
  billing_tab1.replaceWith(tab1Clone);
  billing_tab2.replaceWith(tab2Clone);

  const newTab1 = document.getElementById('billing_tab1');
  const newTab2 = document.getElementById('billing_tab2');

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

  billingSection1Search.value = '';
  billingSection1Search.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    let children;
    if (tabIndex == 1) {
      children = billing_complete_recent.children;
    } else {
      children = billing_complete_all.children;
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
  billingSection1Search.dispatchEvent(new Event('input'));

  billingSection2Input.value = '';
  billingSection2Input.addEventListener('input', (event) => {
    const searchTerm = event.target.value;
    for (
      let i = 2;
      i < billingSection2Empty.parentElement.children.length;
      i++
    ) {
      const child = billingSection2Empty.parentElement.children[i];
      const textContent = child.children[0].textContent;

      if (textContent.includes(searchTerm)) {
        child.classList.remove('hidden');
      } else {
        child.classList.add('hidden');
      }
    }
  });
  billingSection2Input.dispatchEvent(new Event('input'));

  if (tabIndex == 1) {
    billing_complete_recent.classList.remove('hidden');
    billing_complete_all.classList.add('hidden');
  } else {
    billing_complete_recent.classList.add('hidden');
    billing_complete_all.classList.remove('hidden');
  }

  billingSection2MainBtn.onclick = () => {
    if (modal.checkIfEmpty(billingSection2Input.parentElement)) return;

    let transaction;
    for (
      let i = 2;
      i < billingSection2Empty.parentElement.children.length;
      i++
    ) {
      if (
        billingSection2Empty.parentElement.children[i].children[0].textContent
          .trim()
          .split(/\s+/)[0] == billingSection2Input.value
      ) {
        transaction = billingSection2Empty.parentElement.children[i];
        i = 9999;
      }
    }

    if (!transaction) {
      modal.toast("There's no transaction with that ID!", 'error');
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
          data: transaction.children[1].lastElementChild.innerHTML
            .split('<br>')
            .map((item) => item.trim()),
        },
        user: {
          id: transaction.children[2].textContent.trim().split(' ')[0].trim(),
          data: transaction.children[2].lastElementChild.innerHTML
            .split('<br>')
            .map((item) => item.trim()),
        },
        type: 'cash',
        purpose: transaction.children[0].textContent.trim(),
      },
    };
    modal.openModal(
      'green//Process Pending Transaction 🔏//Pending payment processing form//Proceed 🔏',
      inputs,
      (result) => {
        modal.openConfirmationModal('Complete transaction: ' + id, () => {
          completeTransaction(id, result);
          billingSection2Input.value = '';
        });
      }
    );
  };
}

function completeTransaction(id, result) {
  const billingCompleteRecentItem =
    billingCompleteRecentEmpty.nextElementSibling.cloneNode(true);
  const billingCompleteAllItem =
    billingCompleteAllEmpty.nextElementSibling.cloneNode(true);

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

  billingCompleteRecentItem.children[0].textContent = id;
  billingCompleteRecentItem.children[1].textContent = result.payment.user.id;
  billingCompleteRecentItem.children[2].textContent = today + ' - ' + time;
  billingCompleteAllItem.children[0].textContent = id;
  billingCompleteAllItem.children[1].textContent = result.payment.user.id;
  billingCompleteAllItem.children[2].textContent = today + ' - ' + time;

  billingCompleteRecentItem.classList.remove('hidden');
  billingCompleteAllItem.classList.remove('hidden');

  billingCompleteRecentEmpty.classList.add('hidden');
  billingCompleteRecentEmpty.nextElementSibling.insertAdjacentElement(
    'afterend',
    billingCompleteRecentItem
  );
  billingCompleteAllEmpty.classList.add('hidden');
  billingCompleteAllEmpty.nextElementSibling.insertAdjacentElement(
    'afterend',
    billingCompleteAllItem
  );

  for (let i = 2; i < billingSection2Empty.parentElement.children.length; i++) {
    if (
      billingSection2Empty.parentElement.children[i].children[0].textContent
        .trim()
        .split(/\s+/)[0] == id
    ) {
      billingSection2Empty.parentElement.children[i].remove();
      if (billingSection2Empty.parentElement.children.length == 2)
        billingSection2Empty.classList.remove('hidden');
      i = 9999;
    }
  }

  for (let i = 3; i < checkin_daily_recent.children.length; i++) {
    if (checkin_daily_recent.children[i].dataset.id == result.payment.user.id) {
      checkin_daily_recent.children[i].children[2].textContent = time;
      checkin_daily_recent.children[i].dataset.time = time;
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
  dataSync.enqueue(action, editedResult);

  if (currentActiveTab == 1) {
    billing_tab2.lastElementChild.classList.remove('hidden');
  } else {
    billing_tab1.lastElementChild.classList.remove('hidden');
  }

  modal.toast('Transaction successfully completed!', 'success');
  modal.closeConfirmationModal();
  modal.closeModal();
}

export function processPayment(user) {
  const billingItem = billingSection2Empty.nextElementSibling.cloneNode(true);

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
  dataSync.enqueue(action, user);

  Array.from(document.querySelectorAll('.sidebar-main-btn'))
    .find((btn) => btn.dataset.section === 'billing')
    .lastElementChild.classList.remove('hidden');

  billingItem.classList.remove('hidden');
  billingSection2Empty.classList.add('hidden');
  billingSection2Empty.nextElementSibling.insertAdjacentElement(
    'afterend',
    billingItem
  );
}

export default { processPayment };

document.addEventListener('DOMContentLoaded', function () {
  showTab(1);
});
