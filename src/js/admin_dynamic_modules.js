loadDynamicSidebar();
loadDynamicModal();

async function loadDynamicSidebar() {
  const sections = document.querySelectorAll('.section');
  const ul = document.createElement('ul');
  ul.className = 'space-y-2 px-4';

  sections.forEach((section) => {
    const sectionId = section.id;
    const sectionName = sectionId.split('-section')[0];
    const sectionIcons = (section.dataset.icons += '::').split('::');
    const nestedSections = sectionName.split('-');
    const nestedSectionTexts = section.dataset.sectiontexts ? (section.dataset.sectiontexts += '::').split('::') : '';

    let currentLi = document.querySelector(`.sidebar-main-btn[data-section="${nestedSections[0]}"]`)?.closest('li');
    let mainBtn;

    if (!currentLi) {
      currentLi = document.createElement('li');
      mainBtn = document.createElement('button');
      mainBtn.className = 'sidebar-main-btn';
      mainBtn.dataset.section = nestedSections[0];
      if (nestedSections.length > 1) mainBtn.dataset.type = 'dropdown';
      mainBtn.innerHTML = `
        ${nestedSections.length > 1 ? `<div class"flex items-center">` : ``}
        <i class="fas ${sectionIcons[0]} mr-3"></i>
        ${nestedSectionTexts != '' ? nestedSectionTexts[0] : nestedSections[0].charAt(0).toUpperCase() + nestedSections[0].slice(1)}
        ${nestedSections.length > 1 ? `</div><i class="fas fa-chevron-down duration-300" id="${nestedSections[0]}-arrow"></i>` : ``}
        <div class="absolute right-2 top-2 hidden">
            <div class="relative h-2 w-2">
                <div class="full absolute scale-105 animate-ping rounded-full bg-red-500 opacity-75"></div>
                <div class="absolute h-2 w-2 rounded-full bg-red-500"></div>
            </div>
        </div>
      `;
      currentLi.appendChild(mainBtn);
      ul.appendChild(currentLi);
    }

    if (nestedSections.length > 1) {
      mainBtn.classList.add('justify-between');
      let currentParentBtn = currentLi.querySelector('.sidebar-main-btn');
      let currentContainer = currentParentBtn.querySelector('ul');

      if (!currentContainer) {
        currentContainer = document.createElement('ul');
        currentContainer.className = 'ml-4 mt-2 hidden space-y-1';
        currentContainer.id = `${nestedSections[0]}-dropdown`;
        currentLi.appendChild(currentContainer);
      }

      for (let i = 1; i < nestedSections.length; i++) {
        const currentPath = nestedSections.slice(0, i + 1).join('-');
        let subLi = currentContainer.querySelector(`.sidebar-sub-btn[data-section="${currentPath}"]`)?.closest('li');

        if (!subLi) {
          subLi = document.createElement('li');
          const subBtn = document.createElement('button');
          subBtn.className = 'sidebar-sub-btn';
          subBtn.dataset.section = currentPath;
          subBtn.innerHTML = `
            <i class="fas ${sectionIcons[i]} mr-3"></i>
            ${nestedSectionTexts != '' ? nestedSectionTexts[i] : nestedSections[i].charAt(0).toUpperCase() + nestedSections[i].slice(1)}
            <div class="absolute right-2 top-2 hidden">
                <div class="relative h-2 w-2">
                    <div class="full absolute scale-105 animate-ping rounded-full bg-red-500 opacity-75"></div>
                    <div class="absolute h-2 w-2 rounded-full bg-red-500"></div>
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
}

async function loadDynamicModal() {
  const response = await fetch('admin_modal.html');
  const html = await response.text();
  document.getElementById('admin_modal').innerHTML = html;
}
