import { _emitter } from "./_emitter";

export class _typing extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;

        this.el = {
            main: document.createElement("span"),
            cursor: document.createElement("span"),
        };

        this.text = props.text ?? "";
        this.count = 0;
        this.speed = props.speed ?? 50;

        this.cursorEnabled = props.cursorEnabled ?? true;

        if (this.target) this.init();
    }

    init() {
        this.style();

        this.el.main.classList.add("js-typing-main");
        this.target.appendChild(this.el.main);

        this.createCursor();
    }

    createCursor() {
        this.el.cursor.classList.add("js-typing-cursor");
        this.el.cursor.innerHTML = "|";
        this.target.appendChild(this.el.cursor);

        this.showCursor();
    }

    showCursor() {
        if (this.cursorEnabled) this.el.cursor.classList.add("cursor-visible");
    }

    hideCursor() {
        this.el.cursor.classList.remove("cursor-visible");
    }

    start(callback) {
        if (this.text.length <= 0) return;
        this.showCursor();
        this.emit("beforeStart");

        this.count = 0;
        const _run = () => {
            if (this.count > this.text.length) {
                this.emit("afterStart");
                callback?.(this);
                return;
            }

            this.el.main.textContent += this.text.charAt(this.count);
            this.count++;

            setTimeout(_run, this.speed);
        };
        _run();
    }

    erase(callback) {
        let _text = this.el.main.innerHTML;
        let _count = _text.length;

        if (_count <= 0) return;
        this.showCursor();
        this.emit("beforeErase");

        const _erase = () => {
            if (_count === 0) {
                this.emit("afterErase");
                callback?.(this);
                return;
            }

            _text = _text.slice(0, -1);
            this.el.main.innerHTML = _text;
            _count--;

            setTimeout(_erase, this.speed);
        };
        _erase();
    }

    clear() {
        this.el.main.innerHTML = "";
    }

    style() {
        let _style = document.querySelector("#js-typing-style");
        if (_style) return;

        _style = document.createElement("style");
        _style.setAttribute("id", "js-typing-style");
        document.head.appendChild(_style);

        _style.innerHTML = `.js-typing-cursor { opacity: 0; position: relative; top: -0.25rem; font-weight: 100; }` + `.js-typing-cursor.cursor-visible { animation: blink 0.7s infinite; }` + ` @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`;
    }
}
