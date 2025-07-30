import modal from '../admin_main.js';
import equipmentStats from './stats.js';

// Equipment header 
document.addEventListener('DOMContentLoaded', function () {
  const addEquipmentBtn = document.querySelector('[data-section="equipment"][data-title="Add Equipment 🔧"]');
  if (addEquipmentBtn) {
    addEquipmentBtn.addEventListener('click', function () {
      const inputs = {
        short: [
          { placeholder: 'Equipment Name', value: '', required: true },
          { placeholder: 'Equipment Type', value: '', required: true },
          { placeholder: 'Serial Number', value: '', required: false },
          { placeholder: 'Location', value: '', required: true },
          { placeholder: 'Status (Operational/Maintenance Due/Out of Service)', value: 'Operational', required: true }
        ],
        large: [
          { placeholder: 'Description', value: '', required: false }
        ],
        date: [
          { placeholder: 'Purchase Date', value: '', required: false },
          { placeholder: 'Last Maintenance Date', value: '', required: false },
          { placeholder: 'Next Maintenance Date', value: '', required: false }
        ]
      };
      
      modal.openModal(
        'indigo//Add Equipment 🔧//Equipment registration form//Add Equipment ➕',  
        inputs,
        (result) => {
          modal.openConfirmationModal('Add equipment: ' + result.short[0].value, () => {
            addEquipment(result);
            modal.closeConfirmationModal();
            modal.closeModal();
          });
        }
      );
    });
  }

  // Maintenance Log button
  const maintenanceLogBtn = document.querySelector('[data-section="equipment"]:not([data-title])');
  if (maintenanceLogBtn) {
    maintenanceLogBtn.addEventListener('click', function () {
      // Switch to maintenance tab
      showMaintenanceTab();
    });
  }

  // Stats cards click handlers
  const statsCards = document.querySelectorAll('[data-section="equipment"]');
  statsCards.forEach(card => {
    card.addEventListener('click', function () {
      const dataType = this.querySelector('[data-type]')?.getAttribute('data-type');
      if (dataType) {
        showStatsBreakdown(dataType);
      }
    });
  });
});

function addEquipment(equipmentData) {
  const newEquipment = {
    name: equipmentData.short[0].value,
    type: equipmentData.short[1].value,
    serialNumber: equipmentData.short[2].value || 'N/A',
    location: equipmentData.short[3].value,
    status: equipmentData.short[4].value,
    description: equipmentData.large[0]?.value || '',
    purchaseDate: equipmentData.date[0]?.value || '',
    lastMaintenance: equipmentData.date[1]?.value || '',
    nextMaintenance: equipmentData.date[2]?.value || '',
    addedDate: new Date().toISOString()
  };
  
  // Add to stats module if available
  if (typeof equipmentStats !== 'undefined' && equipmentStats.addEquipment) {
    equipmentStats.addEquipment(newEquipment);
  }
  
  // Trigger content update
  if (window.equipmentContent) {
    window.equipmentContent.addEquipmentToList(newEquipment);
    window.equipmentContent.reloadData();
  }
  
  modal.toast('Equipment added successfully!', 'success');
}

function showMaintenanceTab() {
  // Switch to maintenance tab
  const maintenanceTab = document.getElementById('equipment_tab2');
  if (maintenanceTab) {
    maintenanceTab.click();
  }
}

function showStatsBreakdown(dataType) {
  let currentEquipmentData = [];
  
  // Get data from stats module if available
  if (typeof equipmentStats !== 'undefined' && equipmentStats.getEquipmentData) {
    currentEquipmentData = equipmentStats.getEquipmentData();
  }
  
  let filteredData = [];
  let title = '';
  
  switch (dataType) {
    case 'active equipment':
      filteredData = currentEquipmentData.filter(eq => eq.status === 'Operational');
      title = 'Active Equipment';
      break;
    case 'maintenance due':
      filteredData = currentEquipmentData.filter(eq => eq.status === 'Maintenance Due');
      title = 'Equipment Due for Maintenance';
      break;
    case 'out of service':
      filteredData = currentEquipmentData.filter(eq => eq.status === 'Out of Service');
      title = 'Out of Service Equipment';
      break;
    default:
      filteredData = currentEquipmentData;
      title = 'All Equipment';
  }
  
  // Create breakdown modal content
  const breakdownContent = filteredData.map(eq => `
    <div class="flex justify-between items-center p-3 border-b border-gray-200">
      <div>
        <p class="font-medium">${eq.name}</p>
        <p class="text-sm text-gray-500">${eq.type} - ${eq.location}</p>
      </div>
      <span class="px-2 py-1 text-xs rounded-full ${
        eq.status === 'Operational' ? 'bg-green-100 text-green-800' :
        eq.status === 'Maintenance Due' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }">${eq.status}</span>
    </div>
  `).join('');
  
     // Show breakdown in a modal
   const inputs = {
     large: [
       { 
         placeholder: 'Equipment Breakdown', 
         value: breakdownContent || 'No equipment found in this category.',
         required: false 
       }
     ]
   };
  
  modal.openModal(
    `indigo//${title}//Equipment breakdown for ${dataType}//Close`,
    inputs,
    () => {
      modal.closeModal();
    }
  );
}

export default { addEquipment, showMaintenanceTab, showStatsBreakdown };
