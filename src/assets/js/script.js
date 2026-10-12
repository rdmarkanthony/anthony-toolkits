// libraries
import { gsap } from "gsap";
import { DateTime } from "luxon";
import flatpickr from "flatpickr";

// utils, each one also works on its own: copy it with the files it imports
import { _event } from "./utils/_event";
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
import { _groupHeight } from "./utils/_groupHeight";
import { _lightbox } from "./utils/_lightbox";
import { _lazyLoad } from "./utils/_lazyLoad";
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
    _groupHeight,
    _lightbox,
    _lazyLoad,
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

// modules run after the html is parsed, and before the inline page scripts,
// so --header-height is set before the components measure
const header = document.querySelector(".header-content");
const footer = document.querySelector(".footer-content");

_event.resize(() => {
    document.body.style.setProperty("--header-height", `${header?.offsetHeight ?? 0}px`);
    document.body.style.setProperty("--footer-height", `${footer?.offsetHeight ?? 0}px`);
});

// smooth scroll for links with data-auto-scroll to a section of the same page, "#" goes to the top
document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-auto-scroll]");
    if (!link) return;

    const url = new URL(link.href);
    if (url.pathname !== location.pathname) return;

    const target = url.hash.length > 1 ? document.getElementById(url.hash.slice(1)) : document.body;
    if (!target) return;

    e.preventDefault();
    _autoScroll({ target });
});

// header search, a suggestion opens its component, Enter with none picked submits to the home page (?q=) for the results
// same match as the home page filter, so the suggestions and the results agree
const searchItems = JSON.parse(document.getElementById("search-items")?.textContent ?? "[]");
const escapeHTML = (text) => String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

document.querySelectorAll("[data-search]").forEach((form) => {
    new _autocomplete({
        input: form.querySelector("[data-search-input]"),
        list: form.querySelector("[data-search-list]"),
        items: searchItems,
        match: (item, query) => _filter.match(item.text, query),
        render: (item) => `<span class="font-medium">${escapeHTML(item.label)}</span><span class="shrink-0 text-sm whitespace-nowrap text-kit-muted">${escapeHTML(item.category)}</span>`,
        more: (value, total) => ({ url: `/?q=${encodeURIComponent(value)}`, html: `<span class="font-medium text-kit-accent">See all ${total} results</span>` }),
        empty: (value) => `<p class="px-4 py-3 text-kit-muted">No components match “${escapeHTML(value)}”.</p>`,
        optionClass: "flex items-baseline justify-between gap-4 rounded-2xl px-4 py-3 transition-colors duration-200 aria-selected:bg-kit-surface",
    });
});

// sliding menu below lg, the rest of the page is inert while it's open
const menu = document.querySelector("[data-mobile-menu]");
const menuButton = document.querySelector("[data-mobile-menu-open]");
const pageParts = [header, document.querySelector(".main-content"), footer].filter(Boolean);

const toggleMenu = (open) => {
    if (!menu || open === menu.hasAttribute("data-open")) return;

    menu.toggleAttribute("data-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("overflow-hidden", open);
    pageParts.forEach((part) => (part.inert = open));

    // the close button, not the search, so the phone keyboard doesn't cover the menu
    (open ? menu.querySelector("button[data-mobile-menu-close]") : menuButton).focus({ preventScroll: true });
};

if (menu) {
    menuButton.addEventListener("click", () => toggleMenu(true));
    menu.addEventListener("click", (e) => e.target.closest("[data-mobile-menu-close], a") && toggleMenu(false));
    document.addEventListener("keydown", (e) => e.key === "Escape" && !e.defaultPrevented && toggleMenu(false));
    window.matchMedia("(min-width: 992px)").addEventListener("change", (e) => e.matches && toggleMenu(false));
}
