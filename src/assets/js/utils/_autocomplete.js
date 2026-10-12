// suggestion list for a search input, follows the ARIA combobox pattern
// usage: new _autocomplete({ input, list, items, match, render, limit, more, empty, optionClass })
// input: the search input, inside a <form> so Enter with no suggestion picked submits it
// list: an empty element for the suggestions, it needs an id
// items: [{ url, ...anything render and match use }]
// match(item, query): true to suggest the item, query is trimmed and lowercase
// render(item): the html inside a suggestion link
// more(value, total): optional { url, html } for a last link, only when more than `limit` match, value is the trimmed input
// empty(value): optional html when nothing matches
// arrow keys move, Enter opens the picked suggestion, Esc closes (or clears when closed)
export class _autocomplete {
    constructor(props) {
        this.input = props.input ?? null;
        this.list = props.list ?? null;
        this.items = props.items ?? [];
        this.match = props.match ?? ((item, query) => String(item.text ?? item.label ?? "").toLowerCase().includes(query));
        this.render = props.render ?? ((item) => item.label);
        this.limit = props.limit ?? 6;
        this.more = props.more ?? null;
        this.empty = props.empty ?? null;
        this.optionClass = props.optionClass ?? "";

        this.options = [];
        this.active = -1;

        if (this.input && this.list) this.init();
    }

    init() {
        this.input.setAttribute("role", "combobox");
        this.input.setAttribute("aria-autocomplete", "list");
        this.input.setAttribute("aria-controls", this.list.id);
        this.input.setAttribute("aria-expanded", "false");
        this.list.setAttribute("role", "listbox");
        this.list.hidden = true;

        // only while typing, not when a script sets the value
        this.onInput = () => document.activeElement === this.input && this.update();
        this.onFocus = () => this.input.value.trim() && this.update();
        this.onKeydown = (e) => this.keydown(e);
        this.onFocusout = (e) => !this.list.contains(e.relatedTarget) && e.relatedTarget !== this.input && this.close();
        // keep the focus on the input, so a click on a suggestion isn't lost to the blur
        this.onPointerdown = (e) => e.preventDefault();

        this.input.addEventListener("input", this.onInput);
        this.input.addEventListener("focus", this.onFocus);
        this.input.addEventListener("keydown", this.onKeydown);
        this.input.addEventListener("focusout", this.onFocusout);
        this.list.addEventListener("pointerdown", this.onPointerdown);
    }

    update() {
        const value = this.input.value.trim();
        const query = value.toLowerCase();
        if (!query) return this.close();

        const matches = this.items.filter((item) => this.match(item, query));
        if (!matches.length && !this.empty) return this.close();

        const links = matches.slice(0, this.limit).map((item) => ({ url: item.url, html: this.render(item) }));
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
            // -1 (nothing picked) sits between the last and the first
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
        this.active = index;
        this.options.forEach((option, i) => option.setAttribute("aria-selected", String(i === index)));

        const option = this.options[index];
        if (option) {
            this.input.setAttribute("aria-activedescendant", option.id);
            option.scrollIntoView({ block: "nearest" });
        } else {
            this.input.removeAttribute("aria-activedescendant");
        }
    }

    open() {
        this.list.hidden = false;
        this.input.setAttribute("aria-expanded", "true");
    }

    close() {
        this.list.hidden = true;
        this.input.setAttribute("aria-expanded", "false");
        this.select(-1);
    }

    destroy() {
        this.close();
        this.list.innerHTML = "";
        this.input.removeEventListener("input", this.onInput);
        this.input.removeEventListener("focus", this.onFocus);
        this.input.removeEventListener("keydown", this.onKeydown);
        this.input.removeEventListener("focusout", this.onFocusout);
        this.list.removeEventListener("pointerdown", this.onPointerdown);
    }
}
