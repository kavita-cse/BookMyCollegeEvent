export async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Target max width 800px for the thumbnail
                const maxWidth = 800;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress down to webp at 65% quality
                canvas.toBlob((blob) => {
                    if (blob) {
                        const filename = file.name.replace(/\.[^/.]+$/, "") + "_thumb.webp";
                        const compressedFile = new File([blob], filename, {
                            type: 'image/webp',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error('Canvas compression failed.'));
                    }
                }, 'image/webp', 0.65);
            };
            img.onerror = (err) => reject(new Error('Failed to load image for compression'));
        };
        reader.onerror = (err) => reject(new Error('Failed to read file'));
    });
}
