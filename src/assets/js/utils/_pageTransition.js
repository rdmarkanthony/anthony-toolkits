// a page transition, the look is css: page-transition.css
// usage: data-page-transition="circle" on a link or a parent, then _pageTransition.init()
// every page needs this in its <head>, it passes the name on:
// <script>try{const t=JSON.parse(sessionStorage.pageTransition);sessionStorage.removeItem("pageTransition");if(Date.now()-t.time<1e4)document.documentElement.dataset.pageEnter=t.name}catch{}</script>
const _key = "pageTransition";
const _root = document.documentElement;

let _ready = false;
let _leaving = false;

const _wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// new tab, download, another site, a hash on this page
const _skip = (link, e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return true;
    if ((link.target && link.target !== "_self") || link.hasAttribute("download") || link.origin !== location.origin) return true;
    if (link.getAttribute("href").startsWith("#")) return true;

    return link.pathname === location.pathname && link.search === location.search && link.hash !== "";
};

export const _pageTransition = {
    // max wait before it opens
    timeout: 2000,

    init() {
        if (_ready) return;
        _ready = true;

        // window gets it last, so analytics see it unprevented
        window.addEventListener("click", (e) => {
            const link = e.target.closest("a[href]");
            const name = link?.closest("[data-page-transition]")?.dataset.pageTransition;
            if (name === undefined || name === "false" || _skip(link, e)) return;

            e.preventDefault();

            // keyboard: the middle of the link
            const rect = link.getBoundingClientRect();
            const point = e.detail ? { x: e.clientX, y: e.clientY } : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

            this.leave(link.href, name || "fade", point);
        });

        // back or forward can restore it with the cover on
        window.addEventListener("pageshow", (e) => {
            if (!e.persisted) return;

            _leaving = false;
            delete _root.dataset.pageLeave;
        });
    },

    // from code: _pageTransition.leave("/thank-you/", "circle")
    async leave(url, name = "fade", point) {
        if (_leaving) return;
        _leaving = true;

        const _before = new Set(document.getAnimations());

        // no point: the middle of the screen
        const _point = point ?? { x: innerWidth / 2, y: innerHeight / 2 };
        _root.style.setProperty("--page-x", `${_point.x}px`);
        _root.style.setProperty("--page-y", `${_point.y}px`);
        _root.style.setProperty("--page-scroll", `${scrollY}px`);
        delete _root.dataset.pageEnter;
        _root.dataset.pageLeave = name;

        // what the attribute started, none with reduced motion
        const _animations = document.getAnimations().filter((animation) => !_before.has(animation) && animation.effect?.getComputedTiming().endTime < Infinity);
        await Promise.race([Promise.all(_animations.map((animation) => animation.finished.catch(() => {}))), _wait(this.timeout)]);

        try {
            sessionStorage.setItem(_key, JSON.stringify({ name, time: Date.now() }));
        } catch {}

        location.href = url;
    },
};
