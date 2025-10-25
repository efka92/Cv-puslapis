import { db } from '@/firebase.js'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export async function saveTableToFirestore(docId, headerRow, tableData) {
  const ref = doc(db, 'tables', docId)
  // Convert nested arrays to objects with numeric keys
  const formattedData = {
    headerRow: Object.fromEntries(headerRow.map((value, index) => [index.toString(), value])),
    tableData: tableData.map((row, rowIndex) => 
      Object.fromEntries(row.map((cell, colIndex) => [colIndex.toString(), cell]))
    ),
    updatedAt: new Date().toISOString()
  }
  
  console.log('Saving to Firestore...', formattedData)
  await setDoc(ref, formattedData)
  console.log('✅ Saved to Firestore successfully!')
}

export async function loadTableFromFirestore(docId) {
  const ref = doc(db, 'tables', docId)
  console.log('Loading from Firestore...', { docId })
  const snap = await getDoc(ref)
  
  if (snap.exists()) {
    const data = snap.data()
    // Convert object format back to arrays
    const result = {
      headerRow: Object.values(data.headerRow),
      tableData: data.tableData.map(row => Object.values(row)),
      updatedAt: data.updatedAt
    }
    console.log('✅ Loaded data from Firestore:', result)
    return result
  }
  console.log('❌ No data found in Firestore')
  return null
}
