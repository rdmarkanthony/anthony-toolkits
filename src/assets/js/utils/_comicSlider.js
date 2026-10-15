// comic reader: pans frame to frame, fades between pages
// usage: new _comicSlider({ target, frames }), .js-comic-stage holds one <img> per page
// frame: { page, top, left, right, bottom, mobile } in % of the page
// options: duration (s), ease, mobile, events: change; optional .js-comic-prev/next
import { _emitter } from "./_emitter";
import { _tween } from "./_tween";

// power1.out, for the page fade
const _fadeEase = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

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

        // a frame-sized box clips each page
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

        // resize may switch to or from mobile frames
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

        this.tween?.stop();

        if (page === this.page) {
            // same page: pan and zoom to the new area
            const _from = { ...this.rect };
            this.tween = _tween({
                duration: _duration * 1000,
                ease: this.ease,
                update: (progress) => {
                    Object.keys(rect).forEach((key) => (this.rect[key] = _from[key] + (rect[key] - _from[key]) * progress));
                    this.render();
                },
            });
        } else {
            // a new page fades in on top, already at its frame
            const _old = this.pages[this.page];
            const _new = this.pages[page];
            this.page = page;
            this.rect = rect;
            this.render();

            const _fade = _duration * 750;
            // the old page's opacity, it may be mid-fade
            const _opacity = _old ? getComputedStyle(_old.box).opacity : 0;
            [_new.box, _old?.box].forEach((box) => box?.getAnimations().forEach((animation) => animation.cancel()));

            Object.assign(_new.box.style, { zIndex: 1, opacity: 1, visibility: "visible" });
            _new.box.animate({ opacity: [0, 1] }, { duration: _fade, easing: _fadeEase });

            // the old page hides once the new one is in
            if (_old) {
                Object.assign(_old.box.style, { zIndex: 0, opacity: 0, visibility: "hidden" });
                _old.box.animate({ opacity: [_opacity, _opacity], visibility: ["visible", "visible"] }, { duration: _fade });
            }
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

    // redraw the current frame without a tween
    refresh() {
        if (!this.rect) return;
        this.tween?.stop();
        const { page, ...rect } = this.frame(this.index);
        if (page !== this.page) return this.show(this.index, { duration: 0 });
        this.rect = rect;
        this.render();
    }

    // fit the area in the stage, centered
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

        this.tween?.stop();
        this.pages.forEach(({ img, box }) => {
            box.getAnimations().forEach((animation) => animation.cancel());
            img.style.cssText = "";
            box.replaceWith(img);
        });

        this.pages = [];
        this.target = null;
    }
}
