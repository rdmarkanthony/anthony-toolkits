// logo intro: a ring spins while the page loads, then closes into a ball that knocks in each word, rolls in the line and sweeps in the logo; the logo shrinks away and the cover slides up
// usage: new _logoIntro({ target, wait, timeout, scenes, loader, hold, speed, events }), first thing in the body
// it covers the page and blocks scroll until window load and every promise in wait (e.g. _load.image(src)) are done, a failed one still counts; timeout ms lets the page in if something hangs
// markup: [data-intro-ball], [data-intro-words] > [data-intro-word], [data-intro-line], [data-intro-logo] (data-intro-split: its text flips in letter by letter, or mark svg parts [data-intro-char])
// scenes: names in order or your own (tl, intro) => {}, a scene without its markup is skipped; they play once loaded, or at once with loader: false
// the scenes are a gsap timeline (intro.timeline, pause or seek it to check a frame); the ring and the close are waapi, so they stay smooth while the page is busy. hold: ms the logo stays before it shrinks away
// css: src/assets/css/components/logo-intro.css (--intro-color, --intro-bg, --intro-ball, --intro-spin). events: scene (intro.scene, also "loading" and "close"), played, leave (start page animations here), done
import { gsap } from "gsap";
import { _emitter } from "./_emitter";

const _reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const _fontsReady = () => Promise.race([document.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);
const _delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const _root = document.documentElement;
const _expoIn = "cubic-bezier(0.95, 0.05, 0.795, 0.035)";
const _expoInOut = "cubic-bezier(0.87, 0, 0.13, 1)";

export class _logoIntro extends _emitter {
    static scenes = {
        // falls from above onto the first word, or next to the line or logo; with the loader it hops there from the middle
        drop(tl, intro) {
            const { ball, words, line, logo } = intro.el;
            const { d } = intro.box;
            if (!ball || !(words[0] ?? line ?? logo)) return;

            const _land = words[0] ? intro.point(words[0]) : intro.point(line ?? logo, 0, 0.5, -d);
            if (intro.at) return intro.hop(tl, _land, { lift: 4 });

            tl.set(ball, { visibility: "visible", x: _land.x, y: -d * 3, width: d, height: d * 2.6, rotation: 0 }).to(ball, { y: _land.y, duration: 0.45, ease: "power2.in" });
            intro.at = _land;
            intro.squash(tl);
        },

        // each word pops up where the ball lands, then it hops on past the last one
        knock(tl, intro) {
            const { words, wordsWrap } = intro.el;
            const { d } = intro.box;
            if (!words.length || !intro.at) return;

            words.forEach((word, i) => {
                if (i) intro.hop(tl, intro.point(word));
                tl.fromTo(word, { autoAlpha: 0, yPercent: 70, rotation: -8 }, { autoAlpha: 1, yPercent: 0, rotation: 0, duration: 0.4, ease: "back.out(2.5)" }, "<");
            });
            intro.hop(tl, intro.point(wordsWrap, 1, 0.5, d * 1.5), { lift: 4, duration: 0.6 });
        },

        // rolls back left, the words go and the line shows behind it
        roll(tl, intro) {
            const { ball, wordsWrap, line } = intro.el;
            const { d } = intro.box;
            if (!line || !intro.at) return;

            const _to = intro.point(line, 0, 0.5, -d);
            const _move = { duration: 0.5, ease: "power3.inOut" };

            tl.to(ball, { width: d * 2.4, height: d * 0.75, rotation: 0, duration: 0.15, ease: "power2.out" })
                .set(line, { visibility: "visible" }, "<")
                .to(ball, { x: _to.x, y: _to.y, ..._move }, "<");
            intro.wipe(tl, line, "right", intro.at.x, _to.x, _move);
            if (wordsWrap) intro.wipe(tl, wordsWrap, "left", intro.at.x, _to.x, _move);
            tl.to(ball, { width: d, height: d, duration: 0.3, ease: "back.out(3)" }, ">-0.1");
            intro.at = _to;
        },

        // stretches to the logo's height and sweeps across, the logo flips in behind it
        logo(tl, intro) {
            const { ball, line, logo, chars } = intro.el;
            const { d } = intro.box;
            if (!ball || !logo) return;

            const _logo = intro.rect(logo);
            const _left = Math.min(_logo.left, line ? intro.rect(line).left : Infinity) - d * 1.2;
            const _right = _logo.right + d * 1.6;
            const _sweep = { duration: 0.8, ease: "power2.inOut" };

            tl.to(ball, { x: _left, y: _logo.top + _logo.height / 2, width: d * 1.1, height: _logo.height * 1.1, duration: 0.45, ease: "back.out(1.6)" })
                .to(ball, { width: d * 1.7, duration: 0.15, ease: "power2.out" })
                .set(logo, { visibility: "visible" })
                .to(ball, { x: _right, ..._sweep });
            intro.wipe(tl, logo, "left", _left, _right, _sweep);
            if (line) intro.wipe(tl, line, "right", _left, _right, _sweep);
            if (chars.length) tl.fromTo(chars, { scaleX: -1, yPercent: 15, transformOrigin: "50% 50%" }, { scaleX: 1, yPercent: 0, duration: 0.45, ease: "back.out(2)", stagger: { amount: _sweep.duration * 0.6 } }, `<${_sweep.duration * 0.15}`);
            tl.to(ball, { width: d, height: d, duration: 0.3, ease: "power2.inOut" }, ">-0.15").to(ball, { width: 0, height: 0, x: `+=${d}`, duration: 0.25, ease: "power2.in" });
            intro.at = null;
        },
    };

    constructor({ target, wait = [], timeout = 10000, scenes = ["drop", "knock", "roll", "logo"], loader = "spin", hold = 300, speed = 1, events } = {}) {
        super(events);

        this.target = target ?? null;
        this.wait = wait;
        this.timeout = timeout;
        this.scenes = scenes;
        this.loader = loader;
        this.hold = hold;
        this.speed = speed;

        this.el = {
            ball: target?.querySelector("[data-intro-ball]"),
            wordsWrap: target?.querySelector("[data-intro-words]"),
            words: [...(target?.querySelectorAll("[data-intro-word]") ?? [])],
            line: target?.querySelector("[data-intro-line]"),
            logo: target?.querySelector("[data-intro-logo]"),
            chars: [],
            spin: null,
        };
        this.box = null;
        this.at = null;
        this.scene = null;
        this.timeline = null;
        this.spinning = null;
        this.closer = [];
        this.closing = null;
        this.overflow = null;
        this.loaded = null;
        this.isPlayed = false;
        this.isDone = false;
        this.whenPlayed = new Promise((resolve) => (this.resolvePlayed = resolve));

        this.ready = this.target ? this.init() : Promise.resolve();
    }

    async init() {
        this.emit("beforeInit");
        this.lock();
        this.loaded = this.load();
        this.loaded.then(() => this.leave());
        if (_reduce()) return this.played();

        this.createLoader();
        this.split();
        await _fontsReady();
        this.measure();
        this.createTimeline();
        this.emit("init");
    }

    // window load and every promise in wait, or the timeout
    load() {
        const _page = document.readyState === "complete" ? null : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
        const _tasks = [_page, ...this.wait].map((task) => Promise.resolve(task).catch(() => {}));

        return Promise.race([Promise.all(_tasks), _delay(this.timeout)]);
    }

    lock() {
        this.overflow = _root.style.overflow;
        _root.style.overflow = "hidden";
    }

    unlock() {
        if (this.overflow === null) return;
        _root.style.overflow = this.overflow;
        this.overflow = null;
    }

    // a ring that spins as an html layer (transform only), so it stays smooth while the page loads
    createLoader() {
        if (this.loader !== "spin") return;

        this.el.spin = document.createElement("div");
        this.el.spin.className = "logo-intro-spin";
        this.el.spin.innerHTML = `<div><svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="16" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" pathLength="360" stroke-dasharray="80 280" /></svg></div>`;
        this.target.append(this.el.spin);

        this.el.spin.animate({ opacity: [0, 1], transform: ["scale(0.6)", "none"] }, { duration: 400, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        this.spinning = this.el.spin.firstElementChild.animate({ transform: ["rotate(0deg)", "rotate(360deg)"] }, { duration: 750, iterations: Infinity });
        this.scene = "loading";
        this.emit("scene");
    }

    // lets the ring finish its lap, every lap ends where the next starts
    async stopLoader() {
        if (!this.spinning) return;

        const { currentIteration } = this.spinning.effect.getComputedTiming();
        if (currentIteration !== null) this.spinning.effect.updateTiming({ iterations: currentIteration + 1 });
        await this.spinning.finished.catch(() => {});
        this.spinning = null;
    }

    // the ring closes into the ball in the middle
    closeLoader(tl) {
        const { spin, ball } = this.el;
        const { w, h, d } = this.box;
        if (!spin || !ball) return;

        this.at = { x: w / 2, y: h / 2 };
        tl.to(spin, { scale: d / spin.offsetWidth, opacity: 0, duration: 0.3, ease: "power3.in" }).fromTo(ball, { visibility: "visible", x: this.at.x, y: this.at.y, width: 0, height: 0 }, { width: d, height: d, duration: 0.35, ease: "back.out(3)" }, "-=0.12");
    }

    // wraps each letter of data-intro-split text, keeps <br> and spaces
    split() {
        const { logo } = this.el;
        if (!logo) return;

        if (logo.hasAttribute("data-intro-split")) {
            const _walker = document.createTreeWalker(logo, NodeFilter.SHOW_TEXT);
            const _nodes = [];
            while (_walker.nextNode()) _nodes.push(_walker.currentNode);

            _nodes.forEach((node) => {
                const _frag = document.createDocumentFragment();
                [...node.textContent].forEach((char) => {
                    if (!char.trim()) return _frag.append(char);
                    const _char = document.createElement("span");
                    _char.className = "logo-intro-char";
                    _char.dataset.introChar = "";
                    _char.textContent = char;
                    _frag.append(_char);
                });
                node.replaceWith(_frag);
            });
        }
        this.el.chars = [...logo.querySelectorAll("[data-intro-char]")];
    }

    measure() {
        const { width: w, height: h } = this.target.getBoundingClientRect();
        this.box = { w, h, d: this.el.ball?.offsetWidth || 20 };
        // centered by gsap, a css translate would get baked in as px and drift as the ball grows
        if (this.el.ball) gsap.set(this.el.ball, { xPercent: -50, yPercent: -50 });
    }

    createTimeline() {
        this.timeline = gsap.timeline({ paused: true, onComplete: () => this.played() });
        this.timeline.timeScale(this.speed);
        this.closeLoader(this.timeline);

        this.scenes.forEach((scene) => {
            const _scene = typeof scene === "function" ? scene : _logoIntro.scenes[scene];
            if (!_scene) return;
            this.timeline.call(() => {
                this.scene = typeof scene === "string" ? scene : _scene.name || "custom";
                this.emit("scene");
            });
            _scene(this.timeline, this);
        });

        if (!this.el.spin) this.timeline.play();
    }

    played() {
        this.isPlayed = true;
        this.resolvePlayed();
        this.emit("played");
    }

    // runs on its own once loaded, call it to go sooner: the ring closes, the intro plays, then it leaves
    async leave() {
        await this.ready;
        this.closing ??= this.timeline ? this.reveal() : this.end();
        await this.closing;
    }

    async reveal() {
        await this.stopLoader();
        this.timeline.play();
        await this.whenPlayed;
        await _delay(this.hold / this.speed);
        await this.close();
    }

    // the logo shrinks away, then the cover slides up off the page
    async close() {
        const { logo } = this.el;

        this.scene = "close";
        this.emit("scene");
        if (logo) {
            this.closer.push(logo.animate({ opacity: [1, 0], transform: ["none", "scale(0.5)"] }, { duration: 600 / this.speed, easing: _expoIn, fill: "forwards" }));
            await _delay(400 / this.speed);
        }
        if (!this.target) return;

        this.unlock();
        this.emit("leave");
        const _slide = this.target.animate({ transform: ["none", "translateY(-100%)"] }, { duration: 900 / this.speed, easing: _expoInOut, fill: "forwards" });
        this.closer.push(_slide);
        await _slide.finished.catch(() => {});
        this.end();
    }

    end() {
        if (!this.target) return;
        if (this.overflow !== null) {
            this.unlock();
            this.emit("leave");
        }

        this.target.hidden = true;
        this.isDone = true;
        this.emit("done");
    }

    // ball helpers for scenes

    rect(el) {
        const _stage = this.target.getBoundingClientRect();
        const _rect = el.getBoundingClientRect();
        return { left: _rect.left - _stage.left, right: _rect.right - _stage.left, top: _rect.top - _stage.top, width: _rect.width, height: _rect.height };
    }

    // a spot on el, ax / ay 0 to 1 across it, plus an x offset
    point(el, ax = 0.5, ay = 0.5, offset = 0) {
        const _rect = this.rect(el);
        return { x: _rect.left + _rect.width * ax + offset, y: _rect.top + _rect.height * ay };
    }

    // clips el to the part on one side of the ball as it moves from x to x, in step with the ball's tween
    wipe(tl, el, keep, from, to, { duration, ease }) {
        const _rect = this.rect(el);
        const _inset = (x) => (keep === "left" ? `inset(-50% ${_rect.right - x}px -50% -50%)` : `inset(-50% -50% -50% ${x - _rect.left}px)`);

        tl.fromTo(el, { clipPath: _inset(from) }, { clipPath: _inset(to), duration, ease, immediateRender: false }, "<");
    }

    // lands flat and springs back round
    squash(tl) {
        const { ball } = this.el;
        const { d } = this.box;

        tl.to(ball, { width: d * 1.45, height: d * 0.6, y: this.at.y + d * 0.2, rotation: 0, duration: 0.08, ease: "power1.out" }).to(ball, { width: d, height: d, y: this.at.y, duration: 0.3, ease: "back.out(3)" });
    }

    // an arc to the next spot, stretched on the way up and down
    hop(tl, to, { lift = 3, duration = 0.5 } = {}) {
        const { ball } = this.el;
        const { d } = this.box;
        const _from = this.at;
        const _dir = Math.sign(to.x - _from.x) || 1;
        const _peak = Math.min(_from.y, to.y) - lift * d;
        const _t = tl.duration() - 0.15;

        tl.to(ball, { x: to.x, duration, ease: "power1.inOut" }, _t)
            .to(ball, { y: _peak, duration: duration / 2, ease: "power2.out" }, _t)
            .to(ball, { y: to.y, duration: duration / 2, ease: "power2.in" }, _t + duration / 2)
            .to(ball, { width: d * 0.8, height: d * 1.5, rotation: 30 * _dir, duration: duration * 0.2 }, _t)
            .to(ball, { width: d, height: d, rotation: 0, duration: duration * 0.25 }, _t + duration * 0.35)
            .to(ball, { width: d * 0.8, height: d * 1.5, rotation: -30 * _dir, duration: duration * 0.2 }, _t + duration * 0.7);
        this.at = to;
        this.squash(tl);
    }

    destroy() {
        this.timeline?.kill();
        this.spinning?.cancel();
        this.closer.forEach((animation) => animation.cancel());
        this.el.spin?.remove();
        this.unlock();
        this.timeline = null;
        this.spinning = null;
        this.closer = [];
        this.target = null;
        this.el = null;
    }
}
