import { _emitter } from "./_emitter";

// usage: new _autocomplete({ input, list, items, match, render, limit, more, empty, optionClass, events })
// items: [{ url, ... }], each suggestion links to its url
// more: a "see all" link past limit, empty: html for no matches
// events: init, update, show, hide, select, pick
export class _autocomplete extends _emitter {
    constructor(props) {
        super(props.events);

        this.input = props.input ?? null;
        this.list = props.list ?? null;
        this.items = props.items ?? [];
        this.match = props.match ?? ((item, query) => String(item.text ?? item.label ?? "").toLowerCase().includes(query));
        this.render = props.render ?? ((item) => item.label);
        this.limit = props.limit ?? 6;
        this.more = props.more ?? null;
        this.empty = props.empty ?? null;
        this.optionClass = props.optionClass ?? "";

        this.value = "";
        this.results = [];
        this.options = [];
        this.active = -1;
        this.picked = null;

        if (this.input && this.list) this.init();
    }

    init() {
        this.input.setAttribute("role", "combobox");
        this.input.setAttribute("aria-autocomplete", "list");
        this.input.setAttribute("aria-controls", this.list.id);
        this.input.setAttribute("aria-expanded", "false");
        this.list.setAttribute("role", "listbox");
        this.list.hidden = true;

        this.onInput = () => document.activeElement === this.input && this.update();
        this.onFocus = () => this.input.value.trim() && this.update();
        this.onKeydown = (e) => this.keydown(e);
        this.onFocusout = (e) => !this.list.contains(e.relatedTarget) && e.relatedTarget !== this.input && this.close();
        // keep the focus on the input, mousedown for iOS
        this.onPress = (e) => e.preventDefault();
        this.onClick = (e) => this.pick(this.options.indexOf(e.target.closest("a")));

        this.input.addEventListener("input", this.onInput);
        this.input.addEventListener("focus", this.onFocus);
        this.input.addEventListener("keydown", this.onKeydown);
        this.input.addEventListener("focusout", this.onFocusout);
        this.list.addEventListener("pointerdown", this.onPress);
        this.list.addEventListener("mousedown", this.onPress);
        this.list.addEventListener("click", this.onClick);

        this.emit("init");
    }

    update() {
        const value = this.input.value.trim();
        const query = value.toLowerCase();
        const matches = query ? this.items.filter((item) => this.match(item, query)) : [];

        this.value = value;
        this.results = matches.slice(0, this.limit);
        this.emit("update");

        if (!query || (!matches.length && !this.empty)) return this.close();

        const links = this.results.map((item) => ({ url: item.url, html: this.render(item) }));
        if (this.more && matches.length > this.limit) links.push(this.more(value, matches.length));

        this.list.innerHTML = "";
        this.options = links.map((link, index) => {
            const option = document.createElement("a");
            option.id = `${this.list.id}-${index}`;
            option.href = link.url;
            option.className = this.optionClass;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            option.innerHTML = link.html;
            option.addEventListener("pointermove", () => this.select(index));
            return option;
        });
        this.list.append(...this.options);

        if (!this.options.length && this.empty) {
            const message = document.createElement("div");
            message.setAttribute("role", "option");
            message.setAttribute("aria-disabled", "true");
            message.innerHTML = this.empty(value);
            this.list.append(message);
        }

        this.select(-1);
        this.open();
    }

    keydown(e) {
        const total = this.options.length;

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (this.list.hidden) return this.update();
            if (!total) return;
            e.preventDefault();

            const step = e.key === "ArrowDown" ? 1 : -1;
            this.select(((this.active + 1 + step + total + 1) % (total + 1)) - 1);
        } else if (e.key === "Enter" && !this.list.hidden && this.options[this.active]) {
            e.preventDefault();
            this.options[this.active].click();
        } else if (e.key === "Escape") {
            if (this.list.hidden && !this.input.value) return;
            e.preventDefault();

            if (this.list.hidden) {
                this.input.value = "";
                this.input.dispatchEvent(new Event("input", { bubbles: true }));
            } else {
                this.close();
            }
        }
    }

    select(index) {
        const changed = index !== this.active;
        this.active = index;
        this.options.forEach((option, i) => option.setAttribute("aria-selected", String(i === index)));

        const option = this.options[index];
        if (option) {
            this.input.setAttribute("aria-activedescendant", option.id);
            option.scrollIntoView({ block: "nearest" });
        } else {
            this.input.removeAttribute("aria-activedescendant");
        }

        if (changed) this.emit("select");
    }

    pick(index) {
        if (index < 0) return;
        this.picked = this.results[index] ?? null;
        this.emit("pick");
    }

    open() {
        if (!this.list.hidden) return;
        this.list.hidden = false;
        this.input.setAttribute("aria-expanded", "true");
        this.emit("show");
    }

    close() {
        this.select(-1);
        if (this.list.hidden) return;
        this.list.hidden = true;
        this.input.setAttribute("aria-expanded", "false");
        this.emit("hide");
    }

    destroy() {
        this.close();
        this.list.innerHTML = "";
        this.input.removeEventListener("input", this.onInput);
        this.input.removeEventListener("focus", this.onFocus);
        this.input.removeEventListener("keydown", this.onKeydown);
        this.input.removeEventListener("focusout", this.onFocusout);
        this.list.removeEventListener("pointerdown", this.onPress);
        this.list.removeEventListener("mousedown", this.onPress);
        this.list.removeEventListener("click", this.onClick);
    }
}
