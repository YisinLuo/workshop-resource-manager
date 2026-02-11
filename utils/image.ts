
/**
 * Compresses an image file to target a specific size range (100KB - 300KB).
 * Logic: Resizes the image and iterates quality to find the sweet spot.
 */
export const compressImage = async (file: File): Promise<{ base64: string; name: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Initial downscale if very large (max 1600px)
        const MAX_SIZE = 1600;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Iterative compression to find target range
        let quality = 0.8;
        const attemptCompression = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob failed'));
                return;
              }

              const sizeKB = blob.size / 1024;

              // Target: 100KB - 300KB
              // If too large and quality can be reduced
              if (sizeKB > 300 && q > 0.1) {
                attemptCompression(q - 0.1);
              }
              // If too small and quality can be increased (optional, but 100KB is usually fine)
              else if (sizeKB < 100 && q < 0.95) {
                attemptCompression(q + 0.05);
              }
              else {
                // Convert Blob to Base64 for GAS
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                  const base64data = reader.result as string;
                  // Remove the "data:image/jpeg;base64," part if needed, but GAS might handle it or we strip it there. 
                  // Let's strip it here to be safe and just send the raw base64 string, 
                  // or keep it if our backend expects it. 
                  // Looking at backend code: Utilities.base64Decode(imgData.base64)
                  // It expects raw base64 usually, so let's strip the prefix.
                  const base64Content = base64data.split(',')[1];

                  resolve({
                    base64: base64Content,
                    name: file.name
                  });
                };
              }
            },
            'image/jpeg',
            q
          );
        };

        attemptCompression(quality);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};
