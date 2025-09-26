loadDynamicSidebar();
loadDynamicModal();

async function loadDynamicSidebar() {
  const sections = document.querySelectorAll('.section');
  const ul = document.createElement('ul');
  ul.className = 'space-y-2 px-4';

  const mainButtonsMap = new Map();
  const mainUlContainer = new Map();

  sections.forEach((section) => {
    const sectionId = section.id;
    const sectionName = sectionId.split('-section')[0];
    const sectionIcons = (section.dataset.icons += '::').split('::');
    const nestedSections = sectionName.split('-');
    const nestedSectionTexts = section.dataset.sectiontexts ? (section.dataset.sectiontexts += '::').split('::') : '';

    const mainSectionName = nestedSections[0];
    let currentLi;
    let mainBtn = mainButtonsMap.get(mainSectionName);
    let hasParent = false;

    if (mainBtn) {
      currentLi = mainBtn.parentElement;
      hasParent = true;
    } else {
      currentLi = document.createElement('li');
      mainBtn = document.createElement('button');
      mainBtn.className = 'sidebar-main-btn relative';
      mainBtn.dataset.section = mainSectionName;
      if (nestedSections.length > 1) mainBtn.dataset.type = 'dropdown';
      mainBtn.innerHTML = `
        ${nestedSections.length > 1 ? `<div class="flex items-center">` : ``}
        <i class="fas ${sectionIcons[0]}"></i>
        <p class="absolute ml-7">${nestedSectionTexts != '' ? nestedSectionTexts[0] : mainSectionName.charAt(0).toUpperCase() + mainSectionName.slice(1)}</p>
        ${nestedSections.length > 1 ? `</div><i class="fas fa-chevron-down duration-300 text-xs" id="${mainSectionName}-arrow"></i>` : ``}
        <div class="absolute right-2 top-2 hidden">
            <div class="relative h-2 w-2">
                <div class="full absolute scale-105 animate-ping rounded-full bg-green-500 opacity-75"></div>
                <div class="absolute h-2 w-2 rounded-full bg-green-500"></div>
            </div>
        </div>
      `;
      currentLi.appendChild(mainBtn);
      ul.appendChild(currentLi);
      mainButtonsMap.set(mainSectionName, mainBtn);
    }

    if (nestedSections.length > 1) {
      const currentParentBtn = currentLi.querySelector('.sidebar-main-btn');
      currentParentBtn.classList.add('justify-between');

      let currentContainer = mainUlContainer.get(mainSectionName);

      if (!currentContainer) {
        currentContainer = document.createElement('ul');
        currentContainer.className = 'ml-4 mt-2 hidden space-y-1';
        currentContainer.id = `${mainSectionName}-dropdown`;
        currentLi.appendChild(currentContainer);
        mainUlContainer.set(mainSectionName, currentContainer);
      }

      for (let i = 1; i < nestedSections.length; i++) {
        const currentPath = nestedSections.slice(0, i + 1).join('-');
        let subLi = currentContainer.querySelector(`.sidebar-sub-btn[data-section="${currentPath}"]`)?.closest('li');

        if (!subLi) {
          subLi = document.createElement('li');
          const subBtn = document.createElement('button');
          subBtn.className = 'sidebar-sub-btn relative';
          subBtn.dataset.section = currentPath;
          subBtn.innerHTML = `
            <i class="fas ${sectionIcons[i]}"></i>
            <p class="absolute ml-6">${nestedSectionTexts != '' ? nestedSectionTexts[i] : nestedSections[i].charAt(0).toUpperCase() + nestedSections[i].slice(1)}</p>
            <div class="absolute right-2 top-2 hidden">
                <div class="relative h-2 w-2">
                    <div class="full absolute scale-105 animate-ping rounded-full bg-green-500 opacity-75"></div>
                    <div class="absolute h-2 w-2 rounded-full bg-green-500"></div>
                </div>
            </div>
            `;
          subLi.appendChild(subBtn);

          if (i < nestedSections.length - 1) {
            const newContainer = document.createElement('ul');
            newContainer.className = 'ml-4 mt-2 hidden space-y-1';
            newContainer.id = `${currentPath}-dropdown`;
            subLi.appendChild(newContainer);
            currentContainer = newContainer;
          }

          currentContainer.appendChild(subLi);
        } else if (i < nestedSections.length - 1) {
          currentContainer = subLi.querySelector('ul');
          if (!currentContainer) {
            currentContainer = document.createElement('ul');
            currentContainer.className = 'ml-4 mt-2 hidden space-y-1';
            currentContainer.id = `${currentPath}-dropdown`;
            subLi.appendChild(currentContainer);
          }
        }
      }
    }
  });

  document.getElementById('sidebar-body').appendChild(ul);

  applyUserSidebarPreferences(ul);
  // Re-apply on preferences change
  document.addEventListener('ogfmsiPreferencesUpdated', () => applyUserSidebarPreferences(ul));
}

async function loadDynamicModal() {
  const response = await fetch('admin_modal.html');
  const html = await response.text();
  document.getElementById('admin_modal').innerHTML = html;
}

function getUserPrefs() {
  try {
    return (
      JSON.parse(localStorage.getItem('ogfmsi_user_prefs')) || {
        hiddenSections: [],
        compactSidebar: false,
        timeFormat: '12h',
        dateFormat: 'MM-DD-YYYY',
        baseFontSize: 'normal',
        rememberLast: true,
      }
    );
  } catch (_e) {
    return { hiddenSections: [], compactSidebar: false, timeFormat: '12h', dateFormat: 'MM-DD-YYYY', baseFontSize: 'normal', rememberLast: true };
  }
}

function applyUserSidebarPreferences(ulEl) {
  const prefs = getUserPrefs();
  const hidden = new Set(prefs.hiddenSections || []);

  // Toggle visibility of main and sub buttons
  const allButtons = document.querySelectorAll('.sidebar-main-btn, .sidebar-sub-btn');
  allButtons.forEach((btn) => {
    const key = btn.dataset.section;
    if (!key) return;
    if (key === 'settings' || key === 'dashboard') {
      btn.classList.remove('hidden');
      return;
    }
    if (hidden.has(key.split('-')[0]) || hidden.has(key)) {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  });

  // Compact sidebar styling 
  try {
    if (prefs.compactSidebar) {
      ulEl.classList.replace('space-y-2', 'space-y-1');
      ulEl.classList.replace('px-4', 'px-2');
      document.getElementById('sidebar-body')?.classList.add('text-sm');
    } else {
      ulEl.classList.replace('space-y-1', 'space-y-2');
      ulEl.classList.replace('px-2', 'px-4');
      document.getElementById('sidebar-body')?.classList.remove('text-sm');
    }
  } catch (_e) {}

  // Base font size application
  try {
    const body = document.body;
    body.classList.remove('text-base');
    body.classList.remove('text-[17px]');
    if (prefs.baseFontSize === 'large') {
      body.classList.add('text-[17px]');
    } else {
      body.classList.add('text-base');
    }
  } catch (_e) {}
}
