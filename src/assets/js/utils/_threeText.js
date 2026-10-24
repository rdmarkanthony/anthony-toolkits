// text effect for _threeBackground: words made of grains, repeated in every row to fill the area, the pointer pushes them, a click bursts them
// usage: const _text = _threeText({ text, color, rows, spacing, gap, size, opacity, light, grow, font, weight, radius, push, spring, damping, burst, depth, parallax })
// text: "\n" for lines that take turns by row, spacing between repeats as part of the font size, gap between grains and size in px
// opacity at rest, the grains within light (world units) of the pointer brighten and grow
// _text.set(text) re-forms the grains into new words, _text.burst() scatters them, font and weight default to the target's
export const _threeText = (props = {}) => {
    const _options = { text: "Hello", color: "#ffffff", rows: 4, spacing: 0.4, gap: 4, size: 2, font: null, weight: null, radius: 1.2, push: 40, spring: 30, damping: 6, burst: 10, depth: 0.4, parallax: 0.06, opacity: 0.25, light: 2.5, grow: 1.6, follow: 8, ...props };

    let _instance = null;
    let _points = null;
    let _palette = [];
    let _count = 0;
    let _target, _position, _velocity;
    const _sampled = { width: 0, height: 0 };
    const _tilt = { x: 0, y: 0 };
    const _lens = { x: 0, y: 0, strength: 0 };
    const _abort = new AbortController();
    const _canvas = document.createElement("canvas");
    const _context = _canvas.getContext("2d", { willReadFrequently: true });

    // css font from the options or the target
    const _font = (px) => {
        const _style = getComputedStyle(_instance.target);
        return `${_options.weight ?? _style.fontWeight} ${px}px ${_options.font ?? _style.fontFamily}`;
    };

    // the words drawn on a hidden canvas, a grain on every gap px inside the letters
    const _sample = (force) => {
        const { three: THREE, size, view, reduced } = _instance;
        const { gap, rows, spacing, depth } = _options;
        if (!size.width || (!force && size.width === _sampled.width && Math.abs(size.height - _sampled.height) < 120)) return;

        const _lines = String(_options.text).split("\n");
        Object.assign(_sampled, size);

        // sized so the letters' own top and bottom fill most of a row, measured at 100px
        _canvas.width = size.width;
        _canvas.height = size.height;
        _context.font = _font(100);
        const _metrics = _lines.map((line) => _context.measureText(line));
        const _ascent = Math.max(..._metrics.map((metric) => metric.actualBoundingBoxAscent), 1);
        const _descent = Math.max(..._metrics.map((metric) => metric.actualBoundingBoxDescent), 0);
        const _row = size.height / rows;
        const _px = (_row * 0.7 * 100) / (_ascent + _descent);

        // each row repeats its line edge to edge, every other row shifted half a word
        _context.font = _font(_px);
        _context.textBaseline = "alphabetic";

        for (let r = 0; r < rows; r++) {
            const _line = _lines[r % _lines.length];
            const _step = _context.measureText(_line).width + spacing * _px;
            const _baseline = (r + 0.5) * _row + ((_ascent - _descent) / 2) * (_px / 100);

            for (let x = r % 2 ? -_step / 2 : 0; x < size.width; x += _step) _context.fillText(_line, x, _baseline);
        }

        const _data = _context.getImageData(0, 0, size.width, size.height).data;
        const _scale = view.width / size.width;
        const _spots = [];

        // jittered so it reads as grain, not a grid
        for (let y = 0; y < size.height; y += gap) {
            for (let x = 0; x < size.width; x += gap) {
                if (_data[(y * size.width + x) * 4 + 3] < 128) continue;
                _spots.push([(x + (Math.random() - 0.5) * gap * 0.5 - size.width / 2) * _scale, -(y + (Math.random() - 0.5) * gap * 0.5 - size.height / 2) * _scale, (Math.random() - 0.5) * depth]);
            }
        }

        // shuffled, so a new word flows in from all over
        for (let i = _spots.length - 1; i > 0; i--) {
            const _j = Math.floor(Math.random() * (i + 1));
            [_spots[i], _spots[_j]] = [_spots[_j], _spots[i]];
        }

        const _old = { count: _count, position: _position, velocity: _velocity };
        _count = _spots.length;
        _target = new Float32Array(_spots.flat());
        _position = new Float32Array(_count * 3);
        _velocity = new Float32Array(_count * 3);

        // grains keep their place, new ones start on a random old one, the first ones scattered
        for (let i = 0; i < _count; i++) {
            const _i3 = i * 3;
            const _from = i < _old.count ? i : Math.floor(Math.random() * _old.count);

            if (reduced.matches) _position.set(_target.subarray(_i3, _i3 + 3), _i3);
            else if (_old.count) {
                _position.set(_old.position.subarray(_from * 3, _from * 3 + 3), _i3);
                _velocity.set(_old.velocity.subarray(_from * 3, _from * 3 + 3), _i3);
            } else _position.set([(Math.random() - 0.5) * view.width * 1.2, (Math.random() - 0.5) * view.height * 1.2, (Math.random() - 0.5) * 4], _i3);
        }

        const _scales = new Float32Array(_count).map(() => 0.7 + Math.random() * 0.6);
        const _colors = new Float32Array(_count * 3);
        for (let i = 0; i < _count; i++) _palette[Math.floor(Math.random() * _palette.length)].toArray(_colors, i * 3);

        const _geometry = new THREE.BufferGeometry();
        _geometry.setAttribute("position", new THREE.BufferAttribute(_position, 3));
        _geometry.setAttribute("aScale", new THREE.BufferAttribute(_scales, 1));
        _geometry.setAttribute("aColor", new THREE.BufferAttribute(_colors, 3));
        _points.geometry.dispose();
        _points.geometry = _geometry;

        if (!_instance.running) _instance.render();
    };

    // pushed out from a spot, harder up close
    const _burst = (x, y) => {
        const { burst } = _options;

        for (let i = 0; i < _count; i++) {
            const _i3 = i * 3;
            const _dx = _position[_i3] - x;
            const _dy = _position[_i3 + 1] - y;
            const _distance = Math.hypot(_dx, _dy) || 1;
            const _force = (burst * (0.5 + Math.random())) / (1 + _distance * 0.5);

            _velocity[_i3] += (_dx / _distance) * _force;
            _velocity[_i3 + 1] += (_dy / _distance) * _force;
            _velocity[_i3 + 2] += (Math.random() - 0.5) * _force;
        }
    };

    return {
        options: _options,

        set(text) {
            _options.text = text;
            if (_instance) _sample(true);
        },

        burst() {
            _burst(0, 0);
        },

        setup(instance) {
            const { three: THREE, scene, target } = instance;
            _instance = instance;
            _palette = [_options.color].flat().map((color) => new THREE.Color(color));

            // round dots, the same px size at z 0
            const _material = new THREE.ShaderMaterial({
                uniforms: {
                    uSize: { value: _options.size },
                    uOpacity: { value: _options.opacity },
                    uGrow: { value: _options.grow },
                    uLight: { value: _options.light },
                    uLens: { value: new THREE.Vector3() },
                    uPixelRatio: { value: 1 },
                    uDistance: { value: 10 },
                },
                vertexShader: `
                    attribute float aScale;
                    attribute vec3 aColor;
                    uniform float uSize;
                    uniform float uOpacity;
                    uniform float uGrow;
                    uniform float uLight;
                    uniform vec3 uLens;
                    uniform float uPixelRatio;
                    uniform float uDistance;
                    varying vec3 vColor;
                    varying float vAlpha;

                    void main() {
                        // brighter and bigger near the pointer
                        float lens = smoothstep(uLight, 0.0, distance(position.xy, uLens.xy)) * uLens.z;

                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_Position = projectionMatrix * mvPosition;
                        gl_PointSize = uSize * aScale * mix(1.0, uGrow, lens) * uPixelRatio * (uDistance / -mvPosition.z);
                        vColor = aColor;
                        vAlpha = mix(uOpacity, 1.0, lens);
                    }
                `,
                fragmentShader: `
                    varying vec3 vColor;
                    varying float vAlpha;

                    void main() {
                        float alpha = smoothstep(0.5, 0.4, length(gl_PointCoord - 0.5)) * vAlpha;
                        if (alpha <= 0.0) discard;
                        gl_FragColor = vec4(vColor, alpha);
                        #include <colorspace_fragment>
                    }
                `,
                transparent: true,
                depthWrite: false,
            });

            _points = new THREE.Points(new THREE.BufferGeometry(), _material);
            _points.frustumCulled = false;
            scene.add(_points);

            // again once this exact web font is in
            document.fonts.load(_font(100)).then(() => !instance.destroyed && _sample(true));

            // burst from where it's clicked, not on links, buttons or fields
            target.addEventListener(
                "pointerdown",
                (e) => {
                    if (e.button || e.target.closest("a, button, input, select, textarea, label")) return;
                    instance.measurePointer(e);
                    _burst((instance.pointer.x * instance.view.width) / 2, (instance.pointer.y * instance.view.height) / 2);
                },
                { signal: _abort.signal },
            );
        },

        resize({ renderer, camera }) {
            _points.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
            _points.material.uniforms.uDistance.value = camera.position.z;
            _sample();
        },

        update({ delta, pointer, view, scene }) {
            if (!_count) return;

            const { radius, push, spring, damping, parallax } = _options;
            const _pointerX = (pointer.x * view.width) / 2;
            const _pointerY = (pointer.y * view.height) / 2;
            const _drag = Math.exp(-delta * damping);
            const _ease = 1 - Math.exp(-delta * 6);
            const _follow = 1 - Math.exp(-delta * _options.follow);

            // the light eases after the pointer and fades when it leaves
            _lens.x += (_pointerX - _lens.x) * _follow;
            _lens.y += (_pointerY - _lens.y) * _follow;
            _lens.strength += ((pointer.inside ? 1 : 0) - _lens.strength) * _follow;
            _points.material.uniforms.uLens.value.set(_lens.x, _lens.y, _lens.strength);

            for (let i = 0; i < _count; i++) {
                const _i3 = i * 3;

                // a spring back to its spot, pushed away inside the radius
                let _ax = (_target[_i3] - _position[_i3]) * spring;
                let _ay = (_target[_i3 + 1] - _position[_i3 + 1]) * spring;
                const _az = (_target[_i3 + 2] - _position[_i3 + 2]) * spring;

                if (pointer.inside) {
                    const _dx = _position[_i3] - _pointerX;
                    const _dy = _position[_i3 + 1] - _pointerY;
                    const _distance = Math.hypot(_dx, _dy);

                    if (_distance < radius && _distance > 0) {
                        const _force = (1 - _distance / radius) ** 2 * push;
                        _ax += (_dx / _distance) * _force;
                        _ay += (_dy / _distance) * _force;
                    }
                }

                _velocity[_i3] = (_velocity[_i3] + _ax * delta) * _drag;
                _velocity[_i3 + 1] = (_velocity[_i3 + 1] + _ay * delta) * _drag;
                _velocity[_i3 + 2] = (_velocity[_i3 + 2] + _az * delta) * _drag;

                _position[_i3] += _velocity[_i3] * delta;
                _position[_i3 + 1] += _velocity[_i3 + 1] * delta;
                _position[_i3 + 2] += _velocity[_i3 + 2] * delta;
            }

            _points.geometry.attributes.position.needsUpdate = true;

            // tilt toward the pointer, the depth gives parallax
            _tilt.x += ((pointer.inside ? pointer.x : 0) * parallax - _tilt.x) * _ease;
            _tilt.y += ((pointer.inside ? pointer.y : 0) * parallax - _tilt.y) * _ease;
            scene.rotation.y = _tilt.x;
            scene.rotation.x = -_tilt.y;
        },

        destroy() {
            _abort.abort();
        },
    };
};
