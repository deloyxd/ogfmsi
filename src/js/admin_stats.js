document.addEventListener('ogfmsiAdminMainLoaded', function () {
  document.querySelectorAll('.section-stats').forEach((sectionStats) => {
    if (!sectionStats.dataset.activated) {
      sectionStats.dataset.activated = '1';
      sectionStats.addEventListener('click', function (e) {
        if (e.target.title.toLowerCase().includes('see')) {
          if (e.target.title.toLowerCase().includes('breakdown')) {
            // breakdown, todo
          } else {
            // list, todo
          }
          return;
        }
        sectionStats.children[2].classList.toggle('hidden');
        sectionStats.children[3].classList.toggle('hidden');
      });
    }
  });
});
