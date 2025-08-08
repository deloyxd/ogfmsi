import main from '../admin_main.js';
import datasync from './datasync.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn, activated;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'ecommerce-cart') return;

  getInventoryItemsFromSystem();
});

function getInventoryItemsFromSystem() {
  const inventoryItems = [];

  main.getAllSectionOne('ecommerce-stock', 1, (result) => {
    Array.from(result).forEach((inventoryItem) => {
      const cells = inventoryItem.querySelectorAll('td');
      const productId = cells[0]?.textContent?.trim();
      const productNameCell = cells[1];
      const productCategory = cells[2]?.textContent?.trim();
      const quantity = cells[3]?.textContent?.trim();
      const price = cells[4]?.textContent?.trim();

      let productName = 'Unknown Product';
      let productImage = '/src/images/background_image_1.jpg';

      if (productNameCell) {
        const nameElement = productNameCell.querySelector('[data-product-name], .product-name') || productNameCell;
        productName = nameElement.textContent?.trim() || productName;

        const imgElement = productNameCell.querySelector('img');
        if (imgElement && imgElement.src) {
          productImage = imgElement.src;
        }
      }

      const quantityNum = parseInt(quantity) || 0;
      const priceNum = parseFloat(price?.replace('₱', '').replace(',', '') || '0');

      if (productId && productName !== 'Unknown Product' && quantityNum > 0) {
        inventoryItems.push({
          id: productId,
          name: productName,
          category: productCategory?.trim || 'general',
          quantity: quantityNum,
          price: priceNum,
          image: productImage,
          status: quantityNum <= 10 ? 'low' : 'available',
        });
      }
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
    productCard.dataset.category = product.product_category;

    const [productName, productCategory, statusColor, stockText, productPrice, productQuantity] =
      `${product.name}:://${product.category}:://${product.status === 'low' ? 'text-orange-500' : 'text-green-600'}:://${(product.quantity <= 10 ? 'Low Stock: ' : 'Stock: ') + product.quantity}:://${product.price}:://${product.quantity}`.split(
        ':://'
      );
    const data = { productName, productCategory, statusColor, stockText, productPrice, productQuantity };
    const dataset = { ...data };

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
          main.toast(`Added ${product.name} to cart!`, 'success');
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

// Cart functionality
let cart = [];

function initializeCart() {
  const cartToggle = document.getElementById('cartToggle');
  const cartModal = document.getElementById('cartModal');
  const cartPanel = document.getElementById('cartPanel');
  const closeCart = document.getElementById('closeCart');
  const checkoutBtn = document.getElementById('checkoutBtn');

  cartToggle.addEventListener('click', () => {
    cartModal.classList.remove('hidden');
    setTimeout(() => {
      cartPanel.classList.remove('translate-x-full');
    }, 10);
  });

  closeCart.addEventListener('click', closeCartModal);
  cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) {
      closeCartModal();
    }
  });

  checkoutBtn.addEventListener('click', processCheckout);

  function closeCartModal() {
    cartPanel.classList.add('translate-x-full');
    setTimeout(() => {
      cartModal.classList.add('hidden');
    }, 300);
  }
}

function addToCart(product, quantity) {
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.image,
    });
  }

  updateCartDisplay();
}

function updateCartDisplay() {
  const cartCount = document.getElementById('cartCount');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (totalItems > 0) {
    cartCount.textContent = totalItems;
    cartCount.classList.remove('hidden');
  } else {
    cartCount.classList.add('hidden');
  }

  cartItems.innerHTML = cart
    .map(
      (item) => `
    <div class="flex items-center gap-3 p-3 border-b">
      <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded">
      <div class="flex-1">
        <h4 class="font-semibold text-sm">${item.name}</h4>
        <p class="text-gray-600 text-xs">₱${item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="updateCartItemQuantity('${item.id}', -1)" class="w-6 h-6 rounded-full bg-gray-200 text-sm">-</button>
        <span class="text-sm w-8 text-center">${item.quantity}</span>
        <button onclick="updateCartItemQuantity('${item.id}', 1)" class="w-6 h-6 rounded-full bg-gray-200 text-sm">+</button>
      </div>
    </div>
  `
    )
    .join('');

  cartTotal.textContent = `₱${totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function updateCartItemQuantity(productId, change) {
  const item = cart.find((item) => item.id === productId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      cart = cart.filter((cartItem) => cartItem.id !== productId);
    }
    updateCartDisplay();
  }
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

function initializeSearchAndFilter() {
  // const searchInput = document.getElementById('searchProducts');
  // const filterSelect = document.getElementById('filterCategory');

  // searchInput.addEventListener('input', filterProducts);
  // filterSelect.addEventListener('change', filterProducts);

  function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = filterSelect.value;
    const productCards = document.querySelectorAll('.products-grid > div');

    productCards.forEach((card) => {
      const productName = card.querySelector('h2').textContent.toLowerCase();
      const productCategory = card.dataset.category;

      const matchesSearch = productName.includes(searchTerm);
      const matchesCategory = !selectedCategory || productCategory === selectedCategory;

      if (matchesSearch && matchesCategory) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }
}

// Make updateCartItemQuantity globally accessible
window.updateCartItemQuantity = updateCartItemQuantity;
