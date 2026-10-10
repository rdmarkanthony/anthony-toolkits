import { _event } from "./utils/_event";
import { _filter } from "./utils/_filter";

// expose for inline scripts
Object.assign(window, {
    _event,
    _filter,
});

class _projName {
    constructor(props) {
        if (window._projName) return;
        window._projName = this;

        this.debug = props.debug || false;

        this.el = {
            header: document.querySelector(".header-content"),
            footer: document.querySelector(".footer-content"),
            main: document.querySelector(".main-content"),
        };

        this.headerHeight = 0;
        this.footerHeight = 0;

        this.init();
    }

    init() {
        // for resize
        _event.resize(() => this.resize());

        // component search
        _filter.init();

        if (this.debug) console.log("_projName", this);
    }

    resize() {
        this.headerHeight = this.el.header?.offsetHeight ?? 0;
        document.body.style.setProperty("--header-height", `${this.headerHeight}px`);

        this.footerHeight = this.el.footer?.offsetHeight ?? 0;
        document.body.style.setProperty("--footer-height", `${this.footerHeight}px`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new _projName({ debug: true });
});
