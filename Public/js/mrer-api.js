document.addEventListener("DOMContentLoaded", async function () {
  const dropdown = document.getElementById("documentType");
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get("document");

  if (type && dropdown) {
    dropdown.value = type;
    console.log(dropdown.value);
  }

  function updateURLParameter(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.location.href = url;
  }

  function getURLParamater(key) {
    const url = new URL(window.location);
    return url.searchParams.get(key);
  }

  dropdown.value = type;

  dropdown.addEventListener("change", function () {
    const selectedDoc = this.value.trim();
    updateURLParameter("document", selectedDoc);
    initializePropertyNumberHandler(selectedDoc);
    document.getElementById("property_no").value = "";
    document.getElementById("results").innerHTML = "";
  });

  initializePropertyNumberHandler(type);

  function initializePropertyNumberHandler(type) {
    console.log("Initializing with document type:", type);

    const propertyNoInput = document.getElementById("property_no");
    const resultsContainer = document.getElementById("results");

    // Remove any existing event listener
    const newPropertyNoInput = propertyNoInput.cloneNode(true);
    propertyNoInput.parentNode.replaceChild(
      newPropertyNoInput,
      propertyNoInput
    );

    newPropertyNoInput.addEventListener("input", function () {
      const propertyNoValue = this.value;

      if (propertyNoValue.length > 0) {
        console.log("Document type received:", type);

        fetch(
          `/mrer/office?propertyNumber=${propertyNoValue}&document=${type}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
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
                listItem.textContent = `${office.location}`;
                listItem.classList.add("result-item");
                resultsContainer.appendChild(listItem);

                listItem.addEventListener("click", () => {
                  newPropertyNoInput.value = office.property_no;

                  const totalValueElement =
                    document.getElementById("unitValue");
                  const descriptionElement =
                    document.getElementById("description");
                  const dateAcquiredElement =
                    document.getElementById("date_acquired");
                  const officeElement = document.getElementById("office");

                  if (totalValueElement) {
                    totalValueElement.value = office.unit_cost;
                  } else {
                    console.warn("Element with ID 'totalValue' is missing.");
                  }

                  if (descriptionElement) {
                    descriptionElement.value = office.description;
                  } else {
                    console.warn("Element with ID 'description' is missing.");
                  }

                  if (dateAcquiredElement) {
                    if (office.date_acquired) {
                      try {
                        const dateAcquired = new Date(office.date_acquired);
                        if (!isNaN(dateAcquired)) {
                          const formattedDate = dateAcquired
                            .toISOString()
                            .split("T")[0];
                          dateAcquiredElement.value = formattedDate;
                        } else {
                          console.error(
                            "Invalid date format:",
                            office.date_acquired
                          );
                          dateAcquiredElement.value = "Invalid date";
                        }
                      } catch (error) {
                        console.error("Error parsing date:", error);
                        dateAcquiredElement.value = "Error parsing date";
                      }
                    } else {
                      console.warn("Date acquired is missing or null");
                      dateAcquiredElement.value = "No date available";
                    }
                  } else {
                    console.warn("Element with ID 'date_acquired' is missing.");
                  }

                  if (officeElement) {
                    officeElement.value = office.location;
                  } else {
                    console.warn("Element with ID 'office' is missing.");
                  }

                  const endUserElement = document.getElementById("endUser");
                  if (endUserElement) {
                    endUserElement.value = office.accountable;
                  } else {
                    console.warn("Element with ID 'endUser' is missing.");
                  }

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
  }
});
