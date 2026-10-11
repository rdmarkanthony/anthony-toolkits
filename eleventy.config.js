import prettier from "prettier";

export default function (eleventyConfig) {
    // update Nunjucks environment options
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

    // watch css change
    eleventyConfig.addWatchTarget("src/assets/css/");

    // port the assets
    eleventyConfig.addPassthroughCopy("src/assets/img");
    eleventyConfig.addPassthroughCopy("src/assets/video");

    // library css, linked only on the pages that use it (`styles` in front matter)
    eleventyConfig.addPassthroughCopy({
        "node_modules/animate.css/animate.min.css": "assets/css/vendor/animate.min.css",
        "node_modules/flatpickr/dist/flatpickr.min.css": "assets/css/vendor/flatpickr.min.css",
    });
    // eleventyConfig.addPassthroughCopy("src/assets/data");

    // zero-pad numbers
    eleventyConfig.addFilter("pad", (value, length = 2) => String(value).padStart(length, "0"));

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
