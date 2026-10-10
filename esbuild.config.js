import esbuild from "esbuild";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const isWatch = process.argv.includes("--watch");

const ctx = await esbuild.context({
    entryPoints: ["src/assets/js/script.js"],
    bundle: true,
    minify: isWatch ? false : true,
    sourcemap: true,
    outfile: "public/assets/js/script.js",
    format: "iife",
    target: ["es2020"],
});

if (isWatch) {
    await ctx.rebuild();
    await ctx.watch();
    console.log("DEV: Watching JS files for changes...");
} else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log("BUILD: JS build complete");
}
