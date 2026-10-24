import { _emitter } from "./_emitter";
import { _event } from "./_event";

// usage: new _scrollProgress({ target, element, threshold, events })
// target (default body) gets --progress, 0 to 1, of the page or of element (an article, from its top at the header to its end at the screen bottom)
// target gets data-active past threshold (default one screen, for a back to top button), or while element is being read
// the header is --header-offset or --header-height
export class _scrollProgress extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? document.body;
        this.element = props.element ?? null;
        this.threshold = props.threshold ?? null;

        this.progress = null;
        this.isActive = false;

        if (this.target) this.init();
    }

    init() {
        this._onScroll = () => this.update();
        this._onResize = (state) => state === "after" && this.update();
        _event.scroll(this._onScroll);
        _event.resize(this._onResize);
    }

    headerOffset() {
        const _style = getComputedStyle(document.body);
        return parseFloat(_style.getPropertyValue("--header-offset") || _style.getPropertyValue("--header-height")) || 0;
    }

    update() {
        let _progress = 0;
        let _active = false;

        if (this.element) {
            const _rect = this.element.getBoundingClientRect();
            const _line = this.headerOffset();
            const _total = _rect.height - (window.innerHeight - _line);

            _progress = _total > 0 ? (_line - _rect.top) / _total : _rect.top <= _line ? 1 : 0;
            _active = _rect.top < _line && _rect.bottom > _line;
        } else {
            const _total = document.documentElement.scrollHeight - window.innerHeight;

            _progress = _total > 0 ? window.scrollY / _total : 0;
            _active = window.scrollY > (this.threshold ?? window.innerHeight);
        }

        _progress = Math.round(Math.min(1, Math.max(0, _progress)) * 10000) / 10000;

        if (_progress !== this.progress) {
            this.progress = _progress;
            this.target.style.setProperty("--progress", _progress);
            this.emit("update");
        }

        if (_active !== this.isActive) {
            this.isActive = _active;
            this.target.toggleAttribute("data-active", _active);
            this.emit(_active ? "enter" : "leave");
        }
    }

    destroy() {
        _event.offScroll(this._onScroll);
        _event.offResize(this._onResize);
        this.target.style.removeProperty("--progress");
        this.target.removeAttribute("data-active");
    }
}
