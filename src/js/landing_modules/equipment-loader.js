import { API_BASE_URL } from '../_global.js';

function statusBadge(status) {
  const map = {
    'All Available': 'bg-green-100 text-green-800 border-green-300',
    Warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Pending Disposal': 'bg-amber-100 text-amber-800 border-amber-300',
    'Partially Available': 'bg-blue-100 text-blue-800 border-blue-300',
    'Disposed Items': 'bg-gray-100 text-gray-800 border-gray-300',
  };
  let key = status;
  if (status.startsWith('Warning')) key = 'Warning';
  if (status.startsWith('Pending Disposal')) key = 'Pending Disposal';
  if (status.startsWith('Partially Available')) key = 'Partially Available';
  if (status.startsWith('Disposed Items')) key = 'Disposed Items';
  const cls = map[key] || 'bg-gray-100 text-gray-800 border-gray-300';
  return `<span class="inline-block text-xs px-2 py-0.5 rounded-full border ${cls}">${status}</span>`;
}

function itemStatusPill(s) {
  const cls =
    s === 'Available'
      ? 'bg-green-200 text-green-800'
      : s === 'Unavailable'
        ? 'bg-red-200 text-red-800'
        : s === 'For Disposal'
          ? 'bg-yellow-200 text-yellow-800'
          : 'bg-gray-200 text-gray-800';
  return `<span class="text-[11px] px-2 py-0.5 rounded-full ${cls}">${s}</span>`;
}

function renderEquipmentCard(equip) {
  const img = equip.image_url || '/src/images/client_logo.jpg';
  const general = equip.general_status || 'All Available';
  const uid = `equip_${equip.equipment_id}`.replace(/[^a-zA-Z0-9_\-]/g, '');
  return `
    <div class="rounded-2xl overflow-hidden bg-white border border-orange-100 shadow hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
      <div class="relative">
        <img src="${img}" alt="${equip.equipment_name}" class="w-full h-40 object-cover cursor-pointer" onclick="window.showImageModal && window.showImageModal('${img}', '${equip.equipment_name}')" />
      </div>
      <div class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="text-lg font-bold text-gray-900 dark:text-white capitalize">${equip.equipment_name}</h4>
          </div>
          <div class="text-right">
            <div class="text-sm font-semibold text-orange-600">Qty: ${equip.total_quantity ?? 0}</div>
            <div class="text-[11px] text-gray-500">${equip.equipment_type || ''}</div>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2" id="${uid}_counts">
          <div class="border rounded-lg px-3 py-2 flex items-center justify-between bg-green-50 border-green-200">
            <span class="text-xs font-medium text-green-800">Available</span>
            <span class="text-sm font-bold text-green-700" data-avail>—</span>
          </div>
          <div class="border rounded-lg px-3 py-2 flex items-center justify-between bg-red-50 border-red-200">
            <span class="text-xs font-medium text-red-800">Unavailable</span>
            <span class="text-sm font-bold text-red-700" data-unavail>—</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function fetchEquipmentList() {
  const res = await fetch(`${API_BASE_URL}/maintenance/equipment`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load equipment');
  return json.result || [];
}

async function fetchEquipmentItems(equipmentId) {
  const res = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}/items`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load items');
  return json.result || [];
}

function renderItemsInto(container, items) {
  const cols = {
    Available: [],
    Unavailable: [],
  };
  items.forEach((it) => {
    const s = it.individual_status || 'Available';
    const code = it.item_code || '';
    const card = `
      <div class="border rounded-md p-2 text-sm flex items-center justify-between bg-white dark:bg-gray-700">
        <span class="font-medium">${code}</span>
        ${itemStatusPill(s)}
      </div>
    `;
    if (s === 'Available' || s === 'Unavailable') {
      cols[s].push(card);
    }
  });

  const column = (title, colorCls, arr) => `
    <div class="flex flex-col gap-2">
      <div class="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-1 py-1">
        <p class="text-xs font-semibold ${colorCls}">${title} (${arr.length})</p>
      </div>
      ${arr.join('') || '<p class="text-xs text-gray-500">None</p>'}
    </div>
  `;

  container.innerHTML = [
    column('Available', 'text-green-700', cols['Available']),
    column('Unavailable', 'text-red-700', cols['Unavailable']),
  ].join('');
}

let __equipmentFilter = 'all'; // all | machine | non-machine

async function computeAndFillCounts(equipmentId) {
  try {
    const items = await fetchEquipmentItems(equipmentId);
    let a = 0,
      u = 0;
    items.forEach((it) => {
      if (it.individual_status === 'Available') a++;
      else if (it.individual_status === 'Unavailable') u++;
    });
    const holder = document.getElementById(`equip_${equipmentId}_counts`);
    if (holder) {
      const avail = holder.querySelector('[data-avail]');
      const unavail = holder.querySelector('[data-unavail]');
      if (avail) avail.textContent = a;
      if (unavail) unavail.textContent = u;
    }
  } catch (_) {
    const holder = document.getElementById(`equip_${equipmentId}_counts`);
    if (holder) {
      const avail = holder.querySelector('[data-avail]');
      const unavail = holder.querySelector('[data-unavail]');
      if (avail) avail.textContent = '?';
      if (unavail) unavail.textContent = '?';
    }
  }
}

async function loadAndRender() {
  const holder = document.getElementById('equipment-container');
  if (!holder) return;
  holder.innerHTML = '<h2 class="text-center text-3xl font-black text-gray-500">Updating equipments status...</h2>';
  holder.className = 'scrollbar-dark grid gap-6 p-2 grid-cols-1';
  try {
    const list = await fetchEquipmentList();
    const filtered = list.filter((e) => {
      if (__equipmentFilter === 'machine') return (e.equipment_type || '').toLowerCase() === 'machine';
      if (__equipmentFilter === 'non-machine') return (e.equipment_type || '').toLowerCase() === 'non-machine';
      return true;
    });
    holder.innerHTML = filtered.map((e) => renderEquipmentCard(e)).join('');
    // compute counts asynchronously per equipment
    filtered.forEach((e) => computeAndFillCounts(e.equipment_id));

    // set container max height so only ~8 items are visible, rest scrollable
    function applyScrollableLimit() {
      const style = window.getComputedStyle(holder);
      const template = style.getPropertyValue('grid-template-columns');
      const cols = Math.max(1, (template || '').split(' ').filter(Boolean).length);
      const firstCard = holder.firstElementChild;
      if (!firstCard) return;
      const gap = parseFloat(style.getPropertyValue('row-gap')) || 0;
      const cardHeight = firstCard.getBoundingClientRect().height;
      const rows = Math.ceil(8 / cols);
      const maxHeight = rows * cardHeight + (rows - 1) * gap;
      holder.style.maxHeight = `${Math.ceil(maxHeight) + 16}px`;
      // holder.style.overflowY = 'auto';
    }
    // after layout paints
    requestAnimationFrame(applyScrollableLimit);
    // also re-apply on resize
    window.addEventListener('resize', applyScrollableLimit, { passive: true });
    holder.className = 'scrollbar-dark grid gap-6 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  } catch (e) {
    holder.innerHTML = `<h2 class="text-center text-3xl font-black text-red-600">${e.message}</h2>`;
  }
}

// initial load and polling
function setupFilters() {
  const container = document.getElementById('equipment-filters');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    __equipmentFilter = btn.getAttribute('data-filter');
    // update active styles
    container.querySelectorAll('[data-filter]').forEach((b) => {
      if (b.getAttribute('data-filter') === __equipmentFilter) {
        b.classList.add('bg-orange-600', 'text-white');
        b.classList.remove('bg-white', 'text-orange-700', 'border-orange-300');
      } else {
        b.classList.remove('bg-orange-600', 'text-white');
        b.classList.add('bg-white', 'text-orange-700', 'border-orange-300');
      }
    });
    loadAndRender();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      setupFilters();
      loadAndRender();
      setInterval(loadAndRender, 30000);
    },
    { once: true }
  );
} else {
  setupFilters();
  loadAndRender();
  setInterval(loadAndRender, 30000);
}
