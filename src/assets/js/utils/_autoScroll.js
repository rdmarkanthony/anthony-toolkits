// gsap-style ease names ("power2.out", "power4.inOut"...), the "in" curves
const _eases = {
    none: (p) => p,
    power0: (p) => p,
    power1: (p) => p ** 2,
    power2: (p) => p ** 3,
    power3: (p) => p ** 4,
    power4: (p) => p ** 5,
    sine: (p) => 1 - Math.cos((p * Math.PI) / 2),
    expo: (p) => (p ? 2 ** (10 * (p - 1)) : 0),
    circ: (p) => 1 - Math.sqrt(1 - p * p),
};
const _easing = (ease) => {
    if (typeof ease === "function") return ease;

    const [_name, _type = "out"] = String(ease).split(".");
    const _in = _eases[_name] ?? _eases.power2;

    if (_type === "in") return _in;
    if (_type === "inOut") return (p) => (p < 0.5 ? _in(p * 2) / 2 : 1 - _in((1 - p) * 2) / 2);
    return (p) => 1 - _in(1 - p);
};

// the running scroll, a new one replaces it
let _frame;

const _scrollTop = () => window.scrollY;
const _offsetTop = (target) => target.getBoundingClientRect().top + _scrollTop();
const _isVisible = (target) => (target.checkVisibility ? target.checkVisibility() : target.getClientRects().length > 0);
// in a fixed popup, scrolling the page can't reach it
const _inFixed = (target) => {
    for (let _element = target; _element; _element = _element.parentElement) if (getComputedStyle(_element).position === "fixed") return true;
    return false;
};

// usage: _autoScrollHash(options), on load scrolls to #id or #id?query
// call before other scripts read the hash
export const _autoScrollHash = (props = {}) => {
    const _id = decodeURIComponent(location.hash.slice(1).split("?")[0]);
    const _target = _id && document.getElementById(_id);
    if (!_target) return;

    const _scroll = () => _isVisible(_target) && !_inFixed(_target) && _autoScroll({ ...props, target: _target });

    // after images and fonts, so the position is final
    if (document.readyState === "complete") _scroll();
    else window.addEventListener("load", _scroll, { once: true });
};

// usage: _autoScroll({ target, offset, speed, ease, callback }), ease is a gsap-style name or (p) => p
export const _autoScroll = ({ target, offset, speed = 500, ease = "power2.out", callback } = {}) => {
    if (!target) return;

    // data-scroll-parent: scroll to that parent instead
    const _parent = target.dataset.scrollParent && target.closest(target.dataset.scrollParent);
    if (_parent) target = _parent;

    const _targetTop = _offsetTop(target);
    const _direction = _scrollTop() > _targetTop ? "up" : "down";

    // only a fixed or sticky header covers the target
    const _header = document.querySelector(".header-content");
    const _headerHeight = _header && ["fixed", "sticky"].includes(getComputedStyle(_header).position) ? _header.offsetHeight : 0;
    const _offset = offset ?? _headerHeight;

    let _y = _targetTop - _offset;
    if (_headerHeight > _y) _y = 0;
    _y = Math.max(0, Math.round(_y));

    const _reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const _from = _scrollTop();
    const _duration = _reduce ? 0 : speed;
    const _ease = _easing(ease);
    const _start = performance.now();

    cancelAnimationFrame(_frame);

    const _step = (now) => {
        const _progress = _duration ? Math.min((now - _start) / _duration, 1) : 1;

        // instant, so css scroll-behavior: smooth doesn't fight it
        window.scrollTo({ top: _from + (_y - _from) * _ease(_progress), behavior: "instant" });

        if (_progress < 1) _frame = requestAnimationFrame(_step);
        else callback?.({ target, direction: _direction, offset: _offset, y: _y });
    };
    _step(_start);
};
