// comic reader: shows one frame (an area of a page) at a time, pans to the next frame, fades to a new page
// usage: new _comicSlider({ target, frames }), target holds .js-comic-stage with one <img> per page
// a frame: { page, top, left, right, bottom } in % of its page, optional mobile: { top, left, right, bottom }
// optional .js-comic-prev / .js-comic-next; duration (s), ease, mobile (media query or function); events: change
import { gsap } from "gsap";
import { _emitter } from "./_emitter";

// a frame's edges, missing ones are the page's own
const _area = ({ top = 0, left = 0, right = 100, bottom = 100 }) => ({ top, left, right, bottom });

export class _comicSlider extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;
        this.frames = props.frames ?? [];
        this.duration = props.duration ?? 0.8;
        this.ease = props.ease ?? "power2.inOut";
        this.mobile = props.mobile ?? "(max-width: 767px)";

        this.el = {};
        this.pages = [];
        this.index = 0;
        this.page = -1;
        this.loaded = false;
        // the shown area of the page, tweened between frames
        this.rect = null;
        this.swipe = null;

        // resolves once the pages loaded and the first frame shows
        this.ready = this.target ? this.init() : Promise.resolve(this);
    }

    async init() {
        this.el.stage = this.target.querySelector(".js-comic-stage");
        this.el.prev = this.target.querySelector(".js-comic-prev");
        this.el.next = this.target.querySelector(".js-comic-next");

        // each page: a box sized to the frame clips it, the image moves inside
        this.pages = [...this.el.stage.querySelectorAll("img")].map((img) => {
            const _box = document.createElement("div");
            const _layer = document.createElement("div");
            _box.style.cssText = "position: absolute; top: 0; left: 0; overflow: hidden; opacity: 0; visibility: hidden;";
            _layer.style.cssText = "position: absolute; top: 0; left: 0;";
            img.style.cssText = "display: block; width: 100%; height: 100%; max-width: none;";
            img.loading = "eager";
            img.draggable = false;

            img.replaceWith(_box);
            _layer.append(img);
            _box.append(_layer);

            return { img, box: _box, layer: _layer, width: 0, height: 0 };
        });

        await Promise.all(this.pages.map(({ img }) => img.decode().catch(() => {})));
        if (!this.target) return this; // destroyed while loading
        this.pages.forEach((page) => {
            page.width = page.img.naturalWidth || 1;
            page.height = page.img.naturalHeight || 1;
        });
        this.loaded = true;

        this.handlers = {
            prev: () => this.prev(),
            next: () => this.next(),
            key: (e) => {
                if (e.key === "ArrowLeft") this.prev();
                else if (e.key === "ArrowRight") this.next();
                else return;
                e.preventDefault();
            },
            down: (e) => (this.swipe = { x: e.clientX, y: e.clientY }),
            // a sideways swipe on the stage turns the frame
            up: (e) => {
                if (!this.swipe) return;
                const _x = e.clientX - this.swipe.x;
                const _y = e.clientY - this.swipe.y;
                this.swipe = null;
                if (Math.abs(_x) < 40 || Math.abs(_x) < Math.abs(_y)) return;
                _x < 0 ? this.next() : this.prev();
            },
        };

        this.el.prev?.addEventListener("click", this.handlers.prev);
        this.el.next?.addEventListener("click", this.handlers.next);
        this.target.addEventListener("keydown", this.handlers.key);
        this.el.stage.style.touchAction = "pan-y";
        this.el.stage.addEventListener("pointerdown", this.handlers.down);
        this.el.stage.addEventListener("pointerup", this.handlers.up);

        // a resize can also switch to or from the mobile frames
        this.observer = new ResizeObserver(() => this.refresh());
        this.observer.observe(this.el.stage);

        this.show(this.index, { duration: 0 });
        return this;
    }

    isMobile() {
        return typeof this.mobile === "function" ? this.mobile() : matchMedia(this.mobile).matches;
    }

    // the frame's page and area, its mobile area on mobile
    frame(index) {
        const _frame = this.frames[index] ?? {};
        return { page: _frame.page ?? 0, ..._area(this.isMobile() && _frame.mobile ? _frame.mobile : _frame) };
    }

    show(index, { duration } = {}) {
        if (!this.loaded || !this.pages.length || !this.frames.length) return;

        this.index = Math.max(0, Math.min(index, this.frames.length - 1));
        const { page, ...rect } = this.frame(this.index);
        const _duration = duration ?? (matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : this.duration);

        if (this.rect) gsap.killTweensOf(this.rect);

        if (page === this.page) {
            // same page: pan and zoom to the new area
            gsap.to(this.rect, { ...rect, duration: _duration, ease: this.ease, onUpdate: () => this.render() });
        } else {
            // a new page fades in on top, already at its frame
            const _old = this.pages[this.page];
            const _new = this.pages[page];
            this.page = page;
            this.rect = rect;
            this.render();

            gsap.killTweensOf([_new.box, _old?.box]);
            gsap.set(_new.box, { zIndex: 1 });
            gsap.fromTo(_new.box, { autoAlpha: 0 }, { autoAlpha: 1, duration: _duration * 0.75, ease: "power1.out" });
            if (_old) gsap.set(_old.box, { zIndex: 0, autoAlpha: 0, delay: _duration * 0.75 });
        }

        if (this.el.prev) this.el.prev.disabled = this.index <= 0;
        if (this.el.next) this.el.next.disabled = this.index >= this.frames.length - 1;

        this.emit("change");
    }

    next() {
        this.show(this.index + 1);
    }

    prev() {
        this.show(this.index - 1);
    }

    // shows the current frame again without a tween, e.g. after the frames or the stage changed
    refresh() {
        if (!this.rect) return;
        gsap.killTweensOf(this.rect);
        const { page, ...rect } = this.frame(this.index);
        if (page !== this.page) return this.show(this.index, { duration: 0 });
        this.rect = rect;
        this.render();
    }

    // fits the area inside the stage, centered, the box clips the rest of the page
    render() {
        const _page = this.pages[this.page];
        const { top, left, right, bottom } = this.rect;
        const _stageWidth = this.el.stage.offsetWidth;
        const _stageHeight = this.el.stage.offsetHeight;
        // the area's share of the page, 0 to 1
        const _spanX = Math.max(right - left, 0.1) / 100;
        const _spanY = Math.max(bottom - top, 0.1) / 100;
        const _ratio = (_page.width * _spanX) / (_page.height * _spanY);

        let _width = _stageWidth;
        let _height = _stageWidth / _ratio;
        if (_height > _stageHeight) {
            _height = _stageHeight;
            _width = _stageHeight * _ratio;
        }

        _page.box.style.width = `${_width}px`;
        _page.box.style.height = `${_height}px`;
        _page.box.style.transform = `translate3d(${(_stageWidth - _width) / 2}px, ${(_stageHeight - _height) / 2}px, 0)`;

        const _layerWidth = _width / _spanX;
        const _layerHeight = _height / _spanY;
        _page.layer.style.width = `${_layerWidth}px`;
        _page.layer.style.height = `${_layerHeight}px`;
        _page.layer.style.transform = `translate3d(${(-_layerWidth * left) / 100}px, ${(-_layerHeight * top) / 100}px, 0)`;
    }

    destroy() {
        if (!this.target) return;
        this.observer?.disconnect();
        if (this.handlers) {
            this.el.prev?.removeEventListener("click", this.handlers.prev);
            this.el.next?.removeEventListener("click", this.handlers.next);
            this.target.removeEventListener("keydown", this.handlers.key);
            this.el.stage.removeEventListener("pointerdown", this.handlers.down);
            this.el.stage.removeEventListener("pointerup", this.handlers.up);
        }

        if (this.rect) gsap.killTweensOf(this.rect);
        this.pages.forEach(({ img, box }) => {
            gsap.killTweensOf(box);
            img.style.cssText = "";
            box.replaceWith(img);
        });

        this.pages = [];
        this.target = null;
    }
}
