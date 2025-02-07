document.addEventListener("DOMContentLoaded", function () {
  let isSearching = false;
  let currentSearchQuery = "";
  const loadingSpinner = document.getElementById("loadingSpinner");
  const overlay = document.getElementById("sort-by-overlay");
  const closeButton = document.getElementById("close-sort-by");
  const resetButton = document.getElementById("reset-sort-by");
  const applyButton = document.getElementById("apply-sort-by");
  const sortInputs = overlay.querySelectorAll("input[type='radio']");

  document
    .getElementById("uacs-select")
    .addEventListener("change", function () {
      const selectedValue = this.value;
      if (selectedValue) {
        // Create the new URL based on the current window location
        const newUrl = new URL(window.location);
        newUrl.searchParams.set("uacs", selectedValue); // Add the uacs parameter to the URL

        // Push the new URL to the history (without reloading the page)
        window.history.pushState({}, "", newUrl);

        // Call the fetch function to get the updated data
      }
      fetchInventoryUpdates();
    });

  function fetchInventoryUpdates() {
    if (!isSearching) {
      // Create a new URL with the correct base URL
      const url = new URL("/Inventory", window.location.origin); // Ensure this is a valid absolute URL

      // Get the 'uacs' value from the current URL or default to '1060501000' if not present
      const uacsValue =
        new URLSearchParams(window.location.search).get("uacs") || "";

      // Ensure ajax and uacs parameters are appended correctly
      url.searchParams.set("ajax", "true");
      url.searchParams.set("uacs", uacsValue); // Use the uacsValue here
      const heading = document.getElementById("inventoryHeading");
      heading.innerText = getHeadingText(uacsValue);
      console.log("Fetching with URL:", uacsValue); // Log to inspect the full URL being used
      fetch(url.toString())
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          updateInventoryTable(data); // Update the inventory table with the data
        })
        .catch((error) => {
          console.error("Error fetching inventory updates:", error);
        });
    }
  }

  function getHeadingText(uacsValue) {
    const uacsMap = {
      1060501000: "Machinery (1 06 05 140 00)",
      1060502000: "Office Equipment (1060502000)",
      1060504000: "Agricultural and Forestry Equipment (1060504000)",
      1060511000: "Medical Equipment (1060511000)",
      1060512000: "Printing Equipment (1060512000)",
      1060514000: "Tech. & Scientific Equipment (1 06 05 140 00)",
      10605990000: "Other Machinery and Equipment (10605990000)",
      1060601000: "Motor Vehicles (1060601000)",
      1060701000: "Furniture and Fixtures (1060701000)",
      1060702000: "Books (1060702000)",
      1080102000: "Software (1080102000)",
      1060503000:
        "Information and Communications Technology Equipment (1060503000)",
      1040505000: "Marine and Fishery Equipment (1040505000)",
      1040507000: "Communication Equipment (1040507000)",
      1040508000: "Disaster Response and Rescue Equipment (1040508000)",
      1040509000: "Military, Police and Security Equipment (1040509000)",
      1040512000: "Sports Equipment (1040512000)",
    };

    return uacsMap[uacsValue] || "";
  }

  function updateInventoryTable(data) {
    const tableBody = document.getElementById("inventoryTableBody");
    const tableBodyHidden = document.getElementById("hiddenInventoryTableBody");
    let rows = "";

    if (data.getInventoryList.length > 0) {
      data.getInventoryList.forEach((invent) => {
        const formattedDate = new Date(invent.date_acquired).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );
        rows += `
                    <tr>
                    <td>${invent.item_name}</td>
                    <td>${invent.description}</td>
                    <td>${invent.property_no}</td>
                    <td></td>
                    <td>${invent.unit_cost}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>1</td>
                    <td>${invent.accountable}</td>
                    <td>${invent.location}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <!-- Three-dots menu -->
                        <div class="menu-container">
                            <i class="fas fa-ellipsis-v menu-icon"></i>
                            <div class="dropdown-menu">
                                <button onclick="handleAction('Update')">Update</button>
                                <button data-row='${JSON.stringify(
                                  invent
                                )}' onclick="printDocument(this)">Print</button>
                                <button onclick="handleAction('Dispose')"><a href="/ptr">Dispose</a></button>
                            </div>
                        </div>
                    </td>
                </tr>
                    `;
      });
    } else {
      rows = '<tr><td colspan="13">No list of Document</td></tr>';
    }
    tableBody.innerHTML = rows; // Batch DOM update
    tableBodyHidden.innerHTML = rows; // Batch DOM update
  }

  fetchInventoryUpdates();

  // Debounce function
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  document.getElementById("searchBar").addEventListener(
    "input",
    debounce(function (event) {
      event.preventDefault();
      const query = this.value;

      if (query.trim() !== "") {
        isSearching = true;
      } else {
        isSearching = false;
        fetchInventoryUpdates;
      }

      loadingSpinner.style.display = "block";

      fetch(`/Inventory/search?query=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data) => {
          updateInventoryTable(data);
        })
        .catch((error) => {
          console.error("Error during search:", error);
        })
        .finally(() => {
          loadingSpinner.style.display = "none";
        });
    }, 300)
  ); // 300 ms delay for debounce

  // Open overlay function
  function openSortOverlay() {
    overlay.classList.remove("hidden");
  }

  // Close overlay function
  closeButton.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  // Reset button functionality
  resetButton.addEventListener("click", () => {
    sortInputs.forEach((input) => (input.checked = false));
  });

  // Apply button functionality
  applyButton.addEventListener("click", () => {
    const selectedSortOptions = {};

    // Collect selected sort options
    sortInputs.forEach((input) => {
      if (input.checked) {
        selectedSortOptions[input.name] = input.value;
      }
    });

    // Example: Trigger a sorting function with the selected options
    applySorting(selectedSortOptions);

    // Close the overlay
    overlay.classList.add("hidden");
  });

  // Sorting function (example logic)
  function applySorting(options) {
    // Assume `data` is the array of items to be sorted
    console.log("sorted: ", options);
    fetch(`/Inventory/sort?date=${options.date}&docName=${options.name}`)
      .then((response) => response.json())
      .then((data) => {
        updateInventoryTable(data);
      })
      .catch((error) => {
        console.error("Error during search:", error);
      })
      .finally(() => {
        loadingSpinner.style.display = "none";
      });
  }

  // Function to handle pagination clicks
  function handlePagination(event) {
    event.preventDefault();
    const url = new URL(event.target.href);
    const params = new URLSearchParams(url.search);

    // Add search query to the pagination URL if a search is active
    if (currentSearchQuery) {
      params.set("query", currentSearchQuery);
    }
    params.set("ajax", "true");

    // Fetch new data based on pagination link
    fetch(url.pathname + "?" + params.toString())
      .then((response) => response.json())
      .then((data) => {
        updateInventoryTable(data);
        updatePaginationControls(data.currentPage, data.totalPages, data.limit);
        console.log(
          "updatePaginationControls:",
          updatePaginationControls(
            data.currentPage,
            data.totalPages,
            data.limit
          )
        );
        console.log("updateInventoryTable:", updateInventoryTable(data));
      })
      .catch((error) => {
        console.error("Error during pagination:", error);
      });
  }

  // Attach event listeners to pagination links
  function attachPaginationListeners() {
    document
      .querySelectorAll('nav[aria-label="Page navigation"] a')
      .forEach((link) => {
        link.addEventListener("click", handlePagination);
      });
  }

  // Function to update pagination controls
  function updatePaginationControls(currentPage, totalPages, limit) {
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

    // Re-attach the event listeners after updating the pagination links
    attachPaginationListeners();
  }

  // Initial setup
  attachPaginationListeners();
});

function printDocument(button) {
  try {
    const data1 = button.getAttribute("data-row");
    const parsedData = JSON.parse(data1); // Convert JSON string back to object

    console.log(parsedData); // Check if data is correctly parsed

    // Update printable content

    // Remove any existing print class
    document.body.classList.remove("show-ics", "show-par");

    // Add appropriate class for print mode
    if (parsedData.type === "ICS") {
      document.body.classList.add("show-ics");
      document.getElementById("printICSAccountable").innerText =
        parsedData.accountable;
    } else if (parsedData.type === "PAR") {
      document.getElementById("printPARAccountable").innerText =
        parsedData.accountable;
      document.body.classList.add("show-par");
    } else {
      console.warn("Unknown type:", parsedData.type);
    }

    // Trigger the print dialog
    window.print();

    // Reset class after printing
    setTimeout(() => {
      document.body.classList.remove("show-ics", "show-par");
    }, 1000);
  } catch (error) {
    console.error("Error parsing data-row attribute:", error);
  }
}
