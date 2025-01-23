document.addEventListener("DOMContentLoaded", function () {
  const requestTableBody = document.getElementById("notfi-table-container");
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get("document");

  let fetchIntervalId = null; // To store the interval ID

  // Function to fetch and update RFID data
  async function fetchAndUpdateRFID() {
    try {
      const response = await fetch(`/notif?ajax=true`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
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
          row.classList.add("notification-item");

          // Function to format the date
          function formatDate(dateString) {
            if (!dateString) return "not assigned";
            const date = new Date(dateString);

            // Check if the date is valid
            if (isNaN(date)) return "invalid date";

            return date.toLocaleString(undefined, {
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
              <td>${formattedTime}</td>   
              <td>${rfid.item_status}</td>
              <td>${rfid.tag_id}</td>
              <td class="${
                rfid.item_status === "Not Registered"
                  ? ""
                  : rfid.status
                  ? "status in"
                  : "status out"
              }">${
            rfid.item_status === "Not Registered"
              ? "Not Registered"
              : rfid.status
              ? "In"
              : "Out"
          }</td>
            `;

          requestTableBody.appendChild(row);
        });
      }
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
});
