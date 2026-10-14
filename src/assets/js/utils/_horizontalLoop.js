// endless row: plays as a marquee or waits for a drag, the items wrap around forever
// usage: new _horizontalLoop({ target }), target's children are the items, too few get cloned to fill the row
// options: speed (1 = 100px a second), paused, center, snap, draggable, pauseOnHover, onChange(item, index)
// play(), pause(), next(), previous(), toIndex(i), move(px), setDirection("left" | "right"), destroy(); pauses itself off screen
import { gsap } from "gsap";

const _wrapProgress = gsap.utils.wrap(0, 1);

// draggable and inertia, loaded on first use so other pages don't download them
const _importDraggable = () => Promise.all([import("gsap/Draggable"), import("gsap/InertiaPlugin")]);

export class _horizontalLoop {
    constructor({ target, speed = 1, paused = false, center = false, snap = true, draggable = true, pauseOnHover = false, onChange = null }) {
        this.target = target ?? null;
        this.speed = speed * 100;
        this.center = center;
        this.snap = snap;
        this.pauseOnHover = pauseOnHover;
        this.onChange = onChange;

        // reduced motion keeps a marquee still, dragging still works
        this.playing = !paused && !matchMedia("(prefers-reduced-motion: reduce)").matches;
        // drag, tween, hover and view hold it still for a while
        this.holds = new Set();

        this.items = [];
        this.times = [];
        this.widths = [];
        this.totalWidth = 0;
        this.index = 0;
        this.changedIndex = -1;
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
        // resolves once dragging works
        this.ready = draggable ? this.drag().then(() => this) : Promise.resolve(this);
    }

    init() {
        this.timeline = gsap.timeline({
            repeat: -1,
            paused: true,
            defaults: { ease: "none" },
            onUpdate: () => this.changed(),
            // playing right, past the start: jump far ahead so it keeps going
            onReverseComplete: () => this.timeline.totalTime(this.timeline.rawTime() + this.timeline.duration() * 100),
        });

        this.fill();
        this.build();
        // start 100 rounds in, so it can also play backwards (right)
        this.timeline.totalTime(this.timeline.duration() * 100 + this.times[0], true);

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

        // the row or an item changed width, e.g. a resize or an image loaded
        this.resizeObserver = new ResizeObserver(() => {
            cancelAnimationFrame(this.frame);
            this.frame = requestAnimationFrame(() => this.refresh());
        });
        this.observe();

        this.viewObserver = new IntersectionObserver(([entry]) => this.hold("view", !entry.isIntersecting));
        this.viewObserver.observe(this.target);

        this.changed();
        this.update();
    }

    // clone items to fill the row plus one, no gap at the seam
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

    // each item slides left to the start, then comes back in from the end
    build() {
        const _items = this.items;
        const _last = _items[_items.length - 1];
        const _startX = _items[0].offsetLeft;
        const _gap = parseFloat(getComputedStyle(this.target).columnGap) || 0;

        this.widths = _items.map((item) => item.offsetWidth);
        this.totalWidth = _last.offsetLeft + _last.offsetWidth - _startX + _gap;
        this.rowWidth = this.target.offsetWidth;

        const _tl = this.timeline;
        _tl.clear();
        gsap.set(_items, { x: 0, xPercent: 0 });

        _items.forEach((item, i) => {
            const _width = this.widths[i];
            const _toStart = item.offsetLeft - _startX;
            const _toLoop = _toStart + _width;

            _tl.to(item, { xPercent: (-_toLoop / _width) * 100, duration: _toLoop / this.speed }, 0)
                .fromTo(item, { xPercent: ((this.totalWidth - _toLoop) / _width) * 100 }, { xPercent: 0, duration: (this.totalWidth - _toLoop) / this.speed, immediateRender: false }, _toLoop / this.speed)
                .add(`item${i}`, _toStart / this.speed);
        });

        // each item's stop: left edge where the first one starts, or centered in the row
        const _inset = _items[0].getBoundingClientRect().left - this.target.getBoundingClientRect().left;
        this.timeWrap = gsap.utils.wrap(0, _tl.duration());
        this.times = _items.map((item, i) => this.timeWrap(_tl.labels[`item${i}`] + (this.center ? (this.widths[i] / 2 - this.rowWidth / 2 + _inset) / this.speed : 0)));

        _tl.progress(1, true).progress(0, true); // pre-render
    }

    refresh() {
        if (!this.timeline || this.holds.has("drag")) return;
        const _changed = this.target.offsetWidth !== this.rowWidth || this.items.some((item, i) => item.offsetWidth !== this.widths[i]);
        if (!_changed) return;

        const _index = this.current();
        this.fill();
        this.build();
        this.observe();
        this.timeline.time(this.times[_index] ?? this.times[0], true);
        this.update();
    }

    observe() {
        this.resizeObserver.disconnect();
        [this.target, ...this.items].forEach((el) => this.resizeObserver.observe(el));
    }

    // the item whose stop is closest to the time
    closest(time = this.timeline.time()) {
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
        if (!this.onChange) return;
        const _index = this.closest();
        if (_index === this.changedIndex) return;
        this.changedIndex = _index;
        this.onChange(this.items[_index], _index);
    }

    // glides the shortest way round, vars are gsap tween vars
    toIndex(index, vars = {}) {
        const _tl = this.timeline;
        const _length = this.items.length;
        const _current = this.current();

        if (Math.abs(index - _current) > _length / 2) index += index > _current ? -_length : _length;
        const _next = gsap.utils.wrap(0, _length, index);
        let _time = this.times[_next];

        // crossing the seam: go past the end or before the start, wrapped
        if (_time > _tl.time() !== index > _current && index !== _current) _time += _tl.duration() * (index > _current ? 1 : -1);

        this.index = _next;
        this.stopThrow();

        if (vars.duration === 0) {
            _tl.time(this.timeWrap(_time));
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

    // left is the marquee's default, right plays it backwards
    setDirection(direction) {
        this.timeline?.timeScale(direction === "right" ? -1 : 1);
    }

    hold(reason, on) {
        on ? this.holds.add(reason) : this.holds.delete(reason);
        this.update();
    }

    update() {
        if (!this.timeline || this.holds.has("tween")) return;
        this.timeline.paused(!this.playing || this.holds.size > 0);
    }

    // a throw cut short never completes, so let go of its hold here
    stopThrow() {
        if (!this.draggable?.isThrowing) return;
        gsap.killTweensOf(this.proxy);
        this.holds.delete("drag");
    }

    // trackpad swipes move the row as far as the fingers, page scroll stays vertical
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

    // drags a proxy, so the row wraps forever
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

        // the proxy's x and the row's progress, measured from the press
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
            // only a real drag holds it, a finger scrolling the page past it doesn't
            onDragStart: () => {
                this.hold("drag", true);
                // it may have moved since the press, carry on from here
                _startProgress = _tl.progress() - (this.draggable.startX - this.draggable.x) * _ratio;
            },
            onDrag: _align,
            onThrowUpdate: _align,
            onDragEnd: () => (this.draggedAt = Date.now()),
            snap: this.snap
                ? (value) => {
                      // let go mid-throw: carry on to its stop
                      if (_caught && Math.abs(this.draggable.startX - this.draggable.x) < 10) {
                          let _left = (_lastStop - _startProgress) % 1;
                          if (_left > 0.5) _left -= 1;
                          if (_left < -0.5) _left += 1;
                          _lastStop = _startProgress + _left;
                          return _xAt(_lastStop);
                      }

                      const _duration = _tl.duration();
                      const _time = _progressAt(value) * _duration;
                      const _wrapped = this.timeWrap(_time);
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
        this.resizeObserver.disconnect();
        this.viewObserver.disconnect();
        cancelAnimationFrame(this.frame);

        this.draggable?.kill();
        if (this.proxy) gsap.killTweensOf(this.proxy);
        this.proxy = null;
        gsap.killTweensOf(this.timeline);
        this.timeline.kill();
        this.timeline = null;

        this.target.querySelectorAll(":scope > .is-clone").forEach((clone) => clone.remove());
        gsap.set(this.items, { clearProps: "transform" });
        this.items = [];
        this.target = null;
    }
}
