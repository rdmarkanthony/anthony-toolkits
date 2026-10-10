// filters [data-filter-item] by the text typed in [data-filter-input]
export const _filter = {
    init(scope = document) {
        const input = scope.querySelector("[data-filter-input]");
        if (!input) return;

        const groups = [...scope.querySelectorAll("[data-filter-group]")];
        const empty = scope.querySelector("[data-filter-empty]");

        input.addEventListener("input", () => {
            const query = input.value.trim().toLowerCase();
            let total = 0;

            groups.forEach((group) => {
                let visible = 0;
                group.querySelectorAll("[data-filter-item]").forEach((item) => {
                    const match = item.dataset.filterItem.toLowerCase().includes(query);
                    item.hidden = !match;
                    if (match) visible++;
                });
                group.hidden = visible === 0;
                total += visible;
            });

            empty?.classList.toggle("hidden", total > 0);
        });
    },
};
