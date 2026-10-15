// blobs effect for _threeBackground: big soft color fields that blend into each other, drift and swirl, with film grain
// usage: const _blobs = _threeBlobs({ colors, background, positions, area, size, opacity, speed, wobble, flow, follow, grain, transition })
// _blobs.set({ colors, background, positions }) glides to new colors and spots, positions [[x, y]] from -1 to 1, random in the area if left out
// area [x from, x to, y from, y to] keeps the random spots to one side, background fills where no blob reaches
export const _threeBlobs = (props = {}) => {
    const _options = { colors: ["#c8a898", "#d0605a", "#d4d0c4"], background: "#b9a898", positions: null, area: [-0.8, 0.8, -0.8, 0.8], size: 1, opacity: 1, speed: 0.4, wobble: 0.3, flow: 0.25, follow: 0.05, grain: 0.12, transition: 2, ...props };
    const _count = _options.colors.length;

    let _instance = null;
    let _mesh = null;
    let _blobs = [];
    let _background = null;
    let _pending = null;
    let _THREE = null;
    const _pointer = { x: 0, y: 0 };

    const _random = (min, max) => min + Math.random() * (max - min);
    // css colors as srgb, so the blend matches css gradients
    const _srgb = (color) => new _THREE.Color(color).convertLinearToSRGB();

    // spread across the area's width, in a random order
    const _spots = () => {
        const [_left, _right, _bottom, _top] = _options.area;
        const _slots = [...Array(_count).keys()].sort(() => Math.random() - 0.5);

        return _slots.map((slot) => [_left + ((slot + _random(0.2, 0.8)) * (_right - _left)) / _count, _random(_bottom, _top)]);
    };

    // ease the current values to the targets
    const _glide = (snap) => {
        const _ease = snap ? 1 : 1 - Math.exp((-_instance.delta * 4) / _options.transition);

        _blobs.forEach((blob) => {
            blob.color.lerp(blob.toColor, _ease);
            blob.x += (blob.toX - blob.x) * _ease;
            blob.y += (blob.toY - blob.y) * _ease;
        });
        _background.current.lerp(_background.to, _ease);
    };

    const _draw = () => {
        const { time, pointer, view } = _instance;
        const { speed, size, wobble, follow } = _options;
        const _aspect = view.width / view.height || 1;
        const _ease = 1 - Math.exp(-_instance.delta * 3);
        const _uniforms = _mesh.material.uniforms;

        _pointer.x += ((pointer.inside ? pointer.x : 0) - _pointer.x) * _ease;
        _pointer.y += ((pointer.inside ? pointer.y : 0) - _pointer.y) * _ease;

        // spot, plus a slow wobble and the pointer lean
        _blobs.forEach((blob, i) => {
            const _t = time * speed;
            const _x = blob.x + Math.sin(_t * blob.speed[0] + blob.phase[0]) * wobble + _pointer.x * follow * blob.depth;
            const _y = blob.y + Math.cos(_t * blob.speed[1] + blob.phase[1]) * wobble + _pointer.y * follow * blob.depth;
            const _radius = size * blob.scale * (1 + Math.sin(_t * blob.speed[2] + blob.phase[2]) * 0.1);

            _uniforms.uBlobs.value[i].set(_x * _aspect, _y, _radius);
            _uniforms.uColors.value[i].set(blob.color.r, blob.color.g, blob.color.b);
        });

        _uniforms.uBackground.value.set(_background.current.r, _background.current.g, _background.current.b);
        _uniforms.uAspect.value = _aspect;
        _uniforms.uTime.value = time * speed;
    };

    return {
        options: _options,

        setup(instance) {
            const { three: THREE, scene } = instance;
            _instance = instance;
            _THREE = THREE;

            const _start = _options.positions ?? _spots();

            _blobs = _options.colors.map((color, i) => {
                const [_x, _y] = _start[i % _start.length];

                return {
                    color: _srgb(color),
                    toColor: _srgb(color),
                    x: _x,
                    y: _y,
                    toX: _x,
                    toY: _y,
                    scale: _random(0.85, 1.15),
                    depth: _random(0.5, 1),
                    speed: [_random(0.5, 1), _random(0.5, 1), _random(0.5, 1)],
                    phase: [_random(0, 6.28), _random(0, 6.28), _random(0, 6.28)],
                };
            });
            _background = { current: _srgb(_options.background), to: _srgb(_options.background) };

            // one plane over the view, the shader draws the blobs
            const _material = new THREE.ShaderMaterial({
                defines: { COUNT: _count },
                uniforms: {
                    uBlobs: { value: _blobs.map(() => new THREE.Vector3()) },
                    uColors: { value: _blobs.map(() => new THREE.Vector3()) },
                    uBackground: { value: new THREE.Vector3() },
                    uAspect: { value: 1 },
                    uOpacity: { value: _options.opacity },
                    uGrain: { value: _options.grain },
                    uFlow: { value: _options.flow },
                    uTime: { value: 0 },
                },
                vertexShader: `
                    varying vec2 vUv;

                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 uBlobs[COUNT];
                    uniform vec3 uColors[COUNT];
                    uniform vec3 uBackground;
                    uniform float uAspect;
                    uniform float uOpacity;
                    uniform float uGrain;
                    uniform float uFlow;
                    uniform float uTime;
                    varying vec2 vUv;

                    // hash without sine, https://www.shadertoy.com/view/4djSRW (Dave Hoskins, MIT license)
                    float hash(vec2 p) {
                        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                        p3 += dot(p3, p3.yzx + 33.33);
                        return fract((p3.x + p3.y) * p3.z);
                    }

                    vec3 overlay(vec3 base, float blend) {
                        return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
                    }

                    void main() {
                        vec2 p = (vUv - 0.5) * 2.0 * vec2(uAspect, 1.0);

                        // bend the space slowly, the colors swirl
                        p += uFlow * vec2(sin(p.y * 1.3 + uTime * 1.1), sin(p.x * 1.1 - uTime * 0.9));

                        // soft weights, the background fills the gaps
                        float total = 0.1;
                        vec3 color = uBackground * total;

                        for (int i = 0; i < COUNT; i++) {
                            vec2 d = p - uBlobs[i].xy;
                            float weight = exp(-dot(d, d) / (uBlobs[i].z * uBlobs[i].z));
                            total += weight;
                            color += uColors[i] * weight;
                        }

                        color = mix(uBackground, color / total, uOpacity);

                        // film grain
                        float noise = hash(gl_FragCoord.xy) - 0.5;
                        color = overlay(color, 0.5 + noise * uGrain);
                        color += noise * uGrain / 7.0;

                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                depthTest: false,
            });

            _mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), _material);
            scene.add(_mesh);

            // set() before three loaded
            if (_pending) this.set(_pending);
        },

        resize({ view }) {
            _mesh.scale.set(view.width, view.height, 1);
        },

        update() {
            _glide(false);
            _draw();
        },

        set(state = {}) {
            if (!_mesh) return (_pending = state);

            const _next = state.positions ?? _spots();

            _blobs.forEach((blob, i) => {
                const [_x, _y] = _next[i % _next.length];

                if (state.colors) blob.toColor = _srgb(state.colors[i % state.colors.length]);
                blob.toX = _x;
                blob.toY = _y;
            });
            if (state.background) _background.to = _srgb(state.background);

            // not animating, show it now
            if (_instance.running) return;
            _glide(true);
            _instance.render();
        },
    };
};
