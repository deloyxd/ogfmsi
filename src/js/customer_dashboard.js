function setupMobileDropdown() {
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  mobileMenuButton.addEventListener("click", function () {
    mobileMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", function (event) {
    if (
      !mobileMenu.contains(event.target) &&
      !mobileMenuButton.contains(event.target)
    ) {
      mobileMenu.classList.add("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  setupMobileDropdown();
});
