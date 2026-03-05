// Shared hamburger menu component
// Injects #global-menu-btn and #global-menu into the page.
// Usage: include this script, then call initGlobalMenu(items) where
//   items = [{ id: 'my-btn', label: '✨ Do thing' }, …]
// Returns { menuBtn, menu } elements for further customization.
(function () {
  'use strict';

  // Inject SVG icon symbol if not already present
  if (!document.getElementById('icon-menu')) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.style.display = 'none';
    svg.innerHTML =
      '<symbol id="icon-menu" viewBox="0 0 24 24">' +
      '<path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</symbol>';
    document.body.insertBefore(svg, document.body.firstChild);
  }

  // Create menu button
  var menuBtn = document.createElement('button');
  menuBtn.id = 'global-menu-btn';
  menuBtn.setAttribute('aria-label', 'Menu');
  menuBtn.innerHTML = '<svg class="icon"><use href="#icon-menu"/></svg>';
  document.body.insertBefore(menuBtn, document.body.firstChild);

  // Create menu container
  var menu = document.createElement('div');
  menu.id = 'global-menu';
  menu.hidden = true;
  menuBtn.insertAdjacentElement('afterend', menu);

  // Toggle logic
  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });

  document.addEventListener('click', function () {
    menu.hidden = true;
  });

  menu.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  /**
   * Populate the menu with items.
   * @param {Array<{id?: string, label: string, href?: string, onClick?: function}>} items
   */
  window.initGlobalMenu = function (items) {
    items.forEach(function (item) {
      var btn = document.createElement('button');
      if (item.id) btn.id = item.id;
      if (item.dataI18n) btn.setAttribute('data-i18n', item.dataI18n);
      btn.textContent = item.label;
      btn.addEventListener('click', function () {
        menu.hidden = true;
        if (item.href) {
          window.location.href = item.href;
        } else if (item.onClick) {
          item.onClick();
        }
      });
      menu.appendChild(btn);
    });
  };
})();
