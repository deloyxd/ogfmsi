import modal from '../admin_main.js';
import content from './content.js';

document.addEventListener('DOMContentLoaded', function () {
  const mainBtn = Array.from(document.querySelectorAll('.section-main-btn')).find(
    (btn) => btn.dataset.section === 'sales_form'
  );
  mainBtn.addEventListener('click', () => {
    const inputs = {
      image: {
        src: '/src/images/client_logo.jpg',
        type: 'normal',
        short: [
          { placeholder: 'Product Name', value: '', required: true },
          { placeholder: 'Type of Product', value: '', required: true },
          { placeholder: 'Quantity', value: '' },
           { placeholder: 'Price', value: '' },
        ],
      },
    };
    modal.openModal(mainBtn, inputs, (result) => {
      content.registerNewUser(
        result.image.src,
        result.image.short[0].value,
        result.image.short[1].value,
        result.image.short[2].value,
       result.image.short[3].value
      );
    });
  });
});
