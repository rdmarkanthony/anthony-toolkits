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

        this.poster = props.poster ?? null;
        this.autoplay = props.autoplay ?? false;
        this.controls = props.controls || !this.autoplay;
        this.stretch = props.stretch ?? false;

        this.isPlaying = false;
        this.isLoading = true;
        this.isSilent = this.autoplay;

        this.debug = props.debug ?? false;
        this.abort = new AbortController();

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

        this.el.video.preload = "metadata";
        this.el.video.controls = this.controls;
        this.el.video.muted = this.autoplay; // if muted & autoplay
        this.el.video.defaultMuted = this.autoplay;
        this.el.video.loop = this.autoplay;
        this.el.video.autoplay = this.autoplay;
        if (this.poster) this.el.video.poster = this.poster;

        this.el.video.playsInline = true; // enable inline playback
        this.el.video.setAttribute("playsinline", "");
        this.el.video.setAttribute("webkit-playsinline", "");

        // m3u8: hls.js where MSE is supported, loaded only when needed (the same chunk as _hlsVideo)
        if (this.src.endsWith(".m3u8") && ("MediaSource" in window || "ManagedMediaSource" in window)) {
            import("hls.js/light").then(({ default: Hls }) => {
                if (!this.el) return; // destroyed while loading

                if (!Hls.isSupported()) {
                    this.el.video.src = this.src;
                    return;
                }

                this.hls = new Hls();
                this.hls.loadSource(this.src);
                this.hls.attachMedia(this.el.video);
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (this.autoplay) this.play();
                });
            });
        } else {
            // standard, or m3u8 played natively (e.g. iOS Safari)
            this.el.video.src = this.src;
        }

        const _on = (name, callback) => this.el.video.addEventListener(name, callback, { signal: this.abort.signal });

        // states on the target: video-loading, video-canplay, video-playing, video-paused, video-ended, sound-on, sound-off
        _on("loadstart", () => {
            this.isLoading = true;
            this.target.classList.add("video-loading");
            this.emit("loadstart");
        });
        _on("waiting", () => this.emit("loading"));
        _on("canplay", () => {
            this.isLoading = false;
            this.target.classList.remove("video-loading");
            this.target.classList.add("video-canplay");
            this.emit("canplay");
        });
        _on("playing", () => {
            this.target.classList.remove("video-canplay");
            this.emit("playing");
        });
        _on("play", () => {
            this.isPlaying = true;
            this.target.classList.add("video-playing");
            this.target.classList.remove("video-paused", "video-ended");

            if (!this.isSilent) _pauseAll(this);

            this.emit("play");
        });
        _on("pause", () => {
            this.isPlaying = false;
            this.target.classList.add("video-paused");
            this.target.classList.remove("video-playing", "video-ended");

            this.emit("pause");
        });
        _on("ended", () => {
            this.isPlaying = false;
            this.target.classList.add("video-ended");
            this.target.classList.remove("video-playing", "video-paused");

            this.emit("ended");
        });
        // unmuting a muted video makes it pause the others too
        _on("volumechange", () => {
            this.updateSound();
            if (!this.isSilent && !this.el.video.paused) _pauseAll(this);
        });

        this.updateSound();

        if (this.stretch) {
            if (getComputedStyle(this.target).overflow === "visible") this.target.style.overflow = "hidden";

            this.offResize = _event.resize(() => this.resize());
        }

        this.emit("afterInit");
    }

    updateSound() {
        this.isSilent = this.el.video.muted || this.el.video.volume === 0;

        this.target.classList.toggle("sound-off", this.isSilent);
        this.target.classList.toggle("sound-on", !this.isSilent);
    }

    resize() {
        if (this.stretch) _cover(this.target, this.el.video);
    }

    play() {
        // a rejected play() (autoplay blocked) is not an error here
        return this.el.video.play()?.catch(() => {}) ?? Promise.resolve();
    }

    pause() {
        this.el.video.pause();
    }

    destroy() {
        if (!this.el) return;

        this.abort.abort();
        this.offResize?.();

        if (this.plyr) {
            // Plyr puts back a copy of the video, remove that too
            const _copy = this.plyr.elements.original;
            this.plyr.destroy(() => {
                _copy.removeAttribute("src");
                _copy.remove();
            });
        }
        this.hls?.destroy();

        this.el.video.pause();
        this.el.video.removeAttribute("src");
        this.el.video.load();
        this.el.video.remove();

        if (_players.includes(this)) _players.splice(_players.indexOf(this), 1);

        this.emit("destroy");

        this.el = null;
    }

    static pauseAll(currentPlayer) {
        _pauseAll(currentPlayer);
    }
}
