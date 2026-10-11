// usage: <video class="js-hls-video" data-src="name.m3u8" muted loop autoplay playsinline></video>
export class _hlsVideo {
    constructor(props) {
        this.target = props.target ?? null;
        this.src = props.src ?? this.target?.dataset.src ?? "";
        this.lazy = props.lazy ?? true;

        this.hls = null;
        this.loaded = false;
        this.destroyed = false;
        this.visible = false;
        this.retries = 0;
        this.observers = [];

        if (this.target && this.src) this.init();
    }

    init() {
        // autoplay is handled here, only while on screen and not with reduced motion
        this.autoplay = this.target.autoplay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        this.target.autoplay = false;

        // for lazy load
        if (this.lazy) {
            this.observe((visible) => visible && this.load(), "100% 0px", true);
        } else {
            this.load();
        }

        // for autoplay
        if (this.autoplay) {
            this.observe((visible) => {
                this.visible = visible;
                this.toggle();
            });

            this.onVisibility = () => this.toggle();
            document.addEventListener("visibilitychange", this.onVisibility);
        }

        // skip the gap when looping
        this.onWaiting = () => {
            const _buffered = this.target.buffered;
            if (_buffered.length && this.target.currentTime < _buffered.start(0)) this.target.currentTime = _buffered.start(0);
        };
        this.target.addEventListener("waiting", this.onWaiting);
    }

    load() {
        if (this.loaded) return;
        this.loaded = true;

        if (this.autoplay) this.target.addEventListener("canplay", () => this.toggle(), { once: true });

        // use hls.js only if MSE is supported
        const _mse = this.src.endsWith(".m3u8") && ("MediaSource" in window || "ManagedMediaSource" in window);
        if (!_mse) {
            this.target.src = this.src;
            return;
        }

        import("hls.js/light").then(({ default: Hls }) => {
            if (this.destroyed) return;

            if (!Hls.isSupported()) {
                this.target.src = this.src;
                return;
            }

            this.hls = new Hls();

            // for fatal errors
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (!data.fatal) return;

                if (this.retries++ >= 3) {
                    this.hls.destroy();
                } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    this.hls.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    this.hls.recoverMediaError();
                } else {
                    this.hls.destroy();
                }
            });

            this.hls.loadSource(this.src);
            this.hls.attachMedia(this.target);
        });
    }

    toggle() {
        if (!this.autoplay) return;

        if (this.visible && document.visibilityState === "visible") {
            this.target.play().catch(() => {});
        } else {
            this.target.pause();
        }
    }

    observe(callback, rootMargin = "0px", once = false) {
        const _observer = new IntersectionObserver(
            ([entry]) => {
                callback(entry.isIntersecting);
                if (once && entry.isIntersecting) _observer.disconnect();
            },
            { rootMargin }
        );

        _observer.observe(this.target);
        this.observers.push(_observer);
    }

    destroy() {
        this.destroyed = true;

        this.observers.forEach((observer) => observer.disconnect());
        this.observers = [];

        document.removeEventListener("visibilitychange", this.onVisibility);
        this.target.removeEventListener("waiting", this.onWaiting);

        this.hls?.destroy();
        this.hls = null;

        this.target.removeAttribute("src");
        this.target.load();
    }
}
