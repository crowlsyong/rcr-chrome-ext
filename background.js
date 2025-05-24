// Handle extension installation and initial setup of the toggle state
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.get("creditScoreState", function (result) {
    if (result.creditScoreState === undefined) {
      // Set default to false if not set
      chrome.storage.sync.set({ creditScoreState: false });
    }
  });
});

// List of reserved paths (hardcoded in background script)
const RESERVED_PATHS_BACKGROUND = [
  "_next",
  "about",
  "ad",
  "add-funds",
  "ads",
  "analytics",
  "api",
  "browse",
  "calibration",
  "card",
  "cards",
  "career",
  "careers",
  "charity",
  "common",
  "contact",
  "contacts",
  "cowp",
  "create",
  "date-docs",
  "dashboard",
  "discord",
  "discord-bot",
  "dream",
  "embed",
  "facebook",
  "find",
  "github",
  "google",
  "group",
  "groups",
  "help",
  "home",
  "jobs",
  "leaderboard",
  "leaderboards",
  "league",
  "leagues",
  "link",
  "linkAccount",
  "links",
  "live",
  "login",
  "lootbox",
  "mana-auction",
  "manifest",
  "markets",
  "messages",
  "mtg",
  "news",
  "notifications",
  "og-test",
  "payments",
  "portfolio",
  "privacy",
  "profile",
  "public",
  "questions",
  "referral",
  "referrals",
  "send",
  "server-sitemap",
  "sign-in",
  "sign-in-waiting",
  "sitemap",
  "slack",
  "stats",
  "styles",
  "swipe",
  "team",
  "terms",
  "tournament",
  "tournaments",
  "twitch",
  "twitter",
  "umami",
  "user",
  "users",
  "versus",
  "web",
  "welcome",
];

// Function to check if a URL path is a reserved path
function isReservedPathBackground(url) {
  try {
    const urlObject = new URL(url);
    const pathSegments = urlObject.pathname
      .split("/")
      .filter((segment) => segment !== ""); // Split and remove empty segments
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      return RESERVED_PATHS_BACKGROUND.includes(lastSegment);
    }
    return false; // No path segments, not a reserved path
  } catch (e) {
    console.error("RISK Tools Background: Error parsing URL:", e);
    return false; // Assume not a reserved path on error
  }
}

// Handle tab updates (URL changes) and message content script
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (
    changeInfo.url &&
    tab.url &&
    tab.url.startsWith("https://manifold.markets/")
  ) {
    // Check if the URL path is a reserved path before sending messages
    if (isReservedPathBackground(changeInfo.url)) {
      console.log("RISK Tools Background: Skipping messages for reserved path:", changeInfo.url);
      // Remove any existing box on reserved paths
      chrome.tabs.sendMessage(tabId, { message: 'removeCreditScoreBox' }, function(response) {
           if (chrome.runtime.lastError) {
                // Ignore error if content script is not present
           }
      });
      return; // Don't send injection messages for reserved paths
    }

    // Start the timer when URL changes
    const startTime = performance.now(); // Start time when URL changes

    // Send the new URL to content script
    chrome.tabs.sendMessage(
      tabId,
      {
        message: "urlChanged",
        url: changeInfo.url,
      },
      function (response) {
        if (chrome.runtime.lastError) {
          console.warn(
            "Content script not found (urlChanged):",
            chrome.runtime.lastError.message
          );
        }
      }
    );

    // Trigger fade-to-black effect (consider if you want this on all Manifold pages or just user profiles)
    // For now, sending on any Manifold page change
     chrome.tabs.sendMessage(
       tabId,
       {
         message: "fadeToBlack",
       },
       function (response) {
         if (chrome.runtime.lastError) {
           console.warn(
             "Content script not found (fadeToBlack):",
             chrome.runtime.lastError.message
           );
         }
       }
     );


    // Inject content message
    chrome.tabs.sendMessage(
      tabId,
      {
        message: "injectCreditScoreBox",
      },
      function (response) {
        if (chrome.runtime.lastError) {
          console.warn(
            "Content script not found (injectCreditScoreBox):",
            chrome.runtime.lastError.message
          );
        }

        // Calculate the time elapsed since the URL change and log it
        const elapsedTime = performance.now() - startTime;
        console.log(
          `RISK Tools Background: Credit Score Box message sent after URL change. Time taken: ${elapsedTime.toFixed(
            2
          )} ms`
        );
      }
    );
  } else if (changeInfo.url) {
      // If the URL changes to a non-Manifold page, remove the box
      chrome.tabs.sendMessage(tabId, { message: 'removeCreditScoreBox' }, function(response) {
          if (chrome.runtime.lastError) {
              // Ignore error if content script is not present
          }
      });
  }
});

// Listener for toggle state change from popup
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "toggleStateChanged") {
    chrome.storage.sync.set({ creditScoreState: message.state }, function () {
      console.log("Toggle state saved: " + message.state);
      // When the state changes, potentially re-inject or remove the box
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.startsWith("https://manifold.markets/")) {
             if (message.state) {
                 // If enabled, check if it's a user profile and inject
                  if (!isReservedPathBackground(tabs[0].url)) {
                       chrome.tabs.sendMessage(tabs[0].id, { message: 'urlChanged', url: tabs[0].url }); // Use urlChanged to trigger full process
                  } else {
                      console.log("RISK Tools Background: Toggle enabled but current page is a reserved path, skipping injection.");
                  }
             } else {
                 // If disabled, remove the box
                  chrome.tabs.sendMessage(tabs[0].id, { message: 'removeCreditScoreBox' });
             }
        }
      });
    });
  }
});

// Set up periodic alarm if not already created
chrome.alarms.get("myAlarm", function (alarm) {
  if (alarm == null) {
    chrome.alarms.create("myAlarm", { periodInMinutes: 1 });
  }
});

// Alarm listener to inject content conditionally
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'myAlarm') {
    chrome.storage.sync.get("creditScoreState", function (result) {
      if (result.creditScoreState) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs[0] && tabs[0].url && tabs[0].url.startsWith("https://manifold.markets/")) {
            // Check if the current URL is a user profile before trying to inject
            if (!isReservedPathBackground(tabs[0].url)) {
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                  // This scripting injection might be redundant if urlChanged/injectCreditScoreBox messages
                  // are reliably handled by the content script.
                  // Consider removing this if the message-based injection is sufficient.
                   document.body.classList.add("inject-content");

                   // Also send the message to trigger the content script logic
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
