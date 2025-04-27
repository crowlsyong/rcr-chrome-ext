(function () {
  // Function to trigger fade-to-black effect
function triggerFadeToBlack() {
  // Create the fade overlay div
  const fadeOverlay = document.createElement("div");
  fadeOverlay.style.position = "fixed";
  fadeOverlay.style.top = "0";
  fadeOverlay.style.left = "0";
  fadeOverlay.style.width = "100%";
  fadeOverlay.style.height = "100%";
  fadeOverlay.style.backgroundColor = "black";
  fadeOverlay.style.zIndex = "9999";
  fadeOverlay.style.opacity = "0";
  fadeOverlay.style.transition = "opacity 0.5s ease-in-out";
  document.body.appendChild(fadeOverlay);

  // Fade to black immediately
  fadeOverlay.style.opacity = "1"; // Show black screen
  setTimeout(() => {
    fadeOverlay.style.opacity = "0"; // Fade out
    setTimeout(() => {
      document.body.removeChild(fadeOverlay); // Remove overlay after fade-out
    }, 500); // Wait for fade to complete (0.5s)
  }, 500); // Hold black screen for 0.5s
}

// Handle URL changes using popstate (for history-based navigation)
window.onpopstate = () => triggerFadeToBlack();

// Alternatively, use MutationObserver for SPAs (single-page apps) that change URL dynamically
const observer = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    triggerFadeToBlack();
    currentUrl = location.href;
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Button click handler
document.body.addEventListener('click', function(event) {
  if (event.target.tagName === 'BUTTON') {
    triggerFadeToBlack(); // Trigger fade on button click
  }
});

// Store the current URL for change detection
let currentUrl = location.href;

  })();
  