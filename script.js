function validatePassword() {
  const passwordInput = document.querySelector(".password-input");
  const password = passwordInput.value;
  const pattern =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]{8,}$/;

  if (!pattern.test(password)) {
    alert(
      "Password format is not valid. Please follow the required format:\n\n" +
        "- At least one digit (0-9)\n" +
        "- At least one lowercase letter (a-z)\n" +
        "- At least one uppercase letter (A-Z)\n" +
        "- At least one special character (!@#$%^&*)\n" +
        "- Minimum length of 8 characters"
    );
    return false;
  }

  return true;
}