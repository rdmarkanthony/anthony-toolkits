// glow effect for _threeBackground: one soft blob that follows the cursor, over film grain
// usage: const _glow = _threeGlow({ color, background, rest, radius, blur, strength, mirror, grain, follow })
// rest [x, y] from 0 to 1 of the target, radius and blur as part of its longer side, mirror: a smaller blob across while following
// _glow.set({ color, background, strength, rest }) glides to them, from anthony-portfolio's page background
export const _threeGlow = (props = {}) => {
    const _options = { color: "#818cf8", background: "#f5f4ef", rest: [0.7, 0.45], radius: 0.25, blur: 0.08, strength: 0.6, mirror: 0.6, grain: 0.28, follow: 1.2, ...props };

    let _instance = null;
    let _mesh = null;
    let _color, _background;
    const _state = { strength: _options.strength, toStrength: _options.strength, rest: [..._options.rest], toRest: [..._options.rest] };
    const _pointer = { x: 0, y: 0, follow: 0, inside: false };
    const _fine = window.matchMedia("(pointer: fine)");

    const _srgb = (THREE, color) => new THREE.Color(color).convertLinearToSRGB();

    return {
        options: _options,

        setup(instance) {
            const { three: THREE, scene } = instance;
            _instance = instance;

            _color = { current: _srgb(THREE, _options.color), to: _srgb(THREE, _options.color) };
            _background = { current: _srgb(THREE, _options.background), to: _srgb(THREE, _options.background) };

            const _material = new THREE.ShaderMaterial({
                uniforms: {
                    uResolution: { value: new THREE.Vector2(1, 1) },
                    uPixelRatio: { value: 1 },
                    uCenter: { value: new THREE.Vector2() },
                    uRadius: { value: 1 },
                    uBlur: { value: 1 },
                    uMirror: { value: 0 },
                    uStrength: { value: _options.strength },
                    uGrain: { value: _options.grain },
                    uColor: { value: new THREE.Vector3() },
                    uBackground: { value: new THREE.Vector3() },
                },
                vertexShader: `
                    void main() {
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec2 uResolution;
                    uniform float uPixelRatio;
                    uniform vec2 uCenter;
                    uniform float uRadius;
                    uniform float uBlur;
                    uniform float uMirror;
                    uniform float uStrength;
                    uniform float uGrain;
                    uniform vec3 uColor;
                    uniform vec3 uBackground;

                    // hash without sine, https://www.shadertoy.com/view/4djSRW (Dave Hoskins, MIT license)
                    float hash(vec2 p) {
                        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                        p3 += dot(p3, p3.yzx + 33.33);
                        return fract((p3.x + p3.y) * p3.z);
                    }

                    float disc(vec2 p, vec2 center, float radius, float blur) {
                        return 0.5 - 0.5 * tanh((distance(p, center) - radius) * 0.85 / blur);
                    }

                    vec3 overlay(vec3 base, float blend) {
                        return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
                    }

                    void main() {
                        vec2 p = vec2(gl_FragCoord.x, uResolution.y * uPixelRatio - gl_FragCoord.y) / uPixelRatio;
                        float glow = disc(p, uCenter, uRadius, uBlur);

                        vec2 middle = uResolution * 0.5;
                        vec2 opposite = clamp(middle - (uCenter - middle) * 1.6, vec2(0.0), uResolution);
                        glow = max(glow, disc(p, opposite, uRadius * 0.75, uBlur * 0.75) * uMirror);

                        vec3 color = mix(uBackground, uColor, glow * uStrength);

                        float noise = hash(gl_FragCoord.xy) - 0.5;
                        color = overlay(color, 0.5 + noise * uGrain);
                        color += noise * uGrain / 7.0;

                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                depthTest: false,
            });

            _mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), _material);
            _mesh.frustumCulled = false;
            scene.add(_mesh);
        },

        resize({ size, renderer }) {
            const _uniforms = _mesh.material.uniforms;
            const _side = Math.max(size.width, size.height);

            _uniforms.uResolution.value.set(size.width, size.height);
            _uniforms.uPixelRatio.value = renderer.getPixelRatio();
            _uniforms.uRadius.value = _side * _options.radius;
            _uniforms.uBlur.value = _side * _options.blur;
        },

        update({ delta, pointer, size }) {
            const _uniforms = _mesh.material.uniforms;
            const _ease = 1 - Math.exp((-delta * 4) / _options.follow);
            const _inside = pointer.inside && _fine.matches;
            const _x = ((pointer.x + 1) / 2) * size.width;
            const _y = ((1 - pointer.y) / 2) * size.height;

            if (_inside && !_pointer.inside) Object.assign(_pointer, { x: _x, y: _y });
            _pointer.inside = _inside;
            _pointer.x += (_x - _pointer.x) * _ease;
            _pointer.y += (_y - _pointer.y) * _ease;
            _pointer.follow += ((_inside ? 1 : 0) - _pointer.follow) * _ease;

            _color.current.lerp(_color.to, _ease);
            _background.current.lerp(_background.to, _ease);
            _state.strength += (_state.toStrength - _state.strength) * _ease;
            _state.rest = _state.rest.map((value, i) => value + (_state.toRest[i] - value) * _ease);

            const _restX = _state.rest[0] * size.width;
            const _restY = _state.rest[1] * size.height;

            _uniforms.uCenter.value.set(_restX + (_pointer.x - _restX) * _pointer.follow, _restY + (_pointer.y - _restY) * _pointer.follow);
            _uniforms.uMirror.value = _pointer.follow * _options.mirror;
            _uniforms.uStrength.value = _state.strength;
            _uniforms.uColor.value.set(_color.current.r, _color.current.g, _color.current.b);
            _uniforms.uBackground.value.set(_background.current.r, _background.current.g, _background.current.b);
        },

        set(state = {}) {
            if (!_mesh) return;

            const { three: THREE } = _instance;
            if (state.color) _color.to = _srgb(THREE, state.color);
            if (state.background) _background.to = _srgb(THREE, state.background);
            if (state.strength !== undefined) _state.toStrength = state.strength;
            if (state.rest) _state.toRest = [...state.rest];

            if (_instance.running) return;
            _color.current.copy(_color.to);
            _background.current.copy(_background.to);
            _state.strength = _state.toStrength;
            _state.rest = [..._state.toRest];
            _instance.render();
        },
    };
};
