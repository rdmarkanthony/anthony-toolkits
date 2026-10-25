import { _emitter } from "./_emitter";
import { _inview } from "./_inview";

// usage: new _lineReveal({ target, duration, stagger, delay, inview, once, events })
// each line slides up from behind a mask when it comes into view, play() and hide() for your own timing
// words are masked one by one and grouped into lines when it plays, so it wraps right at any width and keeps <em> and links
// the target gets [data-revealed] once shown, reduced motion shows it right away
export class _lineReveal extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.duration = props.duration ?? 900;
        this.stagger = props.stagger ?? 120;
        this.delay = props.delay ?? 0;
        this.inview = props.inview ?? true;
        // false plays it again each time it comes back into view
        this.once = props.once ?? true;

        this.words = [];
        this.lines = 0;
        this.html = "";
        this.observer = null;

        if (this.target) this.init();
    }

    init() {
        this.html = this.target.innerHTML;
        this.split();
        this.hide();

        if (!this.inview) return;

        this.observer = new _inview({
            target: this.target,
            observeOnce: this.once,
            observeRatio: 0.2,
            callback: (instance) => (instance.visible ? this.play() : this.hide()),
        });
    }

    // a mask around each word, spaces stay outside
    split() {
        const _walker = document.createTreeWalker(this.target, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => (node.textContent.trim() && !node.parentElement.closest("svg") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
        });

        const _nodes = [];
        while (_walker.nextNode()) _nodes.push(_walker.currentNode);

        _nodes.forEach((node) => {
            const _parts = node.textContent.split(/(\s+)/).map((part) => {
                if (!part || /^\s+$/.test(part)) return part;

                const _mask = document.createElement("span");
                const _word = document.createElement("span");

                // room for descenders and accents
                _mask.style.cssText = "display: inline-block; overflow: hidden; vertical-align: top; padding-block: 0.1em; margin-block: -0.1em;";
                _word.style.display = "inline-block";
                _word.textContent = part;

                _mask.append(_word);
                this.words.push({ mask: _mask, word: _word, animation: null });
                return _mask;
            });

            node.replaceWith(..._parts);
        });
    }

    // which line each word is on, from its top
    measure() {
        let _top = null;
        this.lines = -1;

        this.words.forEach((item) => {
            const _itemTop = item.mask.offsetTop;
            if (_top === null || _itemTop > _top + 2) {
                _top = _itemTop;
                this.lines++;
            }
            item.line = this.lines;
        });

        this.lines++;
    }

    play() {
        this.emit("start");

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            this.words.forEach((item) => (item.word.style.translate = ""));
            return this.finish();
        }

        this.measure();

        const _animations = this.words.map((item) => {
            item.animation?.cancel();
            item.animation = item.word.animate(
                { translate: ["0 calc(100% + 0.15em)", "0 0"] },
                { duration: this.duration, delay: this.delay + item.line * this.stagger, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }
            );
            return item.animation.finished;
        });

        Promise.all(_animations)
            .then(() => {
                this.words.forEach((item) => {
                    item.word.style.translate = "";
                    item.animation.cancel();
                    item.animation = null;
                });
                this.finish();
            })
            .catch(() => {});
    }

    finish() {
        this.target.setAttribute("data-revealed", "");
        this.emit("complete");
    }

    // back behind the mask, no animation
    hide() {
        this.words.forEach((item) => {
            item.animation?.cancel();
            item.animation = null;
            item.word.style.translate = "0 calc(100% + 0.15em)";
        });
        this.target.removeAttribute("data-revealed");
    }

    destroy() {
        this.observer?.destroy();
        this.words.forEach((item) => item.animation?.cancel());
        this.words = [];
        this.target.innerHTML = this.html;
        this.target.removeAttribute("data-revealed");
    }
}
