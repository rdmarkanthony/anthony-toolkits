import SplitType from "split-type";
import { _emitter } from "./_emitter";
import { _event } from "./_event";

// usage: new _weightHover({ target, min, max, radius, ease, events })
// letters near the mouse get bolder, a wave that follows it, needs a variable font with a weight axis
// min is the text's own weight by default, max 900, radius in px around each letter; events enter, leave
// mouse only, off for touch and reduced motion
export class _weightHover extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.min = props.min ?? null;
        this.max = props.max ?? 900;
        this.radius = props.radius ?? 200;
        this.ease = props.ease ?? 0.15;

        this.letters = [];
        this.mouse = null;
        this.isActive = false;
        this.frame = null;
        this.split = null;
        this.unsubscribe = [];
        this.abort = new AbortController();

        const _canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        const _reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (this.target && _canHover && !_reduce) this.init();
    }

    init() {
        this.min ??= parseFloat(getComputedStyle(this.target).fontWeight);

        // screen readers get the text, not the letters
        this.html = this.target.innerHTML;
        this.label = document.createElement("span");
        this.label.textContent = this.target.textContent.trim();
        this.label.style.cssText = "position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;";
        this.visual = document.createElement("span");
        this.visual.setAttribute("aria-hidden", "true");
        this.visual.innerHTML = this.html;
        this.target.replaceChildren(this.label, this.visual);

        this.split = new SplitType(this.visual, { types: "words, chars", tagName: "span" });
        this.letters = this.split.chars.map((element) => ({ element, x: 0, y: 0, weight: this.min, to: this.min }));

        const _on = (type, callback) => document.addEventListener(type, callback, { passive: true, signal: this.abort.signal });
        _on("pointermove", (e) => {
            if (e.pointerType !== "mouse") return;
            this.mouse = { x: e.clientX, y: e.clientY };
            this.check();
        });
        _on("pointerout", (e) => !e.relatedTarget && this.release());

        // the page moves under a still mouse
        this.unsubscribe.push(_event.scroll(() => this.mouse && this.check()));
        this.unsubscribe.push(_event.observeResize(() => this.measure(), this.target));
    }

    // each letter's center on the page
    measure() {
        this.letters.forEach((letter) => {
            const _rect = letter.element.getBoundingClientRect();
            letter.x = _rect.left + _rect.width / 2 + window.scrollX;
            letter.y = _rect.top + _rect.height / 2 + window.scrollY;
        });
    }

    check() {
        const _rect = this.target.getBoundingClientRect();
        const _near = this.mouse.x > _rect.left - this.radius && this.mouse.x < _rect.right + this.radius && this.mouse.y > _rect.top - this.radius && this.mouse.y < _rect.bottom + this.radius;
        if (!_near) return this.release();

        if (!this.isActive) {
            // content above may have moved it
            this.measure();
            this.isActive = true;
            this.target.setAttribute("data-active", "");
            this.emit("enter");
        }

        // full weight on the mouse, eased off to min at the radius
        const _x = this.mouse.x + window.scrollX;
        const _y = this.mouse.y + window.scrollY;
        this.letters.forEach((letter) => {
            const _near = Math.max(0, 1 - Math.hypot(letter.x - _x, letter.y - _y) / this.radius);
            letter.to = this.min + (this.max - this.min) * (0.5 - 0.5 * Math.cos(Math.PI * _near));
        });
        this.start();
    }

    release() {
        this.letters.forEach((letter) => (letter.to = this.min));
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

    // eases each letter to its weight, stops once they're all there
    tick() {
        this.frame = null;
        let _moving = false;

        this.letters.forEach((letter) => {
            letter.weight += (letter.to - letter.weight) * this.ease;
            if (Math.abs(letter.to - letter.weight) < 0.5) letter.weight = letter.to;
            else _moving = true;

            letter.element.style.fontWeight = Math.round(letter.weight);
        });

        if (_moving) this.start();
    }

    destroy() {
        this.abort.abort();
        this.unsubscribe.forEach((off) => off());
        this.unsubscribe = [];
        cancelAnimationFrame(this.frame);
        this.split?.revert();
        if (this.html !== undefined) this.target.innerHTML = this.html;
        this.target.removeAttribute("data-active");
        this.letters = [];
    }
}
