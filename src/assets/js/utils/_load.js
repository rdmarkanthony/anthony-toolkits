// load a script, stylesheet, json, image or font once, as a promise
// usage: await _load.script(src), const data = await _load.json(url)
// arrays load together, scripts still run in order, { progress: (done, total, item) => {} } for a preloader
// a second call gets the same promise, a failed one can be tried again
const _cache = new Map();

const _url = (url) => new URL(url, location.href).href;

const _once = (key, load) => {
    if (!_cache.has(key)) {
        _cache.set(
            key,
            load().catch((error) => {
                _cache.delete(key);
                throw error;
            })
        );
    }

    return _cache.get(key);
};

const _many = (items, load, progress) => {
    const list = [items].flat();
    let done = 0;

    const all = Promise.all(
        list.map((item) =>
            load(item).then((result) => {
                progress?.(++done, list.length, result);
                return result;
            })
        )
    );

    return Array.isArray(items) ? all : all.then(([result]) => result);
};

// attrs: e.g. { integrity, crossorigin, "data-key": "..." }
const _tag = (el, attrs = {}) =>
    new Promise((resolve, reject) => {
        Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value === true ? "" : value));
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error(`_load: ${el.src || el.href} failed`));
        document.head.append(el);
    });

export const _load = {
    script(src, options = {}) {
        const ordered = Array.isArray(src);

        return _many(
            src,
            (item) =>
                _once(`script ${_url(item)}`, async () => {
                    const existing = [...document.scripts].find((el) => el.src === _url(item));
                    if (existing) return existing;

                    const el = document.createElement("script");
                    el.src = item;
                    el.async = !ordered;
                    return _tag(el, options.attrs);
                }),
            options.progress
        );
    },

    style(href, options = {}) {
        return _many(
            href,
            (item) =>
                _once(`style ${_url(item)}`, async () => {
                    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find((el) => el.href === _url(item));
                    if (existing) return existing;

                    const el = document.createElement("link");
                    el.rel = "stylesheet";
                    el.href = item;
                    return _tag(el, options.attrs);
                }),
            options.progress
        );
    },

    // every caller gets the same object, { fresh: true } skips the cache
    json(url, options = {}) {
        const load = async (item) => {
            const response = await fetch(item);
            if (!response.ok) throw new Error(`_load: ${item} ${response.status}`);
            return response.json();
        };

        return _many(url, (item) => (options.fresh ? load(item) : _once(`json ${_url(item)}`, () => load(item))), options.progress);
    },

    image(src, options = {}) {
        return _many(
            src,
            (item) =>
                _once(`image ${_url(item)}`, async () => {
                    const img = new Image();
                    img.src = item;

                    try {
                        await img.decode();
                    } catch {
                        throw new Error(`_load: ${item} failed`);
                    }

                    return img;
                }),
            options.progress
        );
    },

    // e.g. before measuring text, { weight: 700, style: "italic" } for another face
    font(family, options = {}) {
        const face = (item) => `${options.style ?? "normal"} ${options.weight ?? 400} 1em "${item}"`;

        return _many(
            family,
            (item) =>
                _once(`font ${face(item)}`, async () => {
                    const faces = await document.fonts.load(face(item));
                    if (!faces.length) throw new Error(`_load: font "${item}" not found`);
                    return faces[0];
                }),
            options.progress
        );
    },
};
