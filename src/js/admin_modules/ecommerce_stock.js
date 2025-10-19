import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';
import { API_BASE_URL } from '../_global.js';

const SECTION_NAME = 'ecommerce-stock';
const MODULE_NAME = 'E-Commerce';
const SUBMODULE_NAME = 'Stock';

// Helper function for emoji display
function getEmoji(emoji, size = 16) {
  return `<img src="/src/images/${emoji}.png" class="inline size-[${size}px] 2xl:size-[${size + 4}px]">`;
}

// Utility: Normalize product name for comparison (similar to equipment validation)
function normalizeProductName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CATEGORIES = [
  { value: 'supplements-nutrition', label: 'Supplements & Nutrition' },
  { value: 'food-meals', label: 'Food & Meals' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'fitness-equipment', label: 'Fitness Equipment' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'other', label: 'Other' },
];

export default { CATEGORIES };

const MEASUREMENT_UNITS = [
  // Weight
  { value: 'mg', label: 'Weight: mg' },
  { value: 'g', label: 'Weight: g' },
  { value: 'kg', label: 'Weight: kg' },
  { value: 'oz', label: 'Weight: oz' },
  { value: 'lb', label: 'Weight: lb' },
  // Volume
  { value: 'ml', label: 'Volume: ml' },
  { value: 'l', label: 'Volume: l' },
  // Count units
  { value: 'unit', label: 'Count: unit(s)' },
  { value: 'piece', label: 'Count: piece(s)' },
  { value: 'set', label: 'Count: set(s)' },
  { value: 'pair', label: 'Count: pair(s)' },
  { value: 'item', label: 'Count: item(s)' },
  { value: 'pack', label: 'Count: pack(s)' },
  { value: 'box', label: 'Count: box(es)' },
  { value: 'bar', label: 'Count: bar(s)' },
  { value: 'packet', label: 'Count: packet(s)' },
  { value: 'capsule', label: 'Count: capsule(s)' },
  { value: 'tablet', label: 'Count: tablet(s)' },
  { value: 'softgel', label: 'Count: softgel(s)' },
  { value: 'scoop', label: 'Count: scoop(s)' },
  { value: 'serving', label: 'Count: serving(s)' },
  { value: 'portion', label: 'Count: portion(s)' },
  { value: 'slice', label: 'Count: slice(s)' },
  { value: 'meal', label: 'Count: meal(s)' },
  { value: 'combo', label: 'Count: combo(s)' },
  { value: 'bowl', label: 'Count: bowl(s)' },
  { value: 'plate', label: 'Count: plate(s)' },
  { value: 'cup', label: 'Count: cup(s)' },
  { value: 'bottle', label: 'Count: bottle(s)' },
  { value: 'can', label: 'Count: can(s)' },
  { value: 'glass', label: 'Count: glass(es)' },
  { value: 'jug', label: 'Count: jug(s)' },
  { value: 'shot', label: 'Count: shot(s)' },
  // Size
  { value: 'inch', label: 'Size: inch(es)' },
  { value: 'cm', label: 'Size: cm' },
  { value: 'mm', label: 'Size: mm' },
  { value: 'size', label: 'Size: size(s)' },
  { value: 'level', label: 'Size: level(s)' },
  // Clothing sizes
  { value: 'extra small', label: 'Clothing Size: XS' },
  { value: 'small', label: 'Clothing Size: S' },
  { value: 'medium', label: 'Clothing Size: M' },
  { value: 'large', label: 'Clothing Size: L' },
  { value: 'extra large', label: 'Clothing Size: XL' },
  { value: '2x large', label: 'Clothing Size: XXL' },
  { value: '3x large', label: 'Clothing Size: XXXL' },
];

// Clothing size unit values for quick checks
const CLOTHING_SIZE_UNITS = new Set([
  'extra small',
  'small',
  'medium',
  'large',
  'extra large',
  '2x large',
  '3x large',
]);

let mainBtn;

// Set up periodic expiration check (every 5 sec)
let expirationCheckInterval;

// Start periodic expiration check when section is loaded
function startExpirationCheck() {
  // Clear any existing interval
  if (expirationCheckInterval) {
    clearInterval(expirationCheckInterval);
  }
  
  // Check every 5 seconds (5000 ms)
  expirationCheckInterval = setInterval(async () => {
    try {
      await checkAndDisposeExpiredProducts();
    } catch (error) {
      console.error('Error in periodic expiration check:', error);
    }
  }, 5000); // 5 sec
}

// Stop periodic expiration check
function stopExpirationCheck() {
  if (expirationCheckInterval) {
    clearInterval(expirationCheckInterval);
    expirationCheckInterval = null;
  }
}

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) {
    stopExpirationCheck();
    return;
  }

  mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
  mainBtn?.removeEventListener('click', mainBtnFunction);
  mainBtn?.addEventListener('click', mainBtnFunction);

  // Start expiration check and load products
  startExpirationCheck();
  loadProducts();
});

// Listen for section changes to refresh stats when this section becomes active
document.addEventListener('DOMContentLoaded', () => {
  const currentSection = document.querySelector(`#${SECTION_NAME}-section`);
  if (currentSection && !currentSection.classList.contains('hidden')) {
    setTimeout(() => {
      // Check for expired products and load products when section becomes active
      loadProducts();
    }, 100);
  }
});

// Validate product registration for similar names with same measurement unit
async function validateProductRegistration(name, measurementUnit) {
  try {
    const newNameNorm = normalizeProductName(name);
    if (newNameNorm.length < 3) {
      return { isValid: true, similarProduct: null };
    }

    const response = await fetch(`${API_BASE_URL}/ecommerce/products`);
    const data = await response.json();
    const products = response.ok ? data.result || [] : [];
    
    const isProductDisposed = (product) => {
      return (
        product?.disposal_status === 'Disposed' ||
        (product?.product_name && product.product_name.includes('[DISPOSED'))
      );
    };

    const similarProduct = products.find((product) => {
      if (isProductDisposed(product)) return false; // allow duplicates of disposed products
      const existingNameNorm = normalizeProductName(product.product_name);
      if (!existingNameNorm) return false;
      const existingUnit = String(product.measurement_unit || '').toLowerCase();
      const incomingUnit = String(measurementUnit || '').toLowerCase();
      // Consider duplicate only when BOTH name and measurement unit match
      return existingNameNorm === newNameNorm && existingUnit === incomingUnit;
    });

    if (similarProduct) {
      return { isValid: false, similarProduct };
    }

    return { isValid: true, similarProduct: null };
  } catch (error) {
    console.error('Error validating product registration:', error);
    // If there's an error, allow registration to proceed
    return { isValid: true, similarProduct: null };
  }
}

// Show similar product found modal (restriction)
function showSimilarProductModal(similarProduct, attemptedName) {
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-40 hidden" id="similarProductModal">
      <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-red-500 to-red-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Similar Product Found ${getEmoji('⚠️', 26)}</p>
          <p class="text-xs">A product with similar name already exists</p>
        </div>
        <div class="p-6 text-sm text-gray-700">
          <p class="mb-3">Attempted name: <span class="font-semibold">${attemptedName}</span></p>
          <div class="bg-gray-50 p-3 rounded border">
            <p class="text-gray-600 mb-1">Existing product:</p>
            <p class="font-semibold text-gray-900">${similarProduct.product_name}</p>
            <p class="text-xs text-gray-500 mt-1">ID: ${similarProduct.product_id.split('_').slice(0, 2).join('_')}</p>
            <p class="text-xs text-gray-500">Current quantity: ${similarProduct.quantity}</p>
            <p class="text-xs text-gray-500">Price: ${main.formatPrice(similarProduct.price)}</p>
            <p class="text-xs text-gray-500">Category: ${main.getSelectedOption(similarProduct.category, CATEGORIES)}</p>
          </div>
          <p class="mt-4 text-red-600 font-medium">Product registration blocked to prevent duplicates.</p>
          <p class="text-sm text-gray-600 mt-2">Please use a different name or contact the existing product.</p>
          <div class="flex gap-3 mt-5">
            <button type="button" id="similarProductOkBtn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('similarProductModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const close = () => {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };

  document.getElementById('similarProductOkBtn').addEventListener('click', close);
  
  // Close on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  document.addEventListener('keydown', handleEscape);
  modal.dataset.escapeHandler = 'true';
}


function mainBtnFunction() {
  const inputs = createModalInputs();

  main.openModal(mainBtn, inputs, async (result) => {
    const name = result.image.short[0].value;
    const [price, quantity, expirationDate] = result.short.map((item) => item.value);
    const measurement = result.image.short[1].value?.trim() || '';
    const measurementUnit = main.getSelectedSpinner(result.image.spinner[0]);

    if (!main.validateStockInputs(price, quantity, measurement)) return;

    // Validate for similar products before proceeding
    const validation = await validateProductRegistration(name, measurementUnit);
    if (!validation.isValid) {
      showSimilarProductModal(validation.similarProduct, name);
      return;
    }

    addProduct(result, name, +price, +quantity, measurement, expirationDate);
  });
}

async function addProduct(result, name, price, quantity, measurement, expirationDate) {
  const category = main.getSelectedSpinner(result.spinner[0]);
  const measurementUnit = main.getSelectedSpinner(result.image.spinner[0]);

  const productData = {
    product_name: name,
    product_name_encoded: main.encodeText(name),
    price,
    price_encoded: main.encodePrice(price),
    quantity,
    measurement_value: measurement,
    measurement_unit: measurementUnit,
    category,
    image_url: result.image.src,
    expiration_date: expirationDate || null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (response.ok) {
      logAction(
        'Add product',
        {
          id: data.result.product_id,
          image: result.image.src,
          name,
          price,
          quantity,
          measurement,
          measurementUnit,
          category,
          expirationDate,
          date: new Date().toISOString(),
        },
        'product_create'
      );

      main.createNotifDot(SECTION_NAME, 1);
      main.toast(`${name}, successfully added!`, 'success');
      main.closeModal();

      // Reload products and stats
      loadProducts();
    } else {
      main.toast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Error adding product:', error);
    main.toast('Error: Failed to add product', 'error');
  }
}

// Check for expired products and automatically dispose them
async function checkAndDisposeExpiredProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products/check-expired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok && data.disposed_count > 0) {
      // Show notification about disposed products
      main.toast(`${data.disposed_count} expired product(s) automatically moved to Disposed Products tab`, 'info');
      
      // Log the action
      logAction(
        'Auto-dispose expired products',
        {
          disposed_count: data.disposed_count,
          disposed_products: data.result,
          date: new Date().toISOString(),
        },
        'product_auto_dispose'
      );
    }
  } catch (error) {
    console.error('Error checking expired products:', error);
    // Don't show error to user as this is a background process
  }
}

async function loadProducts() {
  try {
    // First, check for expired products and automatically dispose them
    await checkAndDisposeExpiredProducts();
    
    const response = await fetch(`${API_BASE_URL}/ecommerce/products`);
    const data = await response.json();

    if (response.ok) {
      const products = data.result || [];

      // Tab 1: Unique Products (All stocks) — exclude disposed products
      const activeProducts = products.filter(
        (p) => !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))
      );
      displayProductsForTab(activeProducts, 1);

      // Tab 2: Low Stock Products (About to be out of stock)
      displayProductsForTab(
        products.filter((p) => (+p.quantity > 10 && +p.quantity <= 50) && !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))),
        2
      );

      // Tab 3: Out of Stock Products (Dead stocks)
      displayProductsForTab(
        products.filter((p) => +p.quantity === 0 || p.stock_status === 'Out of Stock'),
        3
      );

      // Tab 4: Best Selling Products (Fast moving stocks)
      displayProductsForTab(
        products.filter((p) => +p.quantity > 50 && !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))),
        4
      );

      // Tab 5: Least Selling Products (Slow moving stocks)
      displayProductsForTab(
        products.filter((p) => +p.quantity > 0 && +p.quantity <= 10 && !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))),
        5
      );

      // Tab 6: Super Low Stock Products (Critical stock levels)
      displayProductsForTab(
        products.filter(
          (p) =>
            ((+p.quantity > 0 && +p.quantity <= 10) || p.stock_status === 'Super Low Stock') &&
            !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))
        ),
        6
      );

      // Tab 7: Disposed Products (Expired or damaged products)
      displayProductsForTab(
        products.filter((p) => p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed'))),
        7
      );

      // Update stats using the same logic as the tabs
      computeAndUpdateStats(products);
    } else {
      console.error('Error loading products:', data.error);
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/stock/stats`);
    const data = await response.json();

    if (response.ok) {
      updateStatsDisplay(data.result);
    } else {
      console.error('Error loading stats:', data.error);
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Computes stats client-side using the exact same logic as the tabs and updates the UI
function computeAndUpdateStats(products) {
  if (!Array.isArray(products)) {
    return;
  }

  // Use the exact same filtering logic as the tabs to ensure stats match tab counts
  
  // Tab 1: Unique Products (All stocks) — exclude disposed products
  const uniqueProducts = products.filter(
    (p) => !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))
  ).length;

  // Tab 2: Low Stock Products (About to be out of stock)
  const lowStock = products.filter(
    (p) => (+p.quantity > 10 && +p.quantity <= 50) && !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))
  ).length;

  // Tab 3: Out of Stock Products (Dead stocks)
  const outOfStock = products.filter(
    (p) => +p.quantity === 0 || p.stock_status === 'Out of Stock'
  ).length;

  // Tab 4: Best Selling Products (Fast moving stocks)
  const bestSelling = products.filter(
    (p) => +p.quantity > 50 && !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))
  ).length;

  // Tab 5: Least Selling Products (Slow moving stocks)
  const slowMoving = products.filter(
    (p) => +p.quantity > 0 && +p.quantity <= 10 && !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))
  ).length;

  // Tab 6: Super Low Stock Products (Critical stock levels)
  const superLowStock = products.filter(
    (p) =>
      ((+p.quantity > 0 && +p.quantity <= 10) || p.stock_status === 'Super Low Stock') &&
      !(p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed')))
  ).length;

  // Tab 7: Disposed Products (Expired or damaged products)
  const disposed = products.filter(
    (p) => p.disposal_status === 'Disposed' || (p.product_name && p.product_name.toLowerCase().includes('disposed'))
  ).length;

  updateStatsDisplay({
    total_products: uniqueProducts,
    low_stock: lowStock,
    super_low_stock: superLowStock,
    out_of_stock: outOfStock,
    best_selling: bestSelling,
    slow_moving: slowMoving,
    disposed: disposed,
  });
}

// Updates the section stats display
// [0] Unique Products (All active stocks)
// [1] Low Stock Products (About to be out of stock)
// [2] Out of Stock Products (Dead stocks)
// [3] Best Selling Products (Fast moving stocks)
// [4] Least Selling Products (Slow moving stocks)
// [5] Super Low Stock Products (Critical stock levels)
// Note: Disposed products stat is calculated but not displayed in the main stats
function updateStatsDisplay(stats) {
  const statElements = document.querySelectorAll(`#${SECTION_NAME}SectionStats`);

  if (statElements.length >= 6) {
    // Unique Products: All active stocks
    const uniqueProductsStat = statElements[1];
    if (uniqueProductsStat) {
      const valueElement = uniqueProductsStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.total_products || 0;
      }
    }

    // Low Stock Products: About to be out of stock
    const lowStockStat = statElements[2];
    if (lowStockStat) {
      const valueElement = lowStockStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.low_stock || 0;
      }
    }

    // Out of Stock Products: Dead stocks
    const outOfStockStat = statElements[3];
    if (outOfStockStat) {
      const valueElement = outOfStockStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.out_of_stock || 0;
      }
    }

    // Best Selling Products: Fast moving stocks
    const bestSellingStat = statElements[4];
    if (bestSellingStat) {
      const valueElement = bestSellingStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.best_selling || 0;
      }
    }

    // Least Selling Products: Slow moving stocks
    const slowMovingStat = statElements[5];
    if (slowMovingStat) {
      const valueElement = slowMovingStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.slow_moving || 0;
      }
    }

    // Super Low Stock Products: Critical stock levels
    const superLowStockStat = statElements[6];
    if (superLowStockStat) {
      const valueElement = superLowStockStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.super_low_stock || 0;
      }
    }
  }
}

function displayProductsForTab(products, tabIndex) {
  // Clear existing products first on the specific tab
  const emptyCell = document.getElementById(`${SECTION_NAME}SectionOneListEmpty${tabIndex}`);
  if (emptyCell) {
    const tbody = emptyCell.closest('tbody');
    if (tbody) {
      const existingRows = Array.from(tbody.querySelectorAll('tr:not(:first-child)'));
      existingRows.forEach((row) => row.remove());
    }
    // Show the empty placeholder until new rows are added
    emptyCell.parentElement.classList.remove('hidden');
  }

  // Update tab title with count for disposed products (tab 6)
  updateTabTitleWithCount(tabIndex, products.length);

  if (!products || products.length === 0) {
    return;
  }

  products.forEach((product) => {
    const displayId = (product.product_id && product.product_id.split('_').slice(0, 2).join('_')) || product.product_id;
    const isDisposed = product.disposal_status === 'Disposed' || (product.product_name && product.product_name.toLowerCase().includes('disposed'));
    
    const columnsData = [
      displayId,
      {
        type: 'object',
        data: [product.image_url || '/src/images/client_logo.jpg', product.product_name],
      },
      main.formatPrice(product.price),
      product.quantity + '',
      isDisposed ? `<div class="text-center">Disposed ${getEmoji('🗑️')}</div>` : main.getStockStatus(product.quantity),
      product.measurement_value || '',
      product.measurement_unit || '',
      main.getSelectedOption(product.category, CATEGORIES),
      product.expiration_date ? new Date(product.expiration_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }) : 'No expiration',
      'custom_date_today',
    ];

    main.createAtSectionOne(SECTION_NAME, columnsData, tabIndex, (frontendResult) => {
      // Set the actual date
      if (product.created_at) {
        const date = new Date(product.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        frontendResult.dataset.date = date;
        // Adjusted index due to added Expiration Date column
        frontendResult.children[9].innerHTML = date;
      }

      // Set up the product data for editing
      frontendResult.dataset.id = product.product_id;
      frontendResult.dataset.image = product.image_url || '/src/images/client_logo.jpg';
      // Keep dataset.text consistent with duplicate detection (use raw name)
      frontendResult.dataset.text = product.product_name;
      frontendResult.dataset.custom2 = product.price_encoded;
      frontendResult.dataset.custom3 = product.quantity;
      frontendResult.dataset.custom4 = product.stock_status;
      frontendResult.dataset.custom5 = product.measurement_value;
      frontendResult.dataset.custom6 = product.measurement_unit;
      // custom7 now maps to category after removing purchase_type
      frontendResult.dataset.custom7 = product.category;
      frontendResult.dataset.custom8 = product.expiration_date || '';
      frontendResult.dataset.disposalStatus = product.disposal_status || 'Active';
      frontendResult.dataset.disposalReason = product.disposal_reason || '';
      frontendResult.dataset.disposalNotes = product.disposal_notes || '';
      frontendResult.dataset.disposedAt = product.disposed_at || '';

      // Setup action buttons (only for non-disposed products)
      if (!isDisposed) {
        setupProductDetailsButton(frontendResult);
      } else {
        setupDisposedProductButton(frontendResult);
      }
    });
  });
}

// Function to update tab title with count badge
function updateTabTitleWithCount(tabIndex, count) {
  // Only update tab 7 (Disposed Products)
  if (tabIndex !== 7) return;
  
  const tabElement = document.getElementById(`${SECTION_NAME}_tab${tabIndex}`);
  if (!tabElement) return;
  
  const tabTitleElement = tabElement.children[0]; // First child contains the title
  if (!tabTitleElement) return;
  
  // Extract the base title (remove any existing count)
  const currentTitle = tabTitleElement.textContent.trim();
  const baseTitle = currentTitle.replace(/\s*\(\d+\)\s*$/, '');
  
  // Update the title with the count
  if (count > 0) {
    tabTitleElement.textContent = `${baseTitle} (${count})`;
  } else {
    tabTitleElement.textContent = baseTitle;
  }
}

function setupProductDetailsButton(result) {
  const productDetailsBtn = result.querySelector('#productDetailsBtn');

  if (!productDetailsBtn) return;

  productDetailsBtn.addEventListener('click', () => {
    const productData = {
      image: result.dataset.image,
      name: main.decodeText(result.dataset.text),
      price: main.decodePrice(result.dataset.custom2),
      quantity: result.dataset.custom3,
      measurement: result.dataset.custom5,
      measurementUnit: result.dataset.custom6,
      category: result.dataset.custom7,
      expirationDate: result.dataset.custom8,
    };

    const inputs = createModalInputs(true, productData);

    main.openModal(
      'cyan',
      inputs,
      (newResult) => {
        if (checkIfSameData(newResult, productData)) {
          main.toast('You must change anything!', 'error');
          return;
        }
        updateProduct(result, newResult, productData.name);
      },
      () => deleteProduct(result),
      () => disposeProduct(result)
    );
  });
}

function setupDisposedProductButton(result) {
  const productDetailsBtn = result.querySelector('#productDetailsBtn');

  if (!productDetailsBtn) return;

  productDetailsBtn.addEventListener('click', () => {
    const productData = {
      image: result.dataset.image,
      name: main.decodeText(result.dataset.text),
      price: main.decodePrice(result.dataset.custom2),
      quantity: result.dataset.custom3,
      measurement: result.dataset.custom5,
      measurementUnit: result.dataset.custom6,
      category: result.dataset.custom7,
      expirationDate: result.dataset.custom8,
      disposalStatus: result.dataset.disposalStatus || (result.dataset.text && result.dataset.text.includes('[DISPOSED') ? 'Disposed' : 'Active'),
      disposalReason: result.dataset.disposalReason || (result.dataset.text ? extractDisposalReason(result.dataset.text) : ''),
      disposalNotes: result.dataset.disposalNotes || (result.dataset.custom5 ? extractDisposalNotes(result.dataset.custom5) : ''),
      disposedAt: result.dataset.disposedAt || '',
    };

    showDisposedProductDetails(productData);
  });
}

// Helper functions to extract disposal information from fallback format
function extractDisposalReason(productName) {
  const match = productName.match(/\[DISPOSED: (.+?)\]/);
  return match ? match[1] : '';
}

function extractDisposalNotes(measurement) {
  const match = measurement.match(/\| Disposal Notes: (.+)$/);
  return match ? match[1] : '';
}

function showDisposedProductDetails(productData) {
  const disposalDate = productData.disposedAt ? 
    new Date(productData.disposedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : (productData.disposalStatus === 'Disposed' ? 'Recently disposed' : 'Unknown');

  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-30 hidden" id="disposedProductModal">
      <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-gray-500 to-gray-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Disposed Product Details ${getEmoji('🗑️', 26)}</p>
          <p class="text-xs">This product has been disposed</p>
        </div>
        <div class="p-6">
          <div class="mb-4">
            <div class="flex items-center gap-3 mb-3">
              <img src="${productData.image}" alt="${productData.name}" 
                   class="w-16 h-16 object-cover rounded border">
              <div>
                <p class="font-semibold text-gray-900">${productData.name}</p>
                <p class="text-sm text-gray-600">Price: ${main.formatPrice(productData.price)}</p>
                <p class="text-sm text-gray-600">Quantity: ${productData.quantity}</p>
              </div>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Disposal Reason:</label>
            <p class="text-sm text-gray-900 bg-gray-100 p-2 rounded capitalize">${productData.disposalReason || 'Not specified'}</p>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Disposal Notes:</label>
            <p class="text-sm text-gray-900 bg-gray-100 p-2 rounded">${productData.disposalNotes || 'No notes provided'}</p>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Disposed On:</label>
            <p class="text-sm text-gray-900 bg-gray-100 p-2 rounded">${disposalDate}</p>
          </div>
          
          <div class="flex gap-3">
            <button type="button" onclick="closeDisposedProductModal()" 
                    class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('disposedProductModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeDisposedProductModal();
    }
  };
  document.addEventListener('keydown', handleEscape);
  modal.dataset.escapeHandler = 'true';
}

window.closeDisposedProductModal = function () {
  const modal = document.getElementById('disposedProductModal');
  if (modal) {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  }
};

async function updateProduct(result, newResult, name) {
  const newName = newResult.image.short[0].value;
  const [newPrice, newQuantity, newExpirationDate] = newResult.short.map((item) => item.value);
  const newMeasurement = newResult.image.short[1].value?.trim() || '';

  if (!main.validateStockInputs(newPrice, newQuantity, newMeasurement)) return;

  const category = main.getSelectedSpinner(newResult.spinner[0]);
  const measurementUnit = main.getSelectedSpinner(newResult.image.spinner[0]);

  const productData = {
    product_name: newName,
    product_name_encoded: main.encodeText(newName),
    price: +newPrice,
    price_encoded: main.encodePrice(newPrice),
    quantity: +newQuantity,
    measurement_value: newMeasurement,
    measurement_unit: measurementUnit,
    category: category,
    image_url: newResult.image.src,
    expiration_date: newExpirationDate || null,
  };

  main.sharedState.moduleLoad = SECTION_NAME;
  window.showGlobalLoading?.();
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products/${result.dataset.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (response.ok) {
      logAction(
        'Update product details',
        {
          id: result.dataset.id,
          image: newResult.image.src,
          name: newName,
          price: newPrice,
          quantity: newQuantity,
          measurement: newMeasurement,
          measurementUnit,
          category,
          expirationDate: newExpirationDate,
          date: result.dataset.date,
        },
        'product_update'
      );

      main.toast('Successfully updated product details!', 'info');
      main.closeConfirmationModal();
      main.closeModal();

      // Reload products and stats
      loadProducts();
    } else {
      main.toast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Error updating product:', error);
    main.toast('Error: Failed to update product', 'error');
  } finally {
    window.hideGlobalLoading?.();
  }
}

async function deleteProduct(result) {
  main.openConfirmationModal(`Delete product: ${main.decodeText(result.dataset.text)}`, async () => {
  main.sharedState.moduleLoad = SECTION_NAME;
    window.showGlobalLoading?.();
    try {
      const response = await fetch(`${API_BASE_URL}/ecommerce/products/${result.dataset.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        const now = new Date();
        const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

        logAction(
          'Delete product',
          {
            id: result.dataset.id,
            image: result.dataset.image,
            name: main.decodeText(result.dataset.text),
            price: result.dataset.custom2,
            measurement: result.dataset.custom5,
            measurementUnit: result.dataset.custom6,
            category: result.dataset.custom7,
            datetime: `${date} - ${time}`,
          },
          'product_delete'
        );

        main.deleteAtSectionOne(SECTION_NAME, 1, result.dataset.id);
        main.toast('Successfully deleted product!', 'error');
        main.closeConfirmationModal();
        main.closeModal();

        // Reload products and stats
        loadProducts();
      } else {
        main.toast(`Error: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      main.toast('Error: Failed to delete product', 'error');
    } finally {
      window.hideGlobalLoading?.();
    }
  });
}

async function disposeProduct(result) {
  const productName = main.decodeText(result.dataset.text);
  const productId = result.dataset.id;
  
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-30 hidden" id="disposeProductModal">
      <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-red-500 to-red-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Dispose Product ${getEmoji('🗑️', 26)}</p>
          <p class="text-xs">This action cannot be undone</p>
        </div>
        <div class="p-6">
          <div class="mb-4">
            <p class="text-gray-700 mb-2">Are you sure you want to dispose this product?</p>
            <div class="bg-gray-100 p-3 rounded-md">
              <p class="font-semibold text-gray-900">${productName}</p>
              <p class="text-sm text-gray-600">Product ID: ${productId.split('_').slice(0, 2).join('_')}</p>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Reason for disposal:
            </label>
            <select id="disposalReasonSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="expired">Expired</option>
              <option value="damaged">Damaged</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Quantity to dispose:
            </label>
            <input type="number" id="disposalQuantityInput" min="1" max="${result.dataset.custom3}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                   placeholder="Enter quantity to dispose" value="1" required>
            <p class="text-xs text-gray-500 mt-1">Current quantity: ${result.dataset.custom3}</p>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Additional notes (optional):
            </label>
            <textarea id="disposalNotesInput" rows="3" 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Add notes about the disposal..."></textarea>
          </div>
          
          <div class="flex gap-3">
            <button type="button" onclick="closeDisposeProductModal()" 
                    class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Cancel
            </button>
            <button type="button" onclick="confirmDisposeProduct('${productId}')" 
                    class="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500">
              Dispose Product
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const disposeModal = document.getElementById('disposeProductModal');
  disposeModal.classList.remove('hidden');
  disposeModal.classList.add('flex');
  setTimeout(() => {
    disposeModal.classList.add('opacity-100');
    disposeModal.children[0].classList.remove('-translate-y-6');
    disposeModal.children[0].classList.add('scale-100');
  }, 10);

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeDisposeProductModal();
    }
  };
  document.addEventListener('keydown', handleEscape);
  disposeModal.dataset.escapeHandler = 'true';
}

window.closeDisposeProductModal = function () {
  const disposeModal = document.getElementById('disposeProductModal');
  if (disposeModal) {
    disposeModal.classList.remove('opacity-100');
    disposeModal.children[0].classList.add('-translate-y-6');
    disposeModal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      disposeModal.classList.add('hidden');
      disposeModal.classList.remove('flex');
      disposeModal.remove();
    }, 300);
  }
};

// Create a disposal record that will appear in the Disposed Products tab
async function createDisposalRecord(productRow, disposalQuantity, reason, notes) {
  try {
    const originalName = main.decodeText(productRow.dataset.text);
    const disposedName = `[DISPOSED: ${reason}] ${originalName} (${disposalQuantity} items)`;
    const currentDate = new Date().toISOString();
    
    const disposalData = {
      product_name: disposedName,
      product_name_encoded: main.encodeText(disposedName),
      price: main.decodePrice(productRow.dataset.custom2),
      price_encoded: productRow.dataset.custom2,
      quantity: disposalQuantity,
      measurement_value: productRow.dataset.custom5,
      measurement_unit: productRow.dataset.custom6,
      category: productRow.dataset.custom7,
      image_url: productRow.dataset.image,
      disposal_status: 'Disposed',
      disposal_reason: reason,
      disposal_notes: notes,
      disposed_at: currentDate,
    };

    const response = await fetch(`${API_BASE_URL}/ecommerce/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(disposalData),
    });

    if (!response.ok) {
      console.error('Failed to create disposal record:', await response.text());
    }
  } catch (error) {
    console.error('Error creating disposal record:', error);
  }
}

window.confirmDisposeProduct = async function (productId) {
  try {
    const reason = document.getElementById('disposalReasonSelect').value;
    const notes = document.getElementById('disposalNotesInput').value.trim();
    const disposalQuantity = parseInt(document.getElementById('disposalQuantityInput').value);
    
    // Validate disposal quantity
    if (!disposalQuantity || disposalQuantity < 1) {
      main.toast('Please enter a valid quantity to dispose', 'error');
      return;
    }
    
    const productRow = document.querySelector(`tr[data-id="${productId}"]`);
    if (!productRow) {
      main.toast('Product not found', 'error');
      return;
    }
    
    const currentQuantity = parseInt(productRow.dataset.custom3);
    if (disposalQuantity > currentQuantity) {
      main.toast(`Cannot dispose ${disposalQuantity} items. Current quantity is only ${currentQuantity}`, 'error');
      return;
    }

    // Use regular update endpoint to reduce quantity (disposal endpoint doesn't support partial disposal yet)
    const originalName = main.decodeText(productRow.dataset.text);
    const newQuantity = currentQuantity - disposalQuantity;
    
    const response = await fetch(`${API_BASE_URL}/ecommerce/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_name: originalName,
        product_name_encoded: main.encodeText(originalName),
        price: main.decodePrice(productRow.dataset.custom2),
        price_encoded: productRow.dataset.custom2,
        quantity: newQuantity,
        measurement_value: productRow.dataset.custom5,
        measurement_unit: productRow.dataset.custom6,
        category: productRow.dataset.custom7,
        expiration_date: productRow.dataset.custom8,
        image_url: productRow.dataset.image,
      }),
    });
    
    const result = await response.json();

    if (response.ok) {
      // Create a disposal record that will appear in the Disposed Products tab
      await createDisposalRecord(productRow, disposalQuantity, reason, notes);
      
      logAction(
        'Dispose product',
        {
          id: productId,
          name: originalName,
          reason: reason,
          notes: notes,
          disposal_quantity: disposalQuantity,
          original_quantity: currentQuantity,
          remaining_quantity: newQuantity,
          disposed_at: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
        },
        'product_dispose'
      );

      main.toast(`Disposed ${disposalQuantity} items. Remaining quantity: ${newQuantity}`, 'success');
      closeDisposeProductModal();
      main.closeModal();

      // Reload products and stats
      loadProducts();
    } else {
      main.toast(`Error: ${result.error || 'Failed to dispose product'}`, 'error');
    }
  } catch (error) {
    console.error('Error disposing product:', error);
    main.toast('Network error: Failed to dispose product', 'error');
  }
};

const createModalInputs = (isUpdate = false, productData = {}) => ({
  header: {
    title: `${isUpdate ? 'Update' : 'Add'} Product ${getEmoji('🧊', 26)}`,
    subtitle: 'Add product form',
  },
  image: {
    src: productData.image || '/src/images/client_logo.jpg',
    type: 'normal',
    short: [
      { placeholder: 'Product name', value: productData.name || '', required: true },
      {
        placeholder: 'Product measurement value',
        value: productData.measurement || '',
        // Lock initially if the selected unit is a clothing size
        locked:
          productData && productData.measurementUnit
            ? CLOTHING_SIZE_UNITS.has(String(productData.measurementUnit).toLowerCase())
            : false,
      },
    ],
    spinner: [
      {
        label: 'Product measurement unit',
        placeholder: 'Select product measurement unit',
        selected: productData.measurementUnit || 0,
        options: MEASUREMENT_UNITS,
        // Toggle measurement value editability when clothing size is chosen
        listener: (_selectedIndex, container) => {
          try {
            const unitSelect = container.querySelector('#input-spinner-1');
            const measurementInput = container.querySelector('#input-short-2');
            if (!unitSelect || !measurementInput) return;

            const selectedUnit = String(unitSelect.value || '').toLowerCase();
            const shouldLock = CLOTHING_SIZE_UNITS.has(selectedUnit);

            measurementInput.readOnly = shouldLock;
            measurementInput.classList.toggle('bg-gray-200', shouldLock);
            measurementInput.classList.toggle('text-gray-500', shouldLock);
            if (shouldLock) {
              measurementInput.value = '';
              measurementInput.dispatchEvent(new Event('input'));
            }
          } catch (_e) {}
        },
      },
    ],
  },
  short: [
    { placeholder: 'Price', value: productData.price || '', required: true },
    { placeholder: 'Initial quantity', value: productData.quantity || '', required: true },
    { placeholder: 'Expiration date (YYYY-MM-DD)', value: productData.expirationDate || '', type: 'date' },
  ],
  spinner: [
    {
      label: 'Product category',
      placeholder: 'Select product category',
      selected: productData.category || 0,
      required: true,
      options: CATEGORIES,
    },
  ],
  ...(isUpdate && {
    footer: {
      main: `Update Product ${getEmoji('🧊')}`,
      // sub: `Delete ${getEmoji('⚠️')}`,
      third: `Dispose ${getEmoji('🗑️')}`,
    },
  }),
});

const logAction = (action, data, type) => {
  accesscontrol.log({ module: MODULE_NAME, submodule: SUBMODULE_NAME, description: action }, { ...data, type: type });
};

function checkIfSameData(newData, oldData) {
  return (
    newData.image.src == oldData.image &&
    newData.image.short[0].value == oldData.name &&
    newData.short[0].value == oldData.price &&
    newData.short[1].value == oldData.quantity &&
    newData.image.short[1].value == oldData.measurement &&
    main.getSelectedSpinner(newData.image.spinner[0]) == oldData.measurementUnit &&
    main.getSelectedSpinner(newData.spinner[0]) == oldData.category &&
    newData.short[2].value == oldData.expirationDate
  );
}

function refreshAllTabs() {
  loadProducts();
}

// Test function for expiration logic (can be called from browser console)
window.testExpirationLogic = async function() {
  console.log('Testing expiration logic...');
  try {
    await checkAndDisposeExpiredProducts();
    console.log('Expiration check completed');
  } catch (error) {
    console.error('Error testing expiration logic:', error);
  }
};