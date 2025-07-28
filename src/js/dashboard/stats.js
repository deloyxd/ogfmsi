import modal from "../admin_main.js"; // for breakdown, todo

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".section-stats").forEach((button) => {
    button.addEventListener("click", (e) => {
      if (e.target.title.toLowerCase().includes("see")) {
        if (e.target.title.toLowerCase().includes("breakdown")) {
          // breakdown, todo
        } else {
          // list, todo
        }
        return;
      }
      button.lastChild.previousSibling.classList.toggle("hidden");
      button.lastChild.parentElement.children[2].classList.toggle("hidden");
    });
  });
});
