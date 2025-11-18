import main from '../admin_main.js';
import stock from './ecommerce_stock.js';
import accesscontrol from './maintenance_accesscontrol.js';
import payments from './payments.js';
import { API_BASE_URL } from '../_global.js';

const SECTION_NAME = 'ecommerce-cart';
const MODULE_NAME = 'E-Commerce';
const SUBMODULE_NAME = 'Cart';

let cart = [],
  liveActivated = false,
  sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
  inventoryItems = []; // Store inventory data for stock validation

// Search term for filtering products
let searchTerm = '';
let selectedCategory = '';
let selectedSubcategory = '';

// Static subcategory options for cart filtering (matched against product names)
const SUBCATEGORY_OPTIONS = {
  'supplements-nutrition': [
    { value: '', label: 'All Supplements' },
    { value: 'whey', label: 'Whey' },
    { value: 'mass', label: 'Mass Gainer' },
    { value: 'pre-workout', label: 'Pre-Workout' },
    { value: 'bcaa', label: 'BCAA' },
    { value: 'creatine', label: 'Creatine' },
  ],
  'food-meals': [
    { value: '', label: 'All Food & Meals' },
    { value: 'rice', label: 'Rice Meals' },
    { value: 'pasta', label: 'Pasta Meals' },
    { value: 'sandwich', label: 'Sandwiches' },
  ],
  beverages: [
    { value: '', label: 'All Beverages' },
    { value: 'coffee', label: 'Coffee' },
    { value: 'tea', label: 'Tea' },
    { value: 'juice', label: 'Juice' },
    { value: 'shake', label: 'Shakes' },
    { value: 'energy drink', label: 'Energy Drinks' },
  ],
  apparel: [
    { value: '', label: 'All Apparel' },
    { value: 'shirt', label: 'Shirts' },
    { value: 'shorts', label: 'Shorts' },
    { value: 'hoodie', label: 'Hoodies' },
    { value: 'leggings', label: 'Leggings' },
  ],
  merchandise: [
    { value: '', label: 'All Merchandise' },
    { value: 'towel', label: 'Towels' },
    { value: 'bottle', label: 'Bottles' },
    { value: 'cap', label: 'Caps' },
    { value: 'bag', label: 'Bags' },
  ],
};

function getAvailableSubcategoriesByCategory(category) {
  const options = SUBCATEGORY_OPTIONS[category];
  if (!options || options.length === 0) return [];

  return options.filter((opt) => {
    if (!opt.value) return true;
    const keyword = String(opt.value).toLowerCase();
    return inventoryItems.some((p) => {
      if (p.category !== category) return false;
      const { fullName } = main.decodeName(p.name);
      return fullName.toLowerCase().includes(keyword);
    });
  });
}

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  // Connect the checkout button
  const sectionTwoMainBtn = document.getElementById(`${SECTION_NAME}SectionTwoMainBtn`);
  if (sectionTwoMainBtn) {
    sectionTwoMainBtn.addEventListener('click', processCheckout);
  }

  function setupCategoryFilter() {
    const searchInput = document.getElementById(`${SECTION_NAME}SectionOneSearch`);
    if (!searchInput) return;

    if (document.getElementById(`${SECTION_NAME}CategoryFilter`)) return;

    const select = document.createElement('select');
    select.id = `${SECTION_NAME}CategoryFilter`;
    select.className =
      'rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ml-2';

    const subSelect = document.createElement('select');
    subSelect.id = `${SECTION_NAME}SubcategoryFilter`;
    subSelect.className =
      'rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ml-2 hidden';

    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'All Products';
    select.appendChild(optAll);

    (stock.CATEGORIES || []).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.value;
      opt.textContent = c.label;
      select.appendChild(opt);
    });

    function configureSubcategoryOptions(category) {
      const options = getAvailableSubcategoriesByCategory(category);
      selectedSubcategory = '';
      subSelect.innerHTML = '';

      if (!options || options.length <= 1) {
        subSelect.classList.add('hidden');
        refreshProductDisplays();
        return;
      }

      options.forEach((optConfig) => {
        const opt = document.createElement('option');
        opt.value = optConfig.value;
        opt.textContent = optConfig.label;
        subSelect.appendChild(opt);
      });

      subSelect.classList.remove('hidden');
      refreshProductDisplays();
    }

    select.addEventListener('change', (e) => {
      selectedCategory = e.target.value || '';
      configureSubcategoryOptions(selectedCategory);
    });

    subSelect.addEventListener('change', (e) => {
      selectedSubcategory = (e.target.value || '').trim().toLowerCase();
      refreshProductDisplays();
    });

    if (searchInput.parentElement) {
      if (searchInput.nextSibling) {
        searchInput.parentElement.insertBefore(select, searchInput.nextSibling);
        searchInput.parentElement.insertBefore(subSelect, select.nextSibling);
      } else {
        searchInput.parentElement.appendChild(select);
        searchInput.parentElement.appendChild(subSelect);
      }
    }
  }

  // Add clear all button
  addClearAllButton();

  getInventoryItemsFromSystem();
  loadCartFromServer();
  setupSearch();
  setupCategoryFilter();

  if (!liveActivated) {
    liveActivated = true;
    main.updateDateAndTime(SECTION_NAME);
    setInterval(main.updateDateAndTime, 1000);
  }
});

async function getInventoryItemsFromSystem() {
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products`);
    const data = await response.json();

    if (response.ok) {
      // Filter out disposed products from inventory
      const activeProducts = data.result.filter(
        (product) =>
          product.disposal_status !== 'Disposed' &&
          !(product.product_name && product.product_name.toLowerCase().includes('disposed'))
      );

      inventoryItems = activeProducts.map((product) => ({
        id: product.product_id,
        image: product.image_url,
        name: product.product_name_encoded,
        price: +product.price,
        quantity: +product.quantity,
        measurement: product.measurement_value?.trim() || '',
        measurementUnit: product.measurement_unit?.trim() || '',
        category: product.category,
      }));

      // Initial render respecting current search (if any)
      refreshProductDisplays();
    } else {
      console.error('Error fetching products:', data.error);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

// Initialize the search input and wire up events
function setupSearch() {
  const searchInput = document.getElementById(`${SECTION_NAME}SectionOneSearch`);
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    searchTerm = (e.target.value || '').trim().toLowerCase();
    refreshProductDisplays();
  });
}

// Returns inventory filtered by current searchTerm (matches name or category)
function getFilteredInventory() {
  let list = inventoryItems;
  if (selectedCategory) list = list.filter((p) => p.category === selectedCategory);

  if (selectedSubcategory) {
    const subValue = selectedSubcategory.toLowerCase();
    list = list.filter((p) => {
      const { fullName } = main.decodeName(p.name);
      return fullName.toLowerCase().includes(subValue);
    });
  }
  if (!searchTerm) return list;
  return list.filter((p) => {
    const { fullName } = main.decodeName(p.name);
    const nameMatch = fullName.toLowerCase().includes(searchTerm);
    const categoryLabel = getCategoryLabel(p.category) || '';
    const categoryMatch = categoryLabel.toLowerCase().includes(searchTerm);
    return nameMatch || categoryMatch;
  });
}

// Helper function to get available stock for a product (considering items already in cart)
function getAvailableStock(productId) {
  const product = inventoryItems.find((item) => item.id === productId);
  if (!product) return 0;

  const cartItem = cart.find((item) => item.id === productId);
  const cartQuantity = cartItem ? cartItem.quantity : 0;

  return Math.max(0, product.quantity - cartQuantity);
}

// Helper function to check if we can add more quantity to cart
function canAddToCart(productId, additionalQuantity) {
  const availableStock = getAvailableStock(productId);
  return additionalQuantity <= availableStock;
}

async function loadCartFromServer() {
  const response = await fetch(`${API_BASE_URL}/ecommerce/cart/${sessionId}`);
  const data = await response.json();

  if (response.ok) {
    cart = data.result.map((item) => ({
      id: item.product_id,
      cart_id: item.cart_id,
      image: item.product_image,
      name: item.product_name,
      price: +item.price,
      quantity: +item.quantity,
      measurement: item.measurement?.trim() || '',
      measurementUnit: item.measurement_unit?.trim() || '',
      category: item.category,
    }));

    updateCartDisplay();
  } else {
    console.error('Error loading cart:', data.error);
  }
}

function displayProductsForTab(products, tabIndex) {
  const productsGrid = document.getElementById(`ecommerceCartTab${tabIndex}`);
  const productsEmpty = document.getElementById(`ecommerceCartTab${tabIndex}Empty`);
  if (!productsGrid || !productsEmpty) return;

  productsGrid.classList.add('justify-center');
  productsEmpty.classList.remove('hidden');

  if (!products || products.length == 0) {
    productsGrid.innerHTML = '';
    return;
  }

  productsGrid.classList.remove('justify-center');
  productsEmpty.classList.add('hidden');

  productsGrid.innerHTML = '';
  const frag = document.createDocumentFragment();

  Array.from(products).forEach((product) => {
    const fullName = main.fixText(product.name.trim().replace(/::\/\//g, ' '));
    const productCard = document.getElementById('ecommerceCartProduct').cloneNode(true);
    productCard.id = `${product.id}_${tabIndex}`;
    productCard.dataset.category = product.category;

    const productImage = productCard.querySelector('img');
    productImage.src = product.image;
    productImage.classList.add('cursor-pointer', 'hover:opacity-80', 'transition-opacity');
    productImage.onclick = () => showImageModal(product.image, fullName);

    // Get available stock considering items already in cart
    let availableStock = getAvailableStock(product.id);
    let stockCount = availableStock;

    const dataset = {
      productName: fullName,
      productCategory: getCategoryLabel(product.category),
      statusColor: product.quantity <= 10 ? 'text-orange-500' : 'text-green-600',
      stockText: 'Stk: ' + stockCount,
      productPrice: main.encodePrice(product.price),
      productQuantity: product.quantity,
      productMeasurementStatus: product.measurementUnit.trim() === '' ? 'hidden' : '',
      productMeasurement: product.measurement,
      productMeasurementUnit: product.measurementUnit,
    };

    productCard.innerHTML = productCard.innerHTML.replace(/\$\{(\w+)\}/g, (match, varName) =>
      dataset[varName] !== undefined ? dataset[varName] : match
    );

    const increaseBtn = productCard.querySelector('.increase-btn');
    const decreaseBtn = productCard.querySelector('.decrease-btn');
    const stockDisplay = productCard.querySelector('.stock-display');
    const quantityInput = productCard.querySelector('.quantity-input');
    const addToCartBtn = productCard.querySelector('.add-to-cart-btn');

    let quantity = Math.min(1, availableStock); // Start with 1 or 0 if no stock available

    // Initialize the input field
    quantityInput.value = quantity;
    quantityInput.max = availableStock;
    quantityInput.min = 0;

    // Update quantity when input changes
    quantityInput.addEventListener('input', (e) => {
      const newValue = parseInt(e.target.value) || 0;
      if (newValue > availableStock) {
        quantity = availableStock;
        quantityInput.value = availableStock;
        main.toast(`Maximum available stock is ${availableStock}`, 'warning');
      } else if (newValue < 0) {
        quantity = 0;
        quantityInput.value = 0;
      } else {
        quantity = newValue;
      }
      updateAddToCartButton();
    });

    // Only allow numeric input
    quantityInput.addEventListener('keydown', (e) => {
      // Allow: backspace, delete, tab, escape, enter, decimal point
      if (
        [46, 8, 9, 27, 13, 110].includes(e.keyCode) ||
        // Ctrl+A, Command+A
        (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
        // Ctrl+C, Command+C
        (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
        // Ctrl+X, Command+X
        (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
        // home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)
      ) {
        return;
      }
      // Only allow numbers
      if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    });

    // Handle paste to validate pasted content
    quantityInput.addEventListener('paste', (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      const pastedData = parseInt(clipboardData.getData('Text'));

      if (isNaN(pastedData) || pastedData < 0) {
        e.preventDefault();
        return;
      }

      if (pastedData > availableStock) {
        e.preventDefault();
        quantity = availableStock;
        quantityInput.value = availableStock;
        updateAddToCartButton();
        main.toast(`Maximum available stock is ${availableStock}`, 'warning');
      }
    });

    increaseBtn.addEventListener('click', () => {
      if (canAddToCart(product.id, 1) && quantity < availableStock) {
        quantity++;
        quantityInput.value = quantity;
        updateAddToCartButton();
      } else {
        main.toast(`Cannot add anymore! Only ${availableStock} available.`, 'error');
      }
    });

    decreaseBtn.addEventListener('click', () => {
      if (quantity > 0) {
        quantity--;
        quantityInput.value = quantity;
        updateAddToCartButton();
      }
    });

    addToCartBtn.addEventListener('click', () => {
      if (quantity > 0 && canAddToCart(product.id, quantity)) {
        addToCart(product, quantity);
        // Reset quantity after adding to cart
        availableStock = getAvailableStock(product.id);
        quantity = Math.min(1, availableStock);
        updateAddToCartButton();
        // main.toast(`${fullName} is being added to cart, please wait`, 'info');
      } else if (quantity > 0) {
        main.toast(`Cannot add ${quantity} items. Only ${getAvailableStock(product.id)} available.`, 'error');
      }
    });

    function updateAddToCartButton() {
      // Update the input value to match the current quantity
      quantityInput.value = quantity;
      // Update button states
      addToCartBtn.disabled = quantity === 0;
      addToCartBtn.classList.toggle('opacity-50', quantity === 0);
      addToCartBtn.classList.toggle('cursor-not-allowed', quantity === 0);
      // Update increase button state
      increaseBtn.disabled = quantity >= availableStock;
      // Update decrease button state
      decreaseBtn.disabled = quantity <= 0;
    }

    // Initial button state update
    updateAddToCartButton();

    productCard.classList.remove('hidden');
    frag.appendChild(productCard);
  });
  productsGrid.appendChild(frag);
}

// Lightweight debounce utility for expensive UI refreshes
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

const refreshProductDisplaysDebounced = debounce(() => {
  try {
    refreshProductDisplays();
  } catch (_) {}
}, 150);

async function addToCart(product, quantity) {
  // Validate stock before adding
  if (!canAddToCart(product.id, quantity)) {
    const availableStock = getAvailableStock(product.id);
    main.toast(`Cannot add ${quantity} items. Only ${availableStock} available.`, 'error');
    return;
  }

  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    const productStock = inventoryItems.find((item) => item.id === product.id)?.quantity || 0;

    // Double-check stock limit for existing items
    if (newQuantity > productStock) {
      main.toast(`Cannot add ${quantity} more items. Total would exceed available stock of ${productStock}.`, 'error');
      return;
    }

    existingItem.quantity = newQuantity;
    // Optimistic local update for faster UX
    updateCartDisplay();
    refreshProductDisplaysDebounced();
    try {
      await updateCartItemQuantity(existingItem.cart_id, existingItem.quantity);
    } catch (_) {
      // On failure, revert and inform user
      existingItem.quantity -= quantity;
      updateCartDisplay();
      refreshProductDisplaysDebounced();
      main.toast('Failed to update cart quantity. Reverted.', 'error');
      return;
    }
  } else {
    const cartData = {
      session_id: sessionId,
      product_id: product.id,
      product_name: product.name,
      product_image: product.image,
      price: product.price,
      quantity: quantity,
      measurement: product.measurement,
      measurement_unit: product.measurementUnit,
      category: product.category,
    };

    // Optimistic local insert for instant feedback
    const tempId = 'temp_' + Date.now();
    cart.push({
      id: product.id,
      cart_id: tempId,
      image: product.image,
      name: product.name,
      price: product.price,
      quantity: quantity,
      measurement: product.measurement,
      measurementUnit: product.measurementUnit,
      category: product.category,
    });
    updateCartDisplay();
    refreshProductDisplaysDebounced();

    try {
      const response = await fetch(`${API_BASE_URL}/ecommerce/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartData),
      });
      const data = await response.json();
      if (response.ok) {
        // Try to update the temporary cart item's ID without reloading the entire cart
        // This prevents the brief flicker caused by clearing and re-rendering the cart UI
        const serverResult = data && data.result;
        let newCartId = null;
        if (serverResult && typeof serverResult === 'object') {
          // Common shapes: { result: { cart_id: '...' } } or { result: { id: '...' } }
          newCartId = serverResult.cart_id || serverResult.id || null;
        }
        // Edge case: some APIs return arrays
        if (!newCartId && Array.isArray(serverResult) && serverResult.length > 0) {
          newCartId = serverResult[0]?.cart_id || serverResult[0]?.id || null;
        }

        const tempItem = cart.find((i) => i.cart_id === tempId && i.id === product.id);
        if (newCartId && tempItem) {
          tempItem.cart_id = newCartId;
          // Keep the optimistic UI; no need to re-render entire cart here
        } else {
          // Fallback: if we cannot infer the cart_id, perform a targeted reload
          await loadCartFromServer();
        }
        // main.toast(`${product.name.replace(/::\/\//g, ' ').trim()} successfully added to cart!`, 'success');
      } else {
        // Remove optimistic item on failure
        cart = cart.filter((i) => i.cart_id !== tempId);
        updateCartDisplay();
        refreshProductDisplaysDebounced();
        console.error('Error adding to cart:', data.error);
        main.toast('Error: Failed to add item to cart', 'error');
      }
    } catch (error) {
      // Remove optimistic item on error
      cart = cart.filter((i) => i.cart_id !== tempId);
      updateCartDisplay();
      refreshProductDisplaysDebounced();
      console.error('Error adding to cart:', error);
      main.toast('Error: Failed to add item to cart', 'error');
    }
  }

  // Ensure UI is up-to-date
  updateCartDisplay();
  refreshProductDisplaysDebounced();
}

async function updateCartItemQuantity(cartId, quantity) {
  main.sharedState.moduleLoad = SECTION_NAME;
  window.showGlobalLoading?.();
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/cart/${cartId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      console.error('Error updating cart quantity');
    }
  } catch (error) {
    console.error('Error updating cart quantity:', error);
  } finally {
    window.hideGlobalLoading?.();
  }
}

function removeCartItem(cartId) {
  main.openConfirmationModal('Remove item added to cart.', () => {
    main.closeConfirmationModal(async () => {
      main.sharedState.moduleLoad = SECTION_NAME;
      window.showGlobalLoading?.();
      try {
        const response = await fetch(`${API_BASE_URL}/ecommerce/cart/${cartId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          cart = cart.filter((item) => item.cart_id !== cartId);
          main.toast('Successfully removed from cart!', 'success');
          updateCartDisplay();
          refreshProductDisplays();
        } else {
          console.error('Error removing cart item');
        }
      } catch (error) {
        console.error('Error removing cart item:', error);
      } finally {
        window.hideGlobalLoading?.();
      }
    });
  });
}

function updateCartDisplay() {
  main.deleteAllAtSectionTwo(SECTION_NAME);
  cart.forEach((item) => {
    const data = {
      id: item.id,
      action: {
        module: MODULE_NAME,
        submodule: SUBMODULE_NAME,
        description: 'Add to cart',
      },
    };
    main.createAtSectionTwo(SECTION_NAME, data, (result) => {
      result.dataset.itemid = item.id;
      result.dataset.cartid = item.cart_id;
      result.innerHTML += `
        <!-- Column 1: Image -->
        <div class="w-24 h-24 flex-shrink-0">
            <img src="${item.image}" class="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onclick="showImageModal(this.src, '${main.decodeText(item.name).replace(/'/g, '&#39;')}')">
        </div>

        <!-- Column 2: Name and Category -->
        <div class="flex-1 min-w-0">
            <p class="font-semibold text-wrap text-sm">${main.decodeText(item.name)}</p>
            <p class="text-xs text-gray-500">${getMeasurementText(item.measurement, item.measurementUnit)}</p>
            <p class="text-xs text-gray-500">${getCategoryLabel(item.category)}</p>
        </div>

        <!-- Column 3: Price, Quantity, Total, and Remove -->
        <div class="flex w-32 flex-shrink-0 flex-col items-end justify-between">
          <div class="items-end">
            <div class="text-end font-medium">${main.encodePrice(item.price)}</div>

            <div class="my-2 flex items-center">
              <button class="quantity-btn rounded-l border px-2 py-1" onclick="decreaseQuantity('${item.cart_id}')">-</button>
              <span class="border-b border-t px-3 py-1">${item.quantity}</span>
              <button class="quantity-btn rounded-r border px-2 py-1" onclick="increaseQuantity('${item.cart_id}')">+</button>
            </div>

            <div class="text-end my-1 font-bold">${main.encodePrice(item.price * item.quantity)}</div>
          </div>

          <div class="items-end">
            <button class="items-end text-sm text-red-500 hover:underline" onclick="removeItem('${item.cart_id}')">Remove</button>
          </div>
        </div>
      `;

      accesscontrol.log(data.action, item);
    });
  });

  // Ensure clear all button is added after cart display is updated
  addClearAllButton();
}

// Global functions for cart operations (called from HTML onclick)
window.increaseQuantity = async function (cartId) {
  const item = cart.find((item) => item.cart_id === cartId);
  if (item) {
    const productStock = inventoryItems.find((product) => product.id === item.id)?.quantity || 0;

    // Check if we can increase the quantity
    if (item.quantity >= productStock) {
      main.toast(`Cannot add more items. Maximum stock available is ${productStock}.`, 'error');
      return;
    }

    item.quantity++;
    // Optimistic update
    updateCartDisplay();
    refreshProductDisplaysDebounced();
    try {
      await updateCartItemQuantity(cartId, item.quantity);
    } catch (_) {
      item.quantity--;
      updateCartDisplay();
      refreshProductDisplaysDebounced();
      main.toast('Failed to update cart quantity. Reverted.', 'error');
    }
  }
};

window.decreaseQuantity = async function (cartId) {
  const item = cart.find((item) => item.cart_id === cartId);
  if (item && item.quantity > 1) {
    item.quantity--;
    updateCartDisplay();
    refreshProductDisplaysDebounced();
    try {
      await updateCartItemQuantity(cartId, item.quantity);
    } catch (_) {
      item.quantity++;
      updateCartDisplay();
      refreshProductDisplaysDebounced();
      main.toast('Failed to update cart quantity. Reverted.', 'error');
    }
  } else if (item && item.quantity === 1) {
    removeCartItem(cartId);
  }
};

window.removeItem = async function (cartId) {
  removeCartItem(cartId);

  // REFRESH PRODUCT DISPLAYS TO SHOW UPDATED STOCK
};

// ADD THIS NEW FUNCTION ANYWHERE AFTER THE GLOBAL FUNCTIONS:
function refreshProductDisplays() {
  const filtered = getFilteredInventory();

  // Tab 1: All Available Products (Products with stocks)
  displayProductsForTab(
    filtered.filter((p) => p.quantity > 0),
    1
  );

  // Tab 2: Best Selling Products (Fast moving products)
  displayProductsForTab(
    filtered.filter((p) => p.quantity > 50),
    2
  );

  // Tab 3: Least Selling Products (Slow moving products)
  displayProductsForTab(
    filtered.filter((p) => p.quantity > 0 && p.quantity <= 10),
    3
  );
}

function getCategoryLabel(category) {
  return stock.CATEGORIES.find((c) => c.value === category)?.label;
}

function getMeasurementText(measurement, measurementUnit) {
  const text = `${measurement?.trim() || ''} ${measurementUnit?.trim() || ''}`.trim();
  return text || 'No measurement';
}

// Helper function for emoji display
function getEmoji(emoji, size = 16) {
  return `<img src="/src/images/${emoji}.png" class="inline size-[${size}px] 2xl:size-[${size + 4}px]">`;
}

// Attach select-all behavior for quick overwrite on focus/click
function attachSelectAll(el) {
  if (!el || el.__selectAllBound) return;
  const handler = () => requestAnimationFrame(() => el.select());
  el.addEventListener('focus', handler);
  el.addEventListener('click', handler);
  el.__selectAllBound = true;
}

function createPaymentModalInputs(totalAmount) {
  return {
    header: {
      title: `Payment ${getEmoji('💳', 26)}`,
    },
    short: [
      { placeholder: 'Amount to pay', value: main.encodePrice(totalAmount), locked: true }, // id: #input-short-5
      { placeholder: 'Payment amount', value: 0, required: true, autoformat: 'price' }, // cash, id: #input-short-6
      { placeholder: 'Payment amount', value: 0, required: true, autoformat: 'price', hidden: true }, // cashless, id: #input-short-7
      { placeholder: 'Change amount', value: main.encodePrice(0), locked: true, live: '1|+2|-3:arithmetic' }, // id: #input-short-8
      { placeholder: 'Reference number', value: 'N/A', required: true, hidden: true }, // id: #input-short-9
    ],
    radio: [
      { label: 'Payment method', selected: 1, autoformat: { type: 'short', index: 6 } },
      {
        icon: `${getEmoji('💵', 26)}`,
        title: 'Cash',
        subtitle: 'Traditional payment method',
        listener: cartPaymentRadioListener,
      },
      {
        icon: `${getEmoji('💳', 26)}`,
        title: 'Cashless',
        subtitle: 'Digital payment method',
        listener: cartPaymentRadioListener,
      },
      {
        icon: `${getEmoji('💵', 20)} + ${getEmoji('💳', 20)}`,
        title: 'Hybrid',
        subtitle: 'Both physical and digital payment method',
        listener: cartPaymentRadioListener,
      },
    ],
    footer: {
      main: `Process Payment ${getEmoji('💳')}`,
    },
  };
}

function cartPaymentRadioListener(title, input, container, inputGroup) {
  const amountToPay = main.decodePrice(inputGroup.short[0].value);
  const cashInput = container.querySelector(`#input-short-6`);
  const cashlessInput = container.querySelector(`#input-short-7`);
  const refInput = container.querySelector(`#input-short-9`);
  const attachSelectAll = (el) => {
    if (!el || el.__selectAllBound) return;
    const handler = () => requestAnimationFrame(() => el.select());
    el.addEventListener('focus', handler);
    el.addEventListener('click', handler);
    el.__selectAllBound = true;
  };
  switch (title.toLowerCase()) {
    case 'cash':
      if (input.value.trim() == '') input.value = 'N/A';
      cashInput.parentElement.classList.remove('hidden');
      cashlessInput.parentElement.classList.add('hidden');
      // Hide reference number for cash
      refInput.parentElement.classList.add('hidden');
      refInput.value = 'N/A';
      break;
    case 'cashless':
      if (input.value == 'N/A') input.value = '';
      input.focus();
      cashInput.parentElement.classList.add('hidden');
      cashlessInput.parentElement.classList.remove('hidden');
      // Show reference number for cashless
      refInput.parentElement.classList.remove('hidden');
      if (refInput.value == 'N/A') refInput.value = '';
      break;
    case 'hybrid':
      if (input.value == 'N/A') input.value = '';
      input.focus();
      cashInput.parentElement.classList.remove('hidden');
      cashlessInput.parentElement.classList.remove('hidden');
      // Show reference number for hybrid
      refInput.parentElement.classList.remove('hidden');
      if (refInput.value == 'N/A') refInput.value = '';
      break;
  }
  // Sync inputGroup hidden flags so values are captured correctly
  inputGroup.short[1].hidden = cashInput.parentElement.classList.contains('hidden');
  inputGroup.short[2].hidden = cashlessInput.parentElement.classList.contains('hidden');
  inputGroup.short[4].hidden = refInput.parentElement.classList.contains('hidden');

  if (inputGroup.short[1].hidden) {
    cashInput.previousElementSibling.innerHTML =
      inputGroup.short[1].placeholder + (inputGroup.short[1].required ? ' *' : '');
    cashInput.value = main.encodePrice(0);
  } else {
    if (title.toLowerCase() == 'hybrid') {
      cashInput.previousElementSibling.innerHTML =
        inputGroup.short[1].placeholder + ' (cash)' + (inputGroup.short[1].required ? ' *' : '');
      cashInput.value = main.encodePrice(0);
    } else {
      cashInput.previousElementSibling.innerHTML =
        inputGroup.short[1].placeholder + (inputGroup.short[1].required ? ' *' : '');
      cashInput.value = main.encodePrice(0);
    }
  }

  if (inputGroup.short[2].hidden) {
    cashlessInput.previousElementSibling.innerHTML =
      inputGroup.short[2].placeholder + (inputGroup.short[2].required ? ' *' : '');
    cashlessInput.value = main.encodePrice(0);
  } else {
    if (title.toLowerCase() == 'hybrid') {
      cashlessInput.previousElementSibling.innerHTML =
        inputGroup.short[2].placeholder + ' (cashless)' + (inputGroup.short[2].required ? ' *' : '');
    } else {
      cashlessInput.previousElementSibling.innerHTML =
        inputGroup.short[2].placeholder + (inputGroup.short[2].required ? ' *' : '');
    }
    cashlessInput.value = main.encodePrice(0);
  }

  cashInput.dispatchEvent(new Event('input'));
  cashlessInput.dispatchEvent(new Event('input'));

  // Ensure quick editing UX: auto-select contents on focus/click
  attachSelectAll(cashInput);
  attachSelectAll(cashlessInput);
}

async function updateProductStock(productId, soldQuantity) {
  main.sharedState.moduleLoad = SECTION_NAME;
  window.showGlobalLoading?.();
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products/${productId}/stock`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sold_quantity: soldQuantity,
      }),
    });

    if (!response.ok) {
      console.error('Error updating product stock');
      throw new Error('Failed to update product stock');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  } finally {
    window.hideGlobalLoading?.();
  }
}

function processCheckout() {
  if (cart.length === 0) {
    main.toast('Your cart is empty!', 'error');
    return;
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const purpose =
    'Purchasing ' +
    cart
      .map(
        (item) =>
          `${item.quantity}x <b>${item.name.replace(/::\/\//g, ' ')} ${item.measurementUnit !== '' ? item.measurement + item.measurementUnit + ' ' : ' '}</b>${main.encodePrice(item.price)}`
      )
      .join(', ');
  const firstProductImage = cart.length > 0 ? cart[0].image : '';
  payments.processCheckoutPayment(purpose, totalAmount, firstProductImage);
}

export async function completeProcessCheckout(totalAmount, paymentMethod, customerPayment, change, refNum) {
  main.sharedState.moduleLoad = SECTION_NAME;
  window.showGlobalLoading?.();
  try {
    // Create order
    const orderData = {
      session_id: sessionId,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      customer_payment: customerPayment,
      change_amount: change,
      reference_number: refNum,
      processed_by: 'admin',
    };

    const orderResponse = await fetch(`${API_BASE_URL}/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const orderResult = await orderResponse.json();

    if (orderResponse.ok) {
      const orderId = orderResult.result.order_id;

      // Add order items and update stock
      for (const item of cart) {
        const itemData = {
          product_id: item.id,
          product_name: item.name,
          unit_price: item.price,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
        };

        // Add order item
        await fetch(`${API_BASE_URL}/ecommerce/orders/${orderId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        });

        // Update product stock
        await updateProductStock(item.id, item.quantity);
      }

      // Show success message with payment details
      main.toast(
        `Checkout successful! Total: ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} | Payment: ₱${customerPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })} | Change: ₱${change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        'success',
        10000
      );

      // Clear cart
      await fetch(`${API_BASE_URL}/ecommerce/cart/session/${sessionId}`, {
        method: 'DELETE',
      });

      cart = [];
      updateCartDisplay();

      // Close payment modal
      main.closeModal();

      // Refresh inventory display
      setTimeout(() => {
        getInventoryItemsFromSystem();
      }, 1000);
    } else {
      main.toast('Error: Failed to process checkout', 'error');
    }
  } catch (error) {
    console.error('Error processing checkout:', error);
    main.toast('Error: Failed to process checkout', 'error');
  } finally {
    window.hideGlobalLoading?.();
  }
}

export default { completeProcessCheckout };

// Make processCheckout available globally
window.processCheckout = processCheckout;

// Add clear all button to the cart section
function addClearAllButton() {
  const sectionTwoContent = document.querySelector(
    `#${SECTION_NAME}-section .section-content-base .flex.flex-col.items-center.gap-4`
  );
  if (!sectionTwoContent) return;

  // Check if clear all button already exists
  if (document.getElementById(`${SECTION_NAME}ClearAllBtn`)) return;

  const clearAllBtn = document.createElement('button');
  clearAllBtn.id = `${SECTION_NAME}ClearAllBtn`;
  clearAllBtn.className =
    'section-content-submit bg-red-500 hover:bg-red-600 hover:shadow-red-400 active:scale-95 active:bg-red-700';
  clearAllBtn.innerHTML = 'Clear All Items 🗑️';
  clearAllBtn.addEventListener('click', clearAllCartItems);

  sectionTwoContent.appendChild(clearAllBtn);

  const totalHeight =
    +clearAllBtn.parentElement.children[0].classList[clearAllBtn.parentElement.children[0].classList.length - 1]
      .split('[')[1]
      .split('px')[0] -
    (48 + 16);
  clearAllBtn.parentElement.children[0].classList.add(`h-[${totalHeight}px]`);

  clearAllBtn.parentElement.children[1].classList.add('cursor-pointer');
}

// Clear all cart items with confirmation
function clearAllCartItems() {
  if (cart.length === 0) {
    main.toast('Cart is already empty!', 'warning');
    return;
  }

  main.openConfirmationModal(
    'Are you sure?\n\nPlease double check or review any details you may have provided before proceeding with the action stated below:\n\nRemove item added to cart.',
    () => {
      main.closeConfirmationModal(async () => {
        main.sharedState.moduleLoad = SECTION_NAME;
        window.showGlobalLoading?.();

        try {
          // Clear cart from server
          const response = await fetch(`${API_BASE_URL}/ecommerce/cart/session/${sessionId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            // Clear local cart
            cart = [];
            updateCartDisplay();
            refreshProductDisplays();
            main.toast('All items cleared from cart!', 'success');
          } else {
            console.error('Error clearing cart');
            main.toast('Error: Failed to clear cart', 'error');
          }
        } catch (error) {
          console.error('Error clearing cart:', error);
          main.toast('Error: Failed to clear cart', 'error');
        } finally {
          window.hideGlobalLoading?.();
        }
      });
    }
  );
}
