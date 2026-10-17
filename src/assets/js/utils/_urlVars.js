// read and write ?query vars without a reload
// usage: _urlVars.get("c"), _urlVars.set({ c: "10000_1.5_6", t: null })
// set() keeps the other vars and the #hash, an empty or null value removes the var
export const _urlVars = {
    // one var, or all of them as an object
    get(key) {
        const params = new URLSearchParams(location.search);
        return key === undefined ? Object.fromEntries(params) : params.get(key);
    },

    // replaceState by default, { push: true } adds a history entry
    set(vars, options = {}) {
        const params = new URLSearchParams(location.search);

        Object.entries(vars).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") params.delete(key);
            else params.set(key, value);
        });

        // commas stay readable, e.g. ?c=1_2,3_4
        const query = params.toString().replace(/%2C/g, ",");
        const url = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;

        history[options.push ? "pushState" : "replaceState"](history.state, "", url);
    },

    remove(...keys) {
        _urlVars.set(Object.fromEntries(keys.map((key) => [key, null])));
    },

    // the #id without its own ?query, e.g. #tab2?x=1 gives "tab2"
    hash() {
        return decodeURIComponent(location.hash.slice(1).split("?")[0]);
    },
};
