// popup.js

document.addEventListener('DOMContentLoaded', function () {
    const checkbox = document.getElementById('credit-score-toggle');

    chrome.storage.local.get('creditScoreState', function(result) {
        if (result.creditScoreState !== undefined) {
            checkbox.checked = result.creditScoreState;
        }
    });

    checkbox.addEventListener('change', function() {
        chrome.storage.local.set({ 'creditScoreState': checkbox.checked }, function() {
            console.log('State saved: ' + checkbox.checked);

            // After saving, reload the active tab
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        });
    });
});
