import { _event } from "./_event";
import { _inview } from "./_inview";
import { _splitText } from "./_splitText";

export class _animate {
    constructor(props = {}) {
        // one per page, use refresh() for new content
        if (window._animateInstance) return window._animateInstance;

        window._animateInstance = this;

        this.debug = props.debug ?? false;
        this.delay = props.delay ?? 0.1;
        this.adjacentDelay = props.adjacentDelay ?? this.delay;
        this.staggerDelay = this.adjacentDelay;
        this.duration = props.duration ?? 0.8;
        this.keyframe = props.keyframe ?? "fadeInUpSmall";

        this.items = new WeakSet();

        this.init();
    }

    init() {
        document.documentElement.classList.add("js-animate-ready");

        this.refresh();

        if (this.debug) console.log("_animate", this);
    }

    // for content added later
    refresh(root = document) {
        const _find = (selector) => [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)].filter((item) => !this.items.has(item));

        _find("[data-animate]").forEach((item) => {
            const _item = item;
            const _dataset = _item.dataset.animate.split(",");

            const _relation = _dataset[0] ? _dataset[0] : "";
            let _delay = _dataset[1] ? (!isNaN(parseFloat(_dataset[1])) ? parseFloat(_dataset[1]) : _dataset[1]) : this.delay;
            let _duration = _dataset[2] && !isNaN(parseFloat(_dataset[2])) ? parseFloat(_dataset[2]) : this.duration;

            if (_relation === "parent") {
                const _startDelay = _delay;
                let _index = 0;

                const _nextDelay = () => {
                    _index++;
                    return typeof _startDelay === "number" ? _startDelay + this.adjacentDelay * _index : `calc(${_startDelay} + ${(this.adjacentDelay * _index).toFixed(2)}s)`;
                };

                _item.querySelectorAll('[data-animate="children"]').forEach((item) => {
                    const _item = item;

                    Array.from(_item.children).forEach((item) => {
                        const _item = item;

                        // nested children
                        if (_item.dataset.animate === "children") {
                            Array.from(_item.children).forEach((item) => {
                                const _item = item;

                                _item.dataset.animate = "child";

                                this.set(_item, _delay, _duration);

                                _delay = _nextDelay();
                            });
                        } else {
                            if (_item.dataset.animate) return;

                            _item.dataset.animate = "child";

                            this.set(_item, _delay, _duration);

                            _delay = _nextDelay();
                        }
                    });
                });

                _item.querySelectorAll('[data-animate="children-inview"]').forEach((item) => {
                    Array.from(item.children).forEach((item) => {
                        item.dataset.animate = "";
                        item.classList.add("opacity-0");
                    });
                });
            } else {
                if (!["children", "child"].includes(_relation)) this.set(_item, _delay, _duration);
            }
        });

        const _items = _find("[data-animate]");
        const _titles = _find(".js-splittext");

        [..._items, ..._titles].forEach((item) => this.items.add(item));

        // animate when in view
        _items.forEach((item) => {
            const _item = item;
            const _dataset = _item.dataset.animate.split(",");
            const _relation = _dataset[0] ? _dataset[0] : "";

            if (_relation === "child") return;

            new _inview({
                target: _item,
                callback: () => {
                    if (_relation === "parent") {
                        _item.classList.remove("opacity-0");
                        _item.removeAttribute("data-animate");

                        _item.querySelectorAll('[data-animate="child"]').forEach((item) => {
                            const _item = item;

                            this.show(_item, (target) => {
                                this.clean(target);
                            });

                            _event.dispatch(_item, "visible");
                        });
                    } else if (_relation === "children") {
                        // a wrapper, just show it
                        _item.classList.remove("opacity-0");
                        _item.removeAttribute("data-animate");
                    } else {
                        this.show(_item, (target) => {
                            this.clean(target);
                        });

                        _event.dispatch(_item, "visible");
                    }
                },
            });
        });

        // for header titles or splittext animate
        _titles.forEach((item) => {
            const _item = item;
            const _splittext = new _splitText({ target: _item });

            if (!_item.dataset.animate) return;
            _item.classList.add("js-splittext-animate");

            _item.addEventListener(
                "visible",
                () => {
                    if (this.keyframeOf(_item).includes("Down")) _item.classList.add("pullDown");

                    _item.classList.add("js-splittext-animated");
                    _item.style.setProperty("--pullup-delay", window.getComputedStyle(_item).animationDelay);

                    if (this.debug || !_splittext.split?.words?.length) return;

                    // revert once the last word is in place
                    const _onEnd = (e) => {
                        if (e.target !== _splittext.split?.words?.at(-1)) return;

                        _item.removeEventListener("animationend", _onEnd);
                        _splittext.destroy();

                        _item.classList.remove("js-splittext-animate", "js-splittext-animated", "pullDown");
                        _item.style.setProperty("--pullup-delay", "");
                    };

                    _item.addEventListener("animationend", _onEnd);
                },
                { once: true }
            );
        });
    }

    keyframeOf(target) {
        const _className = target.dataset.animateClass || target.dataset.animate?.split(",")[0] || this.keyframe;

        return ["parent", "children", "child"].includes(_className) ? this.keyframe : _className;
    }

    set(target, delay, duration) {
        const _isNumber = typeof delay === "number";
        const _delay = _isNumber ? `${delay.toFixed(2)}s` : delay;

        target.style.animationDelay = _delay;
        if (_isNumber) target.style.setProperty("--animate-delay", _delay);
        target.style.setProperty("--animate-duration", `${duration}s`);
    }

    show(target, callback) {
        this.staggerDelay += this.adjacentDelay;

        const _className = this.keyframeOf(target);

        target.classList.remove("opacity-0");
        target.classList.add("animate__animated", `animate__${_className}`);

        const _styles = window.getComputedStyle(target);
        // if no animation-duration of its own
        if (!target.style.getPropertyValue("--animate-duration")) target.style.setProperty("--animate-duration", `${this.duration}s`);
        // if no animation-delay
        if (!target.style.animationDelay && parseFloat(_styles.animationDelay) === 0) {
            const _delay = `${this.adjacentDelay.toFixed(2)}s`;

            target.style.setProperty("--animate-delay", _delay);
            target.style.animationDelay = _delay;
        }

        // stagger delay
        if (target.dataset.animateDelay) {
            const _delay = parseFloat(this.staggerDelay) ? `${this.staggerDelay.toFixed(2)}s` : this.staggerDelay;

            target.style.setProperty("--animate-delay", _delay);
            target.style.animationDelay = _delay;
        }

        // keep its own timing on clean
        target.style.animationDuration = _styles.animationDuration;
        target.style.animationDelay = _styles.animationDelay;

        // for callback, once the keyframe ends
        if (callback) {
            const _animations = target.getAnimations().filter((animation) => animation.animationName === _className);

            Promise.allSettled(_animations.map((animation) => animation.finished)).then(() => callback(target));
        }
    }

    clean(target, callback) {
        this.staggerDelay = 0;

        if (this.debug) return;

        const _className = this.keyframeOf(target);

        target.removeAttribute("data-animate");
        target.removeAttribute("data-animate-delay");
        target.classList.remove("animate__animated", `animate__${_className}`, "opacity-0");

        target.style.animationDelay = "";
        target.style.setProperty("--animate-delay", "");
        target.style.animationDuration = "";
        target.style.setProperty("--animate-duration", "");
        target.style.animationFillMode = "";

        target.removeAttribute("data-animate-class");

        if (target.getAttribute("style")?.length <= 0) target.removeAttribute("style");

        if (callback) callback(target);
    }
}
