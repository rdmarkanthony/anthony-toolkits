// component registry: drives the home page, header and footer
// set `ready: true` once the component is migrated to src/components/
// a category `url` links its heading to an overview page, `utils` labels the card
// `starter: true` adds it to the starter kit popup
export default [
    {
        category: "Scrolling animation",
        url: "/components/scrolling-animation/",
        items: [
            { label: "Video intro", url: "/components/scrolling-animation/video-intro/", description: "Sticky video whose cover fades in, then titles step in on scroll.", utils: "_parallaxScroller · _hlsVideo", ready: true },
            { label: "Canvas image sequence", url: "/components/scrolling-animation/canvas/", description: "Scrub through image frames on a canvas as you scroll.", utils: "_canvasBanner · _parallaxScroller", ready: true },
            { label: "Parallax background", url: "/components/scrolling-animation/background/", description: "Backgrounds and floating elements that move slower than the page.", utils: "_parallaxBackground · _parallaxFloating", ready: true },
        ],
    },
    {
        category: "Layout",
        items: [
            { label: "Breakpoints", url: "/components/breakpoints/", description: "The responsive breakpoints, shown live as you resize.", utils: "Tailwind @theme", ready: true },
            { label: "Group height", url: "/components/group-height/", description: "Equalize heights across grouped elements.", utils: "_groupHeight", ready: true },
            { label: "Tabs", url: "/components/tabs/", description: "Links that switch between content panels, nestable.", utils: "_tabs", ready: true },
            { label: "Accordion", url: "/components/accordion/", description: "Titles that open and close their content in place, for FAQs.", utils: "_accordion", ready: true },
            { label: "Hover indicator", url: "/components/hover-indicator/", description: "A background or line that slides to the hovered or selected item.", utils: "_hoverIndicator", ready: true },
            { label: "Sliders", url: "/components/sliders/", description: "Carousels, including the pixel slider." },
        ],
    },
    {
        category: "Animation",
        items: [
            { label: "Animate", url: "/components/animate/", description: "Animate.css effects triggered in view.", utils: "_animate · _inview · _splitText", ready: true, starter: true },
            { label: "Animated number", url: "/components/animated-number/", description: "Count up to a value on scroll.", utils: "_animatedNumber · _inview", ready: true },
            { label: "Rolling number", url: "/components/rolling-number/", description: "Odometer-style rolling digits.", utils: "_rollingNumber · _inview", ready: true },
            { label: "Theme scroller", url: "/components/theme-scroller/", description: "The page or header takes the theme of the section on screen.", utils: "_themeScroller", ready: true },
            { label: "Typing animation", url: "/components/typing-animation/", description: "Typewriter text effect.", utils: "_typing", ready: true },
        ],
    },
    {
        category: "Media",
        items: [
            { label: "Lightbox", url: "/components/lightbox/", description: "Opens any element on the page in a popup, modals stack.", utils: "_lightbox", ready: true },
            { label: "YouTube player", url: "/components/youtube-player/", description: "YouTube embeds, with muted autoplay backgrounds.", utils: "_youtubePlayer", ready: true },
            { label: "Video player", url: "/components/video-player/", description: "MP4 and HLS videos, with muted autoplay backgrounds.", utils: "_videoPlayer", ready: true },
            { label: "Lazyload", url: "/components/lazyload/", description: "Images, backgrounds and videos that load as they near the screen.", utils: "_lazyLoad", ready: true, starter: true },
        ],
    },
    {
        category: "Forms",
        items: [
            { label: "Select box", url: "/components/select-box/", description: "A styled dropdown for a native select, with search and keyboard support.", utils: "_selectBox", ready: true },
        ],
    },
    {
        category: "Utilities",
        items: [
            { label: "Google Map", url: "/components/google-map/", description: "Markers, popups and a custom theme, with a location list that flies to each place.", utils: "_googleMap", ready: true },
            { label: "QR code", url: "/components/qr-code/", description: "QR codes for links or Wi-Fi, saved as PNG or SVG.", utils: "_qrCode", ready: true },
            { label: "Countdown timer", url: "/components/countdown-timer/", description: "Countdown to a date and time.", utils: "_countdownTimer · _rollingNumber", ready: true },
        ],
    },
    {
        category: "Helpers",
        items: [
            { label: "Inview", url: "/components/inview/", description: "Run a callback when an element scrolls into or out of view.", utils: "_inview", ready: true, starter: true },
            { label: "Enquire", url: "/components/enquire/", description: "Run code once each time the window enters a breakpoint.", utils: "_enquire", ready: true },
            { label: "Events", url: "/components/event/", description: "Shared resize, scroll and element-size listeners, plus custom events.", utils: "_event", ready: true, starter: true },
            { label: "Emitter", url: "/components/emitter/", description: "Base class that gives your own utils events, on() and off().", utils: "_emitter", ready: true, starter: true },
            { label: "Auto scroll", url: "/components/auto-scroll/", description: "Smooth scroll to an element, below the sticky header.", utils: "_autoScroll", ready: true },
            { label: "Filter", url: "/components/filter/", description: "Live search for a list, set up with data attributes.", utils: "_filter", ready: true },
        ],
    },
];
