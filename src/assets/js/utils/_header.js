import { _emitter } from "./_emitter";
import { _event } from "./_event";

// usage: new _header({ target, menu, offset, tolerance, breakpoint, events })
// at the top target scrolls with the page (absolute), past offset (default its height) it gets data-fixed + data-hidden, scroll up removes data-hidden
// body gets --header-height and --header-offset (the part of the screen it covers now), elements above it are fine
// menu (default target .js-header-menu) gets data-open, .js-header-menu-toggle buttons open/close it, .js-header-menu-close and its links close it
// while open: the rest of the page is inert, the page is locked, Esc closes
const _skip = ["SCRIPT", "STYLE", "TEMPLATE", "LINK"];

export class _header extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.menu = props.menu ?? this.target?.querySelector(".js-header-menu") ?? null;
        this.offset = props.offset ?? null;
        this.tolerance = props.tolerance ?? 8;
        this.breakpoint = props.breakpoint ?? null;

        this.isFixed = false;
        this.isHidden = false;
        this.isOpen = false;
        this.toggles = [];
        this.inerts = [];
        this.lastY = 0;
        this.top = 0;
        this.height = null;
        this.visible = null;
        this.abort = new AbortController();

        if (this.target) this.init();
    }

    init() {
        const { signal } = this.abort;

        this.lastY = window.scrollY;
        this._onCheck = () => this.check();
        _event.scroll(this._onCheck);

        _event.observeResize(this._onCheck, this.target);
        _event.observeResize(this._onCheck, document.body);

        this.target.addEventListener("focusin", () => this.target.querySelector(":focus-visible") && this.show(), { signal });

        if (!this.menu) return;

        this.toggles = [...document.querySelectorAll(".js-header-menu-toggle")].filter((item) => this.target.contains(item) || this.menu.contains(item));
        this.menu.id ||= `header-menu-${Math.random().toString(36).slice(2, 8)}`;
        this.toggles.forEach((item) => {
            item.setAttribute("aria-controls", this.menu.id);
            item.setAttribute("aria-expanded", "false");
            item.addEventListener("click", () => this.toggle(), { signal });
        });

        this.menu.addEventListener("click", (e) => e.target.closest(".js-header-menu-close, a") && this.close(), { signal });
        document.addEventListener("keydown", (e) => e.key === "Escape" && !e.defaultPrevented && this.close(), { signal });

        if (this.breakpoint) {
            const _media = window.matchMedia(`(min-width: ${this.breakpoint}px)`);
            _media.addEventListener("change", (e) => e.matches && this.close(), { signal });
        }
    }

    check() {
        if (this.isOpen) return this.vars();

        const _y = Math.max(0, window.scrollY);
        const _delta = _y - this.lastY;
        const _height = this.target.offsetHeight;

        if (!this.isFixed) this.top = this.pageTop();
        const _offset = this.top + (this.offset ?? _height);

        if (_y <= this.top || (_y <= _offset && this.isHidden)) this.unfix();
        else if (_y > _offset && !this.isFixed) this.fix();
        else if (_y > _offset && Math.abs(_delta) >= this.tolerance) {
            if (_delta > 0 && !this.target.querySelector(":focus-visible")) this.hide();
            else if (_delta < 0) this.show();
        } else if (_y > _offset) return this.vars();

        this.lastY = _y;
        this.vars();
    }

    pageTop() {
        let _top = 0;
        for (let _element = this.target; _element; _element = _element.offsetParent) _top += _element.offsetTop;
        return _top;
    }

    vars() {
        const _height = this.target.offsetHeight;
        const _offset = this.isFixed ? (this.isHidden ? 0 : _height) : Math.max(0, Math.round(this.top + _height - window.scrollY));

        if (_height !== this.height) document.body.style.setProperty("--header-height", `${_height}px`);
        if (_offset !== this.visible) document.body.style.setProperty("--header-offset", `${_offset}px`);
        this.height = _height;
        this.visible = _offset;
    }

    instant(callback) {
        this.target.style.transition = "none";
        callback();
        this.target.offsetHeight;
        this.target.style.transition = "";
    }

    fix() {
        this.isFixed = true;
        this.isHidden = true;
        this.instant(() => {
            this.target.setAttribute("data-fixed", "");
            this.target.setAttribute("data-hidden", "");
        });
        this.emit("fix");
    }

    unfix() {
        if (!this.isFixed) return;

        const _apply = () => {
            this.target.removeAttribute("data-fixed");
            this.target.removeAttribute("data-hidden");
        };

        this.isHidden ? this.instant(_apply) : _apply();
        this.isFixed = false;
        this.isHidden = false;
        this.emit("unfix");
    }

    show() {
        if (!this.isHidden) return;
        this.isHidden = false;
        this.target.removeAttribute("data-hidden");
        this.vars();
        this.emit("show");
    }

    hide() {
        if (!this.isFixed || this.isHidden) return;
        this.isHidden = true;
        this.target.setAttribute("data-hidden", "");
        this.vars();
        this.emit("hide");
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        if (!this.menu || this.isOpen) return;
        this.isOpen = true;
        this.show();

        this.menu.setAttribute("data-open", "");
        this.target.setAttribute("data-menu-open", "");
        this.toggles.forEach((item) => item.setAttribute("aria-expanded", "true"));
        document.documentElement.style.overflow = "hidden";
        this.inertOutside();

        if (!this.menu.hasAttribute("tabindex")) this.menu.tabIndex = -1;
        this.menu.focus({ preventScroll: true });

        this.emit("open");
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        const _hadFocus = this.menu.contains(document.activeElement);

        this.menu.removeAttribute("data-open");
        this.target.removeAttribute("data-menu-open");
        this.toggles.forEach((item) => item.setAttribute("aria-expanded", "false"));
        document.documentElement.style.overflow = "";
        this.inerts.forEach((item) => (item.inert = false));
        this.inerts = [];

        if (_hadFocus) this.toggles.find((item) => this.target.contains(item))?.focus({ preventScroll: true });
        this.lastY = window.scrollY;

        this.emit("close");
    }

    inertOutside() {
        const _keep = [this.menu, ...this.toggles];

        const _walk = (parent) => {
            [...parent.children].forEach((child) => {
                if (_keep.includes(child)) return;
                if (_keep.some((item) => child.contains(item))) return _walk(child);
                if (child.inert || _skip.includes(child.tagName)) return;

                child.inert = true;
                this.inerts.push(child);
            });
        };

        _walk(document.body);
    }

    destroy() {
        this.close();
        this.abort.abort();
        _event.offScroll(this._onCheck);
        _event.offObserveResize(this._onCheck, this.target);
        _event.offObserveResize(this._onCheck, document.body);
        document.body.style.removeProperty("--header-height");
        document.body.style.removeProperty("--header-offset");
        this.height = this.visible = null;
        this.target.removeAttribute("data-fixed");
        this.target.removeAttribute("data-hidden");
    }
}
