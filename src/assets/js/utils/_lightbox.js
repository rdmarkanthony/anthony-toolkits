import { _event } from "./_event";
import { _emitter } from "./_emitter";

// usage: new _lightbox({ target, modal, close, animation, events }), target is the element or selector to show
// content moves in and back on close, a modal opens on top
// close: "page" (default) or "inside" puts the X on the content's corner
// closing: lightbox.hide(), _lightbox.close() for the latest, _lightbox.close("all")
export class _lightbox extends _emitter {
    constructor(props) {
        super(props.events);

        if (!window._lightboxList) window._lightboxList = []; // the open lightboxes

        this.modal = props.modal || false;
        this.close = props.close || "page";

        this.target = "";
        this.el = {
            cover: "",
            main: "",
            btn: {
                close: "",
            },
        };
        this.content = {
            parent: "",
            original: "",
        };

        this.animation = props.animation || "zoom";
        this.animating = false;

        if (this.isInLightbox(props.target)) return; // already open

        this.init(props);
    }

    isInLightbox(target) {
        const _target = typeof target === "string" ? document.querySelector(target) : target;
        if (!_target) return false;

        return window._lightboxList.some((lightbox) => lightbox.content.original === _target);
    }

    init(props) {
        this.style();

        if (!this.modal && window._lightboxList) {
            window._lightboxList.forEach((item) => {
                item.hide();
            });
        }

        this.target = document.createElement("div");
        this.target.classList.add("js-lightbox", "z-[500]", "fixed", "top-0", "left-0", "w-full", "h-full");
        document.body.appendChild(this.target);

        this.el.cover = document.createElement("div");
        this.el.cover.classList.add("js-lightbox-cover", "z-[1]", "fixed", "top-0", "left-0", "w-full", "h-full", "bg-black/50");

        this.target.appendChild(this.el.cover);

        this.el.main = document.createElement("div");
        this.el.main.classList.add("js-lightbox-main", "z-[2]", "fixed", "top-0", "left-0", "w-full", "h-full", "p-4", "pt-16", "xl:p-10", "xl:pt-16", "overflow-auto", "scrolling-touch", "[.lightbox-short_&]:flex", "[.lightbox-short_&]:items-center", "[.lightbox-short_&]:justify-center");
        this.target.appendChild(this.el.main);

        if (props.target) {
            const _target = typeof props.target === "string" ? document.querySelector(props.target) : props.target;

            if (_target) {
                this.content.parent = _target.parentNode;
                this.content.original = _target;
            }
        }

        if (!this.content.original) {
            this.content.original = document.createElement("div");
            this.content.original.classList.add("lightbox-content", "relative", "container", "max-w-[30rem]", "mx-auto", "px-8", "py-12", "rounded-2xl", "bg-white", "shadow-[0_26px_30px_rgba(0,0,0,0.05)]");
            this.content.original.innerHTML = '<div class="section-par text-center"><h3>Lightbox content not found!</h3></div>';
        }

        this.el.main.appendChild(this.content.original);
        this.content.original.classList.add("js-lightbox-center", "relative");

        if (!this.modal) {
            this.createCloseButton();
            this.onKeydown = this.handleEscapeKey.bind(this);
            document.addEventListener("keydown", this.onKeydown);
        }

        this.offResize = _event.resize(() => this.resize());

        this.emit("beforeShow");

        this.show();
        window._lightboxList.push(this);

        // for scripts that didn't open it, e.detail is this lightbox
        _event.dispatch(window, "lightboxReady", this);
    }

    createCloseButton() {
        this.el.btn.close = document.createElement("a");
        this.el.btn.close.classList.add("js-lightbox-btn", "btn-close", "z-[3]", "block", "absolute", "top-0", "right-0", "p-4", "hover:text-red-500", "transition-colors", "duration-200");
        this.el.btn.close.href = "#";
        this.el.btn.close.innerHTML = `<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.207 6.207a1 1 0 0 0-1.414-1.414L12 10.586 6.207 4.793a1 1 0 0 0-1.414 1.414L10.586 12l-5.793 5.793a1 1 0 1 0 1.414 1.414L12 13.414l5.793 5.793a1 1 0 0 0 1.414-1.414L13.414 12l5.793-5.793z" fill="currentColor"/></svg>`;

        // inside: on the content's corner, page: scrolls with long content, fixed on xl
        if (this.close === "inside") {
            this.el.btn.close.classList.add("text-gray-950");
            this.content.original.appendChild(this.el.btn.close);
        } else {
            this.el.btn.close.classList.add("xl:fixed", "text-white");
            this.el.main.appendChild(this.el.btn.close);
        }

        this.el.btn.close.addEventListener("click", (e) => {
            e.preventDefault();
            this.hide();
        });
    }

    handleEscapeKey(event) {
        if (!this.target) return;
        if (event.key === "Escape" || event.keyCode === 27) {
            if (window._lightboxList[window._lightboxList.length - 1] === this) this.hide();
        }
    }

    // short content is centered, long content scrolls
    resize() {
        const _mainStyle = getComputedStyle(this.el.main);
        const _mainHeight = this.el.main.offsetHeight - (parseFloat(_mainStyle.paddingTop) + parseFloat(_mainStyle.paddingBottom));

        this.target.classList.toggle("lightbox-short", this.content.original.offsetHeight < _mainHeight);

        this.emit("resize");
    }

    show(status, callback, delay = null) {
        if (this.animating) return;
        this.animating = true;

        document.body.classList.add("lightbox-active");
        this.target.classList.add("lightbox-visible");

        if (this.animation !== "none") {
            this.el.cover.classList.add("lightbox-animate", "lightbox-fadeIn");

            this.content.original.classList.add("lightbox-animate");
            if (this.animation === "fade") this.content.original.classList.add("lightbox-fadeIn");
            if (this.animation === "fadeUp") this.content.original.classList.add("lightbox-fadeInUp");
            if (this.animation === "zoom") this.content.original.classList.add("lightbox-zoomIn");

            if (this.el.btn.close) this.el.btn.close.classList.add("lightbox-animate", "lightbox-fadeIn");
        }

        const _style = getComputedStyle(this.content.original);
        const _animationDuration = parseFloat(_style.animationDuration) + parseFloat(_style.animationDelay);

        setTimeout(
            () => {
                if (!this.target) return; // destroyed meanwhile

                this.el.cover.classList.remove("lightbox-animate", "lightbox-fadeIn");
                this.content.original.classList.remove("lightbox-animate", "lightbox-fadeIn", "lightbox-fadeInUp", "lightbox-zoomIn");
                if (this.el.btn.close) this.el.btn.close.classList.remove("lightbox-animate", "lightbox-fadeIn");

                this.animating = false;

                this.emit("afterShow");
            },
            Math.max(delay ? delay : (_animationDuration ? _animationDuration : 0) * 1000, 0)
        );
    }

    hide(status, callback, delay = null) {
        // before the animating check, so the others still close
        if (status === "all") {
            _lightbox.close("all");
            return;
        }

        if (!this.target || this.animating) return;
        this.animating = true;

        this.emit("beforeClose");

        this.target.classList.remove("lightbox-visible");
        this.target.classList.add("lightbox-hiding");

        if (this.animation !== "none") {
            this.el.cover.classList.add("lightbox-animate", "lightbox-fadeOut");

            this.content.original.classList.add("lightbox-animate");
            if (this.animation === "fade") this.content.original.classList.add("lightbox-fadeOut");
            if (this.animation === "fadeUp") this.content.original.classList.add("lightbox-fadeOutDown");
            if (this.animation === "zoom") this.content.original.classList.add("lightbox-zoomOut");

            if (this.el.btn.close) this.el.btn.close.classList.add("lightbox-animate", "lightbox-fadeOut");
        }

        const _style = getComputedStyle(this.content.original);
        const _animationDuration = parseFloat(_style.animationDuration) + parseFloat(_style.animationDelay);

        setTimeout(
            () => {
                if (!this.target) return; // destroyed meanwhile

                this.destroy();

                this.animating = false;

                this.emit("afterClose");
            },
            Math.max(delay ? delay : (_animationDuration ? _animationDuration : 0) * 1000, 0)
        );

        if (callback) callback(this);
    }

    // remove it now, without the animation, and put the content back
    destroy() {
        if (!this.target) return; // already gone

        if (this.close === "inside") this.el.btn.close?.remove(); // not left in the content
        this.content.original.classList.remove("js-lightbox-center", "lightbox-animate", "lightbox-fadeIn", "lightbox-fadeInUp", "lightbox-zoomIn", "lightbox-fadeOut", "lightbox-fadeOutDown", "lightbox-zoomOut");
        if (this.content.parent) this.content.parent.appendChild(this.content.original);

        window._lightboxList = window._lightboxList.filter((lightbox) => lightbox !== this);
        this.target.remove();
        this.target = null;

        this.offResize?.();
        if (this.onKeydown) document.removeEventListener("keydown", this.onKeydown);

        if (window._lightboxList.length === 0) document.body.classList.remove("lightbox-active");
    }

    // the latest lightbox, or "all"
    static close(status) {
        [...window._lightboxList].forEach((item, index, arr) => {
            if (status === "all" || index === arr.length - 1) item.hide();
        });
    }

    style() {
        let _style = document.querySelector(".js-lightbox-style");
        if (!_style) {
            _style = document.createElement("style");
            _style.classList.add("js-lightbox-style");
            document.head.appendChild(_style);

            _style.innerHTML =
                `.lightbox-active { overflow: hidden; }` +
                // Chrome can draw a page video through a video in the lightbox
                `.lightbox-active video:not(.js-lightbox video) { visibility: hidden; }` +
                `.scrolling-touch { overflow-scrolling: touch; -webkit-overflow-scrolling: touch; }` +
                `.lightbox-animate { animation-duration: 0.5s; animation-timing-function: cubic-bezier(0.5, 0, 0, 1.25); animation-fill-mode: forwards; }` +
                `.lightbox-fadeIn { animation-name: lightBoxFadeIn; animation-timing-function: ease; }` +
                `.lightbox-fadeOut { animation-name: lightBoxFadeOut; animation-timing-function: ease; }` +
                `.lightbox-fadeInUp { animation-name: lightBoxFadeInUp; }` +
                `.lightbox-fadeOutDown { animation-name: lightBoxFadeOutDown; }` +
                `.lightbox-zoomIn { animation-name: lightBoxZoomIn; }` +
                `.lightbox-zoomOut { animation-name: lightBoxZoomOut; }` +
                `@keyframes lightBoxFadeIn { 0% { opacity: 0; } 100% { opacity: 1; }}` +
                `@keyframes lightBoxFadeOut { 0% { opacity: 1; } 100% { opacity: 0; }}` +
                `@keyframes lightBoxFadeInUp { 0% { opacity: 0; transform: translate3d(0, 100%, 0); } 100% { opacity: 1; transform: translateZ(0); }}` +
                `@keyframes lightBoxFadeOutDown { 0% { opacity: 1; } 100% { opacity: 0; transform: translate3d(0, 100%, 0); }}` +
                `@keyframes lightBoxZoomIn { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); }}` +
                `@keyframes lightBoxZoomOut { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.8); }}`;
        }
    }
}
