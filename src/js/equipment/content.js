import modal from '../admin_main.js';
import equipmentStats from './stats.js';

const active = equipment_tab1?.className || 'section-content-tab bg-gray-200 hover:bg-gray-300';
const inactive = equipment_tab2?.className || 'section-content-tab bg-transparent hover:bg-gray-200';
let currentActiveTab;

let lastTabSwitchTime = 0;
const TAB_SWITCH_DELAY = 1000;
let activeTimeout = null;

let equipmentData = [];
let maintenanceData = [];
let equipmentIdCounter = 4; 

// Sample equipments
const sampleEquipment = [
  {
    id: 'EQ001',
    name: 'Treadmill Pro 2000',
    type: 'Cardio',
    serialNumber: 'TM-2024-001',
    location: 'Cardio Zone A',
    description: 'Professional treadmill with incline control',
    status: 'Operational',
    purchaseDate: '2024-01-15',
    lastMaintenance: '2024-03-01',
    nextMaintenance: '2024-06-01',
    addedDate: '2024-01-15T10:00:00Z'
  },
  {
    id: 'EQ002',
    name: 'Weight Bench Deluxe',
    type: 'Strength',
    serialNumber: 'WB-2024-002',
    location: 'Strength Zone B',
    description: 'Adjustable weight bench for various exercises',
    status: 'Maintenance Due',
    purchaseDate: '2024-02-01',
    lastMaintenance: '2024-02-15',
    nextMaintenance: '2024-05-15',
    addedDate: '2024-02-01T14:30:00Z'
  },
  {
    id: 'EQ003',
    name: 'Elliptical Trainer',
    type: 'Cardio',
    serialNumber: 'ET-2024-003',
    location: 'Cardio Zone B',
    description: 'Low-impact cardio machine',
    status: 'Out of Service',
    purchaseDate: '2024-01-20',
    lastMaintenance: '2024-03-10',
    nextMaintenance: '2024-06-10',
    addedDate: '2024-01-20T09:15:00Z'
  }
];

// Fallback data management functions
const dataManager = {
  getEquipmentData: () => {
    if (typeof equipmentStats !== 'undefined' && equipmentStats.getEquipmentData) {
      return equipmentStats.getEquipmentData();
    }
    return equipmentData;
  },
  
  addEquipment: (equipment) => {
    if (typeof equipmentStats !== 'undefined' && equipmentStats.addEquipment) {
      return equipmentStats.addEquipment(equipment);
    }
    
    // Generate ID if not provided
    if (!equipment.id) {
      equipment.id = `EQ${String(equipmentIdCounter++).padStart(3, '0')}`;
    }
    
    equipmentData.push(equipment);
    return equipment;
  },
  
  updateEquipment: (id, updatedData) => {
    if (typeof equipmentStats !== 'undefined' && equipmentStats.updateEquipment) {
      return equipmentStats.updateEquipment(id, updatedData);
    }
    
    const index = equipmentData.findIndex(eq => eq.id === id);
    if (index !== -1) {
      equipmentData[index] = { ...equipmentData[index], ...updatedData };
      return equipmentData[index];
    }
    return null;
  },
  
  removeEquipment: (id) => {
    if (typeof equipmentStats !== 'undefined' && equipmentStats.removeEquipment) {
      return equipmentStats.removeEquipment(id);
    }
    
    const index = equipmentData.findIndex(eq => eq.id === id);
    if (index !== -1) {
      return equipmentData.splice(index, 1)[0];
    }
    return null;
  },
  
  getMaintenanceData: () => {
    if (typeof equipmentStats !== 'undefined' && equipmentStats.getMaintenanceData) {
      return equipmentStats.getMaintenanceData();
    }
    return maintenanceData;
  },
  
  addMaintenanceRecord: (equipmentId, maintenance) => {
    if (typeof equipmentStats !== 'undefined' && equipmentStats.addMaintenanceRecord) {
      return equipmentStats.addMaintenanceRecord(equipmentId, maintenance);
    }
    
    maintenance.id = `MNT${Date.now()}`;
    maintenanceData.push(maintenance);
    return maintenance;
  }
};

function showTab(tabIndex) {
  const now = Date.now();
  if (now - lastTabSwitchTime < TAB_SWITCH_DELAY) {
    return;
  }
  lastTabSwitchTime = now;
  currentActiveTab = tabIndex;

  // Get tab elements
  const tab1 = document.getElementById('equipment_tab1');
  const tab2 = document.getElementById('equipment_tab2');
  const inventorySection = document.getElementById('equipment_inventory');
  const maintenanceSection = document.getElementById('equipment_maintenance');

  if (!tab1 || !tab2 || !inventorySection || !maintenanceSection) {
    console.error('Required DOM elements not found');
    return;
  }

  if (tabIndex == 1) {
    tab1.lastElementChild?.classList.add('hidden');
  } else {
    tab2.lastElementChild?.classList.add('hidden');
  }

  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }

  // Update tab appearances
  if (tabIndex == 1) {
    tab1.children[0]?.classList.remove('text-gray-300');
    tab1.children[1]?.children[0]?.classList.remove('hidden');
    tab1.children[1]?.children[1]?.classList.add('hidden');
    tab2.children[0]?.classList.add('text-gray-300');
    tab2.children[1]?.children[0]?.classList.add('hidden');
    tab2.children[1]?.children[1]?.classList.remove('hidden');
  } else {
    tab1.children[0]?.classList.add('text-gray-300');
    tab1.children[1]?.children[0]?.classList.add('hidden');
    tab1.children[1]?.children[1]?.classList.remove('hidden');
    tab2.children[0]?.classList.remove('text-gray-300');
    tab2.children[1]?.children[0]?.classList.remove('hidden');
    tab2.children[1]?.children[1]?.classList.add('hidden');
  }

  activeTimeout = setTimeout(() => {
    if (tabIndex == 1) {
      tab2.children[0]?.classList.remove('text-gray-300');
      tab2.children[1]?.children[0]?.classList.remove('hidden');
      tab2.children[1]?.children[1]?.classList.add('hidden');
    } else {
      tab1.children[0]?.classList.remove('text-gray-300');
      tab1.children[1]?.children[0]?.classList.remove('hidden');
      tab1.children[1]?.children[1]?.classList.add('hidden');
    }
    activeTimeout = null;
  }, TAB_SWITCH_DELAY);

  // click listeners
  tab1.addEventListener('click', () => showTab(1));
  tab2.addEventListener('click', () => showTab(2));

  if (tabIndex === 1) {
    tab1.className = active;
    tab2.className = inactive;
  } else if (tabIndex === 2) {
    tab1.className = inactive;
    tab2.className = active;
  }

  // Setup search
  setupSearch(tabIndex);

  // Show/hide content sections
  if (tabIndex == 1) {
    inventorySection.classList.remove('hidden');
    maintenanceSection.classList.add('hidden');
  } else {
    inventorySection.classList.add('hidden');
    maintenanceSection.classList.remove('hidden');
  }
}

function setupSearch(tabIndex) {
  const searchInput = document.getElementById('equipmentSection1Search');
  if (!searchInput) return;

  // Remove existing listeners
  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);

  newSearchInput.value = '';
  newSearchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    let children;
    
    if (tabIndex == 1) {
      const inventoryContainer = document.getElementById('equipment_inventory');
      children = inventoryContainer?.children;
    } else {
      const maintenanceContainer = document.getElementById('equipment_maintenance');
      children = maintenanceContainer?.children;
    }

    if (!children) return;

    for (let i = 3; i < children.length; i++) {
      const child = children[i];
      const textContent = child.textContent.toLowerCase();

      if (textContent.includes(searchTerm)) {
        child.classList.remove('hidden');
      } else {
        child.classList.add('hidden');
      }
    }
  });
  
  // Trigger initial search
  newSearchInput.dispatchEvent(new Event('input'));
}

function createEquipmentRow(equipment) {
  const row = document.createElement('div');
  row.className = 'relative grid grid-cols-8 items-center border-b border-gray-200 p-4 font-medium text-gray-900 duration-300 hover:bg-white';
  row.dataset.equipmentId = equipment.id;
  
  const statusColor = equipment.status === 'Operational' ? 'text-green-600' : 
                     equipment.status === 'Maintenance Due' ? 'text-yellow-600' : 'text-red-600';
  
  row.innerHTML = `
    <p class="col-span-1 text-xs">${equipment.id}</p>
    <p class="col-span-2 pl-4 text-xs">${equipment.name}</p>
    <p class="col-span-1 pl-4 text-xs">${equipment.type}</p>
    <p class="col-span-1 pl-4 text-xs ${statusColor}">${equipment.status}</p>
    <p class="col-span-1 pl-4 text-xs">${equipment.lastMaintenance || 'N/A'}</p>
    <p class="col-span-1 pl-4 text-xs">${equipment.nextMaintenance || 'N/A'}</p>
    <p class="col-span-1 pl-4 text-xs"></p>
    <div class="absolute right-0 mr-4 flex gap-3">
      <button
        class="equipment-edit-btn rounded-lg bg-blue-500 px-4 py-2 text-white duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-400 active:translate-y-1 active:scale-95 active:bg-blue-700 active:shadow-none"
        data-equipment-id="${equipment.id}"
      >
        Edit ✏️
      </button>
      <button
        class="equipment-maintenance-btn rounded-lg bg-yellow-500 px-4 py-2 text-white duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-400 active:translate-y-1 active:scale-95 active:bg-yellow-700 active:shadow-none"
        data-equipment-id="${equipment.id}"
      >
        Maintenance 🔧
      </button>
      <button
        class="equipment-delete-btn rounded-lg bg-red-500 px-4 py-2 text-white duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-red-600 hover:shadow-lg hover:shadow-red-400 active:translate-y-1 active:scale-95 active:bg-red-700 active:shadow-none"
        data-equipment-id="${equipment.id}"
      >
        Delete 🗑️
      </button>
    </div>
  `;
  
  // Add event listeners
  row.querySelector('.equipment-edit-btn').addEventListener('click', () => editEquipment(equipment.id));
  row.querySelector('.equipment-maintenance-btn').addEventListener('click', () => scheduleMaintenance(equipment.id));
  row.querySelector('.equipment-delete-btn').addEventListener('click', () => deleteEquipment(equipment.id));
  
  return row;
}

function createMaintenanceRow(maintenance) {
  const row = document.createElement('div');
  row.className = 'relative grid grid-cols-7 items-center border-b border-gray-200 p-4 font-medium text-gray-900 duration-300 hover:bg-white';
  row.dataset.maintenanceId = maintenance.id;
  
  const priorityColor = maintenance.priority === 'High' ? 'text-red-600' : 
                       maintenance.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600';
  
  row.innerHTML = `
    <p class="col-span-1 text-xs">${maintenance.equipmentId}</p>
    <p class="col-span-2 pl-4 text-xs">${maintenance.equipmentName}</p>
    <p class="col-span-1 pl-4 text-xs">${maintenance.dueDate}</p>
    <p class="col-span-1 pl-4 text-xs ${priorityColor}">${maintenance.priority}</p>
    <p class="col-span-1 pl-4 text-xs">${maintenance.type}</p>
    <p class="col-span-1 pl-4 text-xs"></p>
    <div class="absolute right-0 mr-4 flex gap-3">
      <button
        class="maintenance-complete-btn rounded-lg bg-green-500 px-4 py-2 text-white duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-green-600 hover:shadow-lg hover:shadow-green-400 active:translate-y-1 active:scale-95 active:bg-green-700 active:shadow-none"
        data-maintenance-id="${maintenance.id}"
      >
        Complete ✅
      </button>
      <button
        class="maintenance-reschedule-btn rounded-lg bg-orange-500 px-4 py-2 text-white duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-400 active:translate-y-1 active:scale-95 active:bg-orange-700 active:shadow-none"
        data-maintenance-id="${maintenance.id}"
      >
        Reschedule 📅
      </button>
    </div>
  `;
  
  // Add event listeners
  row.querySelector('.maintenance-complete-btn').addEventListener('click', () => completeMaintenance(maintenance.id));
  row.querySelector('.maintenance-reschedule-btn').addEventListener('click', () => rescheduleMaintenance(maintenance.id));
  
  return row;
}

function loadEquipmentData() {
  console.log('Loading equipment data...');
  
  let currentEquipmentData = dataManager.getEquipmentData();
  console.log('Current equipment data:', currentEquipmentData);
  
  const inventoryContainer = document.getElementById('equipment_inventory');
  const emptyMessage = document.getElementById('equipmentInventoryEmpty');
  
  if (!inventoryContainer) {
    console.error('Equipment inventory container not found');
    return;
  }
  
  if (currentEquipmentData.length === 0) {
    console.log('No equipment data found, adding sample data...');
    sampleEquipment.forEach(equipment => {
      dataManager.addEquipment(equipment);
    });
    
    // Get the updated data
    currentEquipmentData = dataManager.getEquipmentData();
    console.log('Updated equipment data:', currentEquipmentData);
  }
  
  // Clear existing rows (except header and empty message)
  const existingRows = inventoryContainer.querySelectorAll('[data-equipment-id]');
  existingRows.forEach(row => row.remove());
  
  // Add equipment rows
  currentEquipmentData.forEach(equipment => {
    console.log('Creating row for equipment:', equipment);
    const row = createEquipmentRow(equipment);
    inventoryContainer.appendChild(row);
  });
  
  // Show/hide empty message
  if (emptyMessage) {
    emptyMessage.classList.toggle('hidden', currentEquipmentData.length > 0);
  }
  
  console.log(`Loaded ${currentEquipmentData.length} equipment items`);
}

function loadMaintenanceData() {
  const currentMaintenanceData = dataManager.getMaintenanceData();
  const maintenanceContainer = document.getElementById('equipment_maintenance');
  const emptyMessage = document.getElementById('equipmentMaintenanceEmpty');
  
  if (!maintenanceContainer) {
    console.error('Equipment maintenance container not found');
    return;
  }
  
  // Clear existing rows (except header and empty message)
  const existingRows = maintenanceContainer.querySelectorAll('[data-maintenance-id]');
  existingRows.forEach(row => row.remove());
  
  // Add maintenance rows
  currentMaintenanceData.forEach(maintenance => {
    const row = createMaintenanceRow(maintenance);
    maintenanceContainer.appendChild(row);
  });
  
  // Show/hide empty message
  if (emptyMessage) {
    emptyMessage.classList.toggle('hidden', currentMaintenanceData.length > 0);
  }
}

function editEquipment(equipmentId) {
  const equipment = dataManager.getEquipmentData().find(eq => eq.id === equipmentId);
  if (!equipment) {
    modal.toast('Equipment not found!', 'error');
    return;
  }
  
  console.log('Editing equipment:', equipment);
  
  const inputs = {
    short: [
      { placeholder: 'Equipment Name', value: equipment.name, required: true },
      { placeholder: 'Equipment Type', value: equipment.type, required: true },
      { placeholder: 'Serial Number', value: equipment.serialNumber || '', required: false },
      { placeholder: 'Location', value: equipment.location || '', required: true },
      { placeholder: 'Status (Operational/Maintenance Due/Out of Service)', value: equipment.status, required: true }
    ],
    large: [
      { placeholder: 'Description', value: equipment.description || '', required: false }
    ],
    date: [
      { placeholder: 'Purchase Date', value: equipment.purchaseDate || '', required: false },
      { placeholder: 'Last Maintenance Date', value: equipment.lastMaintenance || '', required: false },
      { placeholder: 'Next Maintenance Date', value: equipment.nextMaintenance || '', required: false }
    ]
  };
  
  modal.openModal(
    'indigo//Edit Equipment ✏️//Update equipment information//Update Equipment ✅',
    inputs,
    (result) => {
      modal.openConfirmationModal('Update equipment: ' + result.short[0].value, () => {
        const updatedEquipment = {
          name: result.short[0].value,
          type: result.short[1].value,
          serialNumber: result.short[2].value,
          location: result.short[3].value,
          status: result.short[4].value,
          description: result.large[0]?.value || '',
          purchaseDate: result.date[0]?.value || '',
          lastMaintenance: result.date[1]?.value || '',
          nextMaintenance: result.date[2]?.value || ''
        };
        
        dataManager.updateEquipment(equipmentId, updatedEquipment);
        loadEquipmentData();
        updateSidebarStats();
        
        modal.toast('Equipment updated successfully!', 'success');
        modal.closeConfirmationModal();
        modal.closeModal();
      });
    }
  );
}

function scheduleMaintenance(equipmentId) {
  const equipment = dataManager.getEquipmentData().find(eq => eq.id === equipmentId);
  if (!equipment) {
    modal.toast('Equipment not found!', 'error');
    return;
  }
  
  console.log('Scheduling maintenance for:', equipment);
  
  const inputs = {
    short: [
      { placeholder: 'Maintenance Type', value: '', required: true },
      { placeholder: 'Technician', value: '', required: true },
      { placeholder: 'Estimated Cost', value: '', required: false },
      { placeholder: 'Priority (High/Medium/Low)', value: 'Medium', required: true }
    ],
    large: [
      { placeholder: 'Maintenance Description', value: '', required: true }
    ],
    date: [
      { placeholder: 'Due Date', value: '', required: true },
      { placeholder: 'Estimated Duration (days)', value: '1', required: false }
    ]
  };
  
  modal.openModal(
    'yellow//Schedule Maintenance 🔧//Schedule maintenance for ' + equipment.name + '//Schedule Maintenance 📅',
    inputs,
    (result) => {
      modal.openConfirmationModal('Schedule maintenance for: ' + equipment.name, () => {
        const maintenanceRecord = {
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          type: result.short[0].value,
          technician: result.short[1].value,
          estimatedCost: result.short[2].value || 0,
          description: result.large[0].value,
          priority: result.short[3].value,
          dueDate: result.date[0].value,
          estimatedDuration: result.date[1].value || 1,
          status: 'Scheduled',
          createdDate: new Date().toISOString()
        };
        
        dataManager.addMaintenanceRecord(equipmentId, maintenanceRecord);
        
        // Update equipment status if needed
        if (equipment.status === 'Operational') {
          dataManager.updateEquipment(equipmentId, { status: 'Maintenance Due' });
        }
        
        loadMaintenanceData();
        loadEquipmentData();
        updateSidebarStats();
        
        modal.toast('Maintenance scheduled successfully!', 'success');
        modal.closeConfirmationModal();
        modal.closeModal();
      });
    }
  );
}

function deleteEquipment(equipmentId) {
  const equipment = dataManager.getEquipmentData().find(eq => eq.id === equipmentId);
  if (!equipment) {
    modal.toast('Equipment not found!', 'error');
    return;
  }
  
  console.log('Deleting equipment:', equipment);
  
  modal.openConfirmationModal('Delete equipment: ' + equipment.name + '? This action cannot be undone.', () => {
    dataManager.removeEquipment(equipmentId);
    loadEquipmentData();
    updateSidebarStats();
    
    modal.toast('Equipment deleted successfully!', 'success');
    modal.closeConfirmationModal();
  });
}

function completeMaintenance(maintenanceId) {
  const maintenance = dataManager.getMaintenanceData().find(mnt => mnt.id === maintenanceId);
  if (!maintenance) {
    modal.toast('Maintenance record not found!', 'error');
    return;
  }
  
  console.log('Completing maintenance:', maintenance);
  
  const inputs = {
    short: [
      { placeholder: 'Actual Cost', value: maintenance.estimatedCost || '', required: false },
      { placeholder: 'Technician Notes', value: '', required: false }
    ],
    large: [
      { placeholder: 'Completion Notes', value: '', required: true }
    ],
    date: [
      { placeholder: 'Completion Date', value: new Date().toISOString().split('T')[0], required: true }
    ]
  };
  
  modal.openModal(
    'green//Complete Maintenance ✅//Complete maintenance for ' + maintenance.equipmentName + '//Mark Complete ✅',
    inputs,
    (result) => {
      modal.openConfirmationModal('Complete maintenance for: ' + maintenance.equipmentName, () => {
        // Update maintenance record
        maintenance.status = 'Completed';
        maintenance.actualCost = result.short[0].value || maintenance.estimatedCost;
        maintenance.technicianNotes = result.short[1].value || '';
        maintenance.completionNotes = result.large[0].value;
        maintenance.completionDate = result.date[0].value;
        
        // Update equipment
        const equipment = dataManager.getEquipmentData().find(eq => eq.id === maintenance.equipmentId);
        if (equipment) {
          dataManager.updateEquipment(maintenance.equipmentId, {
            status: 'Operational',
            lastMaintenance: result.date[0].value
          });
        }
        
        loadMaintenanceData();
        loadEquipmentData();
        updateSidebarStats();
        
        modal.toast('Maintenance completed successfully!', 'success');
        modal.closeConfirmationModal();
        modal.closeModal();
      });
    }
  );
}

function rescheduleMaintenance(maintenanceId) {
  const maintenance = dataManager.getMaintenanceData().find(mnt => mnt.id === maintenanceId);
  if (!maintenance) {
    modal.toast('Maintenance record not found!', 'error');
    return;
  }
  
  console.log('Rescheduling maintenance:', maintenance);
  
  const inputs = {
    short: [
      { placeholder: 'New Due Date', value: '', required: true },
      { placeholder: 'Reason for Reschedule', value: '', required: true }
    ],
    large: [
      { placeholder: 'Additional Notes', value: '', required: false }
    ]
  };
  
  modal.openModal(
    'orange//Reschedule Maintenance 📅//Reschedule maintenance for ' + maintenance.equipmentName + '//Reschedule 📅',
    inputs,
    (result) => {
      modal.openConfirmationModal('Reschedule maintenance for: ' + maintenance.equipmentName, () => {
        maintenance.dueDate = result.short[0].value;
        maintenance.rescheduleReason = result.short[1].value;
        maintenance.additionalNotes = result.long[0].value || '';
        maintenance.lastRescheduled = new Date().toISOString();
        
        loadMaintenanceData();
        
        modal.toast('Maintenance rescheduled successfully!', 'success');
        modal.closeConfirmationModal();
        modal.closeModal();
      });
    }
  );
}

function updateSidebarStats() {
  const currentEquipmentData = dataManager.getEquipmentData();
  const currentMaintenanceData = dataManager.getMaintenanceData();
  
  // Update stats in the sidebar
  const totalElement = document.querySelector('#equipment-section .section-stats-base:first-child .section-stats-c');
  const activeElement = document.querySelector('#equipment-section [data-type="active equipment"]').closest('.section-stats-base').querySelector('.section-stats-c');
  const maintenanceElement = document.querySelector('#equipment-section [data-type="maintenance due"]').closest('.section-stats-base').querySelector('.section-stats-c');
  const outOfServiceElement = document.querySelector('#equipment-section [data-type="out of service"]').closest('.section-stats-base').querySelector('.section-stats-c');
  
  if (totalElement) totalElement.textContent = currentEquipmentData.length;
  if (activeElement) activeElement.textContent = currentEquipmentData.filter(eq => eq.status === 'Operational').length;
  if (maintenanceElement) maintenanceElement.textContent = currentEquipmentData.filter(eq => eq.status === 'Maintenance Due').length;
  if (outOfServiceElement) outOfServiceElement.textContent = currentEquipmentData.filter(eq => eq.status === 'Out of Service').length;
  
  // Update maintenance summary in sidebar
  updateMaintenanceSummary(currentMaintenanceData);
  
  // Update equipment status in sidebar
  updateEquipmentStatusSidebar(currentEquipmentData);
  
  // Update sidebar notification dots
  updateSidebarNotifications();
}

function updateMaintenanceSummary(maintenanceData) {
  const thisWeekElement = document.querySelector('#equipment-section .space-y-2.text-sm .flex.justify-between:nth-child(1) .font-medium');
  const thisMonthElement = document.querySelector('#equipment-section .space-y-2.text-sm .flex.justify-between:nth-child(2) .font-medium');
  const overdueElement = document.querySelector('#equipment-section .space-y-2.text-sm .flex.justify-between:nth-child(3) .font-medium');
  
  if (thisWeekElement && thisMonthElement && overdueElement) {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const thisWeekTasks = maintenanceData.filter(mnt => {
      const dueDate = new Date(mnt.dueDate);
      return dueDate <= weekFromNow && dueDate >= now && mnt.status === 'Scheduled';
    }).length;
    
    const thisMonthTasks = maintenanceData.filter(mnt => {
      const dueDate = new Date(mnt.dueDate);
      return dueDate <= monthFromNow && dueDate >= now && mnt.status === 'Scheduled';
    }).length;
    
    const overdueTasks = maintenanceData.filter(mnt => {
      const dueDate = new Date(mnt.dueDate);
      return dueDate < now && mnt.status === 'Scheduled';
    }).length;
    
    thisWeekElement.textContent = `${thisWeekTasks} tasks`;
    thisMonthElement.textContent = `${thisMonthTasks} tasks`;
    overdueElement.textContent = `${overdueTasks} tasks`;
  }
}

function updateEquipmentStatusSidebar(equipmentData) {
  const operationalElement = document.querySelector('#equipment-section .space-y-2.text-sm .flex.items-center.justify-between:nth-child(1) .font-medium');
  const maintenanceDueElement = document.querySelector('#equipment-section .space-y-2.text-sm .flex.items-center.justify-between:nth-child(2) .font-medium');
  const outOfServiceElement = document.querySelector('#equipment-section .space-y-2.text-sm .flex.items-center.justify-between:nth-child(3) .font-medium');
  
  if (operationalElement && maintenanceDueElement && outOfServiceElement) {
    const operational = equipmentData.filter(eq => eq.status === 'Operational').length;
    const maintenanceDue = equipmentData.filter(eq => eq.status === 'Maintenance Due').length;
    const outOfService = equipmentData.filter(eq => eq.status === 'Out of Service').length;
    
    operationalElement.textContent = operational;
    maintenanceDueElement.textContent = maintenanceDue;
    outOfServiceElement.textContent = outOfService;
  }
}

function updateSidebarNotifications() {
  const equipmentButton = document.querySelector('[data-section="equipment"]');
  const notificationDot = equipmentButton?.querySelector('.absolute.right-2.top-2');
  
  if (notificationDot) {
    const currentEquipmentData = dataManager.getEquipmentData();
    const hasNotifications = currentEquipmentData.some(eq => eq.status === 'Maintenance Due' || eq.status === 'Out of Service');
    notificationDot.classList.toggle('hidden', !hasNotifications);
  }
}

// Quick add equipment functionality
function setupQuickAdd() {
  const quickAddBtn = document.getElementById('equipmentSection2MainBtn');
  const quickAddInput = document.getElementById('equipmentSection2Input');
  
  if (quickAddBtn && quickAddInput) {
    quickAddBtn.addEventListener('click', () => {
      const equipmentName = quickAddInput.value.trim();
      if (!equipmentName) {
        modal.toast('Please enter equipment name!', 'error');
        return;
      }
      
      const newEquipment = {
        name: equipmentName,
        type: 'General',
        serialNumber: `SN-${Date.now()}`,
        location: 'Main Floor',
        description: 'Added via quick add',
        status: 'Operational',
        purchaseDate: new Date().toISOString().split('T')[0],
        lastMaintenance: '',
        nextMaintenance: ''
      };
      
      dataManager.addEquipment(newEquipment);
      quickAddInput.value = '';
      
      loadEquipmentData();
      updateSidebarStats();
      
      modal.toast('Equipment added successfully!', 'success');
    });
  }
}

// Settings functionality
function setupSettings() {
  const settingsBtn = document.getElementById('equipment_section1_settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const inputs = {
        short: [
          { placeholder: 'Export Format', value: 'CSV', required: true },
          { placeholder: 'Include Maintenance History', value: 'Yes', required: true },
          { placeholder: 'Export Type (All/Maintenance Due/Out of Service)', value: 'All Equipment', required: true }
        ]
      };
      
      modal.openModal(
        'indigo//Equipment Settings ⚙️//Configure equipment management settings//Export Data 📊',
        inputs,
        (result) => {
          modal.openConfirmationModal('Export equipment data with selected options?', () => {
            // Simulate export functionality
            console.log('Exporting equipment data with options:', result);
            modal.toast('Equipment data exported successfully!', 'success');
            modal.closeConfirmationModal();
            modal.closeModal();
          });
        }
      );
    });
  }
}

// Export functions for global access
window.equipmentContent = {
  addEquipmentToList: (equipment) => {
    const inventoryContainer = document.getElementById('equipment_inventory');
    const emptyMessage = document.getElementById('equipmentInventoryEmpty');
    
    if (emptyMessage) {
      emptyMessage.classList.add('hidden');
    }
    
    const row = createEquipmentRow(equipment);
    inventoryContainer.appendChild(row);
  },
  
  removeEquipmentFromList: (equipmentId) => {
    const row = document.querySelector(`[data-equipment-id="${equipmentId}"]`);
    if (row) {
      row.remove();
    }
    
    // Check if we need to show empty message
    const inventoryContainer = document.getElementById('equipment_inventory');
    const emptyMessage = document.getElementById('equipmentInventoryEmpty');
    const remainingRows = inventoryContainer.querySelectorAll('[data-equipment-id]');
    
    if (remainingRows.length === 0 && emptyMessage) {
      emptyMessage.classList.remove('hidden');
    }
  },
  
  updateEquipmentInList: (equipmentId, updatedEquipment) => {
    const row = document.querySelector(`[data-equipment-id="${equipmentId}"]`);
    if (row) {
      const newRow = createEquipmentRow(updatedEquipment);
      row.replaceWith(newRow);
    }
  },
  
  // Add method to reload data
  reloadData: () => {
    loadEquipmentData();
    loadMaintenanceData();
    updateSidebarStats();
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  console.log('Initializing equipment management...');
  
  // Add sample data to in-memory storage
  if (equipmentData.length === 0) {
    sampleEquipment.forEach(equipment => {
      equipmentData.push(equipment);
    });
  }
  
  showTab(1);
  loadEquipmentData();
  loadMaintenanceData();
  setupQuickAdd();
  setupSettings();
  updateSidebarStats();
  
  console.log('Equipment management initialized');
});