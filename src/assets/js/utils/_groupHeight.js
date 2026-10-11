import { _event } from "./_event";

// equal min-height for each group, from the given width up
const _equalHeight = (list) => {
    if (list.length <= 0) return;

    // clear current height
    list.forEach((item) => (item.target.style.minHeight = ""));

    if (list.length <= 1) return;

    // set the highest height
    const _height = Math.max(...list.map((item) => item.target.offsetHeight));
    list.forEach((item) => {
        if (window.innerWidth >= item.within) item.target.style.minHeight = `${_height}px`;
    });
};

// data-gh="group,within" or data-rgh="group,within", within is the min window width (default 0)
const _groups = (items, attribute) => {
    const _list = {};

    items.forEach((item) => {
        const [_group = 0, _within] = item.dataset[attribute].split(",");

        if (!_list[_group]) _list[_group] = [];
        _list[_group].push({ target: item, within: parseFloat(_within) || 0 });
    });

    return Object.values(_list);
};

// usage: _groupHeight.init(), runs on load and after each resize
// [data-gh-parent]: equal heights for the [data-gh] of the same group
// [data-rgh-parent]: the same, but only between [data-rgh-item] on the same row
export const _groupHeight = {
    init() {
        _event.resize((state) => {
            if (state !== "resize") this.update();
        });
    },

    update() {
        // for group-height
        document.querySelectorAll("[data-gh-parent]").forEach((parent) => {
            _groups(parent.querySelectorAll("[data-gh]"), "gh").forEach(_equalHeight);
        });

        // for row group-height
        document.querySelectorAll("[data-rgh-parent]").forEach((parent) => {
            const _rows = {};

            // group the items based on their top position
            parent.querySelectorAll("[data-rgh-item]").forEach((item) => {
                if (!_rows[item.offsetTop]) _rows[item.offsetTop] = [];
                _rows[item.offsetTop].push(...item.querySelectorAll("[data-rgh]"));
            });

            Object.values(_rows).forEach((row) => _groups(row, "rgh").forEach(_equalHeight));
        });
    },
};
