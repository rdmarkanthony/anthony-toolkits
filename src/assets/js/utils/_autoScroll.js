import { _tween } from "./_tween";

// the running scroll, a new one replaces it
let _running;

const _scrollTop = () => window.scrollY;
const _offsetTop = (target) => target.getBoundingClientRect().top + _scrollTop();
const _isVisible = (target) => (target.checkVisibility ? target.checkVisibility() : target.getClientRects().length > 0);
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

    if (document.readyState === "complete") _scroll();
    else window.addEventListener("load", _scroll, { once: true });
};

// usage: _autoScroll({ target, offset, speed, ease, callback }), ease is a gsap-style name or (p) => p
export const _autoScroll = ({ target, offset, speed = 500, ease = "power2.out", callback } = {}) => {
    if (!target) return;

    const _parent = target.dataset.scrollParent && target.closest(target.dataset.scrollParent);
    if (_parent) target = _parent;

    const _targetTop = _offsetTop(target);
    const _direction = _scrollTop() > _targetTop ? "up" : "down";

    const _header = document.querySelector(".header-content");
    const _headerHeight = _header && ["fixed", "sticky"].includes(getComputedStyle(_header).position) ? _header.offsetHeight : 0;
    const _offset = offset ?? _headerHeight;

    let _y = _targetTop - _offset;
    if (_headerHeight > _y) _y = 0;
    _y = Math.max(0, Math.round(_y));

    const _reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const _from = _scrollTop();

    _running?.stop();
    _running = _tween({
        duration: _reduce ? 0 : speed,
        ease,
        // instant, so css scroll-behavior: smooth doesn't fight it
        update: (progress) => window.scrollTo({ top: _from + (_y - _from) * progress, behavior: "instant" }),
        complete: () => callback?.({ target, direction: _direction, offset: _offset, y: _y }),
    });
};
