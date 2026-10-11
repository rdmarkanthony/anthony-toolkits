// component registry: drives the home page, header and footer
// set `ready: true` once the component is migrated to src/components/
// a category `url` links its heading to an overview page
export default [
    {
        category: "Scrolling animation",
        url: "/components/scrolling-animation/",
        items: [
            { label: "Video intro", url: "/components/scrolling-animation/video-intro/", description: "Sticky video whose cover fades in, then titles step in on scroll.", ready: true },
            { label: "Canvas image sequence", url: "/components/scrolling-animation/canvas/", description: "Scrub through image frames on a canvas as you scroll.", ready: true },
            { label: "Parallax background", url: "/components/scrolling-animation/background/", description: "Backgrounds and floating elements that move slower than the page.", ready: true },
        ],
    },
    {
        category: "Layout",
        items: [
            { label: "Breakpoints", url: "/components/breakpoints/", description: "The responsive breakpoints, shown live as you resize.", ready: true },
            { label: "Group height", url: "/components/group-height/", description: "Equalize heights across grouped elements.", ready: true },
            { label: "Tabs", url: "/components/tabs/", description: "Links that switch between content panels, nestable.", ready: true },
            { label: "Sliders", url: "/components/sliders/", description: "Carousels, including the pixel slider." },
        ],
    },
    {
        category: "Animation",
        items: [
            { label: "Animate", url: "/components/animate/", description: "Animate.css effects triggered in view.", ready: true },
            { label: "Animated number", url: "/components/animated-number/", description: "Count up to a value on scroll.", ready: true },
            { label: "Rolling number", url: "/components/rolling-number/", description: "Odometer-style rolling digits.", ready: true },
            { label: "Typing animation", url: "/components/typing-animation/", description: "Typewriter text effect.", ready: true },
        ],
    },
    {
        category: "Media",
        items: [
            { label: "Lightbox", url: "/components/lightbox/", description: "Opens any element on the page in a popup, modals stack.", ready: true },
            { label: "YouTube player", url: "/components/youtube-player/", description: "YouTube embeds, with muted autoplay backgrounds.", ready: true },
            { label: "Video player", url: "/components/video-player/", description: "MP4 and HLS videos, with muted autoplay backgrounds.", ready: true },
        ],
    },
    {
        category: "Utilities",
        items: [
            { label: "Countdown timer", url: "/components/countdown-timer/", description: "Countdown to a date and time.", ready: true },
        ],
    },
];
