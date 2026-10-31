// rAF tween for values css can't animate, like the scroll position or a js object
// usage: const tween = _tween({ duration, ease, update(progress), complete }), tween.stop()
// duration in ms, ease is a gsap-style name ("power2.out", "power4.inOut"...) or (p) => p

const _eases = {
    none: (p) => p,
    power0: (p) => p,
    power1: (p) => p ** 2,
    power2: (p) => p ** 3,
    power3: (p) => p ** 4,
    power4: (p) => p ** 5,
    sine: (p) => 1 - Math.cos((p * Math.PI) / 2),
    expo: (p) => (p ? 2 ** (10 * (p - 1)) : 0),
    circ: (p) => 1 - Math.sqrt(1 - p * p),
};

export const _easing = (ease = "power1.out") => {
    if (typeof ease === "function") return ease;

    const [_name, _type = "out"] = String(ease).split(".");
    const _in = _eases[_name] ?? _eases.power1;

    if (_type === "in") return _in;
    if (_type === "inOut") return (p) => (p < 0.5 ? _in(p * 2) / 2 : 1 - _in((1 - p) * 2) / 2);
    return (p) => 1 - _in(1 - p);
};

export const _tween = ({ duration = 500, ease, update, complete } = {}) => {
    const _ease = _easing(ease);
    const _start = performance.now();
    let _frame;

    const _step = (now) => {
        const _progress = duration > 0 ? Math.min((now - _start) / duration, 1) : 1;
        update?.(_ease(_progress));

        if (_progress < 1) _frame = requestAnimationFrame(_step);
        else complete?.();
    };
    _step(_start);

    return { stop: () => cancelAnimationFrame(_frame) };
};
