import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';
import { API_BASE_URL } from '../_global.js';

// DOM elements
let mainBtn, subBtn, sectionTwoMainBtn;

// Default codes
document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'maintenance') return;

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
      result.result.forEach(equipment => {
        const columnsData = [
          equipment.equipment_id,
          equipment.equipment_name,
          equipment.quantity + '',
          equipment.equipment_type,
          `<p class="text-green-600 font-bold">${equipment.condition_status.charAt(0).toUpperCase() + equipment.condition_status.slice(1)} Condition ✅</p>`,
          'custom_date_today',
        ];
        
        main.createAtSectionOne('maintenance', columnsData, 1, equipment.equipment_name, (frontendResult, status) => {
          if (status === 'success') {
            if (equipment.created_at) {
              const date = new Date(equipment.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
              frontendResult.dataset.date = date;
              frontendResult.children[5].innerHTML = date; 
            }

            // Setup action buttons
            setupEquipmentButtons(frontendResult, equipment);
          }
        });
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
 * Show equipment details modal for editing
 */
function showEquipmentDetails(frontendResult, equipment) {
  const inputs = {
    header: {
      title: `Equipment Details ${getEmoji('🛠️', 26)}`,
      subtitle: `Equipment ID: ${equipment.equipment_id}`,
    },
    image: {
      src: equipment.image_url || '/src/images/client_logo.jpg',
      type: 'normal',
      short: [
        { placeholder: 'Equipment name', value: equipment.equipment_name, required: true },
        { placeholder: 'Quantity', value: equipment.quantity.toString(), required: true },
      ],
    },
    spinner: [
      {
        label: 'Equipment category',
        placeholder: 'Select an Equipment category',
        selected: equipment.equipment_type === 'machine' ? 1 : 2,
        required: true,
        options: [
          { value: 'machine', label: 'Machine' },
          { value: 'non-machine', label: 'Non-Machine' },
        ],
      },
    ],
    large: [
      {
        placeholder: 'Notes',
        value: equipment.notes || '',
      },
    ],
    footer: {
      main: `Update ${getEmoji('📌')}`,
      sub: `Delete ${getEmoji('💀')}`,
    },
  };

  // Open modal with callbacks
  main.openModal(
    'orange',
    inputs,
    (result) => updateEquipmentDetails(frontendResult, equipment, result),
    () => deleteEquipmentDetails(frontendResult, equipment)
  );
}

/**
 * Update equipment details via API
 */
async function updateEquipmentDetails(frontendResult, equipment, result) {
  const updateData = {
    equipment_name: result.image.short[0].value,
    equipment_type: result.spinner[0].options[result.spinner[0].selected - 1].value,
    quantity: parseInt(result.image.short[1].value),
    image_url: result.image.src,
    condition_status: equipment.condition_status,
    notes: result.large[0].value
  };

  const success = await updateEquipment(equipment.equipment_id, updateData);
  
  if (success) {
    const columnsData = [
      equipment.equipment_id,
      result.image.short[0].value,
      result.image.short[1].value,
      updateData.equipment_type,
      `<p class="text-green-600 font-bold">${equipment.condition_status.charAt(0).toUpperCase() + equipment.condition_status.slice(1)} Condition ${getEmoji('✅')}</p>`,
      `custom_date_${frontendResult.dataset.date}`,
    ];

    // Update UI and log action
    main.updateAtSectionOne('maintenance', columnsData, 1, equipment.equipment_id, (updatedResult) => {
      const action = {
        module: 'Maintenance',
        submodule: 'Equipment',
        description: 'Update equipment',
      };
      const data = {
        id: equipment.equipment_id,
        image: result.image.src,
        name: result.image.short[0].value,
        quantity: result.image.short[1].value,
        category: updateData.equipment_type,
        condition: equipment.condition_status,
        date: updatedResult.dataset.date,
        type: 'equipment',
      };
      accesscontrol.log(action, data);
      
      main.closeModal();
    });
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
        quantity: equipment.quantity,
        category: equipment.equipment_type,
        condition: equipment.condition_status,
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
      short: [
        { placeholder: 'Equipment name', value: '', required: true },
        { placeholder: 'Initial quantity', value: '', required: true },
      ],
    },
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
    if (!main.isValidPaymentAmount(+result.image.short[1].value)) {
      main.toast(`Invalid quantity: ${result.image.short[1].value}`, 'error');
      return;
    }
    if (result.spinner[0].selected < 1) {
      main.toast(`Invalid category`, 'error');
      return;
    }
    
    // Register new equipment
    registerNewProduct(
      result.image.src,
      result.image.short[0].value,
      +result.image.short[1].value,
      result.spinner[0].options[result.spinner[0].selected - 1].value
    );
  });
}

/**
 * Register new equipment via API
 */
async function registerNewProduct(image, name, quantity, category) {
  try {
    const equipmentData = {
      equipment_name: name,
      equipment_type: category,
      quantity: quantity,
      image_url: image,
      condition_status: 'good'
    };

    const response = await fetch(`${API_BASE_URL}/maintenance/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(equipmentData)
    });

    const result = await response.json();

    if (response.ok) {
      const columnsData = [
        result.result.equipment_id,
        name,
        quantity + '',
        category,
        `<p class="text-green-600 font-bold">Good Condition ${getEmoji('✅')}</p>`,
        'custom_date_today',
      ];

      // Add to UI and log action
      main.createAtSectionOne('maintenance', columnsData, 1, name, (frontendResult, status) => {
        if (status == 'success') {
          const equipmentData = {
            equipment_id: result.result.equipment_id,
            equipment_name: name,
            equipment_type: category,
            quantity: quantity,
            image_url: image,
            condition_status: 'good',
            notes: '',
            created_at: new Date().toISOString()
          };
          
          setupEquipmentButtons(frontendResult, equipmentData);
          
          const action = {
            module: 'Maintenance',
            submodule: 'Equipment',
            description: 'Register equipment',
          };
          const data = {
            id: result.result.equipment_id,
            image: image,
            name: name,
            quantity: quantity,
            category: category,
            condition: 'Good Condition',
            date: frontendResult.dataset.date,
            type: 'equipment',
          };
          accesscontrol.log(action, data);

          main.createRedDot('maintenance', 1);
          main.toast(`${name}, successfully registered!`, 'success');
          main.closeModal();
        } else {
          main.toast('Error: Equipment duplication detected: ' + frontendResult.dataset.id, 'error');
        }
      });
    } else {
      main.toast(`Backend Error: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Error registering equipment:', error);
    main.toast('Network error: Failed to register equipment', 'error');
  }
}

/**
 * Refresh equipment list from backend
 */
function refreshAllTabs() {
  const emptyText = document.getElementById('maintenanceSectionOneListEmpty1');
  if (emptyText) {
    const tableBody = emptyText.closest('tbody');
    const existingRows = Array.from(tableBody.querySelectorAll('tr:not(:first-child)'));
    existingRows.forEach(row => row.remove());
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
      body: JSON.stringify(updateData)
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
      }
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