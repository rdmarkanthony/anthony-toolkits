import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

const _scrollTop = () => window.scrollY;
const _offsetTop = (target) => target.getBoundingClientRect().top + _scrollTop();

// usage: _autoScroll({ target, offset, speed, ease, callback })
export const _autoScroll = ({ target, offset, speed = 500, ease = "power2.out", callback } = {}) => {
    if (!target) return;

    // if need to scroll to parent of the target
    const _parent = target.dataset.scrollParent && target.closest(target.dataset.scrollParent);
    if (_parent) target = _parent;

    // for direction
    const _targetTop = _offsetTop(target);
    const _direction = _scrollTop() > _targetTop ? "up" : "down";

    // for offset, only a fixed or sticky header covers the target
    const _header = document.querySelector(".header-content");
    const _headerHeight = _header && ["fixed", "sticky"].includes(getComputedStyle(_header).position) ? _header.offsetHeight : 0;
    const _offset = offset ?? _headerHeight;

    let _y = _targetTop - _offset;
    if (_headerHeight > _y) _y = 0;
    _y = Math.max(0, Math.round(_y));

    // for speed
    const _reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.to(window, {
        scrollTo: { y: _y, autoKill: false },
        duration: _reduce ? 0 : speed / 1000,
        ease,
        overwrite: true,
        onComplete: () => callback?.({ target, direction: _direction, offset: _offset, y: _y }),
    });
};
