// libraries
import { gsap } from "gsap";
import { DateTime } from "luxon";
import flatpickr from "flatpickr";

// utils, each one also works on its own: copy it with the files it imports
import { _event } from "./utils/_event";
import { _enquire } from "./utils/_enquire";
import { _emitter } from "./utils/_emitter";
import { _filter } from "./utils/_filter";
import { _autocomplete } from "./utils/_autocomplete";
import { _inview } from "./utils/_inview";
import { _splitText } from "./utils/_splitText";
import { _animate } from "./utils/_animate";
import { _animatedNumber } from "./utils/_animatedNumber";
import { _rollingNumber } from "./utils/_rollingNumber";
import { _typing } from "./utils/_typing";
import { _countdownTimer } from "./utils/_countdownTimer";
import { _tabs } from "./utils/_tabs";
import { _hoverIndicator } from "./utils/_hoverIndicator";
import { _accordion } from "./utils/_accordion";
import { _groupHeight } from "./utils/_groupHeight";
import { _lightbox } from "./utils/_lightbox";
import { _lazyLoad } from "./utils/_lazyLoad";
import { _selectBox } from "./utils/_selectBox";
import { _videoPlayer } from "./utils/_videoPlayer";
import { _plyr } from "./utils/_plyr";
import { _youtubePlayer } from "./utils/_youtubePlayer";
import { _hlsVideo } from "./utils/_hlsVideo";
import { _autoScroll, _autoScrollHash } from "./utils/_autoScroll";
import { _parallax, _parallaxScroller, _parallaxBackground, _parallaxFloating } from "./utils/_parallax";
import { _canvasBanner } from "./utils/_canvasBanner";
import { _themeScroller } from "./utils/_themeScroller";
import { _googleMap } from "./utils/_googleMap";
import { _qrCode } from "./utils/_qrCode";
import { _peekSlider } from "./utils/_peekSlider";
import { _snapSlider } from "./utils/_snapSlider";
import { _horizontalLoop } from "./utils/_horizontalLoop";
import { _comicSlider } from "./utils/_comicSlider";

// expose for inline scripts, each page sets up its own components
Object.assign(window, {
    gsap,
    DateTime,
    flatpickr,
    _event,
    _enquire,
    _emitter,
    _filter,
    _autocomplete,
    _inview,
    _splitText,
    _animate,
    _animatedNumber,
    _rollingNumber,
    _typing,
    _countdownTimer,
    _tabs,
    _hoverIndicator,
    _accordion,
    _groupHeight,
    _lightbox,
    _lazyLoad,
    _selectBox,
    _videoPlayer,
    _plyr,
    _youtubePlayer,
    _hlsVideo,
    _autoScroll,
    _autoScrollHash,
    _parallax,
    _parallaxScroller,
    _parallaxBackground,
    _parallaxFloating,
    _canvasBanner,
    _themeScroller,
    _googleMap,
    _qrCode,
    _peekSlider,
    _snapSlider,
    _horizontalLoop,
    _comicSlider,
});

// modules run after the html is parsed, and before the inline page scripts,
// so --header-height is set before the components measure
const _header = document.querySelector(".header-content");
const _footer = document.querySelector(".footer-content");

_event.resize(() => {
    document.body.style.setProperty("--header-height", `${_header?.offsetHeight ?? 0}px`);
    document.body.style.setProperty("--footer-height", `${_footer?.offsetHeight ?? 0}px`);
});

// before the page scripts read the hash
_autoScrollHash();

// starter kit popup, from the header links or /#starter-kit
document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-starter-open]")) return;
    e.preventDefault();
    new _lightbox({ target: "#starter-kit" });
});
if (location.hash === "#starter-kit") new _lightbox({ target: "#starter-kit" });

document.querySelector("[data-starter-copy]")?.addEventListener("click", async (e) => {
    const _button = e.currentTarget;
    await navigator.clipboard.writeText(document.querySelector("[data-starter-files] code").textContent);
    _button.textContent = "Copied";
    setTimeout(() => (_button.textContent = "Copy file list"), 2000);
});

// smooth scroll for links with data-auto-scroll to a section of the same page, "#" goes to the top
document.addEventListener("click", (e) => {
    const _link = e.target.closest("a[data-auto-scroll]");
    if (!_link) return;

    const _url = new URL(_link.href);
    if (_url.pathname !== location.pathname) return;

    const _target = _url.hash.length > 1 ? document.getElementById(_url.hash.slice(1)) : document.body;
    if (!_target) return;

    e.preventDefault();
    _autoScroll({ target: _target });
});

// header and home search: a suggestion opens its component, Enter without one goes to /?q=
// same match as the home filter, so suggestions and results agree
const _searchItems = JSON.parse(document.getElementById("search-items")?.textContent ?? "[]");
const _escapeHTML = (text) => String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

document.querySelectorAll("[data-search]").forEach((form) => {
    // the home results are right below, so no "See all" or empty message
    const _onHome = form.hasAttribute("data-home-search");

    new _autocomplete({
        input: form.querySelector("[data-search-input]"),
        list: form.querySelector("[data-search-list]"),
        items: _searchItems,
        match: (item, query) => _filter.match(item.text, query),
        render: (item) => `<span class="font-medium">${_escapeHTML(item.label)}</span><span class="shrink-0 text-sm whitespace-nowrap text-kit-muted">${_escapeHTML(item.category)}</span>`,
        more: _onHome ? null : (value, total) => ({ url: `/?q=${encodeURIComponent(value)}`, html: `<span class="font-medium text-kit-accent">See all ${total} results</span>` }),
        empty: _onHome ? null : (value) => `<p class="px-4 py-3 text-kit-muted">No components match “${_escapeHTML(value)}”.</p>`,
        optionClass: "flex items-baseline justify-between gap-4 rounded-2xl px-4 py-3 transition-colors duration-200 aria-selected:bg-kit-surface",
    });
});

// sliding menu below lg, the rest of the page is inert while it's open
const _menu = document.querySelector("[data-mobile-menu]");
const _menuButton = document.querySelector("[data-mobile-menu-open]");
const _pageParts = [_header, document.querySelector(".main-content"), _footer].filter(Boolean);

const _toggleMenu = (open) => {
    if (!_menu || open === _menu.hasAttribute("data-open")) return;

    _menu.toggleAttribute("data-open", open);
    _menuButton.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("overflow-hidden", open);
    _pageParts.forEach((part) => (part.inert = open));

    // the close button, not the search, so the phone keyboard doesn't cover the menu
    (open ? _menu.querySelector("button[data-mobile-menu-close]") : _menuButton).focus({ preventScroll: true });
};

if (_menu) {
    _menuButton.addEventListener("click", () => _toggleMenu(true));
    _menu.addEventListener("click", (e) => e.target.closest("[data-mobile-menu-close], a") && _toggleMenu(false));
    document.addEventListener("keydown", (e) => e.key === "Escape" && !e.defaultPrevented && _toggleMenu(false));
    window.matchMedia("(min-width: 992px)").addEventListener("change", (e) => e.matches && _toggleMenu(false));
}
