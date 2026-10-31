// dot grid effect for _threeBackground: a still grid, dots show in noisy patches that drift, the mouse leaves a lit trail
// usage: const _dots = _threeDotGrid({ color, gap, size, round, amount, scale, speed, twinkle, opacity, radius, fade })
// gap, size and radius in px, amount 0 to 1 how much is filled, scale the patch size, twinkle steps per second, fade in seconds
// _dots.set({ color, amount }) glides to them, the behavior is from cipher.tv's loader
export const _threeDotGrid = (props = {}) => {
    const _options = { color: "#ffffff", gap: 12, size: 1.5, round: false, amount: 0.5, scale: 1, speed: 0.6, twinkle: 0, opacity: 0.8, radius: 90, fade: 1.2, ...props };

    let _instance = null;
    let _mesh = null;
    let _color = null;
    const _state = { time: 0, amount: 0, toAmount: _options.amount };
    const _pointer = { x: 0, y: 0, inside: false };

    const _count = 24;
    const _trail = Array.from({ length: _count }, () => ({ x: 0, y: 0, life: 0 }));
    let _next = 0;
    const _fine = window.matchMedia("(pointer: fine)");

    return {
        options: _options,

        setup(instance) {
            const { three: THREE, scene } = instance;
            _instance = instance;

            if (instance.reduced.matches) _state.amount = _state.toAmount;
            _color = { current: new THREE.Color(_options.color), to: new THREE.Color(_options.color) };

            const _material = new THREE.ShaderMaterial({
                uniforms: {
                    uResolution: { value: new THREE.Vector2(1, 1) },
                    uPixelRatio: { value: 1 },
                    uGap: { value: _options.gap },
                    uSize: { value: _options.size },
                    uRound: { value: _options.round ? 1 : 0 },
                    uScale: { value: 0.0018 / _options.scale },
                    uTime: { value: 0 },
                    uStep: { value: 0 },
                    uAmount: { value: 0 },
                    uOpacity: { value: _options.opacity },
                    uColor: { value: _color.current },
                    uTrail: { value: _trail.map(() => new THREE.Vector3()) },
                    uRadius: { value: _options.radius },
                },
                vertexShader: `
                    void main() {
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec2 uResolution;
                    uniform float uPixelRatio;
                    uniform float uGap;
                    uniform float uSize;
                    uniform float uRound;
                    uniform float uScale;
                    uniform float uTime;
                    uniform float uStep;
                    uniform float uAmount;
                    uniform float uOpacity;
                    uniform vec3 uColor;
                    uniform vec3 uTrail[${_count}];
                    uniform float uRadius;

                    // simplex noise, https://github.com/ashima/webgl-noise (Ian McEwan, Ashima Arts, MIT license)
                    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

                    float snoise(vec2 v) {
                        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                        vec2 i = floor(v + dot(v, C.yy));
                        vec2 x0 = v - i + dot(i, C.xx);
                        vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                        vec4 x12 = x0.xyxy + C.xxzz;
                        x12.xy -= i1;
                        i = mod(i, 289.0);
                        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
                        m = m * m * m * m;
                        vec3 x = 2.0 * fract(p * C.www) - 1.0;
                        vec3 h = abs(x) - 0.5;
                        vec3 a0 = x - floor(x + 0.5);
                        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
                        vec3 g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
                        return 130.0 * dot(m, g);
                    }

                    float fbm(vec2 p) {
                        float value = 0.0;
                        float amplitude = 0.5;
                        for (int i = 0; i < 4; i++) {
                            value += amplitude * snoise(p);
                            p = p * 2.0 + 17.0;
                            amplitude *= 0.5;
                        }
                        return value;
                    }

                    // hash without sine, https://www.shadertoy.com/view/4djSRW (Dave Hoskins, MIT license)
                    float hash(vec2 p) {
                        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                        p3 += dot(p3, p3.yzx + 33.33);
                        return fract((p3.x + p3.y) * p3.z);
                    }

                    void main() {
                        vec2 p = vec2(gl_FragCoord.x, uResolution.y * uPixelRatio - gl_FragCoord.y) / uPixelRatio;

                        vec2 start = mod(uResolution, uGap) * 0.5;
                        vec2 cell = floor((p - start) / uGap);
                        vec2 local = p - start - (cell + 0.5) * uGap;
                        float d = mix(max(abs(local.x), abs(local.y)), length(local), uRound);
                        float shape = 1.0 - smoothstep(uSize * 0.5 - 0.5 / uPixelRatio, uSize * 0.5 + 0.5 / uPixelRatio, d);
                        if (shape <= 0.0) discard;

                        vec2 uv = (cell + 0.5) * uGap * uScale;
                        vec2 warp = vec2(fbm(uv + vec2(0.11, 0.07) * uTime), fbm(uv + vec2(5.2, 1.3) - 0.09 * uTime));
                        float field = fbm(uv + warp * 1.4 + 0.03 * uTime);
                        float mask = smoothstep(-0.12, 0.12, field + uAmount * 2.0 - 1.0) * smoothstep(0.0, 0.1, uAmount);

                        for (int i = 0; i < ${_count}; i++) {
                            vec3 point = uTrail[i];
                            if (point.z <= 0.0) continue;
                            mask = max(mask, (1.0 - smoothstep(0.0, uRadius * point.z, distance(p, point.xy))) * point.z);
                        }

                        if (hash(cell + uStep * vec2(13.1, 7.7)) > mask) discard;

                        gl_FragColor = vec4(uColor, uOpacity * shape * (0.4 + 0.6 * mask));
                        #include <colorspace_fragment>
                    }
                `,
                transparent: true,
                depthTest: false,
            });

            _mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), _material);
            _mesh.frustumCulled = false;
            scene.add(_mesh);
        },

        resize({ size, renderer }) {
            _mesh.material.uniforms.uResolution.value.set(size.width, size.height);
            _mesh.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
        },

        update({ delta, time, pointer, size }) {
            const _uniforms = _mesh.material.uniforms;
            const _ease = 1 - Math.exp(-delta * 3);
            const _inside = pointer.inside && _fine.matches && _options.radius > 0;
            const _x = ((pointer.x + 1) / 2) * size.width;
            const _y = ((1 - pointer.y) / 2) * size.height;

            if (_inside && !_pointer.inside) Object.assign(_pointer, { x: _x, y: _y });
            _pointer.inside = _inside;

            const _spacing = _options.radius / 2;
            const _steps = _inside ? Math.min(Math.floor(Math.hypot(_x - _pointer.x, _y - _pointer.y) / _spacing), _count) : 0;

            for (let i = 1; i <= _steps; i++) {
                Object.assign(_trail[_next], { x: _pointer.x + ((_x - _pointer.x) * i) / _steps, y: _pointer.y + ((_y - _pointer.y) * i) / _steps, life: 1 });
                _next = (_next + 1) % _count;
            }
            if (_steps) Object.assign(_pointer, { x: _x, y: _y });

            _trail.forEach((point, i) => {
                point.life = Math.max(point.life - delta / _options.fade, 0);
                _uniforms.uTrail.value[i].set(point.x, point.y, point.life);
            });

            _state.time += delta * _options.speed;
            _state.amount += (_state.toAmount - _state.amount) * _ease;
            _color.current.lerp(_color.to, _ease);

            _uniforms.uTime.value = _state.time;
            _uniforms.uStep.value = Math.floor(time * _options.twinkle) % 1000;
            _uniforms.uAmount.value = _state.amount;
        },

        set(state = {}) {
            if (!_mesh) return;

            if (state.color) _color.to.set(state.color);
            if (state.amount !== undefined) _state.toAmount = state.amount;

            if (_instance.running) return;
            _color.current.copy(_color.to);
            _state.amount = _state.toAmount;
            _instance.render();
        },
    };
};
