// component registry: drives the home page, header and footer
// set `ready: true` once the component is migrated to src/components/
// category `url`: overview page, `utils`: card label
// `starter: true` adds it to the starter kit popup
// `favorite: true` adds a star on its home card
export default [
    {
        category: "Animation",
        items: [
            { label: "Animate", url: "/components/animate/", description: "Animate.css effects triggered in view.", utils: "_animate · _inview · _splitText", ready: true, starter: true, favorite: true },
            { label: "Count up", url: "/components/count-up/", description: "Stats that count up on screen, prices that count to a new value.", utils: "_countUp · _inview", ready: true },
            { label: "Cursor bubble", url: "/components/cursor-bubble/", description: "A dot that trails the mouse, grows over big type and shows labels.", utils: "_cursorBubble", ready: true },
            { label: "Magnetic button", url: "/components/magnetic-button/", description: "Buttons and links that lean toward the mouse as it comes near.", utils: "_magnetic", ready: true },
            { label: "Page transition", url: "/components/page-transition/", description: "An animation as a link leaves the page and as the next one shows, safe with the back button.", utils: "_pageTransition", ready: true, favorite: true },
            { label: "Rolling digit", url: "/components/rolling-digit/", description: "Odometer digits for a stat on screen or a cart total.", utils: "_rollingDigit · _inview", ready: true },
            { label: "Theme scroller", url: "/components/theme-scroller/", description: "The page or header takes the theme of the section on screen.", utils: "_themeScroller", ready: true, favorite: true },
        ],
    },
    {
        category: "Text effects",
        url: "/components/text-effects/",
        items: [
            { label: "Blur reveal", url: "/components/text-effects/blur/", description: "Words come in from blurred to sharp as a title scrolls into view.", utils: "_animate · _splitText", ready: true },
            { label: "Highlight", url: "/components/text-effects/highlight/", description: "A marker color grows behind a few words as they come into view.", utils: "_animate · _inview", ready: true },
            { label: "Hover marquee", url: "/components/text-effects/marquee/", description: "A link whose label turns into an endless row while hovered.", utils: "_horizontalLoop · GSAP", ready: true },
            { label: "Line reveal", url: "/components/animate/#split-text", description: "Title words slide up from behind each line's mask as they come into view.", utils: "_animate · _splitText", ready: true },
            { label: "Scramble text", url: "/components/text-effects/scramble/", description: "Letters flip through random characters, then settle into the text.", utils: "_scrambleText", ready: true },
            { label: "Split hover", url: "/components/text-effects/split/", description: "The word splits at the middle, the halves slide apart and a copy opens.", utils: "CSS only", ready: true },
            { label: "Text roll", url: "/components/text-effects/roll/", description: "Link and button text that rolls up on hover, a copy coming in from below.", utils: "_textRoll", ready: true },
            { label: "Typing animation", url: "/components/text-effects/typing/", description: "Types and erases lines, with styled parts and a steady cursor.", utils: "_typing", ready: true },
            { label: "Weight hover", url: "/components/text-effects/weight/", description: "Letters near the mouse get bolder, a wave that follows the cursor.", utils: "_weightHover", ready: true },
            { label: "Weight pop", url: "/components/text-effects/weight-pop/", description: "On hover the letters pop bolder one after another, then settle back.", utils: "_weightPop", ready: true },
        ],
    },
    {
        category: "Scrolling animation",
        url: "/components/scrolling-animation/",
        items: [
            { label: "Background wash", url: "/components/scrolling-animation/background-wash/", description: "The next section's color rises from the bottom with a cloudy edge.", utils: "_parallaxScroller", ready: true },
            { label: "Canvas image sequence", url: "/components/scrolling-animation/canvas/", description: "Scrub through image frames on a canvas as you scroll.", utils: "_canvasBanner · _parallaxScroller", ready: true },
            { label: "Card stack", url: "/components/scrolling-animation/card-stack/", description: "Sticky cards slide over each other, covered ones shrink and dim.", utils: "_parallaxScroller", ready: true },
            { label: "Horizontal scroll", url: "/components/scrolling-animation/horizontal-scroll/", description: "A pinned row moves sideways, layers inside move faster or slower.", utils: "_parallaxScroller", ready: true },
            { label: "Image expand", url: "/components/scrolling-animation/image-expand/", description: "A small banner grows to cover the screen, then a heading comes in.", utils: "_parallaxScroller", ready: true },
            { label: "Parallax background", url: "/components/scrolling-animation/background/", description: "Backgrounds and floating elements that move slower than the page.", utils: "_parallaxBackground · _parallaxFloating", ready: true, favorite: true },
            { label: "Smooth scroll", url: "/components/scrolling-animation/smooth-scroll/", description: "Lenis smooths the page scroll, scroll animations follow it.", utils: "_smoothScroll · _parallaxScroller", ready: true },
            { label: "Stacking columns", url: "/components/scrolling-animation/stacking-columns/", description: "A pinned row where each column stays while the next slides over it.", utils: "_parallaxScroller", ready: true },
            { label: "Text reveal", url: "/components/scrolling-animation/text/", description: "Body text that turns from grey to dark word by word on scroll.", utils: "_parallaxScroller", ready: true },
            { label: "Text wave", url: "/components/scrolling-animation/text-wave/", description: "A pinned paragraph where each letter pops bold, then settles, on scroll.", utils: "_parallaxScroller", ready: true },
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
            { label: "Reveal", url: "/components/three-background/reveal/", description: "The mouse paints a trail that shows the color photo, then it fades.", utils: "_threeReveal", ready: true },
            { label: "Dot grid", url: "/components/three-background/dot-grid/", description: "A grid of dots that show in drifting patches, the mouse leaves a lit trail.", utils: "_threeDotGrid", ready: true },
            { label: "Grain text", url: "/components/three-background/text/", description: "Words made of grains in every row, the mouse pushes them.", utils: "_threeText", ready: true },
        ],
    },
    {
        category: "Lottie",
        url: "/components/lottie/",
        items: [
            { label: "Lottie basic", url: "/components/lottie/basic/", description: "Options, your own controls, an intro then a loop, emoji in text.", utils: "_lottie · lottie-web", ready: true },
            { label: "Lottie hover and click", url: "/components/lottie/play/", description: "Emoji on hover, and click toggles: a like, a menu, video play and mute.", utils: "_lottie · lottie-web", ready: true },
            { label: "Lottie scroll", url: "/components/lottie/scroll/", description: "The frames follow the scroll, pinned or as it passes.", utils: "_lottie · _parallaxScroller · lottie-web", ready: true },
        ],
    },
    {
        category: "Sliders",
        url: "/components/sliders/",
        items: [
            { label: "Comic slider", url: "/components/sliders/comic/", description: "Goes through comic pages frame by frame, with a frame generator.", utils: "_comicSlider", ready: true },
            { label: "Deck slider", url: "/components/sliders/deck/", description: "A stack of tilted cards, the top one is thrown off and slides back in at the bottom.", utils: "_deckSlider", ready: true },
            { label: "Lightbox gallery", url: "/components/lightbox/#image-gallery", description: "Image links open full screen as a gallery, with thumbnails and swipe.", utils: "_lightboxGallery · _lightbox", ready: true },
            { label: "Loop slider", url: "/components/sliders/loop/", description: "An endless row that moves on scroll, drag or as a marquee.", utils: "_horizontalLoop · GSAP", ready: true },
            { label: "Peek slider", url: "/components/sliders/peek/", description: "A carousel of 1 to 3 cards, with the next one peeking at the edge.", utils: "_peekSlider · Swiper", ready: true },
            { label: "Scrollbar slider", url: "/components/sliders/scrollbar/", description: "A free-scrolling card row with a bar to drag and arrows over the cards.", utils: "_scrollbarSlider", ready: true },
            { label: "Snap slider", url: "/components/sliders/snap/", description: "A card row on native scroll snap, no library.", utils: "_snapSlider", ready: true, favorite: true },
        ],
    },
    {
        category: "Media",
        items: [
            { label: "Lazyload", url: "/components/lazyload/", description: "Images, backgrounds and videos that load as they near the screen.", utils: "_lazyLoad", ready: true, starter: true, favorite: true },
            { label: "Lightbox", url: "/components/lightbox/", description: "Opens any element on the page in a popup, modals stack. Image links open as a gallery.", utils: "_lightbox · _lightboxGallery", ready: true },
            { label: "Video player", url: "/components/video-player/", description: "MP4 and HLS videos, with muted autoplay backgrounds.", utils: "_videoPlayer", ready: true },
            { label: "YouTube player", url: "/components/youtube-player/", description: "YouTube embeds, with muted autoplay backgrounds.", utils: "_youtubePlayer", ready: true },
        ],
    },
    {
        category: "Layout",
        items: [
            { label: "Accordion", url: "/components/accordion/", description: "Titles that open and close their content in place, for FAQs, also as chat bubbles.", utils: "_accordion", ready: true },
            { label: "Breakpoints", url: "/components/breakpoints/", description: "The responsive breakpoints, shown live as you resize.", utils: "Tailwind @theme", ready: true },
            { label: "Fluid sizing", url: "/components/fluid-sizing/", description: "Tailwind sizes that scale with their section width, using cqw.", utils: "fluid · cqw", ready: true, favorite: true },
            { label: "Group height", url: "/components/group-height/", description: "Equalize heights across grouped elements.", utils: "_groupHeight", ready: true },
            { label: "Header", url: "/components/header/", description: "Hides on scroll down, shows on scroll up, with a mobile menu that locks the page.", utils: "_header · _event", ready: true, favorite: true },
            { label: "Hover indicator", url: "/components/hover-indicator/", description: "A background or line that slides to the hovered or selected item.", utils: "_hoverIndicator", ready: true },
            { label: "Scroll progress", url: "/components/scroll-progress/", description: "How far down the page or an article you are, plus a back to top button.", utils: "_scrollProgress · _event", ready: true },
            { label: "Scrollspy", url: "/components/scrollspy/", description: "Marks the link of the section on screen, for contents, tabs or dots.", utils: "_scrollSpy · _event", ready: true },
            { label: "Tabs", url: "/components/tabs/", description: "Links that switch between content panels, nestable.", utils: "_tabs", ready: true },
            { label: "Tooltip", url: "/components/tooltip/", description: "A small label on hover or focus, or a quick message instead of alert().", utils: "_tooltip", ready: true },
        ],
    },
    {
        category: "Forms",
        items: [
            { label: "Form validation", url: "/components/form-validation/", description: "Checks fields as people type, with events to show errors your own way.", utils: "_formValidation", ready: true },
            { label: "Range slider", url: "/components/range-slider/", description: "A styled range input with one thumb or two, still a native input.", utils: "_rangeSlider", ready: true },
            { label: "Search suggestion", url: "/components/search-suggestion/", description: "Suggestions below a search input as you type, with keyboard support.", utils: "_autocomplete", ready: true },
            { label: "Select box", url: "/components/select-box/", description: "A styled dropdown for a native select, with search and keyboard support.", utils: "_selectBox", ready: true },
        ],
    },
    {
        category: "Utilities",
        items: [
            { label: "Countdown timer", url: "/components/countdown-timer/", description: "Countdown to a date and time.", utils: "_countdownTimer · _rollingDigit", ready: true },
            { label: "Google Map", url: "/components/google-map/", description: "Markers, popups and a custom theme, with a location list that flies to each place.", utils: "_googleMap", ready: true },
            { label: "QR code", url: "/components/qr-code/", description: "QR codes for links or Wi-Fi, saved as PNG or SVG.", utils: "_qrCode", ready: true },
            { label: "Share", url: "/components/share/", description: "Share links, a copy link button and the phone share sheet.", utils: "_share", ready: true },
        ],
    },
    {
        category: "Helpers",
        items: [
            { label: "Auto scroll", url: "/components/auto-scroll/", description: "Smooth scroll to an element, below the sticky header.", utils: "_autoScroll", ready: true },
            { label: "Device", url: "/components/device/", description: "The OS, browser and mobile from the user agent, plus touch and hover.", utils: "_device", ready: true },
            { label: "Emitter", url: "/components/emitter/", description: "Base class that gives your own utils events, on() and off().", utils: "_emitter", ready: true, starter: true, favorite: true },
            { label: "Enquire", url: "/components/enquire/", description: "Run code once each time the window enters a breakpoint.", utils: "_enquire", ready: true },
            { label: "Events", url: "/components/event/", description: "Shared resize, scroll and element-size listeners, plus custom events.", utils: "_event", ready: true, starter: true, favorite: true },
            { label: "Filter", url: "/components/filter/", description: "Live search for a list, set up with data attributes.", utils: "_filter", ready: true },
            { label: "Inview", url: "/components/inview/", description: "Run a callback when an element scrolls into or out of view.", utils: "_inview", ready: true, starter: true },
            { label: "Load", url: "/components/load/", description: "Load a script, stylesheet or JSON once, with await.", utils: "_load", ready: true },
            { label: "URL vars", url: "/components/url-vars/", description: "Read and write ?query vars without a reload, so a page can be shared as it is.", utils: "_urlVars", ready: true },
        ],
    },
];
