// libraries
import { gsap } from "gsap";
import { DateTime } from "luxon";
import flatpickr from "flatpickr";

// utils, each one also works on its own: copy it with the files it imports
import { _event } from "./utils/_event";
import { _filter } from "./utils/_filter";
import { _inview } from "./utils/_inview";
import { _splitText } from "./utils/_splitText";
import { _animate } from "./utils/_animate";
import { _animatedNumber } from "./utils/_animatedNumber";
import { _rollingNumber } from "./utils/_rollingNumber";
import { _typing } from "./utils/_typing";
import { _countdownTimer } from "./utils/_countdownTimer";
import { _tabs } from "./utils/_tabs";
import { _groupHeight } from "./utils/_groupHeight";
import { _lightbox } from "./utils/_lightbox";
import { _videoPlayer } from "./utils/_videoPlayer";
import { _youtubePlayer } from "./utils/_youtubePlayer";
import { _hlsVideo } from "./utils/_hlsVideo";
import { _autoScroll } from "./utils/_autoScroll";
import { _parallax, _parallaxScroller, _parallaxBackground, _parallaxFloating } from "./utils/_parallax";
import { _canvasBanner } from "./utils/_canvasBanner";

// expose for inline scripts, each page sets up its own components
Object.assign(window, {
    gsap,
    DateTime,
    flatpickr,
    _event,
    _filter,
    _inview,
    _splitText,
    _animate,
    _animatedNumber,
    _rollingNumber,
    _typing,
    _countdownTimer,
    _tabs,
    _groupHeight,
    _lightbox,
    _videoPlayer,
    _youtubePlayer,
    _hlsVideo,
    _autoScroll,
    _parallax,
    _parallaxScroller,
    _parallaxBackground,
    _parallaxFloating,
    _canvasBanner,
});

class _projName {
    constructor(props) {
        if (window._projName) return;
        window._projName = this;

        this.debug = props.debug || false;

        this.el = {
            header: document.querySelector(".header-content"),
            footer: document.querySelector(".footer-content"),
            main: document.querySelector(".main-content"),
        };

        this.headerHeight = 0;
        this.footerHeight = 0;

        this.init();
    }

    init() {
        // for resize
        _event.resize(() => this.resize());

        // component search
        _filter.init();

        if (this.debug) console.log("_projName", this);
    }

    resize() {
        this.headerHeight = this.el.header?.offsetHeight ?? 0;
        document.body.style.setProperty("--header-height", `${this.headerHeight}px`);

        this.footerHeight = this.el.footer?.offsetHeight ?? 0;
        document.body.style.setProperty("--footer-height", `${this.footerHeight}px`);
    }
}

// modules run after the html is parsed, and before the inline page scripts,
// so --header-height is set before the components measure
new _projName({ debug: true });
