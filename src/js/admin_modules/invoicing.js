import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'invoicing';
const MODULE_NAME = 'Invoicing';

let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName != SECTION_NAME) return;

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
  const searchInput = document.getElementById(`${SECTION_NAME}SectionTwoSearch`);
  main.findAtSectionTwo(SECTION_NAME, searchInput.value.trim(), 'equal_id', (result) => {
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
          icon: `${getEmoji('💵')}`,
          title: 'Cash',
          subtitle: 'Traditional payment method',
        },
        {
          icon: `${getEmoji('💳')}`,
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
        main: `Complete payment transaction ${getEmoji('🔏')}`,
      },
    };
    const { fullName } = main.decodeName(inputs.payment.user.data[1]);
    inputs.header.title = `${fullName} ${getEmoji('🔏', 26)}`;

    const isReservation = transaction.dataset.type.includes('reservation');
    if (isReservation) {
      inputs.short[0].value = inputs.payment.user.data[3];
      inputs.short[0].locked = true;
      inputs.spinner[0].locked = true;
    }

    main.openModal('green', inputs, (result) => {
      if (!main.isValidPaymentAmount(+result.short[0].value)) {
        main.toast(`Invalid amount: ${result.short[0].value}`, 'error');
        return;
      }
      if (
        result.radio[0].selected == 2 &&
        ((result.short[1].value != 'N/A' && /[^0-9]/.test(result.short[1].value)) ||
          result.short[1].value == 'N/A' ||
          result.short[1].value == '')
      ) {
        main.toast(`Invalid reference: ${result.short[1].value}`, 'error');
        return;
      }
      if (result.radio[0].selected == 1) {
        result.short[1].value = 'N/A';
      }
      main.openConfirmationModal(`Complete transaction: ${fullName} (${transaction.dataset.id})`, () => {
        completeTransaction(transaction.dataset.id, result, isReservation);
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
      });
    });
  });
}

function completeTransaction(id, result, isReservation) {
  const columnsData = [
    'id_' + id,
    {
      type: 'object_refnum',
      data: [result.payment.user.data[0], result.payment.user.id, result.short[1].value],
    },
    'custom_datetime_today',
  ];
  console.log(columnsData);
  main.createAtSectionOne(SECTION_NAME, columnsData, 1, '', (_, status1) => {
    if (status1 == 'success') {
      main.createAtSectionOne(SECTION_NAME, columnsData, 2, '', (editedResult, status2) => {
        if (status2 == 'success') {
          const action = {
            module: MODULE_NAME,
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

          main.deleteAtSectionTwo(SECTION_NAME, id);

          // updating "Pending" value
          let items;
          if (isReservation) {
            items = document.getElementById('inquiry-reservationSectionOneListEmpty2').parentElement.parentElement
              .children;
            for (let i = 1; i < items.length; i++) {
              if (items[i].dataset.tid == id) {
                items[i].dataset.amount = data.payment_amount;
                items[i].dataset.datetime = editedResult.dataset.datetime;
                items[i].children[4].innerHTML = editedResult.dataset.datetime;
                break;
              }
            }
          } else {
            items = document.getElementById('inquiry-regularSectionOneListEmpty2').parentElement.parentElement.children;
            for (let i = 1; i < items.length; i++) {
              if (items[i].dataset.tid == id) {
                items[i].dataset.amount = data.payment_amount;
                items[i].dataset.time = editedResult.dataset.datetime.split(' - ')[1];
                items[i].dataset.datetime = editedResult.dataset.datetime;
                items[i].children[2].innerHTML = editedResult.dataset.datetime;
                break;
              }
            }
          }

          main.createRedDot(SECTION_NAME, 1);
          main.createRedDot(SECTION_NAME, 2);
          if (isReservation) {
            main.createRedDot('inquiry-reservation', 'sub');
            main.createRedDot('inquiry-reservation', 2);
          } else {
            main.createRedDot('inquiry-regular', 'sub');
            main.createRedDot('inquiry-regular', 2);
          }

          main.toast('Transaction successfully completed!', 'success');
          main.closeConfirmationModal();
          main.closeModal();
        }
      });
    }
  });
}

export function processCheckinPayment(user) {
  const data = {
    id: 'T_random',
    action: {
      module: MODULE_NAME,
      description: 'Enqueue check-in transaction',
    },
    type: 'user',
  };
  main.createAtSectionTwo(SECTION_NAME, data, (result) => {
    main.findAtSectionOne('inquiry-regular', user.id, 'equal_id', 2, (findResult) => {
      findResult.dataset.tid = result.dataset.id;
    });

    result.dataset.userid = user.id;
    result.innerHTML += `
      <div class="overflow-hidden text-ellipsis">
        ${result.dataset.actorid}<br>
        <small>
          ${result.dataset.actorname}<br>
          ${result.dataset.actorrole}
        </small>
      </div>
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
    user.usertype = 'regular check-in';
    user.userrate = 'regular rate';
    user.type = 'user_transaction';

    accesscontrol.log(data.action, user);

    main.createRedDot(SECTION_NAME, 'main');
  });
}

export function processReservationPayment(reservation) {
  const data = {
    id: 'T_random',
    action: {
      module: MODULE_NAME,
      description: 'Enqueue reservation transaction',
    },
    type: 'reservation',
  };
  main.createAtSectionTwo(SECTION_NAME, data, (result) => {
    main.findAtSectionOne('inquiry-reservation', reservation.id, 'equal_id', 2, (findResult) => {
      findResult.dataset.tid = result.dataset.id;
    });

    result.dataset.rid = reservation.id;
    result.dataset.userid = reservation.userid;
    result.innerHTML += `
      <div class="overflow-hidden text-ellipsis">
        ${result.dataset.actorid}<br>
        <small>
          ${result.dataset.actorname}<br>
          ${result.dataset.actorrole}
        </small>
      </div>
      <div class="overflow-hidden text-ellipsis">
        ${result.dataset.id}<br>
        <small>
          ${result.dataset.module}<br>
          ${result.dataset.description}
        </small>
      </div>
      <div class="overflow-hidden text-ellipsis">
        ${reservation.id}<br>
        <small>
          ${Object.entries(reservation)
            .filter(([key]) => !['id'].includes(key))
            .map(([_, value]) => (value ? `${value}` : 'N/A'))
            .filter(Boolean)
            .join('<br>')}
        </small>
      </div>
    `;

    data.action.id = result.dataset.id;

    accesscontrol.log(data.action, reservation);

    main.createRedDot(SECTION_NAME, 'main');
  });
}

export default { processCheckinPayment, processReservationPayment };
