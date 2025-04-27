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

      const uacsValue =
        new URLSearchParams(window.location.search).get("uacs") || "";

      // Ensure ajax and uacs parameters are appended correctly
      url.searchParams.set("ajax", "true");
      url.searchParams.set("uacs", uacsValue); // Use the uacsValue here
      const heading = document.getElementById("inventoryHeading");
      heading.innerText = getHeadingText(uacsValue);
      const heading1 = document.getElementById("hiddenInventoryHeading");
      heading1.innerText = getHeadingText(uacsValue);
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
      " ": "",
    };

    return uacsMap[uacsValue] || "";
  }

  function updateInventoryTable(data) {
    const tableBody = document.getElementById("inventoryTableBody");
    const tableBodyHidden = document.getElementById("hiddenInventoryTableBody");
    let rows = "";
    let rowsHidden = ""; // Separate variable for hidden table

    if (data.getInventoryList.length > 0) {
      data.getInventoryList.forEach((invent) => {
        console.log(invent);
        const formattedDate = new Date(invent.date_acquired).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );

        // Table with action buttons
        rows += `
                <tr>
                    <td>${invent.item_name}</td>
                    <td>${invent.description}</td>
                    <td>${invent.property_no}</td>
                    <td>${invent.unit}</td>
                    <td>${invent.unit_cost}</td>
                    <td>${invent.quantity}</td>
                    <td>${invent.quantity}</td>
                    <td>${invent.quantity}</td>
                    <td>1</td>
                    <td>${invent.accountable}</td>
                    <td>${invent.location}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <!-- Three-dots menu -->
                        <div class="menu-container">
                            <i class="fas fa-ellipsis-v menu-icon"></i>
                            <div class="dropdown-menu">
                                
                                <button data-table=true data-row='${JSON.stringify(
                                  invent
                                )}' onclick="printDocument(this)">Print</button>
                                <button data-row='${JSON.stringify(
                                  invent
                                )}' onclick="openUpdateModal(this)">Update</button>
                                <button onclick="handleAction('Dispose')"><a href="/wmrf">Dispose</a></button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;

        // yada na openUpdateModal dda ig butang an function han update
        // mayda na hit? oo mayad na yadi it

        // Table without action buttons (hidden table)
        rowsHidden += `
                <tr>
                    <td>${invent.item_name}</td>
                    <td>${invent.description}</td>
                    <td>${invent.property_no}</td>
                    <td>${invent.unit}</td>
                    <td>${invent.unit_cost}</td>
                    <td>${invent.quantity}</td>
                    <td>${invent.quantity}</td>
                    <td>${invent.quantity}</td>
                    <td>1</td>
                    <td>${invent.accountable}</td>
                    <td>${invent.location}</td>
                    <td>${formattedDate}</td>
                </tr>
            `;
      });
    } else {
      rows =
        '<tr><td colspan="10" style="text-align:center">No list of Document</td></tr>';
      rowsHidden =
        '<tr><td colspan="10" style="text-align:center">No list of Document</td></tr>'; // Adjusted colspan
    }

    tableBody.innerHTML = rows; // Batch update for visible table
    tableBodyHidden.innerHTML = rowsHidden; // Batch update for hidden table without action buttons
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
      const query = this.value.trim();
      const page = 1; // Reset to first page on new search
      const limit = 10; // Default limit

      console.log("Search query:", query);

      loadingSpinner.style.display = "block";

      fetch(
        `/Inventory/search?query=${encodeURIComponent(
          query
        )}&page=${page}&limit=${limit}`
      )
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
  );

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

  attachPaginationListeners();
});
// Initial setup
function openUpdateModal(button) {
  const itemData = JSON.parse(button.getAttribute("data-row"));
  // Populate modal fields with existing data
  console.log("Open popup");
  console.log(itemData);
  document.getElementById("updateItemName").value = itemData.item_name;
  document.getElementById("updateDescription").value = itemData.description;
  document.getElementById("updatePropertyNo").value = itemData.property_no;
  document.getElementById("updateUnit").value = itemData.unit;
  document.getElementById("updateUnitCost").value = itemData.unit_cost;
  document.getElementById("updateQuantity").value = itemData.quantity;
  document.getElementById("updateLocation").value = itemData.location;
  document.getElementById("updateAccountable").value = itemData.accountable;

  // Store ID in a hidden field
  document.getElementById("docType").value = itemData.type;
  // console.log(itemData);
  // Show the modal
  document.getElementById("updateModal").style.display = "flex";
}

function submitUpdate() {
  const updatedData = {
    docType: document.getElementById("docType").value,
    itemName: document.getElementById("updateItemName").value,
    description: document.getElementById("updateDescription").value,
    propertyNumber: document.getElementById("updatePropertyNo").value,
    unit: document.getElementById("updateUnit").value,
    cost: document.getElementById("updateUnitCost").value,
    quantity: document.getElementById("updateQuantity").value,
    location: document.getElementById("updateLocation").value,
    accountable: document.getElementById("updateAccountable").value,
    // docType:
  };

  fetch(`/Inventory/update/${updatedData.property_no}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedData),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Update failed");
      return response.json();
    })
    .then((data) => {
      alert("Item updated successfully!");
      document.getElementById("updateModal").style.display = "none";
      location.reload();
    })
    .catch((error) => {
      console.error("Error updating item:", error);
    });
}

function printDocument(button) {
  try {
    document.body.classList.remove("show-ics", "show-par", "show-office");
    document.querySelectorAll(".printPhotos").forEach((el) => {
      el.classList.add("hiddenPhotos");
    });
    if (button.getAttribute("data-office")) {
      document.body.classList.add("show-office");
      console.log("triggerd office", document.body);
      setTimeout(() => {
        window.print();
      }, 500);
    }
    if (button.getAttribute("data-table")) {
      console.log("triggerd");
      const data1 = button.getAttribute("data-row");
      console.log("triggerd: ", data1);
      const parsedData = JSON.parse(data1); // Convert JSON string back to object

      // Update printable content
      const date_acquired = new Date(parsedData.date_acquired);
      const date = new Date(parsedData.date);

      const options = { year: "numeric", month: "long", day: "numeric" };

      // Remove any existing print class

      if (parsedData.type === "ICS") {
        document.body.classList.add("show-ics");
        document
          .getElementById("printICSPhotos")
          .classList.remove("hiddenPhotos");
        document.getElementById("printICSAccountable").innerText =
          parsedData.accountable;
        document.getElementById("printICSEntityName").innerText =
          parsedData.entity_name;
        document.getElementById("printICSFundCluster").innerText =
          parsedData.fund_cluster;
        document.getElementById("printICSicsNo").innerText = parsedData.ics_no;
        document.getElementById("printICSQty").innerText = parsedData.quantity;
        document.getElementById("printICSUnit").innerText = parsedData.unit;

        document.getElementById("printICSDescription").innerText =
          parsedData.description;
        document.getElementById("printICSPropertyNo").innerText =
          parsedData.property_no;
        document.getElementById("printICSDateAcquired").innerText =
          new Intl.DateTimeFormat("en-US", options).format(date_acquired);
        document.getElementById("printICSUnitValue").innerText =
          parsedData.unit_cost;
        document.getElementById("printICSunitvalue").innerText =
          parsedData.unit_cost;
        document.getElementById("printICSBurs").innerText = parsedData.burs_no;
        document.getElementById("printICSPo").innerText = parsedData.po_no;
        document.getElementById("printICSdescription").innerText =
          parsedData.description;
        document.getElementById("printICSCode").innerText = parsedData.code;
        document.getElementById("printICSIAR").innerText = parsedData.iar;
        document.getElementById("printICSSupplier").innerText =
          parsedData.supplier;
        document.getElementById("printICSLocation").innerText =
          parsedData.location;
        document.getElementById("printICSdateacquired").innerText =
          new Intl.DateTimeFormat("en-US", options).format(date_acquired);
        document.getElementById("printICSDate").innerText =
          new Intl.DateTimeFormat("en-US", options).format(date);

        // Clear previous images
        const photoContainer = document.getElementById("photoICSContainer");
        photoContainer.innerHTML = "";

        function createImage(bufferData) {
          if (!bufferData || !bufferData.data) return null;
          const byteArray = new Uint8Array(bufferData.data);
          const blob = new Blob([byteArray], { type: "image/png" });
          const url = URL.createObjectURL(blob);

          const img = document.createElement("img");
          img.src = url;
          img.style.maxWidth = "100%";
          img.style.margin = "10px";

          return img;
        }

        const img1 = createImage(parsedData.photo1);
        const img2 = createImage(parsedData.photo2);

        let imagesLoaded = 0;
        let imageCount = 0;

        function checkAndPrint() {
          imagesLoaded++;
          if (imagesLoaded === imageCount) {
            setTimeout(() => {
              window.print();
            }, 500);
          }
        }

        if (img1) {
          imageCount++;
          img1.onload = checkAndPrint;
          photoContainer.appendChild(img1);
        }
        if (img2) {
          imageCount++;
          img2.onload = checkAndPrint;
          photoContainer.appendChild(img2);
        }

        // If no images exist, print immediately
        if (imageCount === 0) {
          setTimeout(() => {
            window.print();
          }, 500);
        }
      } else if (parsedData.type === "PAR") {
        console.log("PAR");
        document.body.classList.add("show-par");
        console.log(parsedData); // Check if data is correctly parsed
        console.log(parsedData.entity_name); // Check if data is correctly parsed

        document.getElementById("printPARAccountable").innerText =
          parsedData.accountable;
        document.getElementById("printPAREntityName").innerText =
          parsedData.entity_name;
        document.getElementById("printPARFundCluster").innerText =
          parsedData.fund_cluster;
        document.getElementById("printPARParNo").innerText =
          parsedData.ics_no || parsedData.par_no;
        document.getElementById("printPARQty").innerText = parsedData.quantity;
        document.getElementById("printPARUnit").innerText = parsedData.unit;
        document.getElementById("printPARDescription1").innerText =
          parsedData.description;
        document.getElementById("printPARPropertyNo").innerText =
          parsedData.property_no;
        document.getElementById("printPARDateAcquired1").innerText =
          new Intl.DateTimeFormat("en-US", options).format(date_acquired);
        document.getElementById("printPARDateAcquired").innerText =
          new Intl.DateTimeFormat("en-US", options).format(date_acquired);
        document.getElementById("printPARUnitValue").innerText =
          parsedData.unit_cost;
        document.getElementById("printPARunitvalue").innerText =
          parsedData.unit_cost;
        document.getElementById("printPARBurs").innerText = parsedData.burs_no;
        document.getElementById("printPARPo").innerText = parsedData.po_no;
        document.getElementById("printPARdescription").innerText =
          parsedData.description;
        document.getElementById("printPARCode").innerText = parsedData.code;
        document.getElementById("printPARIAR").innerText = parsedData.iar;
        document.getElementById("printPARSupplier").innerText =
          parsedData.supplier;
        document.getElementById("printPARLocation").innerText =
          parsedData.location;
        // document.getElementById("printDateAcquired").innerText =
        //   new Intl.DateTimeFormat("en-US", options).format(dateAcquired);
        document.getElementById("printPARDate").innerText =
          new Intl.DateTimeFormat("en-US", options).format(date);
        document
          .getElementById("printPARPhotos")
          .classList.remove("hiddenPhotos");
        // Clear previous images
        const photoContainer = document.getElementById("photoPARContainer");
        photoContainer.innerHTML = "";

        function createImage(bufferData) {
          if (!bufferData || !bufferData.data) return null;
          const byteArray = new Uint8Array(bufferData.data);
          const blob = new Blob([byteArray], { type: "image/png" });
          const url = URL.createObjectURL(blob);

          const img = document.createElement("img");
          img.src = url;
          img.style.maxWidth = "100%";
          img.style.margin = "10px";

          return img;
        }

        const img1 = createImage(parsedData.photo1);
        const img2 = createImage(parsedData.photo2);

        let imagesLoaded = 0;
        let imageCount = 0;

        function checkAndPrint() {
          imagesLoaded++;
          if (imagesLoaded === imageCount) {
            setTimeout(() => {
              window.print();
            }, 500);
          }
        }

        if (img1) {
          imageCount++;
          img1.onload = checkAndPrint;
          photoContainer.appendChild(img1);
        }
        if (img2) {
          imageCount++;
          img2.onload = checkAndPrint;
          photoContainer.appendChild(img2);
        }

        // If no images exist, print immediately
        if (imageCount === 0) {
          setTimeout(() => {
            window.print();
          }, 500);
        }
      } else {
        console.warn("Unknown type:", parsedData.type);
      }

      // Reset class after printing
      setTimeout(() => {
        document.body.classList.remove("show-ics", "show-par");
      }, 1000);
    }
  } catch (error) {
    console.error("Error parsing data-row attribute:", error);
  }
}
