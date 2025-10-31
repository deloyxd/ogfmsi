import main from '../admin_main.js';
import checkins from './inquiry_checkins.js';
import reservations from './inquiry_reservations.js';
import payments from './payments.js';
import { refreshDashboardStats } from './dashboard.js';
import { API_BASE_URL } from '../_global.js';

const SECTION_NAME = 'inquiry-customers';

const PENDING_TRANSACTION_MESSAGE = 'Please complete pending transaction first at Payments module:';

function getEmoji(emoji, size = 16) {
  return `<img src="/src/images/${emoji}.png" class="inline size-[${size}px] 2xl:size-[${size + 4}px]">`;
}

const PRICE_RATE = [
  {
    value: 'regular',
    label: 'Regular',
  },
  {
    value: 'student',
    label: 'Student',
  },
];

const CUSTOMER_TYPE = [
  {
    value: 'daily',
    label: 'Daily',
  },
  {
    value: 'monthly',
    label: 'Monthly',
  },
];

const PRICES_AUTOFILL = {
  regular_daily: 70,
  student_daily: 60,
  regular_monthly: 950,
  student_monthly: 850,
};

let activated = false,
  mainBtn,
  subBtn;

const seenCustomerIds = new Set();
const fetchingCustomerIds = new Set();

document.addEventListener('ogfmsiAdminMainLoaded', async () => {
  if (main.sharedState.sectionName !== SECTION_NAME) return;

  if (!activated) {
    activated = true;
    mainBtn = document.querySelector(`.section-main-btn[data-section="${SECTION_NAME}"]`);
    subBtn = document.querySelector(`.section-sub-btn[data-section="${SECTION_NAME}"]`);

    mainBtn?.addEventListener('click', () => mainBtnFunction());
    // subBtn?.classList.remove('hidden');
    subBtn?.addEventListener('click', () => {});

    await fetchAllCustomers();
    await fetchAllMonthlyCustomers();
    await autoArchiveAllCustomerDiscrepancy();
    await fetchAllPastMonthlyCustomers();
    await fetchAllArchivedCustomers();
    await autoArchiveInactiveCustomers();
    await clearDuplicateMonthlyEntries();
    updateCustomerStats();

    setInterval(() => {
      if (main.sharedState.sectionName === SECTION_NAME) {
        fetchAllCustomers();
      }
    }, 5000);

    async function fetchAllCustomers() {
      try {
        const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const customers = await response.json();

        customers.result.forEach((customer) => {
          if (!customer || !customer.customer_id) return;
          // Skip archived customers from the "All Registered Customers" tab
          const customerTypeLower = String(customer.customer_type || '').toLowerCase();
          if (customerTypeLower.includes('archiv')) return;
          if (seenCustomerIds.has(customer.customer_id)) return;
          main.createAtSectionOne(
            SECTION_NAME,
            [
              'id_' + customer.customer_id,
              {
                type: 'object_contact',
                data: [
                  customer.customer_image_url,
                  customer.customer_first_name + ' ' + customer.customer_last_name,
                  customer.customer_contact,
                ],
              },
              main.fixText(customer.customer_type),
              main.fixText(customer.customer_rate),
              'custom_date_' +
                main.encodeDate(
                  customer.created_at,
                  main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                ),
            ],
            1,
            (createResult) => {
              seenCustomerIds.add(customer.customer_id);
              createResult.dataset.text = customer.customer_first_name + ':://' + customer.customer_last_name;
              if (customer.customer_type.includes('monthly')) {
                if (customer.customer_pending == 1) {
                  createResult.dataset.tid = customer.customer_tid;
                  createResult.dataset.status = 'pending';
                  createResult.dataset.custom2 = main.fixText(customer.customer_type) + ' - Pending';
                } else {
                  createResult.dataset.status = 'fetching';
                  createResult.dataset.custom2 = main.fixText(customer.customer_type) + ' - Fetching';
                  fetchingCustomerIds.add(customer.customer_id);
                }
                createResult.children[2].textContent = createResult.dataset.custom2;
              } else {
                if (customer.customer_pending == 1) {
                  createResult.dataset.tid = customer.customer_tid;
                  createResult.dataset.status = 'pending';
                }
              }
              const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
              customerProcessBtn.addEventListener('click', () =>
                customerProcessBtnFunction(createResult, main.decodeName(createResult.dataset.text))
              );
              const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
              customerEditDetailsBtn.addEventListener('click', () =>
                customerEditDetailsBtnFunction(createResult, main.decodeName(createResult.dataset.text))
              );
              updateCustomerStats();
            }
          );
        });
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    }

    async function fetchAllMonthlyCustomers() {
      try {
        const response = await fetch(`${API_BASE_URL}/inquiry/monthly`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const customers = await response.json();

        // Track processed customers to avoid duplicates
        const processedCustomers = new Set();

        customers.result.forEach((customer) => {
          // Skip if we've already processed this customer
          if (processedCustomers.has(customer.customer_id)) {
            return;
          }

          main.findAtSectionOne(SECTION_NAME, customer.customer_id, 'equal_id', 1, async (findResult) => {
            if (findResult) {
              if (fetchingCustomerIds.has(customer.customer_id)) {
                fetchingCustomerIds.delete(customer.customer_id);
              }
              if (findResult.dataset.custom2 === 'Daily') {
                return;
              }
              const endDate = new Date(customer.customer_end_date);
              const today = new Date();
              endDate.setHours(0, 0, 0, 0);
              today.setHours(0, 0, 0, 0);
              const diffTime = endDate - today;
              const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (customer.customer_pending == 1) {
                findResult.dataset.tid = customer.customer_tid;
              } else {
                // Check if monthly subscription has expired
                if (daysLeft <= 0) {
                  // Move to Past Monthly Customers tab (tab 3)
                  main.createAtSectionOne(
                    SECTION_NAME,
                    [
                      'id_' + customer.customer_id,
                      {
                        type: 'object_contact',
                        data: [findResult.dataset.image, findResult.dataset.text, findResult.dataset.contact],
                      },
                      main.encodeDate(
                        customer.customer_start_date,
                        main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                      ),
                      main.encodeDate(
                        customer.customer_end_date,
                        main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                      ),
                      main.formatPrice(
                        customer.customer_months *
                          PRICES_AUTOFILL[findResult.dataset.custom3.toLowerCase() + '_monthly']
                      ),
                      findResult.dataset.custom3,
                      'custom_date_' +
                        main.encodeDate(
                          customer.created_at,
                          main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                        ) +
                        ' - ' +
                        main.encodeTime(customer.created_at),
                    ],
                    3,
                    (createResult) => {
                      const customerDetailsBtn = createResult.querySelector(`#customerDetailsBtn`);
                      customerDetailsBtn.addEventListener('click', () =>
                        customerDetailsBtnFunction(createResult.dataset.id, 'Past Monthly Details', '📅')
                      );
                      updateCustomerStats();
                    }
                  );
                } else {
                  // Check if customer already exists in tab 2 to avoid duplicates
                  main.findAtSectionOne(SECTION_NAME, customer.customer_id, 'equal_id', 2, (existingResult) => {
                    if (!existingResult) {
                      // Active monthly customer - show in Active Monthly Customers tab (tab 2)
                      main.createAtSectionOne(
                        SECTION_NAME,
                        [
                          'id_' + customer.customer_id,
                          {
                            type: 'object_contact',
                            data: [findResult.dataset.image, findResult.dataset.text, findResult.dataset.contact],
                          },
                          main.encodeDate(
                            customer.customer_start_date,
                            main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                          ),
                          main.encodeDate(
                            customer.customer_end_date,
                            main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                          ),
                          daysLeft + ' days',
                          main.formatPrice(
                            customer.customer_months *
                              PRICES_AUTOFILL[findResult.dataset.custom3.toLowerCase() + '_monthly']
                          ),
                          findResult.dataset.custom3,
                          'custom_date_' +
                            main.encodeDate(
                              customer.created_at,
                              main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                            ) +
                            ' - ' +
                            main.encodeTime(customer.created_at),
                        ],
                        2,
                        (createResult) => {
                          const startDate = new Date(customer.customer_start_date);
                          startDate.setHours(0, 0, 0, 0);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (startDate <= today) {
                            findResult.dataset.status = 'active';
                            findResult.dataset.custom2 = 'Monthly - Active';
                          const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
                          customerProcessBtn.addEventListener('click', () =>
                            customerProcessBtnFunction(createResult, main.decodeName(createResult.dataset.text))
                          );
                          const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
                          customerEditDetailsBtn.addEventListener('click', () =>
                            customerEditDetailsBtnFunction(createResult, main.decodeName(createResult.dataset.text))
                          );
                          } else {
                            findResult.dataset.status = 'incoming';
                            findResult.dataset.custom2 = 'Monthly - Incoming';
                            createResult.remove();
                          }
                          findResult.children[2].innerText = findResult.dataset.custom2;
                          updateCustomerStats();
                        }
                      );
                    }
                  });
                }
              }

              // Mark this customer as processed
              processedCustomers.add(customer.customer_id);
            }
          });
        });
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    }

    async function autoArchiveAllCustomerDiscrepancy() {
      fetchingCustomerIds.forEach(async (customerId) => {
        try {
          const response = await fetch(`${API_BASE_URL}/inquiry/archived/${customerId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          await response.json();
        } catch (error) {
          console.error('Error archiving customer:', error);
        }
        fetchingCustomerIds.delete(customerId);
      });
    }

    async function fetchAllPastMonthlyCustomers() {
      try {
        const response = await fetch(`${API_BASE_URL}/inquiry/pastmonthly`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pastMonthlyCustomers = await response.json();

        pastMonthlyCustomers.result.forEach((customer) => {
          main.createAtSectionOne(
            SECTION_NAME,
            [
              'id_' + customer.customer_id,
              {
                type: 'object_contact',
                data: [
                  customer.customer_image_url,
                  customer.customer_first_name + ' ' + customer.customer_last_name,
                  customer.customer_contact,
                ],
              },
              main.encodeDate(
                customer.customer_start_date,
                main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
              ),
              main.encodeDate(
                customer.customer_end_date,
                main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
              ),
              main.formatPrice(customer.customer_months * PRICES_AUTOFILL[`${customer.customer_rate}_monthly`]),
              main.fixText(customer.customer_rate),
              'custom_date_' +
                main.encodeDate(
                  customer.created_at,
                  main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                ) +
                ' - ' +
                main.encodeTime(customer.created_at),
            ],
            3,
            (createResult) => {
              createResult.dataset.text = customer.customer_first_name + ':://' + customer.customer_last_name;
              const customerDetailsBtn = createResult.querySelector(`#customerDetailsBtn`);
              customerDetailsBtn.addEventListener('click', () =>
                customerDetailsBtnFunction(createResult.dataset.id, 'Past Monthly Details', '📅')
              );
              updateCustomerStats();
            }
          );
        });
      } catch (error) {
        console.error('Error fetching past monthly customers:', error);
      }
    }

    async function fetchAllArchivedCustomers() {
      try {
        const response = await fetch(`${API_BASE_URL}/inquiry/archived`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const archivedCustomers = await response.json();

        archivedCustomers.result.forEach((customer) => {
          main.createAtSectionOne(
            SECTION_NAME,
            [
              'id_' + customer.customer_id,
              {
                type: 'object_contact',
                data: [
                  customer.customer_image_url,
                  customer.customer_first_name + ' ' + customer.customer_last_name,
                  customer.customer_contact,
                ],
              },
              'custom_datetime_' +
                main.encodeDate(
                  customer.created_at,
                  main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                ),
            ],
            4,
            (createResult) => {
              createResult.dataset.text = customer.customer_first_name + ':://' + customer.customer_last_name;
              const customerDetailsBtn = createResult.querySelector(`#customerDetailsBtn`);
              customerDetailsBtn.addEventListener('click', () =>
                customerDetailsBtnFunction(createResult.dataset.id, 'Archive Details', '🧾')
              );
              updateCustomerStats();
            }
          );
        });
      } catch (error) {
        console.error('Error fetching archived customers:', error);
      }
    }

    async function autoArchiveInactiveCustomers() {
      try {
        const response = await fetch(`${API_BASE_URL}/inquiry/auto-archive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.archived_count > 0) {
          main.toast(`Auto-archived ${result.archived_count} inactive customers (3+ months)`, 'success');

          // Refresh the archived customers list to show newly archived customers
          await fetchAllArchivedCustomers();
          updateCustomerStats();
        }
      } catch (error) {
        console.error('Error auto-archiving inactive customers:', error);
      }
    }

    async function clearDuplicateMonthlyEntries() {
      try {
        // Clear any existing duplicate entries in tab 2 (Active Monthly Customers)
        const emptyText = document.getElementById(`${SECTION_NAME}SectionOneListEmpty2`);
        if (emptyText) {
          const tbody = emptyText.parentElement.parentElement;
          const seenCustomers = new Set();
          const rowsToRemove = [];

          // Find duplicate entries
          for (let i = 1; i < tbody.children.length; i++) {
            const row = tbody.children[i];
            const customerId = row.dataset.id;

            if (seenCustomers.has(customerId)) {
              rowsToRemove.push(row);
            } else {
              seenCustomers.add(customerId);
            }
          }

          // Remove duplicate entries
          rowsToRemove.forEach((row) => {
            row.remove();
          });

          if (rowsToRemove.length > 0) {
            updateCustomerStats();
          }
        }
      } catch (error) {
        console.error('Error clearing duplicate monthly entries:', error);
      }
    }
  }
});

// Utility: Convert a name string to Title Case while respecting spaces, hyphens and apostrophes
// Examples: "enZO" -> "Enzo", "daniElA" -> "Daniela", "maRy aNn" -> "Mary Ann", "anne-marie" -> "Anne-Marie", "o'neill" -> "O'Neill"
function toTitleCaseName(str = '') {
  const lower = String(str).toLowerCase();
  return lower.replace(/(^|[\s\-\'])([a-z\u00C0-\u017F])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}

// Utility: Normalize customer name for comparison (similar to equipment validation)
function normalizeCustomerName(firstName, lastName) {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Utility: Check if current date has reached the customer's start date for monthly customers
function hasReachedStartDate(customer) {
  // const isMonthlyCustomer = customer.dataset.custom2.toLowerCase().includes('monthly');
  // if (!isMonthlyCustomer) return true; // Non-monthly customers are always available

  const startDateStr = customer.dataset.custom2;
  if (!startDateStr || !startDateStr.includes(',')) return true; // If no start date, allow actions (fallback)

  try {
    // Convert the stored start date to a comparable format
    // The startDate is stored in the format returned by main.decodeDate()
    // We need to convert it back to mm-dd-yyyy format for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse the start date - it could be in various formats from main.decodeDate()
    let startDate;
    if (startDateStr.includes(',')) {
      // Format: "October 19, 2025" (long format)
      startDate = new Date(startDateStr);
    } else if (startDateStr.includes('-')) {
      // Format: "10-19-2025" (numeric format)
      const [month, day, year] = startDateStr.split('-').map(Number);
      startDate = new Date(year, month - 1, day);
    } else {
      // Try to parse as-is
      startDate = new Date(startDateStr);
    }

    startDate.setHours(0, 0, 0, 0);
    return startDate <= today;
  } catch (error) {
    console.error('Error parsing start date:', error);
    return true; // If there's an error parsing, allow actions (fallback)
  }
}

// Utility: Remove special characters and numbers from name input
function sanitizeNameInput(str = '') {
  // Remove all characters except letters, spaces, hyphens, and apostrophes
  return String(str).replace(/[^a-zA-Z\s\-']/g, '');
}

// Listener for modal inputs: auto-correct casing and remove invalid characters on every input change
function nameAutoCaseListener(inputEl) {
  // First sanitize the input to remove special characters and numbers
  const sanitized = sanitizeNameInput(inputEl.value);
  if (inputEl.value !== sanitized) {
    inputEl.value = sanitized;
    // Trigger input to sync bound data structures; guard ensures no infinite loop
    inputEl.dispatchEvent(new Event('input'));
  }

  // Then apply title case formatting
  const corrected = toTitleCaseName(inputEl.value);
  if (inputEl.value !== corrected) {
    inputEl.value = corrected;
    // Trigger input to sync bound data structures; guard ensures no infinite loop
    inputEl.dispatchEvent(new Event('input'));
  }
}

// Validate customer registration for similar names
async function validateCustomerRegistration(firstName, lastName, customerId = null) {
  try {
    // Validate name format - only letters, spaces, hyphens, and apostrophes allowed
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      return { isValid: false, error: 'Names can only contain letters, spaces, hyphens, and apostrophes' };
    }

    // Check for minimum length
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return { isValid: false, error: 'First and last names must be at least 2 characters long' };
    }

    const newNameNorm = normalizeCustomerName(firstName, lastName);
    if (newNameNorm.length < 3) {
      return { isValid: true, similarCustomer: null };
    }

    const response = await fetch(`${API_BASE_URL}/inquiry/customers`);
    const data = await response.json();
    const customers = response.ok ? data.result || [] : [];

    const similarCustomer = customers.find((customer) => {
      // Skip if it's the same customer being edited
      if (customerId && customer.customer_id === customerId) {
        return false;
      }

      const existingNameNorm = normalizeCustomerName(customer.customer_first_name, customer.customer_last_name);
      if (!existingNameNorm) return false;

      return (
        existingNameNorm === newNameNorm ||
        existingNameNorm.includes(newNameNorm) ||
        newNameNorm.includes(existingNameNorm)
      );
    });

    if (similarCustomer) {
      return { isValid: false, similarCustomer };
    }

    return { isValid: true, similarCustomer: null };
  } catch (error) {
    console.error('Error validating customer registration:', error);
    // If there's an error, allow registration to proceed
    return { isValid: true, similarCustomer: null };
  }
}

// Show similar customer found modal
function showSimilarCustomerModal(similarCustomer, attemptedFirstName, attemptedLastName) {
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-40 hidden" id="similarCustomerModal">
      <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-red-500 to-red-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Similar Customer Found ${getEmoji('⚠️', 26)}</p>
          <p class="text-xs">A customer with similar name already exists</p>
        </div>
        <div class="p-6 text-sm text-gray-700">
          <p class="mb-3">Attempted name: <span class="font-semibold">${attemptedFirstName} ${attemptedLastName}</span></p>
          <div class="bg-gray-50 p-3 rounded border">
            <p class="text-gray-600 mb-1">Existing customer:</p>
            <p class="font-semibold text-gray-900">${similarCustomer.customer_first_name} ${similarCustomer.customer_last_name}</p>
            <p class="text-xs text-gray-500 mt-1">ID: ${similarCustomer.customer_id}</p>
            <p class="text-xs text-gray-500">Contact: ${similarCustomer.customer_contact || 'N/A'}</p>
            <p class="text-xs text-gray-500">Type: ${similarCustomer.customer_type} - ${similarCustomer.customer_rate}</p>
          </div>
          <p class="mt-4 text-red-600 font-medium">Registration blocked to prevent duplicates.</p>
          <p class="text-sm text-gray-600 mt-2">Please use a different name or contact the existing customer.</p>
          <div class="flex gap-3 mt-5">
            <button type="button" id="similarCustomerOkBtn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('similarCustomerModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const close = () => {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };

  document.getElementById('similarCustomerOkBtn').addEventListener('click', close);

  // Close on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  document.addEventListener('keydown', handleEscape);
  modal.dataset.escapeHandler = 'true';
}

function mainBtnFunction(
  customer,
  image = '/src/images/client_logo.jpg',
  firstName = '',
  lastName = '',
  contact = '',
  customerType = 1,
  priceRate = 1
) {
  const isCreating = !customer;
  const inputs = {
    header: {
      title: `${isCreating ? 'Register New' : 'Edit'} Customer ${isCreating ? '' : 'Details'} ${getEmoji(isCreating ? '💪' : '⚙️', 26)}`,
      subtitle: `${isCreating ? 'Register new customer' : 'Edit customer details'} form`,
    },
    image: {
      src: `${isCreating ? image : customer.image}`,
      type: 'normal',
      short: [
        {
          placeholder: 'First name',
          value: `${isCreating ? firstName : customer.firstName}`,
          required: true,
          listener: nameAutoCaseListener,
        },
        {
          placeholder: 'Last name',
          value: `${isCreating ? lastName : customer.lastName}`,
          required: true,
          listener: nameAutoCaseListener,
        },
        { placeholder: 'Email / contact number', value: `${isCreating ? contact : customer.contact}` },
      ],
    },
    spinner: [
      {
        label: 'Customer type',
        placeholder: 'Select customer type',
        selected: `${isCreating ? customerType : customer.customerType}`,
        required: true,
        options: CUSTOMER_TYPE,
      },
      {
        label: 'Price rate',
        placeholder: 'Select price rate',
        selected: `${isCreating ? priceRate : customer.priceRate}`,
        required: true,
        options: PRICE_RATE,
      },
    ],
    footer: {
      main: `${isCreating ? mainBtn.innerHTML : `Update ${getEmoji('⚙️')}`}`,
      sub: `${isCreating ? `` : `Archive ${getEmoji('🧾')}`}`,
    },
  };

  main.findAtSectionOne(SECTION_NAME, customer?.id || '', 'equal_id', 2, (findResult) => {
    let isMonthlyCustomerAlready = false;
    if (findResult) {
      isMonthlyCustomerAlready = true;
      inputs.spinner[0].locked = true;
    }

    main.openModal(
      mainBtn,
      inputs,
      async (result) => {
        if (!isCreating && checkIfSameData(result, customer)) {
          main.toast('You must change anything!', 'error');
          return;
        }

        if (!isCreating && customer.tid) {
          main.toast(`${PENDING_TRANSACTION_MESSAGE} ${customer.tid}`, 'error');
          return;
        }

        const image = result.image.src;
        const [firstName, lastName, contact] = result.image.short.map((item) => item.value);
        const name = main.encodeName(firstName, lastName);
        const customerType = main.getSelectedSpinner(result.spinner[0]);
        const priceRate = main.getSelectedSpinner(result.spinner[1]);

        // Validate for similar customers before proceeding
        main.sharedState.moduleLoad = SECTION_NAME;
        window.showGlobalLoading?.();
        try {
          const validation = await validateCustomerRegistration(firstName, lastName, customer?.id);
          if (!validation.isValid) {
            if (validation.error) {
              main.toast(validation.error, 'error');
              return;
            }
            showSimilarCustomerModal(validation.similarCustomer, firstName, lastName);
            return;
          }

          const columnsData = [
            'id_' + (isCreating ? 'U_random' : customer.id),
            {
              type: 'object_contact',
              data: [image, name, contact],
            },
            main.fixText(customerType),
            main.fixText(priceRate),
            'custom_date_' + (isCreating ? 'today' : customer.date),
          ];

          const goBackCallback = () => {
            if (isCreating) {
              mainBtnFunction(null, image, firstName, lastName, contact, customerType, priceRate);
            } else {
              customer = {
                id: customer.id,
                image,
                firstName,
                lastName,
                contact,
                customerType,
                priceRate,
                date: customer.date,
                tid: customer.tid,
              };
              mainBtnFunction(customer);
            }
          };

          main.findAtSectionOne(SECTION_NAME, name, 'equal_text', 1, (findResult) => {
            if (findResult && findResult.dataset.id != customer?.id) {
              const { _, __, fullName } = main.decodeName(findResult.dataset.text);

              main.openConfirmationModal(
                `Data duplication - Customer with same details:<br><br>ID: ${findResult.dataset.id}<br>Name: ${fullName}`,
                () => {
                  main.closeConfirmationModal(() => {
                    main.closeModal(() => {
                      validateCustomer(
                        findResult.dataset.id,
                        columnsData,
                        goBackCallback,
                        null,
                        true,
                        !isMonthlyCustomerAlready
                      );
                    });
                  });
                }
              );
              return;
            }

            main.closeModal(() => {
              validateCustomer(null, columnsData, goBackCallback, null, true, !isMonthlyCustomerAlready);
            });
          });
        } catch (e) {
        } finally {
          window.hideGlobalLoading?.();
        }
      },
      () => {
        main.openConfirmationModal('Archive customer. Cannot be undone.<br><br>ID: ' + customer.id, async () => {
          main.findAtSectionOne(SECTION_NAME, customer.id, 'equal_id', 1, async (findResult) => {
            if (findResult) {
              if (findResult.dataset.tid) payments.cancelCheckinPayment(findResult.dataset.tid);

              // Persist archive to backend
              try {
                const response = await fetch(`${API_BASE_URL}/inquiry/archived/${customer.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                await response.json();
              } catch (error) {
                console.error('Error archiving customer:', error);
              }

              const columnsData = [
                'id_' + customer.id,
                {
                  type: 'object_contact',
                  data: [customer.image, main.encodeName(customer.firstName, customer.lastName), customer.contact],
                },
                'custom_datetime_today',
              ];
              main.createAtSectionOne(SECTION_NAME, columnsData, 4, (createResult) => {
                main.createNotifDot(SECTION_NAME, 4);
                main.deleteAtSectionOne(SECTION_NAME, 1, customer.id);
                seenCustomerIds.delete(customer.id);

                const customerDetailsBtn = createResult.querySelector(`#customerDetailsBtn`);
                customerDetailsBtn.addEventListener('click', () =>
                  customerDetailsBtnFunction(customer.id, 'Archive Details', '🧾')
                );
              });
            }
          });
          archiveLoop(customer.id);
          main.toast(`Successfully archived customer!`, 'error');
          main.closeConfirmationModal();
          main.closeModal();

          function archiveLoop(customerId) {
            main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 2, (deleteResult) => {
              if (deleteResult) {
                main.deleteAtSectionOne(SECTION_NAME, 2, customerId);
                archiveLoop(customerId);
              }
            });
          }
        });
      }
    );
  });
}

function checkIfSameData(newData, oldData) {
  return (
    newData.image.src == oldData.image &&
    newData.image.short[0].value == oldData.firstName &&
    newData.image.short[1].value == oldData.lastName &&
    newData.image.short[2].value == oldData.contact &&
    main.fixText(main.getSelectedSpinner(newData.spinner[0])) == oldData.customerType &&
    main.fixText(main.getSelectedSpinner(newData.spinner[1])) == oldData.priceRate
  );
}

const STUDENT_VERIFICATION_MESSAGE = `Verification of student discount rate via:<br><br>${getEmoji('📌')} Student ID's picture matches the customer's face<br>${getEmoji('📌')} Student ID's school name is legitimate<br>${getEmoji('📌')} Student ID's validity duration still not expired yet`;

function validateCustomer(
  customerId,
  columnsData,
  goBackCallback,
  renewalData = null,
  checkPriceRate = true,
  checkCustomerType = true
) {
  const priceRate = columnsData[3].toLowerCase();
  if (checkPriceRate) {
    if (priceRate.toLowerCase().includes('student')) {
      main.openConfirmationModal(STUDENT_VERIFICATION_MESSAGE, () => {
        validateCustomer(customerId, columnsData, goBackCallback, renewalData, false, checkCustomerType);
        main.closeConfirmationModal();
      });
      return;
    }
  }

  const customerType = columnsData[2].toLowerCase();
  if (checkCustomerType) {
    if (customerType.toLowerCase().includes('monthly')) {
      const startDate = main.encodeDate(new Date(), '2-digit');
      let renewalStartDate = startDate;
      if (renewalData && renewalData.endDate) {
        const raw = String(renewalData.endDate).trim();
        const normalized = /^(\d{2})-(\d{2})-(\d{4})$/.test(raw) ? raw.replace(/-/g, '/') : raw;
        const parsed = new Date(normalized);
        if (!isNaN(parsed.getTime())) {
          parsed.setDate(parsed.getDate() + 1);
          renewalStartDate = main.encodeDate(parsed, '2-digit');
        }
      }
      const inputs = {
        header: {
          title: `${renewalData ? 'Renew' : 'Register New'} Monthly Customer ${getEmoji('🎫', 26)}`,
          subtitle: `Customer monthly ${renewalData ? 'renewal' : 'registration'} form`,
        },
        short: [
          {
            placeholder: 'Total price:',
            value: main.encodePrice(PRICES_AUTOFILL[`${priceRate}_monthly`]),
            locked: true,
          },
          { placeholder: 'Price rate:', value: main.fixText(priceRate), locked: true },
          {
            placeholder: 'Date range:',
            value: '',
            locked: true,
          },
          {
            placeholder: 'Start date (mm-dd-yyyy):',
            value: `${renewalData ? renewalStartDate : startDate}`,
            calendar: true,
            required: true,
          },
          {
            placeholder: 'Month duration:',
            value: 1,
            required: true,
            live: '1| 2:range',
            listener: activeShortListener,
          },
        ],
        footer: {
          main: `Process Payment ${getEmoji('🔏')}`,
          sub: `Go Back`,
        },
      };

      function continueValidateCustomer() {
        main.openModal(
          'blue',
          inputs,
          (result) => {
            const startDate = result.short[3].value;
            if (!main.isValidDate(startDate) || main.isPastDate(startDate)) {
              main.toast(`Invalid start date: ${startDate}`, 'error');
              return;
            }
            const months = +result.short[4].value;
            if (!main.isValidPaymentAmount(months)) {
              main.toast(`Invalid days: ${months}`, 'error');
              return;
            }
            const price = main.decodePrice(result.short[0].value);

            const [month, day, year] = startDate.split('-').map(Number);
            const startDateObj = new Date(year, month - 1, day);
            const endDateObj = new Date(startDateObj);
            endDateObj.setDate(endDateObj.getDate() + months * 30);
            const endDate = endDateObj.toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            });
            const { firstName, lastName, fullName } = main.decodeName(columnsData[1].data[1]);
            const startDateNormalized = String(startDate).replace(/-/g, '/');
            main.openConfirmationModal(
              `Monthly ${renewalData ? 'renewal' : 'registration'} details:<br><br><span class="text-lg">${fullName}</span><br>from ${main.decodeDate(startDateNormalized)}<br>to ${main.decodeDate(endDate)}<br>lasts ${months * 30} days<br>total price: ${main.encodePrice(price)}`,
              () => {
                main.closeConfirmationModal();
                columnsData[2] += ' - Pending';
                registerNewCustomer(customerId, columnsData, true, price, priceRate, async (createResult) => {
                  createResult.dataset.startdate = main.decodeDate(startDateNormalized);
                  createResult.dataset.enddate = main.decodeDate(endDate);
                  createResult.dataset.days = months * 30;
                  createResult.dataset.status = 'pending';

                  try {
                    const response = await fetch(
                      `${API_BASE_URL}/inquiry/customers/pending/${createResult.dataset.id}`,
                      {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          customer_type: 'monthly',
                          customer_tid: '',
                          customer_pending: 1,
                        }),
                      }
                    );

                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    await response.json();
                  } catch (error) {
                    console.error('Error creating monthly customer:', error);
                  }

                  try {
                    const response = await fetch(`${API_BASE_URL}/inquiry/monthly`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        customer_id: createResult.dataset.id,
                        customer_start_date: main
                          .encodeDate(startDate.replace(/\//g, '-'), '2-digit')
                          .replace(/^(\d{2})-(\d{2})-(\d{4})$/, '$3-$1-$2'),
                        customer_end_date: main
                          .encodeDate(endDate.replace(/\//g, '-'), '2-digit')
                          .replace(/^(\d{2})-(\d{2})-(\d{4})$/, '$3-$1-$2'),
                        customer_months: months,
                        customer_tid: '',
                        customer_pending: 1,
                      }),
                    });

                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const createdCustomer = await response.json();
                  } catch (error) {
                    console.error('Error creating monthly customer:', error);
                  }
                });
              }
            );
          },
          () => {
            main.closeModal(() => {
              goBackCallback();
            });
          }
        );
      }

      main.closeModal(() => {
        continueValidateCustomer();
      });

      return;
    }
  } else {
    columnsData[2] += ' - Active';
  }

  registerNewCustomer(
    customerId,
    columnsData,
    customerType.toLowerCase().includes('monthly'),
    PRICES_AUTOFILL[`${priceRate}_daily`],
    main.getSelectedSpinner(priceRate)
  );
}

function activeShortListener(monthInput, container) {
  const totalPriceInput = container.querySelector(`#input-short-5`);
  const priceRateInput = container.querySelector(`#input-short-6`);
  totalPriceInput.value = main.encodePrice(
    +PRICES_AUTOFILL[`${priceRateInput.value.toLowerCase()}_monthly`] * +monthInput.value
  );
  totalPriceInput.dispatchEvent(new Event('input'));
}

function registerNewCustomer(customerId, columnsData, isMonthlyCustomer, amount, priceRate, callback = () => {}) {
  const { firstName } = main.decodeName(columnsData[1].data[1]);
  main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 1, (findResult) => {
    let isCreating = true;
    if (findResult) {
      isCreating = false;
    }
    main.toast(`${firstName}, successfully ${isCreating ? 'registered' : 'updated'}!`, 'success');
    if (isCreating) {
      main.createAtSectionOne(SECTION_NAME, columnsData, 1, async (createResult) => {
        seenCustomerIds.add(createResult.dataset.id);
        if (isMonthlyCustomer) {
          if (callback) {
            callback(createResult);
            processCheckinPayment(createResult, isMonthlyCustomer, amount, priceRate);
          }
        } else {
          main.closeModal();
        }
        const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
        customerProcessBtn.addEventListener('click', () =>
          customerProcessBtnFunction(createResult, main.decodeName(createResult.dataset.text))
        );
        const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
        customerEditDetailsBtn.addEventListener('click', () =>
          customerEditDetailsBtnFunction(createResult, main.decodeName(createResult.dataset.text))
        );
        updateCustomerStats();
        refreshDashboardStats();

        const [customer_id, customer_image_url, customer_contact, customerType, customerPriceRate] = [
          createResult.dataset.id,
          createResult.dataset.image,
          createResult.dataset.contact,
          createResult.dataset.custom2,
          createResult.dataset.custom3,
        ];
        const { firstName, lastName } = main.decodeName(createResult.dataset.text);

        try {
          const response = await fetch(`${API_BASE_URL}/inquiry/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer_id,
              customer_image_url,
              customer_first_name: firstName,
              customer_last_name: lastName,
              customer_contact,
              customer_type: customerType.includes('Monthly') ? 'monthly' : 'daily',
              customer_tid: '',
              customer_pending: customerType.includes('Pending') ? 1 : 0,
              customer_rate: customerPriceRate.toLowerCase(),
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const newCustomer = await response.json();
        } catch (error) {
          console.error('Error creating customer:', error);
        }
      });
    } else {
      updateCustomer(columnsData, findResult, 1);
      if (isMonthlyCustomer) {
        if (
          !findResult.dataset.status ||
          findResult.dataset.status === 'pending' ||
          (findResult.dataset.custom2 || '').toLowerCase().includes('pending')
        ) {
          callback(findResult);
          processCheckinPayment(findResult, true, amount, priceRate);
        } else {
          main.closeModal();
        }
      } else {
        if (findResult.dataset.tid) payments.cancelCheckinPayment(findResult.dataset.tid);
        main.closeModal();
      }
    }
  });
  if (isMonthlyCustomer) {
    main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 2, (findResult) => {
      if (findResult) {
        updateCustomer(columnsData, findResult, 2);
        updateCustomerStats();
      }
    });
  }
}

async function updateCustomer(newData, oldData, tabIndex) {
  oldData.dataset.image = newData[1].data[0];
  oldData.dataset.text = newData[1].data[1];
  oldData.dataset.contact = newData[1].data[2];
  const { firstName, lastName, fullName } = main.decodeName(newData[1].data[1]);
  oldData.children[1].children[0].children[0].src = newData[1].data[0];
  oldData.children[1].children[0].children[1].textContent = fullName;

  switch (tabIndex) {
    case 1:
      oldData.dataset.custom2 = newData[2];
      oldData.dataset.custom3 = newData[3];
      oldData.children[2].innerHTML = newData[2];
      oldData.children[3].innerHTML = newData[3];
      break;
    case 2:
      break;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/inquiry/customers/${oldData.dataset.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_image_url: newData[1].data[0],
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_contact: newData[1].data[2],
        customer_type: newData[2].toLowerCase().includes('monthly') ? 'monthly' : 'daily',
        customer_tid: '',
        customer_pending: newData[2].toLowerCase().includes('active') ? 0 : 1,
        customer_rate: newData[3].toLowerCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await response.json();
  } catch (error) {
    console.error('Error updating customer:', error);
  }
  updateCustomerStats();
  refreshDashboardStats();
}

function autoChangeButtonText(title, button, text) {
  switch (title.toLowerCase()) {
    case 'check-in':
      button.innerHTML = text;
      break;
    case 'renew':
    case 'monthly':
    case 'reserve':
      button.innerHTML = `Initiate Process ${getEmoji('📒')}`;
      break;
  }
}

function customerProcessBtnFunction(customer, { firstName, lastName, fullName }) {
  if (customer.dataset.custom2.toLowerCase().includes('fetching')) {
    return;
  }
  const hasReachedStart = hasReachedStartDate(customer);

  // If it's a monthly customer and start date hasn't been reached, show a message
  if (customer.dataset.custom2.toLowerCase().includes('incoming') || !hasReachedStart) {
    let startDateStr = customer.dataset.custom2.toLowerCase().includes('incoming') ? 'N/A' : customer.dataset.custom2;
    if (startDateStr === 'N/A') {
      main.findAtSectionOne(SECTION_NAME, customer.dataset.id, 'equal_id', 2, (findResult) => {
        if (findResult) {
          startDateStr = findResult.dataset.custom2;
          main.openConfirmationModal(
            `Customer membership not yet active:<br><br><span class="text-lg">${fullName}</span><br>ID: ${customer.dataset.id}<br>Start date: ${startDateStr}<br><br>Actions will be available once the start date is reached.`,
            () => {
              main.closeConfirmationModal(() => continueCustomerProcess());
            }
          );
        }
      });
    } else {
      main.openConfirmationModal(
        `Customer membership not yet active:<br><br><span class="text-lg">${fullName}</span><br>ID: ${customer.dataset.id}<br>Start date: ${startDateStr}<br><br>Actions will be available once the start date is reached.`,
        () => {
          main.closeConfirmationModal(() => continueCustomerProcess());
        }
      );
    }
    return;
  }

  continueCustomerProcess();

  function continueCustomerProcess() {
    const isMonthlyCustomer = customer.dataset.custom2.toLowerCase().includes('active');

    const inputs = {
      header: {
        title: `Initiate Customer Process ${getEmoji('📒', 26)}`,
      },
      short: [{ placeholder: 'Customer details', value: `${fullName} (${customer.dataset.id})`, locked: true }],
      radio: [
        {
          label: 'Process options',
          selected: 1,
          autoformat: { type: 'footer:sub', text: `Check-in ${getEmoji('📘')}` },
        },
        {
          icon: `${getEmoji('📘', 26)}`,
          title: 'Check-in',
          subtitle: 'Check-in this customer for today',
          listener: (title, button, text) => {
            if (isMonthlyCustomer) autoChangeButtonText(title, button, text);
          },
        },
        {
          icon: `${getEmoji('🎫', 26)}`,
          title: `${isMonthlyCustomer ? 'Renew' : 'Monthly'}`,
          subtitle: `${isMonthlyCustomer ? 'Monthly renewal' : 'Register this customer to monthly'}`,
          listener: autoChangeButtonText,
        },
        {
          icon: `${getEmoji('🛕', 26)}`,
          title: 'Reserve',
          subtitle: 'Reserve facility with this customer',
          listener: autoChangeButtonText,
        },
      ],
      footer: {
        main: isMonthlyCustomer ? `Check-in ${getEmoji('📘')}` : `Initiate Process ${getEmoji('📒')}`,
      },
    };

    continueCustomerProcessBtnFunction();

    function continueCustomerProcessBtnFunction() {
      main.openModal('yellow', inputs, (result) => {
        const isMonthlyCustomer =
          (customer.dataset.custom4 && customer.dataset.custom4.toLowerCase().includes('days')) ||
          customer.dataset.custom2.toLowerCase().includes('active');
        const isPending = customer.dataset.custom2.toLowerCase().includes('pending');
        const priceRate = customer.dataset.custom3.toLowerCase();
        let amount =
          isMonthlyCustomer && isPending
            ? PRICES_AUTOFILL[`${priceRate}_${customer.dataset.custom2.toLowerCase().split(' - ')[0]}`]
            : isMonthlyCustomer
              ? 0
              : PRICES_AUTOFILL[
                  `${priceRate}_${customer.dataset.custom2.toLowerCase().includes('incoming') ? 'daily' : customer.dataset.custom2.toLowerCase()}`
                ];
        const selectedProcess = main.getSelectedRadio(result.radio).toLowerCase();
        if ((isMonthlyCustomer && isPending) || (!isMonthlyCustomer && customer.dataset.tid)) {
          payments.pendingTransaction(customer.dataset.tid, (pendingResult) => {
            if (pendingResult) {
              const purpose = pendingResult.dataset.custom2.toLowerCase();
              if (!isMonthlyCustomer && purpose.includes('daily') && selectedProcess.includes('check-in')) {
                successPending();
              } else if (
                purpose.includes('monthly') &&
                (selectedProcess.includes('monthly') || selectedProcess.includes('renew'))
              ) {
                successPending();
              } else {
                failedPending();
              }

              function successPending() {
                main.closeModal(() => {
                  payments.continueProcessCheckinPayment(customer.dataset.tid, fullName);
                });
              }

              function failedPending() {
                main.toast(`${PENDING_TRANSACTION_MESSAGE} ${customer.dataset.tid}`, 'error');
              }
            } else {
              const proceedWithoutPending = () => {
                if (selectedProcess.includes('check-in')) {
                  checkins.findLogCheckin(customer.dataset.id, isMonthlyCustomer ? 2 : 1, (findLogResult) => {
                    if (findLogResult) {
                      const logDate = findLogResult.dataset.datetime
                        ? findLogResult.dataset.datetime.split(' - ')[0]
                        : findLogResult.dataset.date
                          ? findLogResult.dataset.date
                          : findLogResult.dataset.custom2.split(' - ')[0];
                      const logDateObj = new Date(logDate);
                      const today = new Date();
                      const isToday =
                        logDateObj.getFullYear() === today.getFullYear() &&
                        logDateObj.getMonth() === today.getMonth() &&
                        logDateObj.getDate() === today.getDate();
                      if (isToday) {
                        const displayDatetime =
                          findLogResult.dataset.datetime || findLogResult.dataset.date || findLogResult.dataset.custom2;
                        main.openConfirmationModal(
                          `Customer already checked-in today:<br><br><span class="text-lg">${fullName}</span><br>ID: ${customer.dataset.id}<br>${displayDatetime}`,
                          () => {
                            continueCheckinProcess();
                            main.closeConfirmationModal();
                          }
                        );
                        return;
                      }
                    }
                    continueCheckinProcess();

                    function continueCheckinProcess() {
                      if (isMonthlyCustomer && !isPending) {
                        checkins.logCheckin(
                          customer.dataset.tid || `CI_${customer.dataset.id}_${Date.now()}`,
                          customer,
                          2,
                          true
                        );
                        return;
                      } else {
                        processCheckinPayment(customer, isMonthlyCustomer, amount, priceRate);
                      }
                    }
                  });

                  return;
                }
                if (selectedProcess.includes('monthly') || selectedProcess.includes('renew')) {
                  const columnsData = [
                    'id_' + customer.dataset.id,
                    {
                      type: 'object_contact',
                      data: [customer.dataset.image, customer.dataset.text, customer.dataset.contact],
                    },
                    'Monthly',
                    customer.dataset.custom3,
                    'custom_date_' + customer.dataset.date,
                  ];
                  validateCustomer(
                    customer.dataset.id,
                    columnsData,
                    continueCustomerProcessBtnFunction,
                    selectedProcess.includes('renew')
                      ? {
                          startDate: customer.dataset.startdate,
                          endDate: customer.dataset.enddate,
                          days: customer.dataset.days,
                        }
                      : null,
                    true,
                    true
                  );
                  return;
                }
                if (selectedProcess.includes('reserve')) {
                  main.sharedState.reserveCustomerId = customer.dataset.id;
                  main.closeModal(() => {
                    reservations.reserveCustomer();
                  });
                }
              };

              // Clear stale TID locally to avoid future false positives
              customer.dataset.tid = '';
              proceedWithoutPending();
            }
          });
        } else {
          if (selectedProcess.includes('check-in')) {
            checkins.findLogCheckin(customer.dataset.id, isMonthlyCustomer ? 2 : 1, (findLogResult) => {
              if (findLogResult) {
                const logDate = findLogResult.dataset.datetime
                  ? findLogResult.dataset.datetime.split(' - ')[0]
                  : findLogResult.dataset.date
                    ? findLogResult.dataset.date
                    : findLogResult.dataset.custom2.split(' - ')[0];
                const logDateObj = new Date(logDate);
                const today = new Date();
                const isToday =
                  logDateObj.getFullYear() === today.getFullYear() &&
                  logDateObj.getMonth() === today.getMonth() &&
                  logDateObj.getDate() === today.getDate();
                if (isToday) {
                  const displayDatetime =
                    findLogResult.dataset.datetime || findLogResult.dataset.date || findLogResult.dataset.custom2;
                  main.openConfirmationModal(
                    `Customer already checked-in today:<br><br><span class="text-lg">${fullName}</span><br>ID: ${customer.dataset.id}<br>${displayDatetime}`,
                    () => {
                      continueCheckinProcess();
                      main.closeConfirmationModal();
                    }
                  );
                  return;
                }
              }
              continueCheckinProcess();

              function continueCheckinProcess() {
                if (isMonthlyCustomer && !isPending) {
                  checkins.logCheckin(
                    customer.dataset.tid || `CI_${customer.dataset.id}_${Date.now()}`,
                    customer,
                    2,
                    true
                  );
                  return;
                } else {
                  processCheckinPayment(
                    customer,
                    customer.dataset.custom2.toLowerCase().includes('monthly'),
                    amount,
                    priceRate
                  );
                }
              }
            });

            return;
          }
          if (selectedProcess.includes('monthly') || selectedProcess.includes('renew')) {
            const columnsData = [
              'id_' + customer.dataset.id,
              {
                type: 'object_contact',
                data: [customer.dataset.image, customer.dataset.text, customer.dataset.contact],
              },
              'Monthly',
              customer.dataset.custom3,
              'custom_date_' + customer.dataset.date,
            ];
            validateCustomer(
              customer.dataset.id,
              columnsData,
              continueCustomerProcessBtnFunction,
              selectedProcess.includes('renew')
                ? {
                    startDate: customer.dataset.startdate,
                    endDate: customer.dataset.enddate,
                    days: customer.dataset.days,
                  }
                : null,
              true,
              true
            );
            return;
          }
          if (selectedProcess.includes('reserve')) {
            main.sharedState.reserveCustomerId = customer.dataset.id;
            main.closeModal(() => {
              reservations.reserveCustomer();
            });
          }
        }
      });
    }
  }
}

function customerEditDetailsBtnFunction(customer, { firstName, lastName, fullName }) {
  const customerData = {
    id: customer.dataset.id,
    image: customer.dataset.image,
    firstName,
    lastName,
    contact: customer.dataset.contact,
    customerType: customer.dataset.custom2.split(' - ')[0],
    priceRate: customer.dataset.custom3,
    date: customer.dataset.date,
    tid: customer.dataset.tid,
  };
  mainBtnFunction(customerData);
}

function processCheckinPayment(customer, isMonthlyCustomer, amount, priceRate) {
  const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);
  main.toast(`${firstName}, is now ready for check-in payment!`, 'success');
  main.closeModal(() => {
    payments.processCheckinPayment(
      customer.dataset.id,
      customer.dataset.image,
      fullName,
      isMonthlyCustomer,
      amount,
      main.getSelectedOption(priceRate, PRICE_RATE),
      async (transactionId) => {
        customer.dataset.tid = transactionId;

        try {
          const response = await fetch(`${API_BASE_URL}/inquiry/customers/pending/${customer.dataset.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer_type: isMonthlyCustomer ? 'monthly' : 'daily',
              customer_tid: customer.dataset.tid,
              customer_pending: 1,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          await response.json();
        } catch (error) {
          console.error('Error updating customer:', error);
        }

        if (isMonthlyCustomer) {
          try {
            const response = await fetch(`${API_BASE_URL}/inquiry/monthly/${customer.dataset.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                customer_tid: customer.dataset.tid,
                customer_pending: 1,
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            await response.json();
          } catch (error) {
            console.error('Error updating customer:', error);
          }
        }
      }
    );
  });
}

export function completeCheckinPayment(transactionId, amountPaid, priceRate) {
  main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', 1, (findResult1) => {
    if (findResult1) {
      const customerType = findResult1.dataset.custom2.split(' - ')[0];
      const isMonthlyCustomer = customerType.toLowerCase().includes('monthly');
      if (isMonthlyCustomer) {
        findResult1.dataset.custom2 =
          customerType +
          ' - ' +
          (findResult1.dataset.custom2.toLowerCase().includes('incoming') ? 'Incoming' : 'Active');
        findResult1.children[2].textContent = findResult1.dataset.custom2;
        findResult1.dataset.status = findResult1.dataset.custom2.toLowerCase().split(' - ')[1];
        findResult1.dataset.tid = '';

        if (findResult1.dataset.status.includes('incoming')) {
          checkins.logCheckin(transactionId, findResult1, 1, true);
          return;
        }

        // Resolve date range and days for monthly activation; portal-created rows may lack dataset values
        const resolveMonthlyDates = async () => {
          let startDisplay = findResult1.dataset.startdate;
          let endDisplay = findResult1.dataset.enddate;
          let daysVal = findResult1.dataset.days;
          if (!startDisplay || !endDisplay || !daysVal) {
            try {
              const resp = await fetch(`${API_BASE_URL}/inquiry/monthly/${encodeURIComponent(findResult1.dataset.id)}`);
              if (resp.ok) {
                const data = await resp.json();
                const rec = Array.isArray(data.result) ? data.result[0] : data.result;
                if (rec && rec.customer_start_date && rec.customer_end_date) {
                  startDisplay = main.encodeDate(
                    rec.customer_start_date,
                    main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                  );
                  endDisplay = main.encodeDate(
                    rec.customer_end_date,
                    main.getUserPrefs().dateFormat === 'DD-MM-YYYY' ? 'numeric' : 'long'
                  );
                  const start = new Date(rec.customer_start_date);
                  const end = new Date(rec.customer_end_date);
                  const diff = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                  daysVal = String(diff);
                }
              }
            } catch (_) {}
          }

          return { startDisplay, endDisplay, daysVal };
        };

        (async () => {
          const { startDisplay, endDisplay, daysVal } = await resolveMonthlyDates();
          const columnsData = [
            'id_' + findResult1.dataset.id,
            {
              type: 'object_contact',
              data: [findResult1.dataset.image, findResult1.dataset.text, findResult1.dataset.contact],
            },
            startDisplay || 'N/A',
            endDisplay || 'N/A',
            (daysVal ? daysVal : '0') + ' day' + (+daysVal > 1 ? 's' : ''),
            main.formatPrice(amountPaid),
            main.fixText(priceRate),
            'custom_datetime_today',
          ];

          main.createAtSectionOne(SECTION_NAME, columnsData, 2, async (createResult) => {
            main.createNotifDot(SECTION_NAME, 2);

            const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
            customerProcessBtn.addEventListener('click', () =>
              customerProcessBtnFunction(findResult1, main.decodeName(findResult1.dataset.text))
            );
            const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
            customerEditDetailsBtn.addEventListener('click', () =>
              customerEditDetailsBtnFunction(findResult1, main.decodeName(findResult1.dataset.text))
            );

            try {
              const response = await fetch(`${API_BASE_URL}/inquiry/customers/pending/${findResult1.dataset.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  customer_type: 'monthly',
                  customer_tid: '',
                  customer_pending: 0,
                }),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              await response.json();
            } catch (error) {
              console.error('Error updating customer:', error);
            }

            try {
              const response = await fetch(`${API_BASE_URL}/inquiry/monthly/${findResult1.dataset.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  customer_tid: '',
                  customer_pending: 0,
                }),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              await response.json();
            } catch (error) {
              console.error('Error updating customer:', error);
            }
            updateCustomerStats();
            refreshDashboardStats();
          });
        })();

        main.showSection(SECTION_NAME, 2);
      } else {
        findResult1.dataset.tid = '';
        checkins.logCheckin(transactionId, findResult1, 1, true);
      }
    }
  });
}

export function customerDetailsBtnFunction(customerId, title, emoji) {
  main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 1, (findResult1) => {
    if (findResult1) {
      continueCustomerDetailsBtnFunction(findResult1);
    } else {
      main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 4, (findResult2) => {
        if (findResult2) {
          continueCustomerDetailsBtnFunction(findResult2);
        } else {
          main.toast("There's no customer with that customer ID anymore!", 'error');
        }
      });
    }
  });

  function continueCustomerDetailsBtnFunction(customer) {
    const { firstName, lastName, fullName } = main.decodeName(customer.dataset.text);
    const isArchivedCustomer = title.includes('Archive');

    const inputs = {
      header: {
        title: `${title} ${getEmoji(emoji, 26)}`,
        subtitle: `Customer ID: ${customerId}`,
      },
      image: {
        src: customer.dataset.image,
        type: 'normal',
        locked: true,
        short: [
          { placeholder: 'First name', value: firstName, locked: true },
          { placeholder: 'Last name', value: lastName, locked: true },
          { placeholder: 'Email / contact number', value: customer.dataset.contact, locked: true },
        ],
      },
      short: [
        { placeholder: 'Actor ID', value: 'U288343611137', locked: true },
        { placeholder: 'Actor name', value: 'Jestley', locked: true },
        { placeholder: 'Actor role', value: 'Admin', locked: true },
      ],
      footer: {
        main: isArchivedCustomer ? `Unarchive Customer` : `Exit View`,
        sub: isArchivedCustomer ? `Exit View` : undefined,
      },
    };

    main.openModal(
      'gray',
      inputs,
      async (result) => {
        if (isArchivedCustomer) {
          // Unarchive the customer
          try {
            const response = await fetch(`${API_BASE_URL}/inquiry/unarchive/${customerId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const serverResult = await response.json();
            const restored = serverResult && serverResult.result ? serverResult.result : {};
            const restoredType = (restored.customer_type || '').toLowerCase();
            const uiCustomerType = restoredType.includes('monthly') ? 'Monthly - Active' : 'Daily';
            const uiRate = main.fixText(String(restored.customer_rate || customer.dataset.custom3 || 'regular'));

            // Remove from archived tab and add to main customers tab
            main.deleteAtSectionOne(SECTION_NAME, 4, customerId);

            // Add back to main customers tab
            const columnsData = [
              'id_' + customerId,
              {
                type: 'object_contact',
                data: [customer.dataset.image, customer.dataset.text, customer.dataset.contact],
              },
              uiCustomerType,
              uiRate,
              'custom_date_today',
            ];

            main.createAtSectionOne(SECTION_NAME, columnsData, 1, (createResult) => {
              seenCustomerIds.add(customerId);
              const customerProcessBtn = createResult.querySelector(`#customerProcessBtn`);
              customerProcessBtn.addEventListener('click', () =>
                customerProcessBtnFunction(createResult, main.decodeName(createResult.dataset.text))
              );
              const customerEditDetailsBtn = createResult.querySelector(`#customerEditDetailsBtn`);
              customerEditDetailsBtn.addEventListener('click', () =>
                customerEditDetailsBtnFunction(createResult, main.decodeName(createResult.dataset.text))
              );
              updateCustomerStats();
            });

            main.toast(`${fullName} has been unarchived successfully!`, 'success');
            main.closeModal();
          } catch (error) {
            console.error('Error unarchiving customer:', error);
            main.toast('Failed to unarchive customer', 'error');
          }
        } else {
          main.closeModal();
        }
      },
      () => {
        // Sub button (Exit View) - only for archived customers
        if (isArchivedCustomer) {
          main.closeModal();
        }
      }
    );
  }
}

export function cancelPendingTransaction(transactionId, customerIdHint = null) {
  cancelPendingTransactionLoop(1);

  function cancelPendingTransactionLoop(tabIndex) {
    main.findAtSectionOne(SECTION_NAME, transactionId, 'equal_tid', tabIndex, async (findResult) => {
      if (findResult) {
        findResult.dataset.tid = '';
        if (findResult.dataset.status == 'pending') {
          findResult.dataset.startdate = '';
          findResult.dataset.enddate = '';
          findResult.dataset.days = '';
          findResult.dataset.status = '';

          findResult.dataset.custom2 = main.fixText(CUSTOMER_TYPE[0].value);
          findResult.children[2].innerHTML = findResult.dataset.custom2;

          try {
            const response = await fetch(`${API_BASE_URL}/inquiry/customers/pending/${findResult.dataset.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                customer_type: 'daily',
                customer_tid: '',
                customer_pending: 0,
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            await response.json();
          } catch (error) {
            console.error('Error updating customer:', error);
          }

          try {
            const response = await fetch(`${API_BASE_URL}/inquiry/monthly/${findResult.dataset.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            await response.json();
          } catch (error) {
            console.error('Error deleting customer:', error);
          }
        }
        cancelPendingTransactionLoop(2);
      } else if (tabIndex == 1) {
        cancelPendingTransactionLoop(2);
      } else {
        // Fallback: if we didn't find by TID in any tab but we have a customer ID hint,
        // force-clear pending flags in backend and try to update UI row by ID.
        if (customerIdHint) {
          try {
            await fetch(`${API_BASE_URL}/inquiry/customers/pending/${customerIdHint}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customer_type: 'daily', customer_tid: '', customer_pending: 0 }),
            });
          } catch (_) {}
          try {
            await fetch(`${API_BASE_URL}/inquiry/monthly/${customerIdHint}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (_) {}

          // Update UI by ID if present
          main.findAtSectionOne(SECTION_NAME, customerIdHint, 'equal_id', 1, (row) => {
            if (row) {
              row.dataset.custom2 = main.fixText(CUSTOMER_TYPE[0].value);
              row.children[2].innerHTML = row.dataset.custom2;
              row.dataset.status = '';
              row.dataset.tid = '';
            }
          });
        }
      }
    });
  }
}

export function getReserveCustomer(callback = () => {}) {
  main.findAtSectionOne(SECTION_NAME, main.sharedState.reserveCustomerId, 'equal_id', 1, (result) => {
    callback(result);
  });
}

function getCountFromTab(tabIndex) {
  const emptyText = document.getElementById(`${SECTION_NAME}SectionOneListEmpty${tabIndex}`);
  if (!emptyText) return 0;
  const items = emptyText.parentElement.parentElement.children;
  return Math.max(0, items.length - 1);
}

function updateCustomerStats() {
  try {
    const statElements = document.querySelectorAll(`#${SECTION_NAME}SectionStats`);
    if (!statElements || statElements.length < 1) return;
    const emptyText = document.getElementById(`${SECTION_NAME}SectionOneListEmpty1`);
    let totalRegular = 0;
    let totalStudent = 0;
    if (emptyText) {
      const tbody = emptyText.parentElement.parentElement;
      for (let i = 1; i < tbody.children.length; i++) {
        const row = tbody.children[i];
        const rate = (row.dataset.custom3 || '').toLowerCase();
        if (rate.includes('regular')) totalRegular++;
        else if (rate.includes('student')) totalStudent++;
      }
    }

    // Active monthly customers are rows in tab 2
    const activeMonthly = getCountFromTab(2);

    // Archived customers are rows in tab 4
    const totalArchived = getCountFromTab(4);

    // Active reservations are rows in inquiry-reservations tab 2
    const activeReservations = (() => {
      const emptyTextRes = document.getElementById(`inquiry-reservationsSectionOneListEmpty2`);
      if (!emptyTextRes) return 0;
      const items = emptyTextRes.parentElement.parentElement.children;
      return Math.max(0, items.length - 1);
    })();

    // Update the cards based on their header labels to avoid index/order issues
    statElements.forEach((card) => {
      const header = card.querySelector('.section-stats-h');
      const valueEl = card.querySelector('.section-stats-c');
      if (!header || !valueEl) return;
      const label = header.textContent.toLowerCase();
      if (label.includes('regular')) valueEl.textContent = totalRegular;
      else if (label.includes('student')) valueEl.textContent = totalStudent;
      else if (label.includes('monthly')) valueEl.textContent = activeMonthly;
      else if (label.includes('reservations')) valueEl.textContent = activeReservations;
      else if (label.includes('archived')) valueEl.textContent = totalArchived;
    });
  } catch (e) {}
}

export function startRenewCustomer(customerId) {
  main.showSection(SECTION_NAME);
  main.findAtSectionOne(SECTION_NAME, customerId, 'equal_id', 1, (findResult) => {
    if (findResult) {
      customerProcessBtnFunction(findResult, main.decodeName(findResult.dataset.text));
    }
  });
}

export default {
  completeCheckinPayment,
  customerDetailsBtnFunction,
  cancelPendingTransaction,
  getReserveCustomer,
  startRenewCustomer,
};
