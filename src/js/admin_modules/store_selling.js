import main from '../admin_main.js';
import datasync from './datasync.js';

// default codes:
let mainBtn, subBtn, sectionTwoMainBtn;
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'store-selling') return;

  const sectionName = main.sharedState.sectionName;
  const scrollContainer = document.querySelector(`#${sectionName}SectionContent .scrollbar-light`);
  if (!scrollContainer) return;

  // Initialize the selling interface
  initializeSellingInterface(scrollContainer);
  
  // Load inventory items
  loadInventoryItems();
});

function initializeSellingInterface(scrollContainer) {
  scrollContainer.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">Store Items</h2>
      <div class="flex gap-4 mb-4">
        <input 
          type="text" 
          id="searchProducts" 
          placeholder="Search products..." 
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
        <select 
          id="filterCategory" 
          class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="supplement">Supplement</option>
          <option value="food">Food</option>
          <option value="merchandise">Merchandise</option>
          <option value="beverages">Beverages</option>
        </select>
      </div>
    </div>
    
    <div class="products-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    
    <!-- Cart Section -->
    <div class="fixed bottom-4 right-4 z-50">
      <div id="cartToggle" class="bg-blue-600 text-white p-4 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all">
        <div class="flex items-center gap-2">
          <span class="text-lg">🛒</span>
          <span id="cartCount" class="bg-red-500 text-white rounded-full px-2 py-1 text-sm min-w-[24px] text-center hidden">0</span>
        </div>
      </div>
    </div>
    
    <!-- Cart Modal -->
    <div id="cartModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
      <div class="absolute right-0 top-0 h-full w-96 bg-white shadow-lg transform translate-x-full transition-transform" id="cartPanel">
        <div class="p-4 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold">Shopping Cart</h3>
            <button id="closeCart" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
        </div>
        <div class="p-4 flex-1 overflow-y-auto max-h-96">
          <div id="cartItems"></div>
        </div>
        <div class="p-4 border-t">
          <div class="flex justify-between items-center mb-4">
            <span class="text-lg font-bold">Total: </span>
            <span id="cartTotal" class="text-xl font-bold text-green-600">₱0.00</span>
          </div>
          <button id="checkoutBtn" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all">
            Checkout
          </button>
        </div>
      </div>
    </div>
  `;

  // Initialize cart functionality
  initializeCart();
  
  // Initialize search and filter
  initializeSearchAndFilter();
}

function loadInventoryItems() {
  // Get inventory items from the main system
  // This assumes you have access to the inventory data through the main system
  const inventoryItems = getInventoryItemsFromSystem();
  displayProducts(inventoryItems);
}

function getInventoryItemsFromSystem() {
  const inventoryItems = [];
  
  // Method 1: Try to get data from the main system's section data
  try {
    if (main && main.getSectionData) {
      const inventoryData = main.getSectionData('store-inventory', 1);
      if (inventoryData && inventoryData.length > 0) {
        inventoryData.forEach(item => {
          if (item.quantity && parseInt(item.quantity) > 0) {
            inventoryItems.push({
              id: item.id,
              name: item.productName || item.name,
              type: item.productType || 'general',
              quantity: parseInt(item.quantity),
              price: parseFloat(item.price?.toString().replace('₱', '').replace(',', '') || '0'),
              image: item.image || '/src/images/background_image_1.jpg',
              status: parseInt(item.quantity) <= 10 ? 'low' : 'available'
            });
          }
        });
      }
    }
  } catch (error) {
    console.log('Method 1 failed, trying DOM extraction...');
  }
  
  // Method 2: Extract from DOM table rows if Method 1 fails
  if (inventoryItems.length === 0) {
    const inventoryTable = document.querySelector('#store-inventorySectionContent table tbody, #store-inventorySectionContent .table-body');
    
    if (inventoryTable) {
      const rows = inventoryTable.querySelectorAll('tr, .table-row');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, .table-cell');
        if (cells.length >= 6) {
          const productId = cells[0]?.textContent?.trim();
          const productNameCell = cells[1];
          const productType = cells[2]?.textContent?.trim();
          const quantity = cells[3]?.textContent?.trim();
          const price = cells[4]?.textContent?.trim();
          
          // Extract product name and image
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
              type: productType || 'general',
              quantity: quantityNum,
              price: priceNum,
              image: productImage,
              status: quantityNum <= 10 ? 'low' : 'available'
            });
          }
        }
      });
    }
  }
  
  // Method 3: Try to extract from any elements with data attributes
  if (inventoryItems.length === 0) {
    const inventoryElements = document.querySelectorAll('[data-id][data-product-name], [data-id][data-productName]');
    
    inventoryElements.forEach(element => {
      const id = element.dataset.id;
      const name = element.dataset.productName || element.dataset.productname;
      const type = element.dataset.productType || element.dataset.producttype || 'general';
      const quantity = parseInt(element.dataset.quantity) || 0;
      const price = parseFloat(element.dataset.price?.replace('₱', '').replace(',', '') || '0');
      const image = element.dataset.image || element.querySelector('img')?.src || '/src/images/background_image_1.jpg';
      
      if (id && name && quantity > 0) {
        inventoryItems.push({
          id,
          name,
          type,
          quantity,
          price,
          image,
          status: quantity <= 10 ? 'low' : 'available'
        });
      }
    });
  }
  
  // Method 4: Manual extraction based on your visible data
  // Looking for the specific item "qweqeq" visible in your screenshot
  if (inventoryItems.length === 0) {
    // Try to find the specific items visible in the interface
    const productRows = document.querySelectorAll('tr, .product-row, [class*="row"]');
    
    productRows.forEach(row => {
      const text = row.textContent || '';
      
      // Look for the pattern: ID, Name, Type, Quantity, Price
      
      
      // You can add more specific extractions here based on your data
    });
  }
  
  console.log('Extracted inventory items:', inventoryItems);
  
  // Fallback: Return sample data if nothing is found
  
  
  return inventoryItems;
}

function displayProducts(products) {
  const productsGrid = document.querySelector('.products-grid');
  if (!productsGrid) return;
  
  productsGrid.innerHTML = '';
  
  products.forEach(product => {
    const productCard = createProductCard(product);
    productsGrid.appendChild(productCard);
  });
}

function createProductCard(product) {
  const div = document.createElement('div');
  div.className = 'max-w-xs rounded-xl overflow-hidden shadow-lg bg-white group hover:scale-[1.02] transition-all';
  div.dataset.productId = product.id;
  div.dataset.category = product.type;
  
  const statusClass = product.status === 'low' ? 'text-orange-500' : 'text-green-600';
  const stockText = product.quantity <= 10 ? `Low Stock (${product.quantity})` : `Stock: ${product.quantity}`;
  
  div.innerHTML = `
    <img src="${product.image}" alt="${product.name}" class="w-full h-40 object-cover rounded-t-xl">
    <div class="p-4">
      <h2 class="text-lg font-bold text-gray-800 group-hover:text-blue-600">${product.name}</h2>
      <p class="text-sm text-gray-500 mt-1 capitalize">${product.type}</p>
      <p class="text-xs ${statusClass} font-semibold">${stockText}</p>
      <div class="mt-4 flex items-center justify-between">
        <span class="text-xl font-semibold text-green-600">₱${product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        <div class="flex items-center gap-2">
          <button class="decrease-btn w-8 h-8 rounded-full bg-gray-200 text-xl font-bold hover:bg-gray-300 ${product.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}">–</button>
          <span class="quantity-display w-6 text-center">0</span>
          <button class="increase-btn w-8 h-8 rounded-full bg-blue-500 text-white text-xl font-bold hover:bg-blue-600 ${product.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}">+</button>
        </div>
      </div>
      <button class="add-to-cart-btn w-full mt-3 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition-all ${product.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}">
        ${product.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  `;
  
  // Add event listeners
  const increaseBtn = div.querySelector('.increase-btn');
  const decreaseBtn = div.querySelector('.decrease-btn');
  const quantityDisplay = div.querySelector('.quantity-display');
  const addToCartBtn = div.querySelector('.add-to-cart-btn');
  
  let quantity = 0;
  
  if (product.quantity > 0) {
    increaseBtn.addEventListener('click', () => {
      if (quantity < product.quantity) {
        quantity++;
        quantityDisplay.textContent = quantity;
        updateAddToCartButton();
      }
    });
    
    decreaseBtn.addEventListener('click', () => {
      if (quantity > 0) {
        quantity--;
        quantityDisplay.textContent = quantity;
        updateAddToCartButton();
      }
    });
    
    addToCartBtn.addEventListener('click', () => {
      if (quantity > 0) {
        addToCart(product, quantity);
        quantity = 0;
        quantityDisplay.textContent = quantity;
        updateAddToCartButton();
        main.toast(`Added ${product.name} to cart!`, 'success');
      }
    });
  }
  
  function updateAddToCartButton() {
    if (quantity > 0) {
      addToCartBtn.textContent = `Add ${quantity} to Cart`;
      addToCartBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      addToCartBtn.textContent = 'Add to Cart';
      addToCartBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }
  
  return div;
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
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.image
    });
  }
  
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartCount = document.getElementById('cartCount');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  if (totalItems > 0) {
    cartCount.textContent = totalItems;
    cartCount.classList.remove('hidden');
  } else {
    cartCount.classList.add('hidden');
  }
  
  cartItems.innerHTML = cart.map(item => `
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
  `).join('');
  
  cartTotal.textContent = `₱${totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function updateCartItemQuantity(productId, change) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      cart = cart.filter(cartItem => cartItem.id !== productId);
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
  cart.forEach(item => {
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
  
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  main.toast(`Checkout successful! Total: ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'success');
  
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
  const searchInput = document.getElementById('searchProducts');
  const filterSelect = document.getElementById('filterCategory');
  
  searchInput.addEventListener('input', filterProducts);
  filterSelect.addEventListener('change', filterProducts);
  
  function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = filterSelect.value;
    const productCards = document.querySelectorAll('.products-grid > div');
    
    productCards.forEach(card => {
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