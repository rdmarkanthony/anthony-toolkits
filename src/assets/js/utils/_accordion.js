import { _emitter } from "./_emitter";

// usage: new _accordion({ target, closeOthers, openFirst, duration, events })
// markup: target > .js-accordion-set > .js-accordion-set-title (a button) + .js-accordion-set-content
// the open set gets .active and aria-expanded, closed contents get hidden="until-found" so find in page still opens them
let _count = 0;

export class _accordion extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.closeOthers = props.closeOthers ?? true;
        this.openFirst = props.openFirst ?? true;
        this.duration = props.duration ?? 300;

        this.sets = [];
        this.item = null;
        this.abort = new AbortController();

        if (this.target) this.init();
    }

    init() {
        const { signal } = this.abort;

        // its own sets only, not the ones of a nested accordion
        this.sets = [...this.target.querySelectorAll(".js-accordion-set")].filter((set) => {
            const _content = set.parentElement.closest(".js-accordion-set-content");
            return !_content || !this.target.contains(_content);
        });

        this.sets.forEach((set, index) => {
            const { title, content } = this.parts(set);

            content.id ||= `accordion-${++_count}`;
            title.setAttribute("aria-controls", content.id);

            if (title.tagName !== "BUTTON") {
                title.setAttribute("role", "button");
                title.tabIndex = 0;
                title.addEventListener(
                    "keydown",
                    (e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        this.toggle(set);
                    },
                    { signal }
                );
            }

            title.addEventListener(
                "click",
                (e) => {
                    e.preventDefault();
                    this.toggle(set);
                },
                { signal }
            );

            content.addEventListener("beforematch", () => this.open(set), { signal });

            this.update(set, this.openFirst && index === 0, false);
        });
    }

    parts(set) {
        return {
            title: set.querySelector(":scope > .js-accordion-set-title"),
            content: set.querySelector(":scope > .js-accordion-set-content"),
        };
    }

    isOpen(set) {
        return set.classList.contains("active");
    }

    toggle(set) {
        this.isOpen(set) ? this.close(set) : this.open(set);
    }

    open(set, animate = true) {
        if (this.closeOthers) this.sets.forEach((item) => item !== set && this.isOpen(item) && this.close(item, animate));
        this.update(set, true, animate);
    }

    close(set, animate = true) {
        this.update(set, false, animate);
    }

    update(set, open, animate = true) {
        const { title, content } = this.parts(set);

        // from the current height, so a click mid-animation turns it around
        const _from = content.hidden ? 0 : content.offsetHeight;
        content.getAnimations().forEach((animation) => animation.cancel());

        set.classList.toggle("active", open);
        title.setAttribute("aria-expanded", open);
        content.removeAttribute("hidden");

        const _done = () => {
            content.style.overflow = "";
            if (!open) content.setAttribute("hidden", "until-found");

            this.item = set;
            if (animate) this.emit(open ? "open" : "close");
        };

        const _duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : this.duration;
        if (!animate || !_duration) return _done();

        content.style.overflow = "hidden";
        content.animate({ height: [`${_from}px`, `${open ? content.offsetHeight : 0}px`] }, { duration: _duration, easing: "ease" }).onfinish = _done;
    }

    destroy() {
        this.abort.abort();
        this.sets.forEach((set) => this.parts(set).content.getAnimations().forEach((animation) => animation.finish()));
    }
}
