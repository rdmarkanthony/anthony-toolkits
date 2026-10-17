import { _event } from "./_event";
import { _emitter } from "./_emitter";

const _reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// the page scroll as a timeline, for _parallaxScroller.animate()
let _timeline = null;
const _pageTimeline = () => (_timeline ??= new ScrollTimeline({ source: document.documentElement }));

export const _parallax = {
    clamp(value) {
        return Math.min(Math.max(value, 0), 1);
    },
    scrollTop() {
        return window.scrollY;
    },
    // viewport without the scrollbar
    width() {
        return document.documentElement.clientWidth;
    },
    height(isDocument = false) {
        return isDocument ? document.documentElement.scrollHeight : document.documentElement.clientHeight;
    },
    // position in the document, transforms are ignored
    getOffset(target) {
        let top = 0;
        let left = 0;

        for (let el = target; el; el = el.offsetParent) {
            top += el.offsetTop;
            left += el.offsetLeft;
        }

        return { top, left, bottom: top + target.offsetHeight, right: left + target.offsetWidth };
    },
    // progress, 0 at min and 1 at max
    getRange(min, max) {
        return (_parallax.scrollTop() - min) / (max - min);
    },
    scrollTimeline() {
        return "ScrollTimeline" in window && CSS.supports("animation-timeline: view()");
    },
};

// usage: new _parallaxScroller({ target, events: { init, resize, update } })
// offset.current: 0 as the target enters, 1 as it leaves
// animate() for css values, update for the rest
export class _parallaxScroller extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;

        this.el = {};
        this.offset = {
            top: 0,
            bottom: 0,
            current: 0,
        };

        this.animations = [];
        this.measured = false;
        this.unsubscribe = [];

        if (this.target) this.init();
    }

    init() {
        this.emit("init");

        this.unsubscribe.push(_event.observeResize(() => this.refresh()));
        this.unsubscribe.push(
            _event.resize((state) => {
                if (state !== "init") this.refresh();
            })
        );

        this.unsubscribe.push(_event.scroll(() => this.update()));
    }

    refresh() {
        this.resize();
        this.update();
    }

    resize() {
        const _offset = _parallax.getOffset(this.target);

        this.offset.top = _offset.top - _parallax.height();
        this.offset.bottom = _offset.bottom;

        this.emit("resize");

        this.measured = true;
        this.animations.forEach((item) => this.place(item));
    }

    update() {
        this.offset.current = _parallax.getRange(this.offset.top, this.offset.bottom);

        this.animations.forEach((item) => this.seek(item));

        this.emit("update");
    }

    // scroll position from a percent or a position
    position(value) {
        return typeof value === "string" && value.includes("%") ? this.offset.top + (parseFloat(value) / 100) * (this.offset.bottom - this.offset.top) : value;
    }

    // progress within a range, by percent or scroll position
    portion(min, max) {
        return _parallax.getRange(this.position(min), this.position(max));
    }

    // usage: animate(target, { opacity: [0, 1] }, ["0%", "50%"]), default the whole range
    // keyframes and range can be functions, rerun on resize
    animate(target, keyframes, range = ["0%", "100%"]) {
        const _item = { target, keyframes, range, animation: null };

        this.animations.push(_item);
        if (this.measured) this.place(_item);

        return this;
    }

    place(item) {
        const _keyframes = typeof item.keyframes === "function" ? item.keyframes(this) : item.keyframes;
        const _range = typeof item.range === "function" ? item.range(this) : item.range;
        [item.min, item.max] = _range.map((value) => this.position(value));

        // without scroll timelines, update() sets its time instead
        item.manual ??= !_parallax.scrollTimeline();

        if (item.manual) {
            if (!item.animation) {
                item.animation = item.target.animate(_keyframes, { duration: 1000, fill: "both" });
                item.animation.pause();
            } else if (typeof item.keyframes === "function") {
                item.animation.effect.setKeyframes(_keyframes);
            }
        } else {
            // iOS Safari ignores changes to a running one, so a new one, the old goes once it shows
            const _key = JSON.stringify([item.min, item.max, _keyframes]);

            if (_key !== item.key) {
                const _old = item.animation;
                const _cancel = () => _old?.cancel();

                item.key = _key;
                item.animation = item.target.animate(_keyframes, { timeline: _pageTimeline(), fill: "both" });
                item.animation.rangeStart = `${item.min}px`;
                item.animation.rangeEnd = `${item.max}px`;
                item.animation.ready.then(_cancel, _cancel);
            }
        }

        this.seek(item);
    }

    seek(item) {
        if (item.manual) item.animation.currentTime = (_parallax.clamp(_parallax.getRange(item.min, item.max)) || 0) * 1000;
    }

    destroy() {
        this.animations.forEach((item) => item.animation?.cancel());
        this.animations = [];
        this.unsubscribe.forEach((off) => off());
        this.unsubscribe = [];
        this.listeners = {};
    }
}

// usage: new _parallaxOffset({ target, trigger }), sets --offset and --near, trigger defaults to the parent
// --offset: -1 to 1 across the screen, --near: 1 in the middle
// css does the motion, e.g. parallax.css
export class _parallaxOffset {
    constructor(props) {
        this.target = props.target ?? null;
        this.trigger = props.trigger ?? this.target?.parentElement;

        this.offset = null;
        this.scroller = null;

        if (this.target && !this.target.dataset.parallaxInit && !_reducedMotion()) this.init();
    }

    init() {
        this.target.dataset.parallaxInit = "true";

        this.scroller = new _parallaxScroller({
            target: this.trigger,
            events: {
                update: (scroller) => this.update(scroller.offset.current),
            },
        });
    }

    update(progress) {
        const _offset = Math.round(Math.max(-1, Math.min(progress * 2 - 1, 1)) * 10000) / 10000;
        if (_offset === this.offset) return;

        this.offset = _offset;
        this.target.style.setProperty("--offset", _offset);
        this.target.style.setProperty("--near", 1 - Math.abs(_offset));
    }

    destroy() {
        this.scroller?.destroy();
        this.target.style.removeProperty("--offset");
        this.target.style.removeProperty("--near");
        delete this.target.dataset.parallaxInit;
    }
}

// --range for parallax.css, px or any css length
class _parallaxRange {
    setRange(value, fallback) {
        const _value = value?.trim() || String(fallback);
        this.range = /^-?[\d.]+$/.test(_value) ? `${_value}px` : _value;
        this.target.style.setProperty("--range", this.range);
    }

    // eased: the script sets --offset, a transition eases it
    follow(trigger, easing) {
        this.target.dataset.parallaxOffset = easing ? "easing" : "";
        this.offset = new _parallaxOffset({ target: this.target, trigger });
    }

    destroy() {
        this.offset?.destroy();
        this.scroller?.destroy();
        this.target.style.removeProperty("--range");
        delete this.target.dataset.parallaxOffset;
    }
}

// usage: data-parallax-background="range,easing", range default 500
// fills its overflow-hidden parent, moves -range to 0
// the browser moves it, the script when eased
export class _parallaxBackground extends _parallaxRange {
    constructor(props) {
        super();
        this.target = props.target ?? null;

        const [_range, _easing] = (this.target?.dataset.parallaxBackground ?? "").split(",");
        this.easing = _easing?.trim() === "easing" || (props.easing ?? false);
        this.offset = null;
        this.scroller = null;

        if (!this.target) return;

        this.setRange(_range, props.range ?? 500);

        if (this.easing) this.follow(this.target.parentElement, true);
        else if (!_reducedMotion()) {
            this.scroller = new _parallaxScroller({
                target: this.target.parentElement,
                events: {
                    init: (scroller) => scroller.animate(this.target, { translate: [`0 calc(${this.range} * -1)`, "0 0"] }),
                },
            });
        }
    }
}

// usage: data-parallax-floating="range", range default 50
// moves 0 to range, always eased
export class _parallaxFloating extends _parallaxRange {
    constructor(props) {
        super();
        this.target = props.target ?? null;
        this.offset = null;

        if (this.target) {
            this.setRange(this.target.dataset.parallaxFloating, props.range ?? 50);
            this.follow(this.target, true);
        }
    }
}
