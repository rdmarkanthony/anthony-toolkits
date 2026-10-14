// usage: new _cursorBubble({ classes, ease }), a dot that trails the mouse, off on touch screens
// over [data-cursor="name"] the bubble gets data-state="name", style it with group-data-[state=name]:
// data-cursor="grow" is built in, "hidden" hides it, data-cursor-text shows a label
export class _cursorBubble {
    // the look, project-wide with Object.assign(_cursorBubble.classes, { dot: "..." })
    // bubble is display: contents, so the dot can blend with the page
    // no scale classes here, they would scale toward the screen corner
    static classes = {
        bubble: "group contents",
        dot: "pointer-events-none fixed top-0 left-0 z-999 size-3 -translate-1/2 rounded-full bg-white opacity-0 mix-blend-difference transition-[opacity,width,height] duration-300 group-data-visible:opacity-100 group-data-text:size-0 group-data-[state=grow]:size-20",
        label: "pointer-events-none fixed top-0 left-0 z-999 mt-3 ml-3 -translate-x-3 rounded-full bg-gray-950 px-4 py-2 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-[opacity,translate] duration-300 group-data-text:translate-x-0 group-data-text:group-data-visible:opacity-100",
    };

    constructor(props = {}) {
        this.classes = { ..._cursorBubble.classes, ...props.classes };
        this.ease = props.ease ?? 0.2;

        this.el = null;
        this.dot = null;
        this.label = null;
        this.state = "";
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
        // the page moves under a still mouse
        _on("scroll", () => this.inside && this.check(document.elementFromPoint(this.mouse.x, this.mouse.y)));
    }

    move(e) {
        this.mouse = { x: e.clientX, y: e.clientY };

        // back in the window, start at the mouse
        if (!this.inside) {
            this.pos = { ...this.mouse };
            this.render();
            this.show(true);
        }

        if (!this.frame) {
            this.time = 0;
            this.frame = requestAnimationFrame((time) => this.tick(time));
        }
    }

    tick(time) {
        // same speed at 60 and 120hz
        const _ease = 1 - Math.pow(1 - this.ease, (this.time ? time - this.time : 16.7) / 16.7);
        this.time = time;

        this.pos.x += (this.mouse.x - this.pos.x) * _ease;
        this.pos.y += (this.mouse.y - this.pos.y) * _ease;
        this.render();

        const _done = Math.abs(this.mouse.x - this.pos.x) < 0.1 && Math.abs(this.mouse.y - this.pos.y) < 0.1;
        this.frame = _done ? null : requestAnimationFrame((next) => this.tick(next));
    }

    render() {
        this.dot.style.transform = this.label.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
    }

    check(target) {
        const _area = target?.closest?.("[data-cursor], [data-cursor-text]");
        const _text = _area?.dataset.cursorText ?? "";
        this.state = _area?.dataset.cursor ?? "";

        if (this.state) this.el.dataset.state = this.state;
        else this.el.removeAttribute("data-state");

        // keep the old text while the label scales out
        if (_text) this.label.textContent = _text;
        this.el.toggleAttribute("data-text", Boolean(_text));

        this.show(this.inside);
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
