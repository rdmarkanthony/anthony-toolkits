import SplitType from "split-type";
import { _event } from "./_event";
import { _inview } from "./_inview";

export class _splitText {
    constructor(props) {
        this.target = props.target;

        this.split = null;

        this.params = {
            types: props.types ?? ["lines", "words"],
            lineClass: "line-parent",
            wordClass: "word",
        };

        this.width = 0;

        this.init();
    }

    init() {
        this.split = new SplitType(this.target, this.params);

        // on resize
        this._onResize = (status) => {
            if (status === "resize") return;
            this.update();
        };
        _event.resize(this._onResize);

        // on inview
        new _inview({ target: this.target, callback: () => this.update() });
    }

    update() {
        if (!this.split) return;

        if (this.width == this.target.offsetWidth) return;
        this.width = this.target.offsetWidth;

        this.split?.revert();
        this.split.split(this.params);

        // for lines of texts
        this.split.lines?.forEach((line, index) => {
            line.setAttribute("style", `--index:${index}`);
        });

        // for words per line/s
        this.split.words?.forEach((word, index) => {
            word.setAttribute("style", `display:inline-block;--index:${index}`);

            if (/\p{Extended_Pictographic}/u.test(word.innerHTML)) word.classList.add("emoji");
        });
    }

    destroy() {
        this.split?.revert();
        this.split = null;

        if (this._onResize) {
            _event.offResize(this._onResize);
            this._onResize = null;
        }
    }
}
