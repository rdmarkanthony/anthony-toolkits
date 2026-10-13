import { _event } from "./_event";
import { _emitter } from "./_emitter";
import { _players, _pauseAll, _cover } from "./_media";

const _youtubeAPI = () => {
    if (typeof window.onYouTubeIframeAPIReady !== "undefined") return;

    const _tag = document.createElement("script");
    _tag.src = "https://www.youtube.com/iframe_api";

    document.head.appendChild(_tag);

    window.onYouTubeIframeAPIReady = () => {
        _players.forEach((item) => item.generate?.());
    };
};

export class _youtubePlayer extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;
        this.id = props.id ?? null;

        if (!this.target && !this.id) return;

        this.player = null;

        this.el = {
            player: this.target.querySelector(".js-yt-player") ?? document.createElement("div"),
        };

        this.autoplay = props.autoplay ?? false;
        this.controls = props.controls !== undefined ? (props.controls ? 1 : 0) : 1;
        this.stretch = props.stretch ?? false;

        this.revealDelay = props.revealDelay ?? 4500;
        this.timers = {};

        this.isPlaying = false;

        this.debug = props.debug ?? false;

        this.init();
    }

    init() {
        this.emit("beforeInit");

        _players.push(this);
        _youtubeAPI();

        if (!this.target.contains(this.el.player)) {
            this.target.appendChild(this.el.player);
            this.el.player.classList.add("js-yt-player");
            this.el.player.style.position = "absolute";
            this.el.player.style.top = 0;
            this.el.player.style.left = 0;
            this.el.player.style.width = `100%`;
            this.el.player.style.height = `100%`;
        }

        this.emit("afterInit");

        if (this.debug) console.log("_youtubePlayer", this);
    }

    generate() {
        this.emit("beforeReady");

        this.player = new YT.Player(this.el.player, {
            videoId: this.id,
            playerVars: {
                playsinline: 1,
                autoplay: this.autoplay ? 1 : 0,
                mute: this.autoplay ? 1 : 0,
                controls: this.controls,
                showinfo: 0,
                modestbranding: 1,
                rel: 0,
                disablekb: this.autoplay ? 1 : 0,
                fs: this.autoplay ? 0 : 1,
                iv_load_policy: this.autoplay ? 3 : 1,
            },
            events: {
                onReady: (event) => {
                    this.emit("onReady");
                },
                onStateChange: (event) => {
                    if (event.data === 1) {
                        this.target.classList.add("video-playing");
                        this.target.classList.remove("video-paused", "video-ended");
                    } else if (event.data === 2) {
                        this.target.classList.add("video-paused");
                        this.target.classList.remove("video-playing", "video-ended");
                    } else if (event.data === 0) {
                        this.target.classList.add("video-ended");
                        this.target.classList.remove("video-playing", "video-paused");
                    }

                    if (this.autoplay) this.background(event.data);

                    // pause other playing video
                    if (event.data === 1) {
                        this.isPlaying = true;
                        if (!this.autoplay) _pauseAll(this);
                    } else {
                        this.isPlaying = false;
                    }

                    this.emit("onStateChange");
                },
            },
        });

        // the api replaces the placeholder div with an iframe
        if (this.player.getIframe) this.el.player = this.player.getIframe();

        // autoplay vids are backgrounds; block hover/click ui and tab focus
        if (this.autoplay) {
            this.el.player.style.pointerEvents = "none";
            this.el.player.setAttribute("tabindex", "-1");
            this.el.player.style.opacity = 0;
        }

        if (this.stretch) {
            if (getComputedStyle(this.target).overflow === "visible") this.target.style.overflow = "hidden";

            _event.resize(() => this.resize());
        }

        this.emit("afterReady");
    }

    // autoplay vids: hide captions and youtube's ui, loop manually
    background(state) {
        clearTimeout(this.timers.reveal);
        clearTimeout(this.timers.loop);

        if (state === 1) {
            this.player.unloadModule?.("captions");
            this.player.unloadModule?.("cc");

            // youtube shows its ui for a few secs after playing starts or seeks
            this.timers.reveal = setTimeout(() => this.fade(true), this.revealDelay);

            // fade out before the end
            const _remaining = (this.player.getDuration() - this.player.getCurrentTime()) * 1000;
            this.timers.loop = setTimeout(() => this.fade(false), _remaining - 1000);
        } else {
            // hide right away
            this.el.player.style.transition = "none";
            this.el.player.style.opacity = 0;

            if (state === 0) {
                this.player.seekTo(0);
                this.player.playVideo();
            }
        }
    }

    fade(show) {
        this.el.player.style.transition = "opacity 0.8s";
        this.el.player.style.opacity = show ? "" : 0;
    }

    resize() {
        if (this.stretch) _cover(this.target, this.el.player);
    }

    static pauseAll(currentPlayer) {
        _pauseAll(currentPlayer);
    }
}
