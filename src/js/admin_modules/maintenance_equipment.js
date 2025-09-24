import main from '../admin_main.js';
import accesscontrol from './maintenance_accesscontrol.js';
import { API_BASE_URL } from '../_global.js';

let mainBtn, subBtn, sectionTwoMainBtn;
function getEmoji(emoji, size = 16) {
  return `<img src="/src/images/${emoji}.png" class="inline size-[${size}px] 2xl:size-[${size + 4}px]">`;
}

function getGeneralStatusDisplay(generalStatus, unavailableCount = 0) {
  if (generalStatus === 'All Available') {
    return `<p class="text-green-600 font-bold emoji">All Available ${getEmoji('✅')}</p>`;
  } else if (generalStatus.startsWith('Warning')) {
    const count = (generalStatus.match(/\((\d+)\)/) || [])[1] || unavailableCount || 0;
    const countText = count > 0 ? ` - ${count} ` : ' ';
    return `<p class="text-yellow-600 font-bold emoji">Warning${countText}Need Repair ${getEmoji('⚠️')}</p>`;
  } else if (generalStatus.startsWith('Pending Disposal')) {
    // amber style
    const count = (generalStatus.match(/\((\d+)\)/) || [])[1] || 0;
    const countText = count > 0 ? ` - ${count}` : '';
    return `<p class="text-orange-600 font-bold emoji">Pending Disposal${countText} ${getEmoji('🗑️')}</p>`;
  } else if (generalStatus.startsWith('Partially Available')) {
    return `<p class="text-blue-600 font-bold emoji">${generalStatus} ${getEmoji('📌')}</p>`;
  } else if (generalStatus.startsWith('Disposed Items')) {
    return `<p class="text-gray-600 font-bold emoji">${generalStatus} ${getEmoji('🔏')}</p>`;
  } else {
    return `<p class="text-gray-600 font-bold emoji">${generalStatus} ${getEmoji('❓')}</p>`;
  }
}

window.saveEquipmentDetails = async () => {
  try {
    const equipmentName = document.getElementById('equipmentNameInput').value.trim();
    const equipmentNotes = document.getElementById('equipmentNotesInput').value.trim();

    if (!equipmentName) {
      main.toast('Equipment name is required', 'error');
      return;
    }

    const modal = document.getElementById('individualItemsModal');
    const equipmentId = modal.dataset.equipmentId;
    const imageUrl = modal.dataset.newImageUrl || modal.dataset.currentImageUrl;
    const originalName = modal.dataset.originalName || '';
    const originalNotes = modal.dataset.originalNotes || '';
    const originalImageUrl = modal.dataset.currentImageUrl || '';

    const hasNameChange = equipmentName !== originalName;
    const hasNotesChange = equipmentNotes !== originalNotes;
    const hasImageChange = imageUrl !== originalImageUrl;

    if (!hasNameChange && !hasNotesChange && !hasImageChange) {
      main.toast('No changes detected. Please make changes before saving.', 'warning');
      return;
    }

    const updateData = {
      equipment_name: equipmentName,
      image_url: imageUrl,
      notes: equipmentNotes,
      equipment_type: modal.dataset.equipmentType || 'machine',
      total_quantity: parseInt(modal.dataset.totalQuantity) || 1,
      general_status: modal.dataset.generalStatus || 'All Available',
    };

    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    let result;
    try {
      result = await response.json();
    } catch (error) {
      console.error('Failed to parse response as JSON:', error);
      const textResponse = await response.text();
      console.error('Raw response:', textResponse);
      main.toast('Server error: Invalid response format', 'error');
      return;
    }

    if (response.ok) {
      main.toast('Equipment details updated successfully!', 'success');

      const row = document.querySelector(`tr[data-equipment-id="${equipmentId}"]`);
      if (row) {
        const statusElement = row.querySelector('td:nth-child(2)');
        if (statusElement) {
          statusElement.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><img src="${imageUrl || '/src/images/client_logo.jpg'}" alt="${equipmentName}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="showImageModal(this.src, '${equipmentName}')"><span>${equipmentName}</span></div>`;
        }
      }
      refreshIndividualItemsSection(equipmentId, equipmentName);

      setTimeout(() => {
        window.closeIndividualItemsModal();
      }, 500);
    } else {
      console.error('Update failed:', result);
      main.toast(`Error: ${result.error || 'Unknown server error'}`, 'error');
    }
  } catch (error) {
    console.error('Error updating equipment details:', error);
    main.toast('Network error: Failed to update equipment details', 'error');
  }
};

async function refreshIndividualItemsSection(equipmentId, equipmentName) {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}/items`);
    const result = await response.json();

    if (response.ok && result.result) {
      const individualItems = result.result;
      let availableCount = 0;
      let unavailableCount = 0;
      let forDisposalCount = 0;
      let disposedCount = 0;
      individualItems.forEach((i) => {
        if (i.individual_status === 'Available') availableCount++;
        else if (i.individual_status === 'Unavailable') unavailableCount++;
        else if (i.individual_status === 'For Disposal') forDisposalCount++;
        else if (i.individual_status === 'Disposed') disposedCount++;
      });
      let generalStatus = 'All Available';
      if (unavailableCount > 0) {
        generalStatus = `Warning - (${unavailableCount}) Need Repair`;
      } else if (forDisposalCount > 0) {
        generalStatus = `Pending Disposal - (${forDisposalCount})`;
      } else if (disposedCount > 0) {
        if (availableCount > 0) {
          generalStatus = `Partially Available - ${availableCount} avail, ${disposedCount} disposed`;
        } else {
          generalStatus = `Disposed Items - (${disposedCount})`;
        }
      } else {
        generalStatus = 'All Available';
      }
      const columnsContainer = document.getElementById('individualItemsColumns');
      if (columnsContainer) {
        const availableCol = columnsContainer.querySelector('#itemsAvailableCol');
        const unavailableCol = columnsContainer.querySelector('#itemsUnavailableCol');
        const forDisposalCol = columnsContainer.querySelector('#itemsForDisposalCol');
        const disposedCol = columnsContainer.querySelector('#itemsDisposedCol');

        const renderCard = (item) => {
          const status = item.individual_status;
          if (status === 'Disposed') {
            return `
              <div class="border rounded-lg p-3 transition-all duration-200 hover:scale-102 hover:shadow-md border-gray-300 bg-gray-50">
                <div class="flex justify-between items-center mb-2">
                  <span class="font-medium">${item.item_code}</span>
                  <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-800">🗑️ <span>Disposed</span></span>
                </div>
                <select class="w-full text-sm border rounded px-2 py-1 mt-2 opacity-60 cursor-not-allowed" data-item-id="${item.item_id}" disabled>
                  <option value="Disposed" selected>Disposed</option>
                </select>
              </div>
            `;
          }
          if (status === 'Available') {
            return `
              <div class="border rounded-lg p-3 transition-all duration-200 hover:scale-102 hover:shadow-md border-green-300 bg-green-50 hover:border-green-400">
                <div class="flex justify-between items-center mb-2">
                  <span class="font-medium">${item.item_code}</span>
                  <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-green-200 text-green-800">✅ <span>Available</span></span>
                </div>
                <select class="w-full text-sm border rounded px-2 py-1 mt-2 transition-all duration-200 hover:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500" data-item-id="${item.item_id}" onchange="updateIndividualStatus('${item.item_id}', this.value)">
                  <option value="Available" selected>✅ Available</option>
                  <option value="Unavailable">❌ Unavailable</option>
                  <option value="For Disposal">⚠️ For Disposal</option>
                </select>
              </div>
            `;
          }
          // Unavailable card
          return `
            <div class="border rounded-lg p-3 transition-all duration-200 hover:scale-102 hover:shadow-md border-red-300 bg-red-50 hover:border-red-400">
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium">${item.item_code}</span>
                <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-red-200 text-red-800">❌ <span>Unavailable</span></span>
              </div>
              <select class="w-full text-sm border rounded px-2 py-1 mt-2 transition-all duration-200 hover:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500" data-item-id="${item.item_id}" onchange="updateIndividualStatus('${item.item_id}', this.value)">
                <option value="Available">✅ Available</option>
                <option value="Unavailable" selected>❌ Unavailable</option>
                <option value="For Disposal">⚠️ For Disposal</option>
              </select>
            </div>
          `;
        };

        if (availableCol) {
          const header = availableCol.querySelector(':scope > .sticky');
          availableCol.innerHTML = header ? header.outerHTML : '';
          availableCol.insertAdjacentHTML(
            'beforeend',
            individualItems
              .filter((i) => i.individual_status === 'Available')
              .map(renderCard)
              .join('')
          );
        }
        if (unavailableCol) {
          const header = unavailableCol.querySelector(':scope > .sticky');
          unavailableCol.innerHTML = header ? header.outerHTML : '';
          unavailableCol.insertAdjacentHTML(
            'beforeend',
            individualItems
              .filter((i) => i.individual_status === 'Unavailable')
              .map(renderCard)
              .join('')
          );
        }
        if (forDisposalCol) {
          const header = forDisposalCol.querySelector(':scope > .sticky');
          forDisposalCol.innerHTML = header ? header.outerHTML : '';
          forDisposalCol.insertAdjacentHTML(
            'beforeend',
            individualItems
              .filter((i) => i.individual_status === 'For Disposal')
              .map(
                (item) => `
            <div class="border rounded-lg p-3 transition-all duration-200 hover:scale-102 hover:shadow-md border-yellow-300 bg-yellow-50 hover:border-yellow-400">
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium">${item.item_code}</span>
                <span class="text-xs px-2 py-1 rounded font-medium bg-yellow-200 text-yellow-800">⚠️ For Disposal</span>
              </div>
              <select class="w-full text-sm border rounded px-2 py-1 transition-all duration-200 hover:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500" data-item-id="${item.item_id}" onchange="updateIndividualStatus('${item.item_id}', this.value)">
                <option value="Available">✅ Available</option>
                <option value="Unavailable">❌ Unavailable</option>
                <option value="For Disposal" selected>⚠️ For Disposal</option>
              </select>
            </div>
          `
              )
              .join('')
          );
        }
        if (disposedCol) {
          const header = disposedCol.querySelector(':scope > .sticky');
          disposedCol.innerHTML = header ? header.outerHTML : '';
          disposedCol.insertAdjacentHTML(
            'beforeend',
            individualItems
              .filter((i) => i.individual_status === 'Disposed')
              .map(renderCard)
              .join('')
          );
        }
      }

      const individualItemsCount = document.querySelector('#individualItemsHeader');
      if (individualItemsCount) {
        individualItemsCount.textContent = `Individual Items (${individualItems.length})`;
      }

      const modal = document.getElementById('individualItemsModal');
      if (modal) modal.dataset.generalStatus = generalStatus;

      const row = document.querySelector(`tr[data-equipment-id="${equipmentId}"]`);
      if (row) {
        const statusElement = row.querySelector('td:nth-child(5)');
        if (statusElement) {
          statusElement.innerHTML = getGeneralStatusDisplay(generalStatus, unavailableCount);
        }
      }
    }
  } catch (error) {
    console.error('Error refreshing individual items:', error);
  }
}

window.addEquipmentQuantity = async function () {
  try {
    const addQuantity = parseInt(document.getElementById('addQuantityInput').value);

    if (!addQuantity || addQuantity < 1) {
      main.toast('Please enter a valid quantity (minimum 1)', 'error');
      return;
    }

    if (addQuantity > 100) {
      main.toast('Maximum quantity to add is 100', 'error');
      return;
    }

    const modal = document.getElementById('individualItemsModal');
    const equipmentId = modal.dataset.equipmentId;
    const equipmentName = document.getElementById('equipmentNameInput').value.trim();

    if (!equipmentName) {
      main.toast('Equipment name is required', 'error');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}/items`);
    const result = await response.json();

    if (!response.ok) {
      main.toast('Failed to load current items', 'error');
      return;
    }

    const currentItems = result.result || [];
    const lastItemNumber = currentItems.length;
    const addResponse = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}/add-quantity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        add_quantity: addQuantity,
        equipment_name: equipmentName,
        start_index: lastItemNumber + 1,
      }),
    });

    const addResult = await addResponse.json();

    if (addResponse.ok) {
      main.toast(`Successfully added ${addQuantity} new items!`, 'success');

      const currentQuantityDisplay = document.getElementById('currentQuantityDisplay');
      if (currentQuantityDisplay) {
        const newQuantity = parseInt(currentQuantityDisplay.value) + addQuantity;
        currentQuantityDisplay.value = newQuantity;
      }

      const row = document.querySelector(`tr[data-equipment-id="${equipmentId}"]`);
      if (row) {
        const quantityElement = row.querySelector('td:nth-child(3)');
        if (quantityElement) {
          const currentQuantity = parseInt(quantityElement.textContent);
          const newQuantity = currentQuantity + addQuantity;
          quantityElement.textContent = newQuantity.toString();
        }
        // Update general status from server recompute if available
        if (addResult && addResult.general_status) {
          const statusElement = row.querySelector('td:nth-child(5)');
          if (statusElement) {
            statusElement.innerHTML = getGeneralStatusDisplay(addResult.general_status);
          }
        }
      }
      await refreshIndividualItemsSection(equipmentId, equipmentName);

      modal.dataset.totalQuantity = (parseInt(modal.dataset.totalQuantity) + addQuantity).toString();

      setTimeout(() => {
        window.closeIndividualItemsModal();
      }, 500);
    } else {
      main.toast(`Error: ${addResult.error || 'Failed to add items'}`, 'error');
    }
  } catch (error) {
    console.error('Error adding equipment quantity:', error);
    main.toast('Network error: Failed to add equipment quantity', 'error');
  }
};

window.showDeleteEquipmentConfirmation = function () {
  const modal = document.getElementById('individualItemsModal');
  const equipmentId = modal.dataset.equipmentId;
  const equipmentName = document.getElementById('equipmentNameInput').value.trim();

  const deleteModalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-30 hidden" id="deleteEquipmentModal">
      <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-red-500 to-red-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Delete Equipment ${getEmoji('🗑️', 26)}</p>
          <p class="text-xs">This action cannot be undone</p>
        </div>
        <div class="p-6">
          <div class="mb-4">
            <p class="text-gray-700 mb-2">Are you sure you want to delete this equipment?</p>
            <div class="bg-gray-100 p-3 rounded-md">
              <p class="font-semibold text-gray-900">${equipmentName}</p>
              <p class="text-sm text-gray-600">Equipment ID: ${equipmentId.split('_').slice(0, 2).join('_')}</p>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Type <span class="font-bold text-red-600">"delete"</span> to confirm:
            </label>
            <input type="text" id="deleteConfirmationInput" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                   placeholder="Type 'delete' here">
          </div>
          
          <div class="flex gap-3">
            <button type="button" onclick="closeDeleteEquipmentModal()" 
                    class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Cancel
            </button>
            <button type="button" onclick="confirmDeleteEquipment()" 
                    class="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    id="confirmDeleteBtn" disabled>
              Delete Equipment
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', deleteModalHTML);
  const deleteModal = document.getElementById('deleteEquipmentModal');
  deleteModal.classList.remove('hidden');
  deleteModal.classList.add('flex');
  setTimeout(() => {
    deleteModal.classList.add('opacity-100');
    deleteModal.children[0].classList.remove('-translate-y-6');
    deleteModal.children[0].classList.add('scale-100');
  }, 10);

  const deleteInput = document.getElementById('deleteConfirmationInput');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  deleteInput.addEventListener('input', (e) => {
    if (e.target.value.toLowerCase() === 'delete') {
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      confirmBtn.disabled = true;
      confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  });

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeDeleteEquipmentModal();
    }
  };
  document.addEventListener('keydown', handleEscape);
  deleteModal.dataset.escapeHandler = 'true';
};

window.closeDeleteEquipmentModal = function () {
  const deleteModal = document.getElementById('deleteEquipmentModal');
  if (deleteModal) {
    deleteModal.classList.remove('opacity-100');
    deleteModal.children[0].classList.add('-translate-y-6');
    deleteModal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      deleteModal.classList.add('hidden');
      deleteModal.classList.remove('flex');
      deleteModal.remove();
    }, 300);
  }
};

window.confirmDeleteEquipment = async function () {
  try {
    const modal = document.getElementById('individualItemsModal');
    const equipmentId = modal.dataset.equipmentId;

    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      main.toast('Equipment deleted successfully!', 'success');

      closeDeleteEquipmentModal();
      window.closeIndividualItemsModal();

      const row = document.querySelector(`tr[data-equipment-id="${equipmentId}"]`);
      if (row) {
        row.remove();
      }
      refreshAllTabs();
    } else {
      main.toast(`Error: ${result.error || 'Failed to delete equipment'}`, 'error');
    }
  } catch (error) {
    console.error('Error deleting equipment:', error);
    main.toast('Network error: Failed to delete equipment', 'error');
  }
};

document.addEventListener('ogfmsiAdminMainLoaded', function () {
  if (main.sharedState.sectionName !== 'maintenance-equipment') return;

  mainBtn = document.querySelector(`.section-main-btn[data-section="${main.sharedState.sectionName}"]`);
  mainBtn.addEventListener('click', mainBtnFunction);

  refreshAllTabs();
});
async function loadExistingEquipment() {
  try {
    const tableBody = document.querySelector('#maintenanceSectionOneList');
    if (tableBody) tableBody.innerHTML = '';

    const response = await fetch(`${API_BASE_URL}/maintenance/equipment`);
    const result = await response.json();

    if (response.ok && result.result) {
      result.result.forEach((equipment) => {
        const columnsData = [
          equipment.equipment_id.split('_').slice(0, 2).join('_'),
          `<div style="display:flex;align-items:center;gap:8px;"><img src="${equipment.image_url || '/src/images/client_logo.jpg'}" alt="${equipment.equipment_name}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="showImageModal(this.src, '${equipment.equipment_name}')"><span>${equipment.equipment_name}</span></div>`,
          equipment.total_quantity + '',
          equipment.equipment_type,
          getGeneralStatusDisplay(equipment.general_status, equipment.unavailable_count || 0),
          'custom_date_today',
        ];

        main.createAtSectionOne('maintenance-equipment', columnsData, 1, (frontendResult) => {
          if (equipment.created_at) {
            const date = new Date(equipment.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            frontendResult.dataset.date = date;
            frontendResult.children[5].innerHTML = date;
          }

          frontendResult.dataset.equipmentId = equipment.equipment_id;
          setupEquipmentButtons(frontendResult, equipment);
        });
      });
    }
  } catch (error) {
    console.error('Error loading equipment:', error);
    main.toast('Failed to load existing equipment', 'error');
  }
}

function setupEquipmentButtons(frontendResult, equipment) {
  const detailsBtn = frontendResult.querySelector('#maintenanceDetailsBtn');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => showEquipmentDetails(frontendResult, equipment));
  }
}

async function showEquipmentDetails(frontendResult, equipment) {
  try {
    const equipmentResponse = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipment.equipment_id}`);
    const equipmentResult = await equipmentResponse.json();

    if (!equipmentResponse.ok) {
      console.error('Error fetching equipment details:', equipmentResult.error);
      main.toast('Failed to load equipment details', 'error');
      return;
    }

    const freshEquipment = equipmentResult.result || equipment;
    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipment.equipment_id}/items`);
    const result = await response.json();

    if (!response.ok) {
      console.error('Error fetching equipment items:', result.error);
      main.toast('Failed to load equipment items', 'error');
      return;
    }

    const individualItems = result.result || [];

    showIndividualItemsModal(freshEquipment, individualItems, frontendResult);
  } catch (error) {
    console.error('Error loading equipment items:', error);
    main.toast('Network error: Failed to load equipment items', 'error');
  }
}

function showIndividualItemsModal(equipment, individualItems, frontendResult) {
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/30 opacity-0 duration-300 z-20 hidden" id="individualItemsModal" 
         data-equipment-id="${equipment.equipment_id}" 
         data-current-image-url="${equipment.image_url || '/src/images/client_logo.jpg'}"
         data-equipment-type="${equipment.equipment_type || 'machine'}"
         data-total-quantity="${equipment.total_quantity || 1}"
         data-general-status="${equipment.general_status || 'All Available'}"
         data-original-name="${equipment.equipment_name || ''}"
         data-original-notes="${equipment.notes || ''}">
      <div class="m-auto w-full max-w-4xl -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Equipment Details ${getEmoji('🛠️', 26)}</p>
          <p class="text-xs">${equipment.equipment_name} - ${equipment.equipment_id.split('_').slice(0, 2).join('_')}</p>
        </div>
        <div class="flex flex-col p-4">
          <div class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
                <input type="text" id="equipmentNameInput" value="${equipment.equipment_name}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Equipment Image</label>
                <div class="flex items-center gap-2">
                  <img id="equipmentImagePreview" src="${equipment.image_url || '/src/images/client_logo.jpg'}" 
                       alt="Equipment" class="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                       onclick="document.getElementById('equipmentImageInput').click()">
                  <input type="file" id="equipmentImageInput" accept="image/*" class="hidden">
                  <span class="text-sm text-gray-500">Click image to change</span>
                </div>
              </div>
            </div>
            
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea id="equipmentNotesInput" rows="3" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Add notes about this equipment...">${equipment.notes || ''}</textarea>
            </div>
            
            <div class="mt-4 flex gap-3">
              <button type="button" onclick="saveEquipmentDetails()" 
                      class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500">
                💾 Save Changes
              </button>
            </div>
          </div>
          
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3">Quantity Management</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Number of Items</label>
                    <div class="flex items-center gap-2">
                      <input type="text" id="currentQuantityDisplay" value="${equipment.total_quantity}" 
                             readonly class="w-16 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-center font-semibold text-gray-900">
                      <span class="text-sm text-gray-500">(Current)</span>
                    </div>
                  </div>
                  <div class="text-2xl text-gray-400">+</div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Add Quantity</label>
                    <div class="flex items-center gap-2">
                      <input type="number" id="addQuantityInput" min="1" max="100" value="1" 
                             class="w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-center">
                      <button type="button" onclick="addEquipmentQuantity()" 
                              class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500">
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p class="text-sm text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                New individual items will be created with sequential codes starting from the last existing item.
              </p>
            </div>
          </div>
          
          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2 flex items-center gap-2" id="individualItemsHeader">
              Individual Items (${individualItems.length})
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto" id="individualItemsColumns">
              <div class="flex flex-col gap-3" id="itemsAvailableCol">
                <div class="sticky top-0 z-10 bg-white/80 backdrop-blur px-1 py-1">
                  <p class="text-sm font-semibold text-green-700">Available</p>
                </div>
                ${individualItems
                  .filter((i) => i.individual_status === 'Available')
                  .map(
                    (item) => `
                  <div class="border rounded-lg p-3 transition-all duration-200 hover:scale-102 hover:shadow-md border-green-300 bg-green-50 hover:border-green-400">
                    <div class="flex justify-between items-center mb-2">
                      <span class="font-medium">${item.item_code}</span>
                      <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-green-200 text-green-800">✅ <span>Available</span></span>
                    </div>
                    <select class="w-full text-sm border rounded px-2 py-1 mt-2 transition-all duration-200 hover:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500" data-item-id="${item.item_id}" onchange="updateIndividualStatus('${item.item_id}', this.value)">
                      <option value="Available" selected>✅ Available</option>
                      <option value="Unavailable">❌ Unavailable</option>
                      <option value="For Disposal">⚠️ For Disposal</option>
                    </select>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div class="flex flex-col gap-3" id="itemsUnavailableCol">
                <div class="sticky top-0 z-10 bg-white/80 backdrop-blur px-1 py-1">
                  <p class="text-sm font-semibold text-red-700">Unavailable</p>
                </div>
                ${individualItems
                  .filter((i) => i.individual_status === 'Unavailable')
                  .map(
                    (item) => `
                  <div class="border rounded-lg p-3 transition-all duration-200 hover:scale-102 hover:shadow-md border-red-300 bg-red-50 hover:border-red-400">
                    <div class="flex justify-between items-center mb-2">
                      <span class="font-medium">${item.item_code}</span>
                      <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-red-200 text-red-800">❌ <span>Unavailable</span></span>
                    </div>
                    <select class="w-full text-sm border rounded px-2 py-1 mt-2 transition-all duration-200 hover:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500" data-item-id="${item.item_id}" onchange="updateIndividualStatus('${item.item_id}', this.value)">
                      <option value="Available">✅ Available</option>
                      <option value="Unavailable" selected>❌ Unavailable</option>
                      <option value="For Disposal">⚠️ For Disposal</option>
                    </select>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div class="flex flex-col gap-3" id="itemsForDisposalCol">
                <div class="sticky top-0 z-10 bg-white/80 backdrop-blur px-1 py-1">
                  <p class="text-sm font-semibold text-yellow-700">For Disposal</p>
                </div>
                ${individualItems
                  .filter((i) => i.individual_status === 'For Disposal')
                  .map(
                    (item) => `
                  <div class="border rounded-lg p-3 transition-all duration-200 hover:scale-102 hover:shadow-md border-yellow-300 bg-yellow-50 hover:border-yellow-400">
                    <div class="flex justify-between items-center mb-2">
                      <span class="font-medium">${item.item_code}</span>
                      <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-yellow-200 text-yellow-800">⚠️ <span>For Disposal</span></span>
                    </div>
                    <select class="w-full text-sm border rounded px-2 py-1 mt-2 transition-all duration-200 hover:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500" data-item-id="${item.item_id}" onchange="updateIndividualStatus('${item.item_id}', this.value)">
                      <option value="Available">✅ Available</option>
                      <option value="Unavailable">❌ Unavailable</option>
                      <option value="For Disposal" selected>⚠️ For Disposal</option>
                    </select>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div class="flex flex-col gap-3" id="itemsDisposedCol">
                <div class="sticky top-0 z-10 bg-white/80 backdrop-blur px-1 py-1">
                  <p class="text-sm font-semibold text-gray-700">Disposed</p>
                </div>
                ${individualItems
                  .filter((i) => i.individual_status === 'Disposed')
                  .map(
                    (item) => `
                  <div class="border rounded-lg p-3 transition-all duration-200 hover:scale-102 hover:shadow-md border-gray-300 bg-gray-50">
                    <div class="flex justify-between items-center mb-2">
                      <span class="font-medium">${item.item_code}</span>
                      <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-800">🗑️ <span>Disposed</span></span>
                    </div>
                    <select class="w-full text-sm border rounded px-2 py-1 mt-2 opacity-60 cursor-not-allowed" data-item-id="${item.item_id}" disabled>
                      <option value="Disposed" selected>Disposed</option>
                    </select>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const imageInput = document.getElementById('equipmentImageInput');
  const imagePreview = document.getElementById('equipmentImagePreview');

  if (imageInput && imagePreview) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          imagePreview.src = event.target.result;
          const modal = document.getElementById('individualItemsModal');
          modal.dataset.newImageUrl = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const modal = document.getElementById('individualItemsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 0);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeIndividualItemsModal();
    }
  });

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
        const selectElement = document.querySelector(`select[data-item-id="${itemId}"]`);
        if (selectElement) {
          const itemContainer = selectElement.closest('div.border');
          if (itemContainer) {
            itemContainer.className = `border rounded-lg p-3 ${newStatus === 'Available' ? 'border-green-300 bg-green-50' : newStatus === 'For Disposal' ? 'border-yellow-300 bg-yellow-50' : 'border-red-300 bg-red-50'}`;
            const statusBadge = itemContainer.querySelector('span.text-xs');
            if (statusBadge) {
              statusBadge.className = `text-xs px-2 py-1 rounded ${newStatus === 'Available' ? 'bg-green-200 text-green-800' : newStatus === 'For Disposal' ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`;
              statusBadge.textContent = newStatus;
            }
          }
        }

        main.toast(`Item status updated to ${newStatus}`, 'success');
        if (result.general_status) {
          const modal = document.getElementById('individualItemsModal');
          const equipmentId = modal.dataset.equipmentId;
          const row = document.querySelector(`tr[data-equipment-id="${equipmentId}"]`);
          if (row) {
            const statusElement = row.querySelector('td:nth-child(5)');
            if (statusElement) {
              statusElement.innerHTML = getGeneralStatusDisplay(result.general_status, result.unavailable_count || 0);
            }
          }
          try {
            const equipmentName = (document.getElementById('equipmentNameInput') || { value: '' }).value.trim();
            await refreshIndividualItemsSection(modal.dataset.equipmentId, equipmentName);
          } catch (_) {}
        }
        if (typeof renderDisposalList === 'function') {
          renderDisposalList();
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
          { value: 'plates', label: 'Plates' },
          { value: 'weights', label: 'Weights' },
        ],
      },
    ],
  };

  main.openModal(mainBtn, inputs, (result) => {
    if (!main.isValidPaymentAmount(+result.short[1].value)) {
      main.toast(`Invalid quantity: ${result.short[1].value}`, 'error');
      return;
    }
    if (result.spinner[0].selected < 1) {
      main.toast(`Invalid category`, 'error');
      return;
    }
    validateRegisterIntent(
      result.image.src,
      result.short[0].value,
      +result.short[1].value,
      result.spinner[0].options[result.spinner[0].selected - 1].value
    );
  });
}

function normalizeEquipmentName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function validateRegisterIntent(image, name, quantity, category) {
  try {
    const newNameNorm = normalizeEquipmentName(name);
    if (newNameNorm.length < 3) {
      return registerNewProduct(image, name, quantity, category);
    }

    const resp = await fetch(`${API_BASE_URL}/maintenance/equipment`);
    const data = await resp.json();
    const list = resp.ok ? data.result || [] : [];
    const similar = list.find((eq) => {
      const existingNorm = normalizeEquipmentName(eq.equipment_name);
      if (!existingNorm) return false;
      return existingNorm === newNameNorm || existingNorm.includes(newNameNorm) || newNameNorm.includes(existingNorm);
    });

    if (similar) {
      openConfirmAddToExistingModal(similar, quantity, category, image, name);
      return;
    }
    registerNewProduct(image, name, quantity, category);
  } catch (err) {
    console.error('Validation error:', err);
    registerNewProduct(image, name, quantity, category);
  }
}

function openConfirmAddToExistingModal(existingEquipment, quantity, category, image, attemptedName) {
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-40 hidden" id="confirmAddToExistingModal">
      <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-blue-500 to-blue-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Similar Equipment Found</p>
          <p class="text-xs">Did you mean to add items to the existing equipment?</p>
        </div>
        <div class="p-6 text-sm text-gray-700">
          <p class="mb-3">Attempted name: <span class="font-semibold">${attemptedName}</span></p>
          <div class="bg-gray-50 p-3 rounded border">
            <p class="text-gray-600 mb-1">Existing equipment:</p>
            <p class="font-semibold text-gray-900">${existingEquipment.equipment_name}</p>
            <p class="text-xs text-gray-500 mt-1">ID: ${existingEquipment.equipment_id.split('_').slice(0, 2).join('_')}</p>
          </div>
          <p class="mt-4">Add <span class="font-semibold">${quantity}</span> new individual item(s) to this equipment instead?</p>
          <div class="flex gap-3 mt-5">
            <button type="button" id="addToExistingCancelBtn" class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">Cancel</button>
            <button type="button" id="addToExistingConfirmBtn" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600">Add to Existing</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('confirmAddToExistingModal');
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

  document.getElementById('addToExistingCancelBtn').addEventListener('click', () => {
    close();
  });

  document.getElementById('addToExistingConfirmBtn').addEventListener('click', async () => {
    try {
      if (typeof main.closeModal === 'function') {
        try {
          main.closeModal();
        } catch (_) {}
      }
      await addQuantityToExistingEquipment(existingEquipment.equipment_id, existingEquipment.equipment_name, quantity);
      close();
    } catch (e) {
      console.error('Add to existing failed:', e);
      close();
    }
  });
}

async function addQuantityToExistingEquipment(equipmentId, equipmentName, addQuantity) {
  try {
    // Get current items to compute start index
    const itemsResp = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}/items`);
    const itemsData = await itemsResp.json();
    const currentItems = itemsResp.ok ? itemsData.result || [] : [];
    const lastItemNumber = currentItems.length;

    const addResp = await fetch(`${API_BASE_URL}/maintenance/equipment/${equipmentId}/add-quantity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        add_quantity: addQuantity,
        equipment_name: equipmentName,
        start_index: lastItemNumber + 1,
      }),
    });
    const addRes = await addResp.json();
    if (addResp.ok) {
      main.toast(`Added ${addQuantity} item(s) to ${equipmentName}`, 'success');
      refreshAllTabs();
    } else {
      main.toast(`Error: ${addRes.error || 'Failed to add items'}`, 'error');
    }
  } catch (err) {
    console.error('Add quantity to existing error:', err);
    main.toast('Network error: Failed to add items to existing equipment', 'error');
  }
}

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
      const columnsData = [
        result.result.equipment_id.split('_').slice(0, 2).join('_'),
        `<div style="display:flex;align-items:center;gap:8px;"><img src="${image || '/src/images/client_logo.jpg'}" alt="${name}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="showImageModal(this.src, '${name}')"><span>${name}</span></div>`,
        quantity.toString(),
        category,
        getGeneralStatusDisplay('All Available'),
        'custom_date_today',
      ];
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

        frontendResult.dataset.equipmentId = result.result.equipment_id;

        setupEquipmentButtons(frontendResult, equipmentData);
      });

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

function refreshAllTabs() {
  const emptyText = document.getElementById('maintenance-equipmentSectionOneListEmpty1');
  if (emptyText) {
    const tableBody = emptyText.closest('tbody');
    const existingRows = Array.from(tableBody.querySelectorAll('tr:not(:first-child)'));
    existingRows.forEach((row) => row.remove());
  }

  loadExistingEquipment();
  renderDisposalList();
  renderDisposedList();
}

async function renderDisposalList() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/maintenance/equipment/items?status=${encodeURIComponent('For Disposal')}`
    );
    const data = await response.json();
    const items = response.ok ? data.result || [] : [];

    const emptyCell = document.getElementById('maintenance-equipmentSectionOneListEmpty2');
    if (emptyCell) {
      const tbody = emptyCell.closest('tbody');
      const existingRows = Array.from(tbody.querySelectorAll('tr:not(:first-child)'));
      existingRows.forEach((row) => row.remove());
      if (!items.length) return;

      items.forEach((item) => {
        const columnsData = [item.item_code, item.equipment_name, item.individual_status, 'custom_date_today'];
        main.createAtSectionOne('maintenance-equipment', columnsData, 2, (frontendResult) => {
          frontendResult.dataset.itemId = item.item_id;
          const nameCell = frontendResult.children[1];
          if (nameCell) {
            const equipmentName = item.equipment_name || '';
            const renderWithImage = (img) => {
              const imgSrc = img || '/src/images/client_logo.jpg';
              nameCell.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><img src="${imgSrc}" alt="${equipmentName}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="showImageModal(this.src, '${equipmentName.replace(/'/g, "&#39;")}')"><span>${equipmentName}</span></div>`;
            };

            const inlineImage = item.image_url || item.equipment_image_url || item.equipmentImageUrl;
            if (inlineImage) {
              renderWithImage(inlineImage);
            } else if (item.equipment_id) {
              (async () => {
                try {
                  const eqResp = await fetch(`${API_BASE_URL}/maintenance/equipment/${encodeURIComponent(item.equipment_id)}`);
                  const eqData = await eqResp.json();
                  const eq = eqResp.ok ? eqData.result || {} : {};
                  renderWithImage(eq.image_url || '/src/images/client_logo.jpg');
                } catch (_) {
                  renderWithImage('/src/images/client_logo.jpg');
                }
              })();
            } else {
              renderWithImage('/src/images/client_logo.jpg');
            }
          }
          const btn = frontendResult.querySelector('#disposeConfirmBtn');
          if (btn) {
            btn.addEventListener('click', () => confirmDisposeItem(item));
          }
        });
      });
    }
  } catch (error) {
    console.error('Error loading disposal list:', error);
  }
}

function confirmDisposeItem(item) {
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/50 opacity-0 duration-300 z-30 hidden" id="disposeItemModal">
      <div class="m-auto w-full max-w-md -translate-y-6 scale-95 rounded-2xl bg-white shadow-xl duration-300" onclick="event.stopPropagation()">
        <div class="flex flex-col gap-1 rounded-t-2xl bg-gradient-to-br from-red-500 to-red-800 p-4 text-center text-white">
          <p class="text-xl font-medium">Confirm Disposal ${getEmoji('🗑️', 26)}</p>
          <p class="text-xs">This action cannot be undone</p>
        </div>
        <div class="p-6">
          <div class="mb-4">
            <p class="text-gray-700 mb-2">Type <span class="font-bold text-red-600">"confirm"</span> to dispose:</p>
            <div class="bg-gray-100 p-3 rounded-md">
              <p class="font-semibold text-gray-900">${item.item_code}</p>
              <p class="text-sm text-gray-600">${item.equipment_name}</p>
            </div>
          </div>
          <input type="text" id="disposeConfirmInput" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Type 'confirm' here">
          <div class="flex gap-3 mt-4">
            <button type="button" id="disposeCancelBtn" class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">Cancel</button>
            <button type="button" id="disposeProceedBtn" class="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled>Dispose Item</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('disposeItemModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  const input = document.getElementById('disposeConfirmInput');
  const proceed = document.getElementById('disposeProceedBtn');
  const cancel = document.getElementById('disposeCancelBtn');
  input.addEventListener('input', (e) => {
    proceed.disabled = e.target.value.trim().toLowerCase() !== 'confirm';
  });
  cancel.addEventListener('click', () => closeDisposeModal());
  proceed.addEventListener('click', async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/maintenance/equipment/items/${encodeURIComponent(item.item_id)}`, {
        method: 'DELETE',
      });
      const res = await resp.json();
      if (resp.ok) {
        main.toast('Item disposed successfully', 'success');
        closeDisposeModal();
        refreshAllTabs();
      } else {
        main.toast(`Error: ${res.error || 'Failed to dispose item'}`, 'error');
      }
    } catch (err) {
      console.error('Dispose error:', err);
      main.toast('Network error: Failed to dispose item', 'error');
    }
  });
}

function closeDisposeModal() {
  const modal = document.getElementById('disposeItemModal');
  if (!modal) return;
  modal.classList.remove('opacity-100');
  modal.children[0].classList.add('-translate-y-6');
  modal.children[0].classList.remove('scale-100');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.remove();
  }, 300);
}

async function renderDisposedList() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/maintenance/equipment/items?status=${encodeURIComponent('Disposed')}`
    );
    const data = await response.json();
    const items = response.ok ? data.result || [] : [];
    const emptyCell = document.getElementById('maintenance-equipmentSectionOneListEmpty3');
    if (emptyCell) {
      const tbody = emptyCell.closest('tbody');
      const existingRows = Array.from(tbody.querySelectorAll('tr:not(:first-child)'));
      existingRows.forEach((row) => row.remove());
      if (!items.length) return;
      items.forEach((item) => {
        const disposedAtRaw =
          item.disposed_at || item.updated_at || item.status_updated_at || item.date || item.created_at;
        let disposedDateDisp = '—';
        let disposedTimeDisp = '—';
        if (disposedAtRaw) {
          try {
            const dt = new Date(disposedAtRaw);
            disposedDateDisp = dt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
            });
            disposedTimeDisp = dt.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            });
          } catch (_) {
            disposedDateDisp = disposedAtRaw;
            disposedTimeDisp = '—';
          }
        }
        const columnsData = [item.item_code, item.equipment_name, disposedDateDisp, disposedTimeDisp];
        main.createAtSectionOne('maintenance-equipment', columnsData, 3, (frontendResult) => {
          frontendResult.dataset.itemId = item.item_id;
          const nameCell = frontendResult.children[1];
          if (nameCell) {
            const equipmentName = item.equipment_name || '';
            const renderWithImage = (img) => {
              const imgSrc = img || '/src/images/client_logo.jpg';
              nameCell.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><img src="${imgSrc}" alt="${equipmentName}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="showImageModal(this.src, '${equipmentName.replace(/'/g, "&#39;")}')"><span>${equipmentName}</span></div>`;
            };

            const inlineImage = item.image_url || item.equipment_image_url || item.equipmentImageUrl;
            if (inlineImage) {
              renderWithImage(inlineImage);
            } else if (item.equipment_id) {
              // Fallback: fetch the equipment to get its image
              (async () => {
                try {
                  const eqResp = await fetch(`${API_BASE_URL}/maintenance/equipment/${encodeURIComponent(item.equipment_id)}`);
                  const eqData = await eqResp.json();
                  const eq = eqResp.ok ? eqData.result || {} : {};
                  renderWithImage(eq.image_url || '/src/images/client_logo.jpg');
                } catch (_) {
                  renderWithImage('/src/images/client_logo.jpg');
                }
              })();
            } else {
              renderWithImage('/src/images/client_logo.jpg');
            }
          }
          const dateCell = frontendResult.children[2];
          const timeCell = frontendResult.children[3];
          if (dateCell) dateCell.textContent = disposedDateDisp;
          if (timeCell) timeCell.textContent = disposedTimeDisp;
        });
      });
    }
  } catch (error) {
    console.error('Error loading disposed list:', error);
  }
}

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

window.showImageModal = function (imageSrc, equipmentName) {
  const modalHTML = `
    <div class="fixed inset-0 h-full w-full content-center overflow-y-auto bg-black/75 opacity-0 duration-300 z-50 hidden" id="imageModal">
      <div class="m-auto w-full max-w-3xl -translate-y-6 scale-95 p-4 duration-300" onclick="event.stopPropagation()">
        <div class="relative">
          <img src="${imageSrc}" alt="${equipmentName}" class="w-full h-auto rounded-lg shadow-2xl">
        </div>
        <p class="text-center text-white mt-4 text-lg font-medium">${equipmentName}</p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('imageModal');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.add('opacity-100');
    modal.children[0].classList.remove('-translate-y-6');
    modal.children[0].classList.add('scale-100');
  }, 10);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeImageModal();
    }
  });

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeImageModal();
    }
  };
  document.addEventListener('keydown', handleEscape);
  modal.dataset.escapeHandler = 'true';
};

window.closeImageModal = function () {
  const modal = document.getElementById('imageModal');
  if (modal) {
    modal.classList.remove('opacity-100');
    modal.children[0].classList.add('-translate-y-6');
    modal.children[0].classList.remove('scale-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.remove();
    }, 300);
  }
};