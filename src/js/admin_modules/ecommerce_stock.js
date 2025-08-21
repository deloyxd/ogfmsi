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
];

let mainBtn;

document.addEventListener('ogfmsiAdminMainLoaded', () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
  mainBtn?.removeEventListener('click', mainBtnFunction);
  mainBtn?.addEventListener('click', mainBtnFunction);
  
  // Load products and stats on page load
  loadProducts();
  loadStats();
});

// Listen for section changes to refresh stats when this section becomes active
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the ecommerce-stock section
  const currentSection = document.querySelector(`#${SECTION_NAME}-section`);
  if (currentSection && !currentSection.classList.contains('hidden')) {
    // Section is already active, load stats
    setTimeout(() => {
      loadStats();
    }, 100);
  }
});

function mainBtnFunction() {
  const inputs = createModalInputs();

  main.openModal(mainBtn, inputs, (result) => {
    const [name, price, quantity] = result.image.short.map((item) => item.value);
    const measurement = result.short[0].value?.trim() || '';

    if (!main.validateStockInputs(price, quantity, measurement)) return;

    registerProduct(result, name, +price, +quantity, measurement);
  });
}

async function registerProduct(result, name, price, quantity, measurement) {
  const category = main.getSelectedSpinner(result.spinner[0]);
  const measurementUnit = main.getSelectedSpinner(result.spinner[1]);

  const productData = {
    product_name: name,
    product_name_encoded: main.encodeText(name),
    price: price,
    price_encoded: main.encodePrice(price),
    quantity: quantity,
    measurement_value: measurement,
    measurement_unit: measurementUnit,
    category: category,
    image_url: result.image.src
  };

  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData)
    });

    const data = await response.json();

    if (response.ok) {
      logAction(
        'Register product',
        {
          id: data.result.product_id,
          image: result.image.src,
          name: name,
          price: price,
          quantity: quantity,
          measurement: measurement,
          measurementUnit: measurementUnit,
          category: category,
          date: new Date().toISOString(),
        },
        'product_create'
      );

      main.createRedDot(SECTION_NAME, 1);
      main.toast(`${name}, successfully registered!`, 'success');
      main.closeModal();
      
      // Reload products and stats
      loadProducts();
      loadStats();

    } else {
      main.toast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Error registering product:', error);
    main.toast('Error: Failed to register product', 'error');
  }
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products`);
    const data = await response.json();

    if (response.ok) {
      displayProducts(data.result);
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

// current logic:
// Updates the section stats display
// [0] Total unique products
// [1] Low stock items (<=5)
// [2] Out of stock items (0)
// [3] Best selling products (>50 sold)
// [4] Slow moving products (<=10 but >0)
function updateStatsDisplay(stats) {
  const statElements = document.querySelectorAll(`#${SECTION_NAME}SectionStats`);
  
  if (statElements.length >= 5) {
    const uniqueProductsStat = statElements[0];
    if (uniqueProductsStat) {
      const valueElement = uniqueProductsStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.total_products || 0;
      }
    }

    const lowStockStat = statElements[1];
    if (lowStockStat) {
      const valueElement = lowStockStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.low_stock || 0;
      }
    }

    const outOfStockStat = statElements[2];
    if (outOfStockStat) {
      const valueElement = outOfStockStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.out_of_stock || 0;
      }
    }

    const bestSellingStat = statElements[3];
    if (bestSellingStat) {
      const valueElement = bestSellingStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.best_selling || 0;
      }
    }

    const slowMovingStat = statElements[4];
    if (slowMovingStat) {
      const valueElement = slowMovingStat.querySelector('.section-stats-c');
      if (valueElement) {
        valueElement.textContent = stats.slow_moving || 0;
      }
    }
  }
}

function displayProducts(products) {
  // Clear existing products first (correctly targets the generated table structure)
  const emptyCell = document.getElementById(`${SECTION_NAME}SectionOneListEmpty1`);
  if (emptyCell) {
    const tbody = emptyCell.closest('tbody');
    if (tbody) {
      const existingRows = Array.from(tbody.querySelectorAll('tr:not(:first-child)'));
      existingRows.forEach((row) => row.remove());
    }
    // Show the empty placeholder until new rows are added
    emptyCell.parentElement.classList.remove('hidden');
  }

  if (!products || products.length === 0) {
    return;
  }

  products.forEach((product) => {
    const displayId = (product.product_id && product.product_id.split('_').slice(0, 2).join('_')) || product.product_id;
    const columnsData = [
      displayId,
      {
        type: 'object_product',
        data: [product.image_url || '/src/images/client_logo.jpg', product.product_name],
      },
      main.encodePrice(product.price),
      product.quantity + '',
      main.getStockStatus(product.quantity),
      product.measurement_value || '',
      product.measurement_unit || '',
      product.category,
      'custom_date_today',
    ];

    main.createAtSectionOne(
      SECTION_NAME,
      columnsData,
      1,
      product.product_name,
      (frontendResult) => {
          // Set the actual date
          if (product.created_at) {
            const date = new Date(product.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            frontendResult.dataset.date = date;
            frontendResult.children[8].innerHTML = date; // Date is the 9th column (index 8)
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
        frontendResult.dataset.custom7 = product.category;

          // Setup action buttons
          setupProductDetailsButton(frontendResult);
      }
    );
  });
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
      () => deleteProduct(result)
    );
  });
}

async function updateProduct(result, newResult, name) {
  const [newName, newPrice, newQuantity] = newResult.image.short.map((item) => item.value);
  const newMeasurement = newResult.short[0].value?.trim() || '';

  if (!main.validateStockInputs(newPrice, newQuantity, newMeasurement)) return;

  const category = main.getSelectedSpinner(newResult.spinner[0]);
  const measurementUnit = main.getSelectedSpinner(newResult.spinner[1]);

  const productData = {
    product_name: newName,
    product_name_encoded: main.encodeText(newName),
    price: +newPrice,
    price_encoded: main.encodePrice(newPrice),
    quantity: +newQuantity,
    measurement_value: newMeasurement,
    measurement_unit: measurementUnit,
    category: category,
    image_url: newResult.image.src
  };

  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products/${result.dataset.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData)
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
          measurementUnit: measurementUnit,
          category: category,
          date: result.dataset.date,
        },
        'product_update'
      );

      main.toast('Successfully updated product details!', 'info');
      main.closeConfirmationModal();
      main.closeModal();
      
      // Reload products and stats
      loadProducts();
      loadStats();
    } else {
      main.toast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Error updating product:', error);
    main.toast('Error: Failed to update product', 'error');
  }
}

async function deleteProduct(result) {
  main.openConfirmationModal(`Delete product: ${main.decodeText(result.dataset.text)}`, async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ecommerce/products/${result.dataset.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        const now = new Date();
        const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

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
        loadStats();
      } else {
        main.toast(`Error: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      main.toast('Error: Failed to delete product', 'error');
    }
  });
}

const createModalInputs = (isUpdate = false, productData = {}) => ({
  header: {
    title: `${isUpdate ? 'Update' : 'Register'} Product ${getEmoji('🧊', 26)}`,
    subtitle: 'Unique product form',
  },
  image: {
    src: productData.image || '/src/images/client_logo.jpg',
    type: 'normal',
    short: [
      { placeholder: 'Product name', value: productData.name || '', required: true },
      { placeholder: 'Price', value: productData.price || '', required: true },
      { placeholder: 'Initial quantity', value: productData.quantity || '', required: true },
    ],
  },
  short: [{ placeholder: 'Product measurement value', value: productData.measurement || '' }],
  spinner: [
    {
      label: 'Product category',
      placeholder: 'Select product category',
      selected: productData.category || 0,
      required: true,
      options: CATEGORIES,
    },
    {
      label: 'Product measurement unit',
      placeholder: 'Select product measurement unit',
      selected: productData.measurementUnit || 0,
      options: MEASUREMENT_UNITS,
    },
  ],
  ...(isUpdate && {
    footer: {
      main: `Update Product ${getEmoji('🧊')}`,
      sub: `Delete ${getEmoji('💀')}`,
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
    newData.image.short[1].value == oldData.price &&
    newData.image.short[2].value == oldData.quantity &&
    newData.short[0].value == oldData.measurement &&
    main.getSelectedSpinner(newData.spinner[1]) == oldData.measurementUnit &&
    main.getSelectedSpinner(newData.spinner[0]) == oldData.category
  );
}

function refreshAllTabs() {
  loadProducts();
  loadStats();
}