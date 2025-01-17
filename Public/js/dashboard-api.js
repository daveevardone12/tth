document.addEventListener("DOMContentLoaded", function () {
  let isSearching = false;
  let currentSearchQuery = "";
  const loadingSpinner = document.getElementById("loadingSpinner");
  const overlay = document.getElementById("sort-by-overlay");

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
          ambotnahingangalimotakhitdida(data);
          console.log(data);
        })
        .catch((error) => {
          console.error("Error fetching inventory updates:", error);
        });
    }
  }

  fetchInventoryUpdates();
});
