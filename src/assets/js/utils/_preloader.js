import { _emitter } from "./_emitter";

// usage: new _preloader({ target, wait, min, timeout, leave, events })
// the look is your markup, it shows until window load and every promise in wait (e.g. _load.image(src)) are done
// target gets --progress, 0 to 1, eased and no faster than min ms, so a fast page doesn't flash it
// leave: (target) => an animation, a fade by default, then target is hidden. events: progress, leave, done
const _root = document.documentElement;

export class _preloader extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.wait = props.wait ?? [];
        this.min = props.min ?? 1200;
        this.timeout = props.timeout ?? 10000;
        this.leave = props.leave ?? ((target) => target.animate({ opacity: [1, 0] }, { duration: 600, easing: "ease", fill: "forwards" }));

        this.progress = 0;
        this.loaded = 0;
        this.isDone = false;

        if (this.target) this.init();
    }

    init() {
        const _page = document.readyState === "complete" ? Promise.resolve() : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
        const _tasks = [_page, ...this.wait];

        // a failed one still counts, the site shouldn't get stuck
        _tasks.forEach((task) => Promise.resolve(task).catch(() => {}).then(() => this.loaded++));
        this.total = _tasks.length;

        this._overflow = _root.style.overflow;
        _root.style.overflow = "hidden";

        this._start = performance.now();
        this._tick = (now) => this.update(now);
        this._frame = requestAnimationFrame(this._tick);
    }

    update(now) {
        const _elapsed = now - this._start;
        const _real = _elapsed > this.timeout ? 1 : this.loaded / this.total;
        const _cap = Math.min(_real, _elapsed / this.min);

        // eased by time, the same at any frame rate
        this.progress += (_cap - this.progress) * (1 - Math.exp(-(now - (this._last ?? now)) / 120));
        this._last = now;
        if (_cap === 1 && this.progress > 0.999) this.progress = 1;

        this.target.style.setProperty("--progress", Math.round(this.progress * 10000) / 10000);
        this.emit("progress");

        if (this.progress < 1) this._frame = requestAnimationFrame(this._tick);
        else this.finish();
    }

    async finish() {
        _root.style.overflow = this._overflow;
        this.emit("leave");

        // an animation or a promise, e.g. a gsap tween
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const _leave = this.leave(this.target);
            await (_leave?.finished ?? _leave);
        }

        this.target.hidden = true;
        this.isDone = true;
        this.emit("done");
    }

    destroy() {
        cancelAnimationFrame(this._frame);
        _root.style.overflow = this._overflow;
        this.target.style.removeProperty("--progress");
    }
}
