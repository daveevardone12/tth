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
                  <form action="/usem/delete/${user.id}" method="POST">
                    <button type="submit">Delete</button>
                  </form>
                </td>
              </tr>`
        )
        .join("");

      userList.innerHTML = resultsHTML;
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  });
});
