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
  handleSavePreferences();
});

function getUserPrefs() {
  try {
    return (
      JSON.parse(localStorage.getItem('ogfmsi_user_prefs')) || {
        hiddenSections: sessionStorage.getItem('systemUserRole').toLowerCase().includes('staff') ? ['maintenance-accesscontrol'] : [],
        compactSidebar: false,
        timeFormat: '12h',
        dateFormat: 'MM-DD-YYYY',
        baseFontSize: 'normal',
        rememberLast: true,
      }
    );
  } catch (_e) {
    return {
      hiddenSections: sessionStorage.getItem('systemUserRole').toLowerCase().includes('staff') ? ['maintenance-accesscontrol'] : [],
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
  panel.className = `p-2 space-y-4`;
  panel.innerHTML = `
    <section class="rounded-lg border border-gray-200 bg-white shadow-sm">
      <header class="flex items-center justify-between rounded-t-lg bg-gray-50 px-3 py-2">
        <p class="text-sm font-semibold text-gray-700">Modules visibility</p>
        <span class="text-xs text-gray-400">Toggle modules you want to show in the sidebar</span>
      </header>
      <div class="grid gap-4 p-4 sm:grid-cols-1 lg:grid-cols-1 2xl:grid-cols-2">
        ${modules
          .map(
            (m) => `
          <label class="block w-full cursor-pointer">
            <input type="checkbox" class="ogfmsi-pref-module peer sr-only text-3xl" data-key="${m.key}" ${
              prefs.hiddenSections?.includes(m.key) ? '' : 'checked'
            } />
            <div class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 min-h-[88px] transition-all hover:bg-gray-50 peer-checked:bg-gradient-to-br peer-checked:from-blue-500 peer-checked:to-white peer-checked:border-blue-500">
              <span class="text-lg font-semibold text-gray-700 peer-checked:text-gray-900 flex-1">${m.label}</span>
              <span class="relative block h-7 w-7">
                <span aria-hidden="true" class="absolute inset-0 rounded-md border-2 border-gray-300 bg-white transition-colors duration-200 peer-checked:bg-gradient-to-br peer-checked:from-blue-600 peer-checked:to-white peer-checked:border-blue-600"></span>
                <svg viewBox="0 0 24 24" class="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white opacity-0 drop-shadow peer-checked:opacity-100 transition-opacity duration-200">
                  <path fill="currentColor" d="M20.285 6.708a1 1 0 0 1 0 1.414l-9.192 9.192a1 1 0 0 1-1.414 0l-5.657-5.657a1 1 0 1 1 1.414-1.414l4.95 4.95 8.485-8.485a1 1 0 0 1 1.414 0z" />
                </svg>
              </span>
            </div>
          </label>`
          )
          .join('')}
      </div>
    </section>

    <section class="rounded-lg border border-gray-200 bg-white shadow-sm">
      <header class="flex items-center justify-between rounded-t-lg bg-gray-50 px-3 py-2">
        <p class="text-sm font-semibold text-gray-700">Display preferences</p>
        <span class="text-xs text-gray-400">Affects formatting and layout</span>
      </header>
      <div class="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" id="ogfmsi-compact-sidebar" class="h-4 w-4 rounded border-gray-300" ${
            prefs.compactSidebar ? 'checked' : ''
          } />
          Compact sidebar
        </label>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          <span class="w-28">Time format</span>
          <select id="ogfmsi-time-format" class="rounded border border-gray-300 p-1 text-sm">
            <option value="12h" ${prefs.timeFormat === '12h' ? 'selected' : ''}>12h</option>
            <option value="24h" ${prefs.timeFormat === '24h' ? 'selected' : ''}>24h</option>
          </select>
        </label>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          <span class="w-28">Date format</span>
          <select id="ogfmsi-date-format" class="rounded border border-gray-300 p-1 text-sm">
            <option value="MM-DD-YYYY" ${prefs.dateFormat === 'MM-DD-YYYY' ? 'selected' : ''}>MM-DD-YYYY</option>
            <option value="DD-MM-YYYY" ${prefs.dateFormat === 'DD-MM-YYYY' ? 'selected' : ''}>DD-MM-YYYY</option>
          </select>
        </label>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          <span class="w-28">Base font</span>
          <select id="ogfmsi-base-font" class="rounded border border-gray-300 p-1 text-sm">
            <option value="small" ${prefs.baseFontSize === 'small' ? 'selected' : ''}>Small</option>
            <option value="normal" ${prefs.baseFontSize === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="large" ${prefs.baseFontSize === 'large' ? 'selected' : ''}>Large</option>
          </select>
        </label>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" id="ogfmsi-remember-last" class="h-4 w-4 rounded border-gray-300" ${
            prefs.rememberLast ? 'checked' : ''
          } />
          Remember last opened section
        </label>
      </div>
    </section>
  `;

  // Insert at top of custom content area
  sectionRoot.insertAdjacentElement('afterbegin', panel);
}

function handleSavePreferences() {
  const panel = document.getElementById('userPreferencesPanel');
  if (!panel) {
    return;
  }

  const checkboxes = Array.from(panel.querySelectorAll('.ogfmsi-pref-module'));
  const hiddenSections = checkboxes
    .filter((cb) => !cb.checked)
    .map((cb) => cb.dataset.key)
    .filter((key) => key !== 'settings' && key !== 'dashboard');
    if (sessionStorage.getItem('systemUserRole') && sessionStorage.getItem('systemUserRole').toLowerCase().includes('staff')) hiddenSections.push('maintenance-accesscontrol');

  const compactSidebar = !!panel.querySelector('#ogfmsi-compact-sidebar')?.checked;
  const timeFormat = panel.querySelector('#ogfmsi-time-format')?.value || '12h';
  const dateFormat = panel.querySelector('#ogfmsi-date-format')?.value || 'MM-DD-YYYY';
  const baseFontSize = panel.querySelector('#ogfmsi-base-font')?.value || 'normal';
  const rememberLast = !!panel.querySelector('#ogfmsi-remember-last')?.checked;

  setUserPrefs({ hiddenSections, compactSidebar, timeFormat, dateFormat, baseFontSize, rememberLast });

  document.dispatchEvent(new CustomEvent('ogfmsiPreferencesUpdated'));
}
