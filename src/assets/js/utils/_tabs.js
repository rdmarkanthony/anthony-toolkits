// usage: new _tabs({ target: document.querySelector(".js-tabs") })
// target holds the nav links, each href is the id of its content, e.g. href="#tab1"
// the active link gets .js-tabs-active (set it in the html for another start tab), the other contents get .hidden
export class _tabs {
    constructor(props) {
        this.target = props.target ?? null;

        this.nav = [];
        this.contents = [];
        this.active = 0;

        if (this.target) this.init();
    }

    init() {
        this.target.querySelectorAll("a").forEach((item) => {
            const _content = document.querySelector(item.getAttribute("href"));
            if (!_content) return;

            const _index = this.nav.length;
            this.nav.push(item);
            this.contents.push(_content);

            // upon click, update the active nav and content
            item.addEventListener("click", (e) => {
                e.preventDefault();

                this.show(_index);
            });

            // get the active nav
            if (item.classList.contains("js-tabs-active")) this.active = _index;
        });

        this.show(this.active); // activate the current nav and content
    }

    show(index) {
        this.active = index;

        this.nav.forEach((item, i) => item.classList.toggle("js-tabs-active", i === index));
        this.contents.forEach((item, i) => item.classList.toggle("hidden", i !== index));
    }
}
