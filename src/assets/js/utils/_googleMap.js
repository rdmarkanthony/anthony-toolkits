import { _emitter } from "./_emitter";

// usage: new _googleMap({ target, apiKey, markers: [{ id, lat, lng, title, popup }], styles, selectZoom, render, events })
// styles: a JSON theme, ignored with options.mapId; looks in `classes`
// the api loads once per page, when the first map nears the screen
let _api = null;
let _Overlay = null;
const _instances = new Set();

window.gm_authFailure = () => _instances.forEach((instance) => instance.emit("error"));

const _loadAPI = (key) =>
    (_api ??= new Promise((resolve, reject) => {
        if (window.google?.maps?.importLibrary) return resolve();

        window.__googleMapReady = resolve;
        const _script = document.createElement("script");
        _script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=__googleMapReady`;
        _script.async = true;
        _script.onerror = reject;
        document.head.append(_script);
    }));

const _overlay = (OverlayView) =>
    (_Overlay ??= class extends OverlayView {
        constructor({ position, el, pane, anchor, lift }) {
            super();
            Object.assign(this, { position, el, pane, anchor, lift });
            this.el.style.position = "absolute";
        }

        onAdd() {
            OverlayView.preventMapHitsAndGesturesFrom(this.el);
            this.getPanes()[this.pane].append(this.el);
        }

        draw() {
            const _point = this.getProjection()?.fromLatLngToDivPixel(this.position);
            if (!_point) return;

            const _y = _point.y - (this.lift?.() ?? 0);
            this.el.style.transform = `translate(calc(${_point.x}px - 50%), calc(${_y}px - ${this.anchor === "center" ? 50 : 100}%))`;
        }

        onRemove() {
            this.el.remove();
        }
    });

const _wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class _googleMap extends _emitter {
    static classes = {
        marker: "block origin-bottom cursor-pointer text-red-600 transition-[scale] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-950 aria-pressed:scale-125",
        popup: "w-64 rounded-xl bg-white p-4 pr-10 text-sm text-gray-950 shadow-lg",
        close: "absolute top-2 right-2 grid size-7 cursor-pointer place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950",
        arrow: "absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-white",
    };

    static pin = `<svg class="h-10 w-8 drop-shadow" viewBox="4 2 16 20" fill="currentColor" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 11.5 7.35 11.76a1 1 0 0 0 1.3 0C12.95 21.5 20 15.4 20 10a8 8 0 0 0-8-8Z"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`;

    constructor(props = {}) {
        super(props.events);

        this.target = typeof props.target === "string" ? document.querySelector(props.target) : props.target;
        this.apiKey = props.apiKey ?? "";
        this.list = props.markers ?? [];
        this.center = props.center ?? null;
        this.zoom = props.zoom ?? 14;
        this.selectZoom = props.selectZoom ?? null;
        this.styles = props.styles ?? null;
        this.options = props.options ?? {};
        this.render = props.render ?? (() => _googleMap.pin);
        this.anchor = props.anchor ?? "bottom";
        this.classes = { ..._googleMap.classes, ...props.classes };
        this.lazy = props.lazy ?? true;

        this.map = null;
        this.markers = [];
        this.item = null;
        this.pending = null;
        this.popup = null;
        this.home = null;
        this.lib = null;
        this.abort = new AbortController();

        if (!this.target) return;
        if (!this.apiKey) return console.warn("_googleMap: no apiKey", this.target);

        _instances.add(this);
        this.init();
    }

    init() {
        if (!this.lazy) return this.load();

        this.observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                this.observer.disconnect();
                this.load();
            },
            { rootMargin: "300px" }
        );
        this.observer.observe(this.target);
    }

    async load() {
        try {
            await _loadAPI(this.apiKey);
        } catch {
            return this.emit("error");
        }

        const [{ Map, OverlayView }, { LatLngBounds, event }] = await Promise.all([google.maps.importLibrary("maps"), google.maps.importLibrary("core")]);
        if (this.abort.signal.aborted) return;
        this.lib = { OverlayView, LatLngBounds, event };

        this.map = new Map(this.target, {
            center: this.center ?? this.list[0] ?? { lat: 0, lng: 0 },
            zoom: this.zoom,
            styles: this.styles,
            mapTypeControl: false,
            streetViewControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
            ...this.options,
        });

        event.addListenerOnce(this.map, "idle", () => (this.home = { center: this.map.getCenter(), zoom: this.map.getZoom() }));
        this.target.addEventListener("keydown", (e) => e.key === "Escape" && this.item && this.deselect(true), { signal: this.abort.signal });

        const _pending = this.pending;
        this.setMarkers(this.list, !this.center);
        this.emit("ready");
        if (_pending) this.select(_pending);
    }

    setMarkers(list, fit = true) {
        this.list = list;
        if (!this.map) return;

        this.deselect();
        this.markers.forEach((marker) => marker.overlay.setMap(null));

        const Overlay = _overlay(this.lib.OverlayView);
        this.markers = list.map((data) => {
            const el = document.createElement("button");
            el.type = "button";
            el.className = this.classes.marker;
            el.setAttribute("aria-label", data.title ?? "");
            el.setAttribute("aria-pressed", "false");
            el.innerHTML = this.render(data);
            el.addEventListener("click", () => this.select(data));

            const overlay = new Overlay({ position: data, el, pane: "overlayMouseTarget", anchor: this.anchor });
            overlay.setMap(this.map);
            return { data, el, overlay };
        });

        if (fit) this.fit();
    }

    fit(padding = 64) {
        if (!this.map || !this.markers.length) return;
        if (this.markers.length === 1) {
            this.map.setCenter(this.markers[0].data);
            this.map.setZoom(this.zoom);
            return;
        }

        const _bounds = new this.lib.LatLngBounds();
        this.markers.forEach(({ data }) => _bounds.extend(data));
        this.map.fitBounds(_bounds, padding);
    }

    async zoomTo(zoom, position) {
        const _run = (this.run = {});
        if (position) this.map.panTo(position);

        while (this.map.getZoom() !== zoom) {
            await _wait(100);
            if (this.run !== _run || !this.map) return false;
            this.map.setZoom(this.map.getZoom() + Math.sign(zoom - this.map.getZoom()));
        }
        return true;
    }

    // by data or id, the selected one zooms back in
    async select(item) {
        if (!this.map) return void (this.pending = item);
        this.pending = null;

        const _marker = this.markers.find(({ data }) => data === item || data.id === item);
        if (!_marker) return;
        if (_marker.data === this.item) return this.focus();

        const _switching = !!this.item;
        this.clear();
        this.item = _marker.data;
        _marker.el.setAttribute("aria-pressed", "true");
        _marker.el.style.zIndex = 1;
        if (this.item.popup) this.open(_marker);
        this.emit("select");

        if (!this.selectZoom) return this.pan();

        const _homeZoom = this.home?.zoom ?? this.zoom;
        if (_switching && this.map.getZoom() > _homeZoom) {
            if (!(await this.zoomTo(_homeZoom))) return;
            await _wait(300);
        }
        this.focus();
    }

    async focus() {
        if (!this.item) return;
        if (!this.selectZoom || (await this.zoomTo(this.selectZoom, this.item))) this.pan();
    }

    pan() {
        if (!this.item) return;
        this.map.panTo(this.item);
        if (this.popup) this.map.panBy(0, -this.popup.el.offsetHeight / 2);
    }

    deselect(focus = false) {
        this.pending = null;
        if (!this.item) return;
        if (focus) this.markers.find(({ data }) => data === this.item)?.el.focus();

        this.clear();
        this.emit("deselect");
    }

    clear() {
        const _marker = this.markers.find(({ data }) => data === this.item);
        _marker?.el.setAttribute("aria-pressed", "false");
        _marker?.el.style.removeProperty("z-index");

        this.popup?.setMap(null);
        this.popup = null;
        this.item = null;
    }

    reset() {
        if (this.home) return this.zoomTo(this.home.zoom, this.home.center);
    }

    open(marker) {
        const el = document.createElement("div");
        el.className = this.classes.popup;
        el.innerHTML = `${marker.data.popup}<span class="${this.classes.arrow}"></span>`;

        const _close = document.createElement("button");
        _close.type = "button";
        _close.className = this.classes.close;
        _close.setAttribute("aria-label", "Close");
        _close.innerHTML = `<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
        _close.addEventListener("click", () => this.deselect(true));
        el.append(_close);

        const _lift = () => (this.anchor === "center" ? marker.el.offsetHeight / 2 : marker.el.offsetHeight) + 12;
        this.popup = new (_overlay(this.lib.OverlayView))({ position: marker.data, el, pane: "floatPane", lift: _lift });
        this.popup.setMap(this.map);
    }

    setStyles(styles) {
        this.styles = styles;
        this.map?.setOptions({ styles });
    }

    destroy() {
        _instances.delete(this);
        this.abort.abort();
        this.observer?.disconnect();
        this.run = null;
        this.clear();
        this.markers.forEach((marker) => marker.overlay.setMap(null));
        if (this.map) this.lib.event.clearInstanceListeners(this.map);
        this.target?.replaceChildren();
        this.map = null;
        this.markers = [];
    }
}
