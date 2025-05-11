// content.js
window.RISKToolsCard = {};
(function () {

    const creditScoreBoxClass = "risk-credit-box";
    const riskCardPopupClass = "risk-card-popup"; // Class for the popup container

    // Helper function to linearly interpolate between two colors
    function lerpColorRGB(color1, color2, t) {
        const r = Math.round(color1[0] + t * (color2[0] - color1[0]));
        const g = Math.round(color1[1] + t * (color2[1] - color1[1])); // Fixed g interpolation
        const b = Math.round(color1[2] + t * (color2[2] - color1[2])); // Fixed b interpolation
        return `rgb(${r}, ${g}, ${b})`;
    }

    // Function to get the text color based on the score
    function getTextColor(score) {
        if (score >= 900) {
            // For scores between 900 and 1000, interpolate from the softer green (54, 186, 63) to the full green (96, 225, 105)
            const t = (score - 900) / 100;
            return lerpColorRGB([54, 186, 63], [96, 225, 105], t);
        } else if (score >= 800) {
            // For scores between 800 and 899, interpolate from blue (100, 100, 255) to green (96, 225, 105)
            const t = (score - 800) / 100;
            return lerpColorRGB([100, 100, 255], [96, 225, 105], t);
        } else if (score >= 600) {
            // For scores between 600 and 799, interpolate from light blue (50, 150, 200) to blue (100, 100, 255)
            const t = (score - 600) / 200;
            return lerpColorRGB([50, 150, 200], [100, 100, 255], t);
        } else {
            // For scores below 600, interpolate from red (255, 100, 100) to purple (180, 100, 255)
            const t = score / 600;
            return lerpColorRGB([255, 100, 100], [180, 100, 255], t);
        }
    }


    // Function to fetch credit score using the API
    async function fetchCreditScore(username) {
        const response = await fetch(
            `https://risk.markets/api/score?username=${username}`
        );
        if (!response.ok) {
            console.error(`Failed to fetch credit score for ${username}`);
            return null; // Return null if the fetch fails
        }
        const data = await response.json();
        // *** Remove the || 900 default here ***
        return data.creditScore; // Return the fetched score (could be 0)
    }


    // Function to get the container div (flex-row) inside the specific parent
    function getContainerElement() {
        const container = document.querySelector(
            ".bg-canvas-0.w-full.rounded-lg.p-4.flex.flex-col > .flex.flex-col > .mt-2.gap-2.flex.flex-row"
        );
        return container;
    }

    // Function to remove the existing credit score box
    function removeCreditScoreBox() {
        const existingBoxes = document.querySelectorAll(`.${creditScoreBoxClass}`); // Select all elements
        existingBoxes.forEach(box => { // Iterate and remove each one
            box.remove();
        });
        if (existingBoxes.length > 0) {
            console.log(`RISK Tools: Removed ${existingBoxes.length} Credit Score Box(es).`);
        }
        // Also remove any existing popup if it's still there
        removeRiskCardPopup();
    }


    // Function to remove the existing risk card popup
    function removeRiskCardPopup() {
        const existingPopup = document.querySelector(`.${riskCardPopupClass}`);
        if (existingPopup) {
            existingPopup.remove();
            console.log("RISK Tools: Risk Card Popup removed.");
        }
    }


    // Function to add the credit score box
    async function addCreditScoreBox() {
        chrome.storage.local.get('creditScoreState', async function (result) {
            const creditScoreState = result.creditScoreState;
            console.log('Credit score state is:', creditScoreState); // Debug log

            // If toggle is off, do not inject the box
            if (!creditScoreState) {
                console.log("RISK Tools: Credit score box injection is disabled.");
                return;
            }

            const container = getContainerElement();
            if (!container) {
                console.log("RISK Tools: Container element not found, retrying...");
                return;
            }

            // Ensure credit score box isn't already added
            if (document.querySelector(`.${creditScoreBoxClass}`)) {
                console.log("RISK Tools: Credit Score Box already injected, skipping.");
                return;
            }

            const urlParts = window.location.pathname.split("/");
            const username = urlParts[urlParts.length - 1]; // Get the last part of the URL as username

            if (!username || username.length < 1) {
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
            newBox.addEventListener("click", function (e) {
                // Optional: make sure they didn't click inside the popup by accident
                if (e.target.closest("button")) return; // Ignore clicks on buttons (like the 'X')

                window.open(`https://manifold.markets/news/risk`, "_blank");
                // window.open(`https://risk.markets/ext/${username}`, "_blank"); // Open in a new tab
            });
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

            newBox.addEventListener("mouseenter", async function () {
                // Prevent popup from showing if state is off (though this should be handled by addCreditScoreBox)
                 let currentStateResult = await new Promise(resolve => chrome.storage.local.get('creditScoreState', resolve));
                 if (!currentStateResult.creditScoreState) return; // Make sure state is still on

                const rect = newBox.getBoundingClientRect();

                // Remove any existing popup before creating a new one
                removeRiskCardPopup();

                // Create popup element
                const popup = document.createElement("div");
                popup.className = riskCardPopupClass;
                popup.style.position = "absolute";
                popup.style.top = `${rect.top + window.scrollY - 60}px`;
                popup.style.left = `${rect.left + window.scrollX + newBox.offsetWidth + 10}px`;
                popup.style.display = "flex";
                popup.style.flexDirection = "column";
                popup.style.justifyContent = "center";
                popup.style.alignItems = "center";
                popup.style.borderRadius = "10px";
                popup.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
                popup.style.zIndex = "1000";
                popup.style.opacity = "0"; 
                popup.style.transition = "opacity 0.2s ease-in";

                // Loading spinner
                popup.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    width: 300px; /* adjust as needed */
                    height: 144px; /* adjust as needed */
                    padding: 16px;
                    background-color: #1f2937; /* Tailwind bg-canvas-50 fallback */
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    color: white;
                ">
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <style>
                        .spinthing {
                        transform-origin: center;
                        animation: spin 0.40s linear infinite;
                        }
                        @keyframes spin {
                        100% { transform: rotate(360deg); }
                        }
                    </style>
                    <path
                        class="spinthing"
                        d="M12 2a10 10 0 0 0-9.5 7.1c-.2.7.3 1.4 1 1.5s1.4-.3 1.6-1A7.5 7.5 0 0 1 12 4.5c.8 0 1.5-.7 1.5-1.5S12.8 2 12 2z"
                        fill="#a88df8"
                    />
                    </svg>
                </div>`;


                // Append popup to body
                document.body.appendChild(popup);

                // Trigger fade-in for the popup (with loading state)
                setTimeout(() => {
                    popup.style.opacity = "1"; // Fade-in the popup
                }, 10); // Small delay in ms to ensure transition works

                // --- The following block handles fetching and updating the popup content ---
                try {
                    // Ensure card.js has made createRiskCardHTML accessible
                    if (typeof window.RISKToolsCard === 'undefined' || typeof window.RISKToolsCard.createRiskCardHTML !== 'function') {
                        console.error("RISK Tools: card.js or createRiskCardHTML function not available for popup content.");
                        // Update the popup with an error message if already added
                         if(document.body.contains(popup)) { // Check if popup is still in DOM
                             popup.innerHTML = `<div class="p-4 text-white bg-canvas-50 rounded-lg">Error loading card content.</div>`; // MODIFIED THIS LINE
                         }
                        return; // Stop the rest of the logic
                    }

                    const cardContentHtml = await window.RISKToolsCard.createRiskCardHTML(username);

                    if (!cardContentHtml || cardContentHtml.includes("Error loading data")) {
                        console.warn("RISK Tools: Failed to generate card content HTML or encountered an error in card.js.");
                        // Update the popup with an error message if already added
                        if(document.body.contains(popup)) { // Check if popup is still in DOM
                            popup.innerHTML = `<div class="p-4 text-white bg-canvas-50 rounded-lg">Error loading card content.</div>`; // MODIFIED THIS LINE
                        }
                        return; // Stop the rest of the logic
                    }

                    // Update the popup content after the fetch and generation
                    if(document.body.contains(popup)) { // Check if popup is still in DOM before updating
                        popup.innerHTML = cardContentHtml; // MODIFIED THIS LINE
                    }

                } catch (error) {
                    console.error("RISK Tools: Error fetching card data:", error);
                    // Update the popup with an error message if an error occurred
                    if(document.body.contains(popup)) { // Check if popup is still in DOM
                        popup.innerHTML = `<div class="p-4 text-white bg-canvas-50 rounded-lg">Error loading data.</div>`; // ADD THIS LINE
                    }
                }
                // --- End of fetching and updating block ---


                // --- Mouse tracking logic (keep this as it is for hover persistence) ---
                let isOverBoxOrPopup = true;

                function checkLeave() {
                    if (!isOverBoxOrPopup) {
                        // Check if popup is still in DOM before attempting to remove
                        if (document.body.contains(popup)) {
                           document.body.removeChild(popup);
                        }
                        // Remove listeners defensively
                        newBox.removeEventListener("mouseleave", onBoxLeave);
                        // Remove popup listeners only if the popup was successfully added and is still in DOM
                        if(document.body.contains(popup)) {
                           popup.removeEventListener("mouseleave", onPopupLeave);
                           popup.removeEventListener("mouseenter", onPopupEnter);
                        }
                         // DO NOT remove the main newBox mouseenter listener here
                    }
                }

                function onBoxLeave() {
                    isOverBoxOrPopup = false;
                    setTimeout(checkLeave, 100); // small delay to allow entering popup in ms
                }

                function onPopupLeave() {
                    isOverBoxOrPopup = false;
                    setTimeout(checkLeave, 100);
                }

                function onBoxEnter() {
                    isOverBoxOrPopup = true;
                }

                function onPopupEnter() {
                    isOverBoxOrPopup = true;
                }

                newBox.addEventListener("mouseleave", onBoxLeave);
                // Add popup listeners only if the popup element was successfully added and is still in the DOM
                if(document.body.contains(popup)) {
                   popup.addEventListener("mouseleave", onPopupLeave);
                   popup.addEventListener("mouseenter", onPopupEnter);
                }
                // ** Make sure you DON'T have another newBox.addEventListener("mouseenter", onBoxEnter); here **
            });



            // Find all the existing boxes inside the row
            console.log("RISK Tools: Attempting to inject credit score box...");

            // We already checked the state and container existence at the beginning of the function,
            // so this nested block is slightly redundant but can remain if you prefer.
            // The essential logic is below.

            const boxes = container.querySelectorAll(".group.cursor-pointer");
            console.log(`RISK Tools: Found ${boxes.length} boxes in the container.`);

            // Check if a credit score box already exists or if there are already 4 boxes
            if (document.querySelector(`.${creditScoreBoxClass}`) || boxes.length >= 4) {
                console.log("RISK Tools: Credit Score Box already injected or container has 4 or more boxes, skipping.");
                return;
            }

            if (boxes.length === 3) {
                // Inject the new box after the 3rd box
                boxes[2].insertAdjacentElement('afterend', newBox);
                console.log("RISK Tools: Credit Score Box injected after the third item.");
            } else {
                // If there aren't exactly 3 boxes, append the new box to the container
                container.appendChild(newBox);
                console.log("RISK Tools: Credit Score Box appended to the container.");
            }

        });
    }

    // Initially check the state and act accordingly
    chrome.storage.local.get('creditScoreState', function (result) {
        if (result.creditScoreState) {
            addCreditScoreBox();
        }
    });

    // Listen for URL changes from background.js
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.message === 'urlChanged') {
            console.log('New URL: ' + request.url); // URL passed from background.js

            // Remove the existing credit score box and any associated popup
            removeCreditScoreBox();

            // Wait a bit before trying to re-inject the credit score box
            setTimeout(async () => {
                try {
                    await addCreditScoreBox();
                } catch (error) {
                    console.error("RISK Tools: Failed to inject credit score box on first attempt. Retrying...", error);
                    setTimeout(async () => {
                        try {
                            await addCreditScoreBox();
                        } catch (error) {
                            console.error("RISK Tools: Failed to inject credit score box on second attempt. Stopping...", error);
                        }
                    }, 1500); // Retry after 1.5 seconds
                }
            }, 1500); // Wait 1.5 seconds before attempting to reinject!
        }
    });

})();
