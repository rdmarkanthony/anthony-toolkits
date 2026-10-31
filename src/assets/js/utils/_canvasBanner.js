import { _event } from "./_event";
import { _emitter } from "./_emitter";

// usage: new _canvasBanner({ target, assets: { count, path, type, digits, size, resizeMode, step, buffer, mobile }, transition: { duration }, events })
// assets.mobile: { path, type, size, step, media }, below 768px or on media
export class _canvasBanner extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;
        this.context = this.target?.getContext("2d");

        const _mobile = props.assets?.mobile;
        const _assets = _mobile && window.matchMedia(_mobile.media ?? "(max-width: 767px)").matches ? { ...props.assets, ..._mobile } : (props.assets ?? {});

        this.image = null;
        this.assets = {
            count: _assets.count ?? 0,
            frames: [],
            list: [],
            path: _assets.path ?? "",
            type: _assets.type ?? "jpg",
            digits: _assets.digits ?? String((_assets.count ?? 1) - 1).length,
            size: _assets.size ?? [0, 0],
            resizeMode: _assets.resizeMode ?? "width", // width, height or contain
            step: Math.max(_assets.step ?? 1, 1), // 2 skips every other frame
            buffer: _assets.buffer ?? 20, // frames kept loaded around the current one
            current: 0,
            shown: -1,
        };

        this.loading = {
            queue: [],
            pending: new Set(),
            active: 0,
            concurrency: 6,
        };

        this.debug = props.debug ?? false;
        this.destroyed = false;

        this.transition = {
            duration: props.transition?.duration ?? 0,
            raf: null,
            active: false,
        };

        this.unsubscribe = [];

        if (this.target) this.init();
    }

    init() {
        for (let i = 0; i < this.assets.count; i += this.assets.step) this.assets.frames.push(i);
        if (this.assets.count && this.assets.frames.at(-1) !== this.assets.count - 1) this.assets.frames.push(this.assets.count - 1);

        this.assets.list = new Array(this.assets.frames.length).fill(null);

        this.load();

        this.unsubscribe.push(_event.observeResize(() => this.resize(), this.target.parentElement));

        this.emit("init");
    }

    update(progress = 0) {
        const _index = Math.round(Math.min(Math.max(progress, 0), 1) * (this.assets.list.length - 1));
        if (_index === this.assets.current || !this.assets.list.length) return;

        this.emit("beforeUpdate");

        this.assets.current = _index;

        this.load();
        this.show();

        if (this.debug) console.log(this);
        this.emit("afterUpdate");
    }

    show() {
        const _index = this.nearest(this.assets.current);
        if (_index < 0 || _index === this.assets.shown) return;

        const _previousImage = this.image;

        this.image = this.assets.list[_index];
        this.assets.shown = _index;

        this.fade(_previousImage, this.image);
    }

    nearest(index) {
        for (let i = 0; i < this.assets.list.length; i++) {
            if (this.assets.list[index - i]) return index - i;
            if (this.assets.list[index + i]) return index + i;
        }

        return -1;
    }

    load() {
        const { list, current, buffer } = this.assets;

        list.forEach((frame, index) => {
            if (!frame || index === this.assets.shown || Math.abs(index - current) <= buffer) return;

            frame.close?.();
            list[index] = null;
        });

        this.loading.queue = [];
        for (let i = 0; i <= buffer; i++) {
            [current + i, current - i].forEach((index) => {
                if (index < 0 || index >= list.length || list[index] || this.loading.pending.has(index) || this.loading.queue.includes(index)) return;
                this.loading.queue.push(index);
            });
        }

        this.next();
    }

    next() {
        while (this.loading.active < this.loading.concurrency && this.loading.queue.length) {
            const _index = this.loading.queue.shift();

            this.loading.active++;
            this.loading.pending.add(_index);

            this.decode(this.src(_index))
                .then((frame) => {
                    if (this.destroyed || Math.abs(_index - this.assets.current) > this.assets.buffer) return frame.close?.();

                    this.assets.list[_index] = frame;
                    this.show();
                })
                .catch(() => {})
                .finally(() => {
                    this.loading.active--;
                    this.loading.pending.delete(_index);
                    if (!this.destroyed) this.next();
                });
        }
    }

    async decode(src) {
        if (window.createImageBitmap) {
            try {
                const _response = await fetch(src);
                if (_response.ok) return await createImageBitmap(await _response.blob());
            } catch {}
        }

        const _img = new Image();
        _img.src = src;
        await _img.decode();

        return _img;
    }

    src(index) {
        return `${this.assets.path}${String(this.assets.frames[index]).padStart(this.assets.digits, "0")}.${this.assets.type}`;
    }

    fade(previousImage, nextImage) {
        cancelAnimationFrame(this.transition.raf);

        if (!this.transition.duration || !previousImage) {
            this.transition.active = false;
            this.draw(nextImage);
            return;
        }

        this.transition.active = true;

        const _start = performance.now();

        const _animate = (time) => {
            const _progress = Math.min((time - _start) / this.transition.duration, 1);

            this.draw(previousImage);
            this.draw(nextImage, _progress, false);

            if (_progress < 1) {
                this.transition.raf = requestAnimationFrame(_animate);
            } else {
                this.transition.active = false;
                this.transition.raf = null;
            }
        };

        this.transition.raf = requestAnimationFrame(_animate);
    }

    draw(image = this.image, alpha = 1, clear = true) {
        if (!image?.width) return;

        if (clear) this.context.clearRect(0, 0, this.target.width, this.target.height);

        this.context.globalAlpha = alpha;
        this.context.drawImage(image, 0, 0, this.target.width, this.target.height);
        this.context.globalAlpha = 1;
    }

    resize() {
        const _parent = this.target.parentElement;
        if (!_parent) return;

        const _style = getComputedStyle(_parent);
        const _parentWidth = _parent.clientWidth - parseFloat(_style.paddingLeft) - parseFloat(_style.paddingRight);
        const _parentHeight = _parent.clientHeight - parseFloat(_style.paddingTop) - parseFloat(_style.paddingBottom);

        const _ratio = this.assets.size[1] / this.assets.size[0];

        let _width = _parentWidth;
        if (this.assets.resizeMode === "height") _width = _parentHeight / _ratio;
        if (this.assets.resizeMode === "contain") _width = Math.min(_parentWidth, _parentHeight / _ratio);

        const _height = _width * _ratio;
        if (!_width) return;

        this.target.style.width = `${_width}px`;
        this.target.style.height = `${_height}px`;

        const _scale = Math.min(window.devicePixelRatio || 1, this.assets.size[0] / _width);
        const _canvasWidth = Math.round(_width * _scale);
        const _canvasHeight = Math.round(_height * _scale);

        if (this.target.width !== _canvasWidth || this.target.height !== _canvasHeight) {
            this.target.width = _canvasWidth;
            this.target.height = _canvasHeight;

            if (!this.transition.active) this.draw();
        }

        this.emit("resize");
    }

    destroy() {
        this.destroyed = true;
        cancelAnimationFrame(this.transition.raf);
        this.loading.queue = [];
        this.assets.list.forEach((frame) => frame?.close?.());
        this.assets.list = [];
        this.image = null;
        this.unsubscribe.forEach((off) => off());
        this.unsubscribe = [];
        this.listeners = {};
    }
}
