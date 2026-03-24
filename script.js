document.addEventListener("DOMContentLoaded", async () => {
    
    // Initialize Supabase
    const supabaseUrl = 'https://cbqbqncbjxfwrhhgxmjk.supabase.co';
    const supabaseKey = 'sb_publishable_XEBmcn5vcJGWBDO3GH9GRw_f55J9d9_';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    function formatEventRange(startIso, endIso, includeYear = true) {
        if (!startIso) return 'TBA';
        const s = new Date(startIso);
        if (isNaN(s.getTime())) return 'TBA';
        
        const startDateOpts = { month: 'short', day: 'numeric' };
        if (includeYear) startDateOpts.year = 'numeric';
        
        const timeOpts = { hour: 'numeric', minute: '2-digit' };
        
        const sDateStr = s.toLocaleString('en-US', startDateOpts);
        const sTimeStr = s.toLocaleString('en-US', timeOpts);

        if (!endIso) return `${sDateStr} • ${sTimeStr}`;
        
        const e = new Date(endIso);
        if (isNaN(e.getTime())) return `${sDateStr} • ${sTimeStr}`;
        
        const isSameDay = s.toDateString() === e.toDateString();
        const eDateStr = e.toLocaleString('en-US', startDateOpts);
        const eTimeStr = e.toLocaleString('en-US', timeOpts);
        
        if (isSameDay) {
            return `${sDateStr} • ${sTimeStr} – ${eTimeStr}`;
        } else {
            return `${sDateStr} ${sTimeStr} – ${eDateStr} ${eTimeStr}`;
        }
    }

    // --- DETAILS PAGE LOGIC ---
    if (window.location.pathname.includes("event-details")) {
        // Extract ID from URL
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get("id"); // UUID string
        
        if (eventId) {
            // Fetch single event
            const { data: currentEvent, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            
            if (currentEvent && !error) {
                // Formatting Date
                let formattedDate = formatEventRange(currentEvent.date_time, currentEvent.end_date_time, true);

                // Image or Carousel rendering
                const carouselContainer = document.getElementById("carouselContainer");
                const images = currentEvent.image_urls || [];
                // Fallback to legacy single image if array is empty
                if (images.length === 0 && currentEvent.image_url) images.push(currentEvent.image_url);

                if (carouselContainer) {
                    if (images.length > 1) {
                        // Build Carousel
                        let slidesHTML = '';
                        let dotsHTML = '';
                        images.forEach((url, idx) => {
                            slidesHTML += `<div class="carousel-slide"><img src="${url}" alt="${currentEvent.title} Image ${idx+1}" class="detail-banner lightbox-trigger" loading="lazy"></div>`;
                            dotsHTML += `<div class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`;
                        });

                        carouselContainer.innerHTML = `
                            <div class="carousel-wrapper" id="carouselWrapper">
                                <div class="carousel-track" id="carouselTrack">${slidesHTML}</div>
                                <button class="carousel-btn prev" id="carouselPrev"><i class='bx bx-chevron-left'></i></button>
                                <button class="carousel-btn next" id="carouselNext"><i class='bx bx-chevron-right'></i></button>
                            </div>
                            <div class="carousel-indicators" id="carouselDots">${dotsHTML}</div>
                        `;

                        // Carousel Logic
                        let currentSlide = 0;
                        const track = document.getElementById('carouselTrack');
                        const dots = document.querySelectorAll('.carousel-dot');
                        const updateCarousel = () => {
                            track.style.transform = `translateX(-${currentSlide * 100}%)`;
                            dots.forEach(d => d.classList.remove('active'));
                            dots[currentSlide].classList.add('active');
                        };

                        document.getElementById('carouselPrev').addEventListener('click', () => {
                            currentSlide = (currentSlide > 0) ? currentSlide - 1 : images.length - 1;
                            updateCarousel();
                        });

                        document.getElementById('carouselNext').addEventListener('click', () => {
                            currentSlide = (currentSlide < images.length - 1) ? currentSlide + 1 : 0;
                            updateCarousel();
                        });

                        dots.forEach(dot => {
                            dot.addEventListener('click', (e) => {
                                currentSlide = parseInt(e.target.dataset.index);
                                updateCarousel();
                            });
                        });

                        // Swipe Support
                        let touchStartX = 0;
                        let touchEndX = 0;
                        const wrapper = document.getElementById('carouselWrapper');
                        wrapper.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
                        wrapper.addEventListener('touchend', e => {
                            touchEndX = e.changedTouches[0].screenX;
                            if (touchEndX < touchStartX - 50) document.getElementById('carouselNext').click();
                            if (touchEndX > touchStartX + 50) document.getElementById('carouselPrev').click();
                        }, {passive: true});
                        
                    } else if (images.length === 1) {
                        carouselContainer.innerHTML = `<div class="banner-wrapper"><img src="${images[0]}" alt="${currentEvent.title}" class="detail-banner lightbox-trigger" loading="lazy"></div>`;
                    } else {
                        carouselContainer.innerHTML = `<div class="banner-wrapper"><img src="https://via.placeholder.com/1600x700?text=No+Image" alt="No image available" class="detail-banner"></div>`;
                    }
                }
                document.getElementById("detailTitle").textContent = currentEvent.title;
                document.getElementById("detailVenue").textContent = `${currentEvent.college_name} • ${currentEvent.venue || 'TBA'}`;
                document.getElementById("detailDate").textContent = formattedDate;

                // Format description to make links clickable and prevent XSS
                const formatDescription = (text) => {
                    if (!text) return "";
                    const div = document.createElement('div');
                    div.textContent = text;
                    const escaped = div.innerHTML;
                    
                    // Replace URLs with anchor tags
                    const urlRegex = /(https?:\/\/[^\s<]+)/g;
                    // Also replace line breaks with <br> to retain formatting from textarea
                    return escaped.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline; font-weight: 500;">${url}</a>`).replace(/\n/g, '<br>');
                };
                
                document.getElementById("detailDesc").innerHTML = formatDescription(currentEvent.description);
                document.title = `${currentEvent.title} | BookMyCollegeEvent`;

                // Registration Link logic
                if (currentEvent.event_link) {
                    const regContainer = document.getElementById("registerContainer");
                    const regBtn = document.getElementById("detailRegisterBtn");
                    if (regContainer && regBtn) {
                        regBtn.href = currentEvent.event_link;
                        regContainer.style.display = "block";
                    }
                }

                // Lightbox logic
                const lightboxModal = document.getElementById("lightboxModal");
                const lightboxImg = document.getElementById("lightboxImage");
                if (lightboxModal && lightboxImg) {
                    
                    document.body.addEventListener('click', (e) => {
                        if (e.target.classList.contains('lightbox-trigger') || e.target.id === 'detailImage') {
                            lightboxImg.src = e.target.src;
                            lightboxModal.classList.add("active");
                            document.body.style.overflow = "hidden";
                        }
                    });

                    document.getElementById("closeLightbox").addEventListener("click", () => {
                        lightboxModal.classList.remove("active");
                        document.body.style.overflow = "";
                    });

                    lightboxModal.addEventListener("click", (e) => {
                        if (e.target === lightboxModal) {
                            lightboxModal.classList.remove("active");
                            document.body.style.overflow = "";
                        }
                    });

                    document.addEventListener("keydown", (e) => {
                        if (e.key === "Escape" && lightboxModal.classList.contains("active")) {
                            lightboxModal.classList.remove("active");
                            document.body.style.overflow = "";
                        }
                    });
                }
            } else {
                showErrorDetails();
            }
        } else {
            showErrorDetails();
        }

        function showErrorDetails() {
            document.getElementById("detailTitle").textContent = "Event Not Found";
            document.getElementById("detailDesc").textContent = "Sorry, we could not find the details for this event or it was deleted.";
            document.getElementById("detailVenue").textContent = "Unknown Venue";
            document.getElementById("detailDate").textContent = "Unknown Date";
        }

        return; // Stop execution here for details page
    }


    // --- INDEX PAGE LOGIC ---
    const eventGrid = document.getElementById("eventGrid");
    const filterBtns = document.querySelectorAll(".cat-btn");
    const searchInput = document.querySelector(".search-bar input");

    // Track current state so search + category work together
    let activeCategory = "All";
    let searchQuery = "";

    // Fetch all events initially
    const { data: dbEvents, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
    
    // Debug logging
    console.log('[BMCE] Fetch result:', { dbEvents, error });

    let events = dbEvents || [];

    function renderEvents() {
        if (!eventGrid) return; 
        
        eventGrid.innerHTML = "";

        const query = searchQuery.toLowerCase().trim();
        
        // Apply category filter
        let filtered = activeCategory === "All"
            ? events
            : events.filter(e => e.category === activeCategory);

        // Apply search filter on top of category
        if (query) {
            filtered = filtered.filter(e =>
                (e.title || "").toLowerCase().includes(query) ||
                (e.category || "").toLowerCase().includes(query) ||
                (e.college_name || "").toLowerCase().includes(query) ||
                (e.description || "").toLowerCase().includes(query) ||
                String(e.keywords || "").toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            eventGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 40px;'>No events found.</p>";
            return;
        }

        filtered.forEach(event => {
            let formattedDate = formatEventRange(event.date_time, event.end_date_time, false);

            // View count via localStorage
            const viewKey = `bmce_views_${event.id}`;
            let views = parseInt(localStorage.getItem(viewKey) || '0');
            // Simulate realistic view counts: increment once per session stored per event
            if (!sessionStorage.getItem(viewKey)) {
                views += 1;
                localStorage.setItem(viewKey, views);
                sessionStorage.setItem(viewKey, '1');
            }

            // Build image section: scrollable strip or single image
            const allImages = (event.thumbnail_urls && event.thumbnail_urls.length > 0)
                ? event.thumbnail_urls
                : [(event.thumbnail_url || event.image_url || 'https://via.placeholder.com/800x600?text=No+Image')];

            let imageHTML = '';
            let dotsHTML = '';

            if (allImages.length > 1) {
                // Build horizontal scroll strip
                let slides = allImages.map((url, i) =>
                    `<div class="scroll-slide"><img src="${url}" alt="${event.title} ${i+1}" loading="lazy" /></div>`
                ).join('');
                let dots = allImages.map((_, i) =>
                    `<span class="dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`
                ).join('');
                imageHTML = `<div class="card-img-scroll" data-card-scroll>${slides}</div>`;
                dotsHTML = `<div class="card-scroll-dots">${dots}</div>`;
            } else {
                imageHTML = `<img src="${allImages[0]}" alt="${event.title}" class="card-img" loading="lazy" />`;
            }

            // Resolve display category: never show "Others"
            const rawCat = (event.category || '').trim();
            const displayCategory = (!rawCat || rawCat.toLowerCase() === 'others') ? 'General' : rawCat;

            const card = document.createElement("a"); 
            card.href = `event-details.html?id=${event.id}`;
            card.className = "event-card";
            card.innerHTML = `
                <div class="card-img-wrapper">
                    ${imageHTML}
                    <span class="card-badge">${displayCategory}</span>
                    ${dotsHTML}
                    <span class="card-views">👁 ${views} views</span>
                </div>
                <div class="card-content">
                    <span class="card-category">${displayCategory}</span>
                    <h3 class="card-title">${event.title}</h3>
                    <div class="card-college">
                        <i class='bx bxs-institution'></i> ${event.college_name}
                    </div>
                    <div class="card-footer">
                        <i class='bx bx-calendar'></i> ${formattedDate}
                    </div>
                </div>
            `;
            eventGrid.appendChild(card);

            // Activate scroll-dot sync for this card
            const scrollEl = card.querySelector('[data-card-scroll]');
            if (scrollEl) {
                const cardDots = card.querySelectorAll('.card-scroll-dots .dot');
                scrollEl.addEventListener('scroll', () => {
                    const slideWidth = scrollEl.clientWidth;
                    const idx = Math.round(scrollEl.scrollLeft / slideWidth);
                    cardDots.forEach((d, i) => d.classList.toggle('active', i === idx));
                });
                // Prevent card navigation when user is scrolling images
                scrollEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            }
        });
    }

    // Initial render
    if (eventGrid) renderEvents();

    // Category filter logic
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                activeCategory = btn.textContent.trim();
                renderEvents();
            });
        });
    }

    // Search logic — uses existing search bar, no HTML changes
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            searchQuery = searchInput.value;
            renderEvents();
        });
    }

});
