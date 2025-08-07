const mysqlConnection = require('../database/mysql');

class DataSync {
  constructor() {
    this.syncQueue = [];
    this.isProcessing = false;
  }

  // Add item to sync queue
  enqueue(tableName, recordId, action, data) {
    const syncId = 'SYNC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const syncItem = {
      sync_id: syncId,
      table_name: tableName,
      record_id: recordId,
      action: action, // 'create', 'update', 'delete'
      data: JSON.stringify(data),
      status: 'pending',
      retry_count: 0,
      created_at: new Date()
    };

    const query = 'INSERT INTO data_sync_queue_tbl (sync_id, table_name, record_id, action, data, status) VALUES (?, ?, ?, ?, ?, ?)';
    
    mysqlConnection.query(query, [
      syncItem.sync_id,
      syncItem.table_name,
      syncItem.record_id,
      syncItem.action,
      syncItem.data,
      syncItem.status
    ], (error, result) => {
      if (error) {
        console.error('Error adding to sync queue:', error);
      } else {
        console.log(`Added to sync queue: ${action} ${tableName} ${recordId}`);
      }
    });
  }

  // Get pending sync items
  getPendingSyncItems() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM data_sync_queue_tbl WHERE status = "pending" ORDER BY created_at ASC';
      
      mysqlConnection.query(query, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  // Mark sync item as synced
  markAsSynced(syncId) {
    const query = 'UPDATE data_sync_queue_tbl SET status = "synced", synced_at = NOW() WHERE sync_id = ?';
    
    mysqlConnection.query(query, [syncId], (error, result) => {
      if (error) {
        console.error('Error marking as synced:', error);
      } else {
        console.log(`Marked as synced: ${syncId}`);
      }
    });
  }

  // Mark sync item as failed
  markAsFailed(syncId, errorMessage) {
    const query = 'UPDATE data_sync_queue_tbl SET status = "failed", error_message = ?, retry_count = retry_count + 1 WHERE sync_id = ?';
    
    mysqlConnection.query(query, [errorMessage, syncId], (error, result) => {
      if (error) {
        console.error('Error marking as failed:', error);
      } else {
        console.log(`Marked as failed: ${syncId} - ${errorMessage}`);
      }
    });
  }

  // Process sync queue (to be called when Firebase is available)
  async processSyncQueue() {
    if (this.isProcessing) {
      console.log('Sync already in progress');
      return;
    }

    this.isProcessing = true;
    
    try {
      const pendingItems = await this.getPendingSyncItems();
      
      for (const item of pendingItems) {
        try {
          // TODO: Implement Firebase sync here when Firebase is available
          // Sa ngayon, just mark as synced
          console.log(`Processing sync: ${item.action} ${item.table_name} ${item.record_id}`);
          
          // Simulate Firebase sync
          await this.simulateFirebaseSync(item);
          
          this.markAsSynced(item.sync_id);
          
        } catch (error) {
          console.error(`Sync failed for ${item.sync_id}:`, error);
          this.markAsFailed(item.sync_id, error.message);
        }
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Simulate Firebase sync (replace with actual Firebase implementation)
  async simulateFirebaseSync(item) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Simulated Firebase sync: ${item.action} ${item.table_name} ${item.record_id}`);
        resolve();
      }, 100);
    });
  }

  // Get sync statistics
  getSyncStats() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_items,
          COUNT(CASE WHEN status = 'synced' THEN 1 END) as synced_items,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_items
        FROM data_sync_queue_tbl
      `;
      
      mysqlConnection.query(query, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result[0]);
        }
      });
    });
  }

  // Clear old synced items (older than 30 days)
  clearOldSyncedItems() {
    const query = 'DELETE FROM data_sync_queue_tbl WHERE status = "synced" AND synced_at < DATE_SUB(NOW(), INTERVAL 30 DAY)';
    
    mysqlConnection.query(query, (error, result) => {
      if (error) {
        console.error('Error clearing old synced items:', error);
      } else {
        console.log(`Cleared ${result.affectedRows} old synced items`);
      }
    });
  }

  // Retry failed items
  async retryFailedItems() {
    const query = 'UPDATE data_sync_queue_tbl SET status = "pending", error_message = NULL WHERE status = "failed" AND retry_count < 3';
    
    mysqlConnection.query(query, (error, result) => {
      if (error) {
        console.error('Error retrying failed items:', error);
      } else {
        console.log(`Retried ${result.affectedRows} failed items`);
      }
    });
  }
}

// Create singleton instance
const dataSync = new DataSync();

// Auto-process sync queue every 5 minutes
setInterval(() => {
  dataSync.processSyncQueue();
}, 5 * 60 * 1000);

// Clear old synced items every day
setInterval(() => {
  dataSync.clearOldSyncedItems();
}, 24 * 60 * 60 * 1000);

module.exports = dataSync;
