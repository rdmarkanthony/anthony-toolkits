export default {
    url: "https://anthony-toolkits.web.app",
    name: "Anthony Toolkits",
    shortName: "Toolkits",
    description: "Reusable components and utilities for site development.",
    github: "https://github.com/rdmarkanthony/anthony-toolkits",
    year: new Date().getFullYear(),
    // Google Maps key, GOOGLE_MAPS_KEY in .env
    googleMapsKey: process.env.GOOGLE_MAPS_KEY ?? "",
    version: Date.now().toString(36),
};
