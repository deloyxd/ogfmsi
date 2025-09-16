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
 * @param {string} itemId - The item ID to get equipment from
 * @param {object} res - Express response object
 * @param {object} mysqlConnection - MySQL connection object
 */
function updateGeneralStatus(itemId, res, mysqlConnection) {
  // First get the equipment_id from the item
  const getEquipmentQuery = 'SELECT equipment_id FROM gym_equipment_items_tbl WHERE item_id = ?';
  
  mysqlConnection.query(getEquipmentQuery, [itemId], (error, result) => {
    if (error) {
      console.error('Getting equipment ID error:', error);
      return res.status(500).json({ error: 'Failed to get equipment ID' });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Equipment item not found' });
    }
    
    const equipment_id = result[0].equipment_id;
    
    // Get all individual statuses for this equipment
    const getStatusesQuery = 'SELECT individual_status FROM gym_equipment_items_tbl WHERE equipment_id = ?';
    
    mysqlConnection.query(getStatusesQuery, [equipment_id], (statusError, statusResult) => {
      if (statusError) {
        console.error('Getting individual statuses error:', statusError);
        return res.status(500).json({ error: 'Failed to get individual statuses' });
      }
      
      // Determine general status and count unavailable
      const unavailable_count = statusResult.filter(item => item.individual_status === 'Unavailable').length;
      const general_status = unavailable_count > 0 ? 'Warning - Need Repair' : 'All Available';
      
      // Update general status
      const updateGeneralQuery = 'UPDATE gym_equipment_tbl SET general_status = ? WHERE equipment_id = ?';
      
      mysqlConnection.query(updateGeneralQuery, [general_status, equipment_id], (updateError) => {
        if (updateError) {
          console.error('Updating general status error:', updateError);
          return res.status(500).json({ error: 'Failed to update general status' });
        }
        
        res.status(200).json({ 
          message: 'Equipment item status updated successfully',
          general_status: general_status,
          unavailable_count: unavailable_count
        });
      });
    });
  });
}

module.exports = {
  generateEquipmentCode,
  updateGeneralStatus
};