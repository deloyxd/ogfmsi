import main from '../admin_main.js';
import billing from './billing.js';
import datasync from './datasync.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'store-selling') return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);

  subBtn = document.querySelector(`.section-sub-btn[data-section="${main.sharedState.sectionName}"]`);
  subBtn.classList.remove('hidden');
  subBtn.addEventListener('click', subBtnFunction);

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
        { placeholder: 'Product Type', value: '', required: true },
        { placeholder: 'Quantity', value: '', required: true },
        { placeholder: 'Price', value: '', required: true },
      ],
    },
  };

  main.openModal(mainBtn, inputs, (result) => {
    registerNewUser(
      result.image.src,
      result.image.short[0].value,
      result.image.short[1].value,
      result.image.short[2].value,
      result.image.short[3].value
    );
  });
}



function sectionTwoMainBtnFunction() {
  const searchInput = document.getElementById('store-sellingSectionTwoSearch');
  const searchValue = searchInput.value;

  main.findAtSectionOne('store-selling', searchValue, 'search', 1, (result) => {
    const product = result;

    if (!product) {
      main.toast("There's no product with that ID!", 'error');
      return;
    }

    main.findAtSectionOne('store-selling', product.dataset.id, 'equal', 2, (pendingResult) => {
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

  const columnsData = [
    'id_random', // Product ID
    {
      type: 'user', // Product Name with logo
      data: [image, productName],
    },
    productType,
    quantity,
    `₱${parseFloat(price).toLocaleString('en-PH', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`,

    'date_today',
  ];

  main.createAtSectionOne('store-selling', columnsData, 1, productName, (generated) => {
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
      price: `₱${parseFloat(price).toFixed(2)}`,
      date: generated.date,
    };
    datasync.enqueue(action, data);

    main.createRedDot('store-selling', 1);
    main.toast(`${productName}, successfully registered!`, 'success');
    main.closeModal();
  });
}



function processCheckinUser(product) {
  const columnsData = [
    'id_' + product.dataset.id,
    {
      type: 'user',
      data: [product.dataset.image, product.dataset.productName],
    },
    product.dataset.productType,
    product.dataset.quantity,
    product.dataset.price,
    'time_Pending',
  ];

  main.createAtSectionOne('store-selling', columnsData, 5, '', () => {
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
    };
    datasync.enqueue(action, data);
    billing.processPayment(data);

    main.createRedDot('store-selling', 2);
    main.toast(`${product.dataset.productName}, is now ready for checkout!`, 'success');
  });
}
