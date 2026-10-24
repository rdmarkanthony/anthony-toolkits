import { _emitter } from "./_emitter";

// usage: new _magnetic({ target, strength, radius, ease, events }), or data-magnetic="0.5" on target for its strength
// target gets --x and --y (px) toward the mouse while it's within radius of its edges, and data-active
// the pull is your own css, e.g. translate-x-(--x) translate-y-(--y), an inner part can move more with calc(var(--x) * 1.5)
// mouse only, off for touch and reduced motion
export class _magnetic extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        // 0 to 1 of the mouse's distance from the center
        const _data = parseFloat(this.target?.dataset.magnetic);
        this.strength = props.strength ?? (Number.isNaN(_data) ? 0.35 : _data);
        this.radius = props.radius ?? 40;
        this.ease = props.ease ?? 0.15;

        this.x = 0;
        this.y = 0;
        this.to = { x: 0, y: 0 };
        this.mouse = null;
        this.isActive = false;
        this.frame = null;
        this.abort = new AbortController();

        const _canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        const _reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (this.target && _canHover && !_reduce) this.init();
    }

    init() {
        const _on = (target, type, callback) => target.addEventListener(type, callback, { passive: true, signal: this.abort.signal });

        _on(document, "pointermove", (e) => {
            if (e.pointerType !== "mouse") return;
            this.mouse = { x: e.clientX, y: e.clientY };
            this.check();
        });
        _on(document, "pointerout", (e) => !e.relatedTarget && this.release());
        // the page moves under a still mouse
        _on(window, "scroll", () => this.mouse && this.check());

        this.render();
    }

    check() {
        // its spot without the pull, so it doesn't chase itself
        const _rect = this.target.getBoundingClientRect();
        const _left = _rect.left - this.x;
        const _top = _rect.top - this.y;
        const _dx = this.mouse.x - (_left + _rect.width / 2);
        const _dy = this.mouse.y - (_top + _rect.height / 2);

        const _near = Math.abs(_dx) <= _rect.width / 2 + this.radius && Math.abs(_dy) <= _rect.height / 2 + this.radius;
        if (!_near) return this.release();

        this.to = { x: _dx * this.strength, y: _dy * this.strength };
        if (!this.isActive) {
            this.isActive = true;
            this.target.setAttribute("data-active", "");
            this.emit("enter");
        }
        this.start();
    }

    release() {
        this.to = { x: 0, y: 0 };
        if (this.isActive) {
            this.isActive = false;
            this.target.removeAttribute("data-active");
            this.emit("leave");
        }
        this.start();
    }

    start() {
        if (!this.frame) this.frame = requestAnimationFrame(() => this.tick());
    }

    // eases toward the mouse, stops once it's there
    tick() {
        this.frame = null;
        this.x += (this.to.x - this.x) * this.ease;
        this.y += (this.to.y - this.y) * this.ease;

        if (Math.abs(this.to.x - this.x) < 0.05 && Math.abs(this.to.y - this.y) < 0.05) {
            this.x = this.to.x;
            this.y = this.to.y;
        } else {
            this.start();
        }

        this.render();
    }

    render() {
        this.target.style.setProperty("--x", `${this.x.toFixed(2)}px`);
        this.target.style.setProperty("--y", `${this.y.toFixed(2)}px`);
    }

    destroy() {
        this.abort.abort();
        cancelAnimationFrame(this.frame);
        this.target.style.removeProperty("--x");
        this.target.style.removeProperty("--y");
        this.target.removeAttribute("data-active");
    }
}
