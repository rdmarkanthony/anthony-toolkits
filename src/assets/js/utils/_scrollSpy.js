import { _emitter } from "./_emitter";
import { _event } from "./_event";

// usage: new _scrollSpy({ target, line, events })
// target holds links with href="#id", the link of the section on screen gets aria-current="true", target gets data-active while one is
// a section counts once its top passes the line, line (default 0.25) is how far down the screen below the header, --header-offset or --header-height
// no markup or look, dots, tabs and labels are the page's own
export class _scrollSpy extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.line = props.line ?? 0.25;

        this.links = [];
        this.sections = [];
        this.index = -1;
        this.link = null;
        this.section = null;

        if (this.target) this.init();
    }

    init() {
        this.refresh();

        this._onScroll = () => this.check();
        this._onResize = (state) => state === "after" && this.check();
        _event.scroll(this._onScroll);
        _event.resize(this._onResize);
    }

    refresh() {
        this.links = [];
        this.sections = [];

        this.target.querySelectorAll('a[href^="#"]').forEach((link) => {
            const _section = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (!_section) return;

            this.links.push(link);
            this.sections.push(_section);
        });

        this.index = null;
        this.check();
    }

    headerOffset() {
        const _style = getComputedStyle(document.body);
        return parseFloat(_style.getPropertyValue("--header-offset") || _style.getPropertyValue("--header-height")) || 0;
    }

    check() {
        const _header = this.headerOffset();
        const _line = _header + (window.innerHeight - _header) * this.line;
        const _rects = this.sections.map((section) => section.getBoundingClientRect());

        let _index = -1;
        _rects.forEach((rect, i) => rect.top <= _line && (_index = i));
        if (_index === _rects.length - 1 && _rects[_index].bottom <= _line) _index = -1;

        // at the very bottom, short last sections can't reach the line
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
            const _last = _rects.findLastIndex((rect) => rect.top < window.innerHeight && rect.bottom > _header);
            if (_last > _index) _index = _last;
        }

        if (_index === this.index) return;
        this.set(_index);
    }

    set(index) {
        this.index = index;
        this.link = this.links[index] ?? null;
        this.section = this.sections[index] ?? null;

        this.links.forEach((link, i) => (i === index ? link.setAttribute("aria-current", "true") : link.removeAttribute("aria-current")));
        this.target.toggleAttribute("data-active", index !== -1);

        this.emit("change");
    }

    destroy() {
        _event.offScroll(this._onScroll);
        _event.offResize(this._onResize);
        this.links.forEach((link) => link.removeAttribute("aria-current"));
        this.target.removeAttribute("data-active");
    }
}
