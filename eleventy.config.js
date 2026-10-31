import "dotenv/config";
import prettier from "prettier";

export default function (eleventyConfig) {
    eleventyConfig.setNunjucksEnvironmentOptions({
        trimBlocks: true,
        lstripBlocks: true,
    });

    eleventyConfig.setServerOptions({
        // reload on css/js output change
        watch: ["public/assets/**/*.css", "public/assets/**/*.js"],
        // show network url for other devices
        showAllHosts: true,
    });

    // page slots for base.njk
    eleventyConfig.addBundle("styles");
    eleventyConfig.addBundle("headerscript");
    eleventyConfig.addBundle("popup");
    eleventyConfig.addBundle("footerscript");

    eleventyConfig.addWatchTarget("src/assets/css/");

    // port the assets
    eleventyConfig.addPassthroughCopy("src/assets/img");
    eleventyConfig.addPassthroughCopy("src/assets/video");
    eleventyConfig.addPassthroughCopy("src/assets/data");
    eleventyConfig.addPassthroughCopy("src/assets/lottie");
    eleventyConfig.addPassthroughCopy("src/assets/favicon");
    eleventyConfig.addPassthroughCopy("src/favicon.ico");
    eleventyConfig.addPassthroughCopy("src/site.webmanifest");

    // zero-pad numbers
    eleventyConfig.addFilter("pad", (value, length = 2) => String(value).padStart(length, "0"));

    // shown code without the page's own readouts: a line ending in "// demo", or from "// demo-start" to "// demo-end"
    eleventyConfig.addFilter("hideDemo", (code = "") => {
        let _hiding = false;
        const _lines = String(code)
            .split("\n")
            .filter((line) => {
                const _line = line.trim();
                if (_line === "// demo-start") _hiding = true;
                else if (_line === "// demo-end") _hiding = false;
                else return !_hiding && !_line.endsWith("// demo");
                return false;
            });
        // no gap left before a closing bracket
        return _lines
            .filter((line, index) => line.trim() || !_lines[index + 1]?.trim().startsWith("}"))
            .join("\n")
            .replace(/\n{3,}/g, "\n\n");
    });

    // prettify HTML
    eleventyConfig.addTransform("prettify-html", function (content, outputPath) {
        if (outputPath && outputPath.endsWith(".html")) {
            return prettier.format(content, {
                parser: "html",
                printWidth: 300,
                tabWidth: 4,
                // keep inline scripts as written
                embeddedLanguageFormatting: "off",
            });
        }
        return content;
    });

    return {
        markdownTemplateEngine: "njk",
        dir: {
            input: "src",
            output: "public",
            includes: "_includes",
        },
    };
}
