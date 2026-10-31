import { _emitter } from "./_emitter";

// lottie-web, its own chunk, loaded once the first lottie nears the screen
const _importLottie = () => import("lottie-web");

// usage: new _lottie({ target, src, play, loop, speed, trigger, renderer, events })
// src or target data-lottie="/path.json", the animation is drawn inside target
// play: "inview" (default, plays on screen, pauses off), "hover" (forward on enter, back on leave, with loop: loops while hovered), "click" (toggles forward and back), "none" (yours, through seek() or instance.animation)
// trigger: the element for hover and click (default target), reduced motion keeps inview and hover still
// scroll: play "none" and seek(progress) from _parallaxScroller's update
export class _lottie extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.src = props.src ?? this.target?.dataset.lottie ?? null;
        this.play = props.play ?? "inview";
        this.loop = props.loop ?? false;
        this.speed = props.speed ?? 1;
        this.trigger = props.trigger ?? this.target;
        this.renderer = props.renderer ?? "svg";

        this.animation = null;
        this.isLoaded = false;
        this.progress = null;
        this.isOn = false;
        this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        this.abort = new AbortController();

        this.ready = new Promise((resolve) => (this.resolve = resolve));

        if (this.target && this.src) this.init();
    }

    init() {
        this.near = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                this.near.disconnect();
                this.load();
            },
            { rootMargin: "300px" }
        );
        this.near.observe(this.target);
    }

    async load() {
        const { default: lottie } = await _importLottie();
        if (this.abort.signal.aborted) return;

        this.animation = lottie.loadAnimation({
            container: this.target,
            renderer: this.renderer,
            path: this.src,
            loop: this.play === "inview" && this.loop,
            autoplay: false,
        });
        this.animation.setSpeed(this.speed);

        this.animation.addEventListener("DOMLoaded", () => {
            this.isLoaded = true;
            this.setup();
            this.emit("ready");
            this.resolve(this.animation);
        });
        this.animation.addEventListener("complete", () => this.emit("complete"));
    }

    setup() {
        const { signal } = this.abort;
        const _on = (type, callback) => this.trigger.addEventListener(type, callback, { signal });

        if (this.play === "inview") {
            if (this.reduce) return this.animation.goToAndStop(this.loop ? 0 : this.animation.totalFrames - 1, true);

            this.view = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) this.animation.play();
                else if (this.loop) this.animation.pause();
            });
            this.view.observe(this.target);
        }

        if (this.play === "hover" && !this.reduce) {
            const _hover = (on) => (this.loop ? this.hoverLoop(on) : this.direction(on ? 1 : -1));
            _on("pointerenter", () => _hover(true));
            _on("pointerleave", () => _hover(false));
            _on("focusin", () => _hover(true));
            _on("focusout", () => _hover(false));
        }

        if (this.play === "click") _on("click", () => this.toggle());

        if (this.progress !== null) this.seek(this.progress);
        if (this.isOn) this.animation.goToAndStop(this.animation.totalFrames - 1, true);
    }

    direction(value) {
        this.animation.setDirection(value);
        this.animation.play();
    }

    hoverLoop(on) {
        this.animation.setLoop(on);
        if (on && this.animation.isPaused) this.animation.goToAndPlay(0, true);
    }

    toggle(on = !this.isOn) {
        this.isOn = on;
        if (!this.isLoaded) return this.emit("toggle");
        if (this.reduce) this.animation.goToAndStop(on ? this.animation.totalFrames - 1 : 0, true);
        else this.direction(on ? 1 : -1);
        this.emit("toggle");
    }

    // 0 is the first frame, 1 the last, kept until it loads
    seek(progress) {
        this.progress = Math.min(1, Math.max(0, progress || 0));
        if (this.isLoaded) this.animation.goToAndStop(this.progress * (this.animation.totalFrames - 1), true);
    }

    destroy() {
        this.abort.abort();
        this.near?.disconnect();
        this.view?.disconnect();
        this.animation?.destroy();
        this.animation = null;
    }
}
