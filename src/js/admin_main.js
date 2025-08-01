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

function showSection(sectionName) {
  const sections = document.querySelectorAll('.section');
  sections.forEach((section) => {
    section.classList.add('hidden');
  });

  const targetSection = document.getElementById(sectionName + '-section');
  if (!targetSection) {
    alert("There's no section with that id!");
    return;
  }

  const [mainColor, subColor, btnColor] = targetSection.dataset.color.split('-');
  const baseDataset = { sectionName, mainColor, subColor, btnColor };

  const components = [
    {
      name: 'header',
      fields: ['title', 'subtitle', 'middletext', 'mainbtntext', 'subbtntext'],
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

  components.forEach(async ({ name, fields }) => {
    const element = document.getElementById(`${sectionName}-section-${name}`);
    if (element) {
      const dataset = { ...baseDataset };
      let totalClones = 0;
      fields.forEach((field) => {
        if (name.includes('content') && field.includes('sectioncount')) totalClones = element.dataset[field];
        const fieldValues = element.dataset[field];
        if (fieldValues && fieldValues.includes(':')) {
          if (totalClones == 0) totalClones = fieldValues.split(':').length;
          dataset[field] = [];
          fieldValues.split(':').forEach((datasetField) => {
            dataset[field].push(datasetField);
          });
          return;
        }
        dataset[field] = fieldValues?.trim() || '';
      });

      await loadComponent(name, element, dataset);
      if (name.includes('stats')) {
        loadStats();
      }
      if (name.includes('content')) {
        loadContent();
      }

      function loadStats() {
        const original = document.getElementById('sectionStats');
        Array.from(original.parentElement.children).forEach((el, i) => {
          if (i > 0) el.remove();
        });
        original.parentElement.classList.add(`lg:grid-cols-${totalClones}`);
        for (let i = 0; i < totalClones; i++) {
          const clone = original.cloneNode(true);

          const statsTexts = clone.children[1];
          fields.forEach((field) => {
            switch (field) {
              case 'toggles':
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
        const sectionTwo = document.getElementById('sectionContent').children[1];
        setupSectionOne();
        setupSectionTwo();
        await loadCustomContents(`${sectionName}_content.html`);
        document.dispatchEvent(new CustomEvent('ogfmsiAdminMainLoaded'));

        function setupSectionOne() {
          Array.from(sectionOne.children).forEach((el, i) => {
            if (i > 0) el.remove();
          });

          for (let i = 0; i < dataset['tabtitles'].length; i++) {
            const clone = sectionOne.children[0].cloneNode(true);
            clone.id = `${sectionName}_tab${i + 1}`;

            clone.children[0].textContent = dataset['tabtitles'][i];
            clone.children[1].children[0].textContent = dataset['subtitles'][i];
            if (dataset['sectiononesearchtext']) {
              sectionOne.parentElement.children[1].children[0].classList.remove('hidden');
              sectionOne.parentElement.children[1].children[0].children[0].placeholder =
                dataset['sectiononesearchtext'];
            }
            if (dataset['sectiononesettings'] == 1)
              sectionOne.parentElement.children[1].children[1].classList.remove('hidden');
            if (dataset['listtitletexts'][i] != '[]') {
              const tableParent = document.createElement('div');
              tableParent.dataset.sectionindex = 1;
              tableParent.dataset.tabindex = i + 1;
              const table = document.createElement('table');
              table.className = 'w-full border-collapse cursor-default hidden';
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');
              const titleTexts = dataset['listtitletexts'][i].slice(1, -1).split('//');
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

              for (let j = 0; j < titleTexts.length; j++) {
                const td = document.createElement('td');
                td.className = 'relative border border-gray-300 px-2 py-4';
                td.textContent = 'Sample text';
                if (dataset['listitembtnids'] && j == titleTexts.length - 1) {
                  const itemBtns = document.createElement('div');
                  itemBtns.className = 'absolute top-0 right-0 m-2 flex gap-2';
                  const itemBtnIds = dataset['listitembtnids'][i].slice(1, -1).split('//');
                  const itemBtnTexts = dataset['listitembtntexts'][i].slice(1, -1).split('//');
                  const itemBtnColors = dataset['listitembtncolors'][i].slice(1, -1).split('//');
                  for (let k = 0; k < itemBtnIds.length; k++) {
                    const btn = document.createElement('button');
                    btn.id = itemBtnIds[k];
                    btn.textContent = itemBtnTexts[k];
                    btn.className = `rounded-lg bg-${itemBtnColors[k]}-500 px-4 py-2 text-white duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-${itemBtnColors[k]}-600 hover:shadow-lg hover:shadow-${itemBtnColors[k]}-400 active:scale-95 active:shadow-none`;
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
            }

            clone.classList.remove('hidden');
            sectionOne.appendChild(clone);
          }
        }

        function setupSectionTwo() {
          if (totalClones == 2) {
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
              sectionTwoListEmpty.innerHTML = `
                  <p class="self-center">${dataset['sectiontwoemptylist']}</p>
              `;
              sectionTwoListContainer.appendChild(sectionTwoListEmpty);

              const sectionTwoListItem = document.createElement('p');
              sectionTwoListItem.className = 'section-content-list-item hidden';
              sectionTwoListContainer.appendChild(sectionTwoListItem);
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
          }
        }

        async function loadCustomContents(fetchCustomHtmlFile) {
          const response = await fetch(fetchCustomHtmlFile);
          const html = await response.text();
          const contentParent = sectionOne.parentElement.parentElement.children[1];
          contentParent.innerHTML += html;
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
  });

  async function loadComponent(componentName, element, dataset) {
    const response = await fetch(`${componentName}.html`);
    const html = await response.text();
    element.innerHTML = html.replace(/\$\{(\w+)\}/g, (match, varName) =>
      dataset[varName] !== undefined ? dataset[varName] : match
    );
  }

  targetSection.classList.remove('hidden');

  updateActiveSidebar(sectionName);
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

    tempModalContainer.children[0].classList.add('translate-y-6');
    tempModalContainer.children[0].classList.add('scale-100');
  }, 0);
}

export function openConfirmationModal(action, callback) {
  const originalModalContainer = document.querySelector('#modalContainer');
  tempModalConfirmationContainer = originalModalContainer.cloneNode(true);
  originalModalContainer.insertAdjacentElement('afterend', tempModalConfirmationContainer);

  setupModalTheme('red', tempModalConfirmationContainer);

  const data = {
    title: 'Are you sure? 💀',
    subtitle:
      'Please double check or review any details you may have provided<br>before confirming to proceed with the action:<br><br><b>' +
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

  tempModalContainer.children[0].classList.remove('translate-y-6');
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
  let data;
  if (typeof defaultData === 'string') {
    const splitData = defaultData.split('//');
    data = {
      title: splitData[1],
      subtitle: splitData[2],
      button: {
        main: splitData[3],
        sub: splitData.length > 4 ? splitData[4] : '',
      },
    };
  } else {
    data = {
      title: defaultData.dataset.title.trim(),
      subtitle: defaultData.dataset.subtitle?.trim() || '',
      button: {
        main: defaultData.dataset.main?.trim() || defaultData.textContent.trim(),
        sub: defaultData.dataset.sub?.trim() || '',
      },
    };
  }

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
    if (inputs.image.type === 'live') imageBlurContainer.classList.remove('hidden');
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

      renderInput(clone, 'short', input, index + 1);
      imageContainerInputsContainer.appendChild(clone);
    });

    imageContainerParent.classList.remove('hidden');
    originalContainer.insertAdjacentElement('afterend', imageContainerParent);
  }

  setupRenderInput('short', inputs.short, 4);
  setupRenderInput('large', inputs.large, 1);

  if (inputs.radio) {
    const type = 'radio';
    const originalContainer = tempModalContainer.querySelector(`#input-${type}`).parentElement;
    const radioContainer = originalContainer.cloneNode(true);
    const label = radioContainer.children[0];
    label.textContent = inputs.radio_label;

    const container = radioContainer.children[1];
    container.id = `input-${type}-1`;
    container.classList.add(`grid-cols-${inputs.radio.length}`);

    inputs.radio.forEach((input) => {
      const clone = container.children[0].cloneNode(true);

      const icon = clone.children[0];
      const title = clone.children[1];
      const subtitle = clone.children[2];

      icon.textContent = input.icon;
      title.textContent = input.title;
      subtitle.textContent = input.subtitle;

      clone.classList.remove('hidden');
      container.appendChild(clone);
    });

    radioContainer.classList.remove('hidden');
    originalContainer.insertAdjacentElement('afterend', radioContainer);
  }

  function setupRenderInput(type, render, offset) {
    if (render) {
      const originalContainer = tempModalContainer.querySelector(`#input-${type}`).parentElement;

      render.forEach((input, index) => {
        const clone = originalContainer.cloneNode(true);

        clone.children[1].addEventListener('input', () => {
          input.value = clone.children[1].value;
        });

        renderInput(clone, type, input, index + offset);

        clone.classList.remove('hidden');
        originalContainer.insertAdjacentElement('afterend', clone);
      });
    }
  }

  function renderInput(clone, type, data, index) {
    const label = clone.children[0];
    const input = clone.children[1];
    const id = `input-${type}-${index}`;

    label.for = id;
    label.textContent = data.placeholder;

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
    stopOnFocus: true,
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

  function check(item) {
    if (item.required && item.value.trim() === '' && !hasEmpty) {
      hasEmpty = true;
    }
  }
  if (inputs.image) inputs.image.short.forEach((item) => check(item));
  if (inputs.short) inputs.short.forEach((item) => check(item));
  if (inputs.large) inputs.large.forEach((item) => check(item));

  if (hasEmpty) toast('Fill required fields first!', 'error');
  return hasEmpty;
}

export default {
  mainColor,
  subColor,
  btnColor,
  openModal,
  openConfirmationModal,
  closeModal,
  closeConfirmationModal,
  toast,
  checkIfEmpty,
};

document.addEventListener('DOMContentLoaded', function () {
  if (checkIfJsShouldNotRun('admin_main')) return;
  setupSidebar();
  showSection('dashboard');
});
