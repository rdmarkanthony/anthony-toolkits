import { _emitter } from "./_emitter";
import { _event } from "./_event";

// usage: new _dropdown({ target, hover, delay, closeDelay, events }), target is the nav, position: relative
// markup: target > .js-dropdown-item > .js-dropdown-toggle (a button or link) + .js-dropdown-panel
// the open item and panel get data-open, other panels data-side="before" | "after" of it while one is open
// target gets data-open, data-switch when moving between items, and the open panel's --dropdown-width, -height, -x, -y
let _count = 0;

export class _dropdown extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.hover = props.hover ?? true;
        this.delay = props.delay ?? 100;
        this.closeDelay = props.closeDelay ?? 300;

        this.items = [];
        this.active = -1;
        this.timer = null;
        this.abort = new AbortController();
        this._onSize = () => this.vars();

        if (this.target) this.init();
    }

    init() {
        const { signal } = this.abort;
        const _fine = window.matchMedia("(hover: hover) and (pointer: fine)");

        this.items = [...this.target.querySelectorAll(".js-dropdown-item")].map((item) => {
            const _toggle = item.querySelector(".js-dropdown-toggle");
            const _panel = item.querySelector(".js-dropdown-panel");

            _panel.id ||= `dropdown-${++_count}`;
            _panel.inert = true;
            _toggle.setAttribute("aria-controls", _panel.id);
            _toggle.setAttribute("aria-expanded", "false");

            return { item, toggle: _toggle, panel: _panel };
        });

        this.target.addEventListener(
            "pointerover",
            (e) => {
                if (!this.hover || e.pointerType !== "mouse") return;
                const _index = this.indexOf(e.target);
                if (_index === this.active) return clearTimeout(this.timer);
                this.later(() => (_index < 0 ? this.close() : this.open(_index)), _index < 0 ? this.closeDelay : this.delay);
            },
            { signal }
        );

        this.target.addEventListener("pointerleave", (e) => this.hover && e.pointerType === "mouse" && this.later(() => this.close(), this.closeDelay), { signal });

        this.target.addEventListener(
            "click",
            (e) => {
                const _index = this.items.findIndex(({ toggle }) => toggle.contains(e.target));
                if (_index < 0) return;

                const _isLink = this.items[_index].toggle.matches("a[href]");
                const _byHover = this.hover && _fine.matches && e.detail > 0;

                // a link opens on the first tap, goes on the second, with a mouse it just goes
                if (_isLink && (_byHover || this.active === _index)) return;
                e.preventDefault();

                if (_byHover) this.open(_index);
                else this.toggle(_index);
            },
            { signal }
        );

        this.target.addEventListener(
            "keydown",
            (e) => {
                if (e.key === "Escape" && this.active > -1) {
                    const { item, toggle } = this.items[this.active];
                    if (item.contains(document.activeElement)) toggle.focus();
                    this.close();
                    return;
                }

                const _index = this.items.findIndex(({ toggle }) => toggle === e.target);
                if (e.key !== "ArrowDown" || _index < 0) return;

                e.preventDefault();
                this.open(_index);

                // a visibility transition keeps it hidden on the first frame
                const _first = this.items[_index].panel.querySelector("a[href], button, input, select, textarea, [tabindex]");
                _first?.focus();
                if (_first && document.activeElement !== _first) requestAnimationFrame(() => requestAnimationFrame(() => _first.focus()));
            },
            { signal }
        );

        this.target.addEventListener("focusin", (e) => this.active > -1 && !this.items[this.active].item.contains(e.target) && this.close(), { signal });
        this.target.addEventListener("focusout", (e) => !this.target.contains(e.relatedTarget) && e.relatedTarget && this.close(), { signal });
        document.addEventListener("pointerdown", (e) => !this.target.contains(e.target) && this.close(), { signal });

        _event.resize(this._onSize);
    }

    indexOf(element) {
        return this.items.findIndex(({ item }) => item.contains(element));
    }

    later(callback, delay) {
        clearTimeout(this.timer);
        this.timer = setTimeout(callback, delay);
    }

    toggle(index) {
        this.active === index ? this.close() : this.open(index);
    }

    open(index) {
        clearTimeout(this.timer);
        if (typeof index !== "number") index = this.indexOf(index);
        if (index < 0 || index === this.active) return;

        const _switch = this.active > -1;
        if (_switch) _event.offObserveResize(this._onSize, this.items[this.active].panel);

        this.active = index;
        this.update();
        this.target.toggleAttribute("data-switch", _switch);
        this.target.setAttribute("data-open", "");
        _event.observeResize(this._onSize, this.items[index].panel);

        if (!_switch) this.emit("open");
        this.emit("change");
    }

    close() {
        clearTimeout(this.timer);
        if (this.active < 0) return;

        _event.offObserveResize(this._onSize, this.items[this.active].panel);
        this.active = -1;
        this.update();
        this.target.removeAttribute("data-open");
        this.target.removeAttribute("data-switch");

        this.emit("close");
        this.emit("change");
    }

    update() {
        this.items.forEach(({ item, toggle, panel }, index) => {
            const _open = index === this.active;
            item.toggleAttribute("data-open", _open);
            panel.toggleAttribute("data-open", _open);
            panel.inert = !_open;
            toggle.setAttribute("aria-expanded", String(_open));

            if (this.active < 0 || _open) panel.removeAttribute("data-side");
            else panel.dataset.side = index < this.active ? "before" : "after";
        });
    }

    // offsets ignore transforms, so a panel mid animation still measures right
    vars() {
        const _panel = this.items[this.active]?.panel;
        if (!_panel) return;

        let _x = 0;
        let _y = 0;
        for (let _element = _panel; _element && _element !== this.target; _element = _element.offsetParent) {
            _x += _element.offsetLeft;
            _y += _element.offsetTop;
        }

        const _style = this.target.style;
        _style.setProperty("--dropdown-width", `${_panel.offsetWidth}px`);
        _style.setProperty("--dropdown-height", `${_panel.offsetHeight}px`);
        _style.setProperty("--dropdown-x", `${_x}px`);
        _style.setProperty("--dropdown-y", `${_y}px`);
    }

    destroy() {
        this.close();
        this.abort.abort();
        _event.offResize(this._onSize);
        this.items.forEach(({ panel }) => (panel.inert = false));
    }
}
