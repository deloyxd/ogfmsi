import main from '../admin_main.js';

// default codes:
let mainBtn, subBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName != 'settings') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', handleSavePreferences);
  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  // subBtn can be used for future actions
  subBtn.addEventListener('click', () => {});

  renderPreferencesUI();
});

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

function setUserPrefs(prefs) {
  localStorage.setItem('ogfmsi_user_prefs', JSON.stringify(prefs));
}

function renderPreferencesUI() {
  const sectionRoot =
    document.getElementById('settingsPreferencesContent') || document.getElementById('settings-section-content');
  if (!sectionRoot) return;

  const existing = document.getElementById('userPreferencesPanel');
  if (existing) existing.remove();

  const mainButtons = Array.from(document.querySelectorAll('.sidebar-main-btn'));
  const modules = mainButtons
    .map((btn) => {
      const key = btn.dataset.section;
      const labelEl = btn.querySelector('p');
      const label = labelEl ? labelEl.textContent.trim() : key;
      if (key === 'settings' || key === 'dashboard') return null;
      return { key, label };
    })
    .filter(Boolean);

  const prefs = getUserPrefs();

  const panel = document.createElement('div');
  panel.id = 'userPreferencesPanel';
  panel.className = `p-2`;
  panel.innerHTML = `
    <div class="mb-5 flex items-center justify-between gap-2 font-bold">
      <div class="flex flex-col gap-1">
        <p class="text-base font-bold">User Preferences</p>
        <p class="text-xs text-gray-500">Choose modules and basic options</p>
      </div>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
      ${modules
        .map(
          (m) => `
        <label class="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
          <input type="checkbox" class="ogfmsi-pref-module" data-key="${m.key}" ${
            prefs.hiddenSections?.includes(m.key) ? '' : 'checked'
          } />
          <span class="text-sm">${m.label}</span>
        </label>`
        )
        .join('')}
    </div>
    <div class="mt-4 grid gap-3 lg:grid-cols-3">
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" id="ogfmsi-compact-sidebar" ${prefs.compactSidebar ? 'checked' : ''} />
        Compact sidebar
      </label>
      <label class="flex items-center gap-2 text-sm">
        <span class="w-28">Time format</span>
        <select id="ogfmsi-time-format" class="rounded border border-gray-300 p-1 text-sm">
          <option value="12h" ${prefs.timeFormat === '12h' ? 'selected' : ''}>12h</option>
          <option value="24h" ${prefs.timeFormat === '24h' ? 'selected' : ''}>24h</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <span class="w-28">Date format</span>
        <select id="ogfmsi-date-format" class="rounded border border-gray-300 p-1 text-sm">
          <option value="MM-DD-YYYY" ${prefs.dateFormat === 'MM-DD-YYYY' ? 'selected' : ''}>MM-DD-YYYY</option>
          <option value="DD-MM-YYYY" ${prefs.dateFormat === 'DD-MM-YYYY' ? 'selected' : ''}>DD-MM-YYYY</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <span class="w-28">Base font</span>
        <select id="ogfmsi-base-font" class="rounded border border-gray-300 p-1 text-sm">
          <option value="normal" ${prefs.baseFontSize === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="large" ${prefs.baseFontSize === 'large' ? 'selected' : ''}>Large</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" id="ogfmsi-remember-last" ${prefs.rememberLast ? 'checked' : ''} />
        Remember last opened section/tab
      </label>
    </div>
  `;

  // Insert at top of custom content area
  sectionRoot.insertAdjacentElement('afterbegin', panel);
}

function handleSavePreferences() {
  const panel = document.getElementById('userPreferencesPanel');
  if (!panel) {
    main.toast('Nothing to save.', 'info');
    return;
  }

  const checkboxes = Array.from(panel.querySelectorAll('.ogfmsi-pref-module'));
  const hiddenSections = checkboxes
    .filter((cb) => !cb.checked)
    .map((cb) => cb.dataset.key)
    .filter((key) => key !== 'settings' && key !== 'dashboard');

  const compactSidebar = !!panel.querySelector('#ogfmsi-compact-sidebar')?.checked;
  const timeFormat = panel.querySelector('#ogfmsi-time-format')?.value || '12h';
  const dateFormat = panel.querySelector('#ogfmsi-date-format')?.value || 'MM-DD-YYYY';
  const baseFontSize = panel.querySelector('#ogfmsi-base-font')?.value || 'normal';
  const rememberLast = !!panel.querySelector('#ogfmsi-remember-last')?.checked;

  setUserPrefs({ hiddenSections, compactSidebar, timeFormat, dateFormat, baseFontSize, rememberLast });

  document.dispatchEvent(new CustomEvent('ogfmsiPreferencesUpdated'));

  main.toast('Settings saved!', 'success');
}
