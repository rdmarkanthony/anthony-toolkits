import { _emitter } from "./_emitter";

// usage: const toast = _toast.show("Saved", { type, duration, action, place, class, events }), then toast.update() or toast.close()
// type: "success" | "error" | "loading", duration ms (0 stays), action: { label, onClick(toast) }, events: { close }
// _toast.promise(promise, { loading, success, error }) shows loading, then done or failed, resolves to the result
// pauses on hover and focus, swipe sideways to close, the newest _toast.max stay on screen
const _easing = "cubic-bezier(0.22, 1, 0.36, 1)";
const _stacks = {};
const _live = {};

const _reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const _isTop = (place) => place.startsWith("top");

// slides the others to their new spot when one is added or removed
const _flip = (stack, change) => {
    const _items = [...stack.children];
    const _before = _items.map((item) => item.getBoundingClientRect().top);
    change();
    if (_reduce()) return;

    _items.forEach((item, index) => {
        const _delta = item.isConnected && _before[index] - item.getBoundingClientRect().top;
        if (_delta) item.animate({ translate: [`0 ${_delta}px`, "0 0"] }, { duration: 300, easing: _easing, composite: "add" });
    });
};

const _stack = (place) => {
    if (!_live.polite) {
        ["polite", "assertive"].forEach((level) => {
            _live[level] = document.createElement("div");
            _live[level].className = "sr-only";
            _live[level].setAttribute("aria-live", level);
            document.body.append(_live[level]);
        });

        document.addEventListener("visibilitychange", () => _toast.items.forEach((toast) => (document.hidden ? toast.pause() : toast.resume())));
    }

    if (!_stacks[place]) {
        const _el = document.createElement("section");
        _el.popover = "manual";
        _el.setAttribute("aria-label", "Notifications");
        _el.className = `${_toast.classes.stack} ${_toast.classes.places[place] ?? ""}`;

        const _each = (callback) => _toast.items.forEach((toast) => toast.place === place && callback(toast));
        _el.addEventListener("pointerenter", () => _each((toast) => toast.pause()));
        _el.addEventListener("pointerleave", () => !_el.contains(document.activeElement) && _each((toast) => toast.resume()));
        _el.addEventListener("focusin", () => _each((toast) => toast.pause()));
        _el.addEventListener("focusout", (e) => !_el.contains(e.relatedTarget) && !_el.matches(":hover") && _each((toast) => toast.resume()));

        document.body.append(_el);
        _stacks[place] = _el;
    }

    // shown again so it sits above a dialog opened after it
    const _el = _stacks[place];
    if (_el.matches(":popover-open")) _el.hidePopover();
    _el.showPopover();

    return _el;
};

class _toastItem extends _emitter {
    constructor(text, options = {}) {
        super(options.events);

        this.place = _toast.classes.places[options.place] ? options.place : _toast.place;
        this.class = options.class;
        this.timer = null;
        this.left = 0;
        this.closed = false;

        this.el = document.createElement("div");
        this.el.className = this.class || _toast.classes.toast;
        this.el.innerHTML = `<span data-toast-icon></span><p class="${_toast.classes.text}"></p><button class="${_toast.classes.action}" type="button" hidden></button><button class="${_toast.classes.close}" type="button" aria-label="Close">${_toast.icons.close}</button>`;
        [this.icon, this.text, this.action, this.closeButton] = this.el.children;

        this.action.addEventListener("click", () => this.onAction?.(this));
        this.closeButton.addEventListener("click", () => this.close());
        this.swipe();

        const _el = _stack(this.place);
        _flip(_el, () => (_isTop(this.place) ? _el.prepend(this.el) : _el.append(this.el)));
        if (!_reduce()) this.el.animate({ opacity: [0, 1], translate: [_isTop(this.place) ? "0 -1rem" : "0 1rem", "0 0"] }, { duration: 400, easing: _easing });

        _toast.items.push(this);
        this.update(text, options);

        _toast.items.filter((toast) => toast.place === this.place).slice(0, -_toast.max).forEach((toast) => toast.close());
    }

    // options: type, duration, action, a new type without a duration gets the default one
    update(text, options = {}) {
        if (this.closed) return this;

        const _type = options.type ?? this.type ?? "info";
        this.type = _type;
        this.el.dataset.type = _type;
        this.icon.className = _toast.classes.icon;
        this.icon.innerHTML = _toast.icons[_type] ?? "";
        this.icon.hidden = !this.icon.innerHTML;
        this.text.textContent = text;

        if ("action" in options) {
            this.onAction = options.action?.onClick;
            this.action.textContent = options.action?.label ?? "";
            this.action.hidden = !options.action;
        }

        const _region = _live[_type === "error" ? "assertive" : "polite"];
        _region.textContent = "";
        requestAnimationFrame(() => (_region.textContent = text));

        this.left = options.duration ?? (_type === "loading" ? 0 : _toast.duration);
        clearTimeout(this.timer);
        this.timer = null;
        if (!this.el.parentElement.matches(":hover, :focus-within") && !document.hidden) this.resume();

        return this;
    }

    pause() {
        if (!this.timer) return;
        clearTimeout(this.timer);
        this.timer = null;
        this.left = Math.max(this.left - (performance.now() - this.started), 1000);
    }

    resume() {
        if (this.timer || !this.left || this.closed) return;
        this.started = performance.now();
        this.timer = setTimeout(() => this.close(), this.left);
    }

    swipe() {
        let _start = null;
        let _x = 0;

        this.el.addEventListener("pointerdown", (e) => {
            if (e.button || e.target.closest("button")) return;
            _start = e.clientX;
            this.el.setPointerCapture(e.pointerId);
        });

        this.el.addEventListener("pointermove", (e) => {
            if (_start === null) return;
            _x = e.clientX - _start;
            this.el.style.translate = `${_x}px 0`;
            this.el.style.opacity = 1 - Math.min(Math.abs(_x) / 200, 0.6);
        });

        const _end = () => {
            if (_start === null) return;
            _start = null;
            if (Math.abs(_x) > 60) return this.close(_x);

            this.el.animate({ translate: [`${_x}px 0`, "0 0"], opacity: [this.el.style.opacity, 1] }, { duration: 250, easing: _easing });
            this.el.style.translate = this.el.style.opacity = "";
            _x = 0;
        };

        this.el.addEventListener("pointerup", _end);
        this.el.addEventListener("pointercancel", _end);
    }

    // x: where a swipe left it, so it keeps going that way
    async close(x = 0) {
        if (this.closed) return;
        this.closed = true;
        clearTimeout(this.timer);
        _toast.items.splice(_toast.items.indexOf(this), 1);

        const _el = this.el.parentElement;
        if (_el.contains(document.activeElement)) document.activeElement.blur();

        if (!_reduce()) {
            const _to = x ? `${Math.sign(x) * 120 + x}px 0` : this.el.style.translate || "0 0";
            await this.el.animate({ opacity: [getComputedStyle(this.el).opacity, 0], translate: [this.el.style.translate || "0 0", _to], scale: [1, x ? 1 : 0.95] }, { duration: 200, easing: "ease-in", fill: "forwards" }).finished;
        }

        _flip(_el, () => this.el.remove());
        this.emit("close");
    }
}

export const _toast = {
    // override with Object.assign(_toast.classes, {...}), the toast gets data-type
    classes: {
        stack: "pointer-events-none fixed inset-auto m-0 flex w-[min(100%-2rem,24rem)] flex-col gap-2 overflow-visible border-0 bg-transparent p-0",
        places: {
            "top-left": "top-4 left-4",
            top: "top-4 left-1/2 -translate-x-1/2",
            "top-right": "top-4 right-4",
            "bottom-left": "bottom-4 left-4",
            bottom: "bottom-4 left-1/2 -translate-x-1/2",
            "bottom-right": "right-4 bottom-4",
        },
        toast: "pointer-events-auto flex touch-pan-y items-center gap-3 rounded-xl bg-gray-950 py-3 pr-3 pl-4 text-sm text-white shadow-lg select-none",
        icon: "grid size-5 shrink-0 place-items-center in-data-[type=error]:text-red-400 in-data-[type=success]:text-emerald-400",
        text: "flex-1",
        action: "shrink-0 rounded-md bg-current/10 px-2.5 py-1 font-semibold transition-colors hover:bg-current/20",
        close: "grid size-6 shrink-0 place-items-center rounded-full opacity-60 transition hover:bg-current/10 hover:opacity-100",
    },

    icons: {
        success: `<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>`,
        error: `<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>`,
        loading: `<svg class="size-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9" /></svg>`,
        close: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>`,
    },

    place: "bottom-right",
    duration: 4000,
    max: 3,
    items: [],

    show(text, options) {
        return new _toastItem(text, options);
    },

    // messages can be functions: success: (result) => `Saved ${result.name}`, error: (error) => error.message
    async promise(promise, messages = {}, options = {}) {
        const _item = _toast.show(messages.loading ?? "Loading", { ...options, type: "loading" });
        const _text = (message, value, fallback) => (typeof message === "function" ? message(value) : (message ?? fallback));

        try {
            const _result = await (typeof promise === "function" ? promise() : promise);
            _item.update(_text(messages.success, _result, "Done"), { type: "success" });
            return _result;
        } catch (error) {
            _item.update(_text(messages.error, error, "Something went wrong"), { type: "error" });
        }
    },

    clear() {
        [..._toast.items].forEach((toast) => toast.close());
    },
};
