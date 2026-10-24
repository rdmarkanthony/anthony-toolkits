import { _emitter } from "./_emitter";

// usage: new _share({ target, url, title, text, popup, events })
// target holds [data-share="x"] links or buttons: x, facebook, linkedin, whatsapp, telegram, threads, reddit, line, email, copy, native
// url, title, text: props, else target data-share-url/-title/-text, else the page (canonical, document.title, meta description)
// links get their href (new tab, or a small window with popup: true), copy gets data-copied for 2s
// native opens the phone share sheet; where it can't, a native button with popovertarget opens that popover, one without is hidden
const _encode = encodeURIComponent;

export class _share extends _emitter {
    // add your own: _share.networks.pinterest = ({ url, title }) => `...`
    static networks = {
        x: ({ url, title }) => `https://x.com/intent/post?url=${_encode(url)}&text=${_encode(title)}`,
        facebook: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${_encode(url)}`,
        linkedin: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${_encode(url)}`,
        whatsapp: ({ url, title }) => `https://wa.me/?text=${_encode(`${title} ${url}`)}`,
        telegram: ({ url, title }) => `https://t.me/share/url?url=${_encode(url)}&text=${_encode(title)}`,
        threads: ({ url, title }) => `https://www.threads.net/intent/post?text=${_encode(`${title} ${url}`)}`,
        reddit: ({ url, title }) => `https://www.reddit.com/submit?url=${_encode(url)}&title=${_encode(title)}`,
        line: ({ url }) => `https://social-plugins.line.me/lineit/share?url=${_encode(url)}`,
        email: ({ url, title, text }) => `mailto:?subject=${_encode(title)}&body=${_encode([text, url].filter(Boolean).join("\n\n"))}`,
    };

    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.props = props;
        this.popup = props.popup ?? false;

        // the one being reported in events
        this.network = null;
        this.error = null;
        this.canShare = false;

        this.timers = new WeakMap();

        this.abort = new AbortController();

        if (this.target) this.init();
    }

    get data() {
        const _set = this.target.dataset;
        const _canonical = document.querySelector('link[rel="canonical"]')?.href;
        const _description = document.querySelector('meta[name="description"]')?.content;

        return {
            url: this.props.url ?? _set.shareUrl ?? _canonical ?? location.href,
            title: this.props.title ?? _set.shareTitle ?? document.title,
            text: this.props.text ?? _set.shareText ?? _description ?? "",
        };
    }

    init() {
        const { signal } = this.abort;

        this.refresh();
        this.target.addEventListener("click", (e) => this.click(e), { signal });
    }

    // after the url or title changes
    refresh() {
        const _data = this.data;
        const _canShare = !!navigator.share && (!navigator.canShare || navigator.canShare({ url: _data.url }));

        this.target.querySelectorAll("[data-share]").forEach((item) => {
            const _network = _share.networks[item.dataset.share];

            if (_network && item.tagName === "A") {
                item.href = _network(_data);
                if (item.dataset.share !== "email") {
                    item.target = "_blank";
                    item.rel = "noopener";
                }
            }

            if (item.dataset.share !== "native") return;
            // the sheet wins over the popover, no sheet and no popover hides it
            if (_canShare) item.removeAttribute("popovertarget");
            else if (!item.hasAttribute("popovertarget")) item.hidden = true;
        });

        this.canShare = _canShare;
    }

    click(e) {
        const _item = e.target.closest("[data-share]");
        if (!_item || !this.target.contains(_item)) return;

        const _name = _item.dataset.share;
        this.network = _name;

        if (_name === "copy") {
            e.preventDefault();
            return this.copy(_item);
        }

        if (_name === "native") {
            // no sheet here, the popover opens instead
            if (!this.canShare) return;
            e.preventDefault();
            return this.native();
        }

        const _network = _share.networks[_name];
        if (!_network) return;

        // a small window instead of a tab, not for email
        if (this.popup && _name !== "email") {
            e.preventDefault();
            const _width = 600;
            const _height = 600;
            window.open(_network(this.data), "share", `width=${_width},height=${_height},left=${(screen.width - _width) / 2},top=${(screen.height - _height) / 2},noopener`);
        } else if (_item.tagName !== "A") {
            window.open(_network(this.data), _name === "email" ? "_self" : "_blank", "noopener");
        }

        this.emit("share");
    }

    async copy(item) {
        const { url } = this.data;

        try {
            await navigator.clipboard.writeText(url);
        } catch (error) {
            // older browsers, or no clipboard permission
            const _field = Object.assign(document.createElement("textarea"), { value: url });
            _field.style.cssText = "position:fixed;opacity:0";
            document.body.append(_field);
            _field.select();
            const _done = document.execCommand("copy");
            _field.remove();

            if (!_done) {
                this.error = error;
                return this.emit("error");
            }
        }

        item.setAttribute("data-copied", "");
        clearTimeout(this.timers.get(item));
        this.timers.set(item, setTimeout(() => item.removeAttribute("data-copied"), 2000));

        this.emit("copy");
    }

    async native() {
        const { url, title, text } = this.data;

        try {
            await navigator.share({ url, title, text });
            this.emit("share");
        } catch (error) {
            // closing the sheet isn't an error
            if (error.name === "AbortError") return;
            this.error = error;
            this.emit("error");
        }
    }

    destroy() {
        this.abort.abort();
    }
}
