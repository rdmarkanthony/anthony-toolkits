// component registry: drives the home page, header and footer
// set `ready: true` once the component is migrated to src/components/
// category `url`: overview page, `utils`: card label
// `starter: true` adds it to the starter kit popup
export default [
    {
        category: "Animation",
        items: [
            { label: "Animate", url: "/components/animate/", description: "Animate.css effects triggered in view.", utils: "_animate · _inview · _splitText", ready: true, starter: true },
            { label: "Animated number", url: "/components/animated-number/", description: "Count up to a value on scroll.", utils: "_animatedNumber · _inview", ready: true },
            { label: "Cursor bubble", url: "/components/cursor-bubble/", description: "A dot that trails the mouse, grows over big type and shows labels.", utils: "_cursorBubble", ready: true },
            { label: "Rolling number", url: "/components/rolling-number/", description: "Odometer-style rolling digits.", utils: "_rollingNumber · _inview", ready: true },
            { label: "Scramble text", url: "/components/scramble-text/", description: "Letters flip through random characters, then settle into the text.", utils: "_scrambleText", ready: true },
            { label: "Theme scroller", url: "/components/theme-scroller/", description: "The page or header takes the theme of the section on screen.", utils: "_themeScroller", ready: true },
            { label: "Typing animation", url: "/components/typing-animation/", description: "Typewriter text effect.", utils: "_typing", ready: true },
        ],
    },
    {
        category: "Scrolling animation",
        url: "/components/scrolling-animation/",
        items: [
            { label: "Canvas image sequence", url: "/components/scrolling-animation/canvas/", description: "Scrub through image frames on a canvas as you scroll.", utils: "_canvasBanner · _parallaxScroller", ready: true },
            { label: "Image expand", url: "/components/scrolling-animation/image-expand/", description: "A small banner grows to cover the screen, then a heading comes in.", utils: "_parallaxScroller", ready: true },
            { label: "Parallax background", url: "/components/scrolling-animation/background/", description: "Backgrounds and floating elements that move slower than the page.", utils: "_parallaxBackground · _parallaxFloating", ready: true },
            { label: "Stacking columns", url: "/components/scrolling-animation/stacking-columns/", description: "A pinned row where each column stays while the next slides over it.", utils: "_parallaxScroller", ready: true },
            { label: "Text reveal", url: "/components/scrolling-animation/text/", description: "Body text that turns from grey to dark word by word on scroll.", utils: "_parallaxScroller", ready: true },
            { label: "Video intro", url: "/components/scrolling-animation/video-intro/", description: "Sticky video whose cover fades in, then titles step in on scroll.", utils: "_parallaxScroller · _hlsVideo", ready: true },
        ],
    },
    {
        category: "Three.js background",
        url: "/components/three-background/",
        items: [
            { label: "Blobs", url: "/components/three-background/blobs/", description: "Big soft colors with grain that glide to new colors.", utils: "_threeBlobs", ready: true },
            { label: "Glow", url: "/components/three-background/glow/", description: "One soft glow that follows the mouse, over film grain.", utils: "_threeGlow", ready: true },
            { label: "Particles", url: "/components/three-background/particles/", description: "Dots that drift and move away from the mouse.", utils: "_threeParticles", ready: true },
        ],
    },
    {
        category: "Sliders",
        url: "/components/sliders/",
        items: [
            { label: "Comic slider", url: "/components/sliders/comic/", description: "Goes through comic pages frame by frame, with a frame generator.", utils: "_comicSlider", ready: true },
            { label: "Loop slider", url: "/components/sliders/loop/", description: "An endless row that moves on scroll, drag or as a marquee.", utils: "_horizontalLoop · GSAP", ready: true },
            { label: "Peek slider", url: "/components/sliders/peek/", description: "A carousel of 1 to 3 cards, with the next one peeking at the edge.", utils: "_peekSlider · Swiper", ready: true },
            { label: "Snap slider", url: "/components/sliders/snap/", description: "A card row on native scroll snap, no library.", utils: "_snapSlider", ready: true },
        ],
    },
    {
        category: "Media",
        items: [
            { label: "Lazyload", url: "/components/lazyload/", description: "Images, backgrounds and videos that load as they near the screen.", utils: "_lazyLoad", ready: true, starter: true },
            { label: "Lightbox", url: "/components/lightbox/", description: "Opens any element on the page in a popup, modals stack.", utils: "_lightbox", ready: true },
            { label: "Video player", url: "/components/video-player/", description: "MP4 and HLS videos, with muted autoplay backgrounds.", utils: "_videoPlayer", ready: true },
            { label: "YouTube player", url: "/components/youtube-player/", description: "YouTube embeds, with muted autoplay backgrounds.", utils: "_youtubePlayer", ready: true },
        ],
    },
    {
        category: "Layout",
        items: [
            { label: "Accordion", url: "/components/accordion/", description: "Titles that open and close their content in place, for FAQs.", utils: "_accordion", ready: true },
            { label: "Breakpoints", url: "/components/breakpoints/", description: "The responsive breakpoints, shown live as you resize.", utils: "Tailwind @theme", ready: true },
            { label: "Fluid sizing", url: "/components/fluid-sizing/", description: "Tailwind sizes that scale with their section width, using cqw.", utils: "fluid · cqw", ready: true },
            { label: "Group height", url: "/components/group-height/", description: "Equalize heights across grouped elements.", utils: "_groupHeight", ready: true },
            { label: "Hover indicator", url: "/components/hover-indicator/", description: "A background or line that slides to the hovered or selected item.", utils: "_hoverIndicator", ready: true },
            { label: "Tabs", url: "/components/tabs/", description: "Links that switch between content panels, nestable.", utils: "_tabs", ready: true },
        ],
    },
    {
        category: "Forms",
        items: [
            { label: "Search suggestion", url: "/components/search-suggestion/", description: "Suggestions below a search input as you type, with keyboard support.", utils: "_autocomplete", ready: true },
            { label: "Select box", url: "/components/select-box/", description: "A styled dropdown for a native select, with search and keyboard support.", utils: "_selectBox", ready: true },
        ],
    },
    {
        category: "Utilities",
        items: [
            { label: "Countdown timer", url: "/components/countdown-timer/", description: "Countdown to a date and time.", utils: "_countdownTimer · _rollingNumber", ready: true },
            { label: "Google Map", url: "/components/google-map/", description: "Markers, popups and a custom theme, with a location list that flies to each place.", utils: "_googleMap", ready: true },
            { label: "QR code", url: "/components/qr-code/", description: "QR codes for links or Wi-Fi, saved as PNG or SVG.", utils: "_qrCode", ready: true },
        ],
    },
    {
        category: "Helpers",
        items: [
            { label: "Auto scroll", url: "/components/auto-scroll/", description: "Smooth scroll to an element, below the sticky header.", utils: "_autoScroll", ready: true },
            { label: "Emitter", url: "/components/emitter/", description: "Base class that gives your own utils events, on() and off().", utils: "_emitter", ready: true, starter: true },
            { label: "Enquire", url: "/components/enquire/", description: "Run code once each time the window enters a breakpoint.", utils: "_enquire", ready: true },
            { label: "Events", url: "/components/event/", description: "Shared resize, scroll and element-size listeners, plus custom events.", utils: "_event", ready: true, starter: true },
            { label: "Filter", url: "/components/filter/", description: "Live search for a list, set up with data attributes.", utils: "_filter", ready: true },
            { label: "Inview", url: "/components/inview/", description: "Run a callback when an element scrolls into or out of view.", utils: "_inview", ready: true, starter: true },
        ],
    },
];
