import SplitType from "split-type";
import { _emitter } from "./_emitter";

// usage: new _weightPop({ target, trigger, stagger, tilt, scale, bold, duration, events })
// on hover or focus the letters pop bolder one after another, tilt a little and settle back
// the bold is a text-shadow in the text color, so any font works and the line doesn't move
// trigger is what's hovered, the target by default; stagger in ms per letter, tilt in deg, bold in em; events play
// off for reduced motion
export class _weightPop extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.trigger = props.trigger ?? this.target;
        this.stagger = props.stagger ?? 35;
        this.tilt = props.tilt ?? 7;
        this.scale = props.scale ?? 1.14;
        this.bold = props.bold ?? 0.025;
        this.duration = props.duration ?? 900;

        this.letters = [];
        this.animations = [];
        this.split = null;
        this.abort = new AbortController();

        const _reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (this.target && !_reduce) this.init();
    }

    init() {
        // screen readers get the text, not the letters
        this.html = this.target.innerHTML;
        this.label = document.createElement("span");
        // innerText keeps a <br> as a space
        this.label.textContent = this.target.innerText.replace(/\s+/g, " ").trim();
        this.label.style.cssText = "position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;";
        this.visual = document.createElement("span");
        this.visual.setAttribute("aria-hidden", "true");
        this.visual.innerHTML = this.html;
        this.target.replaceChildren(this.label, this.visual);

        this.split = new SplitType(this.visual, { types: "words, chars", tagName: "span" });
        this.letters = this.split.chars;

        const _options = { signal: this.abort.signal };
        this.trigger.addEventListener("pointerenter", () => this.play(), _options);
        this.trigger.addEventListener("focusin", () => this.play(), _options);
    }

    // a pop still going finishes first
    play() {
        if (this.animations.some((animation) => animation.playState === "running")) return;

        const _bold = [`${this.bold}em 0`, `-${this.bold}em 0`, `0 ${this.bold}em`, `0 -${this.bold}em`].map((offset) => `${offset} currentColor`).join(", ");

        // a quick pop with a bit of overshoot, then a slower settle
        this.animations = this.letters.map((letter, index) =>
            letter.animate(
                [
                    { easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
                    { scale: this.scale, rotate: `${(Math.random() * 2 - 1) * this.tilt}deg`, textShadow: _bold, offset: 0.4, easing: "ease-out" },
                    {},
                ],
                { duration: this.duration, delay: index * this.stagger }
            )
        );

        this.emit("play");
    }

    destroy() {
        this.abort.abort();
        this.animations.forEach((animation) => animation.cancel());
        this.animations = [];
        this.split?.revert();
        if (this.html !== undefined) this.target.innerHTML = this.html;
        this.letters = [];
        this.listeners = {};
    }
}
