const sharedState = {
  sectionName: '',
  activeTab: 1,
};

export let { sectionName, activeTab } = sharedState;

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
        document.dispatchEvent(new CustomEvent('ogfmsiAdminMainLoaded'));
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
        const response = await fetch(`admin_${componentName}.html`);
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
                  statsTexts.innerHTML + ` <b class="text-${dataset.mainColor}-500">${dataset[field][i]}</b>`;
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
                  if (searchTerm == '') {
                    items.forEach((item, i) => {
                      if (i > 0) {
                        item.classList.remove('hidden');
                      }
                    });
                    return;
                  }
                  items.forEach((item, i) => {
                    if (i > 0) {
                      if (item.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                        item.classList.remove('hidden');
                      } else {
                        item.classList.add('hidden');
                      }
                    }
                  });
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
              table.className = 'w-full border-collapse cursor-default text-xs';
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');
              const titleTexts = dataset['listtitletexts'][i].slice(1, -1).split('//');
              clone.dataset.columncount = titleTexts.length;
              titleTexts.forEach((titleText, index) => {
                const th = document.createElement('th');
                th.className = 'group relative border border-gray-300 bg-gray-200 p-2 text-left';
                th.innerHTML = titleText;
                if (index < titleTexts.length - 1) {
                  const resizer = document.createElement('div');
                  resizer.className =
                    'resizer absolute right-0 top-0 h-full cursor-col-resize bg-black/10 hover:bg-black/30 active:w-1.5 active:bg-black/30 group-hover:w-1.5';
                  th.appendChild(resizer);
                }
                headerRow.appendChild(th);
              });

              const th = document.createElement('th');
              th.className = 'group relative border border-gray-300 bg-gray-200 p-2 text-left';
              th.innerHTML = '<p class="text-center">Controls</p>';
              headerRow.appendChild(th);

              thead.appendChild(headerRow);
              table.appendChild(thead);
              const tbody = document.createElement('tbody');
              const dataRow = document.createElement('tr');
              const empty = document.createElement('td');
              dataRow.className = 'relative';
              empty.id = `${sectionName}SectionOneListEmpty${i + 1}`;
              empty.className = 'absolute left-0 right-0';
              empty.innerHTML = `<div class="content-center text-center h-[${statsDisabled ? 500 + 132 : 500}px] font-bold text-xs text-gray-400">${dataset['listemptytexts'][i]}</div>`;
              dataRow.appendChild(empty);

              for (let j = 0; j < titleTexts.length + 1; j++) {
                const td = document.createElement('td');
                td.className = 'relative hidden border border-gray-300 p-2 h-[49px] 2xl:h-[57px]';
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
            } else {
              containsCustomContents = true;
            }

            clone.classList.remove('hidden');
            sectionOne.appendChild(clone);

            if (statsDisabled) {
              sectionOne.parentElement.nextElementSibling.classList.add(`min-h-[${530 + 132}px]`);
              sectionOne.parentElement.nextElementSibling.classList.add(`max-h-[${530 + 132}px]`);
            }
          }
        }

        function setupSectionTwo() {
          let totalSectionTwoListContainerHeight = 534;
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
                  if (searchTerm == '') {
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
                  sectionTwoContent.classList.add(`h-[${500 + 132}px]`);
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
                    customContent.className = `h-[${514 + 132}px]`;
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

function showSection(sectionName) {
  const targetSection = document.getElementById(sectionName + '-section');
  if (!targetSection) {
    return;
  }

  sharedState.sectionName = sectionName;
  sharedState.activeTab = 1;

  const sections = document.querySelectorAll('.section');
  sections.forEach((section) => {
    section.classList.add('hidden');
  });

  targetSection.classList.remove('hidden');
  updateActiveSidebar(sectionName);
  closeConfirmationModal();
  closeModal();
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
  tempModalConfirmationContainer.children[0].classList.add('2xl:max-w-xl');

  setupModalTheme('red', tempModalConfirmationContainer);

  const data = {
    title: `Are you sure? ${getEmoji('💀', 26)}`,
    subtitle:
      'Please double check or review any details you may have provided<br>before proceeding with the action stated below:<br><br><b>' +
      action.trim() +
      '</b>',
    button: {
      main: `Confirm ${getEmoji('💀')}`,
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

  modalMainBtn.onclick = callback;
  modalSubBtn.onclick = closeConfirmationModal;

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

export function closeModal() {
  if (!tempModalContainer) return;
  tempModalContainer.classList.remove('opacity-100');

  tempModalContainer.children[0].classList.add('-translate-y-6');
  tempModalContainer.children[0].classList.remove('scale-100');

  setTimeout(() => {
    if (!tempModalContainer) return;
    tempModalContainer.remove();
    tempModalContainer = null;
  }, 300);
}

export function closeConfirmationModal() {
  if (!tempModalConfirmationContainer) return;
  tempModalConfirmationContainer.classList.remove('opacity-100');

  tempModalConfirmationContainer.children[0].classList.remove('translate-y-6');
  tempModalConfirmationContainer.children[0].classList.remove('scale-100');

  setTimeout(() => {
    if (!tempModalConfirmationContainer) return;
    tempModalConfirmationContainer.remove();
    tempModalConfirmationContainer = null;
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
    },
  };

  const modalTitle = tempModalContainer.querySelector('#modalTitle');
  const modalSubtitle = tempModalContainer.querySelector('#modalSubtitle');
  const modalMainBtn = tempModalContainer.querySelector('#modalMainBtn');
  const modalSubBtn = tempModalContainer.querySelector('#modalSubBtn');

  modalTitle.innerHTML = data.title;
  modalSubtitle.innerHTML = data.subtitle;
  modalMainBtn.innerHTML = data.button.main;
  modalSubBtn.innerHTML = data.button.sub;

  if (data.subtitle != '') modalSubtitle.classList.remove('hidden');
  modalMainBtn.onclick = () => {
    if (checkIfEmpty(inputs)) return;
    callback[0](inputs);
  };
  if (data.button.sub != '') {
    modalSubBtn.classList.remove('hidden');
    modalSubBtn.onclick = callback[1];
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

        renderInput(clone, 'short', input, index);
        imageContainerInputsContainer.appendChild(clone);
      });
    } else {
      imageContainerParent.classList.remove('gap-3');
      imageContainerParent.classList.remove('2xl:gap-6');
      imageContainerParent.classList.add('grid-cols-10');
      imageContainerParent.children[0].classList.add('col-span-4');
      imageContainerParent.children[0].classList.add('col-start-4');
    }

    imageContainerParent.classList.remove('hidden');
    originalContainer.insertAdjacentElement('afterend', imageContainerParent);
  }

  setupRenderInput('short', inputs.short, 4);
  setupRenderInput('large', inputs.large, 1);

  if (inputs.spinner) {
    const type = 'spinner';
    inputs.spinner.forEach((spinnerGroup, index) => {
      const originalContainer = tempModalContainer.querySelector(`#input-${type}`).parentElement.parentElement;
      const spinnerContainer = originalContainer.cloneNode(true);
      const label = spinnerContainer.children[0];
      label.innerHTML = spinnerGroup.label + (spinnerGroup.required ? ' *' : '');
      if (spinnerGroup.locked) spinnerContainer.children[1].children[0].disabled = true;

      const selectElement = spinnerContainer.querySelector('select');
      selectElement.id = `input-${type}-${index + 1}`;

      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.innerHTML = spinnerGroup.placeholder || 'Select an option';
      placeholderOption.disabled = typeof spinnerGroup.selected == 'number' && spinnerGroup.selected == 0;
      placeholderOption.selected = true;
      selectElement.appendChild(placeholderOption);

      spinnerGroup.options.forEach((optionData, index) => {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.innerHTML = optionData.label;
        option.classList.add('font-medium');

        if (typeof spinnerGroup.selected == 'number') {
          if (index === spinnerGroup.selected - 1) {
            option.selected = true;
            placeholderOption.selected = false;
          }
        } else {
          if (option.value === spinnerGroup.selected) {
            spinnerGroup.selected = index + 1;
            option.selected = true;
            placeholderOption.selected = false;
          }
        }

        selectElement.appendChild(option);
      });

      selectElement.addEventListener('change', function () {
        spinnerGroup.selected = this.selectedIndex;
      });

      spinnerContainer.classList.remove('hidden');
      originalContainer.insertAdjacentElement('afterend', spinnerContainer);
    });
  }

  if (inputs.radio) {
    const type = 'radio';
    const originalContainer = tempModalContainer.querySelector(`#input-${type}`).parentElement;
    const radioContainer = originalContainer.cloneNode(true);
    const label = radioContainer.children[0];
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
      clone.dataset.color = clone.classList[clone.classList.length - 1].split(':')[1];
      radioClones.push(clone);
      container.appendChild(clone);
      if (index == inputs.radio[0].selected) {
        clone.classList.add(clone.dataset.color);
      }
      clone.addEventListener('click', function () {
        inputs.radio[0].selected = index;
        radioClones.forEach((radioClone) => {
          if (radioClone == clone) {
            radioClone.classList.add(radioClone.dataset.color);
          } else {
            radioClone.classList.remove(radioClone.dataset.color);
          }
        });
      });
    });

    radioContainer.classList.remove('hidden');
    originalContainer.insertAdjacentElement('afterend', radioContainer);
  }

  function setupRenderInput(type, render, offset) {
    if (render) {
      const inputId = type === 'short' ? `#input-${type}-${offset}` : `#input-${type}`;
      const originalContainer = tempModalContainer.querySelector(inputId).parentElement;
      const nextContainer = originalContainer.nextElementSibling;

      render.forEach((input, index) => {
        const clone = originalContainer.cloneNode(true);

        clone.children[1].addEventListener('input', () => {
          input.value = clone.children[1].value;
        });

        renderInput(clone, type, input, index + offset);

        clone.classList.remove('hidden');
        nextContainer.insertAdjacentElement('beforebegin', clone);
      });
    }
  }

  function renderInput(clone, type, data, index) {
    const label = clone.children[0];
    const input = clone.children[1];
    const id = `input-${type}-${index + 1}`;

    if (data.locked) {
      input.readOnly = true;
    }

    label.for = id;
    label.innerHTML = data.placeholder + (data.required ? ' *' : '');

    input.id = id;
    input.placeholder = data.placeholder;
    input.value = data.value;

    if (data.icon) input.querySelectorAll('p')[0].innerHTML = data.icon;
    if (data.title) input.querySelectorAll('p')[1].innerHTML = data.title;
    if (data.subtitle) input.querySelectorAll('p')[2].innerHTML = data.subtitle;

    input.dispatchEvent(new Event('input'));

    clone.classList.remove('hidden');
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

export function checkIfEmpty(inputs) {
  let hasEmpty = false;

  if (inputs == '') hasEmpty = true;
  if (inputs.image) inputs.image.short.forEach((item) => check(item));
  if (inputs.short) inputs.short.forEach((item) => check(item));
  if (inputs.large) inputs.large.forEach((item) => check(item));
  if (inputs.spinner) inputs.spinner.forEach((item) => check(item));

  function check(item) {
    if (item.required && !hasEmpty) {
      if (item.value == '' || item.selected == 0) {
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
  if (checkIfEmpty(findValue)) return;
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

export function createAtSectionOne(sectionName, columnsData, tabIndex, findValue, callback) {
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

  columnsData.forEach((columnData, index) => {
    const cell = index < referenceCells.length ? referenceCells[index].cloneNode(true) : document.createElement('td');
    cell.classList.remove('hidden');
    newRow.appendChild(cell);
    fillUpCell(newRow, index, cell, columnData);
  });
  const cell = referenceCells[referenceCells.length - 1].cloneNode(true);
  cell.classList.remove('hidden');
  const totalBtnsCellWidth = 180 * cell.children[0].children.length;
  cell.classList.add(`w-[${totalBtnsCellWidth}px]`);
  const btnsCellHeader = document.querySelector(
    `#${sectionName}-section-content [data-tabindex="${tabIndex}"] th:nth-child(${columnsData.length + 1})`
  );
  btnsCellHeader.style.width = `${totalBtnsCellWidth}px`;
  newRow.appendChild(cell);

  if (findValue) {
    const tableBody = emptyText.closest('tbody');
    const existingRows = Array.from(tableBody.querySelectorAll('tr:not(:first-child)'));

    for (const row of existingRows) {
      if (row.dataset.text && row.dataset.text.toLowerCase().trim() === findValue.toLowerCase().trim()) {
        callback(row, 'fail');
        return;
      }
    }
  }

  tableRow.classList.add('hidden');
  tableRow.parentElement.children[0].insertAdjacentElement('afterend', newRow);
  callback(newRow, 'success');
}

function fillUpCell(row, index, cell, data) {
  if (typeof data === 'string') {
    const lowerColumn = data.toLowerCase();

    if (lowerColumn.split('_')[0] === 'id') {
      let idValue;
      if (lowerColumn.includes('random')) {
        const randomId_A = Math.floor(100000 + Math.random() * 900000);
        const randomId_B = Math.floor(100000 + Math.random() * 900000);
        idValue = data.split('_')[1] + randomId_A + '' + randomId_B;
      } else {
        idValue = data.split('_')[1];
      }

      cell.innerHTML = idValue;
      row.dataset.id = idValue;
      return;
    }

    if (lowerColumn.split('_')[0] === 'custom') {
      if (lowerColumn.includes('date') || lowerColumn.includes('time')) {
        const type = lowerColumn.split('_')[1];
        if (lowerColumn.includes('today')) {
          if (['date', 'time', 'datetime'].includes(type)) {
            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

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
        <img src="${data.data[0] ? data.data[0] : '/src/images/client_logo.jpg'}" class="h-8 w-8 2xl:h-10 2xl:w-10 rounded-full object-cover" />
        <p>${data.data[1].includes(':://') ? data.data[1].replace(/\:\:\/\//g, ' ') : data.data[1]}</p>
      </div>
    `;

    cell.innerHTML = cellContent;
    return;
  }

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

  result.innerHTML = `
    <div class="absolute left-2 top-2">
      <div class="relative h-2 w-2">
        <div class="h-full w-full absolute scale-105 animate-ping rounded-full bg-red-500 opacity-75"></div>
        <div class="absolute h-2 w-2 rounded-full bg-red-500"></div>
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
    for (let i = 0; i < columnsData.length; i++) {
      fillUpCell(result, i, result.children[i], columnsData[i]);
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

export function deleteAllAtSectionTwo(sectionName) {
  const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
  const items = emptyText.parentElement.querySelectorAll('.section-content-list-item:not(.hidden)');
  items.forEach((item) => item.remove());
}

export function createRedDot(sectionName, type) {
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

export function encodeName(firstName, lastName) {
  return firstName + ':://' + lastName;
}

export function decodeName(name) {
  const parts = name.split(':://');
  return {
    firstName: parts[0],
    lastName: parts[1],
    fullName: `${parts[0]} ${parts[1]}`,
  };
}

export function getDateOrTimeOrBoth() {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { date, time, datetime: `${date} - ${time}` };
}

export function updateDateAndTime(sectionName) {
  if (sharedState.sectionName === sectionName) {
    const { date, time } = getDateOrTimeOrBoth();
    const headerElement = document.getElementById(`${sectionName}-section-header`)?.children[0]?.children[1]
      ?.children[0]?.children[0];

    if (headerElement) {
      headerElement.classList.add('emoji');
      headerElement.innerHTML = `${getEmoji('📆')} ${date} ${getEmoji('⌚')} ${time}`;
    }
  }
}

export function encodePrice(price) {
  if (typeof price != 'number') price = +price;
  return `₱${price.toFixed(2)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function decodePrice(price) {
  return price.replace(/[^\d.-]/g, '');
}

export function getStockStatus(quantity) {
  if (typeof quantity != 'number') quantity = +quantity;
  if (quantity === 0) return `<div class="emoji text-gray-800 font-bold">Out of Stock ${getEmoji('⚠️')}</div>`;
  if (quantity <= 10) return `<div class="emoji text-red-700 font-bold">Super Low Stock ${getEmoji('‼️')}</div>`;
  if (quantity <= 50) return `<div class="emoji text-amber-500 font-bold">Low Stock ${getEmoji('⚠️')}</div>`;
  return `<div class="emoji text-emerald-600 font-bold">High Stock ${getEmoji('✅')}</div>`;
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

export function getSelectedSpinner(spinner) {
  return spinner.selected > 0 ? spinner.options[spinner.selected - 1].value : '';
}

export default {
  sharedState,
  openModal,
  openConfirmationModal,
  closeModal,
  closeConfirmationModal,
  toast,
  isValidPaymentAmount,
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
  deleteAllAtSectionTwo,
  createRedDot,

  // checkin-daily
  encodeName,
  decodeName,
  getDateOrTimeOrBoth,
  updateDateAndTime,

  // ecommerce-stock
  encodePrice,
  decodePrice,
  getStockStatus,
  validateStockInputs,
  encodeText,
  decodeText,
  getSelectedSpinner,
};

document.addEventListener('DOMContentLoaded', function () {
  if (checkIfJsShouldNotRun('admin_main')) return;
  setupSidebar();
  showLoadingAndPreloadSections();
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
      updateProgress(sectionName);
    });

    await Promise.all(loadPromises);

    await new Promise((resolve) => setTimeout(resolve, 0));

    loadingOverlay.classList.add('opacity-0');
    setTimeout(() => {
      loadingOverlay.remove();
    }, 300);
    showSection('dashboard');
    document.dispatchEvent(new CustomEvent('ogfmsiAdminMainLoaded'));
  } catch (error) {
    console.error('Error loading sections:', error);
    loadingOverlay.classList.add('opacity-0');
    setTimeout(() => {
      loadingOverlay.remove();
    }, 300);
    showSection('dashboard');
    document.dispatchEvent(new CustomEvent('ogfmsiAdminMainLoaded'));
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
