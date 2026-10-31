import { _emitter } from "./_emitter";
import { _hoverIndicator } from "./_hoverIndicator";
import { _lightbox } from "./_lightbox";
import { _snapSlider } from "./_snapSlider";

// image gallery in a _lightbox: links whose href is the image, grouped by the attribute's value
// usage: new _lightboxGallery({ attribute, thumbs, modal, animation, classes, events }), attribute defaults to "data-lightbox-gallery"
// <a href="large.jpg" data-lightbox-gallery="trip" data-caption="..." data-thumb="small.jpg"><img src="small.jpg" alt="..." /></a>
// open(links or [{ src, thumb, caption, alt }], index), close(); events open, change (gallery.index), close
// classes: override with Object.assign(_lightboxGallery.classes, {...})
const _arrow = (d) => `<svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

const _el = (tag, className, attrs = {}) => {
    const _node = document.createElement(tag);
    _node.className = className;
    Object.entries(attrs).forEach(([key, value]) => _node.setAttribute(key, value));
    return _node;
};

export class _lightboxGallery extends _emitter {
    static classes = {
        cover: "bg-gray-950/95",
        root: "-mx-4 -mb-4 flex h-[calc(100%+1rem)] flex-col text-white select-none focus:outline-none xl:-mx-10 xl:-mb-10 xl:h-[calc(100%+2.5rem)]",
        counter: "absolute -top-12 left-4 font-mono text-sm text-white/70 tabular-nums xl:left-10",
        stage: "relative min-h-0 flex-1",
        track: "flex h-full cursor-grab snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] data-dragging:cursor-grabbing [&::-webkit-scrollbar]:hidden",
        slide: "flex h-full w-full shrink-0 snap-center snap-always flex-col items-center justify-center gap-3 px-4 pb-4 md:px-20",
        image: "min-h-0 w-full flex-1 object-contain opacity-0 transition-opacity duration-300 data-loaded:opacity-100",
        caption: "max-w-2xl shrink-0 text-center text-sm text-white/80",
        arrow: "absolute top-1/2 hidden size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-white/10 md:grid",
        prev: "left-4 xl:left-6",
        next: "right-4 xl:right-6",
        thumbs: "flex shrink-0 gap-2 overflow-x-auto px-4 pt-1 pb-4 [scrollbar-width:none] xl:pb-6 [&::-webkit-scrollbar]:hidden [&>button:first-of-type]:ml-auto [&>button:last-of-type]:mr-auto",
        thumb: "size-14 shrink-0 cursor-pointer overflow-hidden rounded-md opacity-40 transition-opacity hover:opacity-80 aria-current:opacity-100 md:size-16",
        indicator: "absolute top-0 left-0 z-10 h-(--h) w-(--w) translate-x-(--x) translate-y-(--y) rounded-md ring-2 ring-white ring-inset duration-300 ease-out",
    };

    constructor(props = {}) {
        super(props.events);

        this.attribute = props.attribute ?? "data-lightbox-gallery";
        this.thumbs = props.thumbs ?? true;
        this.modal = props.modal ?? false;
        this.animation = props.animation ?? "fade";
        this.classes = { ..._lightboxGallery.classes, ...props.classes };

        this.items = [];
        this.index = 0;
        this.el = {};
        this.lightbox = null;
        this.slider = null;
        this.indicator = null;

        this.init();
    }

    init() {
        this.onClick = (e) => {
            const _link = e.target.closest?.(`[${this.attribute}]`);
            if (!_link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();

            const _group = _link.getAttribute(this.attribute);
            const _links = _group ? [...document.querySelectorAll(`[${this.attribute}="${CSS.escape(_group)}"]`)] : [_link];
            this.open(_links, _links.indexOf(_link));
        };

        this.onKeydown = (e) => {
            if (window._lightboxList?.at(-1) !== this.lightbox) return;
            if (e.key === "ArrowLeft") this.slider.prev();
            else if (e.key === "ArrowRight") this.slider.next();
            else return;
            e.preventDefault();
        };

        document.addEventListener("click", this.onClick);
    }

    item(link) {
        if (!(link instanceof Element)) return { thumb: link.src, caption: "", alt: "", ...link };

        const _img = link.querySelector("img");
        const _src = link.getAttribute("href") || link.dataset.src;
        return { src: _src, thumb: link.dataset.thumb || _img?.currentSrc || _src, caption: link.dataset.caption || "", alt: _img?.alt || link.dataset.caption || "" };
    }

    open(links, index = 0) {
        if (this.lightbox) {
            this.lightbox.destroy();
            this.cleanup();
        }

        this.items = [...links].map((link) => this.item(link));
        this.trigger = document.activeElement;
        this.build();

        this.lightbox = new _lightbox({
            target: this.el.root,
            modal: this.modal,
            animation: this.animation,
            events: { afterClose: () => this.cleanup() },
        });
        this.lightbox.el.cover.classList.remove("bg-black/50");
        this.lightbox.el.cover.classList.add(...this.classes.cover.split(" "));

        const _slides = [...this.el.track.children];
        const _index = Math.max(0, Math.min(index, _slides.length - 1));
        this.el.track.scrollLeft = _slides[_index].offsetLeft - _slides[0].offsetLeft;

        this.slider = new _snapSlider({ target: this.el.root, events: { change: (slider) => this.change(slider.current) } });
        if (this.el.thumbs) this.indicator = new _hoverIndicator({ target: this.el.thumbs, items: "button", active: "[aria-current]" });

        document.addEventListener("keydown", this.onKeydown);
        this.el.root.focus({ preventScroll: true });
        this.emit("open");
    }

    build() {
        const _many = this.items.length > 1;
        const _root = _el("div", this.classes.root, { role: "dialog", "aria-modal": "true", "aria-label": "Image gallery", tabindex: "-1" });
        const _stage = _el("div", this.classes.stage);
        const _track = _el("ul", `js-snap-track ${this.classes.track}`);

        this.items.forEach((item) => {
            const _slide = _el("li", this.classes.slide);
            const _image = _el("img", this.classes.image, { alt: item.alt, draggable: "false", decoding: "async" });
            _image.dataset.src = item.src;
            _image.addEventListener("load", () => (_image.dataset.loaded = ""), { once: true });
            _slide.append(_image);

            if (item.caption) {
                const _caption = _el("p", this.classes.caption);
                _caption.textContent = item.caption;
                _slide.append(_caption);
            }
            _track.append(_slide);
        });

        _stage.append(_track);
        _root.append(_stage);

        if (_many) {
            const _counter = _el("p", this.classes.counter, { "aria-live": "polite" });
            const _prev = _el("button", `js-snap-prev ${this.classes.arrow} ${this.classes.prev}`, { type: "button", "aria-label": "Previous image" });
            const _next = _el("button", `js-snap-next ${this.classes.arrow} ${this.classes.next}`, { type: "button", "aria-label": "Next image" });
            _prev.innerHTML = _arrow("m15 18-6-6 6-6");
            _next.innerHTML = _arrow("m9 18 6-6-6-6");
            _stage.append(_prev, _next);
            _root.prepend(_counter);
            this.el.counter = _counter;
        }

        if (_many && this.thumbs) {
            const _thumbs = _el("div", this.classes.thumbs);
            _thumbs.append(_el("span", `js-hover-indicator ${this.classes.indicator}`));
            this.items.forEach((item, i) => {
                const _thumb = _el("button", this.classes.thumb, { type: "button", "aria-label": `Show image ${i + 1}` });
                _thumb.append(_el("img", "size-full object-cover", { src: item.thumb, alt: "", draggable: "false" }));
                _thumb.addEventListener("click", () => this.slider.show(i));
                _thumbs.append(_thumb);
            });
            _root.append(_thumbs);
            this.el.thumbs = _thumbs;
        }

        this.el.root = _root;
        this.el.track = _track;
    }

    change(index) {
        this.index = index;

        [index - 1, index, index + 1].forEach((i) => {
            const _image = this.el.track.children[i]?.querySelector("img");
            if (_image && !_image.src) _image.src = _image.dataset.src;
        });

        if (this.el.counter) this.el.counter.textContent = `${index + 1} / ${this.items.length}`;

        if (this.el.thumbs) {
            const _thumbs = [...this.el.thumbs.querySelectorAll("button")];
            _thumbs.forEach((thumb, i) => (i === index ? thumb.setAttribute("aria-current", "true") : thumb.removeAttribute("aria-current")));

            const _active = _thumbs[index];
            this.el.thumbs.scrollTo({ left: _active.offsetLeft - (this.el.thumbs.clientWidth - _active.offsetWidth) / 2, behavior: "smooth" });
        }

        this.emit("change");
    }

    close() {
        this.lightbox?.hide();
    }

    cleanup() {
        this.indicator?.destroy();
        this.slider?.destroy();
        document.removeEventListener("keydown", this.onKeydown);
        this.trigger?.focus?.({ preventScroll: true });

        this.slider = null;
        this.indicator = null;
        this.lightbox = null;
        this.el = {};
        this.emit("close");
    }

    destroy() {
        document.removeEventListener("click", this.onClick);
        if (this.lightbox) {
            this.lightbox.destroy();
            this.cleanup();
        }
    }
}
