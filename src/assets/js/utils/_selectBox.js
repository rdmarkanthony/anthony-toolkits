import { _emitter } from "./_emitter";
import { _filter } from "./_filter";

// usage: new _selectBox({ target, search, render, label, classes, nativeOnTouch, events }), target is a single <select>
// the native select keeps the value, read it like any field
// classes: override with Object.assign(_selectBox.classes, {...})
// placeholder: <option value="" disabled selected hidden>Choose</option>
const _instances = new WeakMap();
let _count = 0;

export class _selectBox extends _emitter {
    static classes = {
        box: "w-full",
        button: "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 text-left transition-colors duration-200 hover:border-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-950 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-600 data-placeholder:text-gray-400",
        label: "truncate",
        icon: "shrink-0 transition-transform duration-200 [.is-active_&]:rotate-180",
        dropdown: "rounded-md border border-gray-200 bg-white p-1 shadow-lg",
        search: "mb-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-gray-950",
        list: "max-h-64 overflow-auto",
        group: "px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase",
        option: "cursor-pointer rounded px-3 py-2 data-active:bg-gray-100 aria-selected:font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-40",
        empty: "px-3 py-2 text-gray-500",
    };

    static get(target) {
        const _target = typeof target === "string" ? document.querySelector(target) : target;
        return _target ? _instances.get(_target) : undefined;
    }

    constructor(props) {
        super(props.events);

        this.target = typeof props.target === "string" ? document.querySelector(props.target) : props.target;
        if (!this.target) return;

        if (_instances.has(this.target)) return _instances.get(this.target);

        if (this.target.multiple) {
            console.warn("_selectBox: multiple selects aren't supported, use a plugin like Tom Select", this.target);
            return;
        }

        this.search = props.search ?? false;
        this.render = props.render ?? null;
        this.label = props.label ?? props.render ?? null;
        this.classes = { ..._selectBox.classes, ...props.classes };
        this.native = (props.nativeOnTouch ?? false) && window.matchMedia("(pointer: coarse)").matches;

        this.id = `select-box-${++_count}`;
        this.el = { box: null, button: null, label: null, dropdown: null, search: null, list: null, empty: null };
        this.items = [];
        this.activeIndex = -1;
        this.active = false;
        this.typed = "";

        _instances.set(this.target, this);
        this.init();
    }

    init() {
        this.style();

        this.el.box = this.create("div", "box");
        this.el.box.classList.add("js-select-box");
        this.el.box.classList.toggle("is-native", this.native);
        this.target.before(this.el.box);
        this.el.box.append(this.target);
        if (!this.native) this.target.tabIndex = -1;

        this.el.button = this.create("button", "button");
        this.el.button.type = "button";
        this.el.button.classList.add("js-select-box-button");
        this.el.button.setAttribute("role", "combobox");
        this.el.button.setAttribute("aria-haspopup", "listbox");
        this.el.button.setAttribute("aria-expanded", "false");
        this.el.button.setAttribute("aria-controls", `${this.id}-list`);
        if (this.native) {
            this.el.button.tabIndex = -1;
            this.el.button.setAttribute("aria-hidden", "true");
        }

        this.el.label = this.create("span", "label");
        this.el.button.append(this.el.label);
        this.el.button.insertAdjacentHTML("beforeend", `<svg class="${this.classes.icon}" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

        this.el.dropdown = this.create("div", "dropdown");
        this.el.dropdown.classList.add("js-select-box-dropdown");

        if (this.search) {
            this.el.search = this.create("input", "search");
            this.el.search.type = "search";
            this.el.search.placeholder = typeof this.search === "string" ? this.search : "Search";
            this.el.search.setAttribute("aria-label", this.el.search.placeholder);
            this.el.search.setAttribute("aria-controls", `${this.id}-list`);
            this.el.search.setAttribute("autocomplete", "off");
            this.el.dropdown.append(this.el.search);
        }

        this.el.list = this.create("div", "list");
        this.el.list.id = `${this.id}-list`;
        this.el.list.tabIndex = -1;
        this.el.list.setAttribute("role", "listbox");
        this.el.dropdown.append(this.el.list);

        this.el.empty = this.create("div", "empty");
        this.el.empty.textContent = "No results";
        this.el.empty.hidden = true;
        this.el.dropdown.append(this.el.empty);

        this.el.box.append(this.el.button, this.el.dropdown);

        this.labelBy();
        this.listen();
        this.refresh();

        this.emit("init");
    }

    create(tag, key) {
        const _el = document.createElement(tag);
        _el.className = this.classes[key] ?? "";
        return _el;
    }

    labelBy() {
        const _label = this.target.id && document.querySelector(`label[for="${CSS.escape(this.target.id)}"]`);

        if (_label && !this.native) {
            if (!_label.id) _label.id = `${this.id}-label`;
            this.el.button.setAttribute("aria-labelledby", _label.id);
            this.el.list.setAttribute("aria-labelledby", _label.id);

            this.onLabelClick = (e) => {
                e.preventDefault();
                this.el.button.focus();
            };
            this.labelEl = _label;
            _label.addEventListener("click", this.onLabelClick);
        } else if (this.target.getAttribute("aria-label") && !this.native) {
            this.el.button.setAttribute("aria-label", this.target.getAttribute("aria-label"));
            this.el.list.setAttribute("aria-label", this.target.getAttribute("aria-label"));
        }
    }

    listen() {
        this.onButtonClick = () => (this.active ? this.hide() : this.show());
        this.onKeydown = (e) => this.keydown(e);
        this.onKeyup = (e) => e.key === " " && e.preventDefault();
        this.onSearch = () => this.filter();
        this.onListClick = (e) => {
            const _index = this.items.findIndex((item) => item.el.contains(e.target));
            if (_index > -1) this.pick(_index);
        };
        this.onListMove = (e) => {
            const _index = this.items.findIndex((item) => item.el.contains(e.target));
            if (_index > -1 && _index !== this.activeIndex) this.highlight(_index, false);
        };
        this.onFocusout = (e) => this.active && !this.el.box.contains(e.relatedTarget) && this.hide();
        this.onOutsideClick = (e) => this.active && !this.el.box.contains(e.target) && this.hide();
        this.onChange = () => {
            this.update();
            this.emit("change");
        };
        this.onReset = () => setTimeout(() => this.update());
        this.onInvalid = () => this.el.button.setAttribute("aria-invalid", "true");
        this.observer = new MutationObserver(() => this.refresh());

        this.el.button.addEventListener("click", this.onButtonClick);
        this.el.button.addEventListener("keydown", this.onKeydown);
        this.el.button.addEventListener("keyup", this.onKeyup);
        this.el.search?.addEventListener("keydown", this.onKeydown);
        this.el.search?.addEventListener("input", this.onSearch);
        this.el.list.addEventListener("click", this.onListClick);
        this.el.list.addEventListener("pointermove", this.onListMove);
        this.el.box.addEventListener("focusout", this.onFocusout);
        document.addEventListener("click", this.onOutsideClick);
        this.target.addEventListener("change", this.onChange);
        this.target.addEventListener("invalid", this.onInvalid);
        this.target.form?.addEventListener("reset", this.onReset);
        this.observer.observe(this.target, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["disabled", "hidden", "label"] });
    }

    refresh() {
        this.items = [];
        this.el.list.innerHTML = "";

        [...this.target.children].forEach((child) => {
            if (child.localName === "option") return this.addOption(child, this.el.list);
            if (child.localName !== "optgroup") return;

            const _group = document.createElement("div");
            _group.setAttribute("role", "group");

            const _title = this.create("div", "group");
            _title.id = `${this.id}-group-${this.el.list.children.length}`;
            _title.setAttribute("role", "presentation");
            _title.textContent = child.label;
            _group.setAttribute("aria-labelledby", _title.id);
            _group.append(_title);

            [...child.children].forEach((option) => this.addOption(option, _group, child.disabled));
            if (_group.children.length > 1) this.el.list.append(_group);
        });

        this.el.button.disabled = this.target.disabled;
        if (this.target.disabled) this.hide();

        this.update();
        if (this.search) this.filter();
    }

    addOption(option, parent, disabled = false) {
        if (option.hidden) return;

        const _el = this.create("div", "option");
        _el.id = `${this.id}-option-${this.items.length}`;
        _el.setAttribute("role", "option");
        _el.setAttribute("aria-selected", "false");
        if (option.disabled || disabled) _el.setAttribute("aria-disabled", "true");

        if (this.render) _el.innerHTML = this.render(option);
        else _el.textContent = option.text;

        this.items.push({ option, el: _el });
        parent.append(_el);
    }

    update() {
        const _option = this.target.selectedOptions[0];

        if (_option) {
            if (this.label) this.el.label.innerHTML = this.label(_option);
            else this.el.label.textContent = _option.text;
        } else {
            this.el.label.textContent = "";
        }

        this.el.button.toggleAttribute("data-placeholder", !_option || _option.value === "");
        if (this.target.validity.valid) this.el.button.removeAttribute("aria-invalid");

        this.items.forEach((item) => item.el.setAttribute("aria-selected", String(item.option === _option)));
    }

    get value() {
        return this.target.value;
    }

    set value(value) {
        const _before = this.target.value;
        this.target.value = value;
        this.update();
        if (this.target.value !== _before) this.changed();
    }

    changed() {
        this.target.dispatchEvent(new Event("input", { bubbles: true }));
        this.target.dispatchEvent(new Event("change", { bubbles: true }));
    }

    pick(index) {
        const _item = this.items[index];
        if (!_item || this.isDisabled(_item)) return;

        const _changed = !_item.option.selected;
        _item.option.selected = true;
        this.update();
        this.hide();
        this.el.button.focus();

        if (_changed) this.changed();
    }

    isDisabled(item) {
        return item.el.getAttribute("aria-disabled") === "true";
    }

    isVisible(item) {
        return !item.el.hidden;
    }

    show() {
        if (this.active || this.target.disabled || this.native) return;
        this.active = true;

        this.el.box.classList.add("is-active");
        this.el.button.setAttribute("aria-expanded", "true");

        const _box = this.el.box.getBoundingClientRect();
        const _height = this.el.dropdown.offsetHeight;
        const _below = window.innerHeight - _box.bottom;
        this.el.box.classList.toggle("is-above", _below < _height + 16 && _box.top > _below);

        this.highlight(this.items.findIndex((item) => item.option.selected));
        if (this.el.search) this.el.search.focus();

        this.emit("show");
    }

    hide() {
        if (!this.active) return;
        this.active = false;

        this.el.box.classList.remove("is-active");
        this.el.button.setAttribute("aria-expanded", "false");
        this.highlight(-1);

        if (this.el.search?.value) {
            this.el.search.value = "";
            this.filter();
        }
        if (this.el.box.contains(document.activeElement) && document.activeElement !== this.el.button) this.el.button.focus();

        this.emit("hide");
    }

    highlight(index, scroll = true) {
        this.activeIndex = index;
        const _item = this.items[index];

        this.items.forEach((item, i) => item.el.toggleAttribute("data-active", i === index));

        [this.el.button, this.el.search].forEach((el) => {
            if (!el) return;
            if (_item) el.setAttribute("aria-activedescendant", _item.el.id);
            else el.removeAttribute("aria-activedescendant");
        });

        if (_item && scroll) {
            const _list = this.el.list;
            const _top = _item.el.offsetTop - _list.offsetTop;
            const _bottom = _top + _item.el.offsetHeight;

            if (_top < _list.scrollTop) _list.scrollTop = _top;
            else if (_bottom > _list.scrollTop + _list.clientHeight) _list.scrollTop = _bottom - _list.clientHeight;
        }
    }

    step(from, direction, count = 1) {
        let _index = from;
        let _found = from;

        while (count > 0) {
            _index += direction;
            const _item = this.items[_index];
            if (!_item) break;
            if (!this.isVisible(_item) || this.isDisabled(_item)) continue;

            _found = _index;
            count--;
        }

        return _found;
    }

    keydown(e) {
        const _inSearch = e.target === this.el.search;
        const _last = this.items.length;

        if (!this.active) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
                e.preventDefault();
                this.show();
            } else if (e.key === "Home" || e.key === "End") {
                e.preventDefault();
                this.show();
                this.highlight(e.key === "Home" ? this.step(-1, 1) : this.step(_last, -1));
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                this.show();
                this.typeahead(e.key);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                this.highlight(this.step(this.activeIndex, 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                this.highlight(this.step(this.activeIndex === -1 ? _last : this.activeIndex, -1));
                break;
            case "PageDown":
                e.preventDefault();
                this.highlight(this.step(this.activeIndex, 1, 10));
                break;
            case "PageUp":
                e.preventDefault();
                this.highlight(this.step(this.activeIndex === -1 ? _last : this.activeIndex, -1, 10));
                break;
            case "Home":
            case "End":
                if (_inSearch) break;
                e.preventDefault();
                this.highlight(e.key === "Home" ? this.step(-1, 1) : this.step(_last, -1));
                break;
            case "Enter":
                e.preventDefault();
                this.activeIndex > -1 ? this.pick(this.activeIndex) : this.hide();
                break;
            case " ":
                if (_inSearch) break;
                e.preventDefault();
                this.pick(this.activeIndex);
                break;
            case "Escape":
                e.preventDefault();
                e.stopPropagation();
                this.hide();
                break;
            case "Tab":
                this.hide();
                break;
            default:
                if (!_inSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) this.typeahead(e.key);
        }
    }

    typeahead(key) {
        clearTimeout(this.typedTimer);
        this.typedTimer = setTimeout(() => (this.typed = ""), 500);

        this.typed = this.typed === key ? key : this.typed + key;
        const _typed = this.typed.toLowerCase();

        const _order = [...this.items.keys()];
        const _start = this.typed.length === 1 ? this.activeIndex + 1 : Math.max(this.activeIndex, 0);
        const _index = [..._order.slice(_start), ..._order.slice(0, _start)].find((i) => {
            const _item = this.items[i];
            return !this.isDisabled(_item) && _item.option.text.trim().toLowerCase().startsWith(_typed);
        });

        if (_index !== undefined) this.highlight(_index);
    }

    filter() {
        const _query = this.el.search.value;
        let _total = 0;

        this.items.forEach((item) => {
            const _match = _filter.match(item.option.text, _query);
            item.el.hidden = !_match;
            if (_match) _total++;
        });

        this.el.list.querySelectorAll("[role=group]").forEach((group) => {
            group.hidden = !group.querySelector("[role=option]:not([hidden])");
        });

        this.el.empty.hidden = _total > 0;

        if (!this.active) return;
        const _current = this.items[this.activeIndex];
        if (!_current || !this.isVisible(_current)) this.highlight(this.step(-1, 1));
    }

    destroy() {
        if (!this.el.box) return;

        this.hide();
        this.observer.disconnect();
        clearTimeout(this.typedTimer);

        document.removeEventListener("click", this.onOutsideClick);
        this.target.removeEventListener("change", this.onChange);
        this.target.removeEventListener("invalid", this.onInvalid);
        this.target.form?.removeEventListener("reset", this.onReset);
        this.labelEl?.removeEventListener("click", this.onLabelClick);

        this.target.removeAttribute("tabindex");
        this.el.box.before(this.target);
        this.el.box.remove();
        this.el.box = null;

        _instances.delete(this.target);
    }

    style() {
        if (document.querySelector(".js-select-box-style")) return;

        const _style = document.createElement("style");
        _style.classList.add("js-select-box-style");
        _style.innerHTML =
            `.js-select-box { position: relative; }` +
            `.js-select-box > select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; }` +
            // nativeOnTouch: the select on top opens the phone's picker
            `.js-select-box.is-native > select { z-index: 2; pointer-events: auto; }` +
            `.js-select-box-dropdown { position: absolute; z-index: 50; top: calc(100% + 0.5rem); left: 0; min-width: 100%; visibility: hidden; opacity: 0; transform: scale(0.95); transform-origin: 50% 0; transition: opacity 0.15s ease-out, transform 0.2s cubic-bezier(0.5, 0, 0, 1.25), visibility 0s 0.2s; }` +
            `.js-select-box.is-above .js-select-box-dropdown { top: auto; bottom: calc(100% + 0.5rem); transform-origin: 50% 100%; }` +
            `.js-select-box.is-active .js-select-box-dropdown { visibility: visible; opacity: 1; transform: none; transition-delay: 0s; }` +
            `.js-select-box-dropdown [hidden] { display: none; }` +
            `@media (prefers-reduced-motion: reduce) { .js-select-box-dropdown { transition: none; } }`;

        document.head.append(_style);
    }
}
