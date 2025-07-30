// Equipment statistics functionality
let equipmentStats = {
  total: 0,
  active: 0,
  maintenanceDue: 0,
  outOfService: 0
};

let equipmentData = [];
let maintenanceData = [];

document.addEventListener('DOMContentLoaded', function () {
  // Initialize equipment stats
  updateEquipmentStats();
  
  // Add click handlers for stats cards
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

function updateEquipmentStats() {
  // Update stats display
  const totalElement = document.querySelector('#equipment-section .section-stats-base:first-child .section-stats-c');
  const activeElement = document.querySelector('#equipment-section [data-type="active equipment"]').closest('.section-stats-base').querySelector('.section-stats-c');
  const maintenanceElement = document.querySelector('#equipment-section [data-type="maintenance due"]').closest('.section-stats-base').querySelector('.section-stats-c');
  const outOfServiceElement = document.querySelector('#equipment-section [data-type="out of service"]').closest('.section-stats-base').querySelector('.section-stats-c');
  
  if (totalElement) totalElement.textContent = equipmentStats.total;
  if (activeElement) activeElement.textContent = equipmentStats.active;
  if (maintenanceElement) maintenanceElement.textContent = equipmentStats.maintenanceDue;
  if (outOfServiceElement) outOfServiceElement.textContent = equipmentStats.outOfService;
  
  // Update sidebar notification dots
  updateSidebarNotifications();
}

function calculateStats() {
  equipmentStats.total = equipmentData.length;
  equipmentStats.active = equipmentData.filter(eq => eq.status === 'Operational').length;
  equipmentStats.maintenanceDue = equipmentData.filter(eq => eq.status === 'Maintenance Due').length;
  equipmentStats.outOfService = equipmentData.filter(eq => eq.status === 'Out of Service').length;
  
  updateEquipmentStats();
}

function addEquipment(equipment) {
  // Generate ID if not provided
  if (!equipment.id) {
    const equipmentId = 'EQ' + Date.now() + Math.floor(Math.random() * 1000);
    equipment.id = equipmentId;
  }
  
  equipmentData.push(equipment);
  calculateStats();
  
  // Trigger content update
  if (window.equipmentContent) {
    window.equipmentContent.addEquipmentToList(equipment);
  }
  
  return equipment;
}

function removeEquipment(equipmentId) {
  equipmentData = equipmentData.filter(eq => eq.id !== equipmentId);
  calculateStats();
  
  // Trigger content update
  if (window.equipmentContent) {
    window.equipmentContent.removeEquipmentFromList(equipmentId);
  }
  
  return equipmentId;
}

function updateEquipment(equipmentId, updatedData) {
  const index = equipmentData.findIndex(eq => eq.id === equipmentId);
  if (index !== -1) {
    equipmentData[index] = { ...equipmentData[index], ...updatedData };
    calculateStats();
    
    // Trigger content update
    if (window.equipmentContent) {
      window.equipmentContent.updateEquipmentInList(equipmentId, equipmentData[index]);
    }
    
    return equipmentData[index];
  }
  return null;
}

function addMaintenanceRecord(equipmentId, maintenanceData) {
  const maintenanceRecord = {
    id: 'M' + Date.now() + Math.floor(Math.random() * 1000),
    equipmentId: equipmentId,
    date: new Date().toISOString(),
    type: maintenanceData.type,
    description: maintenanceData.description,
    technician: maintenanceData.technician,
    cost: maintenanceData.cost || 0,
    nextMaintenance: maintenanceData.nextMaintenance || ''
  };
  
  maintenanceData.push(maintenanceRecord);
  
  // Update equipment's last maintenance date
  updateEquipment(equipmentId, {
    lastMaintenance: maintenanceRecord.date,
    nextMaintenance: maintenanceRecord.nextMaintenance,
    status: 'Operational'
  });
  
  return maintenanceRecord;
}

function showStatsBreakdown(dataType) {
  let filteredData = [];
  let title = '';
  
  switch (dataType) {
    case 'active equipment':
      filteredData = equipmentData.filter(eq => eq.status === 'Operational');
      title = 'Active Equipment';
      break;
    case 'maintenance due':
      filteredData = equipmentData.filter(eq => eq.status === 'Maintenance Due');
      title = 'Equipment Due for Maintenance';
      break;
    case 'out of service':
      filteredData = equipmentData.filter(eq => eq.status === 'Out of Service');
      title = 'Out of Service Equipment';
      break;
    default:
      filteredData = equipmentData;
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
  
  // Show breakdown in a modal or update content area
  console.log(`${title}:`, filteredData);
  
  // If modal system is available, show breakdown modal
  if (typeof window.modal !== 'undefined') {
    const inputs = {
      long: [
        { 
          placeholder: 'Equipment Breakdown', 
          value: breakdownContent || 'No equipment found in this category.',
          required: false 
        }
      ]
    };
    
    window.modal.openModal(
      `indigo//${title}//Equipment breakdown for ${dataType}//Close`,
      inputs,
      () => {
        window.modal.closeModal();
      }
    );
  }
}

function updateSidebarNotifications() {
  const equipmentButton = document.querySelector('[data-section="equipment"]');
  const notificationDot = equipmentButton?.querySelector('.absolute.right-2.top-2');
  
  if (notificationDot) {
    const hasNotifications = equipmentStats.maintenanceDue > 0 || equipmentStats.outOfService > 0;
    notificationDot.classList.toggle('hidden', !hasNotifications);
  }
}

// Initialize with sample data if empty
function initializeSampleData() {
  if (equipmentData.length === 0) {
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
    
    sampleEquipment.forEach(equipment => {
      addEquipment(equipment);
    });
  }
}

// Initialize sample data when module loads
initializeSampleData();

// Export functions for use in other modules
export default {
  addEquipment,
  removeEquipment,
  updateEquipment,
  addMaintenanceRecord,
  calculateStats,
  getEquipmentData: () => equipmentData,
  getMaintenanceData: () => maintenanceData,
  getStats: () => equipmentStats,
  showStatsBreakdown,
  updateEquipmentStats,
  initializeSampleData
};
