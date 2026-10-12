// filters [data-filter-item] by the text typed in [data-filter-input]
// optional: [data-filter-group] hides when none of its items match, [data-filter-empty] shows when nothing matches
export const _filter = {
    // the same test for anything that should agree with the list, e.g. search suggestions
    match(text, query) {
        return String(text).toLowerCase().includes(query.trim().toLowerCase());
    },

    init(scope = document) {
        const input = scope.querySelector("[data-filter-input]");
        if (!input) return;

        const items = [...scope.querySelectorAll("[data-filter-item]")];
        const groups = [...scope.querySelectorAll("[data-filter-group]")];
        const empty = scope.querySelector("[data-filter-empty]");

        input.addEventListener("input", () => {
            let total = 0;

            items.forEach((item) => {
                const match = _filter.match(item.dataset.filterItem, input.value);
                item.hidden = !match;
                if (match) total++;
            });

            groups.forEach((group) => (group.hidden = !group.querySelector("[data-filter-item]:not([hidden])")));

            empty?.classList.toggle("hidden", total > 0);
        });
    },
};
