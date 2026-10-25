import SplitType from "split-type";

// usage: _textRoll("footer a, .button-primary"), or _textRoll(selector, { root, stagger: 20, flip: true }) for letter by letter
// wraps each text in .text-roll, the css in text-roll.css rolls it on hover or focus
// stagger is ms per letter, flip turns each letter over like a cube, the letters are split with split-type
export const _textRoll = (selector, props = {}) => {
    // the old second argument was the root
    const { root = document, stagger = 0, flip = false } = props instanceof Element || props instanceof Document ? { root: props } : props;

    root.querySelectorAll(selector).forEach((target) => {
        if (target.querySelector(".text-roll")) return;

        // text nodes, not in svg
        const _walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => (node.textContent.trim() && !node.parentElement.closest("svg") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
        });

        const _nodes = [];
        while (_walker.nextNode()) _nodes.push(_walker.currentNode);
        if (!_nodes.length) return;

        const _letters = stagger || flip;
        target.dataset.textRoll = flip ? "flip" : "";
        if (stagger) target.style.setProperty("--stagger", `${stagger}ms`);

        _nodes.forEach((node) => {
            // keep spaces outside
            const [, _before, _text, _after] = node.textContent.match(/^(\s*)([\s\S]*?)(\s*)$/);

            const _roll = document.createElement("span");
            _roll.className = "text-roll";
            _roll.innerHTML = "<span></span>";
            _roll.firstChild.textContent = _text;

            if (_letters) {
                // screen readers get the word, not the letters
                const _label = document.createElement("span");
                _label.textContent = _text;
                _label.style.cssText = "position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;";
                _roll.firstChild.setAttribute("aria-hidden", "true");
                _roll.prepend(_label);
            }

            node.replaceWith(_before, _roll, _after);

            if (!_letters) return;
            new SplitType(_roll.lastChild, { types: "words, chars", tagName: "span" }).chars.forEach((char, i) => {
                char.style.setProperty("--char", i);
                // the flip's underside
                char.dataset.char = char.textContent;
            });
        });
    });
};
