import "dotenv/config";
import prettier from "prettier";

export default function (eleventyConfig) {
    eleventyConfig.setNunjucksEnvironmentOptions({
        trimBlocks: true,
        lstripBlocks: true,
    });

    eleventyConfig.setServerOptions({
        watch: ["public/assets/**/*.css", "public/assets/**/*.js"],
        showAllHosts: true,
    });

    eleventyConfig.addBundle("styles");
    eleventyConfig.addBundle("headerscript");
    eleventyConfig.addBundle("popup");
    eleventyConfig.addBundle("footerscript");

    eleventyConfig.addWatchTarget("src/assets/css/");

    eleventyConfig.addPassthroughCopy("src/assets/img");
    eleventyConfig.addPassthroughCopy("src/assets/video");
    eleventyConfig.addPassthroughCopy("src/assets/data");
    eleventyConfig.addPassthroughCopy("src/assets/lottie");
    eleventyConfig.addPassthroughCopy("src/assets/favicon");
    eleventyConfig.addPassthroughCopy("src/favicon.ico");
    eleventyConfig.addPassthroughCopy("src/site.webmanifest");

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
        return _lines
            .filter((line, index) => line.trim() || !_lines[index + 1]?.trim().startsWith("}"))
            .join("\n")
            .replace(/\n{3,}/g, "\n\n");
    });

    eleventyConfig.addTransform("prettify-html", function (content, outputPath) {
        if (outputPath && outputPath.endsWith(".html")) {
            return prettier.format(content, {
                parser: "html",
                printWidth: 300,
                tabWidth: 4,
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
