// Selectors
const notificationItems = document.querySelectorAll(".notification-item");
const sidePanel = document.getElementById("side-panel");
const closePanelButton = document.getElementById("close-panel");
const overlay = document.getElementById("overlay");

// Open Side Panel on Notification Click
notificationItems.forEach((item) => {
  item.addEventListener("click", () => {
    // Display the panel
    sidePanel.classList.add("visible");
    sidePanel.classList.remove("hidden");
    overlay.classList.add("visible");
  });
});

// Close Side Panel
closePanelButton.addEventListener("click", () => {
  // Hide the panel
  sidePanel.classList.remove("visible");
  sidePanel.classList.add("hidden");
  overlay.classList.remove("visible");
});
