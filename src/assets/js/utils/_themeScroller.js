import { _event } from "./_event";
import { _emitter } from "./_emitter";

// usage: new _themeScroller({ sections, target, line, defaultTheme, duration, events })
// target (body) gets the theme of the section on screen, e.g. data-scroll-theme="dark"
// line: px from the top, or a function, picks the section under it
// set the first theme in the html, e.g. <body class="dark">
export class _themeScroller extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.selector = props.sections ?? "[data-scroll-theme]";
        this.target = props.target ?? document.body;
        this.line = props.line ?? null;
        this.defaultTheme = props.defaultTheme ?? "";
        this.duration = props.duration ?? 600;

        this.sections = [];
        this.theme = null;
        this.prevTheme = null;
        this.timer = null;

        this.init();
    }

    init() {
        this.refresh();

        this.offScroll = _event.scroll(() => this.update());
        this.offResize = _event.resize(() => this.update());
        this.offObserve = _event.observeResize(() => this.update());

        this.emit("init");
    }

    refresh() {
        this.sections = typeof this.selector === "string" ? [...document.querySelectorAll(this.selector)] : [...this.selector];
        this.update();
    }

    pick() {
        const _height = document.documentElement.clientHeight;
        const _line = typeof this.line === "function" ? this.line() : this.line;

        let _picked = null;
        let _most = 0;

        this.sections.forEach((section) => {
            const _rect = section.getBoundingClientRect();
            if (!_rect.height) return;

            if (_line !== null) {
                // the last one wins, e.g. a sticky section on top
                if (_rect.top <= _line && _rect.bottom > _line) _picked = section;
                return;
            }

            const _visible = Math.min(_rect.bottom, _height) - Math.max(_rect.top, 0);
            if (_visible > _most) {
                _most = _visible;
                _picked = section;
            }
        });

        return _picked;
    }

    update() {
        const _section = this.pick();
        const _theme = _section ? (_section.dataset.scrollTheme ?? "").trim() : this.defaultTheme;

        if (_theme === this.theme) return;

        // the first time, clear the theme set in the html
        const _first = this.theme === null;
        (_first ? this.themes() : this.split(this.theme)).forEach((name) => this.target.classList.remove(name));
        this.split(_theme).forEach((name) => this.target.classList.add(name));

        this.prevTheme = this.theme;
        this.theme = _theme;
        this.section = _section;

        if (!_first && this.duration) {
            this.target.classList.add("theme-transition");
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.target.classList.remove("theme-transition"), this.duration);
        }

        this.emit("change");
    }

    themes() {
        return [...new Set([this.defaultTheme, ...this.sections.map((section) => section.dataset.scrollTheme)].flatMap((theme) => this.split(theme?.trim())))];
    }

    split(theme) {
        return theme ? theme.split(/\s+/) : [];
    }

    destroy() {
        this.offScroll?.();
        this.offResize?.();
        this.offObserve?.();
        clearTimeout(this.timer);

        this.split(this.theme).forEach((name) => this.target.classList.remove(name));
        this.target.classList.remove("theme-transition");
        this.theme = null;
    }
}
