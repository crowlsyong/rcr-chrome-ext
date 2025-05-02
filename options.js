// Function to apply dark mode styles on manifold.markets
function applyDarkMode() {
    console.log('Applying dark mode...');

    // Check if we're on manifold.markets
    if (window.location.hostname === 'manifold.markets') {
        const style = document.createElement('style');
        style.innerHTML = `
            html, body {
                background-color: #000000 !important;
                color: #e0e0e0 !important;
            }
            .bg-canvas-0 {
                background-color: #000000 !important;
            }
            :root {
                --color-canvas-0: 0 0 0 !important;
            }
        `;
        document.head.appendChild(style);

        // Dynamically load theme-black.js
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('themes/theme-black.js');  // Path to your theme-black.js file
        document.head.appendChild(script);

        // Apply data-theme for dark mode
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

// Function to remove dark mode styles
function removeDarkMode() {
    console.log('Removing dark mode...');

    // Check if we're on manifold.markets before removing styles
    if (window.location.hostname === 'manifold.markets') {
        const style = document.createElement('style');
        style.innerHTML = `
            html, body {
                background-color: #ffffff !important;
                color: #000000 !important;
            }
            .bg-canvas-0 {
                background-color: #ffffff !important;
            }
            :root {
                --color-canvas-0: 255 255 255 !important;
            }
        `;
        document.head.appendChild(style);

        // Remove data-theme for light mode
        document.documentElement.removeAttribute('data-theme');
    }
}

// Retrieve dark mode state from chrome storage
chrome.storage.local.get('darkMode', (result) => {
    console.log('Retrieved dark mode state:', result.darkMode);
    if (result.hasOwnProperty('darkMode')) {
        const toggle = document.getElementById('dark-mode-toggle');
        toggle.checked = result.darkMode;

        // Apply the corresponding theme immediately when page loads
        if (result.darkMode) {
            applyDarkMode();
        } else {
            removeDarkMode();
        }
    } else {
        console.log('No stored dark mode preference found.');
    }
});

// Listen for toggle change and save it to chrome storage
document.getElementById('dark-mode-toggle').addEventListener('change', (event) => {
    const darkModeState = event.target.checked;
    console.log('Dark mode state changed:', darkModeState);

    // Save the state to chrome storage
    chrome.storage.local.set({ darkMode: darkModeState }, () => {
        console.log('Dark mode preference saved:', darkModeState);

        // Apply the dark mode setting immediately
        if (darkModeState) {
            applyDarkMode();
        } else {
            removeDarkMode();
        }
    });
});
