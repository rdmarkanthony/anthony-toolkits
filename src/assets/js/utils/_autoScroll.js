import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

const _scrollTop = () => window.scrollY;
const _offsetTop = (target) => target.getBoundingClientRect().top + _scrollTop();
const _isVisible = (target) => (target.checkVisibility ? target.checkVisibility() : target.getClientRects().length > 0);

// usage: _autoScrollHash(options), before the other scripts read the hash, scrolls on load to #id or #id?query
// only to a visible element, a hidden one (a lightbox's content, a closed accordion) is left to its own script
export const _autoScrollHash = (props = {}) => {
    const _id = decodeURIComponent(location.hash.slice(1).split("?")[0]);
    const _target = _id && document.getElementById(_id);
    if (!_target || !_isVisible(_target)) return;

    const _scroll = () => _isVisible(_target) && _autoScroll({ ...props, target: _target });

    // after images and fonts, so the position is final
    if (document.readyState === "complete") _scroll();
    else window.addEventListener("load", _scroll, { once: true });
};

// usage: _autoScroll({ target, offset, speed, ease, callback })
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

    gsap.to(window, {
        scrollTo: { y: _y, autoKill: false },
        duration: _reduce ? 0 : speed / 1000,
        ease,
        overwrite: true,
        onComplete: () => callback?.({ target, direction: _direction, offset: _offset, y: _y }),
    });
};
