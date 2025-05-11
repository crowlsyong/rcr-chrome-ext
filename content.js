// content.js
window.RISKToolsCard = {};
(function () {

    const creditScoreBoxClass = "risk-credit-box";
    const riskCardPopupClass = "risk-card-popup"; // Class for the popup container
    const targetContainerSelector = ".bg-canvas-0.w-full.rounded-lg.p-4.flex.flex-col > .flex.flex-col > .mt-2.gap-2.flex.flex-row"; // Selector for the container
    let observer = null; // To hold our MutationObserver instance
    let isInjecting = false; // Flag to prevent multiple simultaneous injections

    // Helper function to linearly interpolate between two colors
    function lerpColorRGB(color1, color2, t) {
        const r = Math.round(color1[0] + t * (color2[0] - color1[0]));
        const g = Math.round(color1[1] + t * (color2[1] - color1[1])); // Fixed typo here
        const b = Math.round(color1[2] + t * (color2[2] - color1[2]));
        return `rgb(${r}, ${g}, ${b})`;
    }

    // Function to get the text color based on the score
    function getTextColor(score) {
        if (score >= 800) {
            const t = (score - 800) / 200; // 800 → 1000
            return lerpColorRGB([130, 130, 255], [130, 255, 160], t); // brighter soft purple → brighter soft green
        } else if (score >= 600) {
            const t = (score - 600) / 200; // 600 → 800
            return lerpColorRGB([100, 200, 255], [130, 130, 255], t); // brighter soft blue → brighter soft purple
        } else {
            const t = score / 600; // 0 → 600
            return lerpColorRGB([255, 130, 130], [200, 130, 255], t); // brighter soft red → brighter soft purple
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
        return data.creditScore; // Return the fetched score (could be 0)
    }


    // Function to get the container div (flex-row) inside the specific parent
    function getContainerElement() {
        return document.querySelector(targetContainerSelector);
    }

    // Function to remove ALL existing credit score boxes
    function removeCreditScoreBoxes() {
        const existingBoxes = document.querySelectorAll(`.${creditScoreBoxClass}`);
        existingBoxes.forEach(box => {
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
        if (isInjecting) {
            console.log("RISK Tools: Injection in progress, skipping.");
            return;
        }

        isInjecting = true; // Set flag

        chrome.storage.local.get('creditScoreState', async function (result) {
            const creditScoreState = result.creditScoreState;
            console.log('Credit score state is:', creditScoreState);

            if (!creditScoreState) {
                console.log("RISK Tools: Credit score box injection is disabled.");
                isInjecting = false; // Reset flag
                return;
            }

            const container = getContainerElement();
            if (!container) {
                console.log("RISK Tools: Container element not found.");
                isInjecting = false; // Reset flag
                return; // Container not found, wait for the observer
            }

            // Before injecting, remove any potential leftovers
            removeCreditScoreBoxes();

            const urlParts = window.location.pathname.split("/");
            const username = urlParts[urlParts.length - 1];

            if (!username || username.length < 1) {
                console.warn("RISK Tools: Invalid username");
                isInjecting = false; // Reset flag
                return;
            }

            const creditScore = await fetchCreditScore(username);
            if (creditScore === null) {
                console.warn("RISK Tools: Failed to get the credit score, using default.");
                // You might want to handle this case, perhaps inject a box indicating an error
                isInjecting = false; // Reset flag
                return; // Don't inject if score fetch failed
            }

            const newBox = document.createElement("div");
            newBox.className = "group cursor-pointer select-none rounded px-2 py-1 transition-colors opacity-[0.75] hover:opacity-100 bg-canvas-50 text-ink-1000 risk-credit-box";
            newBox.addEventListener("click", function (e) {
                if (e.target.closest("button")) return;
                window.open(`https://manifold.markets/news/risk`, "_blank");
            });

            const scoreColor = getTextColor(creditScore);

            newBox.innerHTML = `
                <div class="flex flex-col">
                    <div class="items-center whitespace-nowrap font-bold transition-all bg-canvas-50 text-ink-1000 flex flex-row">
                        <span class="inline-block" style="font-size: 1em; margin-right: 0.1em;">🦝</span>
                        <span style="color: ${scoreColor};">${creditScore}</span>
                    </div>
                    <div class="text-ink-600 mx-auto -mt-1 text-xs transition-all">credit score</div>
                </div>
            `;

            newBox.addEventListener("mouseenter", async function () {
                 // Prevent popup from showing if state is off (though this should be handled by addCreditScoreBox)
                 let currentStateResult = await new Promise(resolve => chrome.storage.local.get('creditScoreState', resolve));
                 if (!currentStateResult.creditScoreState) return;

                const rect = newBox.getBoundingClientRect();
                removeRiskCardPopup();

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

                if (typeof window.RISKToolsCard === 'undefined' || typeof window.RISKToolsCard.createRiskCardHTML !== 'function') {
                    console.error("RISK Tools: card.js or createRiskCardHTML function not available for popup content.");
                    popup.innerHTML = `<div class="p-4 text-white">Error loading card content.</div>`;
                     document.body.appendChild(popup);
                     setTimeout(() => { popup.style.opacity = "1"; }, 10);
                     return;
                }

                const cardContentHtml = await window.RISKToolsCard.createRiskCardHTML(username);

                if (!cardContentHtml || cardContentHtml.includes("Error loading data")) {
                    console.warn("RISK Tools: Failed to generate card content HTML or encountered an error in card.js.");
                    popup.innerHTML = `<div class="p-4 text-white">Error loading card content.</div>`;
                    document.body.appendChild(popup);
                    setTimeout(() => { popup.style.opacity = "1"; }, 10);
                    return;
                }

                popup.innerHTML = cardContentHtml;
                document.body.appendChild(popup);
                setTimeout(() => {
                    popup.style.opacity = "1";
                }, 10);

                let isOverBoxOrPopup = true;

                function checkLeave() {
                    if (!isOverBoxOrPopup) {
                        if (document.body.contains(popup)) { // Check if popup is still in DOM before removing
                           document.body.removeChild(popup);
                        }
                        // Remove listeners defensively
                        newBox.removeEventListener("mouseleave", onBoxLeave);
                        popup.removeEventListener("mouseleave", onPopupLeave);
                        popup.removeEventListener("mouseenter", onPopupEnter);
                        newBox.removeEventListener("mouseenter", onBoxEnter);
                    }
                }

                function onBoxLeave() {
                    isOverBoxOrPopup = false;
                    setTimeout(checkLeave, 60);
                }

                function onPopupLeave() {
                    isOverBoxOrPopup = false;
                    setTimeout(checkLeave, 60);
                }

                function onBoxEnter() {
                    isOverBoxOrPopup = true;
                }

                function onPopupEnter() {
                    isOverBoxOrPopup = true;
                }

                newBox.addEventListener("mouseleave", onBoxLeave);
                // Add these listeners only if the popup was successfully added
                if(document.body.contains(popup)) {
                    popup.addEventListener("mouseleave", onPopupLeave);
                    popup.addEventListener("mouseenter", onPopupEnter);
                }
                newBox.addEventListener("mouseenter", onBoxEnter);
            });


            const boxes = container.querySelectorAll(".group.cursor-pointer");
            console.log(`RISK Tools: Found ${boxes.length} boxes in the container before adding.`);

            if (boxes.length >= 3) { // Use >= in case there are more than 3 original boxes
                boxes[2].insertAdjacentElement('afterend', newBox);
                console.log("RISK Tools: Credit Score Box injected after the third item.");
            } else {
                container.appendChild(newBox);
                console.log("RISK Tools: Credit Score Box appended to the container.");
            }

            isInjecting = false; // Reset flag
        });
    }

    // Function to start observing the DOM for the target container
    function observeForContainer() {
        if (observer) {
            observer.disconnect(); // Disconnect previous observer if exists
        }

        const body = document.body;
        if (!body) {
            console.error("RISK Tools: Document body not found for observer.");
            return;
        }

        observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    const container = getContainerElement();
                    if (container) {
                        console.log("RISK Tools: Target container found by observer.");
                        observer.disconnect(); // Stop observing once found
                        // Add a small delay to ensure child elements are rendered
                        setTimeout(addCreditScoreBox, 100); // Adjust delay if needed
                    }
                }
            });
        });

        // Start observing the body for changes in its children
        observer.observe(body, { childList: true, subtree: true });
        console.log("RISK Tools: Started observing for target container.");
    }

    // Initial setup: remove existing boxes and start observing
    removeCreditScoreBoxes();
    observeForContainer();

    // Listen for URL changes from background.js
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.message === 'urlChanged') {
            console.log('New URL detected: ' + request.url);
            // On URL change, remove existing boxes and start observing again
            removeCreditScoreBoxes();
            observeForContainer();
        }
    });

})();
