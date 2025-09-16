// Utility function for debouncing
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Form state
let formData = {
    clientId: '',
    repcode: '',
    type: '',
    date: ''
};

// DOM elements
const form = document.getElementById('nativeLogForm');
const clientIdInput = document.getElementById('clientId');
const repcodeInput = document.getElementById('repcode');
const dateInput = document.getElementById('date');
const showButton = document.getElementById('showButton');
const buttonText = document.getElementById('buttonText');
const spinner = document.getElementById('spinner');

// Alert elements
const alertOverlay = document.getElementById('alertOverlay');
const alertTitle = document.getElementById('alertTitle');
const alertContent = document.getElementById('alertContent');
const alertClose = document.getElementById('alertClose');

// Dropdown elements
const typeDropdown = document.getElementById('typeDropdown');
const typeButton = document.getElementById('typeButton');
const typeButtonText = document.getElementById('typeButtonText');
const typeMenu = document.getElementById('typeMenu');
const typeOptions = document.querySelectorAll('.dropdown-option');

// New DOM elements for search & filter
const controlsContainer = document.querySelector('.controls-container');
const logSearchInput = document.getElementById('logSearchInput');
const clearSearchButton = document.getElementById('clearSearchButton');
const filterButtons = document.querySelectorAll('.filter-button');
const clearAllFiltersButton = document.getElementById('clearAllFiltersButton');
const exportLogsButton = document.getElementById('exportLogsButton'); // Export button
const exportOptionsMenu = document.getElementById('exportOptionsMenu'); // New export options menu
const logEntriesContainer = document.getElementById('logEntriesContainer');

// Load More buttons
const loadMoreButton = document.getElementById('loadMoreButton'); // For local data
const loadMoreLocalSpinner = document.getElementById('loadMoreLocalSpinner');
const fetchMoreFromServerButton = document.getElementById('fetchMoreFromServerButton'); // For server data
const fetchMoreServerSpinner = document.getElementById('fetchMoreServerSpinner');
const scrollToTopButton = document.getElementById('scrollToTopButton'); // Scroll to top button

let currentLogData = []; // To store all fetched log data
let nextSearchAfter = null; // Stores the search_after token for next API call
let displayedLogCount = 0; // How many logs are currently rendered in the modal
const LOGS_PER_RENDER = 2000; // Number of logs to render initially and on "Load More (Local)"

let activeFilterType = 'all';
let activeSearchTerm = '';

// Set today's date as default
const today = new Date().toISOString().split('T')[0];
dateInput.value = today;
formData.date = today;

// --- Keyboard Navigation for Dropdown ---
let currentDropdownIndex = -1;
typeButton.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!typeMenu.classList.contains('open')) {
            typeButton.click(); // Open if closed
        }
        const options = Array.from(typeMenu.children);
        if (options.length === 0) return;

        currentDropdownIndex = (e.key === 'ArrowDown') 
            ? (currentDropdownIndex + 1) % options.length 
            : (currentDropdownIndex - 1 + options.length) % options.length;
        
        options[currentDropdownIndex].focus();
    } else if (e.key === 'Enter' && typeMenu.classList.contains('open')) {
        e.preventDefault();
        typeButton.click(); // Close dropdown
    }
});

typeMenu.addEventListener('keydown', (e) => {
    const options = Array.from(typeMenu.children);
    if (options.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        currentDropdownIndex = (e.key === 'ArrowDown') 
            ? (currentDropdownIndex + 1) % options.length 
            : (currentDropdownIndex - 1 + options.length) % options.length;
        
        options[currentDropdownIndex].focus();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        options[currentDropdownIndex].click(); // Select option
        typeButton.focus(); // Return focus to button
    } else if (e.key === 'Escape') {
        e.preventDefault();
        typeButton.click(); // Close dropdown
        typeButton.focus();
    }
});

// --- Keyboard Navigation for Date Input ---
dateInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentDate = new Date(dateInput.value);
        if (isNaN(currentDate)) return; // Invalid date

        if (e.key === 'ArrowLeft') {
            currentDate.setDate(currentDate.getDate() - 1);
        } else { // ArrowRight
            currentDate.setDate(currentDate.getDate() + 1);
        }
        dateInput.value = currentDate.toISOString().split('T')[0];
        formData.date = dateInput.value; // Update form data
        clearError('date');
        validateForm();
    }
});


// Enhanced dropdown functionality
typeButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // Crucial: Stop propagation to prevent document click from closing immediately
    const isOpen = typeButton.classList.contains('open');
    typeButton.classList.toggle('open');
    typeMenu.classList.toggle('open');
    typeButton.setAttribute('aria-expanded', !isOpen);
    if (isOpen) {
        currentDropdownIndex = -1; // Reset index when closing
    } else {
        // Set initial focus to first option when opening
        const options = Array.from(typeMenu.children);
        if (options.length > 0) {
            options[0].focus();
            currentDropdownIndex = 0;
        }
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    // Check if the click is outside the dropdown button AND outside the dropdown menu
    if (!typeDropdown.contains(e.target)) {
        typeButton.classList.remove('open');
        typeMenu.classList.remove('open');
        typeButton.setAttribute('aria-expanded', 'false');
        currentDropdownIndex = -1;
    }
});

// Handle dropdown option selection with animation
typeOptions.forEach(option => {
    option.addEventListener('click', (e) => { // Added e parameter
        e.stopPropagation(); // Stop propagation to prevent document click from closing immediately
        const value = option.getAttribute('data-value');
        const text = option.innerHTML;
        
        formData.type = value;
        typeButtonText.innerHTML = text;
        typeButton.classList.remove('open');
        typeMenu.classList.remove('open');
        typeButton.setAttribute('aria-expanded', 'false');
        
        clearError('type');
        validateForm();
    });
});

// Enhanced input event listeners
clientIdInput.addEventListener('input', (e) => {
    formData.clientId = e.target.value.trim();
    clearError('clientId');
    validateForm();
});

repcodeInput.addEventListener('input', (e) => {
    formData.repcode = e.target.value.trim();
    clearError('repcode');
    validateForm();
});

dateInput.addEventListener('change', (e) => {
    formData.date = e.target.value;
    clearError('date');
    validateForm();
});

// Enhanced form validation
function validateForm() {
    const isValid = formData.clientId && formData.repcode && formData.type && formData.date;
    showButton.disabled = !isValid;
    
    if (isValid) {
        showButton.style.opacity = '1';
        showButton.style.transform = 'scale(1)';
    } else {
        showButton.style.opacity = '0.6';
        showButton.style.transform = 'scale(0.98)';
    }
    
    return isValid;
}

function showError(field, message) {
    const errorElement = document.getElementById(field + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearError(field) {
    const errorElement = document.getElementById(field + 'Error');
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

function clearAllErrors() {
    ['clientId', 'repcode', 'type', 'date'].forEach(field => {
        clearError(field);
    });
}

// Enhanced alert modal functions
function showAlert(title) {
    alertTitle.textContent = title;
    alertOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Reset search and filters when alert opens
    logSearchInput.value = '';
    activeSearchTerm = '';
    clearSearchButton.style.display = 'none';
    activeFilterType = 'all';
    filterButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-button[data-filter-type="all"]').classList.add('active');
    
    // Ensure controls are visible by default
    controlsContainer.style.display = 'flex';
    loadMoreButton.style.display = 'none';
    fetchMoreFromServerButton.style.display = 'none';
    scrollToTopButton.classList.remove('show'); // Hide scroll to top initially
}

function hideAlert() {
    alertOverlay.classList.remove('show');
    document.body.style.overflow = 'auto';
    logEntriesContainer.innerHTML = ''; // Clear log entries
    currentLogData = []; // Clear stored data
    nextSearchAfter = null; // Clear search_after token
    displayedLogCount = 0;
    hideExportOptionsMenu(); // Hide export menu when modal closes
}

function highlightSearchTerm(text, term) {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function renderLogEntries(dataToRender) {
    // Only append if we are loading more locally, otherwise replace
    const isAppending = displayedLogCount > 0 && logEntriesContainer.children.length > 0;
    
    if (!isAppending) {
        logEntriesContainer.innerHTML = ''; // Clear previous entries if not appending
        displayedLogCount = 0; // Reset displayed count for a fresh render
    }
    
    if (!dataToRender || dataToRender.length === 0) {
        if (!isAppending) { // Only show no results if no logs at all
            logEntriesContainer.innerHTML = `
                <div class="no-search-results">
                    <div class="no-search-results-icon">🔍</div>
                    <h3>No matching log entries</h3>
                    <p>Try a different search term or clear filters</p>
                </div>
            `;
        }
        loadMoreButton.style.display = 'none';
        fetchMoreFromServerButton.style.display = 'none';
        return;
    }

    const logsToRenderNow = dataToRender.slice(displayedLogCount, displayedLogCount + LOGS_PER_RENDER);
    let content = '';
    logsToRenderNow.forEach((item, index) => {
        const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A';
        const messageType = item.message_type ? item.message_type.toLowerCase() : 'info';
        const highlightedMessage = highlightSearchTerm(item.message || 'No message available', activeSearchTerm);
        
        content += `
            <div class="log-item" style="animation-delay: ${index * 0.01}s;">
                <div class="log-message">${highlightedMessage}
                    <button class="copy-log-button" data-log-message="${item.message || ''}" aria-label="Copy log message">📋</button>
                </div>
                <div class="log-meta">
                    <span class="log-timestamp">🕒 ${timestamp}</span>
                    <span class="log-type ${messageType}">${item.message_type || 'INFO'}</span>
                </div>
            </div>
        `;
    });
    logEntriesContainer.insertAdjacentHTML('beforeend', content);
    displayedLogCount += logsToRenderNow.length;

    // Update Load More button visibility
    const hasMoreToRenderLocally = displayedLogCount < dataToRender.length;
    const hasMoreFromServer = nextSearchAfter !== null;

    loadMoreButton.style.display = hasMoreToRenderLocally ? 'flex' : 'none';
    fetchMoreFromServerButton.style.display = hasMoreFromServer ? 'flex' : 'none';

    // Add event listeners for copy buttons
    document.querySelectorAll('.copy-log-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const messageToCopy = e.currentTarget.dataset.logMessage;
            
            const originalIcon = e.currentTarget.innerHTML; // Store original icon
            const setCopiedFeedback = () => {
                e.currentTarget.classList.add('copied');
                e.currentTarget.innerHTML = '✅'; // Visual feedback
                setTimeout(() => {
                    e.currentTarget.innerHTML = originalIcon;
                    e.currentTarget.classList.remove('copied');
                }, 1500);
            };

            try {
                // Attempt to use modern Clipboard API
                await navigator.clipboard.writeText(messageToCopy);
                setCopiedFeedback();
            } catch (err) {
                console.warn('Failed to copy using Clipboard API:', err);
                // Fallback to deprecated document.execCommand if Clipboard API fails
                if (document.queryCommandSupported('copy')) {
                    const textarea = document.createElement('textarea');
                    textarea.value = messageToCopy;
                    // Make the textarea invisible and outside the viewport
                    textarea.style.position = 'absolute';
                    textarea.style.left = '-9999px';
                    textarea.style.top = '0';
                    document.body.appendChild(textarea);
                    textarea.focus();
                    textarea.select();
                    try {
                        const successful = document.execCommand('copy');
                        if (successful) {
                            setCopiedFeedback();
                        } else {
                            alert('Failed to copy log message. Please copy manually.');
                        }
                    } catch (execCommandErr) {
                        console.error('Failed to copy using execCommand:', execCommandErr);
                        alert('Failed to copy log message. Please copy manually.');
                    } finally {
                        document.body.removeChild(textarea);
                    }
                } else {
                    alert('Your browser does not support automatic copying. Please copy manually.');
                }
            }
        });
    });
}

function getFilteredAndSearchedLogs() {
    let filtered = currentLogData;

    // Apply type filter
    if (activeFilterType !== 'all') {
        filtered = filtered.filter(item => 
            item.message_type && item.message_type.toLowerCase() === activeFilterType
        );
    }

    // Apply search term
    if (activeSearchTerm) {
        const searchTermLower = activeSearchTerm.toLowerCase();
        filtered = filtered.filter(item => 
            (item.message && item.message.toLowerCase().includes(searchTermLower)) ||
            (item.message_type && item.message_type.toLowerCase().includes(searchTermLower)) ||
            (item.timestamp && new Date(item.timestamp).toLocaleString().toLowerCase().includes(searchTermLower))
        );
    }
    return filtered;
}

function applyFiltersAndSearch() {
    const filteredLogs = getFilteredAndSearchedLogs();
    // Reset displayedLogCount to 0 to force a fresh render from the top of the filtered list
    displayedLogCount = 0; 
    renderLogEntries(filteredLogs);
}

// This function now handles both initial data and appended data
function showSuccessAlert(newData, newSearchAfter, append = false) {
    if (!append) { // Initial load or new search
        currentLogData = newData;
        nextSearchAfter = newSearchAfter;
    } else { // Appending data from server
        currentLogData = currentLogData.concat(newData);
        nextSearchAfter = newSearchAfter;
    }

    if (!currentLogData || currentLogData.length === 0) {
        showAlert('No Data Found');
        alertContent.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">📊</div>
                <h3>No log entries found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        controlsContainer.style.display = 'none'; // Hide controls if no data
        loadMoreButton.style.display = 'none';
        fetchMoreFromServerButton.style.display = 'none';
        return;
    }

    showAlert(`📋 Log Data (${currentLogData.length} entries)`);
    applyFiltersAndSearch(); // Re-apply filters and render
}

function showErrorAlert(message) {
    showAlert('Error');
    alertContent.innerHTML = `
        <div class="error-alert">
            <div class="error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>${message}</p>
        </div>
    `;
    controlsContainer.style.display = 'none'; // Hide controls for error alerts
    loadMoreButton.style.display = 'none';
    fetchMoreFromServerButton.style.display = 'none';
}

// Enhanced alert close functionality
alertClose.addEventListener('click', hideAlert);
alertOverlay.addEventListener('click', (e) => {
    if (e.target === alertOverlay) {
        hideAlert();
    }
});

// Escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && alertOverlay.classList.contains('show')) {
        hideAlert();
    }
});

// Debounced Search functionality
const debouncedSearch = debounce(() => {
    activeSearchTerm = logSearchInput.value.trim();
    applyFiltersAndSearch();
}, 300); // 300ms debounce delay

logSearchInput.addEventListener('input', () => {
    if (logSearchInput.value.trim()) {
        clearSearchButton.style.display = 'flex';
    } else {
        clearSearchButton.style.display = 'none';
    }
    debouncedSearch();
});

clearSearchButton.addEventListener('click', () => {
    logSearchInput.value = '';
    clearSearchButton.style.display = 'none';
    activeSearchTerm = '';
    applyFiltersAndSearch();
    logSearchInput.focus();
});

// Log Type Filtering
filterButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeFilterType = e.currentTarget.dataset.filterType;
        applyFiltersAndSearch();
    });
});

// Clear All Filters
clearAllFiltersButton.addEventListener('click', () => {
    logSearchInput.value = '';
    clearSearchButton.style.display = 'none';
    activeSearchTerm = '';
    activeFilterType = 'all';
    filterButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-button[data-filter-type="all"]').classList.add('active');
    applyFiltersAndSearch();
});

// Export Options Menu Logic
function showExportOptionsMenu() {
    exportOptionsMenu.classList.add('show');
    exportLogsButton.setAttribute('aria-expanded', 'true');
}

function hideExportOptionsMenu() {
    exportOptionsMenu.classList.remove('show');
    exportLogsButton.setAttribute('aria-expanded', 'false');
}

exportLogsButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent click from immediately closing the menu
    if (exportOptionsMenu.classList.contains('show')) {
        hideExportOptionsMenu();
    } else {
        showExportOptionsMenu();
    }
});

// Close export menu when clicking outside
document.addEventListener('click', (e) => {
    // Check if the click is outside the export button AND outside the export menu
    const exportButtonWrapper = document.querySelector('.export-button-wrapper');
    if (exportButtonWrapper && !exportButtonWrapper.contains(e.target)) {
        hideExportOptionsMenu();
    }
});

// Handle clicks on export format buttons
exportOptionsMenu.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', (e) => {
        const format = e.currentTarget.dataset.format;
        const filteredLogs = getFilteredAndSearchedLogs();
        if (filteredLogs.length === 0) {
            alert('No logs to export.');
            hideExportOptionsMenu();
            return;
        }

        // Construct base filename
        const baseFilename = `${formData.clientId}_${formData.repcode}_${formData.date}_${formData.type}`;

        if (format === 'csv') {
            exportToCSV(filteredLogs, `${baseFilename}.csv`);
        } else if (format === 'json') {
            exportToJSON(filteredLogs, `${baseFilename}.json`);
        } else if (format === 'txt') {
            exportToTXT(filteredLogs, `${baseFilename}.txt`);
        }
        hideExportOptionsMenu(); // Hide menu after selection
    });
});


function exportToCSV(data, filename) {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add header row

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""'); // Escape double quotes
            return `"${escaped}"`; // Wrap in double quotes
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    downloadFile(csvString, filename, 'text/csv');
}

function exportToJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, filename, 'application/json');
}

function exportToTXT(data, filename) {
    if (data.length === 0) return;
    const messages = data.map(item => item.message || '').join('\n\n'); // Join with blank line
    downloadFile(messages, filename, 'text/plain');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// Load More (Local) functionality
loadMoreButton.addEventListener('click', () => {
    const filteredLogs = getFilteredAndSearchedLogs();
    renderLogEntries(filteredLogs); // Just render more from already fetched data
});

// Fetch More from Server functionality
fetchMoreFromServerButton.addEventListener('click', async () => {
    if (!nextSearchAfter) return; // Should not happen if button is visible

    fetchMoreServerSpinner.style.display = 'block';
    fetchMoreFromServerButton.disabled = true;
    fetchMoreFromServerButton.textContent = 'Fetching...'; // Clearer loading state

    try {
        const apiRequestPayload = {
            clientId: formData.clientId,
            repcode: formData.repcode,
            startDate: formData.date,
            endDate: formData.date,
            type: formData.type,
            search_after: nextSearchAfter // Send the token
        };
        const apiResponse = await callNativeLogAPI(apiRequestPayload);

        if (apiResponse.message === "Log data fetched successfully") {
            showSuccessAlert(apiResponse.data, apiResponse.searchAfter, true); // Append new data
        } else {
            // No more data from server
            nextSearchAfter = null;
            applyFiltersAndSearch(); // Re-render to update button state
        }
    } catch (error) {
        console.error("Error fetching more logs:", error);
        alert("Failed to load more logs from server: " + error.message);
    } finally {
        fetchMoreServerSpinner.style.display = 'none';
        fetchMoreFromServerButton.disabled = false;
        fetchMoreFromServerButton.innerHTML = 'Fetch More from Server <div class="spinner" id="fetchMoreServerSpinner" style="display: none;"></div>'; // Reset button text
    }
});

// Scroll to Top Button functionality
logEntriesContainer.addEventListener('scroll', () => {
    if (logEntriesContainer.scrollTop > 300) { // Show button after scrolling 300px
        scrollToTopButton.classList.add('show');
    } else {
        scrollToTopButton.classList.remove('show');
    }
});

scrollToTopButton.addEventListener('click', () => {
    logEntriesContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});


// API call function
async function callNativeLogAPI(requestData) {
    const API_ENDPOINT = 'https://nodenativelive.cirrius.in/api/v1/searchLog';
    
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`API Error: ${response.status} - ${errorBody.message || response.statusText}`);
    }

    const apiResponse = await response.json();
    return apiResponse;
}

// Enhanced form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    clearAllErrors();
    
    if (!validateForm()) {
        if (!formData.clientId) showError('clientId', '⚠️ Client ID is required');
        if (!formData.repcode) showError('repcode', '⚠️ Repcode is required');
        if (!formData.type) showError('type', '⚠️ Please select a type');
        if (!formData.date) showError('date', '⚠️ Date is required');
        return;
    }

    const apiRequestPayload = {
        clientId: formData.clientId,
        repcode: formData.repcode,
        startDate: formData.date,
        endDate: formData.date,
        type: formData.type,
        search_after: null // Initial call, no search_after
    };

    // Enhanced loading state
    buttonText.textContent = 'Searching...';
    spinner.style.display = 'block';
    showButton.disabled = true;
    showButton.style.background = 'var(--text-muted)';

    try {
        const apiResponse = await callNativeLogAPI(apiRequestPayload);
        
        if (apiResponse.message === "Log data fetched successfully") {
            showSuccessAlert(apiResponse.data, apiResponse.searchAfter, false); // Initial load, not appending
        } else {
            showErrorAlert(apiResponse.message || 'Something went wrong');
        }
        
    } catch (error) {
        showErrorAlert('Network Error: ' + error.message);
    } finally {
        // Reset loading state
        buttonText.textContent = 'Show Logs';
        spinner.style.display = 'none';
        showButton.style.background = 'var(--primary)';
        validateForm();
    }
});

// Initial validation
validateForm();

// Add smooth animations on page load
document.addEventListener('DOMContentLoaded', () => {
    const formContainer = document.querySelector('.form-container');
    formContainer.style.opacity = '0';
    formContainer.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        formContainer.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        formContainer.style.opacity = '1';
        formContainer.style.transform = 'translateY(0)';
    }, 50);
});

// Add focus effects
const inputs = document.querySelectorAll('.form-input, .dropdown-button');
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'translateY(-1px)';
    });
    
    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'translateY(0)';
    });
});
