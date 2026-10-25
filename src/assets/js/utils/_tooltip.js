import { _event } from "./_event";

// usage: _tooltip.init(), then data-tooltip="Text" shows on hover and focus
// data-tooltip-content="#id" opens a <template> on click, until a click outside, Escape or [data-tooltip-close]
// data-tooltip-place="bottom" | "left" | "right", data-tooltip-anchor=".card" (closest), data-tooltip-class="..."
// _tooltip.show(target, "Copied", { duration: 1500 }) instead of alert(), _tooltip.hide(target) closes it
const _id = "js-tooltip";
const _flip = { top: "bottom", bottom: "top", left: "right", right: "left" };
let _el = null;
let _live = null;
let _anchor = null;
let _place = "top";
let _timer = null;
let _content = false;
let _ready = false;

const _find = (e) => e.target.closest?.("[data-tooltip]");
const _props = (target) => ({ place: target.dataset.tooltipPlace, anchor: target.dataset.tooltipAnchor, class: target.dataset.tooltipClass });

// hover describes the target, content marks it open
const _aria = (on) => {
    const target = _tooltip.target;
    if (!target) return;

    if (_content) {
        target.setAttribute("aria-expanded", String(on));
        return;
    }

    const ids = (target.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id && id !== _id);
    if (on) ids.push(_id);
    ids.length ? target.setAttribute("aria-describedby", ids.join(" ")) : target.removeAttribute("aria-describedby");
};

const _position = () => {
    const gap = 8;
    const rect = _anchor.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const w = _el.offsetWidth;
    const h = _el.offsetHeight;

    // the other side only when it has room
    const room = { top: rect.top - h, bottom: innerHeight - rect.bottom - h, left: rect.left - w, right: width - rect.right - w };
    let place = room[_place] < gap && room[_flip[_place]] >= gap ? _flip[_place] : _place;
    // no room left or right
    if (room[place] < gap && (place === "left" || place === "right")) place = room.top >= gap ? "top" : "bottom";

    const clamp = (value, max) => Math.min(Math.max(value, gap), max - gap);

    const x = place === "left" ? rect.left - w - gap : place === "right" ? rect.right + gap : clamp(rect.left + rect.width / 2 - w / 2, width - w);
    const y = place === "top" ? rect.top - h - gap : place === "bottom" ? rect.bottom + gap : clamp(rect.top + rect.height / 2 - h / 2, innerHeight - h);

    // the arrow faces the anchor
    const side = place === "top" || place === "bottom";
    _el.style.left = `${x}px`;
    _el.style.top = `${y}px`;
    _el.style.setProperty("--arrow-x", side ? `${rect.left + rect.width / 2 - x}px` : place === "left" ? "100%" : "0px");
    _el.style.setProperty("--arrow-y", side ? (place === "top" ? "100%" : "0px") : `${rect.top + rect.height / 2 - y}px`);
    _el.dataset.place = place;
};

// one tooltip for the page, a popover so it sits above dialogs and overflow
const _create = () => {
    if (_el) return;

    _el = document.createElement("div");
    _el.id = _id;
    _el.popover = "manual";

    _live = document.createElement("div");
    _live.className = "sr-only";
    _live.setAttribute("aria-live", "polite");

    document.body.append(_el, _live);

    // capture: scrolling inside any box moves it too, _event.scroll is the page only
    const update = () => _tooltip.target && _position();
    window.addEventListener("scroll", update, { capture: true, passive: true });
    _event.resize(update);
};

export const _tooltip = {
    // override with Object.assign(_tooltip.classes, {...})
    // data-visible, data-content for a template, data-place for the side
    classes: {
        // always on: position, fade and the arrow
        base: "pointer-events-none fixed inset-auto m-0 overflow-visible opacity-0 transition-opacity duration-150 before:absolute before:top-(--arrow-y) before:left-(--arrow-x) before:size-2 before:-translate-1/2 before:rotate-45 before:bg-inherit data-visible:opacity-100 data-content:data-visible:pointer-events-auto starting:data-visible:opacity-0 motion-reduce:transition-none",
        // the look, data-tooltip-class or { class } replaces it
        tip: "max-w-xs rounded-md bg-gray-950 px-3 py-1.5 text-sm font-medium text-white data-content:rounded-lg data-content:p-4 data-content:font-normal",
    },

    target: null,

    init() {
        if (_ready) return;
        _ready = true;

        // an open template wins over hover
        const open = (target) => target !== _tooltip.target && !_content && _tooltip.show(target, target.dataset.tooltip, _props(target));
        // a timed message stays until its time is up
        const close = (target) => target === _tooltip.target && !_timer && !_content && _tooltip.hide();

        document.addEventListener("pointerover", (e) => e.pointerType === "mouse" && _find(e) && open(_find(e)));
        document.addEventListener("pointerout", (e) => _find(e) && !_find(e).contains(e.relatedTarget) && close(_find(e)));
        document.addEventListener("focusin", (e) => _find(e)?.matches(":focus-visible") && open(_find(e)));
        document.addEventListener("focusout", (e) => _find(e) && close(_find(e)));
        document.addEventListener("keydown", (e) => e.key === "Escape" && _tooltip.hide());

        document.addEventListener("click", (e) => {
            const trigger = e.target.closest("[data-tooltip-content]");

            if (trigger) {
                e.preventDefault();
                if (_content && trigger === _tooltip.target) _tooltip.hide();
                else _tooltip.show(trigger, null, { ..._props(trigger), content: trigger.dataset.tooltipContent });
                return;
            }

            if (_content && _el.contains(e.target) && e.target.closest("[data-tooltip-close]")) _tooltip.hide();
        });

        // pointerdown, so a click that opens one from code doesn't close it
        document.addEventListener("pointerdown", (e) => _content && !_el.contains(e.target) && !_tooltip.target.contains(e.target) && _tooltip.hide());
    },

    // options: { duration, place, anchor, content, class }, content is a <template> or its selector
    show(target, text, options = {}) {
        const _target = typeof target === "string" ? document.querySelector(target) : target;
        const _template = typeof options.content === "string" ? document.querySelector(options.content) : options.content;
        if (!_target || !(text || _template)) return;

        _create();
        _tooltip.hide();

        // the target keeps focus and aria, the anchor is where it points
        _tooltip.target = _target;
        _anchor = (typeof options.anchor === "string" ? _target.closest(options.anchor) : options.anchor) ?? _target;
        _place = _flip[options.place] ? options.place : "top";
        _content = !!_template;

        if (_content) _el.replaceChildren(_template.content.cloneNode(true));
        else _el.textContent = text;

        _el.className = `${_tooltip.classes.base} ${options.class || _tooltip.classes.tip}`;
        _el.setAttribute("role", _content ? "dialog" : "tooltip");
        _el.toggleAttribute("data-content", _content);

        // shown again to sit above a dialog opened after it, source: Tab moves into it
        if (_el.matches(":popover-open")) _el.hidePopover();
        _el.showPopover({ source: _target });
        _position();
        _el.toggleAttribute("data-visible", true);

        // a timed message is read out once
        if (_content || !options.duration) _aria(true);

        if (options.duration) {
            _live.textContent = text;
            _timer = setTimeout(_tooltip.hide, options.duration);
        }
    },

    hide(target) {
        if (!_el || (target && target !== _tooltip.target)) return;

        // focus was inside, back to the target
        if (_el.contains(document.activeElement)) _tooltip.target?.focus();

        clearTimeout(_timer);
        _timer = null;
        _aria(false);

        // data-content stays for the fade out
        _el.removeAttribute("data-visible");
        _live.textContent = "";
        _tooltip.target = null;
        _content = false;
    },
};
