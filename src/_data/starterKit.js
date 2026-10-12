import fs from "node:fs";
import components from "./components.js";

// the components marked `starter: true` in components.js, and every file they need,
// merged from the "// Requirements" comment of each demo page, so there's no second list to keep in sync
export default () => {
    const items = components.flatMap((group) => group.items.filter((item) => item.starter));
    const sections = new Map();

    items.forEach((item) => {
        const page = `src${item.url.replace(/\/$/, "")}.njk`;
        const block = fs.existsSync(page) ? fs.readFileSync(page, "utf8").match(/\/\/ Requirements\n([\s\S]*?)\n\s*\n/)?.[1] : null;
        if (!block) return;

        let section = "JS";
        block.split("\n").forEach((line) => {
            const text = line.trim().replace(/^\/\/\s*/, "");
            if (/^(JS|HTML|CSS)$/.test(text)) section = text;
            else if (text) sections.set(section, (sections.get(section) ?? new Set()).add(text));
        });
    });

    const files = [...sections].map(([section, lines]) => `${section}\n${[...lines].map((line) => `    ${line}`).join("\n")}`).join("\n");

    return { items, files };
};
