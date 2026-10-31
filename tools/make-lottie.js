// builds the toolkit's own lottie samples into src/assets/lottie/, no third-party files
// usage: pnpm lottie, or pnpm lottie plane to build one
// frames are at 60fps, colors are 0 to 1, positions are in comp px
import { mkdirSync, writeFileSync } from "node:fs";

const _out = "src/assets/lottie";
const _only = process.argv[2];

const _black = [0.07, 0.07, 0.09, 1];
const _white = [1, 1, 1, 1];
const _easeOut = { i: { x: [0.16], y: [1] }, o: { x: [0.3], y: [0] } };
const _easeInOut = { i: { x: [0.65], y: [1] }, o: { x: [0.35], y: [0] } };
const _linear = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };

const _static = (value) => ({ a: 0, k: value });

const _anim = (keys, ease = _easeOut) => ({
    a: 1,
    k: keys.map(([t, value], index) => ({ t, s: [].concat(value), ...(index < keys.length - 1 ? ease : {}) })),
});

const _transform = ({ p, a, s, r, o } = {}) => ({
    ty: "tr",
    p: p ?? _static([0, 0]),
    a: a ?? _static([0, 0]),
    s: s ?? _static([100, 100]),
    r: r ?? _static(0),
    o: o ?? _static(100),
});

const _group = (items, transform) => ({ ty: "gr", nm: "g", it: [...items, _transform(transform)], np: items.length });

const _shape = (points, closed = false) => {
    const _zero = points.map(() => [0, 0]);
    return { i: _zero, o: _zero, v: points, c: closed };
};

const _path = (points, closed = false) => ({ ty: "sh", d: 1, ks: _static(_shape(points, closed)) });

const _ellipse = (size, p = [0, 0]) => ({ ty: "el", d: 1, p: _static(p), s: _static([size, size]) });

const _stroke = (width, color = _black, o) => ({ ty: "st", c: _static(color), o: o ?? _static(100), w: _static(width), lc: 2, lj: 2, ml: 4 });

const _fill = (color = _black, o) => ({ ty: "fl", c: _static(color), o: o ?? _static(100), r: 1 });

const _trim = ({ s, e, o } = {}) => ({ ty: "tm", s: s ?? _static(0), e: e ?? _static(100), o: o ?? _static(0), m: 1 });

const _layer = (ind, shapes, op, p, name = "layer", { r, s, o } = {}) => ({
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ao: 0,
    bm: 0,
    ks: { o: o ?? _static(100), r: r ?? _static(0), p: Array.isArray(p) ? _static([...p, 0]) : p, a: _static([0, 0, 0]), s: s ?? _static([100, 100, 100]) },
    shapes,
    ip: 0,
    op,
    st: 0,
});

const _comp = (name, w, h, op, layers) => ({ v: "5.9.0", fr: 60, ip: 0, op, w, h, nm: name, ddd: 0, assets: [], layers });

const _samples = {
    spinner: () =>
        _comp("spinner", 120, 120, 60, [
            _layer(
                1,
                [
                    _group([
                        _ellipse(80),
                        _trim({
                            e: _static(28),
                            o: _anim(
                                [
                                    [0, 0],
                                    [60, 360],
                                ],
                                _easeInOut
                            ),
                        }),
                        _stroke(10),
                    ]),
                ],
                60,
                [60, 60],
                "arc"
            ),
            _layer(2, [_group([_ellipse(80), _stroke(10, _black, _static(12))])], 60, [60, 60], "ring"),
        ]),

    check: () =>
        _comp("check", 120, 120, 60, [
            _layer(
                1,
                [
                    _group([
                        _path([
                            [-20, 2],
                            [-6, 16],
                            [22, -14],
                        ]),
                        _trim({
                            e: _anim([
                                [22, 0],
                                [44, 100],
                            ]),
                        }),
                        _stroke(9, _white),
                    ]),
                ],
                60,
                [60, 60],
                "tick"
            ),
            _layer(
                2,
                [
                    _group([_ellipse(84), _fill()], {
                        s: _anim([
                            [0, [0, 0]],
                            [24, [100, 100]],
                        ]),
                    }),
                ],
                60,
                [60, 60],
                "dot",
                {
                    s: _anim(
                        [
                            [40, [100, 100, 100]],
                            [50, [108, 108, 100]],
                            [60, [100, 100, 100]],
                        ],
                        _easeInOut
                    ),
                }
            ),
        ]),

    menu: () => {
        const _lines = [
            [-18, 45],
            [0, null],
            [18, -45],
        ].map(([y, rotate]) => {
            const _line = [
                _path([
                    [-26, 0],
                    [26, 0],
                ]),
                _stroke(7),
            ];
            if (rotate === null)
                return _group(_line, {
                    o: _anim([
                        [0, 100],
                        [12, 0],
                    ]),
                    s: _anim([
                        [0, [100, 100]],
                        [12, [20, 100]],
                    ]),
                });
            return _group(_line, {
                p: _anim([
                    [0, [0, y]],
                    [16, [0, 0]],
                ]),
                r: _anim([
                    [8, 0],
                    [30, rotate],
                ]),
            });
        });
        return _comp("menu", 100, 100, 30, [_layer(1, _lines, 30, [50, 50], "lines")]);
    },

    sunrise: () => {
        const _rays = Array.from({ length: 8 }, (_, index) => {
            const _angle = (index * 45 * Math.PI) / 180;
            const [x, y] = [Math.cos(_angle), Math.sin(_angle)];
            return _path([
                [x * 62, y * 62],
                [x * 80, y * 80],
            ]);
        });
        return _comp("sunrise", 400, 300, 100, [
            _layer(
                1,
                [
                    _group([
                        _path([
                            [-180, 0],
                            [180, 0],
                        ]),
                        _trim({
                            e: _anim([
                                [0, 0],
                                [40, 100],
                            ]),
                        }),
                        _stroke(6),
                    ]),
                ],
                100,
                [200, 230],
                "ground"
            ),
            _layer(
                2,
                [
                    _group([..._rays, _stroke(6)], {
                        o: _anim([
                            [55, 0],
                            [75, 100],
                        ]),
                        r: _anim([
                            [55, -45],
                            [100, 0],
                        ]),
                        s: _anim([
                            [55, [70, 70]],
                            [90, [100, 100]],
                        ]),
                    }),
                ],
                100,
                [200, 120],
                "rays"
            ),
            _layer(
                3,
                [_group([_ellipse(90), _fill()])],
                100,
                _anim([
                    [20, [200, 230, 0]],
                    [80, [200, 120, 0]],
                ]),
                "sun",
                {
                    s: _anim([
                        [15, [0, 0, 100]],
                        [75, [100, 100, 100]],
                    ]),
                }
            ),
        ]);
    },

    // frame 0 rests where the button icon is, 0-75 takes off with a dashed trail, 75-100 pops back
    plane: () => {
        const _start = [200, 120];
        const [_flyStart, _flyEnd] = [10, 66];

        const _curve = (u) => [_start[0] + 230 * u, _start[1] + 18 * Math.sin(u * Math.PI * 1.2) - 150 * u ** 1.5];
        const _points = Array.from({ length: 9 }, (_, index) => _curve(index / 8));

        const _tangents = _points.map((_, index) => {
            const _before = _points[Math.max(index - 1, 0)];
            const _after = _points[Math.min(index + 1, _points.length - 1)];
            return [(_after[0] - _before[0]) / 6, (_after[1] - _before[1]) / 6];
        });

        const _position = _points.map((point, index) => {
            const _key = { t: _flyStart + ((_flyEnd - _flyStart) * index) / (_points.length - 1), s: [...point, 0] };
            if (index === _points.length - 1) return { ..._key, ..._linear };
            return { ..._key, ..._linear, to: [..._tangents[index], 0], ti: [-_tangents[index + 1][0], -_tangents[index + 1][1], 0] };
        });
        _position.unshift({ t: 0, s: [..._points[0], 0], ..._linear, to: [0, 0, 0], ti: [0, 0, 0] });
        _position.push({ t: 70, s: [..._points.at(-1), 0], ..._linear, h: 1 }, { t: 76, s: [..._points[0], 0] });

        const _icon = [
            [10, -10],
            [3, 10],
            [-1, 1],
            [-10, -3],
        ];
        const _plane = _layer(
            1,
            [
                _group(
                    [
                        _path(_icon, true),
                        _path([
                            [10, -10],
                            [-1, 1],
                        ]),
                        _stroke(2.4),
                        _fill(_white),
                    ],
                    {
                        r: _anim(
                            [
                                [0, 0],
                                [6, -25],
                                [12, 0],
                            ],
                            _easeInOut
                        ),
                    }
                ),
            ],
            100,
            { a: 1, k: _position },
            "plane",
            {
                o: {
                    a: 1,
                    k: [
                        { t: 58, s: [100], ..._linear },
                        { t: 66, s: [0], h: 1 },
                        { t: 76, s: [0], ..._easeOut },
                        { t: 90, s: [100] },
                    ],
                },
                s: {
                    a: 1,
                    k: [
                        { t: 0, s: [100, 100, 100], ..._easeInOut },
                        { t: 6, s: [88, 88, 100], ..._easeOut },
                        { t: 30, s: [120, 120, 100], ..._easeInOut },
                        { t: 66, s: [70, 70, 100], h: 1 },
                        { t: 76, s: [0, 0, 100], ..._easeOut },
                        { t: 96, s: [100, 100, 100] },
                    ],
                },
            }
        );

        const _trailPath = {
            ty: "sh",
            d: 1,
            ks: _static({
                i: _tangents.map(([x, y]) => [-x, -y]),
                o: _tangents,
                v: _points.map(([x, y]) => [x - _start[0], y - _start[1]]),
                c: false,
            }),
        };
        const _dashed = {
            ..._stroke(2.4, _black, _static(45)),
            d: [
                { n: "d", nm: "dash", v: _static(5) },
                { n: "g", nm: "gap", v: _static(7) },
            ],
        };
        const _trail = _layer(
            2,
            [
                _group([
                    _trailPath,
                    _trim({
                        s: _anim(
                            [
                                [24, 0],
                                [74, 100],
                            ],
                            _linear
                        ),
                        e: _anim(
                            [
                                [_flyStart, 0],
                                [_flyEnd, 100],
                            ],
                            _linear
                        ),
                    }),
                    _dashed,
                ]),
            ],
            100,
            _start,
            "trail"
        );

        return _comp("plane", 400, 240, 100, [_plane, _trail]);
    },

    // two parts: 0-24 the bell pops in, 24-120 it rings then rests, the part to loop
    bell: () => {
        const _body = [
            [-26, 42],
            [-20, 36],
            [-18, 20],
            [-14, 8],
            [-6, 1],
            [0, 0],
            [6, 1],
            [14, 8],
            [18, 20],
            [20, 36],
            [26, 42],
        ];
        return _comp("bell", 100, 100, 120, [
            _layer(
                1,
                [_group([_path(_body, true), _fill()]), _group([_ellipse(8, [0, -3]), _fill()]), _group([_ellipse(12, [0, 48]), _fill()])],
                120,
                [50, 24],
                "bell",
                {
                    s: _anim([
                        [0, [0, 0, 100]],
                        [14, [112, 112, 100]],
                        [24, [100, 100, 100]],
                    ]),
                    r: _anim(
                        [
                            [24, 0],
                            [30, 16],
                            [36, -14],
                            [42, 10],
                            [48, -6],
                            [54, 0],
                        ],
                        _easeInOut
                    ),
                }
            ),
        ]);
    },

    heart: () => {
        const _red = [0.94, 0.27, 0.35, 1];

        const _curve = Array.from({ length: 64 }, (_, index) => {
            const t = (index / 64) * Math.PI * 2;
            return [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
        });
        const _ys = _curve.map(([, y]) => y);
        const _middle = (Math.min(..._ys) + Math.max(..._ys)) / 2;
        const _heart = _curve.map(([x, y]) => [x * 2, (y - _middle) * 2]);

        const _dots = Array.from({ length: 8 }, (_, index) => {
            const _angle = ((index * 45 + 22.5) * Math.PI) / 180;
            const [x, y] = [Math.cos(_angle), Math.sin(_angle)];
            return _group([_ellipse(8), _fill(_red)], {
                p: _anim([
                    [10, [x * 36, y * 36]],
                    [30, [x * 54, y * 54]],
                ]),
                o: _anim([
                    [9, 0],
                    [10, 100],
                    [30, 0],
                ]),
                s: _anim([
                    [10, [100, 100]],
                    [30, [30, 30]],
                ]),
            });
        });

        return _comp("heart", 120, 120, 36, [
            _layer(1, _dots, 36, [60, 60], "burst"),
            _layer(
                2,
                [
                    _group([_path(_heart, true), _fill(_red)], {
                        s: _anim([
                            [4, [0, 0]],
                            [16, [118, 118]],
                            [24, [94, 94]],
                            [30, [100, 100]],
                        ]),
                    }),
                ],
                36,
                [60, 60],
                "fill"
            ),
            _layer(
                3,
                [
                    _group([_path(_heart, true), _stroke(6)], {
                        o: _anim([
                            [6, 100],
                            [14, 0],
                        ]),
                    }),
                ],
                36,
                [60, 60],
                "outline"
            ),
        ]);
    },

    play: () => {
        const _morph = (from, to) => ({
            ty: "sh",
            d: 1,
            ks: _anim(
                [
                    [0, _shape(from, true)],
                    [18, _shape(to, true)],
                ],
                _easeInOut
            ),
        });
        const _left = _morph(
            [
                [-18, -24],
                [2, -12],
                [2, 12],
                [-18, 24],
            ],
            [
                [-18, -24],
                [-6, -24],
                [-6, 24],
                [-18, 24],
            ]
        );
        const _right = _morph(
            [
                [2, -12],
                [22, 0],
                [22, 0],
                [2, 12],
            ],
            [
                [6, -24],
                [18, -24],
                [18, 24],
                [6, 24],
            ]
        );
        return _comp("play", 100, 100, 20, [_layer(1, [_group([_left, _right, _fill()])], 20, [50, 50], "icon")]);
    },

    sound: () => {
        const _wave = (size) => _group([_ellipse(size, [-2, 0]), _trim({ s: _static(12.5), e: _static(37.5) }), _stroke(6)]);
        const _line = (points, start) =>
            _group([
                _path(points),
                _trim({
                    e: _anim([
                        [start, 0],
                        [start + 12, 100],
                    ]),
                }),
                _stroke(6),
            ]);
        return _comp("sound", 100, 100, 26, [
            _layer(
                1,
                [
                    _group([_wave(28), _wave(52)], {
                        o: _anim([
                            [0, 100],
                            [10, 0],
                        ]),
                        s: _anim([
                            [0, [100, 100]],
                            [10, [70, 70]],
                        ]),
                    }),
                    _line(
                        [
                            [10, -10],
                            [30, 10],
                        ],
                        8
                    ),
                    _line(
                        [
                            [10, 10],
                            [30, -10],
                        ],
                        12
                    ),
                ],
                26,
                [50, 50],
                "marks"
            ),
            _layer(
                2,
                [
                    _group([
                        _path(
                            [
                                [-30, -10],
                                [-18, -10],
                                [-2, -24],
                                [-2, 24],
                                [-18, 10],
                                [-30, 10],
                            ],
                            true
                        ),
                        _fill(),
                    ]),
                ],
                26,
                [50, 50],
                "speaker"
            ),
        ]);
    },
};

// a key with one after it needs i and o (or h), lottie-web stops updating the layer without them
const _checkEasing = (node, name) => {
    if (!node || typeof node !== "object") return;
    if (node.a === 1 && Array.isArray(node.k)) {
        node.k.forEach((key, index) => {
            if (index < node.k.length - 1 && !key.h && !(key.i && key.o)) throw new Error(`${name}: the key at frame ${key.t} has no easing`);
        });
    }
    Object.values(node).forEach((child) => _checkEasing(child, name));
};

mkdirSync(_out, { recursive: true });

Object.entries(_samples).forEach(([name, build]) => {
    if (_only && _only !== name) return;
    const _data = build();
    _checkEasing(_data, name);
    const _json = JSON.stringify(_data);
    writeFileSync(`${_out}/${name}.json`, _json);
    console.log(`${_out}/${name}.json`, `${(_json.length / 1024).toFixed(1)}KB`);
});
