import { db } from '@/firebase.js'
import { doc, setDoc, getDoc, collection } from 'firebase/firestore'

export async function saveTableToFirestore(docId, headerRow, tableData) {
  try {
    // First, try to create the collection if it doesn't exist
    const tablesCollection = collection(db, 'tables');
    
    const ref = doc(db, 'tables', docId)
    const formattedData = {
      headerRow: Object.fromEntries(headerRow.map((value, index) => [index.toString(), value])),
      tableData: tableData.map((row, rowIndex) => 
        Object.fromEntries(row.map((cell, colIndex) => [colIndex.toString(), cell]))
      ),
      updatedAt: new Date().toISOString()
    }
    
    console.log('Attempting to save to Firestore...', { docId, collectionPath: 'tables' })
    await setDoc(ref, formattedData)
    console.log('✅ Saved to Firestore successfully!')
    return true
  } catch (error) {
    console.error('❌ Error saving to Firestore:', {
      errorCode: error.code,
      errorMessage: error.message,
      docId,
      collectionPath: 'tables'
    })
    throw error
  }
}

export async function loadTableFromFirestore(docId) {
  try {
    const ref = doc(db, 'tables', docId)
    console.log('Attempting to load from Firestore...', { docId, collectionPath: 'tables' })
    
    const snap = await getDoc(ref)
    
    if (snap.exists()) {
      const data = snap.data()
      const result = {
        headerRow: Object.values(data.headerRow),
        tableData: data.tableData.map(row => Object.values(row)),
        updatedAt: data.updatedAt
      }
      console.log('✅ Successfully loaded data from Firestore')
      return result
    } else {
      console.log('ℹ️ No existing data found in Firestore, using defaults')
      return null
    }
  } catch (error) {
    console.error('❌ Error loading from Firestore:', {
      errorCode: error.code,
      errorMessage: error.message,
      docId,
      collectionPath: 'tables'
    })
    throw error
  }
}
