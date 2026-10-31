// calls back when the target scrolls into view
// usage: new _inview({ target, callback: (instance) => instance.visible })
export class _inview {
    constructor(props) {
        this.target = props.target ?? null;
        this.observeOnce = props.observeOnce !== false;
        this.observeRatio = props.observeRatio ?? 0;
        this.threshold = props.threshold ?? this.observeRatio;
        this.delay = props.delay ?? 0;

        this.visible = false;
        this.observer = null;

        if (props.target) this.init(props.callback);
    }

    init(callback) {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= this.observeRatio) {
                        if (this.visible) return;
                        this.visible = true;

                        if (callback) setTimeout(() => callback(this), this.delay);

                        if (this.observeOnce) this.destroy();
                    } else {
                        if (!this.visible) return;
                        this.visible = false;

                        if (callback) setTimeout(() => callback(this), this.delay);
                    }
                });
            },
            {
                root: null,
                rootMargin: "0px",
                threshold: this.threshold,
            }
        );

        this.observer.observe(this.target);
    }

    destroy() {
        this.observer?.disconnect();
        this.observer = null;
    }
}
