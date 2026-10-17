// the os, browser and mobile from the user agent, plus touch and hover from media queries
// usage: _device.os === "ios", _device.browser === "safari", _device.classes() adds e.g. is-ios is-safari to <html>
// for behavior use touch / hover, a touch laptop or an iPad with a mouse isn't "mobile"
const _ua = navigator.userAgent;

// iPadOS says it's a Mac, the only Mac with touch
const _ipad = /Macintosh/.test(_ua) && navigator.maxTouchPoints > 1;

const _os = () => {
    if (/iPhone|iPad|iPod/.test(_ua) || _ipad) return "ios";
    // before linux, Android says Linux too
    if (/Android/.test(_ua)) return "android";
    if (/Windows/.test(_ua)) return "windows";
    if (/Macintosh/.test(_ua)) return "mac";
    if (/CrOS/.test(_ua)) return "chromeos";
    if (/Linux/.test(_ua)) return "linux";
    return "unknown";
};

// most say Chrome and Safari, so the specific ones go first
// on iOS they're all Safari underneath, use os === "ios" for engine fixes
const _browser = () => {
    if (/SamsungBrowser/.test(_ua)) return "samsung";
    if (/Edg(e|A|iOS)?\//.test(_ua)) return "edge";
    if (/OPR\/|OPiOS/.test(_ua)) return "opera";
    if (/Firefox|FxiOS/.test(_ua)) return "firefox";
    if (/Chrome|CriOS/.test(_ua)) return "chrome";
    if (/Safari/.test(_ua)) return "safari";
    return "unknown";
};

const _osName = _os();

export const _device = {
    os: _osName,
    browser: _browser(),
    // phone or tablet
    mobile: _osName === "ios" || _osName === "android",

    // read live, they change when a mouse is plugged in
    get touch() {
        return window.matchMedia("(pointer: coarse)").matches;
    },

    get hover() {
        return window.matchMedia("(hover: hover)").matches;
    },

    // for CSS fixes, e.g. in-[.is-ios]:pb-8
    classes(target = document.documentElement) {
        target.classList.add(`is-${_device.os}`, `is-${_device.browser}`, _device.mobile ? "is-mobile" : "is-desktop");
    },
};
