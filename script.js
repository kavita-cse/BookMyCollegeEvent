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
            // Fetch single event (fallback to UUID if using old links)
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
            const matchCol = isUUID ? 'id' : 'event_id';
            const { data: currentEvent, error } = await supabase
                .from('events')
                .select('*')
                .eq(matchCol, eventId)
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
                        carouselContainer.innerHTML = `<div class="banner-wrapper"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='700' fill='%23e2e8f0'%3E%3Crect width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Inter,sans-serif' font-size='24'%3ENo Image%3C/text%3E%3C/svg%3E" alt="No image available" class="detail-banner"></div>`;
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

                // Share Event Logic
                const shareBtn = document.getElementById('shareEventBtn');
                if (shareBtn) {
                    shareBtn.addEventListener('click', () => {
                        const urlId = currentEvent.event_id || currentEvent.id;
                        let baseUrl = window.location.origin + window.location.pathname;
                        const shareUrl = `${baseUrl}?id=${urlId}`;
                        const whatsappUrl = `https://api.whatsapp.com/send?text=Check out this event: ${encodeURIComponent(shareUrl)}`;
                        
                        navigator.clipboard.writeText(shareUrl).then(() => {
                            const originalHTML = shareBtn.innerHTML;
                            shareBtn.innerHTML = "<i class='bx bx-check'></i> Copied!";
                            setTimeout(() => shareBtn.innerHTML = originalHTML, 2000);
                        });

                        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                            window.open(whatsappUrl, '_blank');
                        }
                    });
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
            eventGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <p style="color: var(--text-color); font-size: 1.1rem;">No events found</p>
                </div>
            `;
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
                : [(event.thumbnail_url || event.image_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' fill='%23e2e8f0'%3E%3Crect width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Inter,sans-serif' font-size='20'%3ENo Image%3C/text%3E%3C/svg%3E")];

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

            const urlId = event.event_id || event.id;
            const card = document.createElement("a"); 
            card.href = `event-details.html?id=${urlId}`;
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
                    <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center;">
                        <span><i class='bx bx-calendar'></i> ${formattedDate}</span>
                        <button class="card-share-btn" data-url="${window.location.origin}${window.location.pathname.replace('index.html', '')}/event-details.html?id=${urlId}" style="background: var(--bg-color, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--primary); transition: 0.3s;" title="Copy Link"><i class='bx bx-copy'></i></button>
                    </div>
                </div>
            `;
            eventGrid.appendChild(card);

            // Copy Link Card Logic
            const shareCardBtn = card.querySelector('.card-share-btn');
            if (shareCardBtn) {
                shareCardBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const shareUrl = e.currentTarget.getAttribute('data-url').replace(/([^:]\/)\/+/g, "$1"); // Cleanup double slashes
                    
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        e.currentTarget.innerHTML = "<i class='bx bx-check'></i>";
                        setTimeout(() => e.currentTarget.innerHTML = "<i class='bx bx-copy'></i>", 2000);
                    });
                });
            }

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

    // Search logic — dynamic toggle & debounce
    if (searchInput) {
        const heroSection = document.querySelector(".hero");

        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                if (searchInput.value.trim() !== "") {
                    heroSection.classList.add("search-active");
                }
            }
        });

        let debounceTimer;
        searchInput.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchQuery = searchInput.value;
                const isSearching = searchQuery.trim() !== "";

                if (!isSearching && heroSection) {
                    heroSection.classList.remove("search-active");
                }

                // DOM Elements
                const recSec = document.getElementById("recommended-section");
                const searchSec = document.getElementById("search-results");
                const searchSub = document.getElementById("search-subtext");
                const exploreBtn = document.getElementById("explore-btn");
                const categoryFilters = document.getElementById("category-filters");

                if (isSearching) {
                    if (recSec) recSec.style.display = "none";
                    if (exploreBtn) exploreBtn.style.display = "none";
                    if (categoryFilters) categoryFilters.style.display = "none";
                    
                    if (searchSec) searchSec.style.display = "block";
                    if (searchSub) searchSub.textContent = `You searched for: "${searchQuery.trim()}"`;
                } else {
                    if (exploreBtn) exploreBtn.style.display = "";
                    if (categoryFilters) categoryFilters.style.display = "";
                    if (recSec) recSec.style.display = "block";
                    
                    if (searchSec) searchSec.style.display = "none";
                }
                
                renderEvents();
            }, 300);
        });
    }

});
