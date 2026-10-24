// Requirements
    // JS
        // src/assets/js/utils/_emitter.js
        // src/assets/js/utils/_event.js
        // src/assets/js/utils/_header.js

const _label = document.querySelector('.js-header-event');
const _log = (name) => () => (_label.textContent = name);

new _header({
    target: document.querySelector('.js-header'),
    // outside the header, a backdrop-blur on it would trap the fixed menu
    menu: document.querySelector('.js-header-menu'),
    // closes the menu when the window reaches lg
    breakpoint: 992,
    // defaults: offset: header height, tolerance: 8
    events: { fix: _log('fix'), unfix: _log('unfix'), hide: _log('hide'), show: _log('show'), open: _log('open'), close: _log('close') },
});

// demo links go nowhere
document.querySelectorAll('a[href="#"]').forEach((link) => link.addEventListener('click', (e) => e.preventDefault()));
