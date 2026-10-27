// smooth page scroll with Lenis, the page still scrolls natively so _parallaxScroller and other scroll utils follow it
// usage: const smooth = new _smoothScroll({ options: { ...Lenis options }, events: { init, scroll } })
// smooth.scrollTo(target, options), smooth.stop() / start() while a popup is open, smooth.lenis.velocity in scroll
// #id links scroll smoothly too, and stop at the target's scroll-margin-top; off with prefers-reduced-motion
// css, in your main css file: @import "lenis/dist/lenis.css";

import { _emitter } from "./_emitter";

// lenis, loaded on first use so other pages don't download it
const _importLenis = () => import("lenis");

export class _smoothScroll extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.options = props.options ?? {};
        this.lenis = null;

        this.init();
    }

    async init() {
        const { default: Lenis } = await _importLenis();
        if (this.destroyed) return;

        // Lenis runs its own frame loop
        this.lenis = new Lenis({ autoRaf: true, ...this.options });
        this.lenis.on("scroll", () => this.emit("scroll"));

        document.addEventListener("click", this.onClick);

        this.emit("init");
    }

    // #id links on this page glide there, instead of the browser's jump
    onClick = (e) => {
        const _link = e.target.closest("a[href*='#']");
        if (!_link || e.defaultPrevented || _link.pathname !== location.pathname || _link.search !== location.search) return;

        const _target = _link.hash.length > 1 && document.getElementById(decodeURIComponent(_link.hash.slice(1)));
        if (!_target) return;

        e.preventDefault();
        this.lenis.scrollTo(_target);
        history.pushState(null, "", _link.hash);
    };

    scrollTo(target, options) {
        this.lenis?.scrollTo(target, options);
    }

    stop() {
        this.lenis?.stop();
    }

    start() {
        this.lenis?.start();
    }

    destroy() {
        this.destroyed = true;
        document.removeEventListener("click", this.onClick);
        this.lenis?.destroy();
        this.lenis = null;
        this.listeners = {};
    }
}
