import main from '../admin_main.js';
import { API_BASE_URL } from '../_global.js';
import { CATEGORIES } from './ecommerce_stock.js';
import { db } from '../firebase.js';
import { collection, onSnapshot, query } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const SECTION_NAME = 'maintenance-datacontrol';
const MODULE_NAME = 'Data Control';

const MONTHLY_PRICES = { regular: 950, student: 850 };
const CACHE_TTL_MS = 60 * 1000;
const customerCache = new Map();
const tabCacheMem = { 1: null, 2: null, 3: null };

const FILTER_CATEGORIES = [
  {
    tab: 1,
    filter: [
      { label: 'Status: Active', value: 'status-active' },
      { label: 'Status: Pending', value: 'status-pending' },
      { label: 'Status: Incoming', value: 'status-incoming' },
      { label: 'Rate: Regular', value: 'rate-regular' },
      { label: 'Rate: Student', value: 'rate-student' },
    ],
  },
  {
    tab: 2,
    filter: [
      { label: 'Type: Daily', value: 'type-daily' },
      { label: 'Type: Monthly', value: 'type-monthly' },
      { label: 'Rate: Regular', value: 'rate-regular' },
      { label: 'Rate: Student', value: 'rate-student' },
    ],
  },
  {
    tab: 3,
    filter: [
      { label: 'Stock: In Stock (> 0)', value: 'stock-in' },
      { label: 'Stock: Out of Stock (0)', value: 'stock-out' },
      { label: 'Expiration: With Date', value: 'exp-has' },
      { label: 'Expiration: No Expiration', value: 'exp-none' },
    ],
  },
  {
    tab: 4,
    filter: [
      { label: 'Type: Basketball', value: 'type-basketball' },
      { label: 'Type: Zumba', value: 'type-zumba' },
      { label: 'Type: Others', value: 'type-others' },
    ],
  },
];

const tabFilterState = {
  1: 'all',
  2: 'all',
  3: 'all',
  4: 'all',
};

// When a new tab becomes active in this section, rebuild and apply the filter
document.addEventListener('newTab', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;
  const activeTab = main.sharedState.activeTab || 1;
  setupFilter(activeTab);
  filterDataForTab(activeTab);
});

let activated = false,
  mainBtn,
  subBtn,
  currentTab = 1,
  tableData = {
    monthlyUsers: [],
    regularUsers: [],
    students: [],
    supplements: [],
    reservations: [],
  };

let lastLoadedTab = null,
  lastLoadedAt = 0;

let reservationsUnsubscribe = null;
let reservationsLoadedOnce = false;

// Initialize module when admin main is loaded
document.addEventListener('ogfmsiAdminMainLoaded', async function () {
  if (main.sharedState.sectionName != SECTION_NAME) return;

  if (!activated) {
    activated = true;

    mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
    mainBtn.addEventListener('click', mainBtnFunction);
    subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
    subBtn.classList.remove('hidden');
    subBtn.addEventListener('click', subBtnFunction);

    setupTabSwitching();
    setupRefreshFunctionality();
    setupFilter(1);
    await loadTabData(1);
  }
});

// Attach click listeners to all tabs
function setupTabSwitching() {
  for (let i = 1; i <= 4; i++) {
    const tab = document.getElementById(`${SECTION_NAME}_tab${i}`);
    if (tab) {
      tab.addEventListener('click', () => switchToTab(i));
    }
  }
}

// Configure refresh button in settings
function setupRefreshFunctionality() {
  const settingsBtn = document.querySelector(`#${SECTION_NAME}SectionOneSettings`);
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      main.openConfirmationModal('Refresh current tab data?<br><br>This will reload all data from the server.', () => {
        loadTabData(currentTab, true);
        main.closeConfirmationModal();
      });
    });
  }
}

// Switch to specified tab and load its data
async function switchToTab(tabIndex) {
  currentTab = tabIndex;

  document.querySelectorAll(`[id^="${SECTION_NAME}_tab"]`).forEach((tab) => {
    tab.classList.remove('bg-gray-300', 'text-gray-800');
    tab.classList.add('bg-gray-200', 'text-gray-600');
  });

  const activeTab = document.getElementById(`${SECTION_NAME}_tab${tabIndex}`);
  if (activeTab) {
    activeTab.classList.remove('bg-gray-200', 'text-gray-600');
    activeTab.classList.add('bg-gray-300', 'text-gray-800');
  }

  // Reset filter state for this tab to 'all' when switching
  tabFilterState[tabIndex] = 'all';
  setupFilter(tabIndex);
  await loadTabData(tabIndex);
  await filterDataForTab(tabIndex, 'all');
}

// Load data for specified tab with throttle guard
async function loadTabData(tabIndex, force = false) {
  try {
    const now = Date.now();
    if (tabIndex === lastLoadedTab && now - lastLoadedAt < 500) {
      return;
    }
    lastLoadedTab = tabIndex;
    lastLoadedAt = now;
    const cached = getTabCache(tabIndex) || tabCacheMem[tabIndex];
    const useCache = !!cached && !force;
    if (!useCache) main.showGlobalLoading();

    // Ensure Reservations listener is disabled when leaving Reservations tab (now tab 4)
    if (tabIndex !== 4 && typeof reservationsUnsubscribe === 'function') {
      try {
        reservationsUnsubscribe();
      } catch (_) {}
      reservationsUnsubscribe = null;
      main.deleteAllAtSectionOne(SECTION_NAME, 4);
    }

    if (useCache) {
      renderFromCache(tabIndex, cached);
      // backgroundRefresh(tabIndex).catch(() => {});
    } else {
      switch (tabIndex) {
        case 1:
          await loadMonthlyUsers();
          break;
        case 2:
          await loadRegularUsers();
          break;
        case 3:
          await loadSupplements();
          break;
        case 4:
          await loadReservations();
          break;
      }
    }
  } catch (error) {
    console.error(`Error loading tab ${tabIndex} data:`, error);
    main.toast(`Error loading data for tab ${tabIndex}`, 'error');
  } finally {
    try {
      main.hideGlobalLoading();
    } catch (_) {}
  }
}

function dataSignature(rows) {
  try {
    return JSON.stringify(rows).length;
  } catch (_) {
    return 0;
  }
}

function renderFromCache(tabIndex, rows) {
  try {
    if (tabIndex === 1) {
      main.deleteAllAtSectionOne(SECTION_NAME, 1, () => {
        rows.forEach((entry) => {
          const existing = document
            .querySelector(`#${SECTION_NAME}SectionOneListEmpty1`)
            ?.parentElement?.parentElement?.querySelector(`[data-id="${entry._id}"]`);
          if (existing) return;
          main.createAtSectionOne(SECTION_NAME, entry.columnsData, 1, () => {});
        });
      });
    } else if (tabIndex === 2) {
      main.deleteAllAtSectionOne(SECTION_NAME, 2, () => {
        rows.forEach((entry) => {
          const existing = document
            .querySelector(`#${SECTION_NAME}SectionOneListEmpty2`)
            ?.parentElement?.parentElement?.querySelector(`[data-id="${entry._id}"]`);
          if (existing) return;
          main.createAtSectionOne(SECTION_NAME, entry.columnsData, 2, () => {});
        });
      });
    } else if (tabIndex === 3) {
      main.deleteAllAtSectionOne(SECTION_NAME, 3, () => {
        rows.forEach((entry) => {
          const existing = document
            .querySelector(`#${SECTION_NAME}SectionOneListEmpty3`)
            ?.parentElement?.parentElement?.querySelector(`[data-id="${entry._id}"]`);
          if (existing) return;
          main.createAtSectionOne(SECTION_NAME, entry.columnsData, 3, () => {});
        });
      });
    }
  } catch (_) {}
}

async function backgroundRefresh(tabIndex) {
  switch (tabIndex) {
    case 1:
      await loadMonthlyUsers();
      break;
    case 2:
      await loadRegularUsers();
      break;
    case 3:
      await loadSupplements();
      break;
    case 4:
      await loadReservations();
      break;
  }
}

async function filterDataForTab(tabIndex, selectedFilter) {
  if (!FILTER_CATEGORIES.find((t) => t.tab === tabIndex)) return;

  const select = document.getElementById(`${SECTION_NAME}CategoryFilter`);
  if (!selectedFilter) {
    selectedFilter = tabFilterState[tabIndex] || 'all';
    if (select) {
      if (selectedFilter === 'all') select.selectedIndex = 0;
      else select.value = selectedFilter;
    }
  }

  tabFilterState[tabIndex] = selectedFilter || 'all';

  const baseRows = getTabCache(tabIndex) || tabCacheMem[tabIndex];
  if (!baseRows || !Array.isArray(baseRows) || baseRows.length === 0) {
    await loadTabData(tabIndex, true);
    return;
  }

  let rowsToRender = baseRows;
  if (selectedFilter && selectedFilter !== 'all') {
    rowsToRender = baseRows.filter((entry) => {
      const cols = entry.columnsData || [];
      const valLower = (s) => String(s || '').toLowerCase();

      if (tabIndex === 1) {
        if (selectedFilter.startsWith('status-')) {
          const status = valLower(cols[3]);
          if (selectedFilter === 'status-active') return status.includes('active');
          if (selectedFilter === 'status-pending') return status.includes('pending');
          if (selectedFilter === 'status-incoming') return status.includes('incoming');
        }
        if (selectedFilter.startsWith('rate-')) {
          const rate = valLower(cols[6]);
          if (selectedFilter === 'rate-regular') return rate.includes('regular');
          if (selectedFilter === 'rate-student') return rate.includes('student');
        }
        return true;
      }

      if (tabIndex === 2) {
        if (selectedFilter.startsWith('type-')) {
          const type = valLower(cols[1]);
          if (selectedFilter === 'type-daily') return type.includes('daily');
          if (selectedFilter === 'type-monthly') return type.includes('monthly');
        }
        if (selectedFilter.startsWith('rate-')) {
          const rate = valLower(cols[4]);
          if (selectedFilter === 'rate-regular') return rate.includes('regular');
          if (selectedFilter === 'rate-student') return rate.includes('student');
        }
        return true;
      }

      if (tabIndex === 3) {
        if (selectedFilter.startsWith('stock-')) {
          const qty = Number(cols[2] || 0) || 0;
          if (selectedFilter === 'stock-in') return qty > 0;
          if (selectedFilter === 'stock-out') return qty === 0;
        }
        if (selectedFilter.startsWith('exp-')) {
          const expText = valLower(cols[6]);
          if (selectedFilter === 'exp-has') return !expText.includes('no expiration');
          if (selectedFilter === 'exp-none') return expText.includes('no expiration');
        }
        return true;
      }

      if (tabIndex === 4) {
        if (selectedFilter.startsWith('type-')) {
          const typeText = valLower(cols[1]);
          if (selectedFilter === 'type-basketball') return typeText.includes('basketball');
          if (selectedFilter === 'type-zumba') return typeText.includes('zumba');
          if (selectedFilter === 'type-others') return !typeText.includes('basketball') && !typeText.includes('zumba');
        }
        return true;
      }

      return true;
    });
  }

  main.deleteAllAtSectionOne(SECTION_NAME, tabIndex, () => {
    rowsToRender.forEach((entry) => {
      const existing = document
        .querySelector(`#${SECTION_NAME}SectionOneListEmpty${tabIndex}`)
        ?.parentElement?.parentElement?.querySelector(`[data-id="${entry._id}"]`);
      if (existing) return;

      main.createAtSectionOne(SECTION_NAME, entry.columnsData, tabIndex, (createResult) => {
        if (tabIndex === 1) {
          setupRowEditing(createResult, 'monthly', { customer_id: entry._id });
        } else if (tabIndex === 2) {
          setupRowEditing(createResult, 'regular', {});
        } else if (tabIndex === 3) {
          createResult.dataset.id = entry._id;
          setupRowEditing(createResult, 'supplement', {});
        } else if (tabIndex === 4) {
          setupRowEditing(createResult, 'reservation', {});
        }
      });
    });
  });
}

function setupFilter(tabNumber = 1) {
  const searchInput = document.getElementById(`${SECTION_NAME}SectionOneSearch`);
  if (!searchInput) return;

  const checkSelect = document.getElementById(`${SECTION_NAME}CategoryFilter`);
  const select = checkSelect ? checkSelect : document.createElement('select');
  if (!checkSelect) {
    select.id = `${SECTION_NAME}CategoryFilter`;
    select.className =
      'rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ml-2';

    select.addEventListener('change', (e) => {
      const activeTab = main.sharedState.activeTab || currentTab || 1;
      filterDataForTab(activeTab, e.target.value || 'all');
    });

    if (searchInput.parentElement) {
      if (searchInput.nextSibling) searchInput.parentElement.insertBefore(select, searchInput.nextSibling);
      else searchInput.parentElement.appendChild(select);
    }
  }
  select.innerHTML = '';

  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'All';
  select.appendChild(optAll);

  const config = FILTER_CATEGORIES.find((t) => t.tab === tabNumber);
  if (!config) return;

  config.filter.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f.value;
    opt.textContent = f.label;
    select.appendChild(opt);
  });

  // Ensure the dropdown visually resets to "All" for the active tab
  select.selectedIndex = 0;
}

// Fetch and display monthly users
async function loadMonthlyUsers() {
  let hadError = false;
  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/monthly`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    tableData.monthlyUsers = (data.result || []).filter(Boolean);

    const ids = Array.from(new Set(tableData.monthlyUsers.map((u) => u && u.customer_id).filter(Boolean)));
    const customerMap = await getCustomerDataMany(ids);

    const rows = [];
    const seenMonthly = new Set();
    for (const user of tableData.monthlyUsers) {
      if (!user || !user.customer_id) continue;
      if (seenMonthly.has(user.customer_id)) continue;
      seenMonthly.add(user.customer_id);
      const customerData = customerMap.get(user.customer_id) || null;
      if (String(customerData?.customer_type || '').toLowerCase() === 'archived') continue;
      const fullName = customerData
        ? `${customerData.customer_first_name} ${customerData.customer_last_name}`
        : 'Unknown';
      const image = customerData?.customer_image_url || '/src/images/client_logo.jpg';
      const priceRateLabel =
        String(customerData?.customer_rate || '').toLowerCase() === 'student' ? 'Student' : 'Regular';
      const columnsData = [
        'id_' + user.customer_id,
        { type: 'object_contact', data: [image, fullName, customerData?.customer_contact || ''] },
        'Monthly',
        user.customer_pending ? 'Pending' : main.isIncomingDate(user.customer_start_date) ? 'Incoming' : 'Active',
        'custom_date_' + main.encodeDate(user.customer_start_date, 'long'),
        'custom_date_' + main.encodeDate(user.customer_end_date, 'long'),
        priceRateLabel,
        main.encodePrice(
          (user.customer_months || 1) *
            (String(customerData?.customer_rate || '').toLowerCase() === 'student'
              ? MONTHLY_PRICES.student
              : MONTHLY_PRICES.regular)
        ),
      ];
      rows.push({ _id: String(user.customer_id), columnsData });
    }

    const prevRows = getTabCache(1) || tabCacheMem[1];
    const changed = !prevRows || dataSignature(prevRows) !== dataSignature(rows);
    if (changed) {
      main.deleteAllAtSectionOne(SECTION_NAME, 1, () => {
        rows.forEach((entry) => {
          const existing = document
            .querySelector(`#${SECTION_NAME}SectionOneListEmpty1`)
            ?.parentElement?.parentElement?.querySelector(`[data-id="${entry._id}"]`);
          if (existing) return;
          main.createAtSectionOne(SECTION_NAME, entry.columnsData, 1, (createResult) => {
            setupRowEditing(createResult, 'monthly', { customer_id: entry._id });
          });
        });
        tabCacheMem[1] = rows;
        setTabCache(1, rows);
      });
    }
  } catch (error) {
    console.error('Error loading monthly users:', error);
    main.toast('Error loading monthly users', 'error');
    hadError = true;
  } finally {
    // try { if (!hadError) main.toast('Monthly Users loaded', 'success'); } catch (_) {}
  }
}

// Fetch and display Daily Check-ins (today) from both Regular and Monthly check-ins
async function loadRegularUsers() {
  let hadError = false;
  try {
    // Load today's Regular and Monthly check-ins from backend
    const [regularResp, monthlyResp] = await Promise.all([
      fetch(`${API_BASE_URL}/inquiry/checkins/regular`),
      fetch(`${API_BASE_URL}/inquiry/checkins/monthly`),
    ]);
    if (!regularResp.ok) throw new Error(`HTTP error! status: ${regularResp.status}`);
    if (!monthlyResp.ok) throw new Error(`HTTP error! status: ${monthlyResp.status}`);

    const regularData = await regularResp.json();
    const monthlyData = await monthlyResp.json();
    const regularAll = (regularData.result || []).filter(Boolean).map((r) => ({ ...r, _src: 'regular' }));
    const monthlyAll = (monthlyData.result || []).filter(Boolean).map((r) => ({ ...r, _src: 'monthly' }));

    const isToday = (iso) => {
      try {
        const d = new Date(iso);
        const t = new Date();
        return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
      } catch (_) {
        return false;
      }
    };

    // const todays = [...regularAll, ...monthlyAll].filter((r) => isToday(r.created_at));
    const todays = [...regularAll, ...monthlyAll];
    tableData.regularUsers = todays; // keep combined for potential reuse

    const ids = Array.from(new Set(todays.map((r) => r && (r.customer_id || r.checkin_id)).filter(Boolean)));
    const customerMap = await getCustomerDataMany(ids);

    const rows = [];
    for (const record of todays) {
      const customerId = record.customer_id || record.checkin_id;
      if (!customerId) continue;
      const c = customerMap.get(customerId) || null;
      const isStudentRate = String(c?.customer_rate || '').toLowerCase() === 'student';
      const priceRateLabel = isStudentRate ? 'Student' : 'Regular';
      const typeLabel = record._src === 'monthly' ? 'Monthly' : 'Daily';
      const amount = record._src === 'monthly' ? 0 : isStudentRate ? 60 : 70;

      const columnsData = [
        'id_' + customerId,
        typeLabel,
        {
          type: 'object_contact',
          data: [
            c?.customer_image_url || record.customer_image_url || '/src/images/client_logo.jpg',
            c ? `${c.customer_first_name} ${c.customer_last_name}` : record.customer_name_encoded,
            c?.customer_contact || record.customer_contact || '',
          ],
        },
        'custom_datetime_' +
          main.encodeDate(record.created_at, 'long') +
          ' - ' +
          main.encodeTime(record.created_at, 'long'),
        priceRateLabel,
        main.encodePrice(amount),
      ];
      rows.push({ _id: String(customerId), columnsData });
    }

    const prevRows = getTabCache(2) || tabCacheMem[2];
    const changed = !prevRows || dataSignature(prevRows) !== dataSignature(rows);
    if (changed) {
      main.deleteAllAtSectionOne(SECTION_NAME, 2, () => {
        rows.forEach((entry) => {
          const existing = document
            .querySelector(`#${SECTION_NAME}SectionOneListEmpty2`)
            ?.parentElement?.parentElement?.querySelector(`[data-id="${entry._id}"]`);
          if (existing) return;
          main.createAtSectionOne(SECTION_NAME, entry.columnsData, 2, (createResult) => {
            setupRowEditing(createResult, 'regular', {});
          });
        });
        tabCacheMem[2] = rows;
        setTabCache(2, rows);
      });
    }
  } catch (error) {
    console.error('Error loading daily check-ins:', error);
    main.toast('Error loading daily check-ins', 'error');
    hadError = true;
  } finally {
    try {
      if (!hadError) main.toast('Daily Check-ins (Today: Regular + Monthly) loaded', 'success');
    } catch (_) {}
  }
}

// Fetch and display student users
async function loadStudents() {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const students = (data.result || [])
      .filter(Boolean)
      .filter((user) => String(user.customer_rate || '').toLowerCase() === 'student');
    tableData.students = students;

    main.deleteAllAtSectionOne(SECTION_NAME, 3);

    const seenStudents = new Set();
    students.forEach((user) => {
      if (!user || !user.customer_id) return;
      if (seenStudents.has(user.customer_id)) return;
      seenStudents.add(user.customer_id);
      const columnsData = [
        'id_' + user.customer_id,
        'Student',
        {
          type: 'object_contact',
          data: [
            user.customer_image_url || '/src/images/client_logo.jpg',
            `${user.customer_first_name} ${user.customer_last_name}`,
            user.customer_contact || '',
          ],
        },
        'custom_time_today',
        main.encodePrice(String(user.customer_type || '').toLowerCase() === 'daily' ? 60 : 850),
      ];

      const existing = document
        .querySelector(`#${SECTION_NAME}SectionOneListEmpty3`)
        ?.parentElement?.parentElement?.querySelector(`[data-id="${user.customer_id}"]`);
      if (existing) return;
      main.createAtSectionOne(SECTION_NAME, columnsData, 3, (createResult) => {
        setupRowEditing(createResult, 'student', user);
      });
    });
  } catch (error) {
    console.error('Error loading students:', error);
    main.toast('Error loading students', 'error');
  } finally {
    try {
      /* optional student-only toast if this tab is used */
    } catch (_) {}
  }
}

// Fetch and display supplement products
async function loadSupplements() {
  let hadError = false;
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    // Show ALL active products (match ecommerce_stock active set), exclude disposed
    const products = (data.result || []).filter((product) => {
      return !(
        product.disposal_status === 'Disposed' ||
        (product.product_name && product.product_name.toLowerCase().includes('disposed'))
      );
    });
    tableData.supplements = products;

    main.deleteAllAtSectionOne(SECTION_NAME, 3, async () => {
      // Build sales aggregates per product (quantity_sold, total_sales)
      const salesAggregates = await getProductSalesAggregates();

      const seenProducts = new Set();
      const rows = [];
      products.forEach((product) => {
        if (!product || !product.product_id) return;
        if (seenProducts.has(product.product_id)) return;
        seenProducts.add(product.product_id);

        const aggregate = salesAggregates.get(product.product_id) || { quantity: 0, total: 0 };
        const displayId =
          String(product.product_id || '')
            .split('_')
            .slice(0, 2)
            .join('_') || String(product.product_id || '');
        const columnsData = [
          displayId,
          { type: 'object', data: [product.image_url || '/src/images/client_logo.jpg', product.product_name || ''] },
          String(product.quantity),
          main.encodePrice(product.price),
          String(product.measurement_value || ''),
          String(product.measurement_unit || ''),
          product.expiration_date
            ? new Date(product.expiration_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : 'No expiration',
          'custom_date_' +
            (product.created_at
              ? new Date(product.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : main.encodeDate(new Date(), 'long')),
        ];
        rows.push({ _id: String(product.product_id), columnsData });
      });

      const prevRows = getTabCache(3) || tabCacheMem[3];
      const changed = !prevRows || dataSignature(prevRows) !== dataSignature(rows);
      if (changed) {
        main.deleteAllAtSectionOne(SECTION_NAME, 3, () => {
          rows.forEach((entry) => {
            const existing = document
              .querySelector(`#${SECTION_NAME}SectionOneListEmpty3`)
              ?.parentElement?.parentElement?.querySelector(`[data-id=\"${entry._id}\"]`);
            if (existing) return;
            main.createAtSectionOne(SECTION_NAME, entry.columnsData, 3, (createResult) => {
              createResult.dataset.id = entry._id;
              setupRowEditing(createResult, 'supplement', {});
            });
          });
          tabCacheMem[3] = rows;
          setTabCache(3, rows);
        });
      }
    });
  } catch (error) {
    console.error('Error loading supplements:', error);
    main.toast('Error loading supplements', 'error');
    hadError = true;
  } finally {
    try {
      if (!hadError) main.toast('Supplements / Products loaded', 'success');
    } catch (_) {}
  }
}

// Aggregate sales data per product from orders and order items
async function getProductSalesAggregates() {
  const aggregates = new Map();
  try {
    const ordersRes = await fetch(`${API_BASE_URL}/ecommerce/orders`);
    if (!ordersRes.ok) return aggregates;
    const ordersData = await ordersRes.json();
    const orders = Array.isArray(ordersData.result) ? ordersData.result : [];
    if (orders.length === 0) return aggregates;

    // Fetch items for all orders in parallel (limit implicit by browser)
    const itemFetches = orders.map(async (order) => {
      try {
        const orderId = order.order_id || order.id;
        if (!orderId) return;
        const itemsRes = await fetch(`${API_BASE_URL}/ecommerce/orders/${orderId}`);
        if (!itemsRes.ok) return;
        const itemsData = await itemsRes.json();
        const items = (itemsData.result && itemsData.result.items) || [];
        items.forEach((it) => {
          const pid = it.product_id;
          const qty = Number(it.quantity) || 0;
          const total = Number(it.total_price) || (Number(it.unit_price) || 0) * qty;
          if (!pid) return;
          const prev = aggregates.get(pid) || { quantity: 0, total: 0 };
          aggregates.set(pid, { quantity: prev.quantity + qty, total: prev.total + total });
        });
      } catch (_) {}
    });

    await Promise.all(itemFetches);
  } catch (_) {}
  return aggregates;
}

// Fetch and display upcoming reservations
async function loadReservations() {
  try {
    reservationsLoadedOnce = false;
    if (typeof reservationsUnsubscribe === 'function') {
      try {
        reservationsUnsubscribe();
      } catch (_) {}
      reservationsUnsubscribe = null;
    }

    const q = query(collection(db, 'reservations'));
    reservationsUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const reservations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

          // Match Live Schedule List: show ALL reservations (past and future)
          // Sort by date then startTime descending (most recent/top)
          const normalized = reservations
            .map((r) => ({
              ...r,
              _dateParts: String(r.date || r.reservationDate || '')
                .split('-')
                .map((n) => parseInt(n, 10)),
              _timeParts: String(r.startTime || '00:00')
                .split(':')
                .map((n) => parseInt(n, 10)),
            }))
            .filter((r) => Array.isArray(r._dateParts) && r._dateParts.length === 3);

          normalized.sort((a, b) => {
            try {
              const [am, ad, ay] = a._dateParts;
              const [bm, bd, by] = b._dateParts;
              const [ah, amin] = a._timeParts;
              const [bh, bmin] = b._timeParts;
              const aDt = new Date(ay, am - 1, ad, ah || 0, amin || 0, 0, 0).getTime();
              const bDt = new Date(by, bm - 1, bd, bh || 0, bmin || 0, 0, 0).getTime();
              return bDt - aDt; // newest first
            } catch (_) {
              return 0;
            }
          });

          tableData.reservations = normalized;

          main.deleteAllAtSectionOne(SECTION_NAME, 4, () => {
            tableData.reservations.forEach((reservation) => {
              const resTypeRaw = reservation.reservationType || reservation.serviceType || 'gym';
              const dateStr = reservation.date || reservation.reservationDate || '';
              const startTime = reservation.startTime || '';
              const endTime = reservation.endTime || '';
              const amount = reservation.amount != null ? reservation.amount : reservation.price || 0;
              const customerNameEncoded = reservation.customerName || '';
              let displayName = 'Unknown';
              try {
                const { fullName } = main.decodeName(customerNameEncoded);
                displayName = fullName || 'Unknown';
              } catch (_) {
                displayName = customerNameEncoded || 'Unknown';
              }

              // Normalize reservation type to human-readable label
              let reservationTypeText = 'Unknown';
              try {
                if (typeof resTypeRaw === 'number') {
                  const typeLabels = ['Basketball', 'Zumba'];
                  reservationTypeText = typeLabels[resTypeRaw] || String(resTypeRaw);
                } else if (typeof resTypeRaw === 'string') {
                  reservationTypeText = main.fixText(resTypeRaw);
                } else {
                  reservationTypeText = 'Basketball';
                }
              } catch (_) {
                reservationTypeText = String(resTypeRaw || 'Basketball');
              }

              const columnsData = [
                'id_' + reservation.id,
                reservationTypeText,
                displayName,
                startTime ? main.decodeTime(startTime) : 'N/A',
                endTime ? main.decodeTime(endTime) : 'N/A',
                dateStr ? main.decodeDate(dateStr) : main.decodeDate(new Date()),
                main.encodePrice(amount),
              ];

              const existing = document
                .querySelector(`#${SECTION_NAME}SectionOneListEmpty4`)
                ?.parentElement?.parentElement?.querySelector(`[data-id="${reservation.id}"]`);
              if (existing) return;
              main.createAtSectionOne(SECTION_NAME, columnsData, 4, (createResult) => {
                setupRowEditing(createResult, 'reservation', reservation);
              });
            });
            if (!reservationsLoadedOnce) {
              reservationsLoadedOnce = true;
              try {
                main.toast('Reservations loaded', 'success');
              } catch (_) {}
            }
          });
        } catch (e) {
          console.error('Reservations listener processing error:', e);
        }
      },
      (error) => {
        console.error('Reservations listener error:', error);
        main.deleteAllAtSectionOne(SECTION_NAME, 4);
      }
    );
  } catch (error) {
    console.error('Error starting reservations listener:', error);
    main.deleteAllAtSectionOne(SECTION_NAME, 4);
  }
}

// Configure row editing behavior (currently disabled)
function setupRowEditing(row, dataType, originalData) {
  const cells = row.querySelectorAll('td');
  cells.forEach((cell) => {
    cell.style.cursor = 'default';
    cell.title = '';
  });
}

// Make a cell editable with inline input
function makeCellEditable(cell, dataType, originalData, columnIndex) {
  const originalValue = cell.textContent.trim();
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalValue;
  input.className = 'w-full border-none bg-transparent p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  const saveEdit = async () => {
    const newValue = input.value.trim();
    if (newValue !== originalValue) {
      try {
        await updateData(dataType, originalData, columnIndex, newValue);
        cell.textContent = newValue;
        main.toast('Data updated successfully', 'success');
      } catch (error) {
        console.error('Error updating data:', error);
        main.toast('Error updating data', 'error');
        cell.textContent = originalValue;
      }
    } else {
      cell.textContent = originalValue;
    }
  };

  const cancelEdit = () => {
    cell.textContent = originalValue;
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });
}

// Update data via API based on data type and column
async function updateData(dataType, originalData, columnIndex, newValue) {
  try {
    let endpoint = '';
    let updateData = {};

    switch (dataType) {
      case 'monthly':
        endpoint = `${API_BASE_URL}/inquiry/monthly/${originalData.customer_id}`;
        if (columnIndex === 4) {
          updateData['customer_start_date'] = main
            .encodeDate(newValue, '2-digit')
            .replace(/^(\d{2})-(\d{2})-(\d{4})$/, '$3-$1-$2');
        } else if (columnIndex === 5) {
          updateData['customer_end_date'] = main
            .encodeDate(newValue, '2-digit')
            .replace(/^(\d{2})-(\d{2})-(\d{4})$/, '$3-$1-$2');
        } else if (columnIndex === 3) {
          const isPending = String(newValue).toLowerCase().includes('pending') ? 1 : 0;
          updateData['customer_pending'] = isPending;
        } else if (columnIndex === 2) {
          const isMonthly = String(newValue).toLowerCase().includes('monthly');
          updateData['customer_type'] = isMonthly ? 'monthly' : 'daily';
        }
        break;

      case 'regular':
      case 'student':
        endpoint = `${API_BASE_URL}/inquiry/customers/${originalData.customer_id}`;
        if (columnIndex === 1) {
          const isMonthly = String(newValue).toLowerCase().includes('monthly');
          updateData['customer_type'] = isMonthly ? 'monthly' : 'daily';
        } else if (columnIndex === 2) {
          const parts = String(newValue).trim().split(/\s+/);
          const lastName = parts.length > 1 ? parts.pop() : '';
          const firstName = parts.join(' ');
          updateData['customer_first_name'] = firstName || originalData.customer_first_name;
          updateData['customer_last_name'] = lastName || originalData.customer_last_name;
        }
        break;

      case 'supplement':
        endpoint = `${API_BASE_URL}/ecommerce/products/${originalData.product_id}`;
        if (columnIndex === 1) {
          updateData['product_name'] = newValue;
          updateData['product_name_encoded'] = main.encodeText(newValue);
        } else if (columnIndex === 2) {
          updateData['quantity'] = +newValue;
        } else if (columnIndex === 3) {
          const priceNumber = main.decodePrice(newValue);
          updateData['price'] = priceNumber;
          updateData['price_encoded'] = main.encodePrice(priceNumber);
        }
        break;

      case 'reservation':
        throw new Error('Reservations editing is currently disabled');
        break;

      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid field to update');
    }

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Successfully updated ${dataType} data:`, result);
  } catch (error) {
    console.error(`Error updating ${dataType} data:`, error);
    throw error;
  }
}

// Fetch customer data by ID
async function getCustomerData(customerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/customers/${customerId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return null;
  }
}

async function getCustomerDataMany(ids = []) {
  const results = new Map();
  const toFetch = [];
  ids.forEach((id) => {
    if (customerCache.has(id)) {
      results.set(id, customerCache.get(id));
    } else {
      toFetch.push(id);
    }
  });
  if (toFetch.length) {
    const fetches = toFetch.map(async (id) => {
      if (id !== 'U123') {
        try {
          const res = await fetch(`${API_BASE_URL}/inquiry/customers/${id}`);
          if (!res.ok) return;
          const json = await res.json();
          customerCache.set(id, json.result);
          results.set(id, json.result);
        } catch (_) {}
      }
    });
    await Promise.all(fetches);
  }
  return results;
}

function cacheKey(tabIndex) {
  return `dc_tab_${tabIndex}`;
}
function setTabCache(tabIndex, rows) {
  try {
    localStorage.setItem(cacheKey(tabIndex), JSON.stringify({ t: Date.now(), rows }));
  } catch (_) {}
}
function getTabCache(tabIndex) {
  try {
    const raw = localStorage.getItem(cacheKey(tabIndex));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.t) return null;
    if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
    return parsed.rows || null;
  } catch (_) {
    return null;
  }
}

// Main button click handler - exports PDF
function mainBtnFunction() {
  exportToPDF();
}

// Sub button click handler - exports Excel
function subBtnFunction() {
  exportToExcel();
}

// Export current tab data to PDF
// Open a simple date-range filter modal; resolves to { start: Date|null, end: Date|null } | null (export all) | undefined (cancel)
function openDateRangeFilterModal(title = 'Filter by date range before export') {
  return new Promise((resolve) => {
    const modalHTML = `
      <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/30 opacity-0 duration-300 z-30 hidden" id="dcExportFilterModal">
        <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
          <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-violet-500 via-fuchsia-600 to-red-600 p-4 text-center text-white">
            <p class="text-base font-semibold">${title}</p>
            <p class="text-xs">Leave blank to skip filtering or choose Export All</p>
          </div>
          <div class="p-4">
            <label class="mb-1 block text-sm font-medium text-gray-700">Date range</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="date" id="dcExportStart" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500" />
              <input type="date" id="dcExportEnd" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500" />
            </div>
            <div class="mt-4 flex items-center justify-end gap-2">
              <button type="button" id="dcExportFilteredBtn" class="px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500">Export Filtered</button>
              <button type="button" id="dcExportAllBtn" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">Export All</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('dcExportFilterModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.add('opacity-100');
      modal.children[0].classList.remove('-translate-y-6');
      modal.children[0].classList.add('scale-100');
    }, 10);

    const cleanup = () => {
      modal.classList.remove('opacity-100');
      modal.children[0].classList.add('-translate-y-6');
      modal.children[0].classList.remove('scale-100');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.remove();
      }, 300);
    };

    // Close when clicking outside the modal content
    modal.addEventListener('click', () => {
      cleanup();
      resolve(undefined);
    });

    document.getElementById('dcExportAllBtn').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    document.getElementById('dcExportFilteredBtn').addEventListener('click', () => {
      const s = (document.getElementById('dcExportStart').value || '').trim();
      const e = (document.getElementById('dcExportEnd').value || '').trim();
      let start = s ? new Date(s) : null;
      let end = e ? new Date(e) : null;
      if (start && end && start > end) {
        const t = start;
        start = end;
        end = t;
      }
      cleanup();
      resolve({ start, end });
    });
  });
}

function findDateColumnIndices(headers = []) {
  const idxs = [];
  headers.forEach((h, i) => {
    if (/date/i.test(h)) idxs.push(i);
  });
  return idxs;
}

function parseDateCell(value = '') {
  try {
    const text = String(value).trim();
    const onlyDate = text.split(' - ')[0];
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(onlyDate)) {
      const [m, d, y] = onlyDate.split('-').map((n) => parseInt(n, 10));
      return new Date(y, m - 1, d);
    }
    const dt = new Date(onlyDate);
    if (!isNaN(dt.getTime())) return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  } catch (_) {}
  return null;
}

function isWithinRange(d, start, end) {
  if (!d) return false;
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (start && end) {
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return t >= s && t <= e;
  }
  if (start && !end) {
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    return t <= s;
  }
  if (start) {
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    return t >= s;
  }
  if (end) {
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return t <= e;
  }
  return true;
}

async function exportToPDF() {
  const tabNames = ['Monthly Users', 'All Check-ins', 'Products', 'Reservations'];
  const activeIndex = Number(main.sharedState.activeTab) || currentTab || 1;
  const currentTabName = tabNames[activeIndex - 1] || 'Report';

  const tableEl = document.querySelector(
    `#${SECTION_NAME}-section-content [data-sectionindex="1"][data-tabindex="${activeIndex}"] table`
  );
  if (!tableEl) {
    main.toast('No data to export', 'error');
    return;
  }

  const range = await openDateRangeFilterModal('Filter rows by date range before export');
  if (typeof range === 'undefined') return; // cancelled

  // Extract headers (exclude action column)
  const headerCells = Array.from(tableEl.querySelectorAll('thead th'));
  const headers = headerCells.slice(0, -1).map((th) => (th.textContent || '').trim());

  // Build body rows (exclude placeholder and action column)
  const bodyRows = [];
  const tbody = tableEl.querySelector('tbody');
  if (tbody) {
    const allRows = Array.from(tbody.querySelectorAll('tr'));
    const dateCols = findDateColumnIndices(headers);
    allRows.forEach((tr) => {
      const placeholder = tr.querySelector(`#${SECTION_NAME}SectionOneListEmpty${activeIndex}`);
      if (placeholder) return;
      const tds = Array.from(tr.querySelectorAll('td'));
      if (!tds.length) return;
      const dataCells = tds.slice(0, -1).map((td) => (td.textContent || '').trim());
      if (range && (range.start || range.end) && dateCols.length > 0) {
        const anyMatch = dateCols.some((ci) => isWithinRange(parseDateCell(dataCells[ci]), range.start, range.end));
        if (!anyMatch) return;
      }
      bodyRows.push(dataCells);
    });
  }

  // Build styled HTML same as payments.js
  const styles = `
    <style>
      * { box-sizing: border-box; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; padding: 28px; color:#111827; }
      .header { text-align:center; line-height:1.35; margin-bottom:20px; }
      .header .name { font-weight:600; font-size:14px; }
      .header .small { font-size:11px; color:#374151; }
      .header .title { margin-top:4px; font-size:12px; color:#111827; }
      table { width:100%; border-collapse:collapse; margin-top:14px; border:1px solid #e5e7eb; }
      thead th { font-size:11px; font-weight:600; color:#111827; padding:8px 10px; text-align:left; border:1px solid #e5e7eb; background:#fbfbfb; }
      tbody td { font-size:11px; color:#111827; padding:8px 10px; border:1px solid #e5e7eb; vertical-align:top; }
      .amount { text-align:right; white-space:pre-line; }
      .footer { margin-top:28px; display:flex; justify-content:space-between; align-items:flex-start; font-size:11px; }
      .footer .left { max-width:50%; }
      .footer .right { text-align:right; }
      .footer .label { color:#374151; }
      .footer .value { font-weight:600; }
      @media print { @page { margin: 16mm; } }
    </style>`;

  const headersHtml = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
  const amountCol = (label) => /amount|price|sales/i.test(label);
  let grandTotal = 0;

  const rowsHtml = bodyRows
    .map((cells) => {
      // Add up numeric values in the cells
      cells.forEach((val) => {
        if (val.includes('₱')) {
          grandTotal += +main.decodePrice(val);
        }
      });

      // Return the HTML row
      return `<tr>${cells
        .map((val, idx) => `<td class="${amountCol(headers[idx]) ? 'amount' : ''}">${val}</td>`)
        .join('')}</tr>`;
    })
    .join('');

  const grandTotalText = `<b>${main.encodePrice(grandTotal)}</b>`;

  const dateSuffix = (() => {
    const fmt = (d) => (d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
    if (!range || (!range.start && !range.end)) return '';
    if (range.start && range.end) return ` — ${fmt(range.start)} to ${fmt(range.end)}`;
    if (range.start) return ` — from ${fmt(range.start)}`;
    return ` — until ${fmt(range.end)}`;
  })();

  const generatedAt = new Date().toLocaleString();
  const preparedName = sessionStorage.getItem('systemUserFullname') || 'Cashier or admin';
  const preparedRole = sessionStorage.getItem('systemUserRole') || '';
  const preparedBy = preparedRole ? `${preparedName} (${preparedRole})` : preparedName;

  const reportHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${currentTabName} Report</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <div class="name">Fitworx Gym</div>
          <div class="small">Q28V+QMG, Capt. F. S. Samano, Caloocan, Metro Manila</div>
          <div class="small">0939 874 5377</div>
          <div class="title">${currentTabName}${dateSuffix}</div>
        </div>
        <table>
          <thead>${headersHtml}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="footer">
          <div class="left">
            <span class="label">Prepared by:</span> <span class="value">${preparedBy}</span>
          </div>
          <div class="right">
            <div><span class="label">Total:</span> <span class="value">${grandTotalText}</span></div>
            <div><span class="label">Generated:</span> <span class="value">${generatedAt}</span></div>
          </div>
        </div>
      </body>
    </html>`;

  const win = window.open('', '', 'width=900,height=700');
  if (!win) return;
  win.document.write(reportHtml);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch (_) {}
    try {
      win.close();
    } catch (_) {}
  }, 250);
}

// Export current tab data to Excel
async function exportToExcel() {
  const tabNames = ['Monthly Users', 'All Check-ins', 'Products', 'Reservations'];
  const activeIndex = Number(main.sharedState.activeTab) || currentTab || 1;
  const currentTabName = tabNames[activeIndex - 1] || 'Report';

  const table = document.querySelector(`#${SECTION_NAME}-section-content [data-tabindex="${activeIndex}"] table`);
  if (!table) {
    main.toast('No data to export', 'error');
    return;
  }

  // Ask for optional date range filter
  const range = await openDateRangeFilterModal('Filter rows by date range before Excel export');
  if (typeof range === 'undefined') return; // cancelled

  const headers = Array.from(table.querySelectorAll('thead th'))
    .slice(0, -1)
    .map((th) => th.textContent.trim());

  const rows = [];
  const tbody = table.querySelector('tbody');
  if (tbody) {
    const allRows = Array.from(tbody.querySelectorAll('tr'));
    allRows.forEach((row, idx) => {
      const placeholder = row.querySelector(`#${SECTION_NAME}SectionOneListEmpty${activeIndex}`);
      if (placeholder) return;
      const cells = Array.from(row.querySelectorAll('td'))
        .slice(0, -1)
        .map((td) => td.textContent.trim());
      if (!cells.length) return;
      if (range && (range.start || range.end)) {
        const dateCols = findDateColumnIndices(headers);
        if (dateCols.length > 0) {
          const anyMatch = dateCols.some((ci) => {
            const d = parseDateCell(cells[ci]);
            return isWithinRange(d, range.start, range.end);
          });
          if (!anyMatch) return;
        }
      }
      rows.push(cells);
    });
  }

  // Calculate grand total across numeric "amount" columns
  let grandTotal = 0;
  const isAmountCol = (label) => /amount|price|sales/i.test(label);
  rows.forEach((r) => {
    r.forEach((val, idx) => {
      if (isAmountCol(headers[idx])) {
        const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
        if (!isNaN(num)) grandTotal += num;
      }
    });
  });

  if (typeof ExcelJS === 'undefined') {
    main.toast('Excel exporter not loaded. Please try again.', 'error');
    return;
  }
  const wb = new ExcelJS.Workbook();
  const sanitizedTabName = currentTabName.replace(/[*?:\\/\[\]]/g, '-');
  const ws = wb.addWorksheet(sanitizedTabName);

  // Excel Header: Gym name, address, and centered title with timestamp
  const gymNameText = 'Fitworx Gym';
  const gymAddrText = 'Q28V+QMG, Capt. F. S. Samano, Caloocan, Metro Manila 0939 874 5377';
  const titleText = `${currentTabName} Report - ${main.getDateOrTimeOrBoth().datetime}`;

  const gymNameRow = ws.addRow([gymNameText]);
  ws.mergeCells(gymNameRow.number, 1, gymNameRow.number, headers.length);
  const gymNameCell = ws.getCell(gymNameRow.number, 1);
  gymNameCell.font = { bold: true, size: 16, color: { argb: 'FF1a1a1a' } };
  gymNameCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const gymAddrRow = ws.addRow([gymAddrText]);
  ws.mergeCells(gymAddrRow.number, 1, gymAddrRow.number, headers.length);
  const gymAddrCell = ws.getCell(gymAddrRow.number, 1);
  gymAddrCell.font = { bold: false, size: 11, color: { argb: 'FF4a4a4a' } };
  gymAddrCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const titleRow = ws.addRow([titleText]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, headers.length);
  const titleCell = ws.getCell(titleRow.number, 1);
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1a1a1a' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf5f5f5' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin', color: { argb: 'FF333333' } },
    left: { style: 'thin', color: { argb: 'FF333333' } },
    bottom: { style: 'medium', color: { argb: 'FF333333' } },
    right: { style: 'thin', color: { argb: 'FF333333' } },
  };
  ws.getRow(titleRow.number).height = 30;

  // If user selected a date range, show it under the title
  if (range && (range.start || range.end)) {
    const fmt = (d) =>
      d
        ? d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '';
    let rangeText = '';
    if (range.start && range.end) {
      rangeText = `${fmt(range.start)} - ${fmt(range.end)}`;
    } else if (range.start) {
      rangeText = `From ${fmt(range.start)}`;
    } else if (range.end) {
      rangeText = `Until ${fmt(range.end)}`;
    }
    const rangeRow = ws.addRow([rangeText]);
    ws.mergeCells(rangeRow.number, 1, rangeRow.number, headers.length);
    const rangeCell = ws.getCell(rangeRow.number, 1);
    rangeCell.font = { bold: true, size: 11, color: { argb: 'FF4a4a4a' } };
    rangeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Add spacing row
  ws.addRow([]);

  // Header Row Styling - Clean and Corporate
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FF1a1a1a' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe8e8e8' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF333333' } },
      left: { style: 'thin', color: { argb: 'FFcccccc' } },
      bottom: { style: 'medium', color: { argb: 'FF333333' } },
      right: { style: 'thin', color: { argb: 'FFcccccc' } },
    };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });
  headerRow.height = 22;

  // Data Rows with Clean Alternating Colors
  rows.forEach((r, idx) => {
    const row = ws.addRow(r);
    const isEven = idx % 2 === 0;
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFffffff' : 'FFfafafa' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFe0e0e0' } },
        left: { style: 'thin', color: { argb: 'FFe0e0e0' } },
        bottom: { style: 'thin', color: { argb: 'FFe0e0e0' } },
        right: { style: 'thin', color: { argb: 'FFe0e0e0' } },
      };
      cell.font = { size: 10, color: { argb: 'FF333333' } };

      const cellValue = String(cell.value || '');
      if (cellValue.match(/^\$|₱|£|€/) || cellValue.match(/^\d+(\.\d+)?$/)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { ...cell.font, bold: true };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
    row.height = 18;
  });

  // Calculate and add subtotals if applicable
  const isCurrency = (label) => /amount|price|sales/i.test(label);
  const isQuantity = (label) => /quantity sold/i.test(label);
  const totals = {};

  rows.forEach((r) => {
    r.forEach((val, idx) => {
      const label = headers[idx] || '';
      if (isCurrency(label)) {
        const parsed = Number(String(val).replace(/[^0-9.\-]/g, ''));
        const num = Number.isFinite(parsed) ? parsed : 0;
        totals[label] = (totals[label] || 0) + num;
      } else if (isQuantity(label)) {
        const num = parseInt(String(val).replace(/[^0-9\-]/g, ''), 10);
        totals[label] = (totals[label] || 0) + (Number.isFinite(num) ? num : 0);
      }
    });
  });

  if (Object.keys(totals).length > 0) {
    ws.addRow([]);
    const totalHeaderRow = ws.addRow(['SUMMARY TOTALS']);
    ws.mergeCells(totalHeaderRow.number, 1, totalHeaderRow.number, headers.length);
    const totalHeaderCell = ws.getCell(totalHeaderRow.number, 1);
    totalHeaderCell.font = { bold: true, size: 11, color: { argb: 'FF1a1a1a' } };
    totalHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf0f0f0' } };
    totalHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    totalHeaderCell.border = {
      top: { style: 'medium', color: { argb: 'FF333333' } },
      left: { style: 'thin', color: { argb: 'FF333333' } },
      bottom: { style: 'thin', color: { argb: 'FF333333' } },
      right: { style: 'thin', color: { argb: 'FF333333' } },
    };
    totalHeaderRow.height = 24;

    Object.entries(totals).forEach(([label, value]) => {
      const totalRow = ws.addRow([label, isCurrency(label) && main.encodePrice ? main.encodePrice(value) : value]);
      ws.mergeCells(totalRow.number, 2, totalRow.number, headers.length);

      totalRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF333333' } };
      totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfafafa' } };
      totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      totalRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FFcccccc' } },
        left: { style: 'thin', color: { argb: 'FF333333' } },
        bottom: { style: 'thin', color: { argb: 'FFcccccc' } },
        right: { style: 'thin', color: { argb: 'FFcccccc' } },
      };

      totalRow.getCell(2).font = { bold: true, size: 10, color: { argb: 'FF1a1a1a' } };
      totalRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFffffff' } };
      totalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      totalRow.getCell(2).border = {
        top: { style: 'thin', color: { argb: 'FFcccccc' } },
        left: { style: 'thin', color: { argb: 'FFcccccc' } },
        bottom: { style: 'thin', color: { argb: 'FFcccccc' } },
        right: { style: 'thin', color: { argb: 'FF333333' } },
      };
      totalRow.height = 20;
    });
  }

  // Add Grand Total row (overall total across all amount columns)
  if (grandTotal > 0) {
    ws.addRow([]);
    const gtRow = ws.addRow(['Grand Total', main.encodePrice(grandTotal)]);
    ws.mergeCells(gtRow.number, 2, gtRow.number, headers.length);

    gtRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1a1a1a' } };
    gtRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    gtRow.getCell(2).font = { bold: true, size: 11, color: { argb: 'FF1a1a1a' } };
    gtRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    gtRow.height = 22;
  }

  // Auto-fit columns with better sizing
  ws.columns.forEach((col) => {
    let max = 12;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value || '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(45, Math.max(15, max + 3));
  });

  // Add footer with metadata - Clean Style
  ws.addRow([]);
  const operatorName =
    (typeof main.getOperatorName === 'function' && main.getOperatorName()) ||
    (typeof main.getCurrentUserName === 'function' && main.getCurrentUserName()) ||
    (typeof main.getUserPrefs === 'function' && main.getUserPrefs()?.operatorName) ||
    'System Operator';
  const footerRow = ws.addRow([
    `Prepared by: ${operatorName}`,
    '',
    '',
    `Generated: ${main.getDateOrTimeOrBoth().datetime}`,
  ]);
  ws.mergeCells(footerRow.number, 1, footerRow.number, Math.floor(headers.length / 2));
  ws.mergeCells(footerRow.number, Math.floor(headers.length / 2) + 1, footerRow.number, headers.length);
  footerRow.eachCell((cell) => {
    cell.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });
  footerRow.getCell(Math.floor(headers.length / 2) + 1).alignment = { horizontal: 'right', vertical: 'middle' };

  wb.xlsx
    .writeBuffer()
    .then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTabName.replace(/\s+/g, '_')}_Report_${main.encodeDate(new Date(), 'numeric')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      main.toast('Excel file exported successfully', 'success');
    })
    .catch((e) => {
      console.error(e);
      main.toast('Error exporting Excel', 'error');
    });
}

// Listen for tab changes from global admin system
document.addEventListener('newTab', async function () {
  if (main.sharedState.sectionName !== SECTION_NAME) return;
  try {
    await loadTabData(main.sharedState.activeTab);
  } catch (e) {}
});

export default {
  loadTabData,
  switchToTab,
  exportToPDF,
  exportToExcel,
};
