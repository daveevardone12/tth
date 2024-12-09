document.addEventListener("DOMContentLoaded", function () {
  let isSearching = false;
  let currentSearchQuery = "";
  const loadingSpinner = document.getElementById("loadingSpinner");
  const overlay = document.getElementById("sort-by-overlay");

  function updateInventoryTable(data) {
    const tableBody = document.getElementById("inventoryTableBody");
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
                                  <button onclick="handleAction('Print')">Print</button>
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
  }

  function ambotnahingangalimotakhitdida(data) {
    document.getElementById("officeEquipment").innerText =
      data.totalItemsOffice;
    document.getElementById("ICTEquipment").innerText =
      data.totalItemsICTEquipment;
    document.getElementById("AgriEquipment").innerText =
      data.totalItemsAgriEquipment;
    document.getElementById("MedEquipment").innerText =
      data.totalItemsMedEquipment;
    document.getElementById("PrintEquipment").innerText =
      data.totalItemsPrintEquipment;
    document.getElementById("TSEquipment").innerText =
      data.totalItemsTSEquipment;
    document.getElementById("OMEquipment").innerText =
      data.totalItemsOMEquipment;
    document.getElementById("MotorVehicles").innerText =
      data.totalMotorVehicles;
    document.getElementById("FurnitureEquipment").innerText =
      data.totalFurnitureEquipment;
    document.getElementById("Books").innerText = data.totalBooks;
    document.getElementById("Software").innerText = data.totalSoftware;
    document.getElementById("MachineryEquipment").innerText =
      data.totalMachineryEquipment;
  }

  function fetchInventoryUpdates() {
    if (!isSearching) {
      fetch("/dashboard?ajax=true")
        .then((response) => response.json())
        .then((data) => {
          updateInventoryTable(data);
          ambotnahingangalimotakhitdida(data);
          console.log(data);
        })
        .catch((error) => {
          console.error("Error fetching inventory updates:", error);
        });
    }
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
        console.log("updateInbentoryTable:", updateInventoryTable(data));
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
