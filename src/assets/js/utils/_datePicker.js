import { _emitter } from "./_emitter";

// usage: const picker = new _datePicker({ target, end, time, format, months, class, events, ...flatpickr options })
// the input keeps a Y-m-d value for forms, people see format ("M j, Y") in a copy shown in its place
// end: a 2nd input for a range's end date, months: 2 shows two months from 768px up, class goes on the calendar
// css, in your main css file: @import "flatpickr/dist/flatpickr.min.css"; then date-picker.css
const _importFlatpickr = () => Promise.all([import("flatpickr"), import("flatpickr/dist/plugins/rangePlugin.js")]);

const _arrow = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}" /></svg>`;

export class _datePicker extends _emitter {
    constructor({ target, end, time = false, format, months = 1, class: className = "", events, ...options } = {}) {
        super(events);

        this.target = target ?? null;
        this.end = end ?? null;
        this.time = time;
        this.format = format ?? (time ? "M j, Y h:i K" : "M j, Y");
        this.months = months;
        this.className = className;
        this.options = options;

        this.picker = null;
        this.endValue = null;
        this.defaults = [];
        this.quiet = false;
        this.abort = new AbortController();
        this.media = window.matchMedia("(min-width: 768px)");

        this.ready = this.target ? this.init() : Promise.resolve(null);
    }

    async init() {
        const [{ default: flatpickr }, { default: rangePlugin }] = await _importFlatpickr();
        if (!this.target) return null; // destroyed while loading

        const _hook = (name, callback) => [callback, ...[this.options[name] ?? []].flat()];
        const _months = () => (this.media.matches ? this.months : 1);
        const _hidden = this.target.type === "hidden";

        this.picker = flatpickr(this.target, {
            dateFormat: this.time ? "Y-m-d H:i" : "Y-m-d",
            altInput: !this.options.inline,
            altFormat: this.format,
            enableTime: this.time,
            monthSelectorType: "static",
            disableMobile: true,
            prevArrow: _arrow("m15 5-7 7 7 7"),
            nextArrow: _arrow("m9 5 7 7-7 7"),
            ...this.options,
            showMonths: _months(),
            plugins: [...(this.end ? [rangePlugin({ input: this.end })] : []), ...(this.options.plugins ?? [])],
            onOpen: _hook("onOpen", () => this.emit("open")),
            onClose: _hook("onClose", () => this.emit("close")),
            onChange: _hook("onChange", () => {
                this.sync();
                if (!this.quiet) this.emit("change");
            }),
            onValueUpdate: _hook("onValueUpdate", () => this.sync()),
        });

        // flatpickr makes it a text input, a hidden one stays hidden, e.g. an inline calendar's
        if (_hidden) this.target.type = "hidden";
        if (this.className) this.picker.calendarContainer.classList.add(...this.className.split(" ").filter(Boolean));

        // the end input shows the format too, so a hidden copy keeps its name and Y-m-d value
        if (this.end) {
            this.endValue = Object.assign(document.createElement("input"), { type: "hidden", name: this.end.name });
            this.end.removeAttribute("name");
            this.end.after(this.endValue);
            this.sync();
        }

        this.defaults = [...this.picker.selectedDates];
        this.media.addEventListener("change", () => this.picker.set("showMonths", _months()), { signal: this.abort.signal });
        this.target.form?.addEventListener("reset", () => setTimeout(() => this.set(this.defaults, true)), { signal: this.abort.signal });

        this.emit("ready");
        return this.picker;
    }

    // a range puts both dates in the input, so each field gets its own
    sync() {
        if (!this.endValue) return;
        const [_start, _end] = this.picker.selectedDates.map((date) => this.picker.formatDate(date, this.picker.config.dateFormat));
        this.target.value = _start ?? "";
        this.endValue.value = _end ?? "";
    }

    get dates() {
        return this.picker?.selectedDates ?? [];
    }

    get value() {
        return this.target?.value ?? "";
    }

    // dates: a Date, a Y-m-d string or a list of them, [] clears, emit: true fires change
    // flatpickr's own hooks run either way, the range plugin needs them
    set(dates, emit = false) {
        if (!this.picker) return;
        this.quiet = !emit;
        this.picker.setDate(dates, true);
        this.quiet = false;
    }

    open() {
        this.picker?.open();
    }

    close() {
        this.picker?.close();
    }

    destroy() {
        this.abort.abort();
        if (this.endValue) {
            this.end.name = this.endValue.name;
            this.endValue.remove();
        }
        this.picker?.destroy();
        this.picker = this.target = null;
    }
}
