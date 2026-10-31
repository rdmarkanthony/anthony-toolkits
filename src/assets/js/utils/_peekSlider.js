// card carousel, the next card peeks at the edge
// usage: new _peekSlider({ target, ease, ...Swiper options }), target holds a .swiper
// drag, touch and trackpad swipes move it, page scroll stays vertical
// css: @import "swiper/css" layer(components);

const _importSwiper = () => Promise.all([import("swiper"), import("swiper/modules")]);

export class _peekSlider {
    constructor({ target, ease = "cubic-bezier(0.25, 1, 0.5, 1)", ...options }) {
        this.target = target ?? null;
        this.ease = ease;
        this.options = options;
        this.swiper = null;

        this.lastWheel = null;
        this.wheelLock = null;
        this.onWheel = (e) => this.wheel(e);

        this.ready = this.target ? this.init() : Promise.resolve(null);
    }

    async init() {
        const [{ default: Swiper }, { A11y, Keyboard, Mousewheel }] = await _importSwiper();
        if (!this.target) return null; // destroyed while loading

        this.swiper = new Swiper(this.target.querySelector(".swiper"), {
            modules: [A11y, Keyboard, Mousewheel],
            slidesPerView: 1.2,
            spaceBetween: 16,
            breakpoints: {
                768: { slidesPerView: 2.2, spaceBetween: 24 },
                1024: { slidesPerView: 3.2, spaceBetween: 24 },
            },
            speed: 800,
            grabCursor: true,
            keyboard: { enabled: true, onlyInViewport: true },
            mousewheel: { forceToAxis: true },
            ...this.options,
        });

        this.swiper.wrapperEl.style.transitionTimingFunction = this.ease;

        this.target.addEventListener("wheel", this.onWheel, { capture: true, passive: false });
        this.swiper.on("scroll", () => {
            if (this.lastWheel) this.wheelLock = { ...this.lastWheel, peak: this.lastWheel.delta, min: this.lastWheel.delta };
        });

        return this.swiper;
    }

    wheel(e) {
        const _delta = Math.abs(e.deltaX);
        if (_delta <= Math.abs(e.deltaY)) return;

        const _current = { time: performance.now(), direction: Math.sign(e.deltaX), delta: _delta };
        const _lock = this.wheelLock;

        if (_lock) {
            const _fading = _lock.min < _lock.peak;
            const _newSwipe = _current.time - _lock.time > 100 || _current.direction !== _lock.direction || (_fading && _current.delta > _lock.min * 1.5 && _current.delta > 10);

            if (!_newSwipe) {
                _lock.time = _current.time;
                if (_current.delta >= _lock.peak) _lock.peak = _lock.min = _current.delta;
                else _lock.min = Math.min(_lock.min, _current.delta);

                e.preventDefault();
                e.stopPropagation();
                return;
            }

            this.wheelLock = null;
        }

        this.lastWheel = _current;
    }

    destroy() {
        this.target?.removeEventListener("wheel", this.onWheel, { capture: true });
        this.swiper?.destroy();
        this.swiper = null;
        this.target = null;
    }
}
