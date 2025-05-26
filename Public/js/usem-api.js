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
                    <div class="dropdown">
                  <button class="icon-button dropdown-toggle" title="Actions">
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                  <ul class="dropdown-menu">
                    <li>
                      <button
                        class="dropdown-item remove"
                        onclick="openRemovePopup('<%= user.user_id %>')"
                      >
                        <i class="fas fa-trash"></i> Remove
                      </button>
                    </li>
                    <li>
                      <button
                        class="dropdown-item modify"
                        onclick="openModal('<%= user.user_id %>')"
                      >
                        <i class="fas fa-edit"></i> Modify
                      </button>
                    </li>
                    <li>
                      <button class="dropdown-item suspended">
                        <i class="fas fa-ban"></i> Suspend
                      </button>
                    </li>
                  </ul>
                </div>
                </tr>`
        )
        .join("");

      userList.innerHTML = resultsHTML;
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  });
});
