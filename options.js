// options.js

// Reusing global functions from previous version if they exist, otherwise defining
// (These are the original ones that were meant to apply to Manifold.markets, not options page)
// Keeping them commented as they are not used on options.html
/*
function applyDarkMode() { ... }
function removeDarkMode() { ... }
*/

// Function to update status message with fade-out
function showStatus(element, message, isSuccess = true) {
    element.textContent = message;
    element.style.opacity = '1';
    element.style.transition = 'opacity 0.1s ease-in'; // Immediate visibility

    if (isSuccess) {
        element.style.color = "#4CAF50"; // Green for success
    } else {
        element.style.color = "#EF4444"; // Red for errors/deletions
    }

    // Fade out after a short delay
    setTimeout(() => {
        element.style.transition = 'opacity 1s ease-out'; // Fade out transition
        element.style.opacity = '0';
        setTimeout(() => {
            element.textContent = ""; // Clear text after fade
            element.style.transition = 'none'; // Reset for next show
        }, 1000); // Match fade transition duration
    }, 2000); // Show for 2 seconds before fading
}

// options.js

// No showStatus function needed as per request. Removed.

// Function to manage Save/Delete button state and input value
function setupStorageItem(storageKey, inputElement, saveButton, deleteButton) { // Removed statusElement arg

    // Update button text/class/visibility based on existence of key
    function updateButtonState(keyExists) {
        if (keyExists) {
            // If key exists, hide save button, show delete button
            saveButton.classList.add("hidden"); // Hide save button
            deleteButton.classList.remove("hidden"); // Show delete button
            // Ensure input is not cleared if key exists
        } else {
            // If no key, show save button, hide delete button
            saveButton.classList.remove("hidden"); // Show save button
            saveButton.textContent = "Save"; // Ensure save button text is correct
            deleteButton.classList.add("hidden"); // Hide delete button
            inputElement.value = ""; // Clear input when no key
        }
    }

    // Load saved value on page load
    chrome.storage.local.get(storageKey, function (result) {
        if (result[storageKey]) {
            inputElement.value = result[storageKey];
            updateButtonState(true);
        } else {
            inputElement.value = ""; // Ensure empty input
            updateButtonState(false);
        }
    });

    // Save button click listener
    saveButton.addEventListener("click", function () {
        const value = inputElement.value.trim();
        if (value) {
            chrome.storage.local.set({ [storageKey]: value }, function () {
                // No status message
                updateButtonState(true); // Update state to saved
            });
        } else {
            // If save clicked with empty field, treat as a deletion
            chrome.storage.local.remove(storageKey, function () {
                // No status message
                updateButtonState(false); // Update state to not saved
            });
        }
    });

    // Delete button click listener
    deleteButton.addEventListener("click", function () {
        chrome.storage.local.remove(storageKey, function () {
            // No status message
            updateButtonState(false); // Update state to not saved (clears input, hides delete, shows save)
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    // --- App Toggle Logic ---
    const appToggle = document.getElementById('app-toggle');

    if (appToggle) {
        chrome.storage.local.get('creditScoreState', function (result) {
            if (result.creditScoreState !== undefined) {
                appToggle.checked = result.creditScoreState;
            }
        });

        appToggle.addEventListener('change', function () {
            const newState = appToggle.checked;
            chrome.storage.local.set({ 'creditScoreState': newState }, function () {
                console.log('App toggle state saved: ' + newState);
            });
        });
    }

    // --- Manifold API Key Setup ---
    const apiKeyInput = document.getElementById("manifold-api-key");
    const saveApiKeyButton = document.getElementById("save-api-key");
    const deleteApiKeyButton = document.getElementById("delete-api-key");
    // Removed apiKeyStatus as it's no longer used

    setupStorageItem('manifoldApiKey', apiKeyInput, saveApiKeyButton, deleteApiKeyButton); // Removed statusElement arg

    // --- Manifold User ID Setup ---
    const userIdInput = document.getElementById("manifold-user-id");
    const saveUserIdButton = document.getElementById("save-user-id");
    const deleteUserIdButton = document.getElementById("delete-user-id");
    // Removed userIdStatus as it's no longer used

    setupStorageItem('manifoldUserId', userIdInput, saveUserIdButton, deleteUserIdButton); // Removed statusElement arg

});