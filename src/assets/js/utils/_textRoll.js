import SplitType from "split-type";

// usage: _textRoll("footer a, .button-primary"), or _textRoll(selector, { root, stagger: 20 }) for a letter by letter roll
// wraps each text in .text-roll, the css in text-roll.css rolls it on hover or focus
// stagger is ms per letter, the letters are split with split-type
export const _textRoll = (selector, props = {}) => {
    // the old second argument was the root
    const { root = document, stagger = 0 } = props instanceof Element || props instanceof Document ? { root: props } : props;

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
        if (stagger) target.style.setProperty("--stagger", `${stagger}ms`);

        _nodes.forEach((node) => {
            // keep spaces outside
            const [, _before, _text, _after] = node.textContent.match(/^(\s*)([\s\S]*?)(\s*)$/);

            const _roll = document.createElement("span");
            _roll.className = "text-roll";
            _roll.innerHTML = "<span></span>";
            _roll.firstChild.textContent = _text;

            if (stagger) {
                // screen readers get the word, not the letters
                const _label = document.createElement("span");
                _label.textContent = _text;
                _label.style.cssText = "position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;";
                _roll.firstChild.setAttribute("aria-hidden", "true");
                _roll.prepend(_label);
            }

            node.replaceWith(_before, _roll, _after);

            if (stagger) new SplitType(_roll.lastChild, { types: "words, chars", tagName: "span" }).chars.forEach((char, i) => char.style.setProperty("--char", i));
        });
    });
};
