export default {
    // link previews need absolute urls
    url: "https://anthony-toolkits.web.app",
    name: "Anthony Toolkits",
    // header and footer wordmark
    shortName: "Toolkits",
    description: "Reusable components and utilities for site development.",
    github: "https://github.com/rdmarkanthony/anthony-toolkits",
    year: new Date().getFullYear(),
    // Google Maps key, GOOGLE_MAPS_KEY in .env
    googleMapsKey: process.env.GOOGLE_MAPS_KEY ?? "",
    // changes every build, added to css/js urls so a deploy is picked up straight away (see firebase.json)
    version: Date.now().toString(36),
};
