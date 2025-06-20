// background.js

let RESERVED_PATHS_BACKGROUND_DATA = [];

// Function to fetch reserved paths in the background script
// This runs once when the service worker starts
async function fetchReservedPathsBackground() {
  try {
    const response = await fetch(chrome.runtime.getURL("data/reservedPaths.json"));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    RESERVED_PATHS_BACKGROUND_DATA = await response.json();
    console.log("RISK Tools Background: Reserved paths loaded for background script.");
  } catch (error) {
    console.error(`RISK Tools Background: Error fetching reserved paths for background: ${
      // Safely access error message in vanilla JS
      error && typeof error === "object" && "message" in error
        ? error.message
        : String(error)
      }`);
    RESERVED_PATHS_BACKGROUND_DATA = [];
  }
}

// Immediately fetch reserved paths when the service worker starts
fetchReservedPathsBackground();

// Function to check if a URL path is a reserved path
function isReservedPathBackground(url) {
  try {
    const urlObject = new URL(url);
    const pathSegments = urlObject.pathname
      .split("/")
      .filter((segment) => segment !== "");
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      return RESERVED_PATHS_BACKGROUND_DATA.includes(lastSegment);
    }
    return false;
  } catch (e) {
    console.error(`RISK Tools Background: Error parsing URL for reserved path check: ${
      // Safely access error message in vanilla JS
      e && typeof e === "object" && "message" in e
        ? e.message
        : String(e)
      }`);
    return false;
  }
}

// Handle extension installation and initial setup of the toggle state
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.get("creditScoreState", function (result) {
    if (result.creditScoreState === undefined) {
      chrome.storage.sync.set({ creditScoreState: false });
    }
  });
});

// Handle tab updates (URL changes) and message content script (for Manifold)
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (
    changeInfo.url &&
    tab.url &&
    tab.url.startsWith("https://manifold.markets/")
  ) {
    if (isReservedPathBackground(changeInfo.url)) {
      console.log("RISK Tools Background: Skipping messages for reserved path:", changeInfo.url);
      chrome.tabs.sendMessage(tabId, { message: 'removeCreditScoreBox' }, function (response) {
        if (chrome.runtime.lastError) { /* ignore */ }
      });
      return;
    }

    const startTime = performance.now();

    chrome.tabs.sendMessage(tabId, { message: "urlChanged", url: changeInfo.url }, function (response) {
      if (chrome.runtime.lastError) { console.warn("Content script not found (urlChanged):", chrome.runtime.lastError.message); }
    }
    );

    chrome.tabs.sendMessage(tabId, { message: "fadeToBlack" }, function (response) {
      if (chrome.runtime.lastError) { console.warn("Content script not found (fadeToBlack):", chrome.runtime.lastError.message); }
    }
    );

    chrome.tabs.sendMessage(tabId, { message: "injectCreditScoreBox" }, function (response) {
      if (chrome.runtime.lastError) { console.warn("Content script not found (injectCreditScoreBox):", chrome.runtime.lastError.message); }
      const elapsedTime = performance.now() - startTime;
      console.log(`RISK Tools Background: Credit Score Box message sent after URL change. Time taken: ${elapsedTime.toFixed(2)} ms`);
    }
    );
  } else if (changeInfo.url) {
    chrome.tabs.sendMessage(tabId, { message: 'removeCreditScoreBox' }, function (response) {
      if (chrome.runtime.lastError) { /* ignore */ }
    });
  }
});

// --- Main Message Listener for all content scripts ---
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // Listener for toggle state change from popup (existing listener for content-manifold.js)
  if (message.action === "toggleStateChanged") {
    chrome.storage.sync.set({ creditScoreState: message.state }, function () {
      console.log("Toggle state saved: " + message.state);
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.startsWith("https://manifold.markets/")) {
          if (message.state) {
            if (!isReservedPathBackground(tabs[0].url)) {
              chrome.tabs.sendMessage(tabs[0].id, { message: 'urlChanged', url: tabs[0].url });
            } else {
              console.log("RISK Tools Background: Toggle enabled but current page is a reserved path, skipping injection.");
            }
          } else {
            chrome.tabs.sendMessage(tabs[0].id, { message: 'removeCreditScoreBox' });
          }
        }
      });
    });
  } else if (message.action === "populateApiKey") { // Listener for api-inject.js
    if (message.apiKey && sender.tab && sender.tab.id) {
      console.log("RISK Tools Background: Received request to populate API key from tab ID:", sender.tab.id);
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        args: [message.apiKey],
        function: (apiKey) => {
          const API_KEY_INPUT_SELECTOR = "#api-key";
          const inputField = document.querySelector(API_KEY_INPUT_SELECTOR);

          if (inputField && inputField instanceof HTMLInputElement) {
            if (inputField.value === "") {
              inputField.value = apiKey;
              inputField.dispatchEvent(new Event("input", { bubbles: true }));
              inputField.dispatchEvent(new Event("change", { bubbles: true }));
              console.log("RISK Tools Main World: Manifold API Key autopopulated successfully.");
            } else {
              console.log("RISK Tools Main World: API key field not empty, skipping autopopulation.");
            }
          } else {
            console.warn(`RISK Tools Main World: API key input field "${API_KEY_INPUT_SELECTOR}" not found.`);
          }
        },
        world: "MAIN",
      });
    }
  }

  return true;
});

// Set up periodic alarm if not already created
chrome.alarms.get("myAlarm", function (alarm) {
  if (alarm == null) {
    chrome.alarms.create("myAlarm", { periodInMinutes: 1 });
  }
});

// Alarm listener to inject content conditionally (for Manifold)
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'myAlarm') {
    chrome.storage.sync.get("creditScoreState", function (result) {
      if (result.creditScoreState) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs[0] && tabs[0].url && tabs[0].url.startsWith("https://manifold.markets/")) {
            if (!isReservedPathBackground(tabs[0].url)) {
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                  document.body.classList.add("inject-content");
                  chrome.runtime.sendMessage({ message: 'injectCreditScoreBox' });
                }
              });
            } else {
              console.log("RISK Tools Background: Alarm triggered on a reserved path, skipping injection.");
            }
          }
        });
      }
    });
  }
});