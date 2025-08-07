import main from '../admin_main.js';
import accesscontrol from './accesscontrol.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'invoicing') return;
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
  const searchInput = document.getElementById('invoicingSectionTwoSearch');
  main.findAtSectionTwo('invoicing', searchInput.value.trim(), 'equal', (result) => {
    const transaction = result;

    if (!transaction) {
      main.toast("There's no pending transaction with that ID!", 'error');
      return;
    }

    const inputs = {
      header: {
        subtitle: 'Pending payment processing form',
      },
      short: [
        { placeholder: 'Amount', value: '', required: true },
        { placeholder: 'Reference number', value: 'N/A', required: true },
      ],
      spinner: [
        {
          label: 'Rate',
          placeholder: 'Select payment rate',
          selected: 1,
          options: [
            { value: 'regular', label: 'Regular' },
            { value: 'student', label: 'Student Discount' },
          ],
        },
      ],
      radio: [
        { label: 'Payment', selected: 1 },
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
          data: transaction.children[3].lastElementChild.innerHTML.split('<br>').map((item) => item.trim()),
        },
        purpose: transaction.children[2].textContent.trim(),
      },
      footer: {
        main: 'Complete payment transaction 🔏',
      },
    };
    const userProperName =
      inputs.payment.user.data[1].split(':://')[0] + ' ' + inputs.payment.user.data[1].split(':://')[1];
    inputs.header.title = `${userProperName} 🔏`;

    main.openModal('green', inputs, (result) => {
      if (!isValidPaymentAmount(+result.short[0].value)) {
        main.toast(`Invalid amount: ${result.short[0].value}`, 'error');
        return;
      }
      main.openConfirmationModal(`Complete transaction: ${userProperName} (${transaction.dataset.id})`, () => {
        completeTransaction(transaction.dataset.id, result);
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
      });
    });
  });
}

function isValidPaymentAmount(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return false;
  }

  if (amount <= 0) {
    return false;
  }

  if (Math.round(amount * 100) !== amount * 100) {
    return false;
  }

  return true;
}

function completeTransaction(id, result) {
  const columnsData = [
    'id_' + id,
    {
      type: 'user',
      data: [
        result.payment.user.id,
        result.payment.user.data[0],
        result.payment.user.data[1],
        result.payment.user.data[2],
      ],
    },
    'custom_datetime_today',
  ];
  main.createAtSectionOne('invoicing', columnsData, 1, '', (_, status1) => {
    if (status1 == 'success') {
      main.createAtSectionOne('invoicing', columnsData, 2, '', (editedResult, status2) => {
        if (status2 == 'success') {
          const action = {
            module: 'invoicing',
            description: 'Transaction complete',
          };
          const data = {
            id: id,
            user_id: result.payment.user.id,
            payment_type: result.radio[result.radio[0].selected].title.toLowerCase(),
            payment_amount: result.short[0].value,
            payment_refnum: result.short[1].value,
            payment_rate: result.spinner[0].options[result.spinner[0].selected - 1].value,
            purpose: result.payment.purpose
              .replace(/^T\d+\s+/gm, '')
              .replace(/\s+/g, ' ')
              .trim(),
            datetime: editedResult.dataset.datetime,
            type: 'transaction',
          };
          accesscontrol.log(action, data);

          main.deleteAtSectionTwo('invoicing', id);

          // updating "Pending" value
          const items = document.getElementById('checkin-dailySectionOneListEmpty2').parentElement.parentElement
            .children;
          for (let i = 1; i < items.length; i++) {
            if (items[i].dataset.tid == id) {
              items[i].dataset.amount = data.payment_amount;
              items[i].dataset.datetime = editedResult.dataset.datetime;
              items[i].children[2].innerHTML = editedResult.dataset.datetime;
              break;
            }
          }

          main.createRedDot('invoicing', 1);
          main.createRedDot('invoicing', 2);
          main.createRedDot('checkin', 'main');
          main.createRedDot('checkin-daily', 'sub');
          main.createRedDot('checkin-daily', 2);

          main.toast('Transaction successfully completed!', 'success');
          main.closeConfirmationModal();
          main.closeModal();
        }
      });
    }
  });
}

export function processPayment(user) {
  const data = {
    id: 'random',
    action: {
      module: 'invoicing',
      description: 'Enqueue check-in transaction',
    },
  };
  main.createAtSectionTwo('invoicing', data, (result) => {
    // updating transaction id of pending user
    const items = document.getElementById('checkin-dailySectionOneListEmpty2').parentElement.parentElement.children;
    for (let i = 1; i < items.length; i++) {
      if (items[i].dataset.id == user.id) {
        items[i].dataset.tid = result.dataset.id;
        break;
      }
    }

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

    data.action.id = result.dataset.id;
    user.usertype = 'daily pass';
    user.userrate = 'regular';

    accesscontrol.log(data.action, user);

    main.createRedDot('invoicing', 'main');
  });
}

export default { processPayment };
