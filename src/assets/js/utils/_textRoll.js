// usage: _textRoll("footer a, .button-primary")
// wraps each text in .text-roll, the css in text-roll.css rolls it on hover or focus
export const _textRoll = (selector, root = document) => {
    root.querySelectorAll(selector).forEach((target) => {
        if (target.querySelector(".text-roll")) return;

        // text nodes, not in svg
        const _walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => (node.textContent.trim() && !node.parentElement.closest("svg") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
        });

        const _nodes = [];
        while (_walker.nextNode()) _nodes.push(_walker.currentNode);
        if (!_nodes.length) return;

        target.dataset.textRoll = "";

        _nodes.forEach((node) => {
            // keep spaces outside
            const [, _before, _text, _after] = node.textContent.match(/^(\s*)([\s\S]*?)(\s*)$/);

            const _roll = document.createElement("span");
            _roll.className = "text-roll";
            _roll.innerHTML = "<span></span>";
            _roll.firstChild.textContent = _text;

            node.replaceWith(_before, _roll, _after);
        });
    });
};
