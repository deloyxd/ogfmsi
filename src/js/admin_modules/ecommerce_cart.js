import main from '../admin_main.js';
import stock from './ecommerce_stock.js';
import accesscontrol from './maintenance_accesscontrol.js';
import datasync from './maintenance_datasync.js';
import { API_BASE_URL } from '../_global.js';

const SECTION_NAME = 'ecommerce-cart';
const MODULE_NAME = 'E-Commerce';
const SUBMODULE_NAME = 'Cart';

let cart = [],
  liveActivated = false,
  sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  // Connect the checkout button
  const sectionTwoMainBtn = document.getElementById(`${SECTION_NAME}SectionTwoMainBtn`);
  if (sectionTwoMainBtn) {
    sectionTwoMainBtn.addEventListener('click', processCheckout);
  }

  getInventoryItemsFromSystem();
  loadCartFromServer();

  if (!liveActivated) {
    liveActivated = true;
    main.updateDateAndTime(SECTION_NAME);
    setInterval(main.updateDateAndTime, 10000);
  }
});

async function getInventoryItemsFromSystem() {
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products`);
    const data = await response.json();

    if (response.ok) {
      const inventoryItems = data.result.map((product) => ({
        id: product.product_id,
        image: product.image_url,
        name: product.product_name_encoded,
        price: + product.price,
        quantity: + product.quantity,
        measurement: product.measurement_value?.trim() || '',
        measurementUnit: product.measurement_unit?.trim() || '',
        category: product.category,
      }));

      // Tab 1: All Available Products (Products with stocks)
      displayProductsForTab(inventoryItems.filter((p) => p.quantity > 0), 1);

      // Tab 2: Best Selling Products (Fast moving products)
      displayProductsForTab(inventoryItems.filter((p) => p.quantity > 50), 2);

      // Tab 3: Least Selling Products (Slow moving products)
      displayProductsForTab(inventoryItems.filter((p) => p.quantity > 0 && p.quantity <= 10), 3);

    } else {
      console.error('Error fetching products:', data.error);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

async function loadCartFromServer() {
  try {
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
        category: item.category,
      }));
      
      updateCartDisplay();
    } else {
      console.error('Error loading cart:', data.error);
    }
  } catch (error) {
    console.error('Error loading cart:', error);
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

  Array.from(products).forEach((product) => {
    const productCard = document.getElementById('ecommerceCartProduct').cloneNode(true);
    productCard.id = `${product.id}_${tabIndex}`;
    productCard.dataset.category = product.category;

    productCard.querySelector('img').src = product.image;

    const dataset = {
      productName: main.decodeText(product.name),
      productCategory: getCategoryLabel(product.category),
      statusColor: product.quantity <= 10 ? 'text-orange-500' : 'text-green-600',
      stockText: 'Stk: ' + product.quantity,
      productPrice: main.encodePrice(product.price),
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
          const { _, __, fullName } = main.decodeName(product.name);
          main.toast(`${fullName}, added to cart!`, 'success');
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

async function addToCart(product, quantity) {
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
    await updateCartItemQuantity(existingItem.cart_id, existingItem.quantity);
  } else {
    const cartData = {
      session_id: sessionId,
      product_id: product.id,
      product_name: product.name,
      product_image: product.image,
      price: product.price,
      quantity: quantity,
      category: product.category,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/ecommerce/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartData)
      });

      const data = await response.json();

      if (response.ok) {
        // Reload cart from server to get the cart_id
        await loadCartFromServer();
      } else {
        console.error('Error adding to cart:', data.error);
        main.toast('Error: Failed to add item to cart', 'error');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      main.toast('Error: Failed to add item to cart', 'error');
    }
  }

  updateCartDisplay();
}

async function updateCartItemQuantity(cartId, quantity) {
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/cart/${cartId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity })
    });

    if (!response.ok) {
      console.error('Error updating cart quantity');
    }
  } catch (error) {
    console.error('Error updating cart quantity:', error);
  }
}

async function removeCartItem(cartId) {
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/cart/${cartId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      cart = cart.filter(item => item.cart_id !== cartId);
      updateCartDisplay();
    } else {
      console.error('Error removing cart item');
    }
  } catch (error) {
    console.error('Error removing cart item:', error);
  }
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
            <img src="${item.image}" class="w-full h-full object-cover rounded-lg">
        </div>

        <!-- Column 2: Name and Category -->
        <div class="flex-1 min-w-0">
            <h3 class="font-bold text-wrap text-lg">${main.decodeText(item.name)}</h3>
            <p class="text-sm text-gray-500">${getMeasurementText(item.measurement, item.measurementUnit)}</p>
            <p class="text-sm text-gray-500">${getCategoryLabel(item.category)}</p>
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
}

// Global functions for cart operations (called from HTML onclick)
window.increaseQuantity = async function(cartId) {
  const item = cart.find(item => item.cart_id === cartId);
  if (item) {
    item.quantity++;
    await updateCartItemQuantity(cartId, item.quantity);
    updateCartDisplay();
  }
};

window.decreaseQuantity = async function(cartId) {
  const item = cart.find(item => item.cart_id === cartId);
  if (item && item.quantity > 1) {
    item.quantity--;
    await updateCartItemQuantity(cartId, item.quantity);
    updateCartDisplay();
  } else if (item && item.quantity === 1) {
    await removeCartItem(cartId);
  }
};

window.removeItem = async function(cartId) {
  await removeCartItem(cartId);
};

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

function createPaymentModalInputs(totalAmount) {
  return {
    header: {
      title: `Payment ${getEmoji('💳', 26)}`,
      subtitle: `Total Amount: ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    },
    short: [
      { 
        placeholder: 'Customer Payment Amount', 
        value: '', 
        required: true,
        type: 'number',
        min: totalAmount,
        step: '0.01'
      }
    ],
    footer: {
      main: `Process Payment ${getEmoji('💳')}`,
    }
  };
}

async function updateProductStock(productId, soldQuantity) {
  try {
    const response = await fetch(`${API_BASE_URL}/ecommerce/products/${productId}/stock`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        sold_quantity: soldQuantity 
      })
    });

    if (!response.ok) {
      console.error('Error updating product stock');
      throw new Error('Failed to update product stock');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
}

async function processCheckout() {
  if (cart.length === 0) {
    main.toast('Your cart is empty!', 'error');
    return;
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Show payment modal
  const paymentInputs = createPaymentModalInputs(totalAmount);
  
  main.openModal('green', paymentInputs, async (result) => {
    const customerPayment = parseFloat(result.short[0].value);
    
    if (customerPayment < totalAmount) {
      main.toast('Payment amount is insufficient!', 'error');
      return;
    }

    const change = customerPayment - totalAmount;

    try {
      // Create order
      const orderData = {
        session_id: sessionId,
        total_amount: totalAmount,
        payment_method: 'cash',
        customer_payment: customerPayment,
        change_amount: change,
        processed_by: 'admin'
      };

      const orderResponse = await fetch(`${API_BASE_URL}/ecommerce/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
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
            total_price: item.price * item.quantity
          };

          // Add order item
          await fetch(`${API_BASE_URL}/ecommerce/orders/${orderId}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemData)
          });

          // Update product stock
          await updateProductStock(item.id, item.quantity);
        }

        // Process each item in cart for data sync
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
            customerPayment: customerPayment,
            change: change,
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          };
          datasync.enqueue(action, data);
        });

        // Show success message with payment details
        main.toast(
          `Checkout successful! Total: ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} | Payment: ₱${customerPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })} | Change: ₱${change.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'success',
          10000
        );


        // Clear cart
        await fetch(`${API_BASE_URL}/ecommerce/cart/session/${sessionId}`, {
          method: 'DELETE'
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
    }
  });
}

// Make processCheckout available globally
window.processCheckout = processCheckout;