// component registry: drives the home page, header and footer
// set `ready: true` once the component is migrated to src/components/
export default [
    {
        category: "Scrolling animation",
        items: [
            { label: "Video intro", url: "/components/scrolling-animation/video-intro/", description: "Sticky video whose cover fades in, then titles step in on scroll." },
            { label: "Canvas image sequence", url: "/components/scrolling-animation/canvas/", description: "Scrub through image frames on a canvas as you scroll." },
            { label: "Parallax background", url: "/components/scrolling-animation/background/", description: "Backgrounds and floating elements that move slower than the page." },
        ],
    },
    {
        category: "Layout",
        items: [
            { label: "Breakpoints", url: "/components/breakpoints/", description: "Responsive breakpoint reference and helpers." },
            { label: "Group height", url: "/components/group-height/", description: "Equalize heights across grouped elements." },
            { label: "Tabs", url: "/components/tabs/", description: "Accessible tabbed content panels." },
            { label: "Sliders", url: "/components/sliders/", description: "Carousels, including the pixel slider." },
        ],
    },
    {
        category: "Animation",
        items: [
            { label: "Animate", url: "/components/animate/", description: "Animate.css effects triggered in view." },
            { label: "Animated number", url: "/components/animated-number/", description: "Count up to a value on scroll." },
            { label: "Rolling number", url: "/components/rolling-number/", description: "Odometer-style rolling digits." },
            { label: "Typing animation", url: "/components/typing-animation/", description: "Typewriter text effect." },
        ],
    },
    {
        category: "Media",
        items: [
            { label: "Lightbox", url: "/components/lightbox/", description: "Image and video lightbox popup." },
            { label: "YouTube player", url: "/components/youtube-player/", description: "Custom-controlled YouTube embeds." },
            { label: "Video player", url: "/components/video-player/", description: "HTML5 and HLS video player." },
        ],
    },
    {
        category: "Utilities",
        items: [
            { label: "Countdown timer", url: "/components/countdown-timer/", description: "Countdown to a date and time." },
        ],
    },
];
