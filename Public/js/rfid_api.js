document.addEventListener("DOMContentLoaded", function () {
  const requestTableBody = document.getElementById("rfid-table-body");
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get("document");

  const page = parseInt(urlParams.get("page")) || 1;
  const limit = parseInt(urlParams.get("limit")) || 10;

  let fetchIntervalId = null; // To store the interval ID

  // Function to fetch and update RFID data
  async function fetchAndUpdateRFID() {
    try {
      const response = await fetch(
        `/rfid?ajax=true&page=${page}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch request data");
      }

      const data = await response.json();
      const requests = data.getRFIDList;
      console.log(data);

      requestTableBody.innerHTML = "";

      if (requests.length === 0) {
        requestTableBody.innerHTML =
          '<tr><td colspan="5">No Requests.</td></tr>';
      } else {
        requests.forEach((rfid) => {
          const row = document.createElement("tr");

          // Create a unique ID for each dropdown menu using the tag_id
          const menuId = `menu-${rfid.tag_id}`;

          // Function to format the date
          function formatDate(dateString) {
            if (!dateString) return "not assigned";
            const date = new Date(dateString);

            // Check if the date is valid
            if (isNaN(date)) return "invalid date";

            return date.toLocaleString("en-US", {
              year: "numeric",
              month: "long", // Full month name
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true, // 12-hour format
            });
          }

          // Use the formatDate function to format rfid.time
          const formattedTime = formatDate(rfid.time);

          row.innerHTML = `
              <td>${rfid.tag_id}</td>
              <td>${
                rfid.assigned_items ? rfid.assigned_items : "not assigned"
              }</td>
              <td>${rfid.property_no ? rfid.property_no : "not assigned"}</td>
              <td>${formattedTime}</td>
              <td>${rfid.status ? "In" : "Out"}</td>
              <td class="action-column">
                <button class="action-btn">Transmission</button>
                <span class="menu-btn" data-menu-id="${menuId}">⋮</span>
                <div class="dropdown-menu" id="${menuId}" name="menu">
                  <button class="dropdown-item update">Update</button>
                  <button class="dropdown-item delete">Delete</button>
                  <button class="dropdown-item assign" data-tag-id="${
                    rfid.tag_id
                  }">Assign</button>
                </div>
              </td>
            `;

          requestTableBody.appendChild(row);
        });
      }
      updatePaginationLinks(data.currentPage, data.totalPages);
    } catch (error) {
      console.error("Error fetching request data: ", error);
      requestTableBody.innerHTML =
        '<tr><td colspan="5">Error loading data</td></tr>';
    }
  }

  // Initial fetch and set up interval
  fetchAndUpdateRFID();
  startFetchInterval();

  // Function to start the interval
  function startFetchInterval() {
    if (!fetchIntervalId) {
      fetchIntervalId = setInterval(fetchAndUpdateRFID, 1000); // Every second
      console.log("Fetch interval started");
    }
  }

  // Function to stop the interval
  function stopFetchInterval() {
    if (fetchIntervalId) {
      clearInterval(fetchIntervalId);
      fetchIntervalId = null;
      console.log("Fetch interval stopped");
    }
  }

  // Existing property number input handling
  const propertyNoInput = document.getElementById("propertyNo");
  const resultsContainer = document.getElementById("results");

  propertyNoInput.addEventListener("input", function () {
    const propertyNoValue = this.value;
    if (propertyNoValue.length > 0) {
      fetch(`/rfid/property_no?propertyNumber=${propertyNoValue}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          resultsContainer.style.display = "flex";
          resultsContainer.innerHTML = "";
          if (data.success && data.data.length > 0) {
            data.data.forEach((office) => {
              const listItem = document.createElement("div");
              listItem.textContent = `${office.item_name}`;
              listItem.classList.add("result-item");
              resultsContainer.appendChild(listItem);

              listItem.addEventListener("click", () => {
                document.getElementById("propertyNo").value =
                  office.property_no;
                document.getElementById("itemName").value = office.item_name;

                resultsContainer.innerHTML = "";
                resultsContainer.style.display = "none";
              });
            });
          } else {
            resultsContainer.textContent = "No property number found.";
          }
        })
        .catch((error) => {
          console.log("Error fetching data:", error);
        });
    } else {
      resultsContainer.innerHTML = "";
      resultsContainer.style.display = "none";
    }
  });

  // Function to dynamically update pagination links
  function updatePaginationLinks(currentPage, totalPages) {
    const paginationNav = document.getElementById("paginationNav");
    paginationNav.innerHTML = "";

    if (currentPage > 1) {
      paginationNav.innerHTML += `<a href="?page=${
        currentPage - 1
      }&limit=${limit}" aria-label="Previous Page">Previous</a>`;
    }

    if (currentPage < totalPages) {
      paginationNav.innerHTML += `<a href="?page=${
        currentPage + 1
      }&limit=${limit}" aria-label="Next Page">Next</a>`;
    }
  }

  // Event Delegation for Menu Buttons
  requestTableBody.addEventListener("click", function (event) {
    const target = event.target;

    // Handle Menu Button Click
    if (target.classList.contains("menu-btn")) {
      event.stopPropagation(); // Prevent the event from bubbling up
      const menuId = target.getAttribute("data-menu-id");
      const menu = document.getElementById(menuId);
      const isVisible = menu.style.display === "block";

      // Close all other menus
      document.querySelectorAll(".dropdown-menu").forEach((m) => {
        m.style.display = "none";
      });

      // Toggle the clicked menu
      menu.style.display = isVisible ? "none" : "block";

      // Stop the fetch interval when a menu is opened
      if (!isVisible) {
        stopFetchInterval();
      } else {
        startFetchInterval();
      }
    }

    // Handle Assign Button Click
    if (target.classList.contains("assign")) {
      const tagId = target.getAttribute("data-tag-id");
      assignAction(tagId);
      // After handling the assign action, you can decide to restart the interval
      // For example:
      // startFetchInterval();
    }

    // Similarly, handle other dropdown items if needed
    if (target.classList.contains("update")) {
      updateAction();
      // Restart interval if needed
    }

    if (target.classList.contains("delete")) {
      deleteAction();
      // Restart interval if needed
    }

    // Handle Action Button Click
    if (target.classList.contains("action-btn")) {
      // Stop the interval when an action button is pressed
      stopFetchInterval();

      // Implement the action button functionality
      openActionModal(target);
    }
  });

  // Close dropdown menus and restart interval when clicking outside
  document.addEventListener("click", () => {
    document
      .querySelectorAll(".dropdown-menu")
      .forEach((menu) => (menu.style.display = "none"));
    startFetchInterval();
  });

  // Example function to handle opening an action modal
  function openActionModal(button) {
    // Create or show your modal here
    // For demonstration, we'll use a simple confirm dialog
    const action = confirm(
      "Action button pressed. Click OK to close and resume updates."
    );

    if (action) {
      // Resume the interval when the action is closed
      startFetchInterval();
    }
  }

  // Placeholder functions for actions
  function updateAction(tagId) {
    // Implement your update logic here
    alert("Update action triggered.");
    // Optionally restart the interval
    startFetchInterval();
  }

  function deleteAction(tagId) {
    // Implement your delete logic here
    alert("Delete action triggered.");
    // Optionally restart the interval
    startFetchInterval();
  }

  function assignAction(tagId) {
    document.getElementById("tag_id_assign").value = tagId;
    document.getElementById("popup").classList.remove("hidden");
    startFetchInterval();
  }
});
