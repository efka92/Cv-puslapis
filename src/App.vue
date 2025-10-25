<script setup>
import { ref, watch, onMounted } from 'vue'
import { saveTableToFirestore, loadTableFromFirestore } from '@/services/tableService.js'
import { saveImagesToFirestore, loadImagesFromFirestore, uploadImage } from '@/services/imageService.js'
import imageOne from '@/assets/images/one.jpg'
import imageTwo from '@/assets/images/two.jpg'

// Initial default images
const defaultImages = [
  { src: imageOne, alt: 'Image One' },
  { src: imageTwo, alt: 'Image Two' }
]

const images = ref(defaultImages)
const currentImageIndex = ref(0)
const newImageUrl = ref('')
const newImageAlt = ref('')

// Image management functions
const selectedFile = ref(null)
const isUploading = ref(false)
const fileInput = ref(null)

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    selectedFile.value = file
  } else {
    alert('Please select an image file')
  }
}

const addImage = async () => {
  if (!selectedFile.value) {
    alert('Please select an image file first')
    return
  }
  
  isUploading.value = true
  try {
    // Upload the file and get the URL
    const downloadURL = await uploadImage(selectedFile.value)
    
    const newImage = {
      src: downloadURL,
      alt: newImageAlt.value.trim() || `Image ${images.value.length + 1}`
    }
    
    const currentImages = [...images.value]
    images.value.push(newImage)
    
    try {
      await saveImagesToFirestore(images.value)
      // Clear input fields only after successful save
      newImageAlt.value = ''
      selectedFile.value = null
      if (fileInput.value) {
        fileInput.value.value = '' // Reset file input
      }
    } catch (saveError) {
      // Rollback on save error
      images.value = currentImages
      throw saveError
    }
  } catch (error) {
    console.error('Failed to add image:', error)
    alert('Failed to upload image. Please try again.')
  } finally {
    isUploading.value = false
  }
}

const deleteImage = async (index) => {
  if (images.value.length <= 1) return // Keep at least one image
  if (index < 0 || index >= images.value.length) return // Invalid index
  
  try {
    const currentImages = [...images.value]
    const currentIndex = currentImageIndex.value
    
    images.value.splice(index, 1)
    if (currentImageIndex.value >= images.value.length) {
      currentImageIndex.value = images.value.length - 1
    }
    
    try {
      await saveImagesToFirestore(images.value)
    } catch (saveError) {
      // Rollback on save error
      images.value = currentImages
      currentImageIndex.value = currentIndex
      throw saveError
    }
  } catch (error) {
    console.error('Failed to delete image:', error)
    alert('Failed to delete image. Please try again.')
  }
}

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

// Navigation functions
const preloadNextImage = () => {
  const nextIndex = (currentImageIndex.value + 1) % images.value.length
  const img = new Image()
  img.src = images.value[nextIndex].src
}

const handleImageError = async () => {
  const failedSrc = images.value[currentImageIndex.value]?.src
  console.error('Failed to load image:', failedSrc)

  try {
    const savedImages = await loadImagesFromFirestore()
    if (savedImages && savedImages.length > 0) {
      // Merge saved images with defaults, keep defaults if not present
      const savedUrls = new Set(savedImages.map((img) => img.src))
      const defaultsNotInSaved = defaultImages.filter((img) => !savedUrls.has(img.src))
      images.value = [...defaultsNotInSaved, ...savedImages]

      // Ensure current index is within bounds
      if (currentImageIndex.value >= images.value.length) {
        currentImageIndex.value = images.value.length - 1
      }
    }
  } catch (error) {
    console.error('Failed to reload/merge images:', error)
  }
}

const nextImage = () => {
  currentImageIndex.value = (currentImageIndex.value + 1) % images.value.length
  preloadNextImage() // Preload the next image
}

const previousImage = () => {
  currentImageIndex.value = currentImageIndex.value === 0 
    ? images.value.length - 1 
    : currentImageIndex.value - 1
  preloadNextImage() // Preload the next image
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

// Initialize all data on mount
onMounted(async () => {
  // Load color preference
  if (typeof window !== 'undefined') {
    const savedColorIndex = localStorage.getItem('backgroundColor')
    if (savedColorIndex !== null) {
      currentColorIndex.value = parseInt(savedColorIndex)
      document.body.style.backgroundColor = colors[currentColorIndex.value]
    }
  }

  try {
    // Load table data
    const remote = await loadTableFromFirestore(FIRESTORE_DOC_ID)
    if (remote && remote.headerRow && remote.tableData) {
      headerRow.value = remote.headerRow
      tableData.value = remote.tableData
      saveToLocalStorage()
    }

    // Load images from Firestore
    const savedImages = await loadImagesFromFirestore()
    if (savedImages && savedImages.length > 0) {
      // Filter out placeholder URLs that might fail to load
      const validImages = savedImages.filter(img => 
        img.src && 
        !img.src.includes('via.placeholder.com')
      )
      
      if (validImages.length > 0) {
        // Merge with default local images if they're not already in the saved list
        const savedUrls = new Set(validImages.map(img => img.src))
        const defaultsNotInSaved = defaultImages.filter(img => !savedUrls.has(img.src))
        
        // Combine: defaults first, then saved Cloudinary images
        images.value = [...defaultsNotInSaved, ...validImages]
      }
      // If no valid images from Firestore, keep the default local images
    }
  } catch (error) {
    console.error('Failed to load data:', error)
    // Continue with default values if loading fails
  }
})
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
      <figure class="image image-container">
        <img 
          :src="images[currentImageIndex].src" 
          :alt="images[currentImageIndex].alt"
          @error="handleImageError"
          ref="currentImage"
          loading="eager"
        />
      </figure>

      <div class="buttons mt-3">
        <button class="button is-primary" @click="previousImage">Atgal</button>
        <button class="button is-primary" @click="nextImage">Sekanti</button>
        <button 
          class="button is-danger" 
          @click="deleteImage(currentImageIndex)"
          :disabled="images.length <= 1"
          title="Ištrinti dabartinį paveikslėlį"
        >
          Ištrinti
        </button>
      </div>

      <!-- Image Management Form -->
      <div class="box mt-4">
        <h3 class="subtitle">Pridėti naują paveikslėlį</h3>
        <div class="field">
          <label class="label">Pasirinkti paveikslėlį</label>
          <div class="control">
            <input 
              class="input" 
              type="file" 
              ref="fileInput"
              @change="handleFileSelect" 
              accept="image/*"
            >
          </div>
        </div>

        <button 
          class="button is-success" 
          @click="addImage"
          :disabled="!selectedFile || isUploading"
        >
          {{ isUploading ? 'Įkeliama...' : 'Pridėti paveikslėlį' }}
        </button>
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

.image-container {
  width: 400px;
  height: 300px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
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
