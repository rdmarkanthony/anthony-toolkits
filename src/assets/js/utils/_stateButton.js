import { _emitter } from "./_emitter";

// usage: new _stateButton({ target, minTime, duration, events }), a label per state inside: <span data-label="loading">
// set("loading") shows that label and the width eases to fit it; target gets data-state, aria-busy while loading
// minTime (ms) keeps loading on screen at least that long, so a fast answer doesn't flash; events change
// target has overflow-hidden whitespace-nowrap; reduced motion swaps without easing
export class _stateButton extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.minTime = props.minTime ?? 600;
        this.duration = props.duration ?? 450;

        this.labels = [];
        this.state = null;
        this.loadedAt = 0;
        this.timer = null;
        this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (this.target) this.init();
    }

    init() {
        this.labels = [...this.target.querySelectorAll("[data-label]")];
        this.state = this.target.dataset.state ?? this.labels[0]?.dataset.label;
        this.labels.forEach((label) => (label.hidden = label.dataset.label !== this.state));
        this.target.dataset.state = this.state;
    }

    set(state) {
        clearTimeout(this.timer);
        if (state === this.state) return;

        const _left = this.state === "loading" ? this.minTime - (performance.now() - this.loadedAt) : 0;
        if (_left > 0) this.timer = setTimeout(() => this.apply(state), _left);
        else this.apply(state);
    }

    apply(state) {
        const _from = this.target.getBoundingClientRect().width;
        this.labels.forEach((label) => (label.hidden = label.dataset.label !== state));
        const _to = this.target.getBoundingClientRect().width;

        this.state = state;
        this.target.dataset.state = state;
        if (state === "loading") {
            this.loadedAt = performance.now();
            this.target.setAttribute("aria-busy", "true");
        } else {
            this.target.removeAttribute("aria-busy");
        }

        if (!this.reduce) {
            const _easing = "cubic-bezier(0.22, 1, 0.36, 1)";
            this.target.animate({ width: [`${_from}px`, `${_to}px`] }, { duration: this.duration, easing: _easing });
            this.labels.find((label) => label.dataset.label === state)?.animate({ opacity: [0, 1], translate: ["0 0.6em", "0 0"] }, { duration: this.duration, easing: _easing });
        }

        this.emit("change");
    }

    destroy() {
        clearTimeout(this.timer);
        this.target?.getAnimations().forEach((animation) => animation.cancel());
        this.listeners = {};
    }
}
