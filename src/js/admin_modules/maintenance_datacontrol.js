import main from '../admin_main.js';
import { API_BASE_URL } from '../_global.js';
import { CATEGORIES } from './ecommerce_stock.js';
import { db } from '../firebase.js';
import { collection, onSnapshot, query } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const SECTION_NAME = 'maintenance-datacontrol';
const MODULE_NAME = 'Data Control';

const MONTHLY_PRICES = { regular: 950, student: 850 };

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
    await loadTabData(1);
  }
});

// Attach click listeners to all tabs
function setupTabSwitching() {
  for (let i = 1; i <= 5; i++) {
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
        loadTabData(currentTab);
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

  // await loadTabData(tabIndex);
}

// Load data for specified tab with throttle guard
async function loadTabData(tabIndex) {
  try {
    const now = Date.now();
    if (tabIndex === lastLoadedTab && now - lastLoadedAt < 500) {
      return;
    }
    lastLoadedTab = tabIndex;
    lastLoadedAt = now;
    main.showGlobalLoading();

    // Ensure Reservations listener is disabled when leaving tab 5
    if (tabIndex !== 5 && typeof reservationsUnsubscribe === 'function') {
      try {
        reservationsUnsubscribe();
      } catch (_) {}
      reservationsUnsubscribe = null;
      main.deleteAllAtSectionOne(SECTION_NAME, 5);
    }

    switch (tabIndex) {
      case 1:
        await loadMonthlyUsers();
        break;
      case 2:
        await loadRegularUsers();
        break;
      case 3:
        await loadStudents();
        break;
      case 4:
        await loadSupplements();
        break;
      case 5:
        await loadReservations();
        break;
    }
  } catch (error) {
    console.error(`Error loading tab ${tabIndex} data:`, error);
    main.toast(`Error loading data for tab ${tabIndex}`, 'error');
  } finally {
    main.hideGlobalLoading();
  }
}

// Fetch and display monthly users
async function loadMonthlyUsers() {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/monthly`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    tableData.monthlyUsers = (data.result || []).filter(Boolean);

    main.deleteAllAtSectionOne(SECTION_NAME, 1);

    const seenMonthly = new Set();
    for (const user of tableData.monthlyUsers) {
      if (!user || !user.customer_id) continue;
      if (seenMonthly.has(user.customer_id)) continue;
      seenMonthly.add(user.customer_id);
      const customerData = await getCustomerData(user.customer_id);
      const fullName = customerData
        ? `${customerData.customer_first_name} ${customerData.customer_last_name}`
        : 'Unknown';
      const image = customerData?.customer_image_url || '/src/images/client_logo.jpg';
      const columnsData = [
        'id_' + user.customer_id,
        { type: 'object_contact', data: [image, fullName, customerData?.customer_contact || ''] },
        'Monthly',
        user.customer_pending ? 'Pending' : 'Active',
        'custom_date_' + main.encodeDate(user.customer_start_date, 'long'),
        'custom_date_' + main.encodeDate(user.customer_end_date, 'long'),
        main.encodePrice(
          (user.customer_months || 1) *
            (String(customerData?.customer_rate || '').toLowerCase() === 'student'
              ? MONTHLY_PRICES.student
              : MONTHLY_PRICES.regular)
        ),
        main.encodePrice(
          String(customerData?.customer_rate || '').toLowerCase() === 'student'
            ? MONTHLY_PRICES.student
            : MONTHLY_PRICES.regular
        ),
      ];

      const existing = document
        .querySelector(`#${SECTION_NAME}SectionOneListEmpty1`)
        ?.parentElement?.parentElement?.querySelector(`[data-id="${user.customer_id}"]`);
      if (existing) continue;

      main.createAtSectionOne(SECTION_NAME, columnsData, 1, (createResult) => {
        setupRowEditing(createResult, 'monthly', user);
      });
    }
  } catch (error) {
    console.error('Error loading monthly users:', error);
    main.toast('Error loading monthly users', 'error');
  }
}

// Fetch and display regular/daily users
async function loadRegularUsers() {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const regularUsers = (data.result || [])
      .filter(Boolean)
      .filter((user) => String(user.customer_type || '').toLowerCase() === 'daily');
    tableData.regularUsers = regularUsers;

    main.deleteAllAtSectionOne(SECTION_NAME, 2);

    const seenRegular = new Set();
    regularUsers.forEach((user) => {
      if (!user || !user.customer_id) return;
      if (seenRegular.has(user.customer_id)) return;
      seenRegular.add(user.customer_id);
      const isStudent = String(user.customer_rate || '').toLowerCase() === 'student';
      const amount = isStudent ? 60 : 70;
      const columnsData = [
        'id_' + user.customer_id,
        'Daily',
        {
          type: 'object_contact',
          data: [
            user.customer_image_url || '/src/images/client_logo.jpg',
            `${user.customer_first_name} ${user.customer_last_name}`,
            user.customer_contact || '',
          ],
        },
        'custom_time_today',
        main.encodePrice(amount),
      ];

      const existing = document
        .querySelector(`#${SECTION_NAME}SectionOneListEmpty2`)
        ?.parentElement?.parentElement?.querySelector(`[data-id="${user.customer_id}"]`);
      if (existing) return;
      main.createAtSectionOne(SECTION_NAME, columnsData, 2, (createResult) => {
        setupRowEditing(createResult, 'regular', user);
      });
    });
  } catch (error) {
    console.error('Error loading regular users:', error);
    main.toast('Error loading regular users', 'error');
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
  }
}

// Fetch and display supplement products
async function loadSupplements() {
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

    main.deleteAllAtSectionOne(SECTION_NAME, 4);

    // Build sales aggregates per product (quantity_sold, total_sales)
    const salesAggregates = await getProductSalesAggregates();

    const seenProducts = new Set();
    products.forEach((product) => {
      if (!product || !product.product_id) return;
      if (seenProducts.has(product.product_id)) return;
      seenProducts.add(product.product_id);

      // Align columns with HTML listtitletexts for Supplements tab:
      // [Product ID, Product Name, Quantity, Price, Measurement, Measurement Unit, Quantity Sold, Total Sales, Date]
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
        String(aggregate.quantity || 0),
        main.encodePrice(aggregate.total || 0),
        'custom_date_' +
          (product.created_at
            ? new Date(product.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : main.encodeDate(new Date(), 'long')),
      ];

      const existing = document
        .querySelector(`#${SECTION_NAME}SectionOneListEmpty4`)
        ?.parentElement?.parentElement?.querySelector(`[data-id="${product.product_id}"]`);
      if (existing) return;

      main.createAtSectionOne(SECTION_NAME, columnsData, 4, (createResult) => {
        // Ensure dataset contains the full product_id even if display shows a shortened value
        createResult.dataset.id = product.product_id;
        setupRowEditing(createResult, 'supplement', product);
      });
    });
  } catch (error) {
    console.error('Error loading supplements:', error);
    main.toast('Error loading supplements', 'error');
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

          main.deleteAllAtSectionOne(SECTION_NAME, 5);

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
              '0',
              main.encodePrice(amount),
            ];

            const existing = document
              .querySelector(`#${SECTION_NAME}SectionOneListEmpty5`)
              ?.parentElement?.parentElement?.querySelector(`[data-id="${reservation.id}"]`);
            if (existing) return;
            main.createAtSectionOne(SECTION_NAME, columnsData, 5, (createResult) => {
              setupRowEditing(createResult, 'reservation', reservation);
            });
          });
        } catch (e) {
          console.error('Reservations listener processing error:', e);
        }
      },
      (error) => {
        console.error('Reservations listener error:', error);
        main.deleteAllAtSectionOne(SECTION_NAME, 5);
      }
    );
  } catch (error) {
    console.error('Error starting reservations listener:', error);
    main.deleteAllAtSectionOne(SECTION_NAME, 5);
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

// Main button click handler - exports PDF
function mainBtnFunction() {
  exportToPDF();
}

// Sub button click handler - exports Excel
function subBtnFunction() {
  exportToExcel();
}

// Export current tab data to PDF
function exportToPDF() {
  const tabNames = ['Monthly Users', 'Regular/Daily Users', 'Students', 'Supplements', 'Reservations'];
  const activeIndex = Number(main.sharedState.activeTab) || currentTab || 1;
  const currentTabName = tabNames[activeIndex - 1] || 'Report';

  const tableEl = document.querySelector(
    `#${SECTION_NAME}-section-content [data-sectionindex="1"][data-tabindex="${activeIndex}"] table`
  );
  if (!tableEl) {
    main.toast('No data to export', 'error');
    return;
  }

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-10000px';
  tempContainer.style.top = '0';
  tempContainer.style.width = '1200px';
  tempContainer.style.pointerEvents = 'none';
  tempContainer.style.padding = '40px';
  tempContainer.style.backgroundColor = '#ffffff';
  tempContainer.style.fontFamily = "'Arial', 'Helvetica', sans-serif";

  // Header Section - Clean and Corporate
  const headerSection = document.createElement('div');
  headerSection.style.marginBottom = '30px';
  headerSection.style.borderBottom = '2px solid #333333';
  headerSection.style.paddingBottom = '20px';

  const title = document.createElement('h1');
  title.textContent = `${currentTabName} Report`;
  title.style.textAlign = 'left';
  title.style.margin = '0 0 8px 0';
  title.style.fontSize = '24px';
  title.style.fontWeight = '600';
  title.style.color = '#1a1a1a';
  title.style.letterSpacing = '0.3px';

  const subtitle = document.createElement('div');
  subtitle.textContent = main.getDateOrTimeOrBoth().datetime;
  subtitle.style.textAlign = 'left';
  subtitle.style.margin = '0';
  subtitle.style.fontSize = '13px';
  subtitle.style.color = '#666666';
  subtitle.style.fontWeight = '400';

  headerSection.appendChild(title);
  headerSection.appendChild(subtitle);

  const clonedContent = tableEl.cloneNode(true);
  try {
    const theadRow = clonedContent.querySelector('thead tr');
    if (theadRow && theadRow.lastElementChild) {
      theadRow.removeChild(theadRow.lastElementChild);
    }
    const tbody = clonedContent.querySelector('tbody');
    if (tbody) {
      const emptyCell = tbody.querySelector(`#${SECTION_NAME}SectionOneListEmpty${activeIndex}`);
      if (emptyCell) {
        const emptyRow = emptyCell.closest('tr');
        if (emptyRow) emptyRow.remove();
      }
      tbody.querySelectorAll('tr').forEach((tr) => {
        const last = tr.lastElementChild;
        if (last) tr.removeChild(last);
        tr.querySelectorAll('img').forEach((img) => img.remove());
        Array.from(tr.children).forEach((td) => td.classList.remove('hidden'));
        tr.classList.remove('hidden');
      });
    }
  } catch (_e) {}

  clonedContent.style.width = '100%';
  clonedContent.style.borderCollapse = 'collapse';
  clonedContent.style.borderSpacing = '0';
  clonedContent.style.fontSize = '11px';
  clonedContent.style.color = '#1a1a1a';
  clonedContent.style.border = '1px solid #cccccc';

  const thead = clonedContent.querySelector('thead');
  if (thead) {
    thead.style.backgroundColor = '#f5f5f5';
    thead.querySelectorAll('th').forEach((th) => {
      th.style.padding = '12px 10px';
      th.style.textAlign = 'left';
      th.style.fontWeight = '600';
      th.style.fontSize = '11px';
      th.style.color = '#1a1a1a';
      th.style.borderBottom = '2px solid #333333';
      th.style.borderRight = '1px solid #e0e0e0';
    });
  }

  const tbody = clonedContent.querySelector('tbody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach((tr, idx) => {
      if (idx % 2 === 0) {
        tr.style.backgroundColor = '#ffffff';
      } else {
        tr.style.backgroundColor = '#fafafa';
      }
      tr.querySelectorAll('td').forEach((td) => {
        td.style.padding = '10px';
        td.style.borderBottom = '1px solid #e0e0e0';
        td.style.borderRight = '1px solid #e0e0e0';
        td.style.fontSize = '11px';
        td.style.color = '#333333';
        td.style.fontWeight = '400';
      });
    });
  }

  // Helper: compute per-table subtotals based on header labels
  function computeTableSubtotals(tableNode) {
    const totals = {};
    try {
      const thead = tableNode.querySelector('thead');
      const tbody = tableNode.querySelector('tbody');
      if (!thead || !tbody) return totals;
      const headers = Array.from(thead.querySelectorAll('th')).map((th) => (th.textContent || '').trim());
      const isCurrency = (label) => /amount|price|sales/i.test(label);
      const isQuantity = (label) => /quantity sold/i.test(label);
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(
        (tr) => !tr.querySelector(`#${SECTION_NAME}SectionOneListEmpty${activeIndex}`)
      );
      rows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('td'));
        cells.forEach((td, idx) => {
          const label = headers[idx] || '';
          if (!label) return;
          const raw = (td.textContent || '').trim();
          if (isCurrency(label)) {
            const parsed = Number(String(raw).replace(/[^0-9.\-]/g, ''));
            const val = Number.isFinite(parsed) ? parsed : 0;
            totals[label] = (totals[label] || 0) + val;
          } else if (isQuantity(label)) {
            const val = parseInt(raw.replace(/[^0-9\-]/g, ''), 10);
            totals[label] = (totals[label] || 0) + (Number.isFinite(val) ? val : 0);
          }
        });
      });
    } catch (_) {}
    return totals;
  }

  // Subtotals Section - Clean Corporate Style
  function renderSubtotalsSection(container) {
    const totals = computeTableSubtotals(clonedContent);
    const keys = Object.keys(totals);
    if (keys.length === 0) return;

    const wrap = document.createElement('div');
    wrap.style.marginTop = '30px';
    wrap.style.padding = '20px';
    wrap.style.backgroundColor = '#f9f9f9';
    wrap.style.border = '1px solid #cccccc';

    const heading = document.createElement('div');
    heading.textContent = 'Summary Totals';
    heading.style.fontWeight = '600';
    heading.style.fontSize = '14px';
    heading.style.marginBottom = '15px';
    heading.style.color = '#1a1a1a';
    heading.style.borderBottom = '1px solid #333333';
    heading.style.paddingBottom = '10px';
    wrap.appendChild(heading);

    const list = document.createElement('div');
    list.style.display = 'grid';
    list.style.gridTemplateColumns = '1fr 1fr';
    list.style.gap = '12px';
    list.style.fontSize = '12px';

    keys.forEach((k) => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      item.style.padding = '10px 12px';
      item.style.backgroundColor = '#ffffff';
      item.style.border = '1px solid #e0e0e0';

      const isCurrency = /amount|price|sales/i.test(k);
      const labelSpan = document.createElement('span');
      labelSpan.textContent = k + ':';
      labelSpan.style.color = '#333333';
      labelSpan.style.fontWeight = '500';
      labelSpan.style.fontSize = '11px';

      const valueSpan = document.createElement('span');
      valueSpan.textContent = isCurrency && main.encodePrice ? main.encodePrice(totals[k]) : totals[k];
      valueSpan.style.color = '#1a1a1a';
      valueSpan.style.fontWeight = '600';
      valueSpan.style.fontSize = '12px';

      item.appendChild(labelSpan);
      item.appendChild(valueSpan);
      list.appendChild(item);
    });

    wrap.appendChild(list);
    container.appendChild(wrap);
  }

  const operatorName =
    (typeof main.getOperatorName === 'function' && main.getOperatorName()) ||
    (typeof main.getCurrentUserName === 'function' && main.getCurrentUserName()) ||
    (typeof main.getUserPrefs === 'function' && main.getUserPrefs()?.operatorName) ||
    'System Operator';
  const printedAt = main.getDateOrTimeOrBoth().datetime;

  tempContainer.appendChild(headerSection);
  tempContainer.appendChild(clonedContent);
  renderSubtotalsSection(tempContainer);

  // Footer - Clean and Simple
  const footer = document.createElement('div');
  footer.style.marginTop = '30px';
  footer.style.paddingTop = '15px';
  footer.style.borderTop = '1px solid #cccccc';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.fontSize = '10px';
  footer.style.color = '#666666';
  footer.style.fontWeight = '400';

  const preparedBy = document.createElement('span');
  preparedBy.innerHTML = `<strong style="color: #333333;">Prepared by:</strong> ${operatorName}`;

  const printedAtSpan = document.createElement('span');
  printedAtSpan.innerHTML = `<strong style="color: #333333;">Printed:</strong> ${printedAt}`;

  footer.appendChild(preparedBy);
  footer.appendChild(printedAtSpan);
  tempContainer.appendChild(footer);

  document.body.appendChild(tempContainer);
  void tempContainer.offsetHeight;

  try {
    html2canvas(tempContainer, {
      scale: 1.2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1200,
      windowHeight: tempContainer.scrollHeight,
    })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        const pdf = new window.jspdf.jsPDF({
          unit: 'pt',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min((pageWidth - 60) / imgWidth, (pageHeight - 60) / imgHeight);
        const width = imgWidth * ratio;
        const height = imgHeight * ratio;
        const x = (pageWidth - width) / 2;
        const y = 30;

        pdf.addImage(imgData, 'JPEG', x, y, width, height, undefined, 'FAST');
        pdf.save(`${currentTabName.replace(/\s+/g, '_')}_Report_${main.encodeDate(new Date(), 'numeric')}.pdf`);
        document.body.removeChild(tempContainer);
        main.toast('PDF exported successfully', 'success');
      })
      .catch((error) => {
        document.body.removeChild(tempContainer);
        console.error('PDF export error:', error);
        main.toast('Error exporting PDF', 'error');
      });
  } catch (error) {
    document.body.removeChild(tempContainer);
    console.error('PDF export error:', error);
    main.toast('Error exporting PDF', 'error');
  }
}

// Export current tab data to Excel
function exportToExcel() {
  const tabNames = ['Monthly Users', 'Regular/Daily Users', 'Students', 'Supplements', 'Reservations'];
  const activeIndex = Number(main.sharedState.activeTab) || currentTab || 1;
  const currentTabName = tabNames[activeIndex - 1] || 'Report';

  const table = document.querySelector(`#${SECTION_NAME}-section-content [data-tabindex="${activeIndex}"] table`);
  if (!table) {
    main.toast('No data to export', 'error');
    return;
  }

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
      if (cells.length) rows.push(cells);
    });
  }

  if (typeof ExcelJS === 'undefined') {
    main.toast('Excel exporter not loaded. Please try again.', 'error');
    return;
  }
  const wb = new ExcelJS.Workbook();
  const sanitizedTabName = currentTabName.replace(/[*?:\\/\[\]]/g, '-');
  const ws = wb.addWorksheet(sanitizedTabName);

  // Excel Title Styling - Clean Corporate
  const titleText = `${currentTabName} Report - ${main.getDateOrTimeOrBoth().datetime}`;
  ws.addRow([titleText]);
  ws.mergeCells(1, 1, 1, headers.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1a1a1a' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf5f5f5' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin', color: { argb: 'FF333333' } },
    left: { style: 'thin', color: { argb: 'FF333333' } },
    bottom: { style: 'medium', color: { argb: 'FF333333' } },
    right: { style: 'thin', color: { argb: 'FF333333' } },
  };
  ws.getRow(1).height = 30;

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
    row.eachCell((cell, colNumber) => {
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

      // Right-align numbers and currency
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
    // Add spacing before totals
    ws.addRow([]);

    // Add totals section - Clean Corporate Style
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
