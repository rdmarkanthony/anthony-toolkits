// loads images, backgrounds, videos and iframes when they near the screen, by moving their data-* attributes in
// markup:
//   <img class="js-lazy" data-src="a.jpg" data-srcset="a.jpg 1x, a@2x.jpg 2x" data-sizes="...">, <source data-srcset> in a <picture> too
//   <div class="js-lazy" data-bg="a.jpg">
//   <video class="js-lazy" data-src="a.mp4" data-poster="a.jpg" autoplay muted loop playsinline>, or <source data-src> inside
//   <iframe class="js-lazy" data-src="...">, <image class="js-lazy" data-href="a.jpg"> in an svg
// usage:
//   _lazyLoad(); watches the page, call it again after adding new .js-lazy elements
//   await _lazyLoad({ target }); loads everything inside target now, e.g. before showing it
// when each one is done it gets .is-loaded or .is-error, and fires a bubbling "lazyload" event, e.detail.error
const _defaults = {
    selector: ".js-lazy, .js-lazy-bg",
    // how far from the screen it starts loading
    rootMargin: "300px",
    // when one of these shows, everything in it and the section after it loads, e.g. slides off to the side
    ahead: ".section",
};

const _state = { options: null, observer: null, aheadObserver: null, watched: new WeakSet() };
const _loading = new WeakMap();
const _attributes = ["sizes", "srcset", "src", "href", "poster"];

// data-src to src etc., true if anything moved
const _swap = (node) => {
    let _changed = false;

    _attributes.forEach((name) => {
        const _value = node.getAttribute(`data-${name}`);
        if (_value === null) return;

        node.setAttribute(name, _value);
        node.removeAttribute(`data-${name}`);
        _changed = true;
    });

    return _changed;
};

// resolves with the element once it has loaded or failed, the same promise every time
const _load = (el) => {
    if (_loading.has(el)) return _loading.get(el);

    // loaded early, by ahead or target
    _state.observer?.unobserve(el);

    const _promise = new Promise((resolve) => {
        let _settled = false;

        const _done = (error) => {
            if (_settled) return;
            _settled = true;

            el.classList.add(error ? "is-error" : "is-loaded");
            el.dispatchEvent(new CustomEvent("lazyload", { bubbles: true, detail: { error } }));
            resolve(el);
        };

        // background, preloaded so .is-loaded means it's ready to show
        if (el.dataset.bg) {
            const _url = el.dataset.bg;
            el.removeAttribute("data-bg");
            el.style.backgroundImage = `url("${_url}")`;

            const _image = new Image();
            _image.onload = () => _done(false);
            _image.onerror = () => _done(true);
            _image.src = _url;
            return;
        }

        const _tag = el.localName;
        const _isVideo = _tag === "video";

        // the sources first, so the browser picks from them
        const _sources = _isVideo ? [...el.querySelectorAll("source")] : el.parentElement?.localName === "picture" ? [...el.parentElement.querySelectorAll("source")] : [];
        let _changed = false;
        _sources.forEach((source) => (_changed = _swap(source) || _changed));
        _changed = _swap(el) || _changed;

        // nothing left to load, e.g. a plain src, or loaded by another script
        if (!_changed) {
            if (_tag === "img" && el.complete) return _done(el.naturalWidth === 0);
            if (_isVideo && el.readyState >= 2) return _done(false);
            if (_isVideo && !el.getAttribute("src") && !_sources.length) return _done(true);
            if (_tag !== "img" && !_isVideo) return _done(false);
        }

        el.addEventListener(_isVideo ? "loadeddata" : "load", () => _done(false), { once: true });
        el.addEventListener("error", () => _done(true), { once: true });
        // a video with <source>s reports the error on the last one
        if (_sources.length) _sources.at(-1).addEventListener("error", () => _done(true), { once: true });

        if (_isVideo && _changed) {
            el.load();
            if (el.autoplay) el.play()?.catch(() => {});
        }
    });

    _loading.set(el, _promise);
    return _promise;
};

// display: none, e.g. the desktop copy of a mobile image, is left for the observer
const _isRendered = (el) => el.getClientRects().length > 0;

const _watch = (options) => {
    _state.options = options;

    _state.observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                _state.observer.unobserve(entry.target);
                _load(entry.target);
            });
        },
        { rootMargin: options.rootMargin }
    );

    if (!options.ahead) return;

    _state.aheadObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            _state.aheadObserver.unobserve(entry.target);

            [entry.target, entry.target.nextElementSibling].forEach((section) => {
                section?.querySelectorAll(options.selector).forEach((el) => _isRendered(el) && _load(el));
            });
        });
    });
};

export const _lazyLoad = (props = {}) => {
    // load now
    if (props.target) {
        const _target = typeof props.target === "string" ? document.querySelector(props.target) : props.target;
        const _selector = props.selector ?? _state.options?.selector ?? _defaults.selector;
        const _elements = _target ? [..._target.querySelectorAll(_selector)] : [];
        if (_target?.matches(_selector)) _elements.unshift(_target);

        const _promise = Promise.all(_elements.map(_load));
        if (props.callback) _promise.then(props.callback);

        return _promise;
    }

    // watch, the options of the first call stay
    if (!_state.observer) _watch({ ..._defaults, ...props });

    const { selector, ahead } = _state.options;

    document.querySelectorAll(selector).forEach((el) => {
        if (_state.watched.has(el) || _loading.has(el)) return;

        _state.watched.add(el);
        _state.observer.observe(el);
    });

    if (ahead) {
        document.querySelectorAll(ahead).forEach((section) => {
            if (_state.watched.has(section)) return;

            _state.watched.add(section);
            _state.aheadObserver.observe(section);
        });
    }
};
