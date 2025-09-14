import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';
import { API_BASE_URL } from '../_global.js';

// DOM elements
let mainBtn, subBtn, sectionTwoMainBtn;

// Helper function for emoji display
function getEmoji(emoji, size = 16) {
  return `<img src="/src/images/${emoji}.png" class="inline size-[${size}px] 2xl:size-[${size + 4}px]">`;
}

// Helper function to display general status with appropriate colors
function getGeneralStatusDisplay(generalStatus) {
  if (generalStatus === 'All Available') {
    return `<p class="text-green-600 font-bold emoji">All Available ${getEmoji('✅')}</p>`;
  } else if (generalStatus === 'Warning - Need Repair') {
    return `<p class="text-yellow-600 font-bold emoji">Warning - Need Repair ${getEmoji('⚠️')}</p>`;
  } else {
    return `<p class="text-gray-600 font-bold emoji">${generalStatus} ${getEmoji('❓')}</p>`;
  }
}

// Default codes
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'maintenance-equipment') return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);

  refreshAllTabs();
});
/**
 * Fetch and display equipment from backend
 */
async function loadExistingEquipment() {
  try {
    // Clear table first to prevent duplicates
    const tableBody = document.querySelector('#maintenanceSectionOneList');
    if (tableBody) tableBody.innerHTML = '';

    const response = await fetch(`${API_BASE_URL}/maintenance/equipment`);
    const result = await response.json();

    if (response.ok && result.result) {
      result.result.forEach((equipment) => {
        const columnsData = [
          equipment.equipment_id.split('_').slice(0,2).join('_'),
          `<img src="${equipment.image_url || '/src/images/client_logo.jpg'}" alt="${equipment.equipment_name}" style="width:32px;height:32px;object-fit:cover;vertical-align:middle;margin-right:8px;border-radius:4px;">${equipment.equipment_name}`,
          equipment.total_quantity + '',
          equipment.equipment_type,
          getGeneralStatusDisplay(equipment.general_status),
          'custom_date_today',
        ];

        main.createAtSectionOne(
          'maintenance-equipment',
          columnsData,
          1,
          (frontendResult) => {
            if (equipment.created_at) {
              const date = new Date(equipment.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
              frontendResult.dataset.date = date;
              frontendResult.children[5].innerHTML = date;
            }

            // Setup action buttons
            setupEquipmentButtons(frontendResult, equipment);
          }
        );
      });
    }
  } catch (error) {
    console.error('Error loading equipment:', error);
    main.toast('Failed to load existing equipment', 'error');
  }
}

/**
 * Attach event listeners to equipment action buttons
 */
function setupEquipmentButtons(frontendResult, equipment) {
  const detailsBtn = frontendResult.querySelector('#maintenanceDetailsBtn');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => showEquipmentDetails(frontendResult, equipment));
  }
}

/**
 * Show equipment details modal with individual items
 */
async function showEquipmentDetails(frontendResult, equipment) {
  try {
    // Fetch individual items for this equipment
    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipment.equipment_id}/items`);
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error fetching equipment items:', result.error);
      main.toast('Failed to load equipment items', 'error');
      return;
    }
    
    const individualItems = result.result || [];
    
    // Create a custom modal for showing individual items
    showIndividualItemsModal(equipment, individualItems, frontendResult);
    
  } catch (error) {
    console.error('Error loading equipment items:', error);
    main.toast('Network error: Failed to load equipment items', 'error');
  }
}

/**
 * Show individual items modal
 */
function showIndividualItemsModal(equipment, individualItems, frontendResult) {
  // Create custom modal HTML
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/30 opacity-0 duration-300 z-20 hidden" id="individualItemsModal">
      <div class="m-auto w-full max-w-4xl -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Equipment Details ${getEmoji('🛠️', 26)}</p>
          <p class="text-xs">${equipment.equipment_name} - ${equipment.equipment_id.split('_').slice(0,2).join('_')}</p>
        </div>
        <div class="flex flex-col p-4">
          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Individual Items (${individualItems.length})</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              ${individualItems.map(item => `
                <div class="border rounded-lg p-3 ${item.individual_status === 'Available' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}">
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">${item.item_code}</span>
                    <span class="text-xs px-2 py-1 rounded ${item.individual_status === 'Available' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">
                      ${item.individual_status}
                    </span>
                  </div>
                  <select class="w-full text-sm border rounded px-2 py-1" data-item-id="${item.item_id}" onchange="updateIndividualStatus('${item.item_id}', this.value)">
                    <option value="Available" ${item.individual_status === 'Available' ? 'selected' : ''}>Available</option>
                    <option value="Unavailable" ${item.individual_status === 'Unavailable' ? 'selected' : ''}>Unavailable</option>
                  </select>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="flex gap-2">
            <button type="button" class="w-full rounded-lg bg-gray-500 p-4 font-bold text-white shadow-lg duration-300 hover:scale-105 hover:bg-gray-400 hover:shadow-xl hover:shadow-gray-500 active:scale-95 active:bg-gray-600 active:shadow-none" onclick="closeIndividualItemsModal()">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Show modal
  const modal = document.getElementById('individualItemsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 0);
  
  // Add global functions for the modal
  window.updateIndividualStatus = async (itemId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/equipment/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ individual_status: newStatus }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        main.toast(`Item status updated to ${newStatus}`, 'success');
        // Update the general status in the main table
        if (result.general_status) {
          // Find the row in the main table and update the status display
          const statusElement = frontendResult.querySelector('td:nth-child(5)');
          if (statusElement) {
            statusElement.innerHTML = getGeneralStatusDisplay(result.general_status);
          }
        }
      } else {
        main.toast(`Error: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      main.toast('Network error: Failed to update item status', 'error');
    }
  };
  
  window.closeIndividualItemsModal = () => {
    const modal = document.getElementById('individualItemsModal');
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  };
}

/**
 * Update equipment details via API
 */
async function updateEquipmentDetails(frontendResult, equipment, result) {
  const updateData = {
    equipment_name: result.short[0].value,
    equipment_type: result.spinner[0].options[result.spinner[0].selected - 1].value,
    total_quantity: parseInt(result.short[1].value),
    image_url: result.image.src,
    general_status: equipment.general_status,
    notes: result.large[0].value,
  };

  const success = await updateEquipment(equipment.equipment_id, updateData);

  if (success) {
    const columnsData = [
      equipment.equipment_id.split('_').slice(0,2).join('_'),
      `<img src="${updateData.image_url || '/src/images/client_logo.jpg'}" alt="${result.short[0].value}" style="width:32px;height:32px;object-fit:cover;vertical-align:middle;margin-right:8px;border-radius:4px;">${result.short[0].value}`,
      result.short[1].value,
      updateData.equipment_type,
      getGeneralStatusDisplay(equipment.general_status),
      `custom_date_${frontendResult.dataset.date}`,
    ];

    // UI refresh: reload the latest data directly from backend
    main.closeModal();
    refreshAllTabs();
  }
}

/**
 * Delete equipment with confirmation
 */
async function deleteEquipmentDetails(frontendResult, equipment) {
  main.openConfirmationModal(`Delete equipment: ${equipment.equipment_name}`, async () => {
    const success = await deleteEquipment(equipment.equipment_id);

    if (success) {
      // Log deletion and update UI
      const action = {
        module: 'Maintenance',
        submodule: 'Equipment',
        description: 'Delete equipment',
      };
      const data = {
        id: equipment.equipment_id,
        image: equipment.image_url,
        name: equipment.equipment_name,
        quantity: equipment.total_quantity,
        category: equipment.equipment_type,
        general_status: equipment.general_status,
        date: frontendResult.dataset.date,
        type: 'equipment',
      };
      accesscontrol.log(action, data);

      frontendResult.remove();
      main.closeModal();
      main.closeConfirmationModal();
    }
  });
}

/**
 * Show equipment registration form
 */
function mainBtnFunction() {
  const inputs = {
    header: {
      title: `Register Equipment ${getEmoji('🧊', 26)}`,
      subtitle: 'Equipment registration form',
    },
    image: {
      src: '/src/images/client_logo.jpg',
      type: 'normal',
    },
    short: [
      { placeholder: 'Equipment name', value: '', required: true },
      { placeholder: 'Initial quantity', value: '', required: true },
    ],
    spinner: [
      {
        label: 'Equipment category',
        placeholder: 'Select an Equipment category',
        selected: 0,
        required: true,
        options: [
          { value: 'machine', label: 'Machine' },
          { value: 'non-machine', label: 'Non-Machine' },
        ],
      },
    ],
  };

  main.openModal(mainBtn, inputs, (result) => {
    // Validate inputs
    if (!main.isValidPaymentAmount(+result.short[1].value)) {
      main.toast(`Invalid quantity: ${result.short[1].value}`, 'error');
      return;
    }
    if (result.spinner[0].selected < 1) {
      main.toast(`Invalid category`, 'error');
      return;
    }

    // Register new equipment
    registerNewProduct(
      result.image.src,
      result.short[0].value,
      +result.short[1].value,
      result.spinner[0].options[result.spinner[0].selected - 1].value
    );
  });
}

/**
 * Generate equipment code based on 3 consonants rule
 * Example: "Cable Crossover" -> "CABCRO001"
 */
function generateEquipmentCode(equipmentName, index = 1) {
  // Remove special characters and split into words
  const words = equipmentName.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
  
  if (words.length < 2) {
    // If only one word, use first 6 consonants
    const consonants = words[0].replace(/[aeiouAEIOU]/g, '').toUpperCase();
    return consonants.substring(0, 6).padEnd(6, 'X') + String(index).padStart(3, '0');
  }
  
  // Get first 3 consonants from first word
  const firstWordConsonants = words[0].replace(/[aeiouAEIOU]/g, '').toUpperCase();
  const firstPart = firstWordConsonants.substring(0, 3).padEnd(3, 'X');
  
  // Get first 3 consonants from second word
  const secondWordConsonants = words[1].replace(/[aeiouAEIOU]/g, '').toUpperCase();
  const secondPart = secondWordConsonants.substring(0, 3).padEnd(3, 'X');
  
  // Combine with 3-digit index
  return firstPart + secondPart + String(index).padStart(3, '0');
}

/**
 * Generate a sequential ID with leading zeros (legacy function)
 */
function generateSequentialId(baseId, index, total) {
  const digits = Math.ceil(Math.log10(total + 1));
  return `${baseId}_${String(index + 1).padStart(digits, '0')}`;
}

/**
 * Register new equipment with auto-registration of individual items
 */
async function registerNewProduct(image, name, quantity, category) {
  try {
    const equipmentData = {
      equipment_name: name,
      equipment_type: category,
      quantity: quantity,
      image_url: image,
    };

    const response = await fetch(`${API_BASE_URL}/maintenance/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(equipmentData),
    });

    const result = await response.json();

    if (response.ok) {
      // Add main equipment entry to UI
      const columnsData = [
        result.result.equipment_id.split('_').slice(0,2).join('_'),
        `<img src="${image || '/src/images/client_logo.jpg'}" alt="${name}" 
             style="width:32px;height:32px;object-fit:cover;vertical-align:middle;margin-right:8px;border-radius:4px;">
         ${name}`,
        quantity.toString(),
        category,
        getGeneralStatusDisplay('All Available'),
        'custom_date_today',
      ];

      // Add to UI
      main.createAtSectionOne('maintenance-equipment', columnsData, 1, (frontendResult) => {
        const equipmentData = {
          equipment_id: result.result.equipment_id,
          equipment_name: name,
          equipment_type: category,
          total_quantity: quantity,
          image_url: image,
          general_status: 'All Available',
          notes: '',
          created_at: new Date().toISOString(),
        };

        setupEquipmentButtons(frontendResult, equipmentData);
      });

      // Log the action
      const action = {
        module: 'Maintenance',
        submodule: 'Equipment',
        description: `Registered equipment with ${quantity} individual items`,
      };
      const data = {
        id: result.result.equipment_id,
        image: image,
        name: name,
        quantity: quantity,
        category: category,
        individual_items_created: result.result.individual_items_created,
        date: new Date().toISOString().split('T')[0],
        type: 'equipment',
      };
      accesscontrol.log(action, data);

      main.createNotifDot('maintenance-equipment', 1);
      main.toast(`Successfully registered ${name} with ${quantity} individual items!`, 'success');
    } else {
      console.error('Error registering equipment:', result.error);
      main.toast(`Error: ${result.error}`, 'error');
    }
    
    main.closeModal();
  } catch (error) {
    console.error('Error registering equipment:', error);
    main.toast('Network error: Failed to register equipment', 'error');
  }
}

/**
 * Refresh equipment list from backend
 */
function refreshAllTabs() {
  const emptyText = document.getElementById('maintenance-equipmentSectionOneListEmpty1');
  if (emptyText) {
    const tableBody = emptyText.closest('tbody');
    const existingRows = Array.from(tableBody.querySelectorAll('tr:not(:first-child)'));
    existingRows.forEach((row) => row.remove());
  }

  loadExistingEquipment();
}

/**
 * API: Update equipment
 */
async function updateEquipment(equipmentId, updateData) {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const result = await response.json();

    if (response.ok) {
      main.toast('Equipment updated successfully!', 'success');
      return true;
    } else {
      main.toast(`Update Error: ${result.error}`, 'error');
      return false;
    }
  } catch (error) {
    console.error('Error updating equipment:', error);
    main.toast('Network error: Failed to update equipment', 'error');
    return false;
  }
}

/**
 * API: Delete equipment
 */
async function deleteEquipment(equipmentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      main.toast('Equipment deleted successfully!', 'success');
      return true;
    } else {
      main.toast(`Delete Error: ${result.error}`, 'error');
      return false;
    }
  } catch (error) {
    console.error('Error deleting equipment:', error);
    main.toast('Network error: Failed to delete equipment', 'error');
    return false;
  }
}

export { updateEquipment, deleteEquipment, refreshAllTabs };
