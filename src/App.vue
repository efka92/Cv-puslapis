<script setup>
import { ref, watch, onMounted } from 'vue'
import { saveTableToFirestore, loadTableFromFirestore } from '@/services/tableService.js'
import imageOne from '@/assets/images/one.jpg'
import imageTwo from '@/assets/images/two.jpg'

const images = [
  { src: imageOne, alt: 'Image One' },
  { src: imageTwo, alt: 'Image Two' }
]

const currentImageIndex = ref(0)

// Load saved data from localStorage or use defaults
const savedHeaderRow = localStorage.getItem('headerRow')
const savedTableData = localStorage.getItem('tableData')

const headerRow = ref(
  savedHeaderRow ? JSON.parse(savedHeaderRow) : ['Darbovietė', 'Pareigos', 'Patirtis']
)
const tableData = ref(
  savedTableData ? JSON.parse(savedTableData) : [
    ['', '', ''],
    ['', '', '']
  ]
)

// Save data functions
const saveToLocalStorage = () => {
  localStorage.setItem('headerRow', JSON.stringify(headerRow.value))
  localStorage.setItem('tableData', JSON.stringify(tableData.value))
}

// Use v-model in the template and watch for changes to auto-save (localStorage + Firestore debounced)
const FIRESTORE_DOC_ID = 'cv-table'
let saveTimer = null
const saveBoth = () => {
  // Save immediately to localStorage
  saveToLocalStorage()
  // Debounce Firestore writes
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await saveTableToFirestore(FIRESTORE_DOC_ID, headerRow.value, tableData.value)
    } catch (e) {
      console.error('Failed saving to Firestore', e)
    }
  }, 700)
}

watch(headerRow, saveBoth, { deep: true })
watch(tableData, saveBoth, { deep: true })

// Add new row function
const addNewRow = () => {
  // Add a new empty row with the same number of columns as the header
  tableData.value.push(new Array(headerRow.value.length).fill(''))
  saveBoth()
}

// Delete row function
const deleteRow = (rowIndex) => {
  // Don't delete if it's the last row
  if (tableData.value.length > 1) {
    tableData.value.splice(rowIndex, 1)
    saveBoth()
  }
}

// Add clear data function
const clearTableData = () => {
  headerRow.value = ['Darbovietė', 'Pareigos', 'Patirtis']
  tableData.value = [
    ['Biblioteka', 'Kompiuteristas', '8 m.'],
    ['Mokykla', 'Mokytojas', '1 m.']
  ]
  saveBoth()
}

// Try to load remote data from Firestore on mount (falls back to localStorage/defaults)
onMounted(async () => {
  try {
    const remote = await loadTableFromFirestore(FIRESTORE_DOC_ID)
    if (remote && remote.headerRow && remote.tableData) {
      headerRow.value = remote.headerRow
      tableData.value = remote.tableData
      // keep localStorage in sync
      saveToLocalStorage()
    }
  } catch (e) {
    console.error('Failed loading from Firestore', e)
  }
})

const nextImage = () => {
  currentImageIndex.value = (currentImageIndex.value + 1) % images.length
}

const previousImage = () => {
  currentImageIndex.value = currentImageIndex.value === 0 
    ? images.length - 1 
    : currentImageIndex.value - 1
}

// Background color cycling
const colors = ['blue', 'green', 'yellow', 'cyan']
const currentColorIndex = ref(0)

const cycleBackgroundColor = () => {
  currentColorIndex.value = (currentColorIndex.value + 1) % colors.length
  document.body.style.backgroundColor = colors[currentColorIndex.value]
  // Save the current color preference
  localStorage.setItem('backgroundColor', currentColorIndex.value.toString())
}

// Load saved color preference on mount
if (typeof window !== 'undefined') {
  const savedColorIndex = localStorage.getItem('backgroundColor')
  if (savedColorIndex !== null) {
    currentColorIndex.value = parseInt(savedColorIndex)
    document.body.style.backgroundColor = colors[currentColorIndex.value]
  }
}
</script>

<template>
  <div class="container">
    <div class="has-text-centered mb-6 top-spacing">
      <h1 class="title">Mano CV</h1>
      <h2 class="subtitle">Evaldas Parauka MKDin-23</h2>
      <button class="button is-info mt-3" @click="cycleBackgroundColor">
        Keisti fono spalvą
      </button>
    </div>

    <div class="image-slider">
      <figure class="image is-128x128">
        <img 
          class="is-fullwidth" 
          :src="images[currentImageIndex].src" 
          :alt="images[currentImageIndex].alt" 
        />
      </figure>

      <div class="buttons mt-3">
        <button class="button is-primary" @click="previousImage">Atgal</button>
        <button class="button is-primary" @click="nextImage">Sekanti</button>
      </div>
    </div>

    <div class="table-section mt-6">
      <div class="table-container">
        <table class="table is-bordered is-fullwidth">
          <thead>
            <tr>
              <th v-for="(cell, colIndex) in headerRow" :key="colIndex" class="has-text-centered" style="font-weight: bold;">
                <input class="input header-input" v-model="headerRow[colIndex]" />
              </th>
              <th style="width: 40px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in tableData" :key="rowIndex">
              <td v-for="(cell, colIndex) in row" :key="colIndex" class="has-text-centered">
                <input class="input" v-model="tableData[rowIndex][colIndex]" />
              </td>
              <td class="has-text-centered" style="width: 40px">
                <button 
                  class="button is-small is-danger"
                  @click="deleteRow(rowIndex)"
                  :disabled="tableData.length <= 1"
                  title="Ištrinti eilutę"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="has-text-centered mt-4">
        <div class="buttons is-centered">
          <button class="button is-success" @click="addNewRow">
            Pridėti eilutę
          </button>
          <button class="button is-danger" @click="clearTableData">
            Atstatyti lentelę
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import 'bulma/css/bulma.min.css';

body {
  transition: background-color 0.5s ease;
  min-height: 100vh;
}

.image-slider {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem auto;
}

.buttons {
  display: flex;
  gap: 1rem;
}

.table td {
  vertical-align: middle;
  cursor: text;
}

.table-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.table-container {
  width: 100%;
}

.table {
  width: 100%;
}

/* Make header inputs bold to emphasize first row */
.header-input {
  font-weight: 700;
}

/* Make the top spacing/header area match the body background */
.top-spacing {
  background-color: transparent !important;
  padding-top: 2rem; /* keep some spacing from the top */
  margin-top: 0; /* rely on padding for spacing */
}
</style>
