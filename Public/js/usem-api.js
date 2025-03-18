document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchUser");
  const userList = document.getElementById("userList");

  searchInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();

    if (query.length === 0) {
      window.location.reload(); // Reload page to reset table
      return;
    }

    try {
      const response = await fetch(`/usem/search?query=${query}`);
      const users = await response.json();

      let resultsHTML = users
        .map(
          (user) =>
            `<tr>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.status}</td>
                <td>${user.last_login}</td>
                <td>
                  <button
                      class="dropdown-item remove"
                      onclick="openRemovePopup(${user.user_id})"
                    >
                      <i class="fas fa-trash"></i> Remove
                    </button>
              </tr>`
        )
        .join("");

      userList.innerHTML = resultsHTML;
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  });
});
