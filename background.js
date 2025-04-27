// background.js

chrome.runtime.onInstalled.addListener(function () {
    // Set the initial state of the toggle if it's not already set
    chrome.storage.sync.get('creditScoreState', function (result) {
      if (result.creditScoreState === undefined) {
        // Set default to false if not set
        chrome.storage.sync.set({ creditScoreState: false });
      }
    });
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
        // This would trigger an event to inject the content if needed
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.executeScript(tabs[0].id, {
            code: 'document.body.classList.add("inject-content");'
          });
        });
      }
    });
  });
  
  