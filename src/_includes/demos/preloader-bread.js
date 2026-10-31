// Requirements
    // JS
        // src/assets/js/utils/_emitter.js
        // src/assets/js/utils/_load.js
        // src/assets/js/utils/_preloader.js

const _count = document.querySelector('.js-preloader-count');

new _preloader({
    target: document.querySelector('.js-preloader'),
    wait: [_load.image('/assets/img/gallery/photo-3.webp')],
    min: 2500,
    // a circle closes on the middle
    leave: (target) => target.animate({ clipPath: ['circle(75% at 50% 50%)', 'circle(0% at 50% 50%)'] }, { duration: 800, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }),
    events: {
        progress: ({ progress }) => (_count.textContent = Math.round(progress * 100)),
    },
});
