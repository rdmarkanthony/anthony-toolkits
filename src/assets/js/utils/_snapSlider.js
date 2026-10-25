import { _emitter } from "./_emitter";
import { _event } from "./_event";

// scroll-snap card row, a mouse drags it
// usage: new _snapSlider({ target, events }), target holds .js-snap-track (the scroller, cards inside)
// optional .js-snap-prev/.js-snap-next; duration (ms), ease for the glide
// cards get --offset (-1 to 1) and --near (1 to 0) for css; events update (on scroll), change (slider.current)
const _easeOut = (t) => 1 - Math.pow(1 - t, 4);

export class _snapSlider extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;
        this.duration = props.duration ?? 800;
        this.ease = props.ease ?? _easeOut;

        this.el = {};
        this.frame = null;
        this.drag = null;
        this.dragged = false;
        this.current = null;

        if (this.target) this.init();
    }

    init() {
        this.el.track = this.target.querySelector(".js-snap-track");
        this.el.prev = this.target.querySelector(".js-snap-prev");
        this.el.next = this.target.querySelector(".js-snap-next");

        this.handlers = {
            scroll: () => this.update(),
            resize: () => this.update(),
            stop: () => this.stop(),
            down: (e) => this.down(e),
            move: (e) => this.move(e),
            up: () => this.up(),
            prev: () => this.prev(),
            next: () => this.next(),
            dragstart: (e) => e.preventDefault(),
            // a drag isn't a click on the card under it
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
        this.el.prev?.addEventListener("click", this.handlers.prev);
        this.el.next?.addEventListener("click", this.handlers.next);

        // the row, and cards that change size
        this.observed = [_track, ..._track.children];
        this.observed.forEach((item) => _event.observeResize(this.handlers.resize, item));
    }

    // scroll positions that put each card at the snap spot
    positions() {
        const _track = this.el.track;
        const _first = _track.children[0]?.offsetLeft ?? 0;
        const _max = _track.scrollWidth - _track.clientWidth;

        return [...new Set([..._track.children].map((item) => Math.min(item.offsetLeft - _first, _max)))];
    }

    // the position nearest to a scroll left
    nearest(left, positions = this.positions()) {
        return positions.reduce((nearest, position, i) => (Math.abs(position - left) < Math.abs(positions[nearest] - left) ? i : nearest), 0);
    }

    get index() {
        return this.nearest(this.el.track.scrollLeft);
    }

    update() {
        const _track = this.el.track;
        const _max = _track.scrollWidth - _track.clientWidth;

        if (this.el.prev) this.el.prev.disabled = _track.scrollLeft <= 1;
        if (this.el.next) this.el.next.disabled = _track.scrollLeft >= _max - 1;

        // how far each card is from its snap spot, in cards
        const _cards = [..._track.children];
        const _first = _cards[0]?.offsetLeft ?? 0;
        const _offsets = _cards.map((item, i) => {
            const _step = (_cards[i + 1] ?? _cards[i - 1])?.offsetLeft - item.offsetLeft;
            return Math.max(-1, Math.min((_track.scrollLeft - (item.offsetLeft - _first)) / Math.abs(_step || item.offsetWidth), 1));
        });

        _cards.forEach((item, i) => {
            item.style.setProperty("--offset", _offsets[i].toFixed(4));
            item.style.setProperty("--near", (1 - Math.abs(_offsets[i])).toFixed(4));
        });

        this.emit("update");

        const _index = this.index;
        if (_index !== this.current) {
            this.current = _index;
            this.emit("change");
        }
    }

    prev() {
        const _left = this.el.track.scrollLeft;
        const _position = this.positions().findLast((position) => position < _left - 1);
        if (_position !== undefined) this.glide(_position);
    }

    next() {
        const _left = this.el.track.scrollLeft;
        const _position = this.positions().find((position) => position > _left + 1);
        if (_position !== undefined) this.glide(_position);
    }

    show(index) {
        const _positions = this.positions();
        this.glide(_positions[Math.max(0, Math.min(index, _positions.length - 1))]);
    }

    // snap is off while it glides, or each step would snap back
    glide(position) {
        this.stop();

        const _track = this.el.track;
        const _from = _track.scrollLeft;
        const _duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : this.duration;
        const _start = performance.now();

        _track.style.scrollSnapType = "none";

        const _step = (time) => {
            const _progress = _duration ? Math.min((time - _start) / _duration, 1) : 1;
            _track.scrollLeft = _from + (position - _from) * this.ease(_progress);

            if (_progress < 1) this.frame = requestAnimationFrame(_step);
            else this.stop();
        };

        this.frame = requestAnimationFrame(_step);
    }

    stop() {
        cancelAnimationFrame(this.frame);
        this.frame = null;
        this.el.track.style.scrollSnapType = "";
    }

    down(e) {
        this.dragged = false;
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        e.preventDefault(); // no text selection

        this.stop();
        this.el.track.style.scrollSnapType = "none";
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

        // px per ms, for the throw on release
        _drag.speed = (_left - this.el.track.scrollLeft) / Math.max(_now - _drag.time, 1);
        _drag.time = _now;
        this.el.track.scrollLeft = _left;
    }

    up() {
        window.removeEventListener("pointermove", this.handlers.move);
        window.removeEventListener("pointerup", this.handlers.up);
        window.removeEventListener("pointercancel", this.handlers.up);
        delete this.el.track.dataset.dragging;

        // land on the nearest card, at most one further
        const _track = this.el.track;
        const _card = _track.children[0]?.offsetWidth ?? 0;
        const _speed = performance.now() - this.drag.time > 80 ? 0 : this.drag.speed;
        const _throw = _track.scrollLeft + Math.max(-_card, Math.min(_speed * 150, _card));
        const _positions = this.positions();
        this.glide(_positions[this.nearest(_throw, _positions)]);

        this.drag = null;
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
        this.el.prev?.removeEventListener("click", this.handlers.prev);
        this.el.next?.removeEventListener("click", this.handlers.next);
    }
}
