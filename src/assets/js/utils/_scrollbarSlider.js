import { _emitter } from "./_emitter";
import { _event } from "./_event";

// free-scrolling card row with its own scrollbar, a mouse drags it
// usage: new _scrollbarSlider({ target, events }), target holds .js-scrollbar-track (the scroller, cards inside)
// optional .js-scrollbar-bar (press or drag to scroll), .js-scrollbar-prev/.js-scrollbar-next; duration (ms), ease for the glide
// target gets --progress (0 to 1), --thumb-size (0 to 1) and data-scrollable for css; events update (progress), change (index)
const _easeOut = (t) => 1 - Math.pow(1 - t, 4);

export class _scrollbarSlider extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;
        this.duration = props.duration ?? 800;
        this.ease = props.ease ?? _easeOut;

        this.el = {};
        this.frame = null;
        this.drag = null;
        this.dragged = false;
        this.progress = null;
        this.current = null;

        if (this.target) this.init();
    }

    init() {
        this.el.track = this.target.querySelector(".js-scrollbar-track");
        this.el.bar = this.target.querySelector(".js-scrollbar-bar");
        this.el.prev = this.target.querySelector(".js-scrollbar-prev");
        this.el.next = this.target.querySelector(".js-scrollbar-next");

        this.handlers = {
            scroll: () => this.update(),
            resize: () => this.update(),
            stop: () => this.stop(),
            down: (e) => this.down(e),
            move: (e) => this.move(e),
            up: () => this.up(),
            barDown: (e) => this.barDown(e),
            barMove: (e) => this.barMove(e),
            barUp: (e) => this.barUp(e),
            prev: () => this.prev(),
            next: () => this.next(),
            dragstart: (e) => e.preventDefault(),
            click: (e) => {
                if (!this.dragged) return;
                e.preventDefault();
                e.stopPropagation();
                this.dragged = false;
            },
        };

        const _track = this.el.track;
        _track.addEventListener("scroll", this.handlers.scroll, { passive: true });
        _track.addEventListener("wheel", this.handlers.stop, { passive: true });
        _track.addEventListener("touchstart", this.handlers.stop, { passive: true });
        _track.addEventListener("pointerdown", this.handlers.down);
        _track.addEventListener("dragstart", this.handlers.dragstart);
        _track.addEventListener("click", this.handlers.click, true);
        this.el.bar?.addEventListener("pointerdown", this.handlers.barDown);
        this.el.prev?.addEventListener("click", this.handlers.prev);
        this.el.next?.addEventListener("click", this.handlers.next);

        this.observed = [_track, ..._track.children];
        this.observed.forEach((item) => _event.observeResize(this.handlers.resize, item));
    }

    get max() {
        return this.el.track.scrollWidth - this.el.track.clientWidth;
    }

    positions() {
        const _track = this.el.track;
        const _first = _track.children[0]?.offsetLeft ?? 0;

        return [...new Set([..._track.children].map((item) => Math.min(item.offsetLeft - _first, this.max)))];
    }

    get index() {
        const _left = this.el.track.scrollLeft;
        const _positions = this.positions();
        return _positions.reduce((nearest, position, i) => (Math.abs(position - _left) < Math.abs(_positions[nearest] - _left) ? i : nearest), 0);
    }

    update() {
        const _track = this.el.track;
        const _max = this.max;

        if (this.el.prev) this.el.prev.disabled = _track.scrollLeft <= 1;
        if (this.el.next) this.el.next.disabled = _track.scrollLeft >= _max - 1;

        this.target.toggleAttribute("data-scrollable", _max > 1);
        this.target.style.setProperty("--thumb-size", (_track.clientWidth / _track.scrollWidth).toFixed(4));

        const _progress = _max > 1 ? Math.round((_track.scrollLeft / _max) * 10000) / 10000 : 0;
        if (_progress !== this.progress) {
            this.progress = _progress;
            this.target.style.setProperty("--progress", _progress);
            this.emit("update");
        }

        const _index = this.index;
        if (_index !== this.current) {
            this.current = _index;
            this.emit("change");
        }
    }

    prev() {
        const _left = this.el.track.scrollLeft;
        const _position = this.positions().findLast((position) => position < _left - 1);
        this.glide(_position ?? 0);
    }

    next() {
        const _left = this.el.track.scrollLeft;
        const _position = this.positions().find((position) => position > _left + 1);
        this.glide(_position ?? this.max);
    }

    show(index) {
        const _positions = this.positions();
        this.glide(_positions[Math.max(0, Math.min(index, _positions.length - 1))]);
    }

    glide(position) {
        this.stop();

        const _track = this.el.track;
        const _from = _track.scrollLeft;
        const _to = Math.max(0, Math.min(position, this.max));
        const _duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : this.duration;
        const _start = performance.now();

        const _step = (time) => {
            const _progress = _duration ? Math.min((time - _start) / _duration, 1) : 1;
            _track.scrollLeft = _from + (_to - _from) * this.ease(_progress);

            if (_progress < 1) this.frame = requestAnimationFrame(_step);
            else this.stop();
        };

        this.frame = requestAnimationFrame(_step);
    }

    stop() {
        cancelAnimationFrame(this.frame);
        this.frame = null;
    }

    down(e) {
        this.dragged = false;
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        e.preventDefault();

        this.stop();
        this.drag = { x: e.clientX, left: this.el.track.scrollLeft, time: performance.now(), speed: 0 };

        window.addEventListener("pointermove", this.handlers.move);
        window.addEventListener("pointerup", this.handlers.up);
        window.addEventListener("pointercancel", this.handlers.up);
    }

    move(e) {
        const _drag = this.drag;
        const _now = performance.now();
        const _left = _drag.left - (e.clientX - _drag.x);

        if (Math.abs(e.clientX - _drag.x) > 5 && !this.dragged) {
            this.dragged = true;
            this.el.track.dataset.dragging = "";
        }

        _drag.speed = (_left - this.el.track.scrollLeft) / Math.max(_now - _drag.time, 1);
        _drag.time = _now;
        this.el.track.scrollLeft = _left;
    }

    up() {
        window.removeEventListener("pointermove", this.handlers.move);
        window.removeEventListener("pointerup", this.handlers.up);
        window.removeEventListener("pointercancel", this.handlers.up);
        delete this.el.track.dataset.dragging;

        const _speed = performance.now() - this.drag.time > 80 ? 0 : this.drag.speed;
        if (_speed) this.glide(this.el.track.scrollLeft + _speed * 250);

        this.drag = null;
    }

    thumb() {
        const _width = this.el.bar.clientWidth;
        const _size = Math.min(this.el.track.clientWidth / this.el.track.scrollWidth, 1) * _width;
        const _progress = this.max > 0 ? this.el.track.scrollLeft / this.max : 0;
        return { width: _size, left: _progress * (_width - _size), room: _width - _size };
    }

    barDown(e) {
        if (e.button !== 0 || this.max <= 1) return;
        e.preventDefault();

        const _thumb = this.thumb();
        const _x = e.clientX - this.el.bar.getBoundingClientRect().left;
        const _on = _x >= _thumb.left && _x <= _thumb.left + _thumb.width;

        this.bar = { grab: _on ? _x - _thumb.left : _thumb.width / 2 };
        if (!_on) this.glide(((_x - this.bar.grab) / _thumb.room) * this.max);

        this.el.bar.setPointerCapture(e.pointerId);
        this.el.bar.dataset.dragging = "";
        this.el.bar.addEventListener("pointermove", this.handlers.barMove);
        this.el.bar.addEventListener("pointerup", this.handlers.barUp);
        this.el.bar.addEventListener("pointercancel", this.handlers.barUp);
    }

    barMove(e) {
        this.stop();
        const _x = e.clientX - this.el.bar.getBoundingClientRect().left;
        this.el.track.scrollLeft = ((_x - this.bar.grab) / this.thumb().room) * this.max;
    }

    barUp(e) {
        this.el.bar.releasePointerCapture?.(e.pointerId);
        delete this.el.bar.dataset.dragging;
        this.el.bar.removeEventListener("pointermove", this.handlers.barMove);
        this.el.bar.removeEventListener("pointerup", this.handlers.barUp);
        this.el.bar.removeEventListener("pointercancel", this.handlers.barUp);
        this.bar = null;
    }

    destroy() {
        const _track = this.el.track;
        if (this.drag) this.up();
        this.stop();
        this.observed.forEach((item) => _event.offObserveResize(this.handlers.resize, item));

        _track.removeEventListener("scroll", this.handlers.scroll);
        _track.removeEventListener("wheel", this.handlers.stop);
        _track.removeEventListener("touchstart", this.handlers.stop);
        _track.removeEventListener("pointerdown", this.handlers.down);
        _track.removeEventListener("dragstart", this.handlers.dragstart);
        _track.removeEventListener("click", this.handlers.click, true);
        this.el.bar?.removeEventListener("pointerdown", this.handlers.barDown);
        this.el.prev?.removeEventListener("click", this.handlers.prev);
        this.el.next?.removeEventListener("click", this.handlers.next);

        this.target.style.removeProperty("--progress");
        this.target.style.removeProperty("--thumb-size");
        this.target.removeAttribute("data-scrollable");
    }
}
