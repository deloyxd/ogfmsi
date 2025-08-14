import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';

const SECTION_NAME = 'ecommerce-stock';
const MODULE_NAME = 'E-Commerce';
const SUBMODULE_NAME = 'Stock';

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
  mainBtn?.addEventListener('click', mainBtnFunction);
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

function registerProduct(result, name, price, quantity, measurement) {
  const category = main.getSelectedSpinner(result.spinner[0]);
  const measurementUnit = main.getSelectedSpinner(result.spinner[1]);

  const columnsData = [
    'id_P_random',
    { type: 'object', data: [result.image.src, main.encodeText(name)] },
    main.encodePrice(price), // dataset.custom2
    quantity + '', // dataset.custom3
    main.getStockStatus(quantity), // dataset.custom4
    measurement, // dataset.custom5
    measurementUnit, // dataset.custom6
    category, // dataset.custom7
    'custom_date_today',
  ];

  main.createAtSectionOne(SECTION_NAME, columnsData, 1, name, (result, status) => {
    if (status === 'success') {
      setupProductDetailsButton(result);
      logAction(
        'Register product',
        {
          id: result.dataset.id,
          image: result.dataset.image,
          name: main.decodeText(result.dataset.text),
          price: result.dataset.custom2,
          quantity: result.dataset.custom3,
          measurement: result.dataset.custom5,
          measurementUnit: result.dataset.custom6,
          category: result.dataset.custom7,
          date: result.dataset.date,
        },
        'product_create'
      );

      main.createRedDot(SECTION_NAME, 1);
      main.toast(`${name}, successfully registered!`, 'success');
      main.closeModal();
    } else {
      main.toast(`Error: Product duplication detected: ${result.dataset.id}`, 'error');
    }
  });
}

function setupProductDetailsButton(result) {
  const productDetailsBtn = result.querySelector('#productDetailsBtn');

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

function updateProduct(result, newResult, name) {
  const [newName, newPrice, newQuantity] = newResult.image.short.map((item) => item.value);
  const newMeasurement = newResult.short[0].value?.trim() || '';

  if (!main.validateStockInputs(newPrice, newQuantity, newMeasurement)) return;

  main.findAtSectionOne(
    SECTION_NAME,
    main.encodeText(newResult.image.short[0].value),
    'equal_text',
    1,
    (findResult) => {
      if (findResult && findResult != result) {
        main.toast('That name already exist!', 'error');
        return;
      }

      main.openConfirmationModal(`Update product: ${name}`, () => {
        const category = main.getSelectedSpinner(newResult.spinner[0]);
        const measurementUnit = main.getSelectedSpinner(newResult.spinner[1]);

        const columnsData = [
          `id_${result.dataset.id}`,
          { type: 'object', data: [newResult.image.src, main.encodeText(newName)] },
          main.encodePrice(newPrice),
          +newQuantity,
          main.getStockStatus(newQuantity),
          newMeasurement,
          measurementUnit,
          category,
          `custom_date_${result.dataset.date}`,
        ];

        main.updateAtSectionOne(SECTION_NAME, columnsData, 1, result.dataset.id, (updatedResult) => {
          logAction(
            'Update product details',
            {
              id: updatedResult.dataset.id,
              image: updatedResult.dataset.image,
              name: main.decodeText(updatedResult.dataset.text),
              price: updatedResult.dataset.custom2,
              quantity: updatedResult.dataset.custom3,
              measurement: updatedResult.dataset.custom5,
              measurementUnit: updatedResult.dataset.custom6,
              category: updatedResult.dataset.custom7,
              date: updatedResult.dataset.date,
            },
            'product_update'
          );

          main.toast('Successfully updated product details!', 'info');
          main.closeConfirmationModal();
          main.closeModal();
        });
      });
    }
  );
}

function deleteProduct(result) {
  main.openConfirmationModal(`Delete product: ${main.decodeText(result.dataset.text)}`, () => {
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

function refreshAllTabs() {}
