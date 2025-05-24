// Handle extension installation and initial setup of the toggle state
chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.sync.get('creditScoreState', function (result) {
        if (result.creditScoreState === undefined) {
            // Set default to false if not set
            chrome.storage.sync.set({ creditScoreState: false });
        }
    });
});

// Handle tab updates (URL changes) and message content script
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.url) {
        // Start the timer when URL changes
        const startTime = performance.now();  // Start time when URL changes

        // Send the new URL to content script
        chrome.tabs.sendMessage(tabId, {
            message: 'urlChanged',
            url: changeInfo.url
        }, function (response) {
            if (chrome.runtime.lastError) {
                console.warn('Content script not found (urlChanged):', chrome.runtime.lastError.message);
            }
        });

        // Trigger fade-to-black effect
        chrome.tabs.sendMessage(tabId, {
            message: 'fadeToBlack'
        }, function (response) {
            if (chrome.runtime.lastError) {
                console.warn('Content script not found (fadeToBlack):', chrome.runtime.lastError.message);
            }
        });

        // Inject content and measure time taken
        chrome.tabs.sendMessage(tabId, {
            message: 'injectCreditScoreBox'
        }, function (response) {
            if (chrome.runtime.lastError) {
                console.warn('Content script not found (injectCreditScoreBox):', chrome.runtime.lastError.message);
            }

            // Calculate the time elapsed since the URL change and log it
            const elapsedTime = performance.now() - startTime;
            console.log(`RISK Tools: Credit Score Box injected after URL change. Time taken: ${elapsedTime.toFixed(2)} ms`);
        });
    }
});


// Listener for toggle state change from popup
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'toggleStateChanged') {
        chrome.storage.sync.set({ creditScoreState: message.state }, function () {
            console.log('Toggle state saved: ' + message.state);
        });
    }
});

// Set up periodic alarm if not already created
chrome.alarms.get('myAlarm', function (alarm) {
    if (alarm == null) {
        chrome.alarms.create('myAlarm', { periodInMinutes: 1 });
    }
});

// Alarm listener to inject content conditionally
chrome.alarms.onAlarm.addListener(function (alarm) {
    chrome.storage.sync.get('creditScoreState', function (result) {
        if (result.creditScoreState) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0]) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: () => {
                            document.body.classList.add("inject-content");
                        }
                    });
                }
            });
        }
    });
});
