import { _emitter } from "./_emitter";
import { _event } from "./_event";

// usage: new _dropdown({ target, hover, delay, closeDelay, events }), target is the nav, position: relative
// markup: target > .js-dropdown-item > .js-dropdown-toggle (a button or link) + .js-dropdown-panel, or aria-controls="id" for a panel anywhere
// the open item and panel get data-open, other panels data-side="before" | "after" of it, .js-dropdown-close in a panel closes it
// by mouse, the opening panel starts with data-from="left" | "right", the side the mouse came from, the closing one leaves with the other
// target and an outside panel's parent get data-open, data-switch when moving between items, and the open panel's --dropdown-width, -height, -x, -y
let _count = 0;

// offsets ignore transforms, so a panel mid animation still measures right
const _offset = (element, host) => {
    let _x = 0;
    let _y = 0;
    let _element = element;
    for (; _element && _element !== host; _element = _element.offsetParent) {
        _x += _element.offsetLeft;
        _y += _element.offsetTop;
    }
    if (_element) return [_x, _y];

    const _rect = element.getBoundingClientRect();
    const _hostRect = host.getBoundingClientRect();
    return [_rect.left - _hostRect.left, _rect.top - _hostRect.top];
};

// a visibility transition keeps it hidden on the first frame, so it tries again
const _focus = (element) => {
    element?.focus();
    if (element && document.activeElement !== element) requestAnimationFrame(() => requestAnimationFrame(() => element.focus()));
};

export class _dropdown extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.hover = props.hover ?? true;
        this.delay = props.delay ?? 100;
        this.closeDelay = props.closeDelay ?? 300;

        this.items = [];
        this.zones = [];
        this.hosts = [];
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
            const _panel = item.querySelector(".js-dropdown-panel") ?? document.getElementById(_toggle.getAttribute("aria-controls"));

            _panel.id ||= `dropdown-${++_count}`;
            _panel.inert = true;
            _toggle.setAttribute("aria-controls", _panel.id);
            _toggle.setAttribute("aria-expanded", "false");

            return { item, toggle: _toggle, panel: _panel };
        });

        const _outside = this.items.map(({ panel }) => panel).filter((panel) => !this.target.contains(panel));
        this.zones = [this.target, ..._outside];
        this.hosts = [...new Set([this.target, ..._outside.map((panel) => panel.parentElement)])];

        const _on = (type, callback) => this.zones.forEach((zone) => zone.addEventListener(type, callback, { signal }));

        _on("pointerover", (e) => {
            if (!this.hover || e.pointerType !== "mouse") return;
            const _index = this.indexOf(e.target);
            if (_index === this.active) return clearTimeout(this.timer);
            this.later(() => (_index < 0 ? this.close() : this.open(_index, e.clientX)), _index < 0 ? this.closeDelay : this.delay);
        });

        _on("pointerleave", (e) => this.hover && e.pointerType === "mouse" && !this.inside(e.relatedTarget) && this.later(() => this.close(), this.closeDelay));

        _on("click", (e) => {
            if (e.target.closest(".js-dropdown-close")) return this.close(true);

            const _index = this.items.findIndex(({ toggle }) => toggle.contains(e.target));
            if (_index < 0) return;

            const _isLink = this.items[_index].toggle.matches("a[href]");
            const _byHover = this.hover && _fine.matches && e.detail > 0;

            // a link opens on the first tap, goes on the second, with a mouse it just goes
            if (_isLink && (_byHover || this.active === _index)) return;
            e.preventDefault();

            if (_byHover) this.open(_index, e.clientX);
            else this.toggle(_index);
        });

        _on("keydown", (e) => {
            if (e.key === "Escape" && this.active > -1) return this.close(true);

            const _index = this.items.findIndex(({ toggle }) => toggle === e.target);
            if (e.key !== "ArrowDown" || _index < 0) return;

            e.preventDefault();
            this.open(_index);
            _focus(this.items[_index].panel.querySelector("a[href], button, input, select, textarea, [tabindex]"));
        });

        _on("focusin", (e) => this.active > -1 && this.indexOf(e.target) !== this.active && this.close());
        _on("focusout", (e) => e.relatedTarget && !this.inside(e.relatedTarget) && this.close());
        document.addEventListener("pointerdown", (e) => !this.inside(e.target) && this.close(), { signal });

        _event.resize(this._onSize);
    }

    inside(element) {
        return !!element && this.zones.some((zone) => zone.contains(element));
    }

    indexOf(element) {
        return this.items.findIndex(({ item, panel }) => item.contains(element) || panel.contains(element));
    }

    later(callback, delay) {
        clearTimeout(this.timer);
        this.timer = setTimeout(callback, delay);
    }

    toggle(index) {
        this.active === index ? this.close() : this.open(index);
    }

    // x: the mouse x, so the panel comes in from that side of the toggle
    open(index, x = null) {
        clearTimeout(this.timer);
        if (typeof index !== "number") index = this.indexOf(index);
        if (index < 0 || index === this.active) return;

        const _switch = this.active > -1;
        if (_switch) _event.offObserveResize(this._onSize, this.items[this.active].panel);

        const _rect = this.items[index].toggle.getBoundingClientRect();
        const _from = _switch ? (index > this.active ? "left" : "right") : x === null ? null : x < _rect.left + _rect.width / 2 ? "left" : "right";
        this.from(index, _from);
        if (_switch && _from) this.items[this.active].panel.dataset.from = _from === "left" ? "right" : "left";

        this.active = index;
        this.update();
        this.hosts.forEach((host) => {
            host.toggleAttribute("data-switch", _switch);
            host.setAttribute("data-open", "");
        });
        _event.observeResize(this._onSize, this.items[index].panel);

        if (!_switch) this.emit("open");
        this.emit("change");
    }

    // focus: true puts focus back on the toggle if it was in the panel, e.g. a back button
    close(focus = false) {
        clearTimeout(this.timer);
        if (this.active < 0) return;

        const { item, toggle, panel } = this.items[this.active];
        const _hadFocus = focus && (item.contains(document.activeElement) || panel.contains(document.activeElement));

        _event.offObserveResize(this._onSize, panel);
        this.active = -1;
        this.update();
        this.hosts.forEach((host) => {
            host.removeAttribute("data-open");
            host.removeAttribute("data-switch");
        });
        if (_hadFocus) _focus(toggle);

        this.emit("close");
        this.emit("change");
    }

    // the start side, set without a transition so it doesn't slide there first
    from(index, side) {
        const { panel } = this.items[index];
        panel.style.transition = "none";
        if (side) panel.dataset.from = side;
        else panel.removeAttribute("data-from");
        panel.offsetWidth;
        panel.style.transition = "";
    }

    update() {
        this.items.forEach(({ item, toggle, panel }, index) => {
            const _open = index === this.active;
            item.toggleAttribute("data-open", _open);
            panel.toggleAttribute("data-open", _open);
            panel.inert = !_open;
            toggle.setAttribute("aria-expanded", String(_open));

            if (_open) panel.removeAttribute("data-from");
            if (this.active < 0 || _open) panel.removeAttribute("data-side");
            else panel.dataset.side = index < this.active ? "before" : "after";
        });
    }

    vars() {
        const _panel = this.items[this.active]?.panel;
        if (!_panel) return;

        this.hosts.forEach((host) => {
            const [_x, _y] = _offset(_panel, host);
            host.style.setProperty("--dropdown-width", `${_panel.offsetWidth}px`);
            host.style.setProperty("--dropdown-height", `${_panel.offsetHeight}px`);
            host.style.setProperty("--dropdown-x", `${_x}px`);
            host.style.setProperty("--dropdown-y", `${_y}px`);
        });
    }

    destroy() {
        this.close();
        this.abort.abort();
        _event.offResize(this._onSize);
        this.items.forEach(({ panel }) => (panel.inert = false));
    }
}
