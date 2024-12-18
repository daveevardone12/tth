document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  const passwordField = document.getElementById("password");
  const confirmPasswordField = document.getElementById("confirmPassword");
  const errorMessage = document.getElementById("error-message");

  form.addEventListener("submit", function (e) {
    let valid = true;
    errorMessage.textContent = "";

    if (!passwordField.value || !confirmPasswordField.value) {
      valid = false;
      errorMessage.textContent = "Both fields are required.";
    } else if (passwordField.value !== confirmPasswordField.value) {
      valid = false;
      errorMessage.textContent = "Passwords do not match.";
    } else if (passwordField.value.length < 8) {
      valid = false;
      errorMessage.textContent = "Password must be at least 8 characters long.";
    }

    if (!valid) {
      e.preventDefault();
    }
  });
});
