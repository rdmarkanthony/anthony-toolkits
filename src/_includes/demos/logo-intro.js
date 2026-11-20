// Requirements
    // JS
        // src/assets/js/utils/_emitter.js
        // src/assets/js/utils/_load.js
        // src/assets/js/utils/_logoIntro.js (gsap)
    // CSS
        // src/assets/css/components/logo-intro.css

const _intro = new _logoIntro({
    target: document.querySelector('.js-logo-intro'),
    // the ring spins until the page and these are loaded, then the intro plays and the cover slides up
    wait: [
        _load.image('/assets/img/gallery/photo-1.webp'),
        new Promise((resolve) => setTimeout(resolve, 3000)), // demo
    ],
    events: {
        // scene: ({ scene }) => console.log(scene),
        // leave: () => console.log('start the page animations'),
    },
});

window._intro = _intro; // demo
