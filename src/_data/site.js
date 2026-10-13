export default {
    name: "Anthony Toolkits",
    // footer wordmark
    shortName: "Toolkits",
    description: "Reusable components and utilities for site development.",
    github: "https://github.com/rdmarkanthony/anthony-toolkits",
    year: new Date().getFullYear(),
    // Maps JavaScript API key for the Google Map demo, from GOOGLE_MAPS_KEY in .env (a repo secret on deploy)
    googleMapsKey: process.env.GOOGLE_MAPS_KEY ?? "",
};
