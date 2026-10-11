import { _event } from "./_event";
import { _emitter } from "./_emitter";
import { _players, _pauseAll, _cover } from "./_media";

export class _videoPlayer extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;
        this.src = props.src ?? null;

        if (!this.target && !this.src) return;

        this.el = {
            video: document.createElement("video"),
        };

        this.autoplay = props.autoplay ?? false;
        this.controls = props.controls || !this.autoplay;
        this.stretch = props.stretch ?? false;

        this.isPlaying = false;

        this.debug = props.debug ?? false;

        this.init();
    }

    init() {
        this.emit("beforeInit");

        _players.push(this);

        this.target.appendChild(this.el.video);
        this.el.video.style.position = "absolute";
        this.el.video.style.top = 0;
        this.el.video.style.left = 0;
        this.el.video.style.width = "100%";
        this.el.video.style.maxWidth = "inherit";
        this.el.video.style.height = "100%";

        this.el.video.controls = this.controls;
        this.el.video.muted = this.autoplay; // if muted & autoplay
        this.el.video.loop = this.autoplay;
        this.el.video.autoplay = this.autoplay;

        this.el.video.playsInline = true; // enable inline playback
        this.el.video.setAttribute("playsinline", "");
        this.el.video.setAttribute("webkit-playsinline", "");

        // m3u8: hls.js where MSE is supported, loaded only when needed (the same chunk as _hlsVideo)
        if (this.src.endsWith(".m3u8") && ("MediaSource" in window || "ManagedMediaSource" in window)) {
            import("hls.js/light").then(({ default: Hls }) => {
                if (!Hls.isSupported()) {
                    this.el.video.src = this.src;
                    return;
                }

                this.hls = new Hls();
                this.hls.loadSource(this.src);
                this.hls.attachMedia(this.el.video);
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (this.autoplay) this.el.video.play();
                });
            });
        } else {
            // standard, or m3u8 played natively (e.g. iOS Safari)
            this.el.video.src = this.src;
        }

        this.el.video.addEventListener("play", () => {
            this.target.classList.add("video-playing");
            this.target.classList.remove("video-paused", "video-ended");

            if (!this.autoplay) _pauseAll(this);

            this.emit("play");
        });
        this.el.video.addEventListener("pause", () => {
            this.target.classList.add("video-paused");
            this.target.classList.remove("video-playing", "video-ended");

            this.emit("pause");
        });
        this.el.video.addEventListener("ended", () => {
            this.target.classList.add("video-ended");
            this.target.classList.remove("video-playing", "video-paused");

            this.emit("ended");
        });

        if (this.stretch) {
            if (getComputedStyle(this.target).overflow === "visible") this.target.style.overflow = "hidden";

            _event.resize(() => this.resize());
        }

        this.emit("afterInit");
    }

    resize() {
        if (this.stretch) _cover(this.target, this.el.video);
    }

    static pauseAll(currentPlayer) {
        _pauseAll(currentPlayer);
    }
}
