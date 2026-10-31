// Requirements
    // JS
        // src/assets/js/utils/_emitter.js
        // src/assets/js/utils/_load.js
        // src/assets/js/utils/_preloader.js

// defaults: min: 1200, timeout: 10000, a fade out
new _preloader({
    target: document.querySelector('.js-preloader'),
    wait: [_load.image('/assets/img/gallery/photo-1.webp'), _load.font('Bricolage Grotesque', { weight: 600 })],
});
