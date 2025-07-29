const active = data_sync_tab1.className;
const inactive = data_sync_tab2.className;
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
    data_sync_tab1.lastElementChild.classList.add('hidden');
  } else {
    data_sync_tab2.lastElementChild.classList.add('hidden');
  }

  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }

  const tab1Clone = data_sync_tab1.cloneNode(true);
  const tab2Clone = data_sync_tab2.cloneNode(true);
  data_sync_tab1.replaceWith(tab1Clone);
  data_sync_tab2.replaceWith(tab2Clone);

  const newTab1 = document.getElementById('data_sync_tab1');
  const newTab2 = document.getElementById('data_sync_tab2');

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

  dataSyncSection1Search.value = '';
  dataSyncSection1Search.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    let children;
    if (tabIndex == 1) {
      children = data_sync_recent.children;
    } else {
      children = data_sync_all.children;
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
  dataSyncSection1Search.dispatchEvent(new Event('input'));

  dataSyncSection2Input.value = '';
  dataSyncSection2Input.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    for (let i = 2; i < dataSyncSection2Empty.parentElement.children.length; i++) {
      const child = dataSyncSection2Empty.parentElement.children[i];
      const textContent = child.textContent.toLowerCase();

      if (textContent.includes(searchTerm)) {
        child.classList.remove('hidden');
      } else {
        child.classList.add('hidden');
      }
    }
  });
  dataSyncSection2Input.dispatchEvent(new Event('input'));

  if (tabIndex == 1) {
    data_sync_recent.classList.remove('hidden');
    data_sync_all.classList.add('hidden');
  } else {
    data_sync_recent.classList.add('hidden');
    data_sync_all.classList.remove('hidden');
  }
}

export function enqueue(action, data) {
  const dataSyncItem = dataSyncSection2Empty.nextElementSibling.cloneNode(true);

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
  dataSyncSection2Empty.classList.add('hidden');
  dataSyncSection2Empty.nextElementSibling.insertAdjacentElement('afterend', dataSyncItem);
}

export default { enqueue };

document.addEventListener('DOMContentLoaded', function () {
  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.attributeName === 'data-status') {
        dataSyncHeaderContent.innerHTML = dataSyncHeaderContent.getAttribute(
          dataSyncHeaderContent.getAttribute(mutation.attributeName)
        );
      }
    });
  }).observe(dataSyncHeaderContent, { attributes: true });
  dataSyncHeaderContent.setAttribute('data-status', 'data-auto-awake');

  showTab(1);
});
