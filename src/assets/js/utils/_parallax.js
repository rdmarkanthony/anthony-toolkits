import { gsap } from "gsap";
import { _event } from "./_event";

const _reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const _parallax = {
    // limit between 0 and 1
    clamp(value) {
        return Math.min(Math.max(value, 0), 1);
    },
    scrollTop() {
        return window.scrollY;
    },
    // viewport size without the scrollbar, what the layout fits into
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
};

// usage: new _parallaxScroller({ target, events: { init, resize, update } })
// offset.current is 0 when the target enters the screen and 1 when it leaves, change offset.top/bottom on resize
export class _parallaxScroller {
    constructor(props) {
        this.target = props.target ?? null;

        this.el = {};
        this.offset = {
            top: 0,
            bottom: 0,
            current: 0,
        };

        this.events = props.events ?? {};
        this.listeners = {};
        this.unsubscribe = [];

        if (this.target) this.init();
    }

    init() {
        this.emit("init");

        // for resize
        this.unsubscribe.push(_event.observeResize(() => this.refresh()));
        this.unsubscribe.push(
            _event.resize((state) => {
                if (state !== "init") this.refresh();
            })
        );

        // for scroll
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
    }

    update() {
        this.offset.current = _parallax.getRange(this.offset.top, this.offset.bottom);

        this.emit("update");
    }

    // progress within a range, by percent or scroll position
    portion(min, max) {
        if (typeof min === "string" && min.includes("%")) {
            const _min = parseFloat(min) / 100;
            const _max = parseFloat(max) / 100;

            return (this.offset.current - _min) / (_max - _min);
        }

        return _parallax.getRange(min, max);
    }

    // register event listener
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = new Set();
        this.listeners[event].add(callback);
    }

    // remove event listener
    off(event, callback) {
        this.listeners[event]?.delete(callback);
    }

    // emit certain event
    emit(event) {
        this.events[event]?.(this);
        this.listeners[event]?.forEach((callback) => callback(this));
    }

    destroy() {
        this.unsubscribe.forEach((off) => off());
        this.unsubscribe = [];
        this.listeners = {};
    }
}

// usage: data-parallax-background="range,easing", range in px (default 500)
export class _parallaxBackground {
    constructor(props) {
        this.target = props.target ?? null;

        const [_range, _easing] = (this.target?.dataset.parallaxBackground ?? "").split(",");
        this.range = Number.isNaN(parseInt(_range)) ? (props.range ?? 500) : parseInt(_range);
        this.easing = _easing === "easing" || (props.easing ?? false);

        this.y = null;
        this.scroller = null;

        if (this.target && !this.target.dataset.parallaxInit && !_reducedMotion()) this.init();
    }

    init() {
        this.target.dataset.parallaxInit = "true";
        this.target.style.willChange = "transform";

        this.setY = this.easing ? gsap.quickTo(this.target, "y", { duration: 0.5, ease: "power3" }) : gsap.quickSetter(this.target, "y", "px");

        this.scroller = new _parallaxScroller({
            target: this.target.parentElement,
            events: {
                // taller than the parent by the range, so it always covers it
                resize: (scroller) => (this.target.style.height = `${scroller.target.offsetHeight + this.range}px`),
                update: (scroller) => this.update(scroller.offset.current),
            },
        });
    }

    update(progress) {
        // from -range to 0
        const _y = Math.round((_parallax.clamp(progress) - 1) * this.range * 10) / 10;
        if (_y === this.y) return;

        this.y = _y;
        this.setY(_y);
    }

    destroy() {
        this.scroller?.destroy();
        gsap.set(this.target, { clearProps: "transform,height,willChange" });
        delete this.target.dataset.parallaxInit;
    }
}

// usage: data-parallax-floating="range", range in px (default 50)
export class _parallaxFloating {
    constructor(props) {
        this.target = props.target ?? null;

        const _range = parseInt(this.target?.dataset.parallaxFloating);
        this.range = Number.isNaN(_range) ? (props.range ?? 50) : _range;

        this.y = null;
        this.scroller = null;

        if (this.target && !this.target.dataset.parallaxInit && !_reducedMotion()) this.init();
    }

    init() {
        this.target.dataset.parallaxInit = "true";
        this.target.style.willChange = "transform";

        this.setY = gsap.quickTo(this.target, "y", { duration: 0.5, ease: "power3" });

        this.scroller = new _parallaxScroller({
            target: this.target,
            events: {
                update: (scroller) => this.update(scroller.offset.current),
            },
        });
    }

    update(progress) {
        // from 0 to range
        const _y = Math.round(_parallax.clamp(progress) * this.range * 10) / 10;
        if (_y === this.y) return;

        this.y = _y;
        this.setY(_y);
    }

    destroy() {
        this.scroller?.destroy();
        gsap.set(this.target, { clearProps: "transform,willChange" });
        delete this.target.dataset.parallaxInit;
    }
}
