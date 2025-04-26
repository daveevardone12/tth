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
    window.history.replaceState({}, "", url);
    window.location.href - url;
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
          `/ptr/accountable?propertyNumber=${propertyNoValue}&document=${type}`,
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
              data.data.forEach((accountable) => {
                const listItem = document.createElement("div");
                listItem.textContent = `${accountable.accountable}`;
                listItem.classList.add("result-item");
                resultsContainer.appendChild(listItem);

                listItem.addEventListener("click", () => {
                  newPropertyNoInput.value = accountable.property_no;
                  document.getElementById("amount").value =
                    accountable.unit_cost;
                  document.getElementById("description").value =
                    accountable.description;

                  if (accountable.date_acquired) {
                    const dateAcquired = new Date(accountable.date_acquired)
                      .toISOString()
                      .split("T")[0];
                    document.getElementById("date_acquired").value =
                      dateAcquired;
                  } else {
                    console.error("Date acquired is missing or invalid");
                  }

                  document.getElementById("from_accountable").value =
                    accountable.accountable;
                  document.getElementById("from_email").value =
                    accountable.email;
                  document.getElementById("property_name").value =
                    accountable.item_name;
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
