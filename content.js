// content.js
window.RISKToolsCard = window.RISKToolsCard || {}; // Ensure namespace exists
(async function () { // Use an async IIFE to use await for fetching JSON
  const creditScoreBoxClass = "risk-credit-box";
  const riskCardPopupClass = "risk-card-popup"; // Class for the popup container
  const usernameSpanSelector = "span.text-ink-400.text-sm.sm\\:text-base"; // Selector for the username span

  let RESERVED_PATHS = []; // Initialize an empty array

  // Function to fetch reserved paths from JSON
  async function fetchReservedPaths() {
    try {
      const response = await fetch(chrome.runtime.getURL('data/reservedPaths.json')); // Adjust path if needed
      if (!response.ok) {
        console.error(`RISK Tools: Failed to fetch reserved paths. Status: ${response.status}`);
        return [];
      }
      return response.json();
    } catch (error) {
      console.error('RISK Tools: Error fetching reserved paths:', error);
      return [];
    }
  }

  // Fetch reserved paths when the script starts
  RESERVED_PATHS = await fetchReservedPaths();
  console.log("RISK Tools: Reserved paths loaded:", RESERVED_PATHS);

  // Function to check if a path is a reserved path
  function isReservedPath(path) {
    // Ensure RESERVED_PATHS is loaded before checking
    if (RESERVED_PATHS.length === 0) {
      console.warn("RISK Tools: Reserved paths not loaded yet. Cannot check path:", path);
      // In a real scenario, you might want to wait or handle this differently.
      // For now, we'll assume it's not a reserved path if the list isn't loaded.
      return false;
    }
    return RESERVED_PATHS.includes(path);
  }

  // Helper function to linearly interpolate between two colors
  function lerpColorRGB(color1, color2, t) {
    const r = Math.round(color1[0] + t * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + t * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + t * (color2[2] - color1[2]));
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Function to get the text color based on the score
  function getTextColor(score) {
    if (score === null || typeof score === "undefined") {
      return "#CBD5E0"; // lighter gray, closer to white (e.g., Tailwind's text-gray-300)
    }
    if (score >= 900) {
      const t = (score - 900) / 100;
      return lerpColorRGB([144, 226, 153], [200, 255, 210], t); // bright greens
    } else if (score >= 800) {
      const t = (score - 800) / 100;
      return lerpColorRGB([170, 170, 255], [200, 255, 210], t); // soft blue to green
    } else if (score >= 600) {
      const t = (score - 600) / 200;
      return lerpColorRGB([150, 200, 240], [170, 170, 255], t); // sky blue to soft blue
    } else {
      const t = score / 600;
      return lerpColorRGB([255, 160, 160], [230, 160, 255], t); // pinks and lavenders
    }
  }

  // Function to fetch full user data using the API
  async function fetchUserData(username) {
    try {
      const response = await fetch(
        `https://risk.markets/api/score?username=${username}`
      );
      if (!response.ok) {
        console.error(
          `RISK Tools: Failed to fetch user data for ${username}. Status: ${response.status}`
        );
        return null;
      }
      const data = await response.json();
      return data; // Return the full user data object
    } catch (error) {
      console.error(
        `RISK Tools: Error fetching user data for ${username}:`,
        error
      );
      return null;
    }
  }

  // Function to get the container div
  function getContainerElement() {
    return document.querySelector(
      ".bg-canvas-0.w-full.rounded-lg.p-4.flex.flex-col > .flex.flex-col > .mt-2.gap-2.flex.flex-row"
    );
  }

  // Function to remove the existing credit score box
  function removeCreditScoreBox() {
    const existingBoxes = document.querySelectorAll(`.${creditScoreBoxClass}`);
    existingBoxes.forEach((box) => {
      box.remove();
    });
    if (existingBoxes.length > 0) {
      console.log(
        `RISK Tools: Removed ${existingBoxes.length} Credit Score Box(es).`
      );
    }
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

  // Function to create a styled message div for errors or info
  function createPopupMessageDiv(message) {
    return `<div class="p-4 text-white bg-canvas-50 rounded-lg" style="width: 300px; min-height: 144px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #1f2937; border-radius: 10px; box-sizing: border-box;">${message}</div>`;
  }

  // Function to add the credit score box
  async function addCreditScoreBox() {
    chrome.storage.local.get("creditScoreState", async function (result) {
      const creditScoreState = result.creditScoreState;
      console.log(
        "RISK Tools: addCreditScoreBox - Credit score state is:",
        creditScoreState
      );

      if (!creditScoreState) {
        console.log("RISK Tools: addCreditScoreBox - Injection is disabled.");
        return;
      }

      const container = getContainerElement();
      if (!container) {
        console.warn(
          "RISK Tools: addCreditScoreBox - Container element not found. This should not happen if wait for username span was successful."
        );
        return;
      }

      if (document.querySelector(`.${creditScoreBoxClass}`)) {
        console.log(
          "RISK Tools: addCreditScoreBox - Credit Score Box already injected, skipping."
        );
        return;
      }

      const urlParts = window.location.pathname.split("/");
      const username = urlParts[urlParts.length - 1];

      // Check if the last part of the URL is a reserved path before proceeding
      if (!username || username.length < 1 || isReservedPath(username)) {
        console.log(
          `RISK Tools: Skipping injection for non-username path: ${window.location.pathname}`
        );
        return;
      }

      // --- Function to attempt injecting the box ---
      const attemptInjection = (attempt) => {
        console.log(`RISK Tools: Attempting injection (Attempt ${attempt})...`);
        const boxes = container.querySelectorAll(".group.cursor-pointer");

        // Double-check if the box already exists before trying to inject
        if (document.querySelector(`.${creditScoreBoxClass}`)) {
          console.log(
            `RISK Tools: Box already exists during attempt ${attempt}, skipping injection.`
          );
          return document.querySelector(`.${creditScoreBoxClass}`); // Return the existing box
        }

        if (boxes.length >= 4) {
          console.warn(
            `RISK Tools: Container already has ${boxes.length} boxes, cannot inject.`
          );
          return false; // Failed to inject due to full container
        }

        const newBox = document.createElement("div");
        newBox.className =
          "group cursor-pointer select-none rounded px-2 py-1 transition-colors opacity-[0.75] hover:opacity-100 bg-canvas-50 text-ink-1000 risk-credit-box";
        // Initial content: a loader
        newBox.innerHTML = `
                        <div class="flex flex-col">
                            <div class="items-center px-2 py-1 whitespace-nowrap font-bold transition-all bg-canvas-50 text-ink-1000 flex flex-row justify-center">
                                <svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                            </div>
                        </div>
                        `;

        // Insert the box into the DOM
        if (boxes.length === 3) {
          boxes[2].insertAdjacentElement("afterend", newBox);
          console.log(
            `RISK Tools: Placeholder Credit Score Box element injected after the third item.`
          );
        } else {
          container.appendChild(newBox);
          console.log(
            `RISK Tools: Placeholder Credit Score Box element appended to the container.`
          );
        }

        // Check if the injection was successful by querying the DOM
        // Use setTimeout to allow DOM to update if needed, although direct query is often synchronous
        return new Promise((resolve) => {
          setTimeout(() => {
            const injectedBox = document.querySelector(
              `.${creditScoreBoxClass}`
            );
            if (injectedBox) {
              console.log(`RISK Tools: Injection successful (Attempt ${attempt}).`);
              resolve(injectedBox); // Resolve with the injected box element
            } else {
              console.warn(
                `RISK Tools: Injection failed on Attempt ${attempt}. Box not found in container after insertion.`
              );
              // Clean up the created box if it somehow wasn't added correctly
              if (newBox.parentElement) {
                newBox.remove();
              }
              resolve(false); // Resolve with false to indicate failure
            }
          }, 50); // Small delay for DOM potentially settling
        });
      };
      // --- End of attemptInjection function ---

      // --- Injection retry logic ---
      let injectedBox = null;
      const maxInjectionRetries = 5; // Increased retries slightly
      const injectionRetryDelay = 150; // ms

      for (let i = 1; i <= maxInjectionRetries; i++) {
        injectedBox = await attemptInjection(i);
        if (injectedBox) {
          break; // Success
        }
        // Wait before retrying injection
        if (i < maxInjectionRetries) {
          // Don't wait after the last attempt
          await new Promise((resolve) => setTimeout(resolve, injectionRetryDelay));
        }
      }

      if (!injectedBox) {
        console.error("RISK Tools: Failed to inject Credit Score Box after multiple attempts.");
        return; // Stop if injection failed
      }
      // --- End of injection retry logic ---

      // --- Now, fetch the data and update the box ---
      const fetchStartTime = performance.now();
      const userData = await fetchUserData(username);
      const fetchElapsedTime = performance.now() - fetchStartTime;
      console.log(
        `RISK Tools: Fetch user data completed in ${fetchElapsedTime.toFixed(
          2
        )} ms.`
      );

      const creditScore = userData ? userData.creditScore : null;
      const scoreColor = getTextColor(creditScore);

      // Update the box content with the fetched data
      injectedBox.innerHTML = `
                <div class="flex flex-col">
                    <div class="items-center whitespace-nowrap font-bold transition-all bg-canvas-50 text-ink-1000 flex flex-row">
                        <span class="inline-block" style="font-size: 1em; margin-right: 0.1em;">🦝</span>
                        <span style="color: ${scoreColor};">${creditScore !== null ? creditScore : "N/A"
        }</span>
                    </div>
                    <div class="text-ink-600 mx-auto -mt-1 text-xs transition-all">credit score</div>
                </div>
                `;
      console.log("RISK Tools: Credit Score Box content updated (or N/A).");

      // Add click listener
      injectedBox.addEventListener("click", function (e) {
        if (e.target.closest("button")) return;
        window.open(`https://risk.markets/?q=${username}`, "_blank");
      });

      // Add mouseenter listener for popup
      injectedBox.addEventListener("mouseenter", async function () {
        let currentStateResult = await new Promise((resolve) =>
          chrome.storage.local.get("creditScoreState", resolve)
        );
        if (!currentStateResult.creditScoreState) return;

        const rect = injectedBox.getBoundingClientRect();
        removeRiskCardPopup(); // Ensure no old popups linger

        const popup = document.createElement("div");
        popup.className = riskCardPopupClass;
        popup.style.position = "absolute";
        // Adjust top position slightly if needed, considering the box height
        popup.style.top = `${rect.top + window.scrollY - 60}px`;
        popup.style.left = `${rect.left + window.scrollX + injectedBox.offsetWidth + 10
          }px`;
        popup.style.borderRadius = "10px";
        popup.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
        popup.style.zIndex = "1000";
        popup.style.opacity = "0";
        popup.style.transition = "opacity 0.2s ease-in";
        popup.style.backgroundColor = "#1f2937";

        if (
          typeof window.RISKToolsCard.renderPlaceholderCard === "function"
        ) {
          popup.innerHTML = window.RISKToolsCard.renderPlaceholderCard(username);
        } else {
          popup.innerHTML = createPopupMessageDiv(`Loading card for ${username}...`);
          console.warn(
            "RISK Tools: RISKToolsCard.renderPlaceholderCard function not found, using basic loader."
          );
        }

        document.body.appendChild(popup);
        setTimeout(() => {
          if (document.body.contains(popup)) {
            popup.style.opacity = "1";
          }
        }, 10);

        try {
          if (
            typeof window.RISKToolsCard === "undefined" ||
            typeof window.RISKToolsCard.createRiskCardHTML !== "function"
          ) {
            console.error(
              "RISK Tools: card.js or createRiskCardHTML function not available for popup content."
            );
            if (document.body.contains(popup)) {
              popup.innerHTML = createPopupMessageDiv(
                "Error: Card display component not loaded."
              );
            }
            return;
          }

          // Pass the already fetched userData to createRiskCardHTML
          // If userData is null (fetch failed), createRiskCardHTML will attempt to fetch it again
          const generatedCardHtml =
            await window.RISKToolsCard.createRiskCardHTML(username, userData); // Pass the fetched data

          if (
            !generatedCardHtml ||
            generatedCardHtml.includes("Error") // A bit generic, but catches common error messages from card.js
          ) {
            console.warn(
              "RISK Tools: Failed to generate card content HTML or encountered an error in card.js."
            );
            if (document.body.contains(popup)) {
              // card.js should provide specific error messages
              popup.innerHTML =
                generatedCardHtml || createPopupMessageDiv(
                  "Error loading card content."
                );
            }
            return;
          }

          if (document.body.contains(popup)) {
            popup.innerHTML = generatedCardHtml;
          }
        } catch (error) {
          console.error(
            "RISK Tools: Error creating or displaying risk card:",
            error
          );
          if (document.body.contains(popup)) {
            popup.innerHTML = createPopupMessageDiv("Error loading detailed data.");
          }
        }

        let isOverBoxOrPopup = true;

        function checkLeave() {
          if (!isOverBoxOrPopup) {
            if (document.body.contains(popup)) {
              document.body.removeChild(popup);
            }
            injectedBox.removeEventListener("mouseleave", onBoxLeave);
            // Check again as it might have been removed
            if (document.body.contains(popup)) {
              popup.removeEventListener("mouseleave", onPopupLeave);
              popup.removeEventListener("mouseenter", onPopupEnter);
            }
          }
        }

        function onBoxLeave() {
          isOverBoxOrPopup = false;
          setTimeout(checkLeave, 100);
        }
        function onPopupLeave() {
          isOverBoxOrPopup = false;
          setTimeout(checkLeave, 100);
        }
        function onPopupEnter() {
          isOverBoxOrPopup = true;
        }

        injectedBox.addEventListener("mouseleave", onBoxLeave);
        if (document.body.contains(popup)) {
          popup.addEventListener("mouseleave", onPopupLeave);
          popup.addEventListener("mouseenter", onPopupEnter);
        }
      });
    });
  }

  // Function to wait for the username span element with the correct username
  async function waitForUsernameSpan(username, retries = 100, delay = 100) {
    // Increased retries and delay for this crucial wait
    let attempt = 0;
    const expectedText = `@${username}`;
    console.log(
      `RISK Tools: Waiting for username span with text "${expectedText}"...`
    );

    while (attempt < retries) {
      const spanElement = document.querySelector(usernameSpanSelector);
      if (spanElement && spanElement.textContent.trim() === expectedText) {
        console.log(
          `RISK Tools: Username span found for ${username} on attempt ${attempt + 1
          }.`
        );
        return true; // Success
      }

      attempt++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.warn(
      `RISK Tools: Username span for ${username} not found after ${retries} attempts.`
    );
    return false; // Failure
  }

  chrome.storage.local.get("creditScoreState", function (result) {
    if (result.creditScoreState) {
      // Initial call on page load - get username and start waiting
      const urlParts = window.location.pathname.split("/");
      const username = urlParts[urlParts.length - 1];

      // Add check for reserved paths before waiting for username span
      if (!username || username.length < 1 || isReservedPath(username)) {
        console.log(
          `RISK Tools: Skipping initial load injection for non-username path: ${window.location.pathname}`
        );
        return;
      }

      waitForUsernameSpan(username).then((found) => {
        if (found) {
          // If username span is found, then wait for the container and inject
          waitForContainerAndInject();
        } else {
          console.warn("RISK Tools: Username span not found on initial load, skipping injection.");
        }
      });
    }
  });

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message === "urlChanged") {
      console.log("RISK Tools: URL changed to " + request.url);
      removeCreditScoreBox(); // Always remove old box immediately

      const url = new URL(request.url);
      const urlParts = url.pathname.split("/");
      const username = urlParts[urlParts.length - 1];

      // Add check for reserved paths
      if (!username || username.length < 1 || isReservedPath(username)) {
        console.log(
          `RISK Tools: Skipping injection for non-username path after URL change: ${request.url}`
        );
        return;
      }

      // On URL change, wait for the username span *before* attempting to inject
      waitForUsernameSpan(username).then((found) => {
        if (found) {
          // If username span is found for the new user, then wait for the container and inject
          waitForContainerAndInject();
        } else {
          console.warn(
            `RISK Tools: Username span for ${username} not found after URL change, skipping injection.`
          );
        }
      });
    } else if (request.message === "injectCreditScoreBox") {
      // This message is triggered by background.js on URL change, but we handle URL changed specifically now.
      // This listener might become redundant if only 'urlChanged' is used.
      // For now, let's keep it but ensure it also waits and checks for reserved paths.
      const urlParts = window.location.pathname.split("/");
      const username = urlParts[urlParts.length - 1];

      // Add check for reserved paths
      if (!username || username.length < 1 || isReservedPath(username)) {
        console.log(
          `RISK Tools: Skipping injection via injectCreditScoreBox message for non-username path: ${window.location.pathname}`
        );
        return;
      }

      waitForUsernameSpan(username).then((found) => {
        if (found) {
          waitForContainerAndInject();
        } else {
          console.warn(
            "RISK Tools: Username span not found via injectCreditScoreBox message, skipping injection."
          );
        }
      });
    }
  });

  // Function to wait for the container element and then attempt injection
  function waitForContainerAndInject(retries = 50, delay = 100) {
    let attempt = 0;
    const checkAndInject = async () => {
      const container = getContainerElement();
      if (container) {
        console.log(
          `RISK Tools: Container element found on attempt ${attempt + 1}.`
        );
        chrome.storage.local.get(
          "creditScoreState",
          async function (result) {
            if (result.creditScoreState) {
              // Call addCreditScoreBox to initiate the injection process
              addCreditScoreBox();
            } else {
              console.log(
                "RISK Tools: Injection halted by state in waitForContainer."
              );
            }
          }
        );
      } else if (attempt < retries) {
        attempt++;
        console.log(
          `RISK Tools: Container not found on attempt ${attempt}. Retrying in ${delay}ms...`
        );
        setTimeout(checkAndInject, delay);
      } else {
        console.warn("RISK Tools: Container not found after waiting.");
      }
    };
    checkAndInject(); // Start the process
  }
})(); // End of async IIFE
