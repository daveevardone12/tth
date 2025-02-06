// public/js/dashboard-api.js

document.addEventListener("DOMContentLoaded", function () {
  let isSearching = false;
  let selectedLocation = null; // No default location selected
  const loadingSpinner = document.getElementById("loadingSpinner");
  const overlay = document.getElementById("sort-by-overlay");
  const errorMessage = document.getElementById("errorMessage");
  const dropdownButton = document.getElementById("dropdownButton");
  const dropdownOptions = document.getElementById("location");
  const placeholderMessage = document.getElementById("placeholderMessage");
  const inventoryChartContainer = document.getElementById(
    "inventory_chart_container"
  );
  const locationChartContainer = document.getElementById(
    "location_chart_container"
  );

  // Toggle dropdown visibility
  dropdownButton.addEventListener("click", function (event) {
    event.stopPropagation(); // Prevent event from bubbling up to window
    dropdownOptions.style.display =
      dropdownOptions.style.display === "block" ? "none" : "block";
    // Update ARIA attribute for accessibility
    dropdownButton.setAttribute(
      "aria-expanded",
      dropdownOptions.style.display === "block"
    );
  });

  // Hide dropdown when clicking outside
  window.addEventListener("click", function (event) {
    if (
      !dropdownOptions.contains(event.target) &&
      event.target !== dropdownButton
    ) {
      dropdownOptions.style.display = "none";
      dropdownButton.setAttribute("aria-expanded", "false");
    }
  });

  // Handle dropdown option clicks
  dropdownOptions.addEventListener("click", function (event) {
    const target = event.target;
    if (target.classList.contains("custom-dropdown-option")) {
      const cancel = target.getAttribute("data-cancel");
      if (cancel === "true") {
        // Cancel selection
        selectedLocation = null;
        dropdownButton.textContent = "Select Location";
      } else {
        // Set selected location
        selectedLocation = target.getAttribute("data-value");
        dropdownButton.textContent = selectedLocation;
      }
      // Hide dropdown
      dropdownOptions.style.display = "none";
      dropdownButton.setAttribute("aria-expanded", "false");
      // Fetch and update charts based on selection
      fetchInventoryUpdates();
      fetchLocationData();
    }
  });

  // Load the Google Charts library
  google.charts.load("current", { packages: ["corechart", "bar"] });

  // Set callbacks to run when the Google Visualization API is loaded.
  google.charts.setOnLoadCallback(function () {
    fetchInventoryUpdates();
    fetchLocationData();
  });

  // Function to update DOM elements with fetched inventory data
  function updateInventoryCounts(data) {
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
    document.getElementById("MarineandMachineryEquipment").innerText =
      data.totalFurnitureEquipment;
    document.getElementById("CommunicationEquipment").innerText =
      data.totalFurnitureEquipment;
    document.getElementById("DisasterResponseandRescueEquipment").innerText =
      data.totalFurnitureEquipment;
    document.getElementById("MilitaryPoliceandSecurityEquipment").innerText =
      data.totalFurnitureEquipment;
    document.getElementById("SportsEquipment").innerText =
      data.totalFurnitureEquipment;
  }

  // Function to draw the Inventory Google Bar Chart
  function drawInventoryChart(data) {
    // Prepare the data for the chart
    const chartData = [
      ["Category", "Total Distinct UACS Codes"],
      ["ICT Equipment", data.totalItemsICTEquipment],
      ["Office Equipment", data.totalItemsOffice],
      ["Agricultural and Forestry Equipment", data.totalItemsAgriEquipment],
      ["Medical Equipment", data.totalItemsMedEquipment],
      ["Printing Equipment", data.totalItemsPrintEquipment],
      ["Technical and Scientific Equipment", data.totalItemsTSEquipment],
      ["Other Machinery and Equipment", data.totalItemsOMEquipment],
      ["Motor Vehicles", data.totalMotorVehicles],
      ["Furniture and Fixtures", data.totalFurnitureEquipment],
      ["Books", data.totalBooks],
      ["Software", data.totalSoftware],
      ["Machinery", data.totalMachineryEquipment],
      ["Marine and Machinery Equipment", data.totalMarineandMachineryEquipment],
      ["Communication Equipment", data.totalCommunicationEquipment],
      [
        "Disaster Response and Rescue Equipment",
        data.totalDisasterResponseandRescueEquipment,
      ],
      [
        "Military Police and Security Equipment",
        data.totalMilitaryPoliceandSecurityEquipment,
      ],
      ["Sports Equipment", data.totalSportsEquipment],
    ];

    const dataTable = google.visualization.arrayToDataTable(chartData);

    const options = {
      title: "Inventory Items by Category",
      chartArea: { width: "70%", height: "85%" }, // Adjust chart area within the container
      hAxis: {
        title: "Total Distinct UACS Codes",
        minValue: 0,
      },
      vAxis: {
        title: "Category",
      },
      colors: ["#4285F4"], // Example color
      fontSize: 10,
    };

    const chart = new google.visualization.BarChart(
      document.getElementById("chart_div")
    );
    chart.draw(dataTable, options);

    // Show the inventory chart container
    if (inventoryChartContainer) {
      inventoryChartContainer.style.display = "flex";
    }
  }

  // Function to fetch inventory updates and draw the chart
  function fetchInventoryUpdates() {
    if (!isSearching) {
      // Show loading spinner and overlay if applicable
      if (loadingSpinner && overlay) {
        loadingSpinner.style.display = "block";
        overlay.style.display = "block";
      }

      // Build the fetch URL with location filter if selected
      let fetchURL = "/dashboard?ajax=true";
      if (selectedLocation) {
        fetchURL += `&location=${encodeURIComponent(selectedLocation)}`;
      }

      fetch(fetchURL)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // Update DOM elements with fetched data
          updateInventoryCounts(data);
          console.log("Inventory Data:", data);

          // Draw or update the chart with the fetched data
          drawInventoryChart(data);
        })
        .catch((error) => {
          console.error("Error fetching inventory updates:", error);
          // Display the error message within the dashboard
          if (errorMessage) {
            errorMessage.style.display = "block";
            errorMessage.textContent =
              "Failed to load inventory data. Please try again later.";
          }
        })
        .finally(() => {
          // Hide loading spinner and overlay
          if (loadingSpinner && overlay) {
            loadingSpinner.style.display = "none";
            overlay.style.display = "none";
          }
        });
    }
  }

  // Function to fetch location-based data and draw the chart
  function fetchLocationData() {
    // Show loading spinner and overlay if applicable
    if (loadingSpinner && overlay) {
      loadingSpinner.style.display = "block";
      overlay.style.display = "block";
    }

    // Build the fetch URL with location filter if selected
    let fetchURL = "/dashboard?ajax=locations";
    if (selectedLocation) {
      fetchURL += `&location=${encodeURIComponent(selectedLocation)}`;
    }

    fetch(fetchURL) // Adjust the endpoint as needed
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Location Data:", data);
        // Draw or update the chart with the fetched data
        drawLocationChart(data.locationData);
      })
      .catch((error) => {
        console.error("Error fetching location data:", error);
        // Display the error message within the dashboard
        if (errorMessage) {
          errorMessage.style.display = "block";
          errorMessage.textContent =
            "Failed to load location data. Please try again later.";
        }
      })
      .finally(() => {
        // Hide loading spinner and overlay
        if (loadingSpinner && overlay) {
          loadingSpinner.style.display = "none";
          overlay.style.display = "none";
        }
      });
  }

  // Function to draw the Location-Based Google Column Chart
  function drawLocationChart(locationData) {
    // 1) Filter out "Default Location" so it won't be shown
    locationData = locationData.filter(
      (item) => item.location !== "Default Location"
    );

    // 2) If no data remains after filtering, skip drawing
    if (!locationData || locationData.length === 0) {
      console.warn("No location data available to draw the chart.");
      return;
    }

    // Prepare the data for the chart
    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Location");
    chartData.addColumn("number", "Count"); // Renamed from 'Metric' to 'Count'

    // Assuming 'locationData' is an array of objects with 'location' and 'metric' properties
    locationData.forEach((item) => {
      chartData.addRow([item.location, item.metric]);
    });

    const options = {
      title: "Location-Based Counts", // Updated title
      titleTextStyle: {
        fontName: "Poppins", // Set font family
        fontSize: 10, // Set font size
        bold: true, // Make text bold
        italic: false, // Italicize text if needed
        color: "#333", 
      },
      hAxis: {
        title: "Location",
        titleTextStyle: {
          fontName: "Roboto",
          fontSize: 1,
        },
      },
      vAxis: {
        title: "Count", // Updated from 'Metric' to 'Count'
      },
      colors: ["#095c02"], // Example color, customize as needed
      fontName: "Poppins",
      bold: true,
      fontSize: 15,
      chartArea: { width: "70%", height: "85%" },
    };

    const chart = new google.visualization.ColumnChart(
      document.getElementById("location_chart_div")
    );
    chart.draw(chartData, options);

    // Show the location chart container
    if (locationChartContainer) {
      locationChartContainer.style.display = "flex";
    }
  }

  // Function to hide both charts and show placeholder (if needed)
  function hideCharts() {
    if (inventoryChartContainer) {
      inventoryChartContainer.style.display = "none";
    }
    if (locationChartContainer) {
      locationChartContainer.style.display = "none";
    }
    if (placeholderMessage) {
      placeholderMessage.style.display = "block";
    }
  }

  // Optional: Set up periodic fetching to update data and charts
  // Fetch inventory and location data every 60 seconds
  setInterval(fetchInventoryUpdates, 60000); // 60000 milliseconds = 60 seconds
  setInterval(fetchLocationData, 60000); // Update location data every 60 seconds

  // Initial fetch when the page loads
  fetchInventoryUpdates();
  fetchLocationData();

  // Function to update the time in real-time
  function updateTime() {
    const currentTimeElement = document.getElementById("current-time");
    const currentDateTime = new Date();
    currentTimeElement.textContent = currentDateTime.toLocaleString();
  }

  // Update the time every second (1000 milliseconds)
  setInterval(updateTime, 1000);

  // Add event listeners to cards (if needed)
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const category = card.getAttribute("data-category");
      fetchDataAndUpdateChart(category);
    });
  });

  // Get the maximize icon and table container (if applicable)
  const maximizeIcon = document.getElementById("maximize-icon");
  const tableContainer = document.querySelector(".table-container");

  if (maximizeIcon && tableContainer) {
    maximizeIcon.addEventListener("click", function () {
      // Toggle the maximized class on the table container
      tableContainer.classList.toggle("maximized");

      // Ensure the main content remains scrollable
      if (tableContainer.classList.contains("maximized")) {
        // Disable scrolling in the main content when the table is maximized
        document.querySelector(".main-content").style.overflow = "hidden";
      } else {
        // Enable scrolling in the main content again
        document.querySelector(".main-content").style.overflow = "auto";
      }
    });
  }

  // Function to fetch data for a specific category and update the chart
  function fetchDataAndUpdateChart(category) {
    console.log(`Category clicked: ${category}`);
    // Example: Fetch data for the category and redraw the chart
    // You need to implement the endpoint and data structure accordingly
    /*
    fetch(`/dashboard?ajax=true&category=${encodeURIComponent(category)}`)
      .then(response => response.json())
      .then(data => {
        // Update the chart based on the category data
        drawInventoryChart(data);
      })
      .catch(error => {
        console.error("Error fetching category data:", error);
      });
    */
  }

  // Debounce function to limit the rate at which a function can fire.
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Redraw the charts when the window is resized, using debounce to optimize performance
  window.addEventListener(
    "resize",
    debounce(function () {
      fetchInventoryUpdates();
      fetchLocationData();
    }, 250) // Adjust the wait time as needed
  );
});

document.querySelector('.profile').addEventListener('click', function() {
  window.location.href = "/user"; // Change this to your profile page URL
});
