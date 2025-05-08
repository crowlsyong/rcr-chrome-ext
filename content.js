(function () {

    // content.js

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

    // Function to remove the existing credit score box
    function removeCreditScoreBox() {
        const existingBox = document.querySelector(`.${creditScoreBoxClass}`);
        if (existingBox) {
            existingBox.remove();
            console.log("RISK Tools: Credit Score Box removed.");
        }
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
                // window.open(`https://risk.deno.dev/ext/${username}`, "_blank"); // Open in a new tab
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
            newBox.addEventListener("mouseenter", function () {
                const rect = newBox.getBoundingClientRect();

                // Create popup element
                const popup = document.createElement("div");
                popup.style.position = "absolute";
                popup.style.top = `${rect.top + window.scrollY - 60}px`;
                popup.style.left = `${rect.left + window.scrollX + newBox.offsetWidth + 10}px`;
                popup.style.display = "flex";
                popup.style.flexDirection = "column";
                popup.style.justifyContent = "center";
                popup.style.alignItems = "center";
                popup.style.backgroundColor = "#0F1729";
                popup.style.borderRadius = "10px";
                popup.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
                popup.style.zIndex = "1000";
                popup.style.opacity = "0";  // Initial opacity for popup
                popup.style.transition = "opacity 0.3s ease-in";  // Smooth fade-in transition for popup

                // Create iframe element
                const iframe = document.createElement("iframe");
                iframe.src = `https://risk.deno.dev/ext/${username}`;
                iframe.style.width = "350px";
                iframe.style.height = "200px";
                iframe.style.border = "none";
                iframe.style.overflow = "hidden";
                iframe.style.backgroundColor = "#0F1729";
                iframe.style.opacity = "0";  // Initial opacity for iframe
                iframe.style.transition = "opacity 0.2s ease-in";  // Smooth fade-in transition for iframe

                // Append iframe to popup and popup to body
                popup.appendChild(iframe);
                document.body.appendChild(popup);

                // Trigger fade-in for both popup and iframe
                setTimeout(() => {
                    popup.style.opacity = "1";  // Fade-in the popup
                    iframe.style.opacity = "1";  // Fade-in the iframe
                }, 10);  // Small delay to ensure transition works

                let isOverBoxOrPopup = true;

                function checkLeave() {
                    if (!isOverBoxOrPopup) {
                        document.body.removeChild(popup);
                        newBox.removeEventListener("mouseleave", onBoxLeave);
                        popup.removeEventListener("mouseleave", onPopupLeave);
                        popup.removeEventListener("mouseenter", onPopupEnter);
                        newBox.removeEventListener("mouseenter", onBoxEnter);
                    }
                }

                function onBoxLeave() {
                    isOverBoxOrPopup = false;
                    setTimeout(checkLeave, 60); // small delay to allow entering popup
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
                popup.addEventListener("mouseleave", onPopupLeave);
                popup.addEventListener("mouseenter", onPopupEnter);
                newBox.addEventListener("mouseenter", onBoxEnter);
            });




            // Find all the existing boxes inside the row
            console.log("RISK Tools: Attempting to inject credit score box...");

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

                const boxes = container.querySelectorAll(".group.cursor-pointer");
                console.log(`RISK Tools: Found ${boxes.length} boxes in the container.`);

                if (boxes.length === 3) {
                    // Inject the new box after the 3rd box
                    boxes[2].insertAdjacentElement('afterend', newBox);
                    console.log("RISK Tools: Credit Score Box injected after the third item.");
                } else {
                    console.log("RISK Tools: Skipping injection, found more than 3 boxes.");
                }
            });

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
            // You can now inject your content or handle other actions here

            // Remove the existing credit score box
            removeCreditScoreBox();

            // Wait 1 second before trying to re-inject the credit score box
            setTimeout(async () => {
                try {
                    await addCreditScoreBox();
                } catch (error) {
                    console.error("RISK Tools: Failed to inject credit score box on first attempt. Retrying...");
                    setTimeout(async () => {
                        try {
                            await addCreditScoreBox();
                        } catch (error) {
                            console.error("RISK Tools: Failed to inject credit score box on second attempt. Stopping...");
                        }
                    }, 1500); // Retry after 1 second
                }
            }, 1500); // Wait 1.5 second before attempting to reinject!
        }
    });

})();
