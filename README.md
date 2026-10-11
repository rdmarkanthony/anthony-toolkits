# Anthony Toolkits

Reusable components and utilities for site development, built on Eleventy + Nunjucks + Tailwind.

## Usage Guide

### Requirements

- Node.js `v18` or later
- pnpm `v10` or later

### Instructions

1. Clone the repository:
   `git clone https://github.com/rdmarkanthony/anthony-toolkits.git`
2. Navigate to the project directory:
   `cd anthony-toolkits`
3. Install dependencies:
   `pnpm install`
4. Start the development server:
   `pnpm dev`
5. Build for production:
   `pnpm build`

### Troubleshooting

- If you encounter any issues, ensure that you're using the recommended versions of Node.js and pnpm.
- If problems persist, try deleting the `node_modules` folder and the `pnpm-lock.yaml` file, then run `pnpm install` again.

### Output

- Source Nunjucks templates are in `src/_includes/`.
- Page content is in `src/` (e.g. `index.njk`).
- Raw CSS, JS, and images are in `src/assets/`.
- Compiled HTML, CSS, JS, and images are output to `public/`.

### Adding a component

1. Put the util in `src/assets/js/utils/`. Each util is a standalone file that imports what it needs (e.g. `_event`, `_emitter`, gsap), so it can be copied into another project with those files.
2. Import it in `src/assets/js/script.js` and add it to `window`, so page scripts can use it. `script.js` only loads the utils, it doesn't set up any component. Library CSS goes in `src/assets/css/style.css`.
3. Put the demo page in `src/components/<name>.njk` (or a folder for several pages). Its layout comes from `src/components/components.11tydata.json`.
4. Set the component up in the page's inline script, in `{% footerscript %}` as `type="module"` so it runs after `script.js`, and list what it needs. To show the script on the page too, set it once with `{% set pageScript %}` and pass it to `scriptUsage({ code, requires })` from `components/atoms/component-page.njk`.
5. Utils with `events` / `on()` / `off()` extend `_emitter` instead of copying them.
6. List the page in `src/_data/components.js` with `ready: true` and its `utils`. A category `url` links its heading to an overview page.

### Using a component in another project

`script.js` here loads every util, so every demo works on any page. In a project, import only the utils you use, from the component's Requires list, and copy its page script. hls.js is the only library loaded on demand, when a page has a video.
