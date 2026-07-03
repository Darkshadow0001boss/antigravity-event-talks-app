document.addEventListener('DOMContentLoaded', () => {
    // App State
    let allNotes = [];
    let filteredNotes = [];
    let currentCategory = 'all';
    let currentSearch = '';
    let currentSort = 'newest';
    let selectedNote = null;

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const spinnerIcon = refreshBtn.querySelector('.spinner-icon');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('status-text');
    const notesContainer = document.getElementById('notes-container');
    const feedLoading = document.getElementById('feed-loading');
    const feedEmpty = document.getElementById('feed-empty');
    
    // Search & Filter DOM Elements
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const sortSelect = document.getElementById('sort-select');
    const categoryPills = document.querySelectorAll('.filter-pill');
    const statCards = document.querySelectorAll('.stat-card');
    
    // Stats DOM Elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statChanges = document.getElementById('stat-changes');
    const statDeprecations = document.getElementById('stat-deprecations');
    
    // Error & Warning Banners
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const errorRetryBtn = document.getElementById('error-retry-btn');
    const warningBanner = document.getElementById('warning-banner');
    const warningMessage = document.getElementById('warning-message');
    
    // Modal DOM Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalContextDate = document.getElementById('modal-context-date');
    const modalContextBadge = document.getElementById('modal-context-badge');
    const modalContextText = document.getElementById('modal-context-text');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const charCountEl = document.getElementById('char-count');
    const progressCircle = document.getElementById('progress-ring-circle');
    const tagHelperBtns = document.querySelectorAll('.tag-helper-btn');
    
    // Toast DOM
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Progress Ring settings
    const circleRadius = 9;
    const circleCircumference = 2 * Math.PI * circleRadius;
    progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    progressCircle.style.strokeDashoffset = circleCircumference;

    // Fetch Release Notes from API
    async function fetchReleaseNotes(forceRefresh = false) {
        setLoadingState(true);
        hideBanners();
        
        try {
            const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                allNotes = result.data;
                
                // Show warning banner if there was a fallback warning from backend
                if (result.warning) {
                    showWarning(result.warning);
                }
                
                updateStats();
                applyFiltersAndRender();
                setStatus('Up to date', 'success');
            } else {
                throw new Error(result.error || 'Unknown error occurred.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showError(error.message || 'Failed to connect to the server.');
            setStatus('Connection error', 'error');
            notesContainer.innerHTML = '';
            feedLoading.style.display = 'none';
        } finally {
            setLoadingState(false);
        }
    }

    // Set loading indicator states
    function setLoadingState(isLoading) {
        if (isLoading) {
            spinnerIcon.classList.add('spinning');
            refreshBtn.disabled = true;
            statusDot.className = 'status-dot loading';
            statusText.textContent = 'Updating...';
            feedLoading.style.display = 'flex';
            feedEmpty.style.display = 'none';
            notesContainer.style.opacity = '0.5';
        } else {
            spinnerIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
            notesContainer.style.opacity = '1';
            feedLoading.style.display = 'none';
        }
    }

    // Set status indicator text and state
    function setStatus(text, type) {
        statusText.textContent = text;
        statusDot.className = `status-dot ${type}`;
    }

    // Show banners
    function showError(msg) {
        errorMessage.textContent = msg;
        errorBanner.style.display = 'flex';
    }

    function showWarning(msg) {
        warningMessage.textContent = msg;
        warningBanner.style.display = 'flex';
    }

    function hideBanners() {
        errorBanner.style.display = 'none';
        warningBanner.style.display = 'none';
    }

    // Update the Dashboard Statistics
    function updateStats() {
        const counts = {
            total: allNotes.length,
            feature: 0,
            change: 0,
            deprecation: 0
        };
        
        allNotes.forEach(note => {
            const cat = note.category.toLowerCase();
            if (cat === 'feature') counts.feature++;
            else if (cat === 'change') counts.change++;
            else if (cat === 'deprecation') counts.deprecation++;
        });

        // Set text
        statTotal.textContent = counts.total;
        statFeatures.textContent = counts.feature;
        statChanges.textContent = counts.change;
        statDeprecations.textContent = counts.deprecation;
    }

    // Apply Search and Category Filters, Sort, and Render
    function applyFiltersAndRender() {
        // Filter by category
        if (currentCategory === 'all') {
            filteredNotes = [...allNotes];
        } else {
            filteredNotes = allNotes.filter(note => note.category.toLowerCase() === currentCategory.toLowerCase());
        }

        // Filter by search keyword
        if (currentSearch.trim() !== '') {
            const query = currentSearch.toLowerCase().trim();
            filteredNotes = filteredNotes.filter(note => {
                return (
                    note.date.toLowerCase().includes(query) ||
                    note.category.toLowerCase().includes(query) ||
                    note.body_text.toLowerCase().includes(query)
                );
            });
        }

        // Sort notes
        filteredNotes.sort((a, b) => {
            // Google feed is usually already sorted, but let's parse raw updated dates to be sure
            const dateA = new Date(a.updated_raw || a.date);
            const dateB = new Date(b.updated_raw || b.date);
            return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
        });

        renderNotes();
    }

    // Render notes cards
    function renderNotes() {
        notesContainer.innerHTML = '';
        
        if (filteredNotes.length === 0) {
            feedEmpty.style.display = 'flex';
            return;
        }
        
        feedEmpty.style.display = 'none';
        
        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            
            // Set badge CSS color variable
            const catLower = note.category.toLowerCase();
            let badgeClass = 'badge-general';
            let categoryColor = 'var(--color-general)';
            
            if (catLower === 'feature') {
                badgeClass = 'badge-feature';
                categoryColor = 'var(--color-feature)';
            } else if (catLower === 'change') {
                badgeClass = 'badge-change';
                categoryColor = 'var(--color-change)';
            } else if (catLower === 'deprecation') {
                badgeClass = 'badge-deprecation';
                categoryColor = 'var(--color-deprecation)';
            } else if (catLower === 'fix') {
                badgeClass = 'badge-fix';
                categoryColor = 'var(--color-fix)';
            } else if (catLower === 'general') {
                badgeClass = 'badge-general';
                categoryColor = 'var(--color-general)';
            }
            
            card.style.setProperty('--badge-color', categoryColor);
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="note-date"><i class="fa-regular fa-calendar-days"></i> ${note.date}</span>
                    <span class="badge ${badgeClass}">${note.category}</span>
                </div>
                <div class="note-body">
                    ${note.body_html}
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm btn-tweet tweet-action-btn" data-id="${note.id}">
                        <i class="fa-brands fa-x-twitter"></i>
                        <span>Tweet Update</span>
                    </button>
                </div>
            `;
            
            notesContainer.appendChild(card);
        });

        // Attach event listeners to Tweet buttons
        document.querySelectorAll('.tweet-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = btn.getAttribute('data-id');
                const note = allNotes.find(n => n.id === noteId);
                if (note) {
                    openTweetModal(note);
                }
            });
        });
    }

    // Modal Operations
    function openTweetModal(note) {
        selectedNote = note;
        
        // Show modal context
        modalContextDate.textContent = note.date;
        modalContextBadge.textContent = note.category;
        
        // Set badge class for context
        modalContextBadge.className = 'badge';
        const cat = note.category.toLowerCase();
        if (cat === 'feature') modalContextBadge.classList.add('badge-feature');
        else if (cat === 'change') modalContextBadge.classList.add('badge-change');
        else if (cat === 'deprecation') modalContextBadge.classList.add('badge-deprecation');
        else if (cat === 'fix') modalContextBadge.classList.add('badge-fix');
        else modalContextBadge.classList.add('badge-general');
        
        modalContextText.textContent = note.body_text;
        
        // Generate pre-populated tweet
        const tweetText = generateDefaultTweet(note);
        tweetTextarea.value = tweetText;
        
        updateCharCount();
        
        tweetModal.style.display = 'flex';
        tweetTextarea.focus();
        // Set cursor to start or select text
        tweetTextarea.setSelectionRange(0, tweetTextarea.value.length);
    }

    function closeTweetModal() {
        tweetModal.style.display = 'none';
        selectedNote = null;
    }

    // Generate Default Tweet Text
    function generateDefaultTweet(note) {
        const url = "https://cloud.google.com/bigquery/docs/release-notes";
        const tags = " #BigQuery #GoogleCloud";
        
        // Calculate remaining space for core content
        // 280 (max) - URL length - tags length - spacing/formatting
        // Standard link handles: Twitter wraps URLs to 23 characters internally,
        // but let's count characters literally for the user's interface limit.
        const footerText = `\n\nRelease notes: ${url}${tags}`;
        const maxContentLen = 280 - footerText.length;
        
        let headerText = `BigQuery Update [${note.date}] (${note.category}): `;
        let bodyText = note.body_text;
        
        let content = headerText + bodyText;
        
        if (content.length > maxContentLen) {
            // Need to truncate body text
            const truncateLen = maxContentLen - headerText.length - 4; // 4 for ' ...'
            if (truncateLen > 10) {
                bodyText = bodyText.substring(0, truncateLen) + ' ...';
                content = headerText + bodyText;
            } else {
                // If header itself is too long (unlikely), truncate everything
                content = content.substring(0, maxContentLen - 4) + ' ...';
            }
        }
        
        return content + footerText;
    }

    // Update Modal character counter and circle visual
    function updateCharCount() {
        const text = tweetTextarea.value;
        // Count URL characters as 23 (Twitter standard) if we want to be highly accurate,
        // but for simplicity and clarity, we'll count absolute character length.
        // Let's replace URLs in text with a 23-char placeholder for Twitter character counting logic
        const twitterLength = getTwitterLength(text);
        const remaining = 280 - twitterLength;
        
        charCountEl.textContent = remaining;
        
        // Update styling of character count
        if (remaining < 0) {
            charCountEl.className = 'char-count error';
            submitTweetBtn.classList.add('disabled');
        } else if (remaining <= 20) {
            charCountEl.className = 'char-count warning';
            submitTweetBtn.classList.remove('disabled');
        } else {
            charCountEl.className = 'char-count';
            submitTweetBtn.classList.remove('disabled');
        }
        
        // Progress Circle calculation
        const percent = Math.min(100, (twitterLength / 280) * 100);
        const strokeColor = remaining < 0 ? 'var(--color-deprecation)' : (remaining <= 20 ? 'var(--color-fix)' : '#1d9bf0');
        
        progressCircle.style.stroke = strokeColor;
        
        if (percent >= 100) {
            progressCircle.style.strokeDashoffset = 0;
        } else {
            const offset = circleCircumference - (percent / 100) * circleCircumference;
            progressCircle.style.strokeDashoffset = offset;
        }
    }

    // Get Twitter length (standard URLs count as 23 characters)
    function getTwitterLength(text) {
        // Simple regex to find URLs
        const urlRegex = /https?:\/\/[^\s]+/g;
        let length = text.length;
        const matches = text.match(urlRegex);
        
        if (matches) {
            matches.forEach(url => {
                // Standard URL counts as 23 characters on Twitter
                length = length - url.length + 23;
            });
        }
        return length;
    }

    // Copy to clipboard helper
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        const icon = toast.querySelector('i');
        if (type === 'success') {
            icon.className = 'fa-solid fa-circle-check';
            icon.style.color = 'var(--color-feature)';
        } else {
            icon.className = 'fa-solid fa-circle-xmark';
            icon.style.color = 'var(--color-deprecation)';
        }
        
        toast.style.display = 'flex';
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.style.display = 'none', 350);
        }, 2500);
    }

    // Event Listeners for Filters
    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            currentCategory = pill.getAttribute('data-category');
            
            // Sync with stats panel active selection
            statCards.forEach(card => {
                const statType = card.getAttribute('data-stat');
                if (statType === 'all' && currentCategory === 'all') card.classList.add('active');
                else if (statType === currentCategory.toLowerCase()) card.classList.add('active');
                else card.classList.remove('active');
            });
            
            applyFiltersAndRender();
        });
    });

    // Event Listeners for Stats Panel Cards (acting as filters)
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            statCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const statType = card.getAttribute('data-stat');
            
            // Map stat card type to category name
            let categoryName = 'all';
            if (statType === 'feature') categoryName = 'Feature';
            else if (statType === 'change') categoryName = 'Change';
            else if (statType === 'deprecation') categoryName = 'Deprecation';
            
            currentCategory = categoryName;
            
            // Sync with category pills
            categoryPills.forEach(pill => {
                const pillCat = pill.getAttribute('data-category');
                if (pillCat.toLowerCase() === categoryName.toLowerCase()) pill.classList.add('active');
                else pill.classList.remove('active');
            });
            
            applyFiltersAndRender();
        });
    });

    // Search input handler with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        
        if (currentSearch.trim() !== '') {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFiltersAndRender();
        }, 150);
    });

    // Clear search handler
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndRender();
        searchInput.focus();
    });

    // Sort select handler
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndRender();
    });

    // Refresh button click handler
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Retry button on error banner
    errorRetryBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Modal Event Listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    
    // Close modal clicking outside the card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Textarea input event
    tweetTextarea.addEventListener('input', updateCharCount);

    // Hashtag helper buttons click
    tagHelperBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            const currentValue = tweetTextarea.value;
            
            // Check if hashtag already exists
            if (currentValue.includes(tag)) {
                // Remove hashtag
                tweetTextarea.value = currentValue.replace(new RegExp('\\s*' + tag, 'g'), '').trim();
            } else {
                // Add hashtag (prepend a space if needed)
                tweetTextarea.value = currentValue + (currentValue.endsWith(' ') || currentValue.length === 0 ? '' : ' ') + tag;
            }
            updateCharCount();
            tweetTextarea.focus();
        });
    });

    // Copy Tweet content
    copyTweetBtn.addEventListener('click', async () => {
        const text = tweetTextarea.value;
        try {
            await navigator.clipboard.writeText(text);
            showToast('Copied tweet to clipboard!');
        } catch (err) {
            console.error('Failed to copy text:', err);
            showToast('Failed to copy text', 'error');
        }
    });

    // Submit Tweet on Twitter/X
    submitTweetBtn.addEventListener('click', () => {
        if (submitTweetBtn.classList.contains('disabled')) {
            return;
        }
        
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        
        // Open the Twitter web intent in a new window/tab
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
        showToast('Opened Twitter composer!');
    });

    // Keyboard support: Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.style.display === 'flex') {
            closeTweetModal();
        }
    });

    // Initialize Page
    fetchReleaseNotes();
});
