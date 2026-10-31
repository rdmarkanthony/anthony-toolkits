import { _emitter } from "./_emitter";
import { _event } from "./_event";
import { _inview } from "./_inview";

// three.js, loaded on first use so other pages don't download it
const _importThree = () => import("three");

// usage: new _threeBackground({ target, effect: _threeParticles(), pixelRatio: 2, events })
// a canvas behind the target's content, runs only in view, one still frame with reduced motion
// an effect is { setup, update, resize, destroy }, each gets this instance
export class _threeBackground extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.effect = props.effect ?? {};
        this.pixelRatio = props.pixelRatio ?? 2;

        this.three = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;

        this.pointer = { x: 0, y: 0, inside: false };
        this.progress = 0;
        this.size = { width: 0, height: 0 };
        this.view = { width: 0, height: 0 };
        this.time = 0;
        this.delta = 0;
        this.last = 0;

        this.paused = false;
        this.visible = false;
        this.running = false;
        this.destroyed = false;
        this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

        this.abort = new AbortController();
        this.inview = null;
        this.styles = {};
        this.resize = () => this.measure();
        this.scroll = () => this.measureScroll();

        this.ready = this.target ? this.init() : Promise.resolve(this);
    }

    async init() {
        const THREE = await _importThree();
        if (this.destroyed) return this;

        const _signal = { signal: this.abort.signal };

        this.three = THREE;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.z = 10;

        const _canvas = this.renderer.domElement;
        _canvas.setAttribute("aria-hidden", "true");
        Object.assign(_canvas.style, { position: "absolute", inset: "0", zIndex: "-1", display: "block", width: "100%", height: "100%", pointerEvents: "none" });

        this.styles = { position: this.target.style.position, isolation: this.target.style.isolation };
        if (getComputedStyle(this.target).position === "static") this.target.style.position = "relative";
        this.target.style.isolation = "isolate";
        this.target.prepend(_canvas);

        this.effect.setup?.(this);

        _event.observeResize(this.resize, this.target);
        _event.scroll(this.scroll);

        window.addEventListener("pointermove", (e) => this.measurePointer(e), { ..._signal, passive: true });
        window.addEventListener("pointerup", (e) => e.pointerType === "touch" && (this.pointer.inside = false), _signal);
        document.documentElement.addEventListener("pointerleave", () => (this.pointer.inside = false), _signal);
        document.addEventListener("visibilitychange", () => this.loop(), _signal);
        this.reduced.addEventListener("change", () => this.loop(), _signal);

        this.inview = new _inview({
            target: this.target,
            observeOnce: false,
            callback: (instance) => {
                this.visible = instance.visible;
                this.loop();
            },
        });

        this.emit("ready");
        return this;
    }

    measure() {
        const _width = this.target.clientWidth;
        const _height = this.target.clientHeight;
        if (!_width || !_height) return;

        this.size = { width: _width, height: _height };
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatio));
        this.renderer.setSize(_width, _height, false);

        this.camera.aspect = _width / _height;
        this.camera.updateProjectionMatrix();

        const _viewHeight = 2 * Math.tan(this.three.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z;
        this.view = { width: _viewHeight * this.camera.aspect, height: _viewHeight };

        this.effect.resize?.(this);
        this.emit("resize");

        if (!this.running) this.render();
    }

    measureScroll() {
        const _rect = this.target.getBoundingClientRect();
        this.progress = Math.min(Math.max((window.innerHeight - _rect.top) / (window.innerHeight + _rect.height), 0), 1);
    }

    measurePointer(e) {
        const _rect = this.target.getBoundingClientRect();

        this.pointer.x = ((e.clientX - _rect.left) / _rect.width) * 2 - 1;
        this.pointer.y = -((e.clientY - _rect.top) / _rect.height) * 2 + 1;
        this.pointer.inside = Math.abs(this.pointer.x) <= 1 && Math.abs(this.pointer.y) <= 1;
    }

    loop() {
        const _run = !this.paused && this.visible && !document.hidden && !this.reduced.matches;
        if (_run === this.running) return;

        this.running = _run;
        this.last = 0;
        this.renderer.setAnimationLoop(_run ? (now) => this.frame(now) : null);

        this.emit(_run ? "play" : "pause");
    }

    frame(now) {
        this.delta = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0;
        this.last = now;
        this.time += this.delta;

        this.render();
    }

    render() {
        this.effect.update?.(this);
        this.renderer.render(this.scene, this.camera);
        this.emit("frame");
    }

    play() {
        this.paused = false;
        if (this.renderer) this.loop();
    }

    pause() {
        this.paused = true;
        if (this.renderer) this.loop();
    }

    destroy() {
        this.destroyed = true;
        this.abort.abort();
        if (!this.renderer) return;

        this.renderer.setAnimationLoop(null);
        this.inview.destroy();
        _event.offObserveResize(this.resize, this.target);
        _event.offScroll(this.scroll);

        this.effect.destroy?.(this);
        this.scene.traverse((object) => {
            object.geometry?.dispose();
            [object.material].flat().forEach((material) => material?.dispose());
        });

        this.renderer.dispose();
        this.renderer.domElement.remove();
        Object.assign(this.target.style, this.styles);
    }
}
