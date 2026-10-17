// an animation before the next page opens, and one as it shows, the look is css: page-transition.css
// usage: data-page-transition="circle" on a link or a parent, then _pageTransition.init()
// leaving sets data-page-leave="circle" on <html>, the next page gets data-page-enter="circle" from this line in its <head>:
// <script>try{const t=JSON.parse(sessionStorage.pageTransition);sessionStorage.removeItem("pageTransition");if(Date.now()-t.time<1e4)document.documentElement.dataset.pageEnter=t.name}catch{}</script>
const _key = "pageTransition";
const _root = document.documentElement;

let _ready = false;
let _leaving = false;

const _wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// links the browser should open itself, new tab, download, another site, a hash on this page
const _skip = (link, e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return true;
    if ((link.target && link.target !== "_self") || link.hasAttribute("download") || link.origin !== location.origin) return true;
    if (link.getAttribute("href").startsWith("#")) return true;

    return link.pathname === location.pathname && link.search === location.search && link.hash !== "";
};

export const _pageTransition = {
    // longest wait before it opens anyway
    timeout: 2000,

    init() {
        if (_ready) return;
        _ready = true;

        // on window, the last stop, so analytics and other click scripts see it first, not yet prevented
        window.addEventListener("click", (e) => {
            const link = e.target.closest("a[href]");
            const name = link?.closest("[data-page-transition]")?.dataset.pageTransition;
            if (name === undefined || name === "false" || _skip(link, e)) return;

            e.preventDefault();

            // from the keyboard, the middle of the link
            const rect = link.getBoundingClientRect();
            const point = e.detail ? { x: e.clientX, y: e.clientY } : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

            this.leave(link.href, name || "fade", point);
        });

        // back or forward can show this page as it was left, cover and all
        window.addEventListener("pageshow", (e) => {
            if (!e.persisted) return;

            _leaving = false;
            delete _root.dataset.pageLeave;
        });
    },

    // also from code, e.g. after a form: _pageTransition.leave("/thank-you/", "circle")
    async leave(url, name = "fade", point) {
        if (_leaving) return;
        _leaving = true;

        const _before = new Set(document.getAnimations());

        _root.style.setProperty("--page-x", point ? `${point.x}px` : "50%");
        _root.style.setProperty("--page-y", point ? `${point.y}px` : "50%");
        delete _root.dataset.pageEnter;
        _root.dataset.pageLeave = name;

        // waits for what the attribute started, none with reduced motion
        const _animations = document.getAnimations().filter((animation) => !_before.has(animation) && animation.effect?.getComputedTiming().endTime < Infinity);
        await Promise.race([Promise.all(_animations.map((animation) => animation.finished.catch(() => {}))), _wait(this.timeout)]);

        try {
            sessionStorage.setItem(_key, JSON.stringify({ name, time: Date.now() }));
        } catch {}

        location.href = url;
    },
};
