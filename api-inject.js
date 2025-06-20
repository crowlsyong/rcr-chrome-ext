// api-inject.js
// This script runs only on risk.markets to handle API key autopopulation.

(async function () {
    const USER_WEBSITE_DOMAIN = "https://risk.markets";
    const API_KEY_INPUT_SELECTOR = "#api-key"; // The ID of your API key input field

    function initiateManifoldApiKeyPopulation() {
        console.log(
            "RISK Tools (risk.markets): Initiating API key population."
        );

        chrome.storage.local.get("manifoldApiKey", function (result) {
            const apiKey = result.manifoldApiKey;
            if (apiKey) {
                // Send the API key to the background script for Main World injection
                chrome.runtime.sendMessage({ action: "populateApiKey", apiKey: apiKey }, function (response) {
                    if (chrome.runtime.lastError) {
                        console.error("RISK Tools (risk.markets): Error sending populateApiKey message:", chrome.runtime.lastError.message);
                    }
                });
            } else {
                console.log("RISK Tools (risk.markets): No Manifold API Key stored in extension.");
            }
        });
    }

    // --- Apply a delay for the API key population on risk.markets ---
    // This delay is specific to this content script for this domain.
    const delayMs = 500; // 500 milliseconds = 0.5 seconds
    console.log(`RISK Tools (risk.markets): Delaying API key population by ${delayMs}ms.`);
    setTimeout(initiateManifoldApiKeyPopulation, delayMs);

})(); // End of async IIFE