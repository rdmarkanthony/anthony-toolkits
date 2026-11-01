// usage: new _cursorBubble({ classes, ease, pull }), a dot trailing the mouse
// [data-cursor="name"] sets data-state="name" on the bubble
// built in: "grow", "hidden"; data-cursor-text adds a label
// data-cursor-icon="#id" adds a <template>'s svg
// data-cursor-stick="8": the dot takes the element's shape, 8px bigger, pull is how far it still follows the mouse
export class _cursorBubble {
    // the look, override with Object.assign(_cursorBubble.classes, {...})
    // display: contents, so the dot blends with the page
    // no scale classes, they scale toward the corner
    static classes = {
        bubble: "group contents",
        dot: "pointer-events-none fixed top-0 left-0 z-999 size-3 -translate-1/2 rounded-full bg-white opacity-0 mix-blend-difference transition-[opacity,width,height,border-radius] duration-300 group-data-visible:opacity-100 group-data-text:size-0 group-data-[state=grow]:size-20",
        label: "pointer-events-none fixed top-0 left-0 z-999 mt-3 ml-3 flex -translate-x-3 items-center gap-2 rounded-full bg-gray-950 px-4 py-2 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-[opacity,translate] duration-300 group-data-text:translate-x-0 group-data-text:group-data-visible:opacity-100",
    };

    constructor(props = {}) {
        this.classes = { ..._cursorBubble.classes, ...props.classes };
        this.ease = props.ease ?? 0.2;
        this.pull = props.pull ?? 0.15;

        this.el = null;
        this.dot = null;
        this.label = null;
        this.state = "";
        this.stick = null;
        this.inside = false;
        this.mouse = { x: 0, y: 0 };
        this.pos = { x: 0, y: 0 };
        this.frame = null;
        this.time = 0;
        this.abort = new AbortController();

        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) this.init();
    }

    init() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) this.ease = 1;

        this.el = document.createElement("div");
        this.el.className = this.classes.bubble;
        this.el.setAttribute("aria-hidden", "true");
        this.el.innerHTML = `<div class="${this.classes.dot}"></div><div class="${this.classes.label}"></div>`;
        [this.dot, this.label] = this.el.children;
        document.body.append(this.el);

        const _on = (type, callback) => document.addEventListener(type, callback, { passive: true, signal: this.abort.signal });
        _on("pointermove", (e) => e.pointerType === "mouse" && this.move(e));
        _on("pointerover", (e) => e.pointerType === "mouse" && this.check(e.target));
        _on("pointerout", (e) => !e.relatedTarget && this.show(false));
        _on("scroll", () => this.inside && this.check(document.elementFromPoint(this.mouse.x, this.mouse.y)));
    }

    move(e) {
        this.mouse = { x: e.clientX, y: e.clientY };

        if (!this.inside) {
            this.pos = { ...this.mouse };
            this.render();
            this.show(true);
        }

        this.start();
    }

    start() {
        if (this.frame) return;
        this.time = 0;
        this.frame = requestAnimationFrame((time) => this.tick(time));
    }

    tick(time) {
        const _ease = 1 - Math.pow(1 - this.ease, (this.time ? time - this.time : 16.7) / 16.7);
        this.time = time;

        const _to = { ...this.mouse };
        if (this.stick) {
            const _x = this.stick.left + this.stick.width / 2;
            const _y = this.stick.top + this.stick.height / 2;
            _to.x = _x + (this.mouse.x - _x) * this.pull;
            _to.y = _y + (this.mouse.y - _y) * this.pull;
        }

        this.pos.x += (_to.x - this.pos.x) * _ease;
        this.pos.y += (_to.y - this.pos.y) * _ease;
        this.render();

        const _done = Math.abs(_to.x - this.pos.x) < 0.1 && Math.abs(_to.y - this.pos.y) < 0.1;
        this.frame = _done ? null : requestAnimationFrame((next) => this.tick(next));
    }

    render() {
        this.dot.style.transform = this.label.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
    }

    check(target) {
        const _area = target?.closest?.("[data-cursor], [data-cursor-text], [data-cursor-icon]");
        const _text = _area?.dataset.cursorText ?? "";
        const _icon = _area?.dataset.cursorIcon ? document.querySelector(_area.dataset.cursorIcon)?.content : null;
        this.state = _area?.dataset.cursor ?? "";

        if (this.state) this.el.dataset.state = this.state;
        else this.el.removeAttribute("data-state");

        if (_text || _icon) this.label.replaceChildren(...(_icon ? [_icon.cloneNode(true)] : []), _text);
        this.el.toggleAttribute("data-text", Boolean(_text || _icon));

        this.stickTo(target?.closest?.("[data-cursor-stick]"));
        this.show(this.inside);
    }

    stickTo(target) {
        this.stick = target?.getBoundingClientRect() ?? null;
        this.el.toggleAttribute("data-stuck", Boolean(target));

        const _pad = (parseFloat(target?.dataset.cursorStick) || 0) * 2;
        this.dot.style.width = target ? `${this.stick.width + _pad}px` : "";
        this.dot.style.height = target ? `${this.stick.height + _pad}px` : "";
        this.dot.style.borderRadius = target ? getComputedStyle(target).borderRadius : "";
        if (this.inside) this.start();
    }

    show(inside) {
        this.inside = inside;
        this.el.toggleAttribute("data-visible", inside && this.state !== "hidden");
    }

    destroy() {
        this.abort.abort();
        cancelAnimationFrame(this.frame);
        this.el?.remove();
    }
}
