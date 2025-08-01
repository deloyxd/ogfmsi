import main from './admin_main.js';

// default codes:
let mainBtn, subBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  // change to right sectionName
  if (main.sharedState.sectionName != 'datasync') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  subBtn.classList.remove('hidden');
  subBtn.addEventListener('click', subBtnFunction);

  // not default code: sample of custom content setup
  setupDataQueue();
});

function mainBtnFunction() {}

function subBtnFunction() {}

function setupDataQueue() {}

export function enqueue(action, data) {
  const emptyText = document.getElementById('datasyncSectionTwoListEmpty');
  const dataSyncItem = emptyText.nextElementSibling.cloneNode(true);

  const actor = {
    name: 'Jestley',
    role: 'Admin',
    id: 'U288343611137',
  };

  dataSyncItem.innerHTML = `
    <div class="overflow-hidden text-ellipsis">
      ${actor.id}<br>
      <small>
        ${actor.name}<br>
        ${actor.role}
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

  dataSyncItem.classList.remove('hidden');
  emptyText.classList.add('hidden');
  emptyText.nextElementSibling.insertAdjacentElement('afterend', dataSyncItem);
}

export default { enqueue };
