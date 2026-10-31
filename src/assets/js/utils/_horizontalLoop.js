// endless row: a marquee or draggable, items wrap forever
// usage: new _horizontalLoop({ target }), its children are the items
// options: speed (1 = 100px a second), paused, center, snap, draggable, pauseOnHover, scroll, events: change (loop.active, loop.items[loop.active])
// scroll: page scroll moves it, 1 = as far as the page, minus goes right
// play(), pause(), next(), previous(), toIndex(i), move(px), setDirection("left" | "right"), destroy()
import { gsap } from "gsap";
import { _emitter } from "./_emitter";
import { _event } from "./_event";

const _wrapProgress = gsap.utils.wrap(0, 1);

let _timeline = null;
const _pageTimeline = () => (_timeline ??= new ScrollTimeline({ source: document.documentElement }));
const _scrollTimeline = () => "ScrollTimeline" in window && CSS.supports("animation-timeline: view()");

const _importDraggable = () => Promise.all([import("gsap/Draggable"), import("gsap/InertiaPlugin")]);

export class _horizontalLoop extends _emitter {
    constructor({ target, speed = 1, paused = false, center = false, snap = true, draggable = true, pauseOnHover = false, scroll = 0, events }) {
        super(events);

        this.target = target ?? null;
        this.speed = speed * 100;
        this.factor = scroll;
        this.linked = scroll !== 0 && _scrollTimeline();
        this.center = center;
        this.snap = snap;
        this.pauseOnHover = pauseOnHover;

        this.playing = !paused && !matchMedia("(prefers-reduced-motion: reduce)").matches;
        this.holds = new Set();

        this.items = [];
        this.animations = [];
        this.manual = true;
        this.loops = 1;
        this.unsubscribe = [];
        this.times = [];
        this.widths = [];
        this.totalWidth = 0;
        this.index = 0;
        this.active = -1;
        this.dirty = false;
        this.draggedAt = 0;
        this.draggable = null;
        this.proxy = null;
        this.frame = 0;

        if (!this.target) {
            this.ready = Promise.resolve(this);
            return;
        }

        this.init();
        this.ready = draggable ? this.drag().then(() => this) : Promise.resolve(this);
    }

    init() {
        this.timeline = gsap.timeline({
            repeat: -1,
            paused: true,
            defaults: { ease: "none" },
            onUpdate: () => {
                this.render();
                this.changed();
            },
            onReverseComplete: () => this.timeline.totalTime(this.timeline.rawTime() + this.timeline.duration() * 100),
        });

        this.fill();
        this.build();
        // start 100 rounds in, so it can also play backwards (right)
        this.timeline.totalTime(this.timeline.duration() * 100 + this.timeWrap(this.times[0] - this.shift()), true);

        this.handlers = {
            wheel: (e) => this.wheel(e),
            click: (e) => {
                if (Date.now() - this.draggedAt < 100) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            },
            focus: (e) => {
                const _index = this.items.findIndex((item) => item.contains(e.target));
                if (_index > -1 && e.target.matches(":focus-visible")) this.toIndex(_index);
            },
            enter: (e) => e.pointerType === "mouse" && this.hold("hover", true),
            leave: (e) => e.pointerType === "mouse" && this.hold("hover", false),
        };

        this.target.addEventListener("wheel", this.handlers.wheel, { passive: false });
        this.target.addEventListener("click", this.handlers.click, true);
        this.target.addEventListener("focusin", this.handlers.focus);
        if (this.pauseOnHover) {
            this.target.addEventListener("pointerenter", this.handlers.enter);
            this.target.addEventListener("pointerleave", this.handlers.leave);
        }

        this.onResize = () => {
            cancelAnimationFrame(this.frame);
            this.frame = requestAnimationFrame(() => this.refresh());
        };
        this.observed = [];
        this.observe();

        this.viewObserver = new IntersectionObserver(([entry]) => this.hold("view", !entry.isIntersecting));
        this.viewObserver.observe(this.target);

        if (this.linked) this.unsubscribe.push(_event.observeResize(() => this.place()));
        if (this.factor) {
            this.unsubscribe.push(
                _event.scroll(() => {
                    this.dirty = true;
                    if (!this.linked) this.render();
                    this.changed();
                })
            );
        }

        this.place();
        this.changed();
        this.update();
    }

    fill() {
        const _originals = [...this.target.children].filter((item) => !item.classList.contains("is-clone"));
        const _covers = () => {
            const _first = this.target.firstElementChild;
            const _last = this.target.lastElementChild;
            return _last.offsetLeft + _last.offsetWidth - _first.offsetLeft >= this.target.offsetWidth + Math.max(..._originals.map((item) => item.offsetWidth));
        };

        for (let _guard = 0; _originals.length && !_covers() && _guard < 50; _guard++) {
            _originals.forEach((item) => {
                const _clone = item.cloneNode(true);
                _clone.classList.add("is-clone");
                _clone.setAttribute("aria-hidden", "true");
                _clone.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((el) => el.setAttribute("tabindex", "-1"));
                this.target.appendChild(_clone);
            });
        }

        this.items = [...this.target.children];
    }

    build() {
        this.animations.forEach((animation) => animation.cancel());
        this.animations = [];

        const _items = this.items;
        const _last = _items[_items.length - 1];
        const _startX = _items[0].offsetLeft;
        const _gap = parseFloat(getComputedStyle(this.target).columnGap) || 0;

        this.widths = _items.map((item) => item.offsetWidth);
        this.totalWidth = _last.offsetLeft + _last.offsetWidth - _startX + _gap;
        this.rowWidth = this.target.offsetWidth;

        const _tl = this.timeline;
        const _total = this.totalWidth;
        _tl.clear();
        _tl.to({}, { duration: _total / this.speed });

        this.loopAt = _items.map((item, i) => item.offsetLeft - _startX + this.widths[i]);

        const _inset = _items[0].getBoundingClientRect().left - this.target.getBoundingClientRect().left;
        this.timeWrap = gsap.utils.wrap(0, _tl.duration());
        this.times = _items.map((item, i) => this.timeWrap((item.offsetLeft - _startX) / this.speed + (this.center ? (this.widths[i] / 2 - this.rowWidth / 2 + _inset) / this.speed : 0)));
    }

    keyframes(i, rounds = 1, reverse = false) {
        const _total = this.totalWidth;
        const _toLoop = this.loopAt[i];
        const _at = Math.min(_toLoop / _total, 1 - 1e-6);
        const _points = [[0, 0]];

        for (let round = 0; round < rounds; round++) {
            _points.push([round + _at, -_toLoop], [Math.min(round + _at + 1e-6, round + 1), _total - _toLoop], [round + 1, 0]);
        }

        return _points.map(([at, x]) => ({ offset: reverse ? 1 - at / rounds : at / rounds, translate: `${x}px` })).sort((a, b) => a.offset - b.offset);
    }

    shift() {
        return this.factor ? (this.factor * window.scrollY) / this.speed : 0;
    }

    place() {
        if (!this.timeline) return;
        if (this.linked) {
            this.loops = Math.ceil((document.documentElement.scrollHeight - window.innerHeight) / (this.totalWidth / Math.abs(this.factor))) + 2;
            this.frames = this.items.map((item, i) => this.keyframes(i, this.loops, this.factor < 0));
        }
        this.mode(true);
    }

    mode(force = false) {
        const _manual = !this.linked || this.holds.has("drag") || this.holds.has("tween");
        if (force || _manual !== this.manual) this.setup(_manual);
    }

    // safari's scroll thread keeps an animation's first range, so the browser gets new ones each time it takes over
    setup(manual) {
        const _old = this.animations;
        this.manual = manual;
        this.start = null;

        this.animations = this.items.map((item, i) => {
            if (!manual) return item.animate(this.frames[i], { timeline: _pageTimeline(), fill: "both" });

            const _animation = item.animate(this.keyframes(i), { duration: 1000, fill: "both" });
            _animation.pause();
            return _animation;
        });
        this.render(true);

        if (manual) _old.forEach((animation) => animation.cancel());
        else Promise.allSettled(this.animations.map((animation) => animation.ready)).then(() => _old.forEach((animation) => animation.cancel()));
    }

    render(force = false) {
        if (!this.timeline) return;
        const _phase = this.timeline.time() * this.speed;

        if (this.manual) {
            const _time = _wrapProgress((_phase + this.factor * window.scrollY) / this.totalWidth) * 1000;
            this.animations.forEach((animation) => (animation.currentTime = _time));
            return;
        }

        const _length = this.totalWidth / Math.abs(this.factor);
        const _start = gsap.utils.wrap(0, _length, -_phase / this.factor) - _length;
        if (_start === this.start && !force) return;

        this.start = _start;
        this.animations.forEach((animation) => {
            animation.rangeStart = `${_start}px`;
            animation.rangeEnd = `${_start + _length * this.loops}px`;
        });
    }

    refresh() {
        if (!this.timeline || this.holds.has("drag")) return;
        const _changed = this.target.offsetWidth !== this.rowWidth || this.items.some((item, i) => item.offsetWidth !== this.widths[i]);
        if (!_changed) return;

        const _index = this.current();
        this.fill();
        this.build();
        this.observe();
        this.timeline.time(this.timeWrap((this.times[_index] ?? this.times[0]) - this.shift()), true);
        this.place();
        this.update();
    }

    observe() {
        this.unobserve();
        this.observed = [this.target, ...this.items];
        this.observed.forEach((el) => _event.observeResize(this.onResize, el));
    }

    unobserve() {
        this.observed.forEach((el) => _event.offObserveResize(this.onResize, el));
        this.observed = [];
    }

    closest(time = this.timeWrap(this.timeline.time() + this.shift())) {
        const _duration = this.timeline.duration();
        let _index = 0;
        let _best = Infinity;

        this.times.forEach((stop, i) => {
            let _distance = Math.abs(stop - time);
            if (_distance > _duration / 2) _distance = _duration - _distance;
            if (_distance < _best) {
                _best = _distance;
                _index = i;
            }
        });

        return _index;
    }

    current() {
        if (this.dirty) this.sync();
        return this.index;
    }

    sync() {
        this.index = this.closest();
        this.dirty = false;
    }

    changed() {
        const _index = this.closest();
        if (_index === this.active) return;
        this.active = _index;
        this.emit("change");
    }

    // glides the shortest way round, vars are gsap tween vars
    toIndex(index, vars = {}) {
        const _tl = this.timeline;
        const _length = this.items.length;
        const _current = this.current();

        if (Math.abs(index - _current) > _length / 2) index += index > _current ? -_length : _length;
        const _next = gsap.utils.wrap(0, _length, index);
        let _time = this.timeWrap(this.times[_next] - this.shift());

        if (_time > _tl.time() !== index > _current && index !== _current) _time += _tl.duration() * (index > _current ? 1 : -1);

        this.index = _next;
        this.stopThrow();

        if (vars.duration === 0) {
            _tl.time(this.timeWrap(_time));
            this.mode();
            return;
        }

        this.hold("tween", true);
        const _done = () => this.hold("tween", false);
        _tl.tweenTo(_time, { duration: 0.8, ease: "power3.out", ...vars, modifiers: { time: this.timeWrap }, overwrite: true, onComplete: _done, onInterrupt: _done });
    }

    next(vars) {
        this.toIndex(this.current() + 1, vars);
    }

    previous(vars) {
        this.toIndex(this.current() - 1, vars);
    }

    play() {
        this.playing = true;
        this.update();
    }

    pause() {
        this.playing = false;
        this.update();
    }

    setDirection(direction) {
        this.timeline?.timeScale(direction === "right" ? -1 : 1);
    }

    hold(reason, on) {
        on ? this.holds.add(reason) : this.holds.delete(reason);
        this.mode();
        this.update();
    }

    update() {
        if (!this.timeline || this.holds.has("tween")) return;
        this.timeline.paused(!this.playing || this.holds.size > 0);
    }

    stopThrow() {
        if (!this.draggable?.isThrowing) return;
        gsap.killTweensOf(this.proxy);
        this.holds.delete("drag");
    }

    wheel(e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        this.move(e.deltaX);
    }

    // shifts the row by px, plus is left, e.g. with the page scroll
    move(px) {
        if (!this.timeline || this.holds.has("drag")) return;
        gsap.killTweensOf(this.timeline);
        this.timeline.progress(_wrapProgress(this.timeline.progress() + px / this.totalWidth));
        this.dirty = true;
    }

    async drag() {
        const [{ Draggable }, { InertiaPlugin }] = await _importDraggable();
        if (!this.timeline) return; // destroyed while loading
        gsap.registerPlugin(Draggable, InertiaPlugin);

        const _tl = this.timeline;
        let _startProgress = 0;
        let _ratio = 0;
        let _lastStop = 0;
        let _throwing = false;
        let _caught = false;

        const _progressAt = (x) => _startProgress + (this.draggable.startX - x) * _ratio;
        const _xAt = (progress) => this.draggable.startX + (_startProgress - progress) / _ratio;

        this.proxy = document.createElement("div");
        const _align = () => _tl.progress(_wrapProgress(_progressAt(this.draggable.x)));

        [this.draggable] = Draggable.create(this.proxy, {
            trigger: this.target,
            type: "x",
            inertia: true,
            overshootTolerance: 0,
            dragClickables: true,
            cursor: "grab",
            activeCursor: "grabbing",
            onPressInit: () => {
                gsap.killTweensOf(_tl);
                _startProgress = _tl.progress();
                _ratio = 1 / this.totalWidth;
                _caught = _throwing;
                _throwing = false;
            },
            onDragStart: () => {
                this.hold("drag", true);
                _startProgress = _tl.progress() - (this.draggable.startX - this.draggable.x) * _ratio;
            },
            onDrag: _align,
            onThrowUpdate: _align,
            onDragEnd: () => (this.draggedAt = Date.now()),
            snap: this.snap
                ? (value) => {
                      if (_caught && Math.abs(this.draggable.startX - this.draggable.x) < 10) {
                          let _left = (_lastStop - _startProgress) % 1;
                          if (_left > 0.5) _left -= 1;
                          if (_left < -0.5) _left += 1;
                          _lastStop = _startProgress + _left;
                          return _xAt(_lastStop);
                      }

                      const _duration = _tl.duration();
                      const _time = _progressAt(value) * _duration;
                      const _wrapped = this.timeWrap(_time + this.shift());
                      let _diff = this.times[this.closest(_wrapped)] - _wrapped;
                      if (Math.abs(_diff) > _duration / 2) _diff += _diff < 0 ? _duration : -_duration;

                      _lastStop = (_time + _diff) / _duration;
                      return _xAt(_lastStop);
                  }
                : undefined,
            onRelease: () => {
                this.sync();
                _throwing = this.draggable.isThrowing;
                if (_throwing) this.dirty = true;
                else this.hold("drag", false);
            },
            onThrowComplete: () => {
                _throwing = false;
                this.sync();
                this.hold("drag", false);
            },
        });
    }

    destroy() {
        if (!this.timeline) return;
        this.target.removeEventListener("wheel", this.handlers.wheel);
        this.target.removeEventListener("click", this.handlers.click, true);
        this.target.removeEventListener("focusin", this.handlers.focus);
        this.target.removeEventListener("pointerenter", this.handlers.enter);
        this.target.removeEventListener("pointerleave", this.handlers.leave);
        this.unobserve();
        this.viewObserver.disconnect();
        this.unsubscribe.forEach((off) => off());
        this.unsubscribe = [];
        cancelAnimationFrame(this.frame);

        this.draggable?.kill();
        if (this.proxy) gsap.killTweensOf(this.proxy);
        this.proxy = null;
        gsap.killTweensOf(this.timeline);
        this.timeline.kill();
        this.timeline = null;

        this.animations.forEach((animation) => animation.cancel());
        this.animations = [];
        this.target.querySelectorAll(":scope > .is-clone").forEach((clone) => clone.remove());
        this.items = [];
        this.target = null;
    }
}
