import main from '../admin_main.js';
import billing from './invoicing.js';
import accesscontrol from './accesscontrol.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'ecommerce-stock') return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);

  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  subBtn.classList.remove('hidden');
  // subBtn.addEventListener('click', subBtnFunction);

  sectionTwoMainBtn = document.getElementById(`${main.sharedState.sectionName}SectionTwoMainBtn`);
  sectionTwoMainBtn.addEventListener('click', sectionTwoMainBtnFunction);
});

function mainBtnFunction() {
  const inputs = {
    header: {
      title: 'Register New Product 🛒',
      subtitle: 'New product form',
    },
    image: {
      src: '/src/images/client_logo.jpg',
      type: 'normal',
      short: [
        { placeholder: 'Product Name', value: '', required: true },
        { placeholder: 'Quantity', value: '', required: true },
        { placeholder: 'Price', value: '', required: true },
      ],
    },
    spinner: [
      {
        label: 'Product Type',
        placeholder: 'Select product type',
        selected: 0,
        options: [
          { value: 'supplement', label: 'Supplement' },
          { value: 'food', label: 'Food' },
          { value: 'merchandise', label: 'Merchandise' },
          { value: 'beverages', label: 'Beverages' },
        ],
      },
    ],
  };

  main.openModal(mainBtn, inputs, (result) => {
    registerNewUser(
      result.image.src,
      result.image.short[0].value,
      result.spinner[0].options[result.spinner[0].selected - 1].value,
      result.image.short[1].value,
      result.image.short[2].value,
    );
  });
}

function sectionTwoMainBtnFunction() {
  const searchInput = document.getElementById('ecommerce-stockSectionTwoSearch');
  const searchValue = searchInput.value;

  main.findAtSectionOne('ecommerce-stock', searchValue, 'any', 1, (result) => {
    const product = result;

    if (!product) {
      main.toast("There's no product with that ID!", 'error');
      return;
    }

    main.findAtSectionOne('ecommerce-stock', product.dataset.id, 'equal', 2, (pendingResult) => {
      if (pendingResult) {
        main.openConfirmationModal('Multiple pending transactions for this product.', () => {
          processCheckinUser(product);
          searchInput.value = '';
          main.closeConfirmationModal();
        });
        return;
      }

      processCheckinUser(product);
      searchInput.value = '';
    });
  });
}

function registerNewUser(image, productName, productType, quantity, price) {
  // Validate quantity and price (must be numeric only)
  const isNumeric = (val) => /^\d+(\.\d+)?$/.test(val); // Accepts whole and decimal numbers

  if (!isNumeric(quantity)) {
    main.toast('Quantity must be a valid number (no letters)', 'error');
    return;
  }

  if (!isNumeric(price)) {
    main.toast('Price must be a valid number (no letters)', 'error');
    return;
  }

 const quantityValue = parseInt(quantity);
let status = '';

if (quantityValue === 0) {
  status = '<p class="text-gray-800 font-bold">Out of Stock⚠️</p>';
} else if (quantityValue <= 10) {
  status = '<p class="text-red-700 font-bold">Super Low Stock‼️</p>';
} else if (quantityValue <= 50) {
  status = '<p class="text-amber-500 font-bold">Low Stock⚠️</p>';
} else {
  status = '<p class="text-emerald-600 font-bold">High Stock</p>';
}

  const formattedPrice = `₱${parseFloat(price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const columnsData = [
    'id_random',
    {
      type: 'user',
      data: ['', image, productName],
    },
    productType,
    quantity,
    formattedPrice,
    status,
    'custom_date_today',
  ];

  main.createAtSectionOne('ecommerce-stock', columnsData, 1, productName, (generated) => {
    const action = {
      module: 'Store',
      submodule: 'Selling',
      description: 'Add product',
    };
    const data = {
      id: generated.id,
      image,
      productName,
      productType,
      quantity,
      price: formattedPrice,
      date: generated.date,
      type: 'user',
    };
    accesscontrol.log(action, data);

    main.createRedDot('ecommerce-stock', 1);
    main.toast(`${productName}, successfully registered!`, 'success');
    main.closeModal();
  });
}

function processCheckinUser(product) {
  const status = parseInt(product.dataset.quantity) <= 50 ? 'Low Stock' : 'High Stock';
  const statusColumn = {
    text: status,
  };

  const columnsData = [
    'id_' + product.dataset.id,
    {
      type: 'user',
      data: [product.dataset.id, product.dataset.image, product.dataset.productName],
    },
    product.dataset.productType,
    product.dataset.quantity,
    product.dataset.price,
    statusColumn,
    'custom_time_Pending',
  ];

  main.createAtSectionOne('ecommerce-stock', columnsData, 5, '', () => {
    const action = {
      module: 'Store',
      submodule: 'Selling',
      description: 'Process selling transaction',
    };
    const data = {
      id: product.dataset.id,
      image: product.dataset.image,
      productName: product.dataset.productName,
      productType: product.dataset.productType,
      quantity: product.dataset.quantity,
      price: product.dataset.price,
      time: 'Pending',
      type: 'user',
    };
    accesscontrol.log(action, data);
    billing.processPayment(data);

    main.createRedDot('ecommerce-stock', 2);
    main.toast(`${product.dataset.productName}, is now ready for checkout!`, 'success');
  });
}
