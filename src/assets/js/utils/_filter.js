// filters [data-filter-item] by the text typed in [data-filter-input]
// optional: [data-filter-group] hides when none of its items match, [data-filter-empty] shows when nothing matches
export const _filter = {
    init(scope = document) {
        const input = scope.querySelector("[data-filter-input]");
        if (!input) return;

        const items = [...scope.querySelectorAll("[data-filter-item]")];
        const groups = [...scope.querySelectorAll("[data-filter-group]")];
        const empty = scope.querySelector("[data-filter-empty]");

        input.addEventListener("input", () => {
            const query = input.value.trim().toLowerCase();
            let total = 0;

            items.forEach((item) => {
                const match = item.dataset.filterItem.toLowerCase().includes(query);
                item.hidden = !match;
                if (match) total++;
            });

            groups.forEach((group) => (group.hidden = !group.querySelector("[data-filter-item]:not([hidden])")));

            empty?.classList.toggle("hidden", total > 0);
        });
    },
};
