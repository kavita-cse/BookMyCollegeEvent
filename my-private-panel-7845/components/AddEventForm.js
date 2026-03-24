import { compressImage } from './imageUtils.js';

export function setupAddEventForm(supabase) {
    const form = document.getElementById('addEventForm');
    const submitBtn = document.getElementById('submitAddEventBtn');
    const spinner = document.getElementById('addEventSpinner');
    const msgDiv = document.getElementById('addEventMessage');

    function showMessage(type, text) {
        msgDiv.className = `message ${type}`;
        msgDiv.textContent = text;
        msgDiv.style.display = 'block';
        setTimeout(() => {
            msgDiv.style.display = 'none';
        }, 5000);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Frontend Validation
        const title = document.getElementById('title').value.trim();
        const college_name = document.getElementById('college_name').value.trim();
        const category = document.getElementById('category').value;
        const venue = document.getElementById('venue').value.trim();
        const date_time = document.getElementById('date_time').value; // ISO format local
        const end_date_time = document.getElementById('end_date_time').value; // ISO format local
        const description = document.getElementById('description').value.trim();
        const keywords = document.getElementById('keywords').value.trim() || null;
        const event_link = document.getElementById('event_link').value.trim() || null;
        const imageFiles = document.getElementById('image').files;

        if (!title || !college_name || !category || !venue || !date_time || !end_date_time || !description || imageFiles.length === 0) {
            showMessage('error', 'All fields are required.');
            return;
        }

        const startObj = new Date(date_time);
        const endObj = new Date(end_date_time);
        if (endObj <= startObj) {
            showMessage('error', 'End date/time must be after the start date/time.');
            return;
        }

        if (title.length < 3) {
            showMessage('error', 'Title must be at least 3 characters long.');
            return;
        }

        for (let i = 0; i < imageFiles.length; i++) {
            if (!imageFiles[i].type.startsWith('image/')) {
                showMessage('error', 'All uploaded files must be images.');
                return;
            }
            if (imageFiles[i].size > 10 * 1024 * 1024) {
                showMessage('error', 'Each image size must be less than 10MB.');
                return;
            }
        }

        // Disable button & show spinner
        submitBtn.disabled = true;
        spinner.classList.remove('hidden');
        showMessage('success', 'Compressing image...');

        try {
            showMessage('success', 'Compressing & uploading images (this may take a moment)...');
            const imageUrls = [];
            const thumbnailUrls = [];

            for (let i = 0; i < imageFiles.length; i++) {
                const img = imageFiles[i];
                const compressedFile = await compressImage(img);

                const timestamp = new Date().getTime();
                const cleanName = img.name.replace(/[^a-zA-Z0-9.]/g, '_');
                
                const originalPath = `events/${timestamp}-${i}-${cleanName}`;
                const compressedPath = `thumbnails/${timestamp}-${i}-thumb_${cleanName}.webp`;

                const { error: uploadOrigErr } = await supabase.storage.from('event-images').upload(originalPath, img);
                if (uploadOrigErr) throw new Error("Failed to upload original image: " + uploadOrigErr.message);

                const { error: uploadCompErr } = await supabase.storage.from('event-images').upload(compressedPath, compressedFile);
                if (uploadCompErr) throw new Error("Failed to upload thumbnail: " + uploadCompErr.message);

                const origUrlData = supabase.storage.from('event-images').getPublicUrl(originalPath).data.publicUrl;
                const compUrlData = supabase.storage.from('event-images').getPublicUrl(compressedPath).data.publicUrl;
                
                imageUrls.push(origUrlData);
                thumbnailUrls.push(compUrlData);
            }

            // Save Event to Database
            showMessage('success', 'Saving event...');
            const isoDateTime = new Date(date_time).toISOString();
            const isoEndDateTime = new Date(end_date_time).toISOString();

            const { error: insertError } = await supabase
                .from('events')
                .insert([
                    {
                        title,
                        college_name,
                        category,
                        venue,
                        date_time: isoDateTime,
                        end_date_time: isoEndDateTime,
                        description,
                        keywords,
                        event_link,
                        image_url: imageUrls[0],
                        thumbnail_url: thumbnailUrls[0],
                        image_urls: imageUrls,
                        thumbnail_urls: thumbnailUrls
                    }
                ]);

            if (insertError) {
                console.error(insertError);
                throw new Error("Failed to save event in database.");
            }

            // Success
            showMessage('success', 'Event successfully added!');
            form.reset();
            const preview = document.getElementById('add_image_preview');
            if (preview) preview.remove();

        } catch (error) {
            showMessage('error', error.message || 'An unexpected error occurred.');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('hidden');
        }
    });

    // UX Preview: Support multiple images preview
    document.getElementById('image').addEventListener('change', (e) => {
        const files = e.target.files;
        
        // Remove existing previews
        document.querySelectorAll('.multi-image-preview').forEach(el => el.remove());
        
        if (files && files.length > 0) {
            const previewContainer = document.createElement('div');
            previewContainer.className = 'multi-image-preview';
            previewContainer.style.display = 'flex';
            previewContainer.style.gap = '10px';
            previewContainer.style.marginTop = '10px';
            previewContainer.style.flexWrap = 'wrap';
            
            e.target.parentElement.appendChild(previewContainer);

            for(let i=0; i<files.length; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.style.maxWidth = '100px';
                    img.style.maxHeight = '100px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    
                    const reader = new FileReader();
                    reader.onload = (ev) => img.src = ev.target.result;
                    reader.readAsDataURL(file);
                    
                    previewContainer.appendChild(img);
                }
            }
        }
    });
}
