const scripts = Array.from(document.querySelectorAll('.section')).map(
  (section) => '/src/js/admin_modules/' + section.id.split('-section')[0].replace(/-/g, '_') + '.js'
);
scripts.forEach((script) => {
  const scriptEl = document.createElement('script');
  scriptEl.type = 'module';
  scriptEl.src = script;
  document.body.appendChild(scriptEl);
});

// VANTA.CLOUDS2({
//   el: '#vanta-bg',
//   mouseControls: true,
//   touchControls: true,
//   gyroControls: false,
//   minHeight: 10.0,
//   minWidth: 190.0,
//   texturePath: '/src/images/noise.png',
// });

VANTA.DOTS({
  el: '#vanta-bg',
  mouseControls: true,
  touchControls: true,
  gyroControls: false,
  minHeight: 10.0,
  minWidth: 190.0,
  scale: 1.0,
  scaleMobile: 1.0,
  size: 2.3,
  spacing: 21.0,
  showLines: false,
});
