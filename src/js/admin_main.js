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
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }

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
    const originalContainer = tempModalContainer.querySelector('#input-image').parentElement.parentElement;
    const imageContainerParent = originalContainer.cloneNode(true);
    const imageContainerTexts = imageContainerParent.children[0].lastElementChild.children;
    const imageContainer = imageContainerParent.children[0].children[1];
    imageContainer.src = inputs.image.src;

    const imageBlurContainer = imageContainerParent.children[0].children[2];
    if (inputs.image.type === 'live') imageBlurContainer.classList.remove('hidden');
    const imageUploadInput = imageContainerParent.children[0].children[3];
    const imageUploadBtn = imageContainerParent.children[0].children[4];
    imageUploadBtn.onclick = () => imageUploadInput.click();

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
