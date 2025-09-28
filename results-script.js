document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const totalCountEl = document.getElementById('totalCount');
    const searchInput = document.getElementById('searchInput');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const exportBtn = document.getElementById('exportBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    const logsList = document.getElementById('logsList');
    const fetchMoreContainer = document.getElementById('fetchMoreContainer');
    const fetchMoreBtn = document.getElementById('fetchMoreBtn');
    const loadingContainer = document.getElementById('loadingContainer');
    const noResults = document.getElementById('noResults');
    const closeBtn = document.getElementById('closeBtn');
    const alertOverlay = document.getElementById('alertOverlay');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertButton = document.getElementById('alertButton');
    const fetchLoadingSpinner = document.getElementById('fetchLoadingSpinner');

    // API URLs for instances
    const API_URLS = {
        live: 'https://nodenativelive.cirrius.in/api/v1/searchLog',
        local: 'http://74.225.207.226:8002/search'
    };

    // State management
    let allLogs = [];
    let filteredLogs = [];
    let currentFilter = 'all';
    let currentSearchTerm = '';
    let searchAfter = null;
    let currentApiParams = {};

    // Initialize the page
    init();

    function init() {
        try {
            console.log('Initializing results page...');
            
            // Get data from sessionStorage
            const logsData = sessionStorage.getItem('logsData');
            const searchAfterData = sessionStorage.getItem('searchAfter');
            const apiParamsData = sessionStorage.getItem('apiParams');

            console.log('Logs data from sessionStorage:', logsData);
            console.log('SearchAfter data from sessionStorage:', searchAfterData);
            console.log('API params from sessionStorage:', apiParamsData);

            if (!logsData) {
                console.error('No log data found in sessionStorage');
                showAlert('Error', 'No log data found. Please go back and search again.');
                return;
            }

            // Parse stored data
            const parsedData = JSON.parse(logsData);
            console.log('Parsed log data:', parsedData);

            if (searchAfterData) {
                searchAfter = JSON.parse(searchAfterData);
                console.log('SearchAfter parsed:', searchAfter);
            }
            if (apiParamsData) {
                currentApiParams = JSON.parse(apiParamsData);
                console.log('API params parsed:', currentApiParams);
            }

            // Initialize logs
            allLogs = parsedData.data || [];
            searchAfter = parsedData.searchAfter || null;

            console.log('All logs loaded:', allLogs.length, 'entries');
            console.log('SearchAfter available:', searchAfter);

            // Check if we have any logs
            if (!allLogs || allLogs.length === 0) {
                console.warn('No log entries found in data');
                showAlert('No Data', 'No log entries found. Please try a different search.');
                return;
            }

            // Update UI
            updateUI();
            setupEventListeners();
            
            console.log('Results page initialized successfully');
            
        } catch (error) {
            console.error('Error initializing:', error);
            showAlert('Error', 'Failed to load log data. Error: ' + error.message);
        }
    }

    function setupEventListeners() {
        // Search input
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }

        // Filter buttons
        filterButtons.forEach(btn => {
            btn.addEventListener('click', handleFilter);
        });

        // Clear filters
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', clearFilters);
        }

        // Export functionality
        if (exportBtn) {
            exportBtn.addEventListener('click', toggleExportDropdown);
        }
        document.addEventListener('click', closeExportDropdown);
        
        document.querySelectorAll('[data-format]').forEach(link => {
            link.addEventListener('click', handleExport);
        });

        // Fetch more button
        if (fetchMoreBtn) {
            fetchMoreBtn.addEventListener('click', fetchMoreLogs);
        }

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', closePage);
        }

        // Alert button
        if (alertButton) {
            alertButton.addEventListener('click', hideAlert);
        }

        // Close alert on overlay click
        if (alertOverlay) {
            alertOverlay.addEventListener('click', function(e) {
                if (e.target === alertOverlay) {
                    hideAlert();
                }
            });
        }
    }

    function updateUI() {
        applyFilters();
        renderLogs();
        updateTotalCount();
        updateFetchMoreButton();
    }

    function applyFilters() {
        console.log('Applying filters...');
        console.log('Total logs to filter:', allLogs.length);
        console.log('Current search term:', currentSearchTerm);
        console.log('Current filter:', currentFilter);

        filteredLogs = allLogs.filter(log => {
            // Apply search filter
            const searchMatch = currentSearchTerm === '' || 
                Object.values(log).some(value => 
                    value && value.toString().toLowerCase().includes(currentSearchTerm.toLowerCase())
                );

            // Apply type filter
            const typeMatch = currentFilter === 'all' || 
                (log.message_type && log.message_type.toUpperCase() === currentFilter.toUpperCase());

            return searchMatch && typeMatch;
        });

        console.log('Filtered logs count:', filteredLogs.length);

        // Show/hide no results message
        if (filteredLogs.length === 0) {
            console.log('No results found, showing no results message');
            if (noResults) noResults.style.display = 'block';
            if (logsList) logsList.style.display = 'none';
        } else {
            console.log('Results found, showing logs list');
            if (noResults) noResults.style.display = 'none';
            if (logsList) logsList.style.display = 'block';
        }
    }

    function renderLogs() {
        console.log('Rendering logs...');
        console.log('Logs to render:', filteredLogs.length);
        
        if (!logsList) {
            console.error('logsList element not found');
            return;
        }

        logsList.innerHTML = '';

        if (filteredLogs.length === 0) {
            console.log('No logs to render');
            return;
        }

        filteredLogs.forEach((log, index) => {
            console.log(`Rendering log ${index + 1}:`, log);
            const logEntry = createLogEntry(log, index);
            logsList.appendChild(logEntry);
        });

        console.log('Finished rendering logs');
    }

    function createLogEntry(log, index) {
        const logEntry = document.createElement('div');
        const messageType = log.message_type || 'INFO';
        logEntry.className = `log-entry ${messageType.toLowerCase()}`;

        const timestamp = formatTimestamp(log.timestamp);
        const insertTimestamp = formatTimestamp(log.insert_timestamp);

        // Apply highlighting to all text content
        const highlightedMessage = highlightSearchText(log.message || `Log Entry ${index + 1}`);
        const highlightedClientId = highlightSearchText(log.client_id || 'N/A');
        const highlightedRepcode = highlightSearchText(log.repcode || 'N/A');
        const highlightedModule = highlightSearchText(log.module || 'N/A');
        const highlightedType = highlightSearchText(log.type || 'N/A');

        logEntry.innerHTML = `
            <div class="log-details">
                <div class="log-detail">
                    <span class="detail-label">Client ID</span>
                    <span class="detail-value">${highlightedClientId}</span>
                </div>
                <div class="log-detail">
                    <span class="detail-label">Rep Code</span>
                    <span class="detail-value">${highlightedRepcode}</span>
                </div>
                <div class="log-detail">
                    <span class="detail-label">Module</span>
                    <span class="detail-value">${highlightedModule}</span>
                </div>
                <div class="log-detail">
                    <span class="detail-label">Type</span>
                    <span class="detail-value">${highlightedType}</span>
                </div>
                <div class="log-detail">
                    <span class="detail-label">Insert Time</span>
                    <span class="detail-value">${insertTimestamp}</span>
                </div>
            </div>
            <div class="log-header">
                <div class="log-index">${highlightedMessage}</div>
                <div class="log-meta">
                    <span class="timestamp">🕐 ${timestamp}</span>
                    <span class="message-type-badge ${messageType.toLowerCase()}">${messageType}</span>
                </div>
            </div>
        `;

        return logEntry;
    }

    function formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                return timestamp;
            }
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (error) {
            return timestamp;
        }
    }

    function highlightSearchText(text) {
        if (!text || !currentSearchTerm || currentSearchTerm.trim() === '') {
            return escapeHtml(text);
        }

        // Escape HTML first
        const escapedText = escapeHtml(text);
        const searchTerm = currentSearchTerm.trim();
        
        // Create case-insensitive regex
        const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
        
        // Replace matches with highlighted version
        return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\    function escapeHtml(text) {');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    function updateTotalCount() {
        if (totalCountEl) {
            totalCountEl.textContent = allLogs.length;
        }
    }

    function updateFetchMoreButton() {
        if (!fetchMoreContainer) return;
        
        if (searchAfter && searchAfter.length > 0) {
            fetchMoreContainer.style.display = 'block';
        } else {
            fetchMoreContainer.style.display = 'none';
        }
    }

    function handleSearch(event) {
        currentSearchTerm = event.target.value.trim();
        updateUI();
    }

    function handleFilter(event) {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        event.target.classList.add('active');
        
        // Update current filter
        currentFilter = event.target.dataset.filter;
        
        // Update UI
        updateUI();
    }

    function clearFilters() {
        // Reset search
        if (searchInput) {
            searchInput.value = '';
        }
        currentSearchTerm = '';
        
        // Reset filter to 'all'
        currentFilter = 'all';
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        
        // Update UI
        updateUI();
    }

    function toggleExportDropdown(event) {
        if (event) event.stopPropagation();
        if (exportDropdown) {
            exportDropdown.classList.toggle('show');
        }
    }

    function closeExportDropdown(event) {
        if (!event.target.closest('.dropdown')) {
            if (exportDropdown) {
                exportDropdown.classList.remove('show');
            }
        }
    }

    function handleExport(event) {
        event.preventDefault();
        const format = event.target.dataset.format;
        exportData(format);
        if (exportDropdown) {
            exportDropdown.classList.remove('show');
        }
    }

    function exportData(format) {
        try {
            const dataToExport = filteredLogs.length > 0 ? filteredLogs : allLogs;
            
            if (dataToExport.length === 0) {
                showAlert('Export Error', 'No data to export');
                return;
            }

            let content, filename, mimeType;

            switch (format) {
                case 'csv':
                    content = convertToCSV(dataToExport);
                    filename = `logs_${getTimestamp()}.csv`;
                    mimeType = 'text/csv';
                    break;
                case 'json':
                    content = JSON.stringify(dataToExport, null, 2);
                    filename = `logs_${getTimestamp()}.json`;
                    mimeType = 'application/json';
                    break;
                case 'txt':
                    content = convertToTXT(dataToExport);
                    filename = `logs_${getTimestamp()}.txt`;
                    mimeType = 'text/plain';
                    break;
                default:
                    showAlert('Export Error', 'Invalid export format');
                    return;
            }

            downloadFile(content, filename, mimeType);
            showAlert('Export Success', `Data exported successfully as ${format.toUpperCase()}`);

        } catch (error) {
            console.error('Export error:', error);
            showAlert('Export Error', 'Failed to export data: ' + error.message);
        }
    }

    function convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','), // Header row
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
                    const escaped = value.toString().replace(/"/g, '""');
                    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
                }).join(',')
            )
        ];
        
        return csvRows.join('\n');
    }

    function convertToTXT(data) {
        return data.map((log, index) => {
            const lines = [
                `=== Log Entry ${index + 1} ===`,
                `Client ID: ${log.client_id || 'N/A'}`,
                `Rep Code: ${log.repcode || 'N/A'}`,
                `Module: ${log.module || 'N/A'}`,
                `Type: ${log.type || 'N/A'}`,
                `Message Type: ${log.message_type || 'N/A'}`,
                `Timestamp: ${log.timestamp || 'N/A'}`,
                `Insert Timestamp: ${log.insert_timestamp || 'N/A'}`,
                `Message: ${log.message || 'N/A'}`,
                ''
            ];
            return lines.join('\n');
        }).join('\n');
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }

    async function fetchMoreLogs() {
        try {
            setFetchMoreLoading(true);

            // Get API URL based on stored instance
            const apiUrl = API_URLS[currentApiParams.instance];
            
            if (!apiUrl) {
                throw new Error('Invalid API configuration');
            }

            // Prepare API payload with search_after
            const payload = {
                ...currentApiParams,
                search_after: searchAfter
            };

            console.log('Fetching more logs:', { url: apiUrl, payload });

            // Make API call
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            setFetchMoreLoading(false);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (data.message && data.data) {
                // Append new logs to existing ones
                allLogs = [...allLogs, ...data.data];
                
                // Update searchAfter for next pagination
                searchAfter = data.searchAfter || null;
                
                // Store updated data
                sessionStorage.setItem('logsData', JSON.stringify({
                    message: data.message,
                    data: allLogs,
                    searchAfter: searchAfter
                }));
                
                if (searchAfter) {
                    sessionStorage.setItem('searchAfter', JSON.stringify(searchAfter));
                } else {
                    sessionStorage.removeItem('searchAfter');
                }

                // Update UI
                updateUI();
                
                showAlert('Success', `Loaded ${data.data.length} more log entries`);
            } else {
                showAlert('Error', 'Invalid response format from server');
            }

        } catch (error) {
            console.error('Fetch more error:', error);
            setFetchMoreLoading(false);
            
            let errorMessage = 'Failed to fetch more logs. ';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection.';
            } else if (error.message.includes('HTTP')) {
                errorMessage += error.message;
            } else {
                errorMessage += 'An unexpected error occurred.';
            }
            
            showAlert('API Error', errorMessage);
        }
    }

    function setFetchMoreLoading(loading) {
        if (!fetchMoreBtn) return;
        
        if (loading) {
            fetchMoreBtn.classList.add('loading');
            fetchMoreBtn.disabled = true;
        } else {
            fetchMoreBtn.classList.remove('loading');
            fetchMoreBtn.disabled = false;
        }
    }

    function closePage() {
        if (confirm('Are you sure you want to close this page?')) {
            window.close();
        }
    }

    function showAlert(title, message) {
        if (alertTitle) alertTitle.textContent = title;
        if (alertMessage) alertMessage.textContent = message;
        if (alertOverlay) alertOverlay.classList.add('show');
    }

    function hideAlert() {
        if (alertOverlay) alertOverlay.classList.remove('show');
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
});