import * as pagination from './admin_pagination.js';

const sharedState = {
  sectionName: '',
  activeTab: 1,
  moduleLoad: '',
  intervalId: null,
  reserveCustomerId: '',
};

export let { sectionName, activeTab, moduleLoad } = sharedState;

// Global loading overlay (admin modules use window.showGlobalLoading/window.hideGlobalLoading)
let __globalLoadingCount = 0;

function ensureGlobalLoadingOverlay() {
  let overlay = document.getElementById('global-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'global-loading-overlay';
    overlay.setAttribute('aria-busy', 'true');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.display = 'none'; // hidden by default
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(0,0,0,0.35)'; // keep original
    overlay.style.backdropFilter = 'blur(2px)'; // keep original blur
    overlay.style.zIndex = '99999';
    overlay.style.pointerEvents = 'all';

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '14px';
    wrapper.style.color = '#fff';
    wrapper.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    wrapper.style.fontWeight = '700';
    wrapper.style.fontSize = '16px';
    wrapper.style.letterSpacing = '0.5px';
    wrapper.style.textTransform = 'uppercase';
    wrapper.style.animation = 'gl-fade-in 0.5s ease-out';

    // Dumbbell-inspired spinner
    const spinner = document.createElement('div');
    spinner.style.width = '50px';
    spinner.style.height = '50px';
    spinner.style.position = 'relative';
    spinner.style.display = 'flex';
    spinner.style.alignItems = 'center';
    spinner.style.justifyContent = 'center';
    spinner.style.animation = 'gl-rotate 1s linear infinite';

    const bar = document.createElement('div');
    bar.style.width = '40px';
    bar.style.height = '6px';
    bar.style.background = '#fff';
    bar.style.borderRadius = '3px';

    const plateLeft = document.createElement('div');
    plateLeft.style.width = '10px';
    plateLeft.style.height = '20px';
    plateLeft.style.background = '#fff';
    plateLeft.style.borderRadius = '2px';
    plateLeft.style.position = 'absolute';
    plateLeft.style.left = '0';

    const plateRight = document.createElement('div');
    plateRight.style.width = '10px';
    plateRight.style.height = '20px';
    plateRight.style.background = '#fff';
    plateRight.style.borderRadius = '2px';
    plateRight.style.position = 'absolute';
    plateRight.style.right = '0';

    spinner.appendChild(bar);
    spinner.appendChild(plateLeft);
    spinner.appendChild(plateRight);

    const text = document.createElement('div');
    text.textContent = 'Loading...';
    text.style.fontSize = '15px';
    text.style.opacity = '0.9';
    text.style.animation = 'gl-text-pulse 1.5s ease-in-out infinite';

    wrapper.appendChild(spinner);
    wrapper.appendChild(text);
    overlay.appendChild(wrapper);

    // Keyframes
    if (!document.getElementById('ogfmsi-global-loading-style')) {
      const style = document.createElement('style');
      style.id = 'ogfmsi-global-loading-style';
      style.textContent = `
        @keyframes gl-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes gl-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes gl-text-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
  }
  return overlay;
}

export function showGlobalLoading() {
  if (sharedState.moduleLoad == 0) return;
  try {
    const overlay = ensureGlobalLoadingOverlay();
    __globalLoadingCount = Math.max(0, __globalLoadingCount) + 1;
    if (__globalLoadingCount === 1) {
      overlay.style.display = 'flex';
    }
  } catch (_e) {}
}

export function hideGlobalLoading() {
  try {
    const overlay = ensureGlobalLoadingOverlay();
    __globalLoadingCount = Math.max(0, __globalLoadingCount - 1);
    if (__globalLoadingCount === 0) {
      overlay.style.display = 'none';
    }
  } catch (_e) {}
}

// attach to window for global fallback to avoid circular imports
if (typeof window !== 'undefined') {
  // Preserve existing if already defined
  window.showGlobalLoading = window.showGlobalLoading || showGlobalLoading;
  window.hideGlobalLoading = window.hideGlobalLoading || hideGlobalLoading;

  // Patch fetch globally on admin pages to ensure every request bumps the counter
  if (!window.__ogfmsiFetchPatched) {
    const originalFetch = window.fetch?.bind(window);
    if (originalFetch) {
      window.fetch = (...args) => {
        try {
          if (sharedState.moduleLoad != 0) {
            console.log('loading:', sharedState.moduleLoad);
            sharedState.moduleLoad = '';
            window.showGlobalLoading?.();
          }
        } catch (_e) {}
        return originalFetch(...args).finally(() => {
          try {
            window.hideGlobalLoading?.();
          } catch (_e) {}
        });
      };
      window.__ogfmsiFetchPatched = true;
    }
  }
}

function checkIfJsShouldNotRun(id) {
  let result = false;
  result = document.getElementById(id) == null;
  return result;
}

function setupSidebar() {
  const sidebarButtons = document.querySelectorAll('.sidebar-main-btn, .sidebar-sub-btn');
  sidebarButtons;
  sidebarButtons.forEach((button) => {
    const type = button.getAttribute('data-type');
    const section = button.getAttribute('data-section');
    if (type) {
      button.onclick = () => toggleDropDown(section);
      return;
    }
    if (section) {
      button.onclick = () => {
        // closeAllDropDownsExcept(section);

        showSection(section);
      };
    }
  });

  function closeAllDropDownsExcept(sectionName) {
    sidebarButtons.forEach((button) => {
      const type = button.getAttribute('data-type');
      const section = button.getAttribute('data-section');
      if (type && !sectionName.includes(section)) {
        const dropdown = document.getElementById(section + '-dropdown');
        const arrow = document.getElementById(section + '-arrow');
        dropdown.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
      }
    });
  }

  function toggleDropDown(sectionName) {
    const dropdown = document.getElementById(sectionName + '-dropdown');
    const arrow = document.getElementById(sectionName + '-arrow');

    if (dropdown.classList.contains('hidden')) {
      dropdown.classList.remove('hidden');
      arrow.style.transform = 'rotate(180deg)';
    } else {
      dropdown.classList.add('hidden');
      arrow.style.transform = 'rotate(0deg)';
    }

    updateActiveSidebar(sectionName);
  }
}

async function loadSectionSilently(sectionName) {
  const targetSection = document.getElementById(sectionName + '-section');
  if (!targetSection) {
    return;
  }

  const [mainColor, subColor, btnColor] = targetSection.dataset.color.split('-');
  const baseDataset = { sectionName, mainColor, subColor, btnColor };

  const components = [
    {
      name: 'header',
      fields: ['title', 'subtitle', 'middletext', 'mainbtntext', 'subbtntext', 'customcontent'],
    },
    {
      name: 'stats',
      fields: ['toggles', 'startingtexts', 'highlighttexts', 'endingtexts', 'types'],
    },
    {
      name: 'content',
      fields: [
        'sectioncount',
        'tabtitles',
        'subtitles',
        'sectiononesettings',
        'sectiononesearchtext',
        'listemptytexts',
        'listtitletexts',
        'listdatasortby',
        'listitembtnids',
        'listitembtntexts',
        'listitembtncolors',
        'sectiontwotitletexts',
        'sectiontwosettings',
        'sectiontwosearchtext',
        'sectiontwoemptylist',
        'sectiontwobtntext',
      ],
    },
  ];

  let containsCustomHeaderContent = false;
  let containsCustomContents = false;
  let statsDisabled = false;

  for (const { name, fields } of components) {
    const mainParent = document.getElementById(`${sectionName}-section`);
    const element = mainParent.querySelector(`#section-${name}`);
    element.id = `${sectionName}-section-${name}`;
    if (element) {
      const dataset = { ...baseDataset };
      let cloneCount = 0;

      fields.forEach((field) => {
        if (name.includes('content') && field.includes('sectioncount')) cloneCount = element.dataset[field];
        const fieldValues = element.dataset[field];
        if (fieldValues) {
          dataset[field] = [];

          if (name == 'content' && /(?<!:):(?!:)/.test(fieldValues)) {
            const colonPos = fieldValues.match(/(?<!:):(?!:)/).index;
            console.warn(
              `Potential incorrect syntax in dataset "data-${field}" of "${sectionName}-section-content" at "/src/html/_admin_main.html".\n\n"${fieldValues}"\n${' '.repeat(colonPos + 1)}^\nUse "::" as separator instead of ":". If this is intentional, you can ignore this warning.`
            );
          }

          if (name != 'header' && fieldValues.includes('::')) {
            if (name == 'stats') cloneCount = fieldValues.split('::').length;
            fieldValues.split('::').forEach((datasetField) => {
              dataset[field].push(datasetField);
            });
          } else {
            if (name == 'header' && dataset[field] && field.includes('customcontent')) {
              containsCustomHeaderContent = fieldValues == 1;
            }
            dataset[field].push(fieldValues);
          }
          return;
        }
        dataset[field] = fieldValues?.trim() || '';
      });

      await loadComponent(name, element, dataset);

      async function loadComponent(componentName, element, dataset) {
        const response = await fetch(`/src/html/admin_${componentName}.html`);
        let html = await response.text();

        html = html.replace(/\$\{(\w+)\}/g, (match, varName) =>
          dataset[varName] !== undefined ? dataset[varName] : match
        );

        element.innerHTML = html;

        decodeEmojis(element);
      }

      if (name.includes('header')) {
        fields.forEach((field) => {
          if (field == 'mainbtntext' && !dataset[field]) {
            document.querySelector(`.section-main-btn[data-section="${sectionName}"]`).classList.add('hidden');
          }
        });
        if (containsCustomHeaderContent) {
          try {
            const response = await fetch(`/src/html/custom/${sectionName}_header.html`);
            if (response.ok) {
              const html = await response.text();
              element.children[0].children[1].innerHTML += html;
            }
          } catch (error) {
            console.warn(`Could not load custom header for ${sectionName}:`, error);
          }
        }
      }

      if (name.includes('stats')) {
        loadStats();
      }

      if (name.includes('content')) {
        await loadContent();
      }

      function loadStats() {
        if (cloneCount == 0) {
          document.getElementById(`${sectionName}-section-stats`).classList.add('hidden');
          statsDisabled = true;
          return;
        }
        const original = document.getElementById(`${sectionName}SectionStats`);
        Array.from(original.parentElement.children).forEach((el, i) => {
          if (i > 0) el.remove();
        });
        original.parentElement.classList.add(`lg:grid-cols-${cloneCount}`);
        for (let i = 0; i < cloneCount; i++) {
          const clone = original.cloneNode(true);

          const statsTexts = clone.children[1];
          fields.forEach((field) => {
            switch (field) {
              case 'toggles':
                const statsBtn = clone.children[0];
                statsBtn.title = 'See ' + (dataset[field][i] == 1 ? 'breakdown' : 'list');
                if (dataset[field][i] == 1) {
                  clone.classList.remove('section-stats-base');
                  clone.classList.add('section-stats');
                  const statsToggle = clone.children[2];
                  const statsValue = clone.children[3];
                  statsToggle.classList.remove('hidden');
                  statsValue.classList.add('hidden');
                }
                break;
              case 'startingtexts':
                statsTexts.innerHTML = dataset[field][i];
                break;
              case 'highlighttexts':
                statsTexts.innerHTML =
                  statsTexts.innerHTML +
                  ` <b class="px-[1px] text-${dataset.mainColor}-300 [text-shadow:-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black,1px_1px_0_black]">${dataset[field][i]}</b>`;
                break;
              case 'endingtexts':
                statsTexts.innerHTML = statsTexts.innerHTML + ' ' + dataset[field][i];
                break;
              case 'types':
                const statsType = clone.children[0];
                statsType.dataset.type = dataset[field][i];
                break;
            }
          });

          clone.classList.remove('hidden');
          original.parentElement.appendChild(clone);
        }
      }

      async function loadContent() {
        const screenHeight = window.innerHeight;
        const sectionOne = document.getElementById(`${sectionName}_tab`).parentElement;
        const sectionTwo = document.getElementById(`${sectionName}SectionContent`).children[1];
        setupSectionOne();
        setupSectionTwo();
        if (containsCustomContents)
          await loadCustomContents(`/src/html/custom/${sectionName.replace(/-/g, '_')}_content.html`);

        function setupSectionOne() {
          Array.from(sectionOne.children).forEach((el, i) => {
            if (i > 0) el.remove();
          });

          for (let i = 0; i < dataset['tabtitles'].length; i++) {
            const clone = sectionOne.children[0].cloneNode(true);
            clone.id = `${sectionName}_tab${i + 1}`;

            clone.children[0].innerHTML = dataset['tabtitles'][i];
            clone.children[1].children[0].innerHTML = dataset['subtitles'][i];
            if (dataset['sectiononesearchtext'] && i == 0) {
              sectionOne.parentElement.children[1].children[0].classList.remove('hidden');
              sectionOne.parentElement.children[1].children[0].children[0].placeholder =
                dataset['sectiononesearchtext'];
              sectionOne.parentElement.children[1].children[0].children[0].addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                const tabIndex = e.target.dataset.tabindex;
                const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
                if (emptyText) {
                  const items = Array.from(emptyText.parentElement.parentElement.children);
                  if (searchTerm === '') {
                    // Clear search - restore pagination
                    items.forEach((item, i) => {
                      if (i > 0) {
                        item.classList.remove('hidden');
                      }
                    });
                    pagination.resetPagination(sectionName, tabIndex);
                    return;
                  }
                  // Search mode - show all matching results, hide non-matching
                  // During search, we show all matching rows and hide pagination
                  items.forEach((item, i) => {
                    if (i > 0) {
                      if (item.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                        item.classList.remove('hidden');
                      } else {
                        item.classList.add('hidden');
                      }
                    }
                  });
                  // Hide pagination during search (show all matches)
                  const paginationContainer = document.getElementById(`${sectionName}PaginationContainer${tabIndex}`);
                  if (paginationContainer) {
                    paginationContainer.classList.add('hidden');
                  }
                }
              });
            }
            if (dataset['sectiononesettings'] == 1)
              sectionOne.parentElement.children[1].children[1].classList.remove('hidden');
            if (dataset['listtitletexts'] && dataset['listtitletexts'][i] != '[]') {
              const tableParent = document.createElement('div');
              tableParent.dataset.sectionindex = 1;
              tableParent.dataset.tabindex = i + 1;
              const table = document.createElement('table');
              table.className = 'w-full border-collapse cursor-default text-sm';
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');
              const titleTexts = dataset['listtitletexts'][i].slice(1, -1).split('//');
              const sortBys = dataset['listdatasortby'][i]?.slice(1, -1).split('//');
              clone.dataset.columncount = titleTexts.length;
              titleTexts.forEach((titleText, index) => {
                const th = document.createElement('th');
                th.className = 'group relative border border-gray-300 bg-gray-200 p-2 text-center';
                th.innerHTML = titleText;
                const sorter = document.createElement('div');
                sorter.dataset.sortby = sortBys ? sortBys[index] : '';
                sorter.className =
                  'sorter absolute right-2 top-0 h-full flex flex-col cursor-pointer justify-center -space-y-1 hidden group-hover:flex';
                sorter.innerHTML =
                  '<i class="sorter-asc fas fa-caret-up"></i><i class="sorter-des fas fa-caret-down"></i>';
                th.appendChild(sorter);
                if (index < titleTexts.length - 1) {
                  const resizer = document.createElement('div');
                  resizer.className =
                    'resizer absolute right-0 top-0 h-full cursor-col-resize bg-black/10 hover:bg-black/30 active:w-1.5 active:bg-black/30 group-hover:w-1.5';
                  th.appendChild(resizer);
                }
                headerRow.appendChild(th);
              });

              const th = document.createElement('th');
              th.className = 'group relative border border-gray-300 bg-gray-200 p-2 text-center';
              th.innerHTML = 'Actions';
              headerRow.appendChild(th);

              thead.appendChild(headerRow);
              table.appendChild(thead);
              const tbody = document.createElement('tbody');
              const dataRow = document.createElement('tr');
              const empty = document.createElement('td');
              dataRow.className = 'relative';
              empty.id = `${sectionName}SectionOneListEmpty${i + 1}`;
              empty.className = 'absolute left-0 right-0';
              empty.innerHTML = `<div class="content-center text-center h-[${statsDisabled ? screenHeight - 408 + 106 : screenHeight - 408}px] font-bold text-xs text-gray-400">${dataset['listemptytexts'][i]}</div>`;
              dataRow.appendChild(empty);

              for (let j = 0; j < titleTexts.length + 1; j++) {
                const td = document.createElement('td');
                td.className = 'relative hidden border border-gray-300 p-2 h-[49px]';
                if (dataset['listitembtnids'] && j == titleTexts.length) {
                  const itemBtns = document.createElement('div');
                  itemBtns.className = 'absolute inset-0 justify-center m-2 flex gap-2';
                  const itemBtnIds = dataset['listitembtnids'][i].slice(1, -1).split('//');
                  const itemBtnTexts = dataset['listitembtntexts'][i].slice(1, -1).split('//');
                  const itemBtnColors = dataset['listitembtncolors'][i].slice(1, -1).split('//');
                  for (let k = 0; k < itemBtnIds.length; k++) {
                    const btn = document.createElement('button');
                    btn.id = itemBtnIds[k];
                    btn.innerHTML = itemBtnTexts[k];
                    btn.className = `rounded-lg bg-${itemBtnColors[k]}-500 px-4 py-2 text-white duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-${itemBtnColors[k]}-600 hover:shadow-lg hover:shadow-${itemBtnColors[k]}-400 active:scale-95 active:shadow-none active:translate-y-0`;
                    itemBtns.appendChild(btn);

                    decodeEmojis(btn);
                  }
                  td.appendChild(itemBtns);
                }
                dataRow.appendChild(td);
              }

              tbody.appendChild(dataRow);
              table.appendChild(tbody);
              tableParent.appendChild(table);

              sectionOne.parentElement.parentElement.lastElementChild.appendChild(tableParent);

              // Initialize pagination for this table
              setTimeout(() => {
                // Only create if it doesn't exist
                const existing = document.getElementById(`${sectionName}PaginationContainer${i + 1}`);
                if (!existing) {
                  pagination.createPaginationControls(sectionName, i + 1, mainColor);
                  // Initial render after controls are created
                  pagination.renderPage(sectionName, i + 1);
                } else {
                  // Just refresh if it already exists
                  pagination.refreshPagination(sectionName, i + 1);
                }
              }, 50);
            } else {
              containsCustomContents = true;
            }

            clone.classList.remove('hidden');
            sectionOne.appendChild(clone);

            if (statsDisabled) {
              sectionOne.parentElement.nextElementSibling.classList.add(`min-h-[${screenHeight - 378 + 132}px]`);
              sectionOne.parentElement.nextElementSibling.classList.add(`max-h-[${screenHeight - 378 + 132}px]`);
            } else {
              sectionOne.parentElement.nextElementSibling.classList.add(`min-h-[${screenHeight - 358}px]`);
              sectionOne.parentElement.nextElementSibling.classList.add(`max-h-[${screenHeight - 358}px]`);
            }
          }
        }

        function setupSectionTwo() {
          let totalSectionTwoListContainerHeight = screenHeight - 374;
          if (cloneCount == 2) {
            const sectionTwoTitles = sectionTwo.children[0].children[0].children[0];
            sectionTwoTitles.children[0].innerHTML = dataset['sectiontwotitletexts'][0];
            sectionTwoTitles.children[1].innerHTML = dataset['sectiontwotitletexts'][1];
            const sectionTwoSettings = sectionTwo.children[0].children[0].children[1];

            if (dataset['sectiontwosettings'] && dataset['sectiontwosettings'] == 1) {
              sectionTwoSettings.classList.remove('hidden');
            }

            const sectionTwoContent = sectionTwo.children[0].children[1];
            const sectionTwoListContainer = document.createElement('div');
            sectionTwoListContainer.className = 'section-content-list-empty w-full rounded-lg bg-gray-200';
            if (dataset['sectiontwoemptylist']) {
              const sectionTwoListEmpty = document.createElement('div');
              sectionTwoListEmpty.id = `${sectionName}SectionTwoListEmpty`;
              sectionTwoListEmpty.className = 'flex h-full justify-center';
              sectionTwoListEmpty.innerHTML = `<p class="self-center text-center font-bold text-xs text-gray-400"></p>`;
              sectionTwoListEmpty.children[0].innerHTML = dataset['sectiontwoemptylist'];
              sectionTwoListContainer.appendChild(sectionTwoListEmpty);

              const sectionTwoListItem = document.createElement('p');
              sectionTwoListItem.className = 'section-content-list-item hidden relative';
              sectionTwoListContainer.appendChild(sectionTwoListItem);
            } else {
              containsCustomContents = true;
            }
            sectionTwoContent.appendChild(sectionTwoListContainer);

            if (dataset['sectiontwosearchtext']) {
              totalSectionTwoListContainerHeight -= 68;
              const sectionTwoSearchParent = document.createElement('div');
              sectionTwoSearchParent.className = 'relative w-full';

              const searchInput = document.createElement('input');
              searchInput.autocomplete = 'off';
              searchInput.id = `${sectionName}SectionTwoSearch`;
              searchInput.placeholder = dataset['sectiontwosearchtext'];
              searchInput.className = `section-content-search-sub border-${mainColor}-500 focus:ring-${mainColor}-500`;
              searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
                if (emptyText) {
                  const items = Array.from(emptyText.parentElement.children);
                  if (searchTerm === '') {
                    items.forEach((item, i) => {
                      if (i > 1) {
                        item.classList.remove('hidden');
                      }
                    });
                    return;
                  }
                  items.forEach((item, i) => {
                    if (i > 1) {
                      if (item.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                        item.classList.remove('hidden');
                      } else {
                        item.classList.add('hidden');
                      }
                    }
                  });
                }
              });
              sectionTwoSearchParent.appendChild(searchInput);

              const searchIcon = document.createElement('div');
              searchIcon.className = 'section-content-searchicon';
              searchIcon.innerHTML = `
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-chevrons-left-right-ellipsis-icon lucide-chevrons-left-right-ellipsis"
                >
                  <path d="M12 12h.01" />
                  <path d="M16 12h.01" />
                  <path d="m17 7 5 5-5 5" />
                  <path d="m7 7-5 5 5 5" />
                  <path d="M8 12h.01" />
                </svg>
              `;
              sectionTwoSearchParent.appendChild(searchIcon);

              sectionTwoContent.appendChild(sectionTwoSearchParent);
            }

            if (dataset['sectiontwobtntext']) {
              totalSectionTwoListContainerHeight -= 64;
              const sectionTwoMainBtn = document.createElement('div');

              sectionTwoMainBtn.id = `${sectionName}SectionTwoMainBtn`;
              sectionTwoMainBtn.className = `section-content-submit bg-${mainColor}-500 hover:bg-${mainColor}-600 hover:shadow-${mainColor}-400 active:scale-95 active:bg-${mainColor}-700`;
              sectionTwoMainBtn.innerHTML = dataset['sectiontwobtntext'];

              sectionTwoContent.appendChild(sectionTwoMainBtn);
            }

            sectionTwoListContainer.classList.add(`h-[${totalSectionTwoListContainerHeight}px]`);
            sectionTwo.classList.remove('hidden');
          } else {
            document.getElementById(`${sectionName}SectionContent`).children[0].classList.remove('2xl:col-span-8');
            document.getElementById(`${sectionName}SectionContent`).children[0].classList.add('2xl:col-span-12');
          }

          if (statsDisabled && sectionTwo.children[0].children[1].children[0]) {
            sectionTwo.children[0].children[1].children[0].classList.add(
              `h-[${totalSectionTwoListContainerHeight + 112}px]`
            );
          }
        }

        async function loadCustomContents(fetchCustomHtmlFile) {
          try {
            const response = await fetch(fetchCustomHtmlFile);
            if (response.ok) {
              const html = await response.text();
              const tempCustomContent = document.createElement('div');
              tempCustomContent.innerHTML = html;
              const customContentSectionTwo = tempCustomContent.querySelector('[data-sectionindex="2"]');
              if (customContentSectionTwo) {
                const sectionTwoContent = customContentSectionTwo.cloneNode(true);
                customContentSectionTwo.remove();
                sectionTwo.children[0].children[1].children[0].appendChild(sectionTwoContent);
                if (statsDisabled) {
                  sectionTwoContent.classList.add(`h-[${screenHeight - 328 + 132}px]`);
                }
              }
              const customContentSectionOne = tempCustomContent.querySelector('[data-sectionindex="1"]');
              if (customContentSectionOne) {
                const customTabs = tempCustomContent.querySelectorAll('[data-sectionindex="1"]');
                const sectionOneContent = sectionOne.parentElement.parentElement.children[1];
                for (let i = 1; i <= customTabs.length; i++) {
                  const customContent = tempCustomContent.querySelector(`[data-tabindex="${i}"]`).cloneNode(true);
                  sectionOneContent.appendChild(customContent);
                  if (statsDisabled) {
                    customContent.className = `h-[${screenHeight - 314 + 132}px]`;
                  } else {
                    customContent.className = `h-[${screenHeight - 510 + 132}px]`;
                  }
                }
                const removeSectionTwo = sectionOneContent.querySelector('[data-sectionindex="2"]');
                if (removeSectionTwo) {
                  removeSectionTwo.remove();
                }
              }
            }
          } catch (error) {
            console.warn(`Could not load custom content for ${sectionName}:`, error);
          }
        }

        const sorters = document.querySelectorAll('.sorter');
        sorters.forEach((sorter) => {
          sorter.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            sorters.forEach((resetSorter) => {
              if (resetSorter !== sorter) {
                const resetAscending = resetSorter.querySelector('.sorter-asc');
                const resetDescending = resetSorter.querySelector('.sorter-des');
                resetAscending.classList.remove('opacity-0');
                resetDescending.classList.remove('opacity-0');
              }
            });
            const ascending = sorter.querySelector('.sorter-asc');
            const descending = sorter.querySelector('.sorter-des');
            const isAscending = !ascending.classList.contains('opacity-0');
            const isDescending = !descending.classList.contains('opacity-0');
            const isBoth = isAscending && isDescending;
            if (isBoth) {
              descending.classList.add('opacity-0');
              sortBy('ascending', sorter.dataset.sortby);
            } else if (isAscending) {
              ascending.classList.add('opacity-0');
              descending.classList.remove('opacity-0');
              sortBy('descending', sorter.dataset.sortby);
            } else if (isDescending) {
              ascending.classList.remove('opacity-0');
              descending.classList.add('opacity-0');
              sortBy('ascending', sorter.dataset.sortby);
            }
          });

          function sortBy(order, type) {
            const table = sorter.closest('table');
            const tbody = table.querySelector('tbody');
            const columnIndex = Array.from(sorter.closest('tr').children).indexOf(sorter.parentElement);
            const rows = Array.from(tbody.querySelectorAll('tr'));
            rows.shift();

            rows.sort((rowA, rowB) => {
              const cellA = rowA.children[columnIndex];
              const cellB = rowB.children[columnIndex];

              let valueA, valueB;

              if (type === 'name') {
                valueA = cellA.innerText.trim().toLowerCase();
                valueB = cellB.innerText.trim().toLowerCase();

                const comparison = valueA.localeCompare(valueB, undefined, {
                  numeric: true,
                  sensitivity: 'base',
                });

                return order === 'ascending' ? comparison : -comparison;
              } else if (type === 'date') {
                valueA = new Date(cellA.innerText.trim().replace(' - ', ' '));
                valueB = new Date(cellB.innerText.trim().replace(' - ', ' '));

                if (isNaN(valueA.getTime()) && isNaN(valueB.getTime())) return 0;
                if (isNaN(valueA.getTime())) return 1;
                if (isNaN(valueB.getTime())) return -1;

                const comparison = valueA.getTime() - valueB.getTime();
                return order === 'ascending' ? comparison : -comparison;
              } else if (type === 'number') {
                valueA = parseFloat(cellA.innerText.replace(/[^\d.-]/g, '')) || 0;
                valueB = parseFloat(cellB.innerText.replace(/[^\d.-]/g, '')) || 0;

                const comparison = valueA - valueB;
                return order === 'ascending' ? comparison : -comparison;
              } else {
                valueA = cellA.innerText.trim().toLowerCase();
                valueB = cellB.innerText.trim().toLowerCase();

                const comparison = valueA.localeCompare(valueB);
                return order === 'ascending' ? comparison : -comparison;
              }
            });

            rows.forEach((row) => row.remove());
            rows.forEach((row) => tbody.appendChild(row));
          }
        });

        const resizers = document.querySelectorAll('.resizer');
        let isResizing = false;
        let currentColumn;
        let nextColumn;
        let startX;
        let startWidth;
        let nextWidth;

        resizers.forEach((resizer) => {
          resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            currentColumn = resizer.parentElement;
            nextColumn = currentColumn.nextElementSibling;
            startX = e.clientX;
            startWidth = currentColumn.offsetWidth;
            nextWidth = nextColumn ? nextColumn.offsetWidth : 0;

            const allColumns = currentColumn.parentElement.children;
            Array.from(allColumns).forEach((col) => {
              if (col.classList.contains('resizer')) return;
              if (!col.style.width) {
                col.style.width = `${col.offsetWidth}px`;
              }
            });

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
          });
        });

        function handleMouseMove(e) {
          e.preventDefault();
          if (!isResizing) return;

          const deltaX = e.clientX - startX;
          const newWidth = Math.max(50, startWidth + deltaX);

          currentColumn.style.width = `${newWidth}px`;

          if (nextColumn) {
            const newNextWidth = Math.max(50, nextWidth - deltaX);
            nextColumn.style.width = `${newNextWidth}px`;
          }
        }

        function stopResize(e) {
          e.preventDefault();
          isResizing = false;
          document.body.style.cursor = '';

          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', stopResize);
        }
      }

      function decodeEmojis(element) {
        element.innerHTML = element.innerHTML.replace(/\[-(.*?)-\]/g, (match, emoji) => {
          const replacement = getEmoji(emoji);
          return replacement !== match ? `<span class="emoji-replaced">${replacement}</span>` : match;
        });

        const emojis = element.querySelectorAll('span.emoji-replaced');

        emojis.forEach((emoji) => {
          const parent = emoji.parentElement;
          parent.appendChild(emoji.children[0]);
          parent.classList.add('emoji');
          emoji.remove();
        });
      }
    }
  }

  targetSection.classList.add('hidden');
}

export async function showSection(sectionName, tabIndex = 1) {
  const targetSection = document.getElementById(sectionName + '-section');
  if (!targetSection) {
    return;
  }

  if (sharedState.sectionName != sectionName) {
    if (sharedState.intervalId) {
      clearInterval(sharedState.intervalId);
    }
    sharedState.sectionName = sectionName;
    updateDateAndTime();
    sharedState.intervalId = setInterval(updateDateAndTime, 1000);
  }

  sharedState.activeTab = tabIndex;

  // Remember last opened section/tab if enabled
  try {
    const prefs = getUserPrefs();
    if (prefs.rememberLast) {
      localStorage.setItem('ogfmsi_last_open', JSON.stringify({ sectionName, tabIndex }));
    }
  } catch (_e) {}

  const sections = document.querySelectorAll('.section');
  sections.forEach((section) => {
    section.classList.add('hidden');
  });

  targetSection.classList.remove('hidden');
  updateActiveSidebar(sectionName);
  closeConfirmationModal();
  closeModal();

  document.dispatchEvent(new CustomEvent('ogfmsiAdminMainLoaded'));
}

function updateActiveSidebar(sectionName) {
  const buttons = document.querySelectorAll('.sidebar-main-btn, .sidebar-sub-btn');
  buttons.forEach((btn) => {
    btn.classList.remove('active', 'bg-gray-700', 'text-white');
    btn.classList.add('text-gray-300');
  });

  const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-gray-700', 'text-white');
    activeBtn.classList.remove('text-gray-300');
    activeBtn.lastElementChild.classList.add('hidden');
  }
}

let tempModalContainer = null;
let tempModalConfirmationContainer = null;

export function openModal(btn, inputs, ...callback) {
  const originalModalContainer = document.querySelector('#modalContainer');
  tempModalContainer = originalModalContainer.cloneNode(true);
  originalModalContainer.insertAdjacentElement('afterend', tempModalContainer);
  tempModalContainer.classList.add('z-20');

  setupModalTheme(btn, tempModalContainer);
  setupModalBase(btn, inputs, callback);

  tempModalContainer.addEventListener('mousedown', (e) => {
    if (e.target === tempModalContainer) closeModal();
  });

  tempModalContainer.classList.remove('hidden');
  setTimeout(() => {
    tempModalContainer.classList.add('opacity-100');

    tempModalContainer.children[0].classList.remove('-translate-y-6');
    tempModalContainer.children[0].classList.add('scale-100');
  }, 0);
}

export function openConfirmationModal(action, callback) {
  const originalModalContainer = document.querySelector('#modalContainer');
  tempModalConfirmationContainer = originalModalContainer.cloneNode(true);
  originalModalContainer.insertAdjacentElement('afterend', tempModalConfirmationContainer);
  tempModalConfirmationContainer.classList.add('z-30');
  tempModalConfirmationContainer.children[0].classList.add('max-w-md');

  setupModalTheme('red', tempModalConfirmationContainer);

  const data = {
    title: `Are you sure? ${getEmoji('⚠️', 26)}`,
    subtitle:
      'Please double check or review any details you may have provided<br>before proceeding with the action stated below:<br><br><b>' +
      action.trim() +
      '</b>',
    button: {
      main: `Confirm ${getEmoji('⚠️')}`,
      sub: 'Cancel',
    },
  };

  const modalTitle = tempModalConfirmationContainer.querySelector('#modalTitle');
  const modalSubtitle = tempModalConfirmationContainer.querySelector('#modalSubtitle');
  const modalMainBtn = tempModalConfirmationContainer.querySelector('#modalMainBtn');
  const modalSubBtn = tempModalConfirmationContainer.querySelector('#modalSubBtn');

  modalTitle.innerHTML = data.title;
  modalSubtitle.innerHTML = data.subtitle;
  modalMainBtn.innerHTML = data.button.main;
  modalSubBtn.innerHTML = data.button.sub;

  modalMainBtn.onclick = () => {
    callback();
    modalMainBtn.classList.add('pointer-events-none');
    setTimeout(() => {
      modalMainBtn.classList.remove('pointer-events-none');
    }, 1000);
  };
  modalSubBtn.onclick = () => closeConfirmationModal();

  modalSubtitle.classList.remove('hidden');
  modalSubBtn.classList.remove('hidden');

  tempModalConfirmationContainer.addEventListener('mousedown', (e) => {
    if (e.target === tempModalConfirmationContainer) closeConfirmationModal();
  });

  tempModalConfirmationContainer.classList.remove('hidden');
  tempModalConfirmationContainer.classList.add('z-10');
  setTimeout(() => {
    tempModalConfirmationContainer.classList.add('opacity-100');

    tempModalConfirmationContainer.children[0].classList.add('translate-y-6');
    tempModalConfirmationContainer.children[0].classList.add('scale-100');
  }, 0);
}

export function closeModal(callback = () => {}) {
  if (!tempModalContainer) return;
  tempModalContainer.classList.remove('opacity-100');

  tempModalContainer.children[0].classList.add('-translate-y-6');
  tempModalContainer.children[0].classList.remove('scale-100');

  setTimeout(() => {
    if (!tempModalContainer) return;
    tempModalContainer.remove();
    tempModalContainer = null;
    callback();
  }, 300);
}

export function closeConfirmationModal(callback = () => {}) {
  if (!tempModalConfirmationContainer) return;
  tempModalConfirmationContainer.classList.remove('opacity-100');

  tempModalConfirmationContainer.children[0].classList.remove('translate-y-6');
  tempModalConfirmationContainer.children[0].classList.remove('scale-100');

  setTimeout(() => {
    if (!tempModalConfirmationContainer) return;
    tempModalConfirmationContainer.remove();
    tempModalConfirmationContainer = null;
    callback();
  }, 300);
}

function setupModalTheme(base, container) {
  let customColor;
  if (typeof base === 'string') {
    const splitData = base.split('//');
    customColor = splitData[0];
  } else {
    const textColorClass = Array.from(base.classList).find((className) => /^text-[a-z]+-\d+$/.test(className));
    const colorMatch = textColorClass.match(/text-([a-z]+)-(\d+)/);
    const [a, color, b] = colorMatch;
    customColor = color;
  }
  const states = ['', 'hover:', 'active:', 'focus:'];
  const types = ['from', 'to', 'bg', 'shadow', 'border', 'outline', 'ring'];
  const baseColorRegex = new RegExp(
    `(${states
      .map((s) => types.map((t) => `${s}${t}`))
      .flat()
      .join('|')})-${container.dataset.color}-(\\d+)`,
    'g'
  );

  container.dataset.color = customColor;

  container.querySelectorAll('*').forEach((element) => {
    Array.from(element.classList).forEach((className) => {
      const match = className.match(baseColorRegex);
      if (!match) return;

      const [fullMatch, c, d] = match;

      element.classList.replace(fullMatch, `${fullMatch.split('-')[0]}-${customColor}-${fullMatch.split('-')[2]}`);
    });
  });
}

function setupModalBase(defaultData, inputs, callback) {
  // CLIENT 🔑
  const data = {
    title: inputs.header ? inputs.header.title?.trim() || '' : 'Fitworx Gym Form',
    subtitle: inputs.header ? inputs.header.subtitle?.trim() || '' : 'Please fill up empty fields',
    button: {
      main: inputs.footer ? inputs.footer.main?.trim() || defaultData.innerHTML : defaultData.innerHTML,
      sub: inputs.footer ? inputs.footer.sub?.trim() || '' : '',
      third: inputs.footer ? inputs.footer.third?.trim() || '' : '',
    },
  };

  const modalTitle = tempModalContainer.querySelector('#modalTitle');
  const modalSubtitle = tempModalContainer.querySelector('#modalSubtitle');
  const modalMainBtn = tempModalContainer.querySelector('#modalMainBtn');
  const modalSubBtn = tempModalContainer.querySelector('#modalSubBtn');
  const modalThirdBtn = tempModalContainer.querySelector('#modalThirdBtn');

  modalTitle.innerHTML = data.title;
  modalSubtitle.innerHTML = data.subtitle;
  modalMainBtn.innerHTML = data.button.main;
  modalSubBtn.innerHTML = data.button.sub;
  modalThirdBtn.innerHTML = data.button.third;

  if (data.subtitle != '') modalSubtitle.classList.remove('hidden');
  modalMainBtn.onclick = () => {
    if (checkIfEmpty(inputs)) return;
    callback[0](inputs);
    modalMainBtn.classList.add('pointer-events-none');
    setTimeout(() => {
      modalMainBtn.classList.remove('pointer-events-none');
    }, 1000);
  };
  if (data.button.sub != '') {
    modalSubBtn.classList.remove('hidden');
    modalSubBtn.onclick = () => {
      callback[1]();
      modalSubBtn.classList.add('pointer-events-none');
      setTimeout(() => {
        modalSubBtn.classList.remove('pointer-events-none');
      }, 1000);
    };
  }
  if (data.button.third != '') {
    modalThirdBtn.classList.remove('hidden');
    modalThirdBtn.onclick = () => {
      callback[2]();
      modalThirdBtn.classList.add('pointer-events-none');
      setTimeout(() => {
        modalThirdBtn.classList.remove('pointer-events-none');
      }, 1000);
    };
  }

  if (inputs.image) {
    const originalContainer =
      tempModalContainer.querySelector('#input-image').parentElement.parentElement.parentElement;
    const imageContainerParent = originalContainer.cloneNode(true);
    const imageContainerTexts = imageContainerParent.children[0].children[1].lastElementChild.children;
    const imageContainer = imageContainerParent.children[0].children[1].children[0];
    imageContainer.src = inputs.image.src;

    const imageBlurContainer = imageContainerParent.children[0].children[1].children[1];
    if (inputs.image.type === 'normal') imageBlurContainer.classList.add('hidden');
    const imageUploadInput = imageContainerParent.children[0].children[2];
    const imageUploadBtn = imageContainerParent.children[0].children[3];
    if (!inputs.image.locked) {
      imageUploadBtn.onclick = () => imageUploadInput.click();
      imageContainer.parentElement.onclick = () => imageUploadInput.click();

      imageUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            imageContainer.src = event.target.result;
            inputs.image.src = imageContainer.src;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (inputs.image.short) {
      const imageContainerInputsContainer = imageContainerParent.children[1];
      inputs.image.short.forEach((input, index) => {
        const clone = imageContainerInputsContainer.children[0].cloneNode(true);

        clone.children[1].addEventListener('input', () => {
          if (inputs.image.type === 'live') imageContainerTexts[index].innerHTML = clone.children[1].value;
          input.value = clone.children[1].value;
        });

        renderInput(imageContainerInputsContainer.children[0], clone, 'short', input, index);
        imageContainerInputsContainer.appendChild(clone);
      });
    }

    if (inputs.image.spinner) {
      const imageContainerInputsContainer = imageContainerParent.children[1];
      inputs.image.spinner.forEach((input, index) => {
        const clone = imageContainerInputsContainer.children[1].cloneNode(true);

        renderInput(imageContainerInputsContainer.children[1], clone, 'spinner', input, index);
        imageContainerInputsContainer.appendChild(clone);
      });
    }

    if (!inputs.image.short && !inputs.image.spinner) {
      imageContainerParent.classList.remove('gap-3');
      imageContainerParent.classList.add('grid-cols-10');
      imageContainerParent.children[0].classList.add('col-span-4');
      imageContainerParent.children[0].classList.add('col-start-4');
    }

    imageContainerParent.classList.remove('hidden');
    originalContainer.insertAdjacentElement('afterend', imageContainerParent);
  }

  setupRenderInput('short', inputs.short, 4);
  setupRenderInput('spinner', inputs.spinner, 4);
  setupRenderInput('short', inputs.short2, 24);
  setupRenderInput('spinner', inputs.spinner2, 24);
  setupRenderInput('short', inputs.short3, 34);
  setupRenderInput('spinner', inputs.spinner3, 34);
  setupRenderInput('large', inputs.large, 1);

  if (inputs.radio) {
    const type = 'radio';
    const originalContainer = tempModalContainer.querySelector(`#input-${type}`).parentElement;
    const radioContainer = originalContainer.cloneNode(true);
    const label = radioContainer.children[0];
    const autoformatType = inputs.radio[0].autoformat?.type || '';
    const autoformatIndex = inputs.radio[0].autoformat?.index || 0;
    const autoformatText = inputs.radio[0].autoformat?.text || '';
    label.innerHTML = inputs.radio[0].label;

    const container = radioContainer.children[1];
    container.id = `input-${type}-1`;
    container.classList.add(`grid-cols-${inputs.radio.length - 1}`);

    const radioClones = [];
    inputs.radio.forEach((input, index) => {
      if (index == 0) {
        return;
      }
      const clone = container.children[0].cloneNode(true);

      const icon = clone.children[0];
      const title = clone.children[1];
      const subtitle = clone.children[2];

      icon.innerHTML = input.icon;
      title.innerHTML = input.title;
      subtitle.innerHTML = input.subtitle;

      clone.classList.remove('hidden');
      clone.dataset.color = clone.classList[clone.classList.length - 2].split(':')[1];
      radioClones.push(clone);
      container.appendChild(clone);
      if (index == inputs.radio[0].selected) {
        clone.classList.add(clone.dataset.color);
        clone.classList.add(clone.dataset.color.replace('border', 'bg') + '/50');
      }
      clone.classList.add(clone.dataset.color.replace('border', 'hover:bg') + '/50');
      if (!inputs.radio[0].locked) {
        clone.addEventListener('click', function () {
          radioClones.forEach((radioClone) => {
            if (radioClone == clone) {
              radioClone.classList.add(radioClone.dataset.color);
              radioClone.classList.add(radioClone.dataset.color.replace('border', 'bg') + '/50');
              radioClone.classList.add(radioClone.dataset.color.replace('border', 'hover:bg') + '/50');
            } else {
              radioClone.classList.remove(radioClone.dataset.color);
              radioClone.classList.remove(radioClone.dataset.color.replace('border', 'bg') + '/50');
              radioClone.classList.add(radioClone.dataset.color.replace('border', 'hover:bg') + '/50');
            }
          });

          inputs.radio[0].selected = index;

          if (autoformatType != '') {
            if (autoformatType.includes('footer')) {
              if (autoformatText != '') {
                input.listener(input.title, tempModalContainer.querySelector(`#modalMainBtn`), autoformatText);
              }
            } else if (autoformatType.includes('online')) {
              input.listener(input.title, input.id);
            } else {
              if (autoformatIndex > 0) {
                input.listener(
                  input.title,
                  tempModalContainer.querySelector(`#input-${autoformatType}-${autoformatIndex}`),
                  tempModalContainer,
                  inputs
                );
              }
            }
          }
        });
        if (index == inputs.radio[0].selected && !inputs.radio[0].donotautoclick)
          clone.dispatchEvent(new Event('click'));
      }
    });

    radioContainer.classList.remove('hidden');
    originalContainer.insertAdjacentElement('afterend', radioContainer);

    // Initialize radio-dependent UI on modal open by triggering the selected option's listener once
    try {
      const selectedIndex = inputs.radio[0].selected;
      const selectedRadio = inputs.radio[selectedIndex];
      if (selectedRadio && inputs.radio[0].autoformat) {
        const initType = inputs.radio[0].autoformat.type || '';
        const initIndex = inputs.radio[0].autoformat.index || 0;
        const initText = inputs.radio[0].autoformat.text || '';
        if (initType) {
          if (initType.includes('footer')) {
            if (initText) {
              selectedRadio.listener(selectedRadio.title, tempModalContainer.querySelector(`#modalMainBtn`), initText);
            }
          } else if (initIndex > 0) {
            const targetEl = tempModalContainer.querySelector(`#input-${initType}-${initIndex}`);
            if (targetEl) selectedRadio.listener(selectedRadio.title, targetEl, tempModalContainer, inputs);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  function setupRenderInput(type, render, offset) {
    if (render) {
      const inputId = type === 'short' || type === 'spinner' ? `#input-${type}-${offset}` : `#input-${type}`;

      if (type === 'spinner') {
        const originalContainer = tempModalContainer.querySelector(inputId).parentElement.parentElement;
        const nextContainer = originalContainer.nextElementSibling;
        render.forEach((spinnerGroup, index) => {
          const spinnerContainer = originalContainer.cloneNode(true);

          renderInput(originalContainer, spinnerContainer, type, spinnerGroup, index + offset);
          nextContainer.insertAdjacentElement('beforebegin', spinnerContainer);
        });
      } else {
        const originalContainer = tempModalContainer.querySelector(inputId).parentElement;
        const nextContainer = originalContainer.nextElementSibling;
        render.forEach((input, index) => {
          const clone = originalContainer.cloneNode(true);

          clone.children[1].addEventListener('input', () => {
            input.value = clone.children[1].value;
          });

          renderInput(originalContainer, clone, type, input, index + offset);
          nextContainer.insertAdjacentElement('beforebegin', clone);
        });
      }
    }
  }

  function renderInput(originalContainer, clone, type, data, index) {
    let label, input;
    if (!type.includes('spinner')) {
      label = clone.children[0];
      input = clone.children[1];
      const id = `input-${type}-${index + 1}`;

      label.setAttribute('for', id);
      label.innerHTML = data.placeholder + (data.required ? ' *' : '');

      if (data.locked) {
        input.readOnly = true;
        input.classList.add('bg-gray-200', 'text-gray-500');
      }

      input.id = id;
      // Allow consumers to specify a custom input type (e.g., 'time')
      if (data.type) {
        input.type = data.type;
      }
      input.placeholder = data.placeholder;
      input.value = data.value;
      if (input.type === 'time') {
        let time = new Date().toTimeString().split(' ')[0];
        if (data.offset) {
          time = new Date(Date.now() + data.offset * 3600000).toTimeString().split(' ')[0];
        }
        time = time.substring(0, time.lastIndexOf(':'));
        input.value = time;
      }
    }

    if (type.includes('short')) {
      const calendarInput = input.nextElementSibling;
      if (data.calendar) {
        input.addEventListener('click', () => {
          if (isValidDate(input.value)) {
            openInputCalendar(new Date(input.value));
            return;
          }
          openInputCalendar();
        });

        originalContainer.parentElement.parentElement.parentElement.addEventListener('click', closeInputCalendar);

        function openInputCalendar(dateObj = new Date()) {
          calendarInput.classList.remove('hidden');

          const month = calendarInput.querySelector(`#input-calendar-month`);
          const monthNext = calendarInput.querySelector(`#input-calendar-month-next`);
          const monthPrev = calendarInput.querySelector(`#input-calendar-month-prev`);
          const year = calendarInput.querySelector(`#input-calendar-year`);
          const yearNext = calendarInput.querySelector(`#input-calendar-year-next`);
          const yearPrev = calendarInput.querySelector(`#input-calendar-year-prev`);
          const calendarGrid = calendarInput.querySelector(`#input-calendar-grid`);

          let dateCell = null;
          const newDateObj = new Date(dateObj);
          const todayObj = new Date();
          displayDate();
          fillCalendar();

          function displayDate() {
            const monthName = newDateObj.toLocaleString('en-US', { month: 'long' });
            const yearNum = newDateObj.getFullYear();
            month.textContent = monthName;
            year.textContent = yearNum;
          }

          function fillCalendar() {
            calendarGrid.innerHTML = '';

            const yearNum = newDateObj.getFullYear();
            const monthNum = newDateObj.getMonth();

            const firstDay = new Date(yearNum, monthNum, 1).getDay();
            const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate();

            calendarGrid.className = 'grid grid-cols-7 p-2';

            for (let i = 0; i < firstDay; i++) {
              const emptyCell = document.createElement('div');
              calendarGrid.appendChild(emptyCell);
            }

            for (let date = 1; date <= daysInMonth; date++) {
              const cell = document.createElement('div');
              if (date == dateObj.getDate() && monthNum === dateObj.getMonth() && yearNum === dateObj.getFullYear()) {
                dateCell = cell;
              }
              cell.textContent = date;
              cell.className = 'duration-300 text-center p-1 cursor-pointer rounded hover:bg-blue-200';

              if (
                date === todayObj.getDate() &&
                monthNum === todayObj.getMonth() &&
                yearNum === todayObj.getFullYear()
              ) {
                cell.classList.add('ring-inset', 'ring-2', 'ring-blue-600');
              }

              cell.addEventListener('click', () => {
                selectDayCell(cell);
                calendarInput.classList.add('hidden');
                input.value = encodeDate(new Date(yearNum, monthNum, date), '2-digit');
                input.dispatchEvent(new Event('input'));
                data.value = input.value;
              });

              calendarGrid.appendChild(cell);
            }

            selectDayCell(dateCell);
          }

          function selectDayCell(dateCell) {
            [...calendarGrid.querySelectorAll('div')].forEach((c) => {
              if (c.classList.contains('duration-300')) {
                c.classList.remove('bg-blue-500');
                c.classList.add('hover:bg-blue-200');
              }
            });
            if (dateCell) {
              dateCell.classList.add('bg-blue-500');
              dateCell.classList.remove('hover:bg-blue-200');
            }
          }

          monthNext.addEventListener('click', () => {
            newDateObj.setMonth(newDateObj.getMonth() + 1);
            displayDate();
            fillCalendar();
          });

          monthPrev.addEventListener('click', () => {
            newDateObj.setMonth(newDateObj.getMonth() - 1);
            displayDate();
            fillCalendar();
          });

          yearNext.addEventListener('click', () => {
            newDateObj.setFullYear(newDateObj.getFullYear() + 1);
            displayDate();
            fillCalendar();
          });

          yearPrev.addEventListener('click', () => {
            newDateObj.setFullYear(newDateObj.getFullYear() - 1);
            displayDate();
            fillCalendar();
          });
        }

        function closeInputCalendar(e) {
          if (e.target.id != input.id && e.target.closest(`#input-calendar`) == null) {
            calendarInput.classList.add('hidden');
          }
        }
      } else if (calendarInput) {
        calendarInput.remove();
      }

      if (data.autoformat) {
        input.value = encodePrice(input.value);

        input.addEventListener('input', () => {
          if (data.autoformat.includes('price')) {
            data.value = decodePrice(input.value);
          }
        });

        input.addEventListener('blur', () => {
          if (data.autoformat.includes('price')) {
            input.value = encodePrice(input.value);
            data.value = decodePrice(input.value);
          }
        });

        input.addEventListener('focus', () => {
          if (data.autoformat.includes('price')) {
            input.value = decodePrice(input.value);
            data.value = input.value;
          }
        });
      }

      if (data.listener) {
        input.addEventListener('input', () => {
          data.listener(input, tempModalContainer);
        });
      }

      // 13-digit limit for any input labeled "Reference number"
      const placeholderText = (data.placeholder || '').toLowerCase();
      if (placeholderText.includes('reference number')) {
        try {
          input.maxLength = 13;
        } catch (_) {}
        input.setAttribute('inputmode', 'numeric');
        input.addEventListener('input', (e) => {
          const currentVal = String(input.value || '');
          const isSynthetic = e && e.isTrusted === false;
          // Preserve sentinel N/A and ignore programmatic initial input event
          if (isSynthetic && currentVal.toUpperCase() === 'N/A') {
            data.value = currentVal;
            return;
          }
          // Enforce digits only on real user edits
          const digitsOnly = currentVal.replace(/\D/g, '');
          if (digitsOnly.length > 13 && e && e.isTrusted) {
            try {
              toast('Reference number max is 13 digits', 'warning');
            } catch (_) {}
          }
          input.value = digitsOnly.slice(0, 13);
          data.value = input.value;
        });
      }
    }

    if (type.includes('spinner')) {
      label = clone.children[0];
      label.innerHTML = data.label + (data.required ? ' *' : '');
      if (data.locked) {
        clone.children[1].children[0].disabled = true;
        clone.children[1].children[0].classList.add('border-gray-400', 'bg-gray-300', 'text-gray-600');
      }

      const selectElement = clone.querySelector('select');
      selectElement.id = `input-${type}-${index + 1}`;

      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.innerHTML = data.placeholder || 'Select an option';
      if ((isNumeric(data.selected) && data.selected == 0) || data.required) {
        placeholderOption.readOnly = true;
        placeholderOption.classList.add('bg-gray-200', 'text-gray-500');
      }
      placeholderOption.selected = true;
      selectElement.appendChild(placeholderOption);

      data.options.forEach((optionData, index) => {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.innerHTML = optionData.label;
        option.classList.add('font-medium');

        if (isNumeric(data.selected)) {
          if (index == data.selected - 1) {
            option.selected = true;
            placeholderOption.selected = false;
          }
        } else {
          if (option.value == data.selected.toLowerCase()) {
            data.selected = index + 1;
            option.selected = true;
            placeholderOption.selected = false;
          }
        }

        selectElement.appendChild(option);
      });

      selectElement.onchange = function () {
        data.selected = this.selectedIndex;
        if (data.listener) {
          data.listener(data.selected, tempModalContainer);
        }
      };
    } else {
      if (data.live) {
        let [indices, dataFunction] = data.live.split(':');
        indices = indices.split('|');

        const firstIndexInput = originalContainer.parentElement.querySelector(
          `#input-${type}-${index + 1 - indices[0]}`
        );
        firstIndexInput.addEventListener('input', () => {
          liveUpdate(
            input,
            { firstIndexInput, secondIndexInputOperator, secondIndexInput, thirdIndexInputOperator, thirdIndexInput },
            dataFunction
          );
        });

        let [secondIndexInputOperator, secondIndexInput] = indices[1].split('');
        secondIndexInput = originalContainer.parentElement.querySelector(
          `#input-${type}-${index + 1 - secondIndexInput}`
        );
        secondIndexInput.addEventListener('input', () => {
          liveUpdate(
            input,
            { firstIndexInput, secondIndexInputOperator, secondIndexInput, thirdIndexInputOperator, thirdIndexInput },
            dataFunction
          );
        });

        let thirdIndexInputOperator, thirdIndexInput;
        if (indices[2]) {
          [thirdIndexInputOperator, thirdIndexInput] = indices[2].split('');
          thirdIndexInput = originalContainer.parentElement.querySelector(
            `#input-${type}-${index + 1 - thirdIndexInput}`
          );
          thirdIndexInput.addEventListener('input', () => {
            liveUpdate(
              input,
              { firstIndexInput, secondIndexInputOperator, secondIndexInput, thirdIndexInputOperator, thirdIndexInput },
              dataFunction
            );
          });
        }

        if (dataFunction.includes('range')) {
          input.addEventListener('input', () => {
            liveUpdate(
              input,
              { firstIndexInput, secondIndexInputOperator, secondIndexInput, thirdIndexInputOperator, thirdIndexInput },
              dataFunction
            );
          });
        }

        function liveUpdate(
          input,
          { firstIndexInput, secondIndexInputOperator, secondIndexInput, thirdIndexInputOperator, thirdIndexInput },
          dataFunction
        ) {
          let dataFunctionOutput;
          switch (dataFunction) {
            case 'arithmetic':
              dataFunctionOutput = +decodePrice(firstIndexInput.value);
              switch (secondIndexInputOperator) {
                case '+':
                  dataFunctionOutput += +decodePrice(secondIndexInput.value);
                  break;
              }
              switch (thirdIndexInputOperator) {
                case '-':
                  dataFunctionOutput -= +decodePrice(thirdIndexInput.value);
                  break;
              }
              input.value = dataFunctionOutput <= 0 ? encodePrice(0) : encodePrice(dataFunctionOutput);
              data.value = input.value;
              break;
            case 'range':
              const startDateStr = firstIndexInput.value;
              const daysToAdd = +input.value * 30 || 30;
              const [month, day, year] = startDateStr.split('-').map(Number);
              const startDate = new Date(year, month - 1, day);
              const resultDate = new Date(startDate);
              resultDate.setDate(resultDate.getDate() + daysToAdd);
              dataFunctionOutput = `from ${startDate.toLocaleString('en-US', {
                month: 'long',
                day: '2-digit',
                year: 'numeric',
              })} to ${resultDate.toLocaleString('en-US', {
                month: 'long',
                day: '2-digit',
                year: 'numeric',
              })}`;
              secondIndexInput.value = dataFunctionOutput;
              break;
          }
        }
      }

      if (data.icon) input.querySelectorAll('p')[0].innerHTML = data.icon;
      if (data.title) input.querySelectorAll('p')[1].innerHTML = data.title;
      if (data.subtitle) input.querySelectorAll('p')[2].innerHTML = data.subtitle;

      input.dispatchEvent(new Event('input'));
    }

    if (!data.hidden) clone.classList.remove('hidden');
  }
}

export function toast(message, type) {
  const colorSchemes = {
    success: { bg: '#4CAF50', text: '#fff' },
    error: { bg: '#F44336', text: '#fff' },
    info: { bg: '#2196F3', text: '#fff' },
    warning: { bg: '#FF9800', text: '#fff' },
  };
  Toastify({
    text: message,
    duration: 5000,
    close: true,
    gravity: 'top',
    position: 'right',
    backgroundColor: colorSchemes[type].bg,
    stopOnFocus: false,
    style: {
      color: colorSchemes[type].text,
      borderRadius: '8px',
      padding: '12px 20px',
      fontSize: '14px',
    },
  }).showToast();
}

export function isValidPaymentAmount(amount) {
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

export function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

export function checkIfEmpty(inputs) {
  let hasEmpty = false;

  if (inputs === '') hasEmpty = true;
  if (inputs.image && inputs.image.short) inputs.image.short.forEach((item) => check(item));
  if (inputs.short) inputs.short.forEach((item) => check(item));
  if (inputs.large) inputs.large.forEach((item) => check(item));
  if (inputs.spinner) inputs.spinner.forEach((item) => check(item));

  function check(item) {
    if (item.required && !hasEmpty) {
      if (item.value === '' || item.selected == 0) {
        hasEmpty = true;
      }
    }
  }

  if (hasEmpty) toast('Fill required fields first!', 'error');
  return hasEmpty;
}

export function getAllSectionOne(sectionName, tabIndex, callback) {
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  const items = emptyText.parentElement.parentElement.children;
  const result = Array.from(items);
  result.shift();
  callback(result);
}

export function getAllSectionTwo(sectionName, callback) {}

export function findAtSectionOne(sectionName, findValue, findType, tabIndex, callback) {
  if (!findValue || findValue.trim() === '') {
    callback(null);
    return;
  }
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  const items = emptyText.parentElement.parentElement.children;
  for (let i = 1; i < items.length; i++) {
    if (searchFunction(items[i], findValue, findType, callback)) return;
  }
  callback(null);
}

export function findAtSectionTwo(sectionName, findValue, findType, callback) {
  if (checkIfEmpty(findValue)) return;
  const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
  const items = emptyText.parentElement.children;
  for (let i = 2; i < items.length; i++) {
    if (searchFunction(items[i], findValue, findType, callback)) return;
  }
  callback(null);
}

function searchFunction(item, findValue, findType, callback) {
  if (findType.includes('equal')) {
    if (item.dataset[findType.split('_')[1]] == findValue) {
      callback(item);
      return true;
    }
    return false;
  }
  switch (findType) {
    case 'any':
      if (item.dataset.id.toLowerCase().includes(findValue.toLowerCase())) {
        callback(item);
        return true;
      }
      if (item.dataset.text.toLowerCase().includes(findValue.toLowerCase())) {
        callback(item);
        return true;
      }
      if (item.dataset.datetime && item.dataset.datetime.toLowerCase().includes(findValue.toLowerCase())) {
        callback(item);
        return true;
      }
      if (item.dataset.date && item.dataset.date.toLowerCase().includes(findValue.toLowerCase())) {
        callback(item);
        return true;
      }
      if (item.dataset.time && item.dataset.time.toLowerCase().includes(findValue.toLowerCase())) {
        callback(item);
        return true;
      }
      if (item.textContent.toLowerCase().includes(findValue.toLowerCase())) {
        callback(item);
        return true;
      }
      break;
    case 'pending':
      if (item.dataset.id == findValue && item.dataset.time.toLowerCase().includes(findType)) {
        callback(item);
        return true;
      }
      break;
  }
  return false;
}

export function createAtSectionOne(sectionName, columnsData, tabIndex, callback = () => {}) {
  const searchInput = document.getElementById(`${sectionName}SectionOneSearch`);
  if (searchInput) {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
  }
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  const tableRow = emptyText.parentElement;
  const referenceCells = Array.from(tableRow.children);
  referenceCells.shift();

  const newRow = document.createElement('tr');
  newRow.className = 'hover:bg-orange-500/10 duration-300';

  columnsData.forEach((columnData, index) => {
    const cell = index < referenceCells.length ? referenceCells[index].cloneNode(true) : document.createElement('td');
    cell.classList.remove('hidden');
    newRow.appendChild(cell);
    fillUpCell(newRow, index, cell, columnData, sectionName, tabIndex);
  });
  const cell = referenceCells[referenceCells.length - 1].cloneNode(true);
  if (newRow.dataset.id != 'generating') cell.classList.remove('hidden');
  const totalBtnsCellWidth = 150 * cell.children[0].children.length;
  cell.classList.add(`w-[${totalBtnsCellWidth}px]`);
  const btnsCellHeader = document.querySelector(
    `#${sectionName}-section-content [data-tabindex="${tabIndex}"] th:nth-child(${columnsData.length + 1})`
  );
  if (btnsCellHeader) btnsCellHeader.classList.add(`w-[${totalBtnsCellWidth}px]`);
  newRow.appendChild(cell);

  tableRow.classList.add('hidden');
  tableRow.parentElement.children[0].insertAdjacentElement('afterend', newRow);

  // Update pagination after adding row
  setTimeout(() => {
    pagination.refreshPagination(sectionName, tabIndex);
  }, 0);

  callback(newRow);
}

function getRandomId(row, cell, data, sectionName, tabIndex) {
  const randomId_A = Math.floor(100000 + Math.random() * 900000);
  const randomId_B = Math.floor(100000 + Math.random() * 900000);
  let randomId = data.split('_')[1] + randomId_A + '' + randomId_B;
  findAtSectionOne(sectionName, randomId, 'equal_id', tabIndex, (result) => {
    if (result) {
      getRandomId(row, cell, data, sectionName, tabIndex);
    } else {
      cell.innerHTML = randomId;
      row.dataset.id = randomId;
      row.children[row.children.length - 1].classList.remove('hidden');
    }
  });
}

async function fillUpCell(row, index, cell, data, sectionName, tabIndex) {
  if (typeof data === 'string') {
    const lowerColumn = data.toLowerCase();

    if (lowerColumn.split('_')[0] === 'id') {
      if (lowerColumn.includes('random')) {
        cell.innerHTML = 'Generating..';
        row.dataset.id = 'generating';
        getRandomId(row, cell, data, sectionName, tabIndex);
      } else {
        const idValue = data.split('_')[1];
        cell.innerHTML = idValue;
        row.dataset.id = idValue;
      }
      return;
    }

    if (lowerColumn.split('_')[0] === 'custom') {
      if (lowerColumn.includes('date') || lowerColumn.includes('time')) {
        const type = lowerColumn.split('_')[1];
        if (lowerColumn.includes('today')) {
          if (['date', 'time', 'datetime'].includes(type)) {
            const dateOptions = {
              year: 'numeric',
              month: getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long',
              day: 'numeric',
            };
            const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };

            let value = '';
            if (type === 'date' || type === 'datetime') {
              value = new Date().toLocaleDateString('en-US', dateOptions);
            }
            if (type === 'time' || type === 'datetime') {
              const time = new Date().toLocaleTimeString('en-US', timeOptions);
              value = type === 'datetime' ? `${value} - ${time}` : time;
            }

            setDateTimeContent(cell, value);
            return;
          }
        }

        function setDateTimeContent(cell, value) {
          cell.innerHTML = value;
          switch (type) {
            case 'date':
              row.dataset.date = value;
              break;
            case 'time':
              row.dataset.time = value;
              break;
            case 'datetime':
              row.dataset.datetime = value;
              break;
          }
        }

        setDateTimeContent(cell, data.split('_')[2]);
        return;
      }
    }

    row.dataset['custom' + index] = data;
    // Auto-align currency-like values to the right
    try {
      const txt = String(data);
      const currencyLike = /[₱$€]|php/i.test(txt) || /^\s*\d{1,3}(,\d{3})*(\.\d{2})?\s*$/.test(txt);
      if (currencyLike) {
        cell.classList.add('text-right');
      }
    } catch (_) {}
    cell.innerHTML = data;
    return;
  }

  if (data.type && data.type.toLowerCase().includes('object')) {
    row.dataset.image = data.data[0];
    row.dataset.text = data.data[1];
    if (data.type.split('_').length > 0) {
      for (let i = 1; i < data.type.split('_').length; i++) {
        row.dataset[data.type.split('_')[i]] = data.data[i + 1];
      }
    }

    const cellContent = `
      <div class="flex items-center gap-3">
        <img src="${data.data[0] ? data.data[0] : '/src/images/client_logo.jpg'}" class="h-8 w-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onclick="showImageModal(this.src, '${(data.data[1].includes(':://') ? data.data[1].replace(/\:\:\/\//g, ' ') : data.data[1]).replace(/'/g, '&#39;')}')" />
        <p>${data.data[1].includes(':://') ? data.data[1].replace(/\:\:\/\//g, ' ') : data.data[1]}</p>
      </div>
    `;

    cell.innerHTML = cellContent;
    return;
  }

  // Auto-align currency-like values to the right for non-string inputs as well
  try {
    const txt = String(data);
    const currencyLike = /[₱$€]|php/i.test(txt) || /^\s*\d{1,3}(,\d{3})*(\.\d{2})?\s*$/.test(txt);
    if (currencyLike) {
      cell.classList.add('text-right');
    }
  } catch (_) {}
  cell.innerHTML = data;
}

export function createAtSectionTwo(sectionName, data, callback) {
  const searchInput = document.getElementById(`${sectionName}SectionTwoSearch`);
  if (searchInput) {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
  }
  const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
  const result = emptyText.nextElementSibling.cloneNode(true);
  result.classList.remove('hidden');
  emptyText.classList.add('hidden');
  emptyText.nextElementSibling.insertAdjacentElement('afterend', result);

  if (data.id) {
    if (data.id.includes('random')) {
      const randomId_A = Math.floor(100000 + Math.random() * 900000);
      const randomId_B = Math.floor(100000 + Math.random() * 900000);
      const id = data.id.split('_')[0] + randomId_A + '' + randomId_B;
      result.dataset.id = id;
    } else {
      result.dataset.id = data.id;
    }
  }

  result.dataset.actorid = 'U288343611137';
  result.dataset.actorname = 'Jestley';
  result.dataset.actorrole = 'Admin';
  result.dataset.module = data.action.module;
  if (data.action.submodule) result.dataset.submodule = data.action.submodule;
  result.dataset.description = data.action.description;
  result.dataset.type = data.type;

  result.innerHTML = `
    <div class="absolute left-2 top-2">
      <div class="relative h-2 w-2">
        <div class="h-full w-full absolute scale-105 animate-ping rounded-full bg-green-500 opacity-75"></div>
        <div class="absolute h-2 w-2 rounded-full bg-green-500"></div>
      </div>
    </div>
  `;

  result.addEventListener('mouseover', function () {
    result.children[0].classList.add('hidden');
  });

  return callback(result);
}

export function updateAtSectionOne(sectionName, columnsData, tabIndex, findValue, callback) {
  const searchInput = document.getElementById(`${sectionName}SectionOneSearch`);
  if (searchInput) {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
  }

  findAtSectionOne(sectionName, findValue, 'equal_id', tabIndex, (result) => {
    if (!result) {
      // Row not found: could show a toast or ignore silently
      return;
    }
    for (let i = 0; i < columnsData.length; i++) {
      fillUpCell(result, i, result.children[i], columnsData[i], sectionName, tabIndex);
    }
    callback(result);
  });
}

export function deleteAtSectionOne(sectionName, tabIndex, id) {
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  const items = emptyText.parentElement.parentElement.children;
  for (let i = 1; i < items.length; i++) {
    if (items[i].dataset.id == id) {
      items[i].remove();
      if (items.length == 1) emptyText.parentElement.classList.remove('hidden');
      return;
    }
  }
}

export function deleteAtSectionTwo(sectionName, id) {
  const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
  const items = emptyText.parentElement.children;
  for (let i = 2; i < items.length; i++) {
    if (items[i].dataset.id == id) {
      items[i].remove();
      if (items.length == 2) emptyText.classList.remove('hidden');
      return;
    }
  }
}

export function deleteAllAtSectionOne(sectionName, tabIndex, callback = null) {
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  emptyText.parentElement.classList.remove('hidden');
  const container = emptyText.parentElement.parentElement;
  while (container.children.length > 1) {
    container.lastChild.remove();
  }

  if (callback) {
    callback();
  }
  // Reset pagination when all rows are deleted
  pagination.resetPagination(sectionName, tabIndex);
}

export function deleteAllAtSectionTwo(sectionName) {
  const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
  emptyText.classList.remove('hidden');
  const items = emptyText.parentElement.querySelectorAll('.section-content-list-item:not(.hidden)');
  items.forEach((item) => item.remove());
}

export function createNotifDot(sectionName, type) {
  if (typeof type === 'string' && !type.includes('section')) {
    document
      .querySelector(`.sidebar-${type}-btn[data-section="${sectionName}"]`)
      .lastElementChild.classList.remove('hidden');
    return;
  }
  if (typeof type === 'number') {
    if (sectionName != sharedState.sectionName || type != sharedState.activeTab) {
      document.getElementById(`${sectionName}_tab${type}`).lastElementChild.classList.remove('hidden');
    }
    return;
  }
}

export function removeRedDot(sectionName, type) {
  if (typeof type === 'string' && !type.includes('section')) {
    document
      .querySelector(`.sidebar-${type}-btn[data-section="${sectionName}"]`)
      .lastElementChild.classList.add('hidden');
    return;
  }
  if (typeof type === 'number') {
    if (sectionName != sharedState.sectionName || type != sharedState.activeTab) {
      document.getElementById(`${sectionName}_tab${type}`).lastElementChild.classList.add('hidden');
    }
    return;
  }
}

export function encodeName(firstName, lastName) {
  return firstName + ':://' + lastName;
}

export function decodeName(name) {
  const parts = name.split(':://');
  return {
    firstName: parts[0],
    lastName: parts[1],
    fullName: `${parts[0]}${parts[1] ? ' ' + parts[1] : ''}`,
  };
}

export function encodeDate(date, type) {
  if (typeof date != 'object') date = new Date(date);
  return date
    .toLocaleDateString('en-US', {
      year: 'numeric',
      month: type,
      day: '2-digit',
    })
    .replace(/\//g, '-');
}

export function encodeTime(time) {
  if (typeof time != 'object') time = new Date(time);
  return time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function decodeDate(date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function decodeTime(time, offsetHours = 0) {
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr, 10);

  let totalMinutes = hour * 60 + minute + offsetHours * 60;
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  hour = Math.floor(totalMinutes / 60);
  minute = totalMinutes % 60;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');

  return `${displayHour}:${displayMinute} ${ampm}`;
}

export function getDateOrTimeOrBoth() {
  const now = new Date();
  const prefs = getUserPrefs();

  // Time format
  const hour12 = prefs.timeFormat === '12h';
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12 });

  // Date format
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const date = prefs.dateFormat === 'DD-MM-YYYY' ? `${dd}-${mm}-${yyyy}` : `${mm}-${dd}-${yyyy}`;

  return { date, time, datetime: `${date} - ${time}` };
}

export function updateDateAndTime() {
  const { date, time } = getDateOrTimeOrBoth();
  const liveDate = document.getElementById(`${sharedState.sectionName}-section-header`)?.querySelector(`#liveDate`);

  if (liveDate) {
    liveDate.classList.add('skew-x-12', 'text-white', 'emoji');
    liveDate.innerHTML = `${getEmoji('📅')} ${date} ${getEmoji('⌚')} ${time}`;
  }
}

export function getUserPrefs() {
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
    return {
      hiddenSections: [],
      compactSidebar: false,
      timeFormat: '12h',
      dateFormat: 'MM-DD-YYYY',
      baseFontSize: 'normal',
      rememberLast: true,
    };
  }
}

export function isValidDate(dateString) {
  const regex = /^(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])-\d{4}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  const [month, day, year] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isPastDate(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [month, day, year] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date < today;
}

export function isIncomingDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) > today;
}

export function encodePrice(price) {
  return `₱${Number(price).toFixed(2)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function decodePrice(price) {
  return Number(
    String(price)
      .replace(/<[^>]*>/g, '')
      .replace(/[^\d.-]/g, '')
  ).toString();
}

export function formatPrice(price) {
  return `<p class="text-right">${encodePrice(price)}</p>`;
}

export function deformatPrice(price) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = price;
  const priceText = tempDiv.textContent || tempDiv.innerText;
  return decodePrice(priceText);
}

export function getStockStatus(quantity) {
  if (typeof quantity != 'number') quantity = +quantity;
  if (quantity === 0) return `<div class="emoji text-gray-800 font-bold">Out of Stock ${getEmoji('⚠️')}</div>`;
  if (quantity <= 10) return `<div class="emoji text-red-700 font-bold">Super Low Stock ${getEmoji('‼️')}</div>`;
  if (quantity <= 50) return `<div class="emoji text-amber-700 font-bold">Low Stock ${getEmoji('⚠️')}</div>`;
  return `<div class="emoji text-emerald-700 font-bold">High Stock ${getEmoji('✅')}</div>`;
}

export function validateStockInputs(price, quantity, measurement) {
  if (!isValidPaymentAmount(+price)) {
    toast(`Invalid price: ${price}`, 'error');
    return false;
  }
  if (!isValidPaymentAmount(+quantity)) {
    toast(`Invalid quantity: ${quantity}`, 'error');
    return false;
  }
  if (measurement && !isValidPaymentAmount(+measurement)) {
    toast('Invalid measurement', 'error');
    return false;
  }
  return true;
}

export function encodeText(text) {
  return text.replace(/\s+/g, ':://');
}

export function decodeText(text) {
  return text.replace(/\:\:\/\//g, ' ');
}

export function fixText(text) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getSelectedSpinner(spinner) {
  return spinner.selected > 0 ? spinner.options[spinner.selected - 1].value : '';
}

export function getSelectedOption(selected, options) {
  return options.find((option) => option.value.toLowerCase().includes(selected.toLowerCase())).label;
}

export function getSelectedRadio(radio) {
  return radio[radio[0].selected].title.toLowerCase();
}

export default {
  sharedState,
  showSection,
  openModal,
  openConfirmationModal,
  closeModal,
  closeConfirmationModal,
  toast,
  isValidPaymentAmount,
  isNumeric,
  checkIfEmpty,
  getAllSectionOne,
  getAllSectionTwo,
  findAtSectionOne,
  findAtSectionTwo,
  createAtSectionOne,
  createAtSectionTwo,
  updateAtSectionOne,
  deleteAtSectionOne,
  deleteAtSectionTwo,
  deleteAllAtSectionOne,
  deleteAllAtSectionTwo,
  createNotifDot,
  removeRedDot,
  getUserPrefs,

  // inquiry-customer
  encodeName,
  decodeName,
  encodeDate,
  encodeTime,
  decodeDate,
  decodeTime,
  getDateOrTimeOrBoth,
  updateDateAndTime,
  isValidDate,
  isPastDate,
  isIncomingDate,

  // ecommerce-stock
  encodePrice,
  decodePrice,
  formatPrice,
  deformatPrice,
  getStockStatus,
  validateStockInputs,
  encodeText,
  decodeText,
  fixText,
  getSelectedSpinner,
  getSelectedOption,
  getSelectedRadio,
  showGlobalLoading,
  hideGlobalLoading,
};

document.addEventListener('DOMContentLoaded', function () {
  if (checkIfJsShouldNotRun('admin_main')) return;
  setupSidebar();
  showLoadingAndPreloadSections();
  setupLogoDashboardRedirect();
});

async function showLoadingAndPreloadSections() {
  const sectionNames = Array.from(document.querySelectorAll('.section')).map(
    (section) => section.id.split('-section')[0]
  );
  const loadingOverlay = createLoadingOverlay();
  document.body.appendChild(loadingOverlay);

  const allSections = document.querySelectorAll('.section');
  allSections.forEach((section) => section.classList.add('hidden'));

  let loadedCount = 0;
  const totalSections = sectionNames.length;

  function updateProgress(sectionName) {
    loadedCount++;
    const progressPercent = Math.round((loadedCount / totalSections) * 100);

    const progressBar = document.querySelector('.loading-progress-bar');
    const progressText = document.querySelector('.loading-progress-text');
    const currentSectionText = document.querySelector('.loading-current-section');

    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (progressText) progressText.innerHTML = `${progressPercent}%`;
    if (currentSectionText) currentSectionText.innerHTML = `Loading ${sectionName}...`;
  }

  try {
    const loadPromises = sectionNames.map(async (sectionName) => {
      await loadSectionSilently(sectionName);
      await showSection(sectionName);
      updateProgress(sectionName);
    });

    await Promise.all(loadPromises);

    await new Promise((resolve) => setTimeout(resolve, 0));

    loadingOverlay.classList.add('opacity-0');
    setTimeout(() => {
      loadingOverlay.remove();
    }, 300);
    // Restore last opened section/tab if enabled
    try {
      const prefs = getUserPrefs();
      const saved = JSON.parse(localStorage.getItem('ogfmsi_last_open') || 'null');
      // if (prefs.rememberLast && saved && sectionNames.includes(saved.sectionName)) {
      //   showSection(saved.sectionName, saved.tabIndex || 1);
      // } else {
      // }
      showSection('dashboard');
    } catch (_e) {
      showSection('dashboard');
    }
  } catch (error) {
    console.error('Error loading sections:', error);
    loadingOverlay.classList.add('opacity-0');
    setTimeout(() => {
      loadingOverlay.remove();
    }, 300);
    // Fallback on error
    try {
      const prefs = getUserPrefs();
      const saved = JSON.parse(localStorage.getItem('ogfmsi_last_open') || 'null');
      if (prefs.rememberLast && saved && sectionNames.includes(saved.sectionName)) {
        showSection(saved.sectionName, saved.tabIndex || 1);
      } else {
        showSection('dashboard');
      }
    } catch (_e) {
      showSection('dashboard');
    }
  }
}

function createLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center opacity-1 duration-300';
  overlay.innerHTML = `
    <img src="/src/images/background_image_1.jpg" class="absolute inset-0 h-full w-full object-cover" />
    <div class="absolute inset-0 h-full w-full backdrop-blur-[15px] bg-black/50"></div>
    <div class="relative z-10 mx-auto max-w-2xl px-6 text-center">
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-white drop-shadow-lg">Fitworx Gym - Admin Dashboard</h1>
        <p class="text-white drop-shadow-md">Initializing system components...</p>
      </div>
      <div class="mb-6">
        <div class="h-3 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
          <div
            class="loading-progress-bar h-full rounded-full bg-orange-500 transition-all duration-300 ease-out shadow-lg"
            style="width: 0%"
          ></div>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <span class="loading-current-section text-sm text-white drop-shadow-md">Preparing to load...</span>
          <span class="loading-progress-text text-sm font-semibold text-orange-200 drop-shadow-md">0%</span>
        </div>
      </div>
      <div class="flex justify-center space-x-2">
        <div class="h-3 w-3 animate-bounce rounded-full bg-orange-500 shadow-lg" style="animation-delay: 0ms"></div>
        <div class="h-3 w-3 animate-bounce rounded-full bg-orange-500 shadow-lg" style="animation-delay: 150ms"></div>
        <div class="h-3 w-3 animate-bounce rounded-full bg-orange-500 shadow-lg" style="animation-delay: 300ms"></div>
      </div>
    </div>
  `;

  return overlay;
}

function setupLogoDashboardRedirect() {
  document.addEventListener('click', function (e) {
    const target = e.target.closest('img');
    if (!target) return;
    const srcAttr = target.getAttribute('src') || '';
    const absoluteSrc = target.src || '';
    // Match either attribute value or resolved absolute path
    const isClientLogo =
      srcAttr.endsWith('/src/images/client_logo.jpg') ||
      srcAttr.endsWith('client_logo.jpg') ||
      absoluteSrc.endsWith('/src/images/client_logo.jpg') ||
      absoluteSrc.endsWith('client_logo.jpg');
    if (!isClientLogo) return;
    e.preventDefault();
    if (target.getAttribute('onclick').split('(')[0].trim() === 'showImageModal') return;
    try {
      showSection('dashboard');
    } catch (_e) {}
  });
}
