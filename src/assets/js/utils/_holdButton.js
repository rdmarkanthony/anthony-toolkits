import { _emitter } from "./_emitter";

// usage: new _holdButton({ target, duration, release, events }), for actions that need a second thought
// press and hold (mouse, touch, Enter or Space) and --hold goes 0 to 1 on the target, let go early and it runs back
// --hold is your own css, e.g. a bar with scale-x-(--hold); data-holding while pressed, data-confirmed when done
// release is how much faster it runs back; methods start(), cancel(), reset(); events start, cancel, confirm
export class _holdButton extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.duration = props.duration ?? 1200;
        this.release = props.release ?? 3;

        this.animation = null;
        this.isHolding = false;
        this.isConfirmed = false;
        this.abort = new AbortController();

        if (this.target) this.init();
    }

    init() {
        // registered, so --hold can be animated
        try {
            CSS.registerProperty({ name: "--hold", syntax: "<number>", inherits: true, initialValue: "0" });
        } catch {}

        const _on = (type, callback) => this.target.addEventListener(type, callback, { signal: this.abort.signal });
        const _isKey = (e) => e.key === "Enter" || e.key === " ";

        _on("pointerdown", (e) => {
            if (e.button !== 0) return;
            this.target.setPointerCapture(e.pointerId);
            this.start();
        });
        _on("pointerup", () => this.cancel());
        _on("pointercancel", () => this.cancel());
        _on("keydown", (e) => {
            if (!_isKey(e)) return;
            e.preventDefault();
            if (!e.repeat) this.start();
        });
        _on("keyup", (e) => _isKey(e) && this.cancel());
        _on("blur", () => this.cancel());
        // no long-press menu on touch
        _on("contextmenu", (e) => e.preventDefault());
    }

    start() {
        if (this.isHolding || this.isConfirmed) return;
        this.isHolding = true;

        if (this.animation) {
            this.animation.updatePlaybackRate(1);
            this.animation.play();
        } else {
            this.animation = this.target.animate({ "--hold": [0, 1] }, { duration: this.duration, fill: "forwards" });
            this.animation.onfinish = () => this.finish();
        }

        this.target.setAttribute("data-holding", "");
        this.emit("start");
    }

    cancel() {
        if (!this.isHolding) return;
        this.isHolding = false;

        this.animation.updatePlaybackRate(-this.release);
        this.target.removeAttribute("data-holding");
        this.emit("cancel");
    }

    finish() {
        // ran back to 0
        if (this.animation.playbackRate < 0) return this.reset();

        this.isHolding = false;
        this.isConfirmed = true;
        this.target.removeAttribute("data-holding");
        this.target.setAttribute("data-confirmed", "");
        this.emit("confirm");
    }

    reset() {
        this.animation?.cancel();
        this.animation = null;
        this.isHolding = false;
        this.isConfirmed = false;
        this.target.removeAttribute("data-holding");
        this.target.removeAttribute("data-confirmed");
    }

    destroy() {
        this.abort.abort();
        this.reset();
        this.listeners = {};
    }
}
