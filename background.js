// Handle extension installation and initial setup of the toggle state
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.get('creditScoreState', function (result) {
      if (result.creditScoreState === undefined) {
          // Set default to false if not set
          chrome.storage.sync.set({ creditScoreState: false });
      }
  });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // Check if the URL has changed
    if (changeInfo.url) {
        // Send the new URL to content script
        chrome.tabs.sendMessage(tabId, {
            message: 'urlChanged',
            url: changeInfo.url
        });
  
        // Trigger fade-to-black effect (send message to content.js)
        chrome.tabs.sendMessage(tabId, {
            message: 'fadeToBlack'
        });
    }
  });
  

// Listener for when the toggle state changes in popup
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === 'toggleStateChanged') {
      // Save the new state of the toggle in chrome.storage
      chrome.storage.sync.set({ creditScoreState: message.state }, function () {
          // Log for debugging
          console.log('Toggle state saved: ' + message.state);
      });
  }
});

// Function to handle alarms or periodic checks if needed
chrome.alarms.get('myAlarm', function (alarm) {
  if (alarm == null) {
      chrome.alarms.create('myAlarm', { periodInMinutes: 1 });
  }
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  chrome.storage.sync.get('creditScoreState', function (result) {
      if (result.creditScoreState) {
          // Trigger content injection based on the toggle state
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
              chrome.tabs.executeScript(tabs[0].id, {
                  code: 'document.body.classList.add("inject-content");'
              });
          });
      }
  });
});

// Listen for tab updates and check for URL changes
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // Check if the URL has changed
  if (changeInfo.url) {
      // Send the new URL to content script
      chrome.tabs.sendMessage(tabId, {
          message: 'urlChanged',
          url: changeInfo.url
      });
  }
});
