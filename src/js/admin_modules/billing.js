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
  main.findAtSectionTwo('billing', searchInput.value, (result) => {
    const transaction = result;

    if (!transaction) {
      main.toast("There's no transaction with that ID!", 'error');
      return;
    }

    const inputs = {
      header: {
        title: 'Process Pending Transaction 🔏',
        subtitle: 'Pending payment processing form',
      },
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
          id: transaction.dataset.actorid,
          data: transaction.children[1].lastElementChild.innerHTML.split('<br>').map((item) => item.trim()),
        },
        user: {
          id: transaction.dataset.userid,
          data: transaction.children[2].lastElementChild.innerHTML.split('<br>').map((item) => item.trim()),
        },
        type: 'cash',
        purpose: transaction.children[0].textContent.trim(),
      },
      footer: {
        main: 'Proceed 🔏',
      },
    };

    main.openModal('green', inputs, (result) => {
      main.openConfirmationModal('Complete transaction: ' + transaction.dataset.id, () => {
        completeTransaction(transaction.dataset.id, result);
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
      });
    });
  });
}

function completeTransaction(id, result) {
  const columnsData = [
    'id_' + id,
    {
      type: 'userid',
      data: [
        result.payment.user.data[0],
        result.payment.user.id,
        result.payment.user.data[1],
        result.payment.user.data[2],
      ],
    },
    'datetime_today',
  ];
  main.createAtSectionOne('billing', columnsData, 1, '', () => {
    main.createAtSectionOne('billing', columnsData, 2, '', (generated) => {
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
        datetime: generated.datetime,
      };
      datasync.enqueue(action, editedResult);

      main.deleteAtSectionTwo('billing', id);

      // updating "Pending" value
      const items = document.getElementById('checkin-dailySectionOneListEmpty2').parentElement.parentElement.children;
      for (let i = 1; i < items.length; i++) {
        if (items[i].dataset.id == result.payment.user.id) {
          const time = generated.datetime.split('-')[1].trim();
          items[i].dataset.time = time;
          const btns = items[i].children[2].children[0].cloneNode(true);
          items[i].children[2].innerHTML = '';
          items[i].children[2].appendChild(btns);
          items[i].children[2].innerHTML += time;
          break;
        }
      }

      main.createRedDot('billing', 1);
      main.createRedDot('billing', 2);
      main.createRedDot('checkin', 'main');
      main.createRedDot('checkin-daily', 'sub');

      main.toast('Transaction successfully completed!', 'success');
      main.closeConfirmationModal();
      main.closeModal();
    });
  });
}

export function processPayment(user) {
  const data = {
    id: 'random',
    action: {
      module: 'Billing',
      description: 'Enqueue check-in transaction',
    },
  };
  main.createAtSectionTwo('billing', data, (result) => {
    result.dataset.userid = user.id;
    result.innerHTML += `
    <div class="overflow-hidden text-ellipsis">
      ${result.dataset.id}<br>
      <small>
        ${result.dataset.module}<br>
        ${result.dataset.description}
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
    datasync.enqueue(data.action, user);

    main.createRedDot('billing', 'main');
  });
}

export default { processPayment };
