// runs a breakpoint's function each time the window enters it
// usage: new _enquire({ 0: (enquire) => {}, 768: (enquire) => {} })
// keys are min-widths in px, enquire.breakpoint is the one entered
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
