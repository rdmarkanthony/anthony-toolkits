// native scroll-snap card row: touch and trackpad scroll it, a mouse drags it, buttons glide one card
// usage: new _snapSlider({ target }), target holds .js-snap-track (the scroller, cards inside)
// optional .js-snap-prev and .js-snap-next, disabled at the ends; duration (ms) and ease (0-1 function) for the glide
// each card gets --offset (-1 to 1, 0 when it's at the snap spot) and --near (1 to 0), for parallax in css
const _easeOut = (t) => 1 - Math.pow(1 - t, 4);

export class _snapSlider {
    constructor(props) {
        this.target = props.target ?? null;
        this.duration = props.duration ?? 800;
        this.ease = props.ease ?? _easeOut;

        this.el = {};
        this.frame = null;
        this.drag = null;
        this.dragged = false;

        if (this.target) this.init();
    }

    init() {
        this.el.track = this.target.querySelector(".js-snap-track");
        this.el.prev = this.target.querySelector(".js-snap-prev");
        this.el.next = this.target.querySelector(".js-snap-next");

        this.handlers = {
            scroll: () => this.update(),
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

        this.observer = new ResizeObserver(this.handlers.scroll);
        this.observer.observe(_track);
    }

    // scroll positions that put each card at the snap spot
    positions() {
        const _track = this.el.track;
        const _first = _track.children[0]?.offsetLeft ?? 0;
        const _max = _track.scrollWidth - _track.clientWidth;

        return [...new Set([..._track.children].map((item) => Math.min(item.offsetLeft - _first, _max)))];
    }

    get index() {
        const _left = this.el.track.scrollLeft;
        const _positions = this.positions();

        return _positions.reduce((nearest, position, i) => (Math.abs(position - _left) < Math.abs(_positions[nearest] - _left) ? i : nearest), 0);
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

        // land on the card nearest to where the throw would end, at most one card further
        const _track = this.el.track;
        const _card = _track.children[0]?.offsetWidth ?? 0;
        const _speed = performance.now() - this.drag.time > 80 ? 0 : this.drag.speed;
        const _throw = _track.scrollLeft + Math.max(-_card, Math.min(_speed * 150, _card));
        const _positions = this.positions();
        this.glide(_positions.reduce((nearest, position) => (Math.abs(position - _throw) < Math.abs(nearest - _throw) ? position : nearest), _positions[0]));

        this.drag = null;
    }

    destroy() {
        const _track = this.el.track;
        if (this.drag) this.up();
        this.stop();
        this.observer?.disconnect();

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
