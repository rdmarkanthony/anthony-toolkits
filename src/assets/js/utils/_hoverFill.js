import { _emitter } from "./_emitter";

// usage: new _hoverFill({ target, duration, events }), target has relative isolate overflow-hidden
// a circle grows from where the mouse comes in and shrinks out where it leaves, color from --hover-fill
// target gets data-active while hovered, for the text color; events enter, leave
// mouse only, off for touch and reduced motion
export class _hoverFill extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.duration = props.duration ?? 600;

        this.circle = null;
        this.animation = null;
        this.abort = new AbortController();

        const _canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        const _reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (this.target && _canHover && !_reduce) this.init();
    }

    init() {
        this.circle = document.createElement("span");
        this.circle.setAttribute("aria-hidden", "true");
        this.circle.style.cssText = "position: absolute; z-index: -1; border-radius: 50%; pointer-events: none; translate: -50% -50%; scale: 0; background: var(--hover-fill, currentColor);";
        this.target.prepend(this.circle);

        const _options = { signal: this.abort.signal };
        this.target.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && this.enter(e), _options);
        this.target.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && this.leave(e), _options);
    }

    place(e) {
        const _rect = this.target.getBoundingClientRect();
        const _x = e.clientX - _rect.left;
        const _y = e.clientY - _rect.top;
        const _size = Math.hypot(Math.max(_x, _rect.width - _x), Math.max(_y, _rect.height - _y)) * 2;

        Object.assign(this.circle.style, { left: `${_x}px`, top: `${_y}px`, width: `${_size}px`, height: `${_size}px` });
    }

    enter(e) {
        this.animation?.cancel();
        this.place(e);
        this.animation = this.circle.animate({ scale: [0, 1] }, { duration: this.duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
        this.target.setAttribute("data-active", "");
        this.emit("enter");
    }

    leave(e) {
        // still growing, shrink back to where it came in
        if (this.animation?.playState === "running") {
            this.animation.reverse();
        } else {
            this.place(e);
            this.animation = this.circle.animate({ scale: [1, 0] }, { duration: this.duration * 0.8, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
        }
        this.target.removeAttribute("data-active");
        this.emit("leave");
    }

    destroy() {
        this.abort.abort();
        this.animation?.cancel();
        this.circle?.remove();
        this.target?.removeAttribute("data-active");
        this.listeners = {};
    }
}
