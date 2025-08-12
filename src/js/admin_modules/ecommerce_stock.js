import main from '../admin_main.js';
import accesscontrol from './accesscontrol.js';

const SECTION_NAME = 'ecommerce-stock';
const CATEGORIES = [
  { value: 'supplements-nutrition', label: 'Supplements & Nutrition' },
  { value: 'food-meals', label: 'Food & Meals' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'fitness-equipment', label: 'Fitness Equipment' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'other', label: 'Other' },
];

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
  // Countable units
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
  // Size/Dimension
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
  mainBtn?.addEventListener('click', showAddProductModal);
});

const formatPrice = (price) => `₱${price.toFixed(2)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const getStockStatus = (quantity) => {
  if (quantity === 0) return '<p class="text-gray-800 font-bold">Out of Stock ⚠️</p>';
  if (quantity <= 10) return '<p class="text-red-700 font-bold">Super Low Stock ‼️</p>';
  if (quantity <= 50) return '<p class="text-amber-500 font-bold">Low Stock ⚠️</p>';
  return '<p class="text-emerald-600 font-bold">High Stock ✅</p>';
};

const validateInputs = (price, quantity, measurement) => {
  if (!main.isValidPaymentAmount(+price)) {
    main.toast(`Invalid price: ${price}`, 'error');
    return false;
  }
  if (!main.isValidPaymentAmount(+quantity)) {
    main.toast(`Invalid quantity: ${quantity}`, 'error');
    return false;
  }
  if (measurement && !main.isValidPaymentAmount(+measurement)) {
    main.toast('Invalid measurement', 'error');
    return false;
  }
  return true;
};

const createModalInputs = (isUpdate = false, productData = {}) => ({
  header: {
    title: `${isUpdate ? 'Update' : 'Register'} Product 🧊`,
    subtitle: 'Unique product form',
  },
  image: {
    src: productData.image || '/src/images/client_logo.jpg',
    type: 'normal',
    short: [
      { 
        placeholder: 'Product name', 
        value: productData.name || '', 
        required: true 
      },
      { 
        placeholder: 'Price', 
        value: productData.price || '', 
        required: true 
      },
      { 
        placeholder: 'Initial quantity', 
        value: productData.quantity || '', 
        required: true 
      },
    ],
  },
  short: [{ 
    placeholder: 'Product measurement value', 
    value: productData.measurement || '' 
  }],
  spinner: [
    {
      label: 'Product category',
      placeholder: 'Select product category',
      selected: productData.categoryIndex || 0,
      required: true,
      options: CATEGORIES,
    },
    {
      label: 'Product measurement unit',
      placeholder: 'Select product measurement unit',
      selected: productData.unitIndex || 0,
      options: MEASUREMENT_UNITS,
    },
  ],
  ...(isUpdate && {
    footer: {
      main: 'Update Product 🧊',
      sub: 'Delete 💀',
    }
  })
});

const logAction = (action, data) => {
  accesscontrol.log({
    module: 'E-Commerce',
    submodule: 'Stock',
    description: action,
  }, { ...data, type: 'product' });
};

function showAddProductModal() {
  const inputs = createModalInputs();
  
  main.openModal(mainBtn, inputs, (result) => {
    const [name, price, quantity] = result.image.short.map(item => item.value);
    const measurement = result.short[0].value?.trim() || '';
    
    if (!validateInputs(price, quantity, measurement)) return;
    
    registerProduct(result, name, +price, +quantity, measurement);
  });
}

function registerProduct(result, name, price, quantity, measurement) {
  const category = result.spinner[0].options[result.spinner[0].selected - 1].value;
  const measurementUnit = result.spinner[1].selected > 0 
    ? result.spinner[1].options[result.spinner[1].selected - 1].value 
    : '';

  const columnsData = [
    'id_P_random',
    {
      type: 'object',
      data: [result.image.src, name.replace(/\s+/g, ':://')],
    },
    formatPrice(price),
    quantity.toString(),
    getStockStatus(quantity),
    measurement,
    measurementUnit,
    category,
    'custom_date_today',
  ];

  main.createAtSectionOne(SECTION_NAME, columnsData, 1, name, (result, status) => {
    if (status === 'success') {
      setupProductDetailsButton(result, name);
      
      logAction('Register product', {
        id: result.dataset.id,
        image: result.dataset.image,
        name,
        price,
        quantity,
        measurement,
        measurementUnit,
        category,
        date: result.dataset.date,
      });

      main.createRedDot(SECTION_NAME, 1);
      main.toast(`${name}, successfully registered!`, 'success');
      main.closeModal();
    } else {
      main.toast(`Error: Product duplication detected: ${result.dataset.id}`, 'error');
    }
  });
}

function setupProductDetailsButton(result, name) {
  const productDetailsBtn = result.querySelector('#productDetailsBtn');
  
  productDetailsBtn.addEventListener('click', () => {
    const productData = {
      image: result.dataset.image,
      name: result.dataset.text.replace(/\:\:\/\//g, ' '),
      price: result.dataset.custom2.replace(/[^\d.-]/g, ''),
      quantity: result.dataset.custom3,
      measurement: result.dataset.custom5,
      categoryIndex: result.dataset.custom7,
      unitIndex: result.dataset.custom6,
    };
    
    const inputs = createModalInputs(true, productData);
    
    main.openModal('cyan', inputs, 
      (newResult) => updateProduct(result, newResult, name),
      () => deleteProduct(result, name)
    );
  });
}

function updateProduct(result, newResult, name) {
  const [newName, newPrice, newQuantity] = newResult.image.short.map(item => item.value);
  const newMeasurement = newResult.short[0].value?.trim() || '';
  
  if (!validateInputs(newPrice, newQuantity, newMeasurement)) return;
  
  main.openConfirmationModal(`Update item stock: ${name}`, () => {
    const category = newResult.spinner[0].options[newResult.spinner[0].selected - 1].value;
    const measurementUnit = newResult.spinner[1].selected > 0
      ? newResult.spinner[1].options[newResult.spinner[1].selected - 1].value
      : '';

    const columnsData = [
      `id_${result.dataset.id}`,
      {
        type: 'object',
        data: [newResult.image.src, newName.replace(/\s+/g, ':://')],
      },
      formatPrice(+newPrice),
      +newQuantity,
      getStockStatus(+newQuantity),
      newMeasurement,
      measurementUnit,
      category,
      `custom_date_${result.dataset.date}`,
    ];

    main.updateAtSectionOne(SECTION_NAME, columnsData, 1, result.dataset.id, (updatedResult) => {
      logAction('Update item stock details', {
        id: updatedResult.dataset.id,
        image: updatedResult.dataset.image,
        name: updatedResult.dataset.text,
        price: updatedResult.dataset.price,
        quantity: updatedResult.dataset.quantity,
        measurement: updatedResult.dataset.measurement,
        measurementUnit: updatedResult.dataset.measurementUnit,
        category: updatedResult.dataset.category,
        date: updatedResult.dataset.date,
      });

      main.toast('Successfully updated item stock details!', 'info');
      main.closeConfirmationModal();
      main.closeModal();
    });
  });
}

function deleteProduct(result, name) {
  main.openConfirmationModal(`Delete item stock: ${name}`, () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    logAction('Delete item stock', {
      id: result.dataset.id,
      image: result.dataset.image,
      name: result.dataset.text,
      price: result.dataset.price,
      measurement: result.dataset.measurement,
      measurementUnit: result.dataset.measurementUnit,
      category: result.dataset.category,
      datetime: `${date} - ${time}`,
    });

    main.deleteAtSectionOne(SECTION_NAME, 1, result.dataset.id);
    main.toast('Successfully deleted item stock!', 'error');
    main.closeConfirmationModal();
    main.closeModal();
  });
}

function refreshAllTabs() {
}