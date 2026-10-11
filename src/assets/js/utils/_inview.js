export class _inview {
    constructor(props) {
        this.target = props.target ?? null;
        this.observeOnce = props.observeOnce !== false;
        this.observeRatio = props.observeRatio ?? 0;
        this.threshold = props.threshold ?? 0;
        this.delay = props.delay ?? 0;

        this.visible = false;

        if (props.target) this.init(props.callback);
    }

    init(callback) {
        const _observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= this.observeRatio) {
                        if (this.visible) return;
                        this.visible = true;

                        if (callback) setTimeout(() => callback(this), this.delay);

                        if (this.observeOnce) _observer.disconnect();
                    } else {
                        this.visible = false;
                        if (!this.observeOnce && callback) setTimeout(() => callback(this), this.delay);
                    }
                });
            },
            {
                root: null,
                rootMargin: "0px",
                threshold: this.threshold,
            }
        );

        _observer.observe(this.target);
    }
}
