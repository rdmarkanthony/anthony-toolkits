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

1. Put shared utils in `src/assets/js/utils/`. Each util lives once and is imported by whichever component needs it.
2. Add a bundle entry in `src/assets/js/components/<name>.js` that imports its utils and libraries and exposes them on `window` for page scripts. esbuild builds every file there; code shared by more than one bundle (e.g. `_event`) goes into a common chunk in `public/assets/js/chunks/`, so it's downloaded once.
3. Put the demo pages in `src/components/<name>/`, with a `<name>.11tydata.json` that sets `layout: base.njk` and `scripts: ["/assets/js/components/<name>.js"]`. `base.njk` loads those after `script.js`.
4. Page scripts go in `{% footerscript %}` as `type="module"`, so they run after the bundles.
5. List the pages in `src/_data/components.js` with `ready: true`. A category `url` links its heading to an overview page.
