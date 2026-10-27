import { _emitter } from "./_emitter";

// a stack of tilted cards, the top one is thrown off and slides back in at the bottom
// usage: new _deckSlider({ target, tilt, duration, events }), target holds the .js-deck-card cards, stacked by css
// optional .js-deck-prev/.js-deck-next; click the top card to throw it up, or drag it to throw it that way
// each card gets --deck-tilt and --deck-depth (0 on top) for css, the top one data-current, the rest inert; events change
export class _deckSlider extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;
        this.tilt = props.tilt ?? 8;
        this.duration = props.duration ?? 600;

        this.el = {};
        this.order = [];
        this.flying = new Map();
        this.drag = null;
        this.dragged = false;
        this.shown = null;

        if (this.target) this.init();
    }

    init() {
        this.el.cards = [...this.target.querySelectorAll(".js-deck-card")];
        this.el.prev = this.target.querySelector(".js-deck-prev");
        this.el.next = this.target.querySelector(".js-deck-next");

        this.order = this.el.cards.map((card, index) => index);
        this.el.cards.forEach((card, index) => card.style.setProperty("--deck-tilt", index ? this.lean(this.el.cards[index - 1]) : "0deg"));

        this.handlers = {
            down: (e) => this.down(e),
            move: (e) => this.move(e),
            up: () => this.up(),
            click: (e) => this.click(e),
            dragstart: (e) => e.preventDefault(),
            prev: () => this.prev(),
            next: () => this.next(),
        };

        this.el.cards.forEach((card) => {
            card.addEventListener("pointerdown", this.handlers.down);
            card.addEventListener("click", this.handlers.click);
            card.addEventListener("dragstart", this.handlers.dragstart);
        });
        this.el.prev?.addEventListener("click", this.handlers.prev);
        this.el.next?.addEventListener("click", this.handlers.next);

        this.update();
    }

    get current() {
        return this.order[0];
    }

    // leans the other way from the card above it
    lean(above) {
        const _side = parseFloat(above.style.getPropertyValue("--deck-tilt")) > 0 ? -1 : 1;
        return `${_side * this.tilt * (0.6 + Math.random() * 0.4)}deg`;
    }

    time(scale) {
        return matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : this.duration * scale;
    }

    update() {
        const _count = this.order.length;

        this.order.forEach((index, depth) => {
            const _card = this.el.cards[index];
            _card.style.setProperty("--deck-depth", depth);
            _card.style.zIndex = this.flying.get(_card) ?? _count - depth;
            _card.toggleAttribute("data-current", !depth);
            _card.inert = depth > 0;
        });

        if (this.current !== this.shown) {
            this.shown = this.current;
            this.emit("change");
        }
    }

    // up and a little to the side, clear of the stack
    away(card, side) {
        return { x: card.offsetWidth * 0.2 * side, y: -card.offsetHeight * 1.1, rotate: 12 * side };
    }

    next(away, from) {
        const _card = this.el.cards[this.current];
        this.order.push(this.order.shift());
        _card.style.setProperty("--deck-tilt", this.lean(this.el.cards[this.order.at(-2)]));

        // over the others while it's out
        return this.fly(_card, away ?? this.away(_card, Math.random() > 0.5 ? 1 : -1), this.el.cards.length + 1 + this.flying.size, from);
    }

    prev() {
        const _card = this.el.cards[this.order.at(-1)];
        this.order.unshift(this.order.pop());

        // out from behind, in on top
        return this.fly(_card, this.away(_card, -1), 0);
    }

    // out, then in at its new place, from where it is now or from the drag
    async fly(card, away, z, from = this.now(card)) {
        card.getAnimations().forEach((animation) => animation.cancel());
        this.flying.set(card, z);
        this.update();

        const _away = { translate: `${away.x}px ${away.y}px`, rotate: `${away.rotate}deg` };
        const _out = card.animate([from, _away], { duration: this.time(0.45), easing: "cubic-bezier(0.2, 0.6, 0.35, 1)", fill: "forwards" });

        // thrown again on its way
        try {
            await _out.finished;
        } catch {
            return;
        }

        this.flying.delete(card);
        this.update();

        // the end is its css place
        card.animate([_away, {}], { duration: this.time(1), easing: "cubic-bezier(0.6, 0, 0.2, 1)" });
        _out.cancel();
    }

    now(card) {
        const _style = getComputedStyle(card);
        return { translate: _style.translate, rotate: _style.rotate };
    }

    down(e) {
        const _card = e.currentTarget;
        this.dragged = false;
        if (_card !== this.el.cards[this.current] || e.button !== 0 || this.flying.has(_card)) return;
        if (e.target.closest("a, button, input, select, textarea")) return;

        _card.getAnimations().forEach((animation) => animation.cancel());
        this.drag = { card: _card, x: e.clientX, y: e.clientY, dx: 0, dy: 0, time: performance.now(), speed: 0 };

        _card.setPointerCapture(e.pointerId);
        _card.addEventListener("pointermove", this.handlers.move);
        _card.addEventListener("pointerup", this.handlers.up);
        _card.addEventListener("pointercancel", this.handlers.up);
    }

    move(e) {
        const _drag = this.drag;
        const _dx = e.clientX - _drag.x;
        const _dy = e.clientY - _drag.y;
        const _now = performance.now();

        if (!this.dragged && Math.hypot(_dx, _dy) > 5) {
            this.dragged = true;
            _drag.card.dataset.dragging = "";
        }

        // px per ms, for a quick flick
        _drag.speed = Math.hypot(_dx - _drag.dx, _dy - _drag.dy) / Math.max(_now - _drag.time, 1);
        Object.assign(_drag, { dx: _dx, dy: _dy, time: _now });

        _drag.card.style.translate = `${_dx}px ${_dy}px`;
        _drag.card.style.rotate = `${_dx * 0.05}deg`;
    }

    up() {
        const { card, dx, dy, speed, time } = this.drag;
        card.removeEventListener("pointermove", this.handlers.move);
        card.removeEventListener("pointerup", this.handlers.up);
        card.removeEventListener("pointercancel", this.handlers.up);
        delete card.dataset.dragging;
        this.drag = null;

        const _from = this.now(card);
        card.style.removeProperty("translate");
        card.style.removeProperty("rotate");

        // far enough, or flicked, it's thrown that way
        const _length = Math.hypot(dx, dy);
        const _flick = performance.now() - time < 80 && speed > 0.5;
        if (_length > card.offsetWidth * 0.3 || (_flick && _length > 20)) {
            const _reach = Math.max(card.offsetWidth, card.offsetHeight) * 1.1;
            this.next({ x: (dx / _length) * _reach, y: (dy / _length) * _reach, rotate: dx * 0.04 }, _from);
        } else if (this.dragged) {
            card.animate([_from, {}], { duration: this.time(0.8), easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
        }
    }

    // the top card throws, unless it was dragged or a link in it was clicked
    click(e) {
        if (this.dragged) {
            this.dragged = false;
            return;
        }
        if (e.currentTarget !== this.el.cards[this.current] || e.target.closest("a, button, input, select, textarea")) return;
        this.next();
    }

    destroy() {
        this.el.cards.forEach((card) => {
            card.getAnimations().forEach((animation) => animation.cancel());
            card.removeEventListener("pointerdown", this.handlers.down);
            card.removeEventListener("click", this.handlers.click);
            card.removeEventListener("dragstart", this.handlers.dragstart);
            ["--deck-tilt", "--deck-depth", "z-index", "translate", "rotate"].forEach((property) => card.style.removeProperty(property));
            card.removeAttribute("data-current");
            card.inert = false;
        });
        this.el.prev?.removeEventListener("click", this.handlers.prev);
        this.el.next?.removeEventListener("click", this.handlers.next);
        this.flying.clear();
        this.listeners = {};
    }
}
