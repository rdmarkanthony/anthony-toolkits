// Requirements
    // JS
        // src/assets/js/utils/_emitter.js
        // src/assets/js/utils/_load.js
        // src/assets/js/utils/_preloader.js

const _count = document.querySelector('.js-preloader-count');
const _page = document.querySelector('.js-page');

new _preloader({
    target: document.querySelector('.js-preloader'),
    wait: [_load.image('/assets/img/gallery/photo-2.webp')],
    min: 2000,
    // slides up, the page rises under it
    leave: (target) => target.animate({ translate: ['0 0', '0 -100%'] }, { duration: 900, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' }),
    events: {
        progress: ({ progress }) => (_count.textContent = Math.round(progress * 100)),
        leave: () => _page.animate({ translate: ['0 8rem', '0 0'] }, { duration: 1200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }),
    },
});
