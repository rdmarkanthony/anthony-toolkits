import { _emitter } from "./_emitter";

// usage: new _ripple({ target, duration, opacity, events }), target has relative isolate overflow-hidden
// a ring spreads out from where it's pressed, from the center for keyboard; color from --ripple, the text color by default
// play(x, y) runs one from code, x and y in px inside the target; events ripple
// off for reduced motion
export class _ripple extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.duration = props.duration ?? 700;
        this.opacity = props.opacity ?? 0.3;

        this.abort = new AbortController();
        this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (this.target && !this.reduce) this.init();
    }

    init() {
        const _options = { signal: this.abort.signal };
        this.target.addEventListener(
            "pointerdown",
            (e) => {
                if (e.button !== 0) return;
                const _rect = this.target.getBoundingClientRect();
                this.play(e.clientX - _rect.left, e.clientY - _rect.top);
            },
            _options
        );
        // e.detail is 0 for Enter and Space
        this.target.addEventListener("click", (e) => e.detail === 0 && this.play(), _options);
    }

    play(x, y) {
        if (this.reduce) return;

        const _width = this.target.offsetWidth;
        const _height = this.target.offsetHeight;
        x ??= _width / 2;
        y ??= _height / 2;
        const _size = Math.hypot(Math.max(x, _width - x), Math.max(y, _height - y)) * 2;

        const _ring = document.createElement("span");
        _ring.setAttribute("aria-hidden", "true");
        _ring.style.cssText = `position: absolute; z-index: -1; left: ${x}px; top: ${y}px; width: ${_size}px; height: ${_size}px; border-radius: 50%; pointer-events: none; translate: -50% -50%; background: var(--ripple, currentColor);`;
        this.target.prepend(_ring);

        _ring
            .animate(
                [
                    { scale: 0, opacity: this.opacity },
                    { scale: 1, opacity: 0 },
                ],
                { duration: this.duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
            )
            .finished.then(
                () => _ring.remove(),
                () => _ring.remove()
            );

        this.emit("ripple");
    }

    destroy() {
        this.abort.abort();
        this.listeners = {};
    }
}
