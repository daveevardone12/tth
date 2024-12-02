document.addEventListener("DOMContentLoaded", async function () {
    const inventoryTableBody = document.getElementById('inventoryTableBody');
    const urlParams = new URLSearchParams(window.location.search);
    const searchInput = document.getElementById('searchInput');
    const page = parseInt(urlParams.get('page')) || 1;
    const limit = parseInt(urlParams.get('limit')) || 10;

    fetchInventory(page, limit);

    // Listen for changes to search input
    searchInput.addEventListener('input', () => {
        const searchQuery = searchInput.value.trim();

        fetchInventory(page, limit, searchQuery);
    });

    // Fetch inventory based on parameters
    async function fetchInventory(page = 1, limit = 10, searchQuery = '') {
        try {

            const response = await fetch(
                `http://localhost:3000/inventory?ajax=true&page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`
            );
            if (!response.ok) {
                throw new Error("Failed to fetch inventory data");
            }

            const data = await response.json();
            const inventory = data.getInventoryList;
            console.log(inventory);

            inventoryTableBody.innerHTML = '';

            if (inventory.length === 0) {
                const noDataRow = document.createElement('tr');
                noDataRow.innerHTML = `
                  <td colspan="5" class="text-center">No Documents found.</td>
              `;
                inventoryTableBody.appendChild(noDataRow);
                return;
            }

            inventory.forEach(invent => {
                const row = document.createElement('tr');
                row.innerHTML = `
                  

              `;
                inventoryTableBody.appendChild(row);
            });
            attachDotEventListeners();
            updatePaginationLinks(page, limit);
        } catch (error) {
            console.error("Error fetching inventory data: ", error);
            inventoryTableBody.innerHTML = '<tr><td colspan="5">Error loading data</td></tr>';
        }
    }


    // Update pagination links based on current and total pages
    function updatePaginationLinks(currentPage, totalPages) {
        const paginationNav = document.getElementById('paginationNav');
        paginationNav.innerHTML = '';

        if (currentPage > 1) {
            paginationNav.innerHTML += `<a href="?page=${currentPage - 1}&limit=${limit}&search=${encodeURIComponent(searchInput.value)}" aria-label="Previous Page">Previous</a>`;
        }

        if (currentPage < totalPages) {
            paginationNav.innerHTML += `<a href="?page=${currentPage + 1}&limit=${limit}&search=${encodeURIComponent(searchInput.value)}" aria-label="Next Page">Next</a>`;
        }
    }
});

function attachDotEventListeners() {
    console.log("ebent attached");
    document.querySelectorAll(".dot").forEach(function (dot) {
        console.log(dot);
        dot.addEventListener("click", function () {
            console.log("dot clicked");
            const tripleDotContainer = dot.closest("td").querySelector(".triple-dot");
            if (tripleDotContainer) {
                tripleDotContainer.classList.toggle("visible");
                if (tripleDotContainer.classList.contains("visible")) {
                    // clearInterval(pollIntervalId);
                    isDotMenuOpen = true;
                } else {
                    // pollIntervalId = setInterval(fetchBeneficiaryUpdates, POLL_INTERVAL);
                    // isDotMenuOpen = false;
                }
            }
        });

        document.addEventListener("click", function (event) {
            // Check if the click was outside the dot container
            if (!dot.contains(event.target)) {
                const tripleDotContainer = dot.closest("td").querySelector(".triple-dot");
                if (tripleDotContainer && tripleDotContainer.classList.contains("visible")) {
                    tripleDotContainer.classList.remove("visible");
                    // pollIntervalId = setInterval(fetchBeneficiaryUpdates, POLL_INTERVAL);
                    // isDotMenuOpen = false;
                }
            }
        });
    });

}

window.popUp_three_dot = function (button) {
    const action = button.textContent.trim();
    const menu = button.closest('.menu');
    const inventoryID = menu.getAttribute('data-id');

    if (action === 'Delete' && inventoryID) {

        const confirmDeleteButton = document.getElementById('confirm-delete');
        const cancelDeleteButton = document.getElementById('cancel-delete');
        const pop_up_Delete = document.getElementById('delete-inventory');

        pop_up_Delete.classList.add("visible");
        overlay.classList.add("visible");

        confirmDeleteButton.addEventListener('click', function () {
            deleteItem(inventoryID);
            pop_up_Delete.classList.remove("visible");
            overlay.classList.remove("visible");
        })
        cancelDeleteButton.addEventListener('click', function () {
            pop_up_Delete.classList.remove("visible");
            overlay.classList.remove("visible");
        })
    }
    if (action === 'Update' && inventoryID) {
        const updateContainer = document.getElementById("add-inventory");
        document.querySelector('#add-inventory .heading').innerText = "UPDATE ITEM";
        document.querySelector('#add-inventory #submit_add_inbentory').innerText = "UPDATE";
        document.querySelector('#add-inventory form').action = `/inventory/dashboard/update-item`;
        updateContainer.classList.add("visible");
        overlay.classList.toggle("visible");

        fetch(`/inventory/dashboard/item/${inventoryID}`)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(itemData => {
                fillInputs(itemData);
            })
            .catch(error => {
                console.error('Error fetching residents data:', error);
                alert('Failed to fetch residents data. Please try again.');
            });
    }


};

const addInventory = document.getElementById("add-inventory");
function popUp_button(button) {
    var buttonId = button.id;
    if (buttonId === "add-inventory-button") {
        document.querySelector('#add-inventory form').action = `/inventory/dashboard/add-item`;
        document.querySelector('#add-inventory .heading').innerText = "ADD ITEM";
        document.querySelector('#add-inventory #submit_add_inbentory').innerText = "SUBMIT";
        addInventory.classList.toggle("visible");
        overlay.classList.add("visible");
    }
}

function deleteItem(inventoryID) {
    console.log("delete triggered");

    try {
        const response = fetch(`/inventory/delete-item/${inventoryID}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            fetchInventory(page, limit, searchQuery, isFunctional);
            attachDotEventListeners();
            location.reload();
        } else {
            console.error("Error: Failed to delete the item.");
            location.reload();
        }
    } catch (error) {
        console.error('Error deleting item:', error);
    }
}

function fillInputs(data) {
    clearFillInputs();
    console.log('Data passed to fillInputs:', data);

    const elements = {
        itemId: data.id,
        iName: data.iname,
        categoryName: data.categoryname,
        isFunctional: data.isfunctional ? "true" : "false",
        dateAdded: data.dateadded ? data.dateadded.split('T')[0] : '',
        quantity: data.quantity,
        iPrice: data.iprice
    };

    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = elements[id] || '';
        } else {
            console.warn(`Element with ID ${id} not found`);
        }
    });
}

function clearFillInputs() {
    const elements = {
        itemId,
        iName,
        categoryName,
        isFunctional,
        dateAdded,
        quantity,
        iPrice
    };

    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        } else {
            console.warn(`Element with ID ${id} not found`);
        }
    });
}
