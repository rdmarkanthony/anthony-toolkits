// calls the function of the breakpoint the window is in, once each time it enters it
// usage: new _enquire({ 0: (enquire) => {}, 768: (enquire) => {} }), enquire.breakpoint is the width it entered
// keys are min-widths in px, matched with matchMedia so they agree with the CSS media queries
export class _enquire {
    constructor(breakpoints = {}) {
        this.queries = Object.entries(breakpoints)
            .map(([width, callback]) => ({ width: parseFloat(width), callback }))
            .sort((a, b) => a.width - b.width)
            .map((item) => ({ ...item, query: window.matchMedia(`(min-width: ${item.width}px)`) }));

        this.breakpoint = null;
        this.prevBreakpoint = null;

        this.update = this.update.bind(this);
        this.queries.forEach(({ query }) => query.addEventListener("change", this.update));

        this.update();
    }

    update() {
        const _match = this.queries.findLast(({ query }) => query.matches);
        const _breakpoint = _match?.width ?? null;

        // crossing two breakpoints at once fires two changes
        if (_breakpoint === this.breakpoint) return;

        this.prevBreakpoint = this.breakpoint;
        this.breakpoint = _breakpoint;

        _match?.callback(this);
    }

    destroy() {
        this.queries.forEach(({ query }) => query.removeEventListener("change", this.update));
    }
}
