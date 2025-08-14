import global from '../_global.js';
import main from '../admin_main.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'maintenance-datasync') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  subBtn.classList.remove('hidden');
  subBtn.addEventListener('click', subBtnFunction);
  sectionTwoMainBtn = document.getElementById(`${main.sharedState.sectionName}SectionTwoMainBtn`);
  sectionTwoMainBtn.addEventListener('click', sectionTwoMainBtnFunction);

  // not default code: sample of custom content setup
  setupHeader();
  setupDataQueue();
});

async function mainBtnFunction() {
  // try {
  //   const response = await fetch(`${global.API_BASE_URL}/sales`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ purpose: 'test', amount: 69 }),
  //   });
  //   const data = await response.json();
  //   if (response.ok) {
  //     main.toast(data.message, 'success');
  //     console.log('result', data.result);
  //   } else {
  //     main.toast(data.error, 'error');
  //   }
  // } catch (error) {
  //   main.toast("There's no connection to the server!", 'error');
  // }
}

function subBtnFunction() {}

function sectionTwoMainBtnFunction() {
  // try {
  //   const response = await fetch(`${global.API_BASE_URL}/sales/1`);
  //   const data = await response.json();
  //   if (response.ok) {
  //     main.toast(data.message, 'success');
  //     console.log('result', data.result);
  //   } else {
  //     main.toast(data.error, 'error');
  //   }
  // } catch (error) {
  //   main.toast("There's no connection to the server!", 'error');
  // }
}

function setupHeader() {
  // new MutationObserver(function (mutations) {
  //   mutations.forEach(function (mutation) {
  //     if (mutation.attributeName === 'data-status') {
  //       dataSyncHeaderContent.innerHTML = dataSyncHeaderContent.getAttribute(
  //         dataSyncHeaderContent.getAttribute(mutation.attributeName)
  //       );
  //     }
  //   });
  // }).observe(dataSyncHeaderContent, { attributes: true });
  // dataSyncHeaderContent.setAttribute('data-status', 'data-auto-awake');
}

function setupDataQueue() {}

export function enqueue(action, data) {
  const editedData = {
    action: {
      module: action.module,
      description: action.description,
    },
  };
  main.createAtSectionTwo('maintenance-datasync', editedData, (result) => {
    result.innerHTML += `
    <div class="overflow-hidden text-ellipsis">
      ${result.dataset.actorid}<br>
      <small>
        ${result.dataset.actorname}<br>
        ${result.dataset.actorrole}
      </small>
    </div>
    <div class="overflow-hidden text-ellipsis">
      ${action.module}<br>
      <small>
        ${Object.entries(action)
          .filter(([key]) => !['module'].includes(key))
          .map(([_, value]) => (value ? `${value}` : 'N/A'))
          .filter(Boolean)
          .join('<br>')}
      </small>
    </div>
    <div class="overflow-hidden text-ellipsis">
      ${data.id}<br>
      <small>
        ${Object.entries(data)
          .filter(([key]) => !['id'].includes(key))
          .map(([_, value]) => (value ? `${value}` : 'N/A'))
          .filter(Boolean)
          .join('<br>')}
      </small>
    </div>
  `;
  });
}

export default { enqueue };
