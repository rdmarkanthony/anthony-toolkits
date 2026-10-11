import esbuild from "esbuild";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const isWatch = process.argv.includes("--watch");

const ctx = await esbuild.context({
    // site script, plus one bundle per component group
    entryPoints: ["src/assets/js/script.js", "src/assets/js/components/*.js"],
    bundle: true,
    minify: isWatch ? false : true,
    sourcemap: true,
    outbase: "src/assets/js",
    outdir: "public/assets/js",
    // utils shared by bundles, and dynamic imports (hls.js), go to chunks
    splitting: true,
    chunkNames: "chunks/[name]-[hash]",
    format: "esm",
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
