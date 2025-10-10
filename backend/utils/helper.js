/**
 * Utilities for equipment code generation and general status updates.
 * Refactored to use the shared mysql2/promise pool via ../database/mysql
 * and async/await semantics. Supports passing a transaction connection
 * (from getConnection) or defaults to the shared pool.
 */

const db = require('../database/mysql');

/**
 * Generate equipment code based on 3 consonants rule
 * Example: "Cable Crossover" -> "CABCRO001"
 * @param {string} equipmentName - The name of the equipment
 * @param {number} index - The index number for the equipment item (default: 1)
 * @returns {string} - The generated equipment code
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
 * Update general status based on individual statuses
 * Preserves existing response semantics (sends response via res).
 * If a transaction connection is provided, it will be used; otherwise, uses the shared pool.
 *
 * @param {string} itemId - The item ID to get equipment from
 * @param {import('express').Response} res - Express response object
 * @param {import('mysql2/promise').PoolConnection|import('mysql2/promise').Pool} [conn] - Optional connection or pool
 */
async function updateGeneralStatus(itemId, res, conn) {
  const cxn = conn || db.pool;

  try {
    // First get the equipment_id from the item
    const [equipRows] = await cxn.query(
      'SELECT equipment_id FROM gym_equipment_items_tbl WHERE item_id = ?',
      [itemId]
    );

    if (!equipRows || equipRows.length === 0) {
      return res.status(404).json({ error: 'Equipment item not found' });
    }

    const equipment_id = equipRows[0].equipment_id;

    // Get all individual statuses for this equipment (include Disposed)
    const [statusResult] = await cxn.query(
      'SELECT individual_status FROM gym_equipment_items_tbl WHERE equipment_id = ?',
      [equipment_id]
    );

    // Count statuses
    const totalCount = statusResult.length;
    let availableCount = 0;
    let unavailableCount = 0;
    let forDisposalCount = 0;
    let disposedCount = 0;

    statusResult.forEach((row) => {
      const s = row.individual_status;
      if (s === 'Available') availableCount++;
      else if (s === 'Unavailable') unavailableCount++;
      else if (s === 'For Disposal') forDisposalCount++;
      else if (s === 'Disposed') disposedCount++;
    });

    // Determine general status with precedence
    let general_status = 'All Available';
    if (unavailableCount > 0) {
      general_status = `Warning - (${unavailableCount}) Need Repair`;
    } else if (forDisposalCount > 0) {
      general_status = `Pending Disposal - (${forDisposalCount})`;
    } else if (disposedCount > 0) {
      if (availableCount > 0) {
        general_status = `Partially Available - ${availableCount} avail, ${disposedCount} disposed`;
      } else {
        general_status = `Disposed Items - (${disposedCount})`;
      }
    } else {
      general_status = 'All Available';
    }

    // Update general status
    await cxn.query(
      'UPDATE gym_equipment_tbl SET general_status = ? WHERE equipment_id = ?',
      [general_status, equipment_id]
    );

    return res.status(200).json({
      message: 'Equipment item status updated successfully',
      general_status: general_status,
      unavailable_count: unavailableCount,
      for_disposal_count: forDisposalCount,
      disposed_count: disposedCount,
      available_count: availableCount,
      total_count: totalCount,
    });
  } catch (error) {
    console.error('Updating general status error:', error);
    return res.status(500).json({ error: 'Failed to update general status' });
  }
}

/**
 * Helper to recompute general status given an equipment_id (used after bulk/add operations)
 * Backward compatibility: If a callback is provided, it will be invoked as cb(err, result).
 * Otherwise, returns a Promise that resolves with the computed status object.
 *
 * @param {string} equipmentId
 * @param {function(Error|null, object=):void} [cb]
 * @param {import('mysql2/promise').PoolConnection|import('mysql2/promise').Pool} [conn]
 * @returns {Promise<object>|void}
 */
function updateGeneralStatusForEquipment(equipmentId, cb, conn) {
  const doWork = async () => {
    const cxn = conn || db.pool;

    const [statusResult] = await cxn.query(
      'SELECT individual_status FROM gym_equipment_items_tbl WHERE equipment_id = ?',
      [equipmentId]
    );

    const totalCount = statusResult.length;
    let availableCount = 0;
    let unavailableCount = 0;
    let forDisposalCount = 0;
    let disposedCount = 0;

    statusResult.forEach((row) => {
      const s = row.individual_status;
      if (s === 'Available') availableCount++;
      else if (s === 'Unavailable') unavailableCount++;
      else if (s === 'For Disposal') forDisposalCount++;
      else if (s === 'Disposed') disposedCount++;
    });

    let general_status = 'All Available';
    if (unavailableCount > 0) {
      general_status = `Warning - (${unavailableCount}) Need Repair`;
    } else if (forDisposalCount > 0) {
      general_status = `Pending Disposal - (${forDisposalCount})`;
    } else if (disposedCount > 0) {
      if (availableCount > 0) {
        general_status = `Partially Available - ${availableCount} avail, ${disposedCount} disposed`;
      } else {
        general_status = `Disposed Items - (${disposedCount})`;
      }
    } else {
      general_status = 'All Available';
    }

    await cxn.query(
      'UPDATE gym_equipment_tbl SET general_status = ? WHERE equipment_id = ?',
      [general_status, equipmentId]
    );

    return {
      general_status,
      available_count: availableCount,
      unavailable_count: unavailableCount,
      for_disposal_count: forDisposalCount,
      disposed_count: disposedCount,
      total_count: totalCount,
    };
  };

  // Support both callback and promise forms for backward compatibility
  if (typeof cb === 'function') {
    doWork()
      .then((result) => cb(null, result))
      .catch((err) => cb(err));
    return;
  }

  return doWork();
}

module.exports = {
  generateEquipmentCode,
  updateGeneralStatus,
  updateGeneralStatusForEquipment,
};