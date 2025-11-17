/**
 * Image compression utility
 * 
 * Provides functionality to compress image files to reduce file size
 * while maintaining acceptable quality. Uses Canvas API for resizing
 * and compression with binary search algorithm for optimal quality.
 */

/**
 * Compresses an image file to approximately 100KB or less
 * 
 * This function uses the Canvas API to resize and compress images.
 * It follows this process:
 * 1. If the file is already small enough, returns it as-is
 * 2. Resizes the image to a maximum dimension of 1200px (maintains aspect ratio)
 * 3. Uses binary search to find the optimal JPEG quality that meets the target size
 * 4. Converts the image to JPEG format for better compression
 * 
 * @param file - The original image file to compress
 * @param targetSizeKB - Target file size in KB (default: 100)
 * @returns Promise that resolves to a compressed File object
 * @throws Error if image loading or compression fails
 */
export async function compressImage(
  file: File,
  targetSizeKB: number = 100
): Promise<File> {
  return new Promise((resolve, reject) => {
    // If file is already small enough, return as-is
    if (file.size <= targetSizeKB * 1024) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Calculate new dimensions (max width/height of 1200px to maintain quality while reducing size)
        const maxDimension = 1200
        let width = img.width
        let height = img.height

        // Resize if image is larger than max dimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            // Landscape orientation: set width to max, scale height proportionally
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            // Portrait or square orientation: set height to max, scale width proportionally
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Binary search for optimal quality to reach target size
        // Start with high quality and adjust based on resulting file size
        let quality = 0.9 // Start with 90% quality
        let minQuality = 0.1
        let maxQuality = 1.0

        const compress = (): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"))
                return
              }

              const sizeKB = blob.size / 1024

              // If we're within 5KB of target or quality is too low, accept this result
              if (sizeKB <= targetSizeKB + 5 || quality <= minQuality + 0.05) {
                // Create a new File object with the compressed blob
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg", // Always convert to JPEG for better compression
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
                return
              }

              // Adjust quality based on current size using binary search
              if (sizeKB > targetSizeKB) {
                // Too large, reduce quality (move towards lower bound)
                maxQuality = quality
                quality = (quality + minQuality) / 2
              } else {
                // Could be smaller, try higher quality (move towards upper bound)
                minQuality = quality
                quality = (quality + maxQuality) / 2
              }

              // Recursively try again with adjusted quality
              compress()
            },
            "image/jpeg", // Always use JPEG for better compression
            quality
          )
        }

        // Start compression process
        compress()
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

