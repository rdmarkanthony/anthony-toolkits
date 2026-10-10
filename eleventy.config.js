import prettier from "prettier";

export default function (eleventyConfig) {
    // update Nunjucks environment options
    eleventyConfig.setNunjucksEnvironmentOptions({
        trimBlocks: true,
        lstripBlocks: true,
    });

    // show network url for other devices
    eleventyConfig.setServerOptions({
        showAllHosts: true,
    });

    // watch css change
    eleventyConfig.addWatchTarget("src/assets/css/");

    // port the assets
    eleventyConfig.addPassthroughCopy("src/assets/img");
    // eleventyConfig.addPassthroughCopy("src/assets/video");
    // eleventyConfig.addPassthroughCopy("src/assets/data");

    // prettify HTML
    eleventyConfig.addTransform("prettify-html", function (content, outputPath) {
        if (outputPath && outputPath.endsWith(".html")) {
            return prettier.format(content, {
                parser: "html",
                printWidth: 300,
                tabWidth: 4,
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
