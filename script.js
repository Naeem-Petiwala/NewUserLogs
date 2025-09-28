document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const clientIdInput = document.getElementById('clientId');
    const repCodeInput = document.getElementById('repCode');
    const instanceSelect = document.getElementById('instance');
    const typeSelect = document.getElementById('type');
    const dateInput = document.getElementById('date');
    const searchBtn = document.getElementById('searchBtn');
    
    // Get alert elements
    const alertOverlay = document.getElementById('alertOverlay');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertButton = document.getElementById('alertButton');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // API URLs for instances
    const API_URLS = {
        live: 'https://nodenativelive.cirrius.in/api/v1/searchLog',
        local: 'http://74.225.207.226:8002/search'
    };

    // Set today's date as default
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInput.value = formattedDate;

    // Auto-uppercase for client ID
    clientIdInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
        clearError('clientId');
    });

    // Clear errors on input change
    repCodeInput.addEventListener('input', function() {
        clearError('repCode');
    });

    instanceSelect.addEventListener('change', function() {
        clearError('instance');
    });

    typeSelect.addEventListener('change', function() {
        clearError('type');
    });

    dateInput.addEventListener('change', function() {
        clearError('date');
    });

    // Alert button click
    alertButton.addEventListener('click', function() {
        hideAlert();
    });

    // Close alert on overlay click
    alertOverlay.addEventListener('click', function(e) {
        if (e.target === alertOverlay) {
            hideAlert();
        }
    });

    // Search button click event
    searchBtn.addEventListener('click', function() {
        validateAndSearch();
    });

    async function validateAndSearch() {
        let isValid = true;

        // Clear all previous errors
        clearAllErrors();

        // Validate Client ID
        if (!clientIdInput.value.trim()) {
            showError('clientId', 'Client ID is required');
            isValid = false;
        }

        // Validate Rep Code
        if (!repCodeInput.value.trim()) {
            showError('repCode', 'Rep Code is required');
            isValid = false;
        }

        // Validate Instance
        if (!instanceSelect.value) {
            showError('instance', 'Please select an instance');
            isValid = false;
        }

        // Validate Type
        if (!typeSelect.value) {
            showError('type', 'Please select a type');
            isValid = false;
        }

        // Validate Date
        if (!dateInput.value) {
            showError('date', 'Date is required');
            isValid = false;
        }

        if (isValid) {
            await callSearchAPI();
        }
    }

    async function callSearchAPI() {
        try {
            // Show loading state
            setLoadingState(true);

            // Get API URL based on selected instance
            const apiUrl = API_URLS[instanceSelect.value];
            
            // Format date to YYYY-MM-DD
            const formattedDate = formatDate(dateInput.value);

            // Prepare API payload
            const payload = {
                clientId: clientIdInput.value.trim(),
                repcode: repCodeInput.value.trim(),
                endDate: formattedDate,
                startDate: formattedDate,
                type: typeSelect.value,
                search_after: null
            };

            // Store API parameters for the results page
            const apiParams = {
                clientId: clientIdInput.value.trim(),
                repcode: repCodeInput.value.trim(),
                endDate: formattedDate,
                startDate: formattedDate,
                type: typeSelect.value,
                instance: instanceSelect.value
            };

            console.log('API Request:', { url: apiUrl, payload });

            // Make API call
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            // Hide loading state
            setLoadingState(false);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            // Check if response is successful
            if (data.message && data.data) {
                // Check if data array has any entries
                if (!data.data || data.data.length === 0) {
                    showAlert('No Data Found', 'No log entries found for the specified criteria. Please try different search parameters.');
                    return;
                }

                // Store the response data for the new page
                sessionStorage.setItem('logsData', JSON.stringify(data));
                sessionStorage.setItem('apiParams', JSON.stringify(apiParams));
                
                // Store searchAfter for pagination if available
                if (data.searchAfter) {
                    console.log('More logs available. SearchAfter:', data.searchAfter);
                    sessionStorage.setItem('searchAfter', JSON.stringify(data.searchAfter));
                } else {
                    // Remove searchAfter if it doesn't exist
                    sessionStorage.removeItem('searchAfter');
                }

                // Open new tab with results page
                const resultsUrl = 'results.html'; // You'll need to create this file
                const newTab = window.open(resultsUrl, '_blank');
                
                if (!newTab) {
                    showAlert('Error', 'Unable to open new tab. Please allow pop-ups for this site.');
                }
            } else {
                showAlert('Error', 'Invalid response format from server');
            }

        } catch (error) {
            console.error('API Error:', error);
            setLoadingState(false);
            
            let errorMessage = 'Failed to fetch log data. ';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection or try again later.';
            } else if (error.message.includes('HTTP')) {
                errorMessage += error.message;
            } else {
                errorMessage += 'An unexpected error occurred.';
            }
            
            showAlert('API Error', errorMessage);
        }
    }

    function formatDate(dateString) {
        // The HTML date input already returns YYYY-MM-DD format
        // But let's ensure it's in the correct format
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
        }
        
        return date.toISOString().split('T')[0];
    }

    function setLoadingState(loading) {
        if (loading) {
            searchBtn.classList.add('loading');
            searchBtn.disabled = true;
        } else {
            searchBtn.classList.remove('loading');
            searchBtn.disabled = false;
        }
    }

    function showAlert(title, message) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertOverlay.classList.add('show');
    }

    function hideAlert() {
        alertOverlay.classList.remove('show');
    }

    function showError(fieldName, message) {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(fieldName + 'Error');
        
        field.classList.add('error');
        errorElement.textContent = message;
    }

    function clearError(fieldName) {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(fieldName + 'Error');
        
        field.classList.remove('error');
        errorElement.textContent = '';
    }

    function clearAllErrors() {
        const fields = ['clientId', 'repCode', 'instance', 'type', 'date'];
        fields.forEach(field => clearError(field));
    }
});