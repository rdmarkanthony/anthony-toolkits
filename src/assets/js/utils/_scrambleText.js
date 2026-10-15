import { _emitter } from "./_emitter";

// usage: new _scrambleText({ target, trigger, hover: true, chars, duration, speed, order, events })
// letters flip through random chars in the same case, then settle, play(text) runs it, also to a new text
// the target gets [data-scrambling] while it runs, each unsettled letter too
export class _scrambleText extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.trigger = props.trigger ?? this.target;
        this.hover = props.hover ?? true;

        this.text = props.text ?? this.target?.textContent.trim() ?? "";
        this.chars = props.chars ?? "abcdefghijklmnopqrstuvwxyz";
        this.duration = props.duration ?? 400;
        this.speed = props.speed ?? 40;
        this.order = props.order ?? "start";

        this.letters = [];
        this.label = document.createElement("span");
        this.playing = false;
        this.progress = 1;
        this.frame = null;
        this.abort = new AbortController();

        if (this.target) this.init();
    }

    init() {
        const _on = (type, callback) => this.trigger.addEventListener(type, callback, { signal: this.abort.signal });

        // screen readers get the plain text
        Object.assign(this.label.style, { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" });
        this.render();

        if (!this.hover) return;

        _on("pointerenter", (e) => e.pointerType !== "touch" && this.play());
        _on("focusin", (e) => e.target.matches(":focus-visible") && this.play());
    }

    // one span per letter, its real letter keeps the width
    render() {
        this.label.textContent = this.text;
        this.letters = [];

        const _visual = document.createElement("span");
        _visual.setAttribute("aria-hidden", "true");

        this.text.split(/(\s+)/).forEach((word) => {
            if (!word) return;
            if (/^\s+$/.test(word)) return _visual.append(word);

            // no line break inside a word
            const _word = document.createElement("span");
            _word.style.whiteSpace = "nowrap";

            [...word].forEach((char) => {
                const _letter = document.createElement("span");
                const _size = document.createElement("span");
                const _char = document.createElement("span");

                _letter.style.cssText = "position: relative; display: inline-block;";
                _size.style.visibility = "hidden";
                _char.style.cssText = "position: absolute; inset: 0; text-align: center;";
                _size.textContent = _char.textContent = char;

                _letter.append(_size, _char);
                _word.append(_letter);
                this.letters.push({ element: _letter, char: _char, final: char, at: 0, done: true });
            });

            _visual.append(_word);
        });

        this.target.replaceChildren(this.label, _visual);
    }

    // when each letter settles, 0 to 1
    schedule() {
        const _count = this.letters.length;

        this.letters.forEach((letter, i) => {
            if (this.order === "end") letter.at = (_count - i) / _count;
            else if (this.order === "center") letter.at = (Math.abs(i - (_count - 1) / 2) * 2 + 1) / _count;
            else if (this.order === "random") letter.at = Math.random() * 0.8 + 0.2;
            else letter.at = (i + 1) / _count;
        });
    }

    // same case as the real letter
    randomChar(final) {
        const _char = this.chars[Math.floor(Math.random() * this.chars.length)];

        if (final !== final.toLowerCase()) return _char.toUpperCase();
        if (final !== final.toUpperCase()) return _char.toLowerCase();
        return _char;
    }

    play(text) {
        if (text !== undefined && text !== this.text) {
            this.stop(false);
            this.text = text;
            this.render();
        } else if (this.playing) return;

        // reduced motion: no scramble
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            this.emit("start");
            return this.emit("complete");
        }

        this.schedule();
        this.playing = true;
        this.progress = 0;
        this.target.setAttribute("data-scrambling", "");
        this.letters.forEach((letter) => {
            letter.done = !letter.final.trim();
            if (!letter.done) letter.element.setAttribute("data-scrambling", "");
        });

        this.emit("start");

        let _start = null;
        let _last = -Infinity;

        const _tick = (time) => {
            _start ??= time;
            this.progress = Math.min((time - _start) / this.duration, 1);

            // flip at the speed, not every frame
            if (time - _last >= this.speed || this.progress === 1) {
                _last = time;

                this.letters.forEach((letter) => {
                    if (letter.done) return;
                    if (this.progress < letter.at) return (letter.char.textContent = this.randomChar(letter.final));

                    this.settle(letter);
                });

                this.emit("update");
            }

            if (this.progress < 1) this.frame = requestAnimationFrame(_tick);
            else this.finish();
        };

        this.frame = requestAnimationFrame(_tick);
    }

    settle(letter) {
        letter.done = true;
        letter.char.textContent = letter.final;
        letter.element.removeAttribute("data-scrambling");
    }

    finish() {
        this.playing = false;
        this.progress = 1;
        this.target.removeAttribute("data-scrambling");
        this.emit("complete");
    }

    // jump to the real text
    stop(complete = true) {
        if (!this.playing) return;

        cancelAnimationFrame(this.frame);
        this.letters.forEach((letter) => this.settle(letter));

        if (complete) return this.finish();
        this.playing = false;
        this.target.removeAttribute("data-scrambling");
    }

    destroy() {
        this.stop(false);
        this.abort.abort();
        this.target.textContent = this.text;
    }
}
