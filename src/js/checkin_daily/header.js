import modal from "../admin_main.js";
import content from "./content.js";

document.addEventListener("DOMContentLoaded", function () {
  const mainBtn = Array.from(
    document.querySelectorAll(".section-main-btn")
  ).find((btn) => btn.dataset.section === "checkin_daily");
  mainBtn.addEventListener("click", () => {
    const inputs = {
      image: {
        src: "/src/images/client_logo.jpg",
        type: "normal",
        short: [
          { placeholder: "First name", value: "", required: true },
          { placeholder: "Last name", value: "", required: true },
          { placeholder: "Email / contact", value: "" },
        ],
      },
    };
    modal.openModal(mainBtn, inputs, (result) => {
      content.registerNewUser(
        result.image.src,
        result.image.short[0].value,
        result.image.short[1].value,
        result.image.short[2].value
      );
    });
  });
});
