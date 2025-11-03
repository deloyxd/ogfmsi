import main from './admin_main.js';
import * as pagination from './admin_pagination.js';

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  const tabCount = document.getElementById(`${main.sharedState.sectionName}_tab`).parentElement.children.length - 1;

  let lastTabSwitchTime = 0;
  const TAB_SWITCH_DELAY = 1000;
  let activeTimeout = null;

  showTab(main.sharedState.activeTab);

  function showTab(tabIndex) {
    const now = Date.now();
    if (now - lastTabSwitchTime < TAB_SWITCH_DELAY) {
      return;
    }
    lastTabSwitchTime = now;

    if (activeTimeout) {
      clearTimeout(activeTimeout);
      activeTimeout = null;
    }

    main.sharedState.activeTab = tabIndex;
    document.dispatchEvent(new Event('newTab'));

    const searchInput = document.getElementById(`${main.sharedState.sectionName}SectionOneSearch`);
    searchInput.value = '';
    searchInput.dataset.tabindex = tabIndex;
    searchInput.dispatchEvent(new Event('input'));
    
    // Reset pagination when switching tabs
    pagination.resetPagination(main.sharedState.sectionName, tabIndex);

    const inactiveTabs = [];
    for (let i = 1; i <= tabCount; i++) {
      const tabParent = document.getElementById(`${main.sharedState.sectionName}_tab${i}`);

      const newTab = tabParent.cloneNode(true);
      tabParent.replaceWith(newTab);

      newTab.addEventListener('click', () => {
        showTab(i);
      });

      if (tabIndex == i) {
        makeActive(newTab);
      } else {
        makeInactive(newTab);
        inactiveTabs.push(newTab);
      }
    }

    const contentParent = document.querySelectorAll(`[data-sectionindex="1"]`);
    contentParent.forEach((tab) => {
      if (tabIndex == tab.dataset.tabindex) {
        tab.classList.remove('hidden');
      } else {
        tab.classList.add('hidden');
      }
    });

    activeTimeout = setTimeout(() => {
      inactiveTabs.forEach((inactiveTab) => {
        inactiveTab.children[0].classList.remove('text-gray-300');
        inactiveTab.children[1].children[0].classList.remove('hidden');
        inactiveTab.children[1].children[1].classList.add('hidden');
      });
      activeTimeout = null;
    }, TAB_SWITCH_DELAY);
  }

  function makeActive(tab) {
    tab.classList.remove('bg-transparent');
    tab.classList.remove('hover:bg-gray-200');
    tab.children[0].classList.remove('text-gray-300');
    tab.children[1].children[0].classList.remove('hidden');
    tab.children[1].children[1].classList.add('hidden');
    tab.lastElementChild.classList.add('hidden');
  }

  function makeInactive(tab) {
    tab.classList.add('bg-transparent');
    tab.classList.add('hover:bg-gray-200');
    tab.children[0].classList.add('text-gray-300');
    tab.children[1].children[0].classList.add('hidden');
    tab.children[1].children[1].classList.remove('hidden');
  }
});
