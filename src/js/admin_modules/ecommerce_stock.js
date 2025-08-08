import main from '../admin_main.js';
import accesscontrol from './accesscontrol.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'ecommerce-stock') return;
  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);
});

function mainBtnFunction() {
  const inputs = {
    header: {
      title: 'Register Product 🧊',
      subtitle: 'Unique product form',
    },
    image: {
      src: '/src/images/client_logo.jpg',
      type: 'normal',
      short: [
        { placeholder: 'Product name', value: '', required: true },
        { placeholder: 'Price', value: '', required: true },
        { placeholder: 'Initial quantity', value: '', required: true },
      ],
    },
    short: [{ placeholder: 'Product measurement value', value: '' }],
    spinner: [
      {
        label: 'Product category',
        placeholder: 'Select product category',
        selected: 0,
        required: true,
        options: [
          { value: 'supplements-nutrition', label: 'Supplements & Nutrition' },
          { value: 'food-meals', label: 'Food & Meals' },
          { value: 'beverages', label: 'Beverages' },
          { value: 'fitness-equipment', label: 'Fitness Equipment' },
          { value: 'apparel', label: 'Apparel' },
          { value: 'merchandise', label: 'Merchandise' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        label: 'Product measurement unit',
        placeholder: 'Select product measurement unit',
        selected: 0,
        options: [
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

          // Size / Dimension
          { value: 'inch', label: 'Size: inch(es)' },
          { value: 'cm', label: 'Size: cm' },
          { value: 'mm', label: 'Size: mm' },
          { value: 'size', label: 'Size: size(s)' },
          { value: 'level', label: 'Size: level(s)' },
        ],
      },
    ],
  };

  main.openModal(mainBtn, inputs, (result) => {
    if (!main.isValidPaymentAmount(+result.image.short[1].value)) {
      main.toast(`Invalid price: ${result.image.short[1].value}`, 'error');
      return;
    }
    if (!main.isValidPaymentAmount(+result.image.short[2].value)) {
      main.toast(`Invalid quantity: ${result.image.short[2].value}`, 'error');
      return;
    }
    if (result.spinner[0].selected < 1) {
      main.toast(`Invalid category`, 'error');
      return;
    }
    registerNewProduct(
      result.image.src,
      result.image.short[0].value,
      +result.image.short[1].value,
      +result.image.short[2].value,
      result.short[0].value?.trim() || '',
      result.spinner[0].options[result.spinner[0].selected - 1].value,
      result.spinner[1].selected > 0 ? result.spinner[1].options[result.spinner[1].selected - 1].value : ''
    );
  });
}

function registerNewProduct(image, name, price, quantity, measurement, category, measurementUnit) {
  const columnsData = [
    'id_P_random',
    {
      type: 'product',
      data: ['', image, name.replace(/\s+/g, ':://')],
    },
    '₱' + price,
    quantity + '',
    getStatus(quantity),
    measurement,
    measurementUnit,
    category,
    'custom_date_today',
  ];

  main.createAtSectionOne('ecommerce-stock', columnsData, 1, name, (result, status) => {
    if (status == 'success') {
      const action = {
        module: 'E-Commerce',
        submodule: 'Stock',
        description: 'Register product',
      };
      const data = {
        id: result.dataset.id,
        image: image,
        name: name,
        price: price,
        quantity: quantity,
        measurement: measurement,
        measurementUnit: measurementUnit,
        category: category,
        date: result.dataset.date,
        type: 'product',
      };
      accesscontrol.log(action, data);

      main.createRedDot('ecommerce-stock', 1);
      main.toast(`${name}, successfully registered!`, 'success');
      main.closeModal();
    } else {
      main.toast('Error: Product duplication detected: ' + result.dataset.id, 'error');
    }
  });
}

function getStatus(quantity) {
  if (quantity == 0) {
    return '<p class="text-gray-800 font-bold">Out of Stock ⚠️</p>';
  } else if (quantity <= 10) {
    return '<p class="text-red-700 font-bold">Super Low Stock ‼️</p>';
  } else if (quantity <= 50) {
    return '<p class="text-amber-500 font-bold">Low Stock ⚠️</p>';
  } else {
    return '<p class="text-emerald-600 font-bold">High Stock ✅</p>';
  }
}

function refreshAllTabs() {}
