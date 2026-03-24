import { compressImage } from './imageUtils.js';

export function setupManageEvents(supabase) {
    const eventsList = document.getElementById('eventsList');
    const manageLoader = document.getElementById('manageLoader');
    const refreshBtn = document.getElementById('refreshEventsBtn');
    
    // Edit Modal Elements
    const editModal = document.getElementById('editEventModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const editForm = document.getElementById('editEventForm');
    const editSubmitBtn = document.getElementById('submitEditEventBtn');
    const editSpinner = document.getElementById('editEventSpinner');
    const editMsg = document.getElementById('editEventMessage');
    
    // Fetch and Display Events
    async function loadEvents() {
        manageLoader.style.display = 'block';
        eventsList.innerHTML = '';
        
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            manageLoader.style.display = 'none';
            
            if (!data || data.length === 0) {
                eventsList.innerHTML = `
                    <div class="empty-state">
                        <i class='bx bx-folder-open'></i>
                        <h3>No events found</h3>
                        <p>You haven't added any events yet.</p>
                    </div>
                `;
                return;
            }
            
            data.forEach(event => {
                let displayDate = 'TBA';
                if (event.date_time) {
                    const s = new Date(event.date_time);
                    if (!isNaN(s.getTime())) {
                        const sDate = s.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const sTime = s.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
                        
                        if (event.end_date_time) {
                            const e = new Date(event.end_date_time);
                            if (!isNaN(e.getTime())) {
                                const eDate = e.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                const eTime = e.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
                                if (s.toDateString() === e.toDateString()) {
                                    displayDate = `${sDate} • ${sTime} – ${eTime}`;
                                } else {
                                    displayDate = `${sDate} ${sTime} – ${eDate} ${eTime}`;
                                }
                            } else {
                                displayDate = `${sDate} • ${sTime}`;
                            }
                        } else {
                            displayDate = `${sDate} • ${sTime}`;
                        }
                    }
                }
                
                const imgSrc = event.thumbnail_url || event.image_url || 'https://via.placeholder.com/150';
                
                const item = document.createElement('div');
                item.className = 'event-list-item';
                item.innerHTML = `
                    <img src="${imgSrc}" alt="Event" class="event-list-img">
                    <div class="event-list-info">
                        <h3>${event.title}</h3>
                        <p><i class='bx bxs-institution'></i> ${event.college_name} &nbsp;|&nbsp; <i class='bx bx-calendar'></i> ${displayDate}</p>
                    </div>
                    <div class="event-list-actions">
                        <button class="action-btn edit-btn" data-id="${event.id}">
                            <i class='bx bx-edit-alt'></i> Edit
                        </button>
                        <button class="action-btn delete-btn" data-id="${event.id}">
                            <i class='bx bx-trash'></i> Delete
                        </button>
                    </div>
                `;
                eventsList.appendChild(item);
            });
            
            attachActionListeners(data);
            
        } catch (err) {
            manageLoader.style.display = 'none';
            eventsList.innerHTML = `
                <div class="empty-state" style="color: var(--danger);">
                    <i class='bx bx-error-circle'></i>
                    <h3>Error loading events</h3>
                    <p>${err.message}</p>
                </div>
            `;
        }
    }
    
    function attachActionListeners(eventsData) {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const event = eventsData.find(ev => ev.id == id);
                if (event) openEditModal(event);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                    await deleteEvent(id);
                }
            });
        });
    }
    
    async function deleteEvent(id) {
        try {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
            loadEvents();
        } catch (error) {
            alert('Failed to delete event: ' + error.message);
        }
    }
    
    refreshBtn.addEventListener('click', loadEvents);
    
    // EDIT LOGIC
    function openEditModal(event) {
        document.getElementById('edit_id').value = event.id;
        document.getElementById('edit_title').value = event.title;
        document.getElementById('edit_college_name').value = event.college_name;
        document.getElementById('edit_category').value = event.category;
        document.getElementById('edit_venue').value = event.venue;
        
        try {
            const d = new Date(event.date_time);
            if (!isNaN(d.getTime())) {
                const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                document.getElementById('edit_date_time').value = local;
            }
        } catch(e) {
            document.getElementById('edit_date_time').value = "";
        }

        try {
            if (event.end_date_time) {
                const ed = new Date(event.end_date_time);
                if (!isNaN(ed.getTime())) {
                    const localEnd = new Date(ed.getTime() - (ed.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                    document.getElementById('edit_end_date_time').value = localEnd;
                } else {
                    document.getElementById('edit_end_date_time').value = "";
                }
            } else {
                document.getElementById('edit_end_date_time').value = "";
            }
        } catch(e) {
            document.getElementById('edit_end_date_time').value = "";
        }
        
        document.getElementById('edit_description').value = event.description;
        const editKeywords = document.getElementById('edit_keywords');
        if (editKeywords) editKeywords.value = event.keywords || '';
        const editEventLink = document.getElementById('edit_event_link');
        if (editEventLink) editEventLink.value = event.event_link || '';
        document.getElementById('edit_current_image').src = event.thumbnail_url || event.image_url || '';
        document.getElementById('edit_image').value = ''; 
        
        editMsg.style.display = 'none';
        editModal.classList.add('active');
        document.body.style.overflow = "hidden";
    }
    
    function closeEdit() {
        editModal.classList.remove('active');
        document.body.style.overflow = "";
    }
    
    closeEditModal.addEventListener('click', closeEdit);
    editModal.addEventListener('click', (e) => {
        if(e.target === editModal) closeEdit();
    });
    
    function showEditMessage(type, text) {
        editMsg.className = `message ${type}`;
        editMsg.textContent = text;
        editMsg.style.display = 'block';
    }
    
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit_id').value;
        const title = document.getElementById('edit_title').value.trim();
        const college_name = document.getElementById('edit_college_name').value.trim();
        const category = document.getElementById('edit_category').value;
        const venue = document.getElementById('edit_venue').value.trim();
        const date_time = document.getElementById('edit_date_time').value;
        const end_date_time = document.getElementById('edit_end_date_time').value;
        const description = document.getElementById('edit_description').value.trim();
        const keywords = document.getElementById('edit_keywords').value.trim() || null;
        const imageFiles = document.getElementById('edit_image').files;
        
        if (!date_time || !end_date_time) {
            showEditMessage('error', 'Both Start and End dates are required.');
            return;
        }
        
        const startObj = new Date(date_time);
        const endObj = new Date(end_date_time);
        if (endObj <= startObj) {
            showEditMessage('error', 'End date/time must be after the start date/time.');
            return;
        }
        
        editSubmitBtn.disabled = true;
        editSpinner.classList.remove('hidden');
        showEditMessage('success', 'Updating event...');
        
        try {
            const isoDateTime = new Date(date_time).toISOString();
            const isoEndDateTime = new Date(end_date_time).toISOString();
            const updates = {
                title,
                college_name,
                category,
                venue,
                date_time: isoDateTime,
                end_date_time: isoEndDateTime,
                description,
                keywords,
                event_link: document.getElementById('edit_event_link')?.value.trim() || null
            };
            
            if (imageFiles && imageFiles.length > 0) {
                // Validate all
                for (let i = 0; i < imageFiles.length; i++) {
                    if (!imageFiles[i].type.startsWith('image/')) throw new Error("All files must be images.");
                    if (imageFiles[i].size > 10 * 1024 * 1024) throw new Error("Each image < 10MB required.");
                }
                
                showEditMessage('success', 'Compressing & uploading new images...');
                
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
                    if (uploadOrigErr) throw new Error("Failed to upload new original image.");

                    const { error: uploadCompErr } = await supabase.storage.from('event-images').upload(compressedPath, compressedFile);
                    if (uploadCompErr) throw new Error("Failed to upload new thumbnail.");

                    const origUrl = supabase.storage.from('event-images').getPublicUrl(originalPath).data.publicUrl;
                    const compUrl = supabase.storage.from('event-images').getPublicUrl(compressedPath).data.publicUrl;
                    
                    imageUrls.push(origUrl);
                    thumbnailUrls.push(compUrl);
                }

                updates.image_url = imageUrls[0];
                updates.thumbnail_url = thumbnailUrls[0];
                updates.image_urls = imageUrls;
                updates.thumbnail_urls = thumbnailUrls;
            }
            
            const { error: updateError } = await supabase.from('events').update(updates).eq('id', id);
            if (updateError) throw updateError;
            
            showEditMessage('success', 'Event updated successfully!');
            setTimeout(() => {
                closeEdit();
                loadEvents();
            }, 1000);
            
        } catch(error) {
            showEditMessage('error', error.message || 'Update failed.');
        } finally {
            editSubmitBtn.disabled = false;
            editSpinner.classList.add('hidden');
        }
    });

    // UX Preview
    document.getElementById('edit_image').addEventListener('change', (e) => {
        const files = e.target.files;
        
        // Remove existing previews
        document.querySelectorAll('.edit-multi-preview').forEach(el => el.remove());
        
        if (files && files.length > 0) {
            document.getElementById('edit_current_image').style.display = 'none';

            const previewContainer = document.createElement('div');
            previewContainer.className = 'edit-multi-preview';
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
        } else {
            document.getElementById('edit_current_image').style.display = 'block';
        }
    });
}
