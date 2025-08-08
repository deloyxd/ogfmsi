import main from '../admin_main.js';
import accesscontrol from './accesscontrol.js';
import datasync from './datasync.js';

// default codes:
let mainBtn,
  subBtn,
  sectionTwoMainBtn,
  cart = [],
  liveActivated = false;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'ecommerce-cart') return;

  getInventoryItemsFromSystem();

  if (!liveActivated) {
    liveActivated = true;
    updateDateAndTime();
    setInterval(updateDateAndTime, 10000);
  }
});

function updateDateAndTime() {
  if (main.sharedState.sectionName === 'ecommerce-cart') {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    document.getElementById(
      'ecommerce-cart-section-header'
    ).children[0].children[1].children[0].children[0].textContent = `📆 ${date} ⌚ ${time}`;
  }
}

function getInventoryItemsFromSystem() {
  const inventoryItems = [];

  main.getAllSectionOne('ecommerce-stock', 1, (result) => {
    result.forEach((inventoryItem) => {
      const id = inventoryItem.dataset.id;
      const image = inventoryItem.dataset.image;
      const name = inventoryItem.dataset.name;
      const price = inventoryItem.dataset.custom2.replace('₱', '');
      const quantity = inventoryItem.dataset.custom3;
      const measurement = inventoryItem.dataset.custom5;
      const measurementUnit = inventoryItem.dataset.custom6;
      const category = inventoryItem.dataset.custom7;

      inventoryItems.push({
        id: id,
        image: image,
        name: name,
        price: +price,
        quantity: +quantity,
        measurement: measurement?.trim() || '',
        measurementUnit: measurementUnit?.trim() || '',
        category: category,
      });
    });

    displayProducts(inventoryItems);
  });
}

function displayProducts(products) {
  const productsGrid = document.getElementById('ecommerceCartTab1');
  const productsEmpty = document.getElementById('ecommerceCartTab1Empty');
  productsGrid.classList.add('justify-center');
  productsEmpty.classList.remove('hidden');

  if (!products || products.length == 0) return;

  productsGrid.classList.remove('justify-center');
  productsEmpty.classList.add('hidden');

  productsGrid.innerHTML = '';

  Array.from(products).forEach((product) => {
    const productCard = document.getElementById('ecommerceCartProduct').cloneNode(true);
    productCard.id = product.id;
    productCard.dataset.category = product.category;

    productCard.querySelector('img').src = product.image;

    const categories = {
      supplementsnutrition: 'Supplements & Nutrition',
      foodmeals: 'Food & Meals',
      beverages: 'Beverages',
      fitnessequipment: 'Fitness Equipment',
      apparel: 'Apparel',
      merchandise: 'Merchandise',
      other: 'Other',
    };

    const dataset = {
      productName: product.name.replace(/\:\:\/\//g, ' '),
      productCategory: categories[product.category.replace(/\-/g, '')],
      statusColor: product.quantity <= 10 ? 'text-orange-500' : 'text-green-600',
      stockText: 'Stk: ' + product.quantity,
      productPrice: product.price,
      productQuantity: product.quantity,
      productMeasurementStatus:
        product.measurement.trim() === '' || product.measurementUnit.trim() === '' ? 'hidden' : '',
      productMeasurement: product.measurement,
      productMeasurementUnit: product.measurementUnit,
    };

    productCard.innerHTML = productCard.innerHTML.replace(/\$\{(\w+)\}/g, (match, varName) =>
      dataset[varName] !== undefined ? dataset[varName] : match
    );

    const increaseBtn = productCard.querySelector('.increase-btn');
    const decreaseBtn = productCard.querySelector('.decrease-btn');
    const quantityDisplay = productCard.querySelector('.quantity-display');
    const addToCartBtn = productCard.querySelector('.add-to-cart-btn');

    let quantity = 0;

    if (product.quantity > 0) {
      increaseBtn.addEventListener('click', () => {
        if (quantity < product.quantity) {
          quantity++;
          updateAddToCartButton();
        } else {
          main.toast(`Cannot add more than the stocks count!`, 'error');
        }
      });

      decreaseBtn.addEventListener('click', () => {
        if (quantity > 0) {
          quantity--;
          updateAddToCartButton();
        }
      });

      addToCartBtn.addEventListener('click', () => {
        if (quantity > 0) {
          addToCart(product, quantity);
          quantity = 0;
          updateAddToCartButton();
          main.toast(`Added ${product.name.replace(/\:\:\/\//g, ' ')} to cart!`, 'success');
        }
      });
    } else {
      addToCartBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    function updateAddToCartButton() {
      quantityDisplay.textContent = quantity;
      if (quantity == 0) {
        addToCartBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        addToCartBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }

    productCard.classList.remove('hidden');
    productsGrid.appendChild(productCard);
  });
}

function addToCart(product, quantity) {
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      image: product.image,
      name: product.name,
      price: product.price,
      quantity: quantity,
      category: product.category,
    });
  }

  updateCartDisplay();
}

function updateCartDisplay() {
  main.deleteAllAtSectionTwo('ecommerce-cart');
  cart.forEach((item) => {
    const data = {
      id: item.id,
      action: {
        module: 'E-Commerce',
        submodule: 'Cart',
        description: 'Add to cart',
      },
    };
    main.createAtSectionTwo('ecommerce-cart', data, (result) => {
      result.dataset.itemid = item.id;
      result.innerHTML += `
        <div class="overflow-hidden text-ellipsis">
          ${result.dataset.module}<br>
          <small>
            ${result.dataset.submodule}<br>
            ${result.dataset.description}
          </small>
        </div>
        <div class="overflow-hidden text-ellipsis">
          ${item.id}<br>
          <small>
            ${Object.entries(item)
              .filter(([key]) => !['id'].includes(key))
              .map(([_, value]) => (value ? `${value}` : 'N/A'))
              .filter(Boolean)
              .join('<br>')}
          </small>
        </div>
      `;

      accesscontrol.log(data.action, item);
    });
  });
}

function processCheckout() {
  if (cart.length === 0) {
    main.toast('Your cart is empty!', 'error');
    return;
  }

  // Process each item in cart
  cart.forEach((item) => {
    const action = {
      module: 'Store',
      submodule: 'Selling',
      description: 'Process sale',
    };
    const data = {
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
    datasync.enqueue(action, data);
  });

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  main.toast(
    `Checkout successful! Total: ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    'success'
  );

  // Clear cart
  cart = [];
  updateCartDisplay();

  // Close cart modal
  document.getElementById('cartPanel').classList.add('translate-x-full');
  setTimeout(() => {
    document.getElementById('cartModal').classList.add('hidden');
  }, 300);

  // Refresh inventory display
  setTimeout(() => {
    loadInventoryItems();
  }, 1000);
}
