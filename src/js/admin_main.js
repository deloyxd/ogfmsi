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
        closeAllDropDownsExcept(section);
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
        if (containsCustomContents) await loadCustomContents(`/src/html/custom/${sectionName}_content.html`);

        function setupSectionOne() {
          Array.from(sectionOne.children).forEach((el, i) => {
            if (i > 0) el.remove();
          });

          for (let i = 0; i < dataset['tabtitles'].length; i++) {
            const clone = sectionOne.children[0].cloneNode(true);
            clone.id = `${sectionName}_tab${i + 1}`;

            clone.children[0].textContent = dataset['tabtitles'][i];
            clone.children[1].children[0].textContent = dataset['subtitles'][i];
            if (dataset['sectiononesearchtext'] && i == 0) {
              sectionOne.parentElement.children[1].children[0].classList.remove('hidden');
              sectionOne.parentElement.children[1].children[0].children[0].placeholder =
                dataset['sectiononesearchtext'];
              sectionOne.parentElement.children[1].children[0].children[0].addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                const tabIndex = e.target.dataset.tabindex;
                const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
                if (emptyText) {
                  const columnCount = document.getElementById(`${sectionName}_tab${tabIndex}`).dataset.columncount;
                  const items = emptyText.parentElement.children;
                  const searchedItems = [];
                  for (let i = +columnCount + 1; i < items.length; i += columnCount) {
                    for (let j = 0; j < columnCount; j++) {
                      items[i + j].classList.add('hidden');
                      if (items[i + j].textContent.toLowerCase().includes(searchTerm)) {
                        if (!searchedItems.includes(i)) searchedItems.push(i);
                      }
                    }
                  }
                  searchedItems.forEach((i) => {
                    items[i].classList.remove('hidden');
                    items[i + 1].classList.remove('hidden');
                    items[i + 2].classList.remove('hidden');
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
              table.className = 'w-full border-collapse cursor-default';
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');
              const titleTexts = dataset['listtitletexts'][i].slice(1, -1).split('//');
              clone.dataset.columncount = titleTexts.length;
              titleTexts.forEach((titleText, index) => {
                const th = document.createElement('th');
                th.className = 'group relative border border-gray-300 bg-gray-200 p-2 text-left';
                th.textContent = titleText;
                if (index < titleTexts.length - 1) {
                  const resizer = document.createElement('div');
                  resizer.className =
                    'resizer absolute right-0 top-0 h-full cursor-col-resize bg-black/10 hover:bg-black/30 active:w-1.5 active:bg-black/30 group-hover:w-1.5';
                  th.appendChild(resizer);
                }
                headerRow.appendChild(th);
              });
              thead.appendChild(headerRow);
              table.appendChild(thead);
              const tbody = document.createElement('tbody');
              const dataRow = document.createElement('tr');
              const empty = document.createElement('td');
              dataRow.classList.add('relative');
              empty.id = `${sectionName}SectionOneListEmpty${i + 1}`;
              empty.className = 'absolute left-0 right-0';
              empty.innerHTML = `<div class="content-center text-center h-[${statsDisabled && cloneCount == 1 ? 325 + 140 : 325}px] font-bold text-gray-400">${dataset['listemptytexts'][i]}</div>`;
              dataRow.appendChild(empty);

              for (let j = 0; j < titleTexts.length; j++) {
                const td = document.createElement('td');
                td.className = 'relative hidden border border-gray-300 p-2';
                if (dataset['listitembtnids'] && j == titleTexts.length - 1) {
                  const itemBtns = document.createElement('div');
                  itemBtns.className = 'absolute top-0 bottom-0 right-0 m-2 flex gap-2';
                  const itemBtnIds = dataset['listitembtnids'][i].slice(1, -1).split('//');
                  const itemBtnTexts = dataset['listitembtntexts'][i].slice(1, -1).split('//');
                  const itemBtnColors = dataset['listitembtncolors'][i].slice(1, -1).split('//');
                  for (let k = 0; k < itemBtnIds.length; k++) {
                    const btn = document.createElement('button');
                    btn.id = itemBtnIds[k];
                    btn.textContent = itemBtnTexts[k];
                    btn.className = `rounded-lg bg-${itemBtnColors[k]}-500 px-4 py-2 text-white duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-${itemBtnColors[k]}-600 hover:shadow-lg hover:shadow-${itemBtnColors[k]}-400 active:scale-95 active:shadow-none active:translate-y-0`;
                    itemBtns.appendChild(btn);
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
          }
        }

        function setupSectionTwo() {
          if (cloneCount == 2) {
            const sectionTwoTitles = sectionTwo.children[0].children[0].children[0];
            sectionTwoTitles.children[0].textContent = dataset['sectiontwotitletexts'][0];
            sectionTwoTitles.children[1].textContent = dataset['sectiontwotitletexts'][1];
            const sectionTwoSettings = sectionTwo.children[0].children[0].children[1];

            if (dataset['sectiontwosettings'] && dataset['sectiontwosettings'] == 1) {
              sectionTwoSettings.classList.remove('hidden');
            }

            const sectionTwoContent = sectionTwo.children[0].children[1];
            const sectionTwoListContainer = document.createElement('div');
            sectionTwoListContainer.className = 'section-content-list-empty w-full rounded-lg bg-gray-200';
            let totalSectionTwoListContainerHeight = 401;
            if (dataset['sectiontwoemptylist']) {
              const sectionTwoListEmpty = document.createElement('div');
              sectionTwoListEmpty.id = `${sectionName}SectionTwoListEmpty`;
              sectionTwoListEmpty.className = 'flex h-full justify-center';
              sectionTwoListEmpty.innerHTML = `<p class="self-center text-center font-bold text-gray-400"></p>`;
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
              totalSectionTwoListContainerHeight -= 76;
              const sectionTwoSearchParent = document.createElement('div');
              sectionTwoSearchParent.className = 'relative w-full';

              const searchInput = document.createElement('input');
              searchInput.autocomplete = 'off';
              searchInput.id = `${sectionName}SectionTwoSearch`;
              searchInput.placeholder = dataset['sectiontwosearchtext'];
              searchInput.className = `section-content-search-sub border-${mainColor}-500 focus:ring-${mainColor}-500`;
              searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
                if (emptyText) {
                  const items = emptyText.parentElement.children;
                  for (let i = 2; i < items.length; i++) {
                    items[i].classList.add('hidden');
                    if (items[i].textContent.toLowerCase().includes(searchTerm)) {
                      items[i].classList.remove('hidden');
                    }
                  }
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
              totalSectionTwoListContainerHeight -= 72;
              const sectionTwoMainBtn = document.createElement('div');

              sectionTwoMainBtn.id = `${sectionName}SectionTwoMainBtn`;
              sectionTwoMainBtn.className = `section-content-submit bg-${mainColor}-500 hover:bg-${mainColor}-600 hover:shadow-${mainColor}-400 active:scale-95 active:bg-${mainColor}-700`;
              sectionTwoMainBtn.textContent = dataset['sectiontwobtntext'];

              sectionTwoContent.appendChild(sectionTwoMainBtn);
            }

            sectionTwoListContainer.classList.add(`h-[${totalSectionTwoListContainerHeight}px]`);
            sectionTwo.classList.remove('hidden');
          } else {
            if (statsDisabled) {
              sectionOne.parentElement.nextElementSibling.classList.add(`min-h-[${425 + 140}px]`);
              sectionOne.parentElement.nextElementSibling.classList.add(`max-h-[${425 + 140}px]`);
            }
            document.getElementById(`${sectionName}SectionContent`).children[0].classList.remove('2xl:col-span-8');
            document.getElementById(`${sectionName}SectionContent`).children[0].classList.add('2xl:col-span-12');
          }
        }

        async function loadCustomContents(fetchCustomHtmlFile) {
          try {
            const response = await fetch(fetchCustomHtmlFile);
            if (response.ok) {
              const html = await response.text();
              const contentParent = sectionOne.parentElement.parentElement.children[1];
              contentParent.innerHTML += html;
              const sectionTwoContent = contentParent.lastElementChild.cloneNode(true);
              contentParent.lastElementChild.remove();
              sectionTwo.children[0].children[1].children[0].appendChild(sectionTwoContent);
            }
          } catch (error) {
            console.warn(`Could not load custom content for ${sectionName}:`, error);
          }
        }

        const resizers = document.querySelectorAll('.resizer');
        let isResizing = false;
        let currentColumn;
        let startX;
        let startWidth;

        resizers.forEach((resizer) => {
          resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            currentColumn = resizer.parentElement;
            startX = e.clientX;
            startWidth = currentColumn.offsetWidth;

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
          });
        });

        function handleMouseMove(e) {
          e.preventDefault();
          if (!isResizing) return;

          const width = startWidth + e.clientX - startX;

          if (width > 50) {
            currentColumn.style.width = `${width}px`;
            currentColumn.parentElement.parentElement.style.tableLayout = 'auto';
          }
        }

        function stopResize(e) {
          e.preventDefault();

          isResizing = false;
          document.querySelectorAll('.resizer').forEach((r) => r.classList.remove('resizing'));
          document.body.style.cursor = '';
          currentColumn.parentElement.parentElement.style.tableLayout = 'fixed';

          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', stopResize);
        }
      }
    }
  }

  targetSection.classList.add('hidden');
}

async function loadComponent(componentName, element, dataset) {
  const response = await fetch(`admin_${componentName}.html`);
  const html = await response.text();
  element.innerHTML = html.replace(/\$\{(\w+)\}/g, (match, varName) =>
    dataset[varName] !== undefined ? dataset[varName] : match
  );
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

export let mainColor, subColor, btnColor;

let tempModalContainer = null;
let tempModalConfirmationContainer = null;

export function openModal(btn, inputs, ...callback) {
  const originalModalContainer = document.querySelector('#modalContainer');
  tempModalContainer = originalModalContainer.cloneNode(true);
  originalModalContainer.insertAdjacentElement('afterend', tempModalContainer);

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
  tempModalConfirmationContainer.children[0].classList.add('max-w-md');
  tempModalConfirmationContainer.children[0].classList.add('2xl:max-w-xl');

  setupModalTheme('red', tempModalConfirmationContainer);

  const data = {
    title: 'Are you sure? 💀',
    subtitle:
      'Please double check or review any details you may have provided<br>before proceeding with the action stated below:<br><br><b>' +
      action.trim() +
      '</b>',
    button: {
      main: 'Confirm 💀',
      sub: 'Cancel',
    },
  };

  const modalTitle = tempModalConfirmationContainer.querySelector('#modalTitle');
  const modalSubtitle = tempModalConfirmationContainer.querySelector('#modalSubtitle');
  const modalMainBtn = tempModalConfirmationContainer.querySelector('#modalMainBtn');
  const modalSubBtn = tempModalConfirmationContainer.querySelector('#modalSubBtn');

  modalTitle.textContent = data.title;
  modalSubtitle.innerHTML = data.subtitle;
  modalMainBtn.textContent = data.button.main;
  modalSubBtn.textContent = data.button.sub;

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
      main: inputs.footer
        ? inputs.footer.main?.trim() || defaultData.textContent.trim()
        : defaultData.textContent.trim(),
      sub: inputs.footer ? inputs.footer.sub?.trim() || '' : '',
    },
  };

  const modalTitle = tempModalContainer.querySelector('#modalTitle');
  const modalSubtitle = tempModalContainer.querySelector('#modalSubtitle');
  const modalMainBtn = tempModalContainer.querySelector('#modalMainBtn');
  const modalSubBtn = tempModalContainer.querySelector('#modalSubBtn');

  modalTitle.textContent = data.title;
  modalSubtitle.textContent = data.subtitle;
  modalMainBtn.textContent = data.button.main;
  modalSubBtn.textContent = data.button.sub;

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

    const imageContainerInputsContainer = imageContainerParent.children[1];

    inputs.image.short.forEach((input, index) => {
      const clone = imageContainerInputsContainer.children[0].cloneNode(true);

      clone.children[1].addEventListener('input', () => {
        if (inputs.image.type === 'live') imageContainerTexts[index].textContent = clone.children[1].value;
        input.value = clone.children[1].value;
      });

      renderInput(clone, 'short', input, index);
      imageContainerInputsContainer.appendChild(clone);
    });

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
      label.textContent = spinnerGroup.label;

      const selectElement = spinnerContainer.querySelector('select');
      selectElement.id = `input-${type}-${index + 1}`;

      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = spinnerGroup.placeholder || 'Select an option';
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      selectElement.appendChild(placeholderOption);

      spinnerGroup.options.forEach((optionData, index) => {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        option.classList.add('font-medium');

        if (index === spinnerGroup.selected - 1) {
          option.selected = true;
          placeholderOption.selected = false;
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
    label.textContent = inputs.radio[0].label;

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

      icon.textContent = input.icon;
      title.textContent = input.title;
      subtitle.textContent = input.subtitle;

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

    label.for = id;
    label.textContent = data.placeholder + (data.required ? ' *' : '');

    input.id = id;
    input.placeholder = data.placeholder;
    input.value = data.value;

    if (data.icon) input.querySelectorAll('p')[0].textContent = data.icon;
    if (data.title) input.querySelectorAll('p')[1].textContent = data.title;
    if (data.subtitle) input.querySelectorAll('p')[2].textContent = data.subtitle;

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

export function checkIfEmpty(inputs) {
  let hasEmpty = false;

  if (typeof inputs == 'string' && inputs.trim() === '') hasEmpty = true;
  if (inputs.image) inputs.image.short.forEach((item) => check(item));
  if (inputs.short) inputs.short.forEach((item) => check(item));
  if (inputs.large) inputs.large.forEach((item) => check(item));

  function check(item) {
    if (item.required && item.value.trim() === '' && !hasEmpty) {
      hasEmpty = true;
    }
  }

  if (hasEmpty) toast('Fill required fields first!', 'error');
  return hasEmpty;
}

export function findAtSectionOne(sectionName, findValue, findType, tabIndex, callback) {
  if (checkIfEmpty(findValue)) return;
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  const items = emptyText.parentElement.parentElement.children;
  for (let i = 1; i < items.length; i++) {
    if (findType == 'search' && items[i].dataset.id.includes(findValue)) {
      callback(items[i]);
      return;
    }
    if (findType == 'equal' && items[i].dataset.id == findValue) {
      callback(items[i]);
      return;
    }
    if (
      findType == 'pending' &&
      items[i].dataset.id == findValue &&
      items[i].dataset.time.toLowerCase().includes('pending')
    ) {
      callback(items[i]);
      return;
    }
  }
  callback(null);
}

export function findAtSectionTwo(sectionName, findValue, callback) {
  if (checkIfEmpty(findValue)) return;
  const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
  const items = emptyText.parentElement.children;
  for (let i = 2; i < items.length; i++) {
    if (items[i].dataset.id == findValue) {
      callback(items[i]);
      return;
    }
  }
  callback(null);
}

export function createAtSectionOne(sectionName, columnsData, tabIndex, findValue, callback) {
  const emptyText = document.getElementById(`${sectionName}SectionOneListEmpty${tabIndex}`);
  const tableRow = emptyText.parentElement;
  const referenceCells = Array.from(tableRow.children);
  referenceCells.shift();

  const newRow = document.createElement('tr');

  const generatedData = {};
  columnsData.forEach((columnData, index) => {
    const isLastElement = index == columnsData.length - 1;
    const cell = index < referenceCells.length ? referenceCells[index].cloneNode(true) : document.createElement('td');
    cell.classList.remove('hidden');
    newRow.appendChild(cell);

    if (typeof columnData === 'string') {
      const lowerColumn = columnData.toLowerCase();

      if (lowerColumn.split('_')[0] === 'id') {
        let idValue;
        if (lowerColumn.includes('random')) {
          const randomId_A = Math.floor(100000 + Math.random() * 900000);
          const randomId_B = Math.floor(100000 + Math.random() * 900000);
          idValue = 'U' + randomId_A + '' + randomId_B;
        } else {
          idValue = columnData.split('_')[1];
        }

        setCellContent(cell, idValue, isLastElement);
        newRow.dataset.id = idValue;
        generatedData.id = idValue;
        return;
      }

      if (lowerColumn.includes('date') || lowerColumn.includes('time')) {
        if (lowerColumn.includes('today')) {
          const type = lowerColumn.split('_')[0];
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

            setCellContent(cell, value, isLastElement);
            newRow.dataset.date = value;
            generatedData[type] = value;
            return;
          }
        }

        const value = columnData.split('_')[1];
        setCellContent(cell, value, isLastElement);
        if (lowerColumn.includes('datetime')) {
          newRow.dataset.datetime = value;
          return;
        }
        if (lowerColumn.includes('date')) newRow.dataset.date = value;
        if (lowerColumn.includes('time')) newRow.dataset.time = value;
        return;
      }

      setCellContent(cell, columnData, isLastElement);
      return;
    }

    if (columnData.type && columnData.type.toLowerCase().includes('user')) {
      const isUserIdType = columnData.type.toLowerCase().includes('id');
      const userData = columnData.data;

      if (!cell.querySelector('.flex.items-center.gap-3')) {
        cell.innerHTML = `
          <div class="flex items-center gap-3">
            <img src="${userData[0] ? userData[0] : '/src/images/client_logo.jpg'}" class="h-10 w-10 rounded-full object-cover" />
            <p>${userData[1]}</p>
          </div>
        `;
      } else {
        const img = cell.querySelector('img');
        const text = cell.querySelector('p');
        img.src = userData[0];
        text.textContent = userData[1];
      }

      newRow.dataset.image = userData[0];
      if (isUserIdType) {
        newRow.dataset.userid = userData[1];
        newRow.dataset.name = userData[2];
        newRow.dataset.contact = userData[3];
      } else {
        newRow.dataset.name = userData[1];
        newRow.dataset.contact = userData[2];
      }
      return;
    }

    if (typeof columnData === 'object') {
      setCellContent(cell, JSON.stringify(columnData), isLastElement);
      return;
    }

    setCellContent(cell, columnData, isLastElement);
  });

  if (findValue) {
    const tableBody = emptyText.closest('tbody');
    const existingRows = Array.from(tableBody.querySelectorAll('tr:not(:first-child)'));

    for (const row of existingRows) {
      if (row.dataset.name && row.dataset.name.toLowerCase().trim() === findValue.toLowerCase().trim()) {
        callback(row, 'fail');
        return;
      }
    }
  }

  emptyText.classList.add('hidden');
  tableRow.parentElement.children[0].insertAdjacentElement('afterend', newRow);
  callback(generatedData, 'success');

  function setCellContent(cell, content, isLastElement) {
    if (isLastElement) {
      cell.innerHTML += content;
    } else {
      cell.textContent = content;
    }
  }
}

export function createAtSectionTwo(sectionName, data, callback) {
  const emptyText = document.getElementById(`${sectionName}SectionTwoListEmpty`);
  const result = emptyText.nextElementSibling.cloneNode(true);
  result.classList.remove('hidden');
  emptyText.classList.add('hidden');
  emptyText.nextElementSibling.insertAdjacentElement('afterend', result);

  if (data.id) {
    if (data.id.includes('random')) {
      const randomId_A = Math.floor(100000 + Math.random() * 900000);
      const randomId_B = Math.floor(100000 + Math.random() * 900000);
      const id = 'T' + randomId_A + '' + randomId_B;
      result.dataset.id = id;
    } else {
      result.dataset.id = data.id;
    }
  }

  result.dataset.actorid = 'U288343611137';
  result.dataset.actorname = 'Jestley';
  result.dataset.actorrole = 'Admin';
  result.dataset.module = data.action.module;
  result.dataset.description = data.action.description;

  result.innerHTML = `
    <div class="absolute left-2 top-2">
      <div class="relative h-2 w-2">
        <div class="h-full w-full absolute scale-105 animate-ping rounded-full bg-red-500 opacity-75"></div>
        <div class="absolute h-2 w-2 rounded-full bg-red-500"></div>
      </div>
    </div>
    <div class="overflow-hidden text-ellipsis">
      ${result.dataset.actorid}<br>
      <small>
        ${result.dataset.actorname}<br>
        ${result.dataset.actorrole}
      </small>
    </div>
  `;

  createRedDot(sectionName, 'main');
  result.addEventListener('mouseover', function () {
    result.children[0].classList.add('hidden');
  });

  return callback(result);
}

export function deleteAtSectionOne() {}

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

export function createRedDot(sectionName, type) {
  if (typeof type === 'string' && !type.includes('section')) {
    document
      .querySelector(`.sidebar-${type}-btn[data-section="${sectionName}"]`)
      .lastElementChild.classList.remove('hidden');
    return;
  }
  if (typeof type === 'number') {
    document.getElementById(`${sectionName}_tab${type}`).lastElementChild.classList.remove('hidden');
    return;
  }
}

export default {
  sharedState,
  mainColor,
  subColor,
  btnColor,
  openModal,
  openConfirmationModal,
  closeModal,
  closeConfirmationModal,
  toast,
  checkIfEmpty,
  findAtSectionOne,
  findAtSectionTwo,
  createAtSectionOne,
  createAtSectionTwo,
  deleteAtSectionOne,
  deleteAtSectionTwo,
  createRedDot,
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
    if (progressText) progressText.textContent = `${progressPercent}%`;
    if (currentSectionText) currentSectionText.textContent = `Loading ${sectionName}...`;
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
