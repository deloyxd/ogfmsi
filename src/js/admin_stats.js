document.addEventListener('ogfmsiAdminMainLoaded', function () {
  document.querySelectorAll('.section-stats').forEach((sectionStats) => {
    sectionStats.addEventListener('click', (e) => {
      if (e.target.title.toLowerCase().includes('see')) {
        if (e.target.title.toLowerCase().includes('breakdown')) {
          // breakdown, todo
        } else {
          // list, todo
        }
        return;
      }
      sectionStats.lastChild.previousSibling.classList.toggle('hidden');
      sectionStats.lastChild.parentElement.children[2].classList.toggle('hidden');
    });
  });
});
