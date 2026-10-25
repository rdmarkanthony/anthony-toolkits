import { _emitter } from "./_emitter";

// usage: new _tabs({ target: document.querySelector(".js-tabs"), events })
// target holds the nav links, each href is the id of its content, e.g. href="#tab1"
// the active link gets .js-tabs-active (set it in the html for another start tab), the other contents get .hidden
// links without a #id href, e.g. href="/contact", stay normal links
// a url hash to a content or inside it opens that tab, e.g. /page/#tab2
// events: change (tabs.active, tabs.contents[tabs.active])
const _hashTarget = () => {
    const _id = decodeURIComponent(location.hash.slice(1).split("?")[0]);
    return _id ? document.getElementById(_id) : null;
};

export class _tabs extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;

        this.nav = [];
        this.contents = [];
        this.active = 0;
        this.shown = null;

        if (this.target) this.init();
    }

    init() {
        this.target.querySelectorAll("a").forEach((item) => {
            const _href = item.getAttribute("href") ?? "";
            const _content = _href.startsWith("#") && document.getElementById(_href.slice(1));
            if (!_content) return;

            const _index = this.nav.length;
            this.nav.push(item);
            this.contents.push(_content);

            item.addEventListener("click", (e) => {
                e.preventDefault();

                this.show(_index);
            });

            if (item.classList.contains("js-tabs-active")) this.active = _index;
        });

        this.show(this.active);

        this.showHash();
        window.addEventListener("hashchange", () => this.showHash());
    }

    showHash() {
        const _target = _hashTarget();
        const _index = this.contents.findIndex((content) => _target && content.contains(_target));
        if (_index !== -1) this.show(_index);
    }

    show(index) {
        this.active = index;

        this.nav.forEach((item, i) => item.classList.toggle("js-tabs-active", i === index));
        this.contents.forEach((item, i) => item.classList.toggle("hidden", i !== index));

        if (index === this.shown) return;
        this.shown = index;
        this.emit("change");
    }
}
