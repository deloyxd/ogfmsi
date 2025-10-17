import { db } from '../firebase.js';
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ANNOUNCEMENTS_COLLECTION = 'announcements';
const MAX_ANNOUNCEMENTS = 3;

// -------------------------
// |    CRUD Functions     |
// -------------------------

/**
 * Create a new announcement
 * @param {Object} announcement - The announcement data
 * @returns {Promise<string>} - The document ID
 */
export async function createAnnouncement(announcement) {
  try {
    const docRef = doc(collection(db, ANNOUNCEMENTS_COLLECTION));
    const announcementData = {
      ...announcement,
      id: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, announcementData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
}

/**
 * Update an existing announcement
 * @param {string} announcementId - The announcement ID
 * @param {Object} updates - The updates to apply
 */
export async function updateAnnouncement(announcementId, updates) {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, announcementId);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
}

/**
 * Delete an announcement
 * @param {string} announcementId - The announcement ID
 */
export async function deleteAnnouncement(announcementId) {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, announcementId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
}

/**
 * Get all announcements
 * @returns {Promise<Array>} - Array of announcements
 */
export async function getAnnouncements() {
  try {
    const q = query(collection(db, ANNOUNCEMENTS_COLLECTION), orderBy('createdAt', 'desc'), limit(MAX_ANNOUNCEMENTS));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting announcements:', error);
    throw error;
  }
}

/**
 * Listen to real-time updates for announcements
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} - Unsubscribe function
 */
export function listenToAnnouncements(callback) {
  const q = query(collection(db, ANNOUNCEMENTS_COLLECTION), orderBy('createdAt', 'desc'), limit(MAX_ANNOUNCEMENTS));

  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(announcements);
  });
}

/**
 * Check if we can create more announcements
 * @returns {Promise<boolean>} - True if we can create more announcements
 */
export async function canCreateAnnouncement() {
  try {
    const announcements = await getAnnouncements();
    return announcements.length < MAX_ANNOUNCEMENTS;
  } catch (error) {
    console.error('Error checking announcement limit:', error);
    return false;
  }
}

/**
 * Get announcement count
 * @returns {Promise<number>} - Number of announcements
 */
export async function getAnnouncementCount() {
  try {
    const announcements = await getAnnouncements();
    return announcements.length;
  } catch (error) {
    console.error('Error getting announcement count:', error);
    return 0;
  }
}
