const scripts = Array.from(document.querySelectorAll('.section')).map(
  (section) => '/src/js/admin_modules/' + section.id.split('-section')[0].replace(/-/g, '_') + '.js'
);
scripts.forEach((script) => {
  const scriptEl = document.createElement('script');
  scriptEl.type = 'module';
  scriptEl.src = script;
  document.body.appendChild(scriptEl);
});
