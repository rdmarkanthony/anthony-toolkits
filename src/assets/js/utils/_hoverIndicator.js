import { _emitter } from "./_emitter";
import { _event } from "./_event";

// usage: new _hoverIndicator({ target, items: "a", active: ".js-tabs-active", hover: true, events })
// target holds the items and a .js-hover-indicator, styled with --x --y --w --h of the item
// goes to the hovered or focused item, else the active one, that item gets [data-indicator]
export class _hoverIndicator extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.selector = props.items ?? "a";
        this.active = props.active ?? null;
        this.hover = props.hover ?? true;

        this.items = [];
        this.indicator = null;
        this.item = null;
        this.hovered = null;
        this.focused = null;

        this.abort = new AbortController();
        this.observer = null;
        this.resize = () => this.update(true);
        this.created = false;
        this.positioned = false;

        if (this.target) this.init();
    }

    init() {
        const _on = (type, callback) => this.target.addEventListener(type, callback, { signal: this.abort.signal });

        this.items = [...this.target.querySelectorAll(this.selector)];

        this.indicator = this.target.querySelector(":scope > .js-hover-indicator");
        if (!this.indicator) {
            this.created = true;
            this.indicator = document.createElement("div");
            this.indicator.className = "js-hover-indicator";
            Object.assign(this.indicator.style, { position: "absolute", top: "0", left: "0", zIndex: "-1", width: "var(--w)", height: "var(--h)", translate: "var(--x) var(--y)", transitionDuration: "0.3s" });
            this.target.prepend(this.indicator);
        }

        if (getComputedStyle(this.target).position === "static") {
            this.positioned = true;
            this.target.style.position = "relative";
        }

        Object.assign(this.indicator.style, { pointerEvents: "none", transitionProperty: "none", opacity: "0" });
        this.indicator.offsetWidth;
        this.indicator.setAttribute("aria-hidden", "true");

        if (this.hover) {
            _on("pointerover", (e) => {
                const _item = e.pointerType !== "touch" && this.itemOf(e.target);
                if (!_item) return;

                this.hovered = _item;
                this.update();
            });

            _on("pointerleave", () => {
                this.hovered = null;
                this.update();
            });
        }

        _on("focusin", (e) => {
            if (!e.target.matches(":focus-visible")) return;

            this.focused = this.itemOf(e.target);
            this.update();
        });

        _on("focusout", (e) => {
            if (this.target.contains(e.relatedTarget)) return;

            this.focused = null;
            this.update();
        });

        _on("change", () => this.update());
        this.observer = new MutationObserver(() => this.update());
        this.observer.observe(this.target, { subtree: true, attributes: true, attributeFilter: ["class", "aria-current", "aria-selected", "aria-expanded"] });

        [this.target, ...this.items].forEach((element) => _event.observeResize(this.resize, element));
    }

    itemOf(element) {
        return this.items.find((item) => item.contains(element)) ?? null;
    }

    current() {
        return (this.active && this.items.find((item) => item.matches(this.active))) || null;
    }

    update(snap = false) {
        const _item = this.hovered ?? this.focused ?? this.current();

        const _shown = this.item || (_item && Number(getComputedStyle(this.indicator).opacity) > 0);
        const _slide = !snap && _shown && _item && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        this.indicator.style.transitionProperty = _slide ? "opacity, transform, translate, width, height" : "opacity";
        this.indicator.style.opacity = _item ? "1" : "0";

        if (_item) {
            const _box = this.target.getBoundingClientRect();
            const _rect = _item.getBoundingClientRect();

            this.indicator.style.setProperty("--x", `${_rect.left - _box.left - this.target.clientLeft + this.target.scrollLeft}px`);
            this.indicator.style.setProperty("--y", `${_rect.top - _box.top - this.target.clientTop + this.target.scrollTop}px`);
            this.indicator.style.setProperty("--w", `${_rect.width}px`);
            this.indicator.style.setProperty("--h", `${_rect.height}px`);
        }

        if (_item === this.item) return;

        this.item?.removeAttribute("data-indicator");
        _item?.setAttribute("data-indicator", "");
        this.item = _item;

        this.emit("change");
    }

    destroy() {
        this.abort.abort();
        this.observer?.disconnect();
        [this.target, ...this.items].forEach((element) => _event.offObserveResize(this.resize, element));

        this.item?.removeAttribute("data-indicator");
        if (this.positioned) this.target.style.removeProperty("position");

        if (this.created) return this.indicator.remove();
        ["opacity", "pointer-events", "transition-property", "--x", "--y", "--w", "--h"].forEach((name) => this.indicator.style.removeProperty(name));
        this.indicator.removeAttribute("aria-hidden");
    }
}
