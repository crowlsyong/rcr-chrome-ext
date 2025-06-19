// options.js
// Function to apply dark mode styles on manifold.markets
function applyDarkMode() {
  console.log("Applying dark mode...");

  // Check if we're on manifold.markets
  if (window.location.hostname === "manifold.markets") {
    const style = document.createElement("style");
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
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("themes/theme-black.js"); // Path to your theme-black.js file
    document.head.appendChild(script);

    // Apply data-theme for dark mode
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

// Function to remove dark mode styles
function removeDarkMode() {
  console.log("Removing dark mode...");

  // Check if we're on manifold.markets before removing styles
  if (window.location.hostname === "manifold.markets") {
    const style = document.createElement("style");
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
    document.documentElement.removeAttribute("data-theme");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // --- Existing Dark Mode Logic (already in your options.js) ---
  // Retrieve dark mode state from chrome storage
  chrome.storage.local.get("darkMode", (result) => {
    console.log("Retrieved dark mode state:", result.darkMode);
    if (result.hasOwnProperty("darkMode")) {
      const toggle = document.getElementById("dark-mode-toggle");
      if (toggle) {
        toggle.checked = result.darkMode;
        // Apply the corresponding theme immediately when page loads
        if (result.darkMode) {
          applyDarkMode();
        } else {
          removeDarkMode();
        }
      }
    } else {
      console.log("No stored dark mode preference found.");
    }
  });

  // Listen for toggle change and save it to chrome storage
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  if (darkModeToggle) {
    darkModeToggle.addEventListener("change", (event) => {
      const darkModeState = event.target.checked;
      console.log("Dark mode state changed:", darkModeState);

      // Save the state to chrome storage
      chrome.storage.local.set({ darkMode: darkModeState }, () => {
        console.log("Dark mode preference saved:", darkModeState);

        // Apply the dark mode setting immediately
        if (darkModeState) {
          applyDarkMode();
        } else {
          removeDarkMode();
        }
      });
    });
  }

  // --- NEW: Manifold API Key Logic ---
  const apiKeyInput = document.getElementById("manifold-api-key");
  const saveApiKeyButton = document.getElementById("save-api-key");
  const apiKeyStatus = document.getElementById("api-key-status");

  // Load saved API key on page load
  chrome.storage.local.get("manifoldApiKey", function (result) {
    if (result.manifoldApiKey) {
      apiKeyInput.value = result.manifoldApiKey;
      apiKeyStatus.textContent = "API Key loaded.";
    } else {
      apiKeyStatus.textContent = "No API Key saved.";
    }
  });

  // Save API key when button is clicked
  saveApiKeyButton.addEventListener("click", function () {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ manifoldApiKey: apiKey }, function () {
        apiKeyStatus.textContent = "API Key saved successfully!";
        apiKeyStatus.style.color = "#4CAF50"; // Green for success
        console.log("Manifold API Key saved.");
      });
    } else {
      // If the field is empty, remove the stored key
      chrome.storage.local.remove("manifoldApiKey", function () {
        apiKeyStatus.textContent = "API Key removed.";
        apiKeyStatus.style.color = "#FFC107"; // Orange for warning
        console.log("Manifold API Key removed (field was empty).");
      });
    }
    // Clear status message after a few seconds
    setTimeout(() => {
      apiKeyStatus.textContent = "";
      apiKeyStatus.style.color = "#aaa";
    }, 3000);
  });
});
