import { db } from '@/firebase.js'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const IMAGES_COLLECTION = 'images'
const IMAGE_DOC_ID = 'image-list'
// Don't use placeholder URLs as defaults - let App.vue use its local assets
const DEFAULT_IMAGES = []

// Using storage exported from firebase.js

export const validateImage = (image) => {
  if (!image || typeof image !== 'object') return false
  if (!image.src || typeof image.src !== 'string') return false
  if (!image.alt || typeof image.alt !== 'string') return false
  return true
}

// Cloudinary unsigned upload (free tier)
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const uploadImage = async (file) => {
  if (!file) throw new Error('No file provided')

  console.log('🔧 Upload config:', { CLOUD_NAME, UPLOAD_PRESET })

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env.local')
  }

  // Basic client-side validation
  const maxSizeBytes = 10 * 1024 * 1024 // 10MB
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }
  if (file.size > maxSizeBytes) {
    throw new Error('Image is too large (max 10MB)')
  }

  console.log('📤 Uploading to Cloudinary:', file.name, file.type, file.size)

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  // Optional: eager transformations or folder
  form.append('folder', 'cv-images')

  try {
    const resp = await fetch(url, { method: 'POST', body: form })
    console.log('📥 Cloudinary response:', resp.status, resp.statusText)
    
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error('❌ Cloudinary error response:', text)
      throw new Error(`Cloudinary upload failed: ${resp.status} ${text}`)
    }
    
    const data = await resp.json()
    console.log('✅ Cloudinary success:', data)
    
    // Apply transformation to the URL for consistent sizing
    const baseUrl = data.secure_url || data.url
    // Insert transformation parameters before the version number
    const transformedUrl = baseUrl.replace('/upload/', '/upload/c_fill,w_800,h_600,g_auto/')
    
    return transformedUrl
  } catch (error) {
    console.error('❌ Upload error:', error)
    throw error
  }
}

export async function saveImagesToFirestore(images) {
  if (!Array.isArray(images) || images.length === 0) {
    console.error('❌ Invalid images array')
    throw new Error('Invalid images array')
  }

  // Validate all images before saving
  const validImages = images.every(validateImage)
  if (!validImages) {
    console.error('❌ One or more images are invalid')
    throw new Error('One or more images are invalid')
  }

  try {
    const ref = doc(db, IMAGES_COLLECTION, IMAGE_DOC_ID)
    await setDoc(ref, { images })
    console.log('✅ Saved images to Firestore successfully!')
    return true
  } catch (error) {
    console.error('❌ Error saving images:', error)
    throw new Error('Failed to save images to database')
  }
}

export async function loadImagesFromFirestore() {
  try {
    const ref = doc(db, IMAGES_COLLECTION, IMAGE_DOC_ID)
    const snap = await getDoc(ref)
    
    if (snap.exists()) {
      const loadedImages = snap.data().images
      
      // Validate loaded data
      if (Array.isArray(loadedImages) && loadedImages.length > 0 && 
          loadedImages.every(validateImage)) {
        console.log('✅ Loaded images from Firestore')
        return loadedImages
      }
    }
    
    // Return default images if no valid data found
    console.log('ℹ️ No valid images found, using defaults')
    return DEFAULT_IMAGES
  } catch (error) {
    console.error('❌ Error loading images:', error)
    return DEFAULT_IMAGES // Return default images on error
  }
}