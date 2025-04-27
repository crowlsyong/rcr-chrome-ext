(function () {
    const creditScoreBoxClass = "risk-credit-box";

    // Helper function to linearly interpolate between two colors
    function lerpColorRGB(color1, color2, t) {
        const r = Math.round(color1[0] + t * (color2[0] - color1[0]));
        const g = Math.round(color1[1] + t * (color2[1] - color1[1]));
        const b = Math.round(color1[2] + t * (color2[2] - color1[2]));
        return `rgb(${r}, ${g}, ${b})`;
    }

    // Function to get the text color based on the score
    function getTextColor(score) {
        if (score >= 800) {
            const t = (score - 800) / 200; // 800 → 1000
            return lerpColorRGB([100, 100, 255], [96, 225, 105], t); // soft purple → soft green
        } else if (score >= 600) {
            const t = (score - 600) / 200; // 600 → 800
            return lerpColorRGB([50, 150, 200], [100, 100, 255], t); // soft blue → soft purple
        } else {
            const t = score / 600; // 0 → 600
            return lerpColorRGB([255, 100, 100], [180, 100, 255], t); // soft red → soft purple
        }
    }

    // Function to fetch credit score using the API
    async function fetchCreditScore(username) {
        const response = await fetch(
            `https://risk.deno.dev/api/score?username=${username}`
        );
        if (!response.ok) {
            console.error(`Failed to fetch credit score for ${username}`);
            return null;
        }
        const data = await response.json();
        return data.creditScore || 900; // Return the fetched score or default to 900 if not found
    }

    // Function to get the container div (flex-row) inside the specific parent
    function getContainerElement() {
        const container = document.querySelector(
            ".bg-canvas-0.w-full.rounded-lg.p-4.flex.flex-col > .flex.flex-col > .mt-2.gap-2.flex.flex-row"
        );
        return container;
    }

    // Function to add the credit score box
    async function addCreditScoreBox() {
        chrome.storage.local.get('creditScoreState', async function (result) {
            const creditScoreState = result.creditScoreState;
            console.log('Credit score state is:', creditScoreState);  // Debug log

            // If toggle is off, do not inject the box
            if (!creditScoreState) {
                console.log("RISK Tools: Credit score box injection is disabled.");
                return;
            }

            const container = getContainerElement();
            if (!container) {
                console.warn("RISK Tools: Container element not found, retrying...");
                return;
            }

            // Ensure credit score box isn't already added
            if (document.querySelector(`.${creditScoreBoxClass}`)) {
                console.log("RISK Tools: Credit Score Box already injected, skipping.");
                return;
            }

            const urlParts = window.location.pathname.split("/");
            const username = urlParts[urlParts.length - 1]; // Get the last part of the URL as username

            if (!username || username.length < 3) {
                console.warn("RISK Tools: Invalid username");
                return;
            }

            const creditScore = await fetchCreditScore(username);
            if (creditScore === null) {
                console.warn("RISK Tools: Failed to get the credit score, using default.");
            }

            // Create the new credit score box
            const newBox = document.createElement("div");
            newBox.className = "group cursor-pointer select-none rounded px-2 py-1 transition-colors opacity-[0.75] hover:opacity-100 bg-canvas-50 text-ink-1000 risk-credit-box";

            // Get the text color based on the credit score
            const scoreColor = getTextColor(creditScore);

            newBox.innerHTML = `
                <div class="flex flex-col">
                    <div class="items-center whitespace-nowrap font-bold transition-all bg-canvas-50 text-ink-1000 flex flex-row">
                        <span class="inline-block" style="font-size: 1em; margin-right: 0.1em;">🦝</span>
                        <span style="color: ${scoreColor};">${creditScore}</span> <!-- Apply dynamic color -->
                    </div>
                    <div class="text-ink-600 mx-auto -mt-1 text-xs transition-all">credit score</div>
                </div>
            `;

            // Find all the existing boxes inside the row
            const boxes = container.querySelectorAll(".group.cursor-pointer");

            // Check if there are at least 3 boxes (since we want to add after the third one)
            if (boxes.length >= 3) {
                // Insert the new box as the 4th item in the row (after the 3rd box)
                boxes[2].insertAdjacentElement('afterend', newBox);
                console.log("RISK Tools: Credit Score Box injected after the third item.");
            } else {
                console.warn("RISK Tools: Not enough boxes found, retrying...");
            }
        });
    }

    // Initially check the state and act accordingly
    chrome.storage.local.get('creditScoreState', function(result) {
        if (result.creditScoreState) {
            addCreditScoreBox();
        }
    });
})();
