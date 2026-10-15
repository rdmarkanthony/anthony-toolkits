// particles effect for _threeBackground: dots drift, move away from the pointer and tilt with it
// usage: new _threeBackground({ target, effect: _threeParticles({ count, color, size, speed, depth, radius, push, parallax, opacity }) })
// color: one color or an array, picked per dot, size in px, radius and speed in world units
// calm by default for text on top
export const _threeParticles = (props = {}) => {
    const _options = { count: 800, color: "#ffffff", size: 2.5, speed: 0.1, depth: 4, radius: 2, push: 0.8, parallax: 0.08, opacity: 0.6, ...props };

    let _points = null;
    let _base, _velocity, _offset, _positions;
    const _tilt = { x: 0, y: 0 };

    return {
        options: _options,

        setup({ three: THREE, scene }) {
            const { count, depth } = _options;
            const _palette = [_options.color].flat().map((color) => new THREE.Color(color));
            const _scales = new Float32Array(count);
            const _colors = new Float32Array(count * 3);

            // x y as part of the view, z in world units
            _base = new Float32Array(count * 3);
            _velocity = new Float32Array(count * 2);
            _offset = new Float32Array(count * 2);
            _positions = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                const _angle = Math.random() * Math.PI * 2;

                _base.set([Math.random() * 1.1 - 0.55, Math.random() * 1.1 - 0.55, (Math.random() - 0.5) * depth], i * 3);
                _velocity.set([Math.cos(_angle), Math.sin(_angle)], i * 2);
                _scales[i] = 0.5 + Math.random();
                _palette[Math.floor(Math.random() * _palette.length)].toArray(_colors, i * 3);
            }

            const _geometry = new THREE.BufferGeometry();
            _geometry.setAttribute("position", new THREE.BufferAttribute(_positions, 3));
            _geometry.setAttribute("aScale", new THREE.BufferAttribute(_scales, 1));
            _geometry.setAttribute("aColor", new THREE.BufferAttribute(_colors, 3));

            // round dots, the same px size at z 0
            const _material = new THREE.ShaderMaterial({
                uniforms: {
                    uSize: { value: _options.size },
                    uOpacity: { value: _options.opacity },
                    uPixelRatio: { value: 1 },
                    uDistance: { value: 10 },
                },
                vertexShader: `
                    attribute float aScale;
                    attribute vec3 aColor;
                    uniform float uSize;
                    uniform float uPixelRatio;
                    uniform float uDistance;
                    varying vec3 vColor;

                    void main() {
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_Position = projectionMatrix * mvPosition;
                        gl_PointSize = uSize * aScale * uPixelRatio * (uDistance / -mvPosition.z);
                        vColor = aColor;
                    }
                `,
                fragmentShader: `
                    uniform float uOpacity;
                    varying vec3 vColor;

                    void main() {
                        float alpha = smoothstep(0.5, 0.4, length(gl_PointCoord - 0.5)) * uOpacity;
                        if (alpha <= 0.0) discard;
                        gl_FragColor = vec4(vColor, alpha);
                        #include <colorspace_fragment>
                    }
                `,
                transparent: true,
                depthWrite: false,
            });

            _points = new THREE.Points(_geometry, _material);
            _points.frustumCulled = false;
            scene.add(_points);
        },

        resize({ renderer, camera }) {
            _points.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
            _points.material.uniforms.uDistance.value = camera.position.z;
        },

        update({ delta, pointer, view, scene }) {
            const { count, speed, radius, push, parallax } = _options;
            const _pointerX = (pointer.x * view.width) / 2;
            const _pointerY = (pointer.y * view.height) / 2;
            const _ease = 1 - Math.exp(-delta * 6);

            for (let i = 0; i < count; i++) {
                const _i3 = i * 3;
                const _i2 = i * 2;

                // drift, wrap around past the edges
                _base[_i3] += (_velocity[_i2] * speed * delta) / view.width;
                _base[_i3 + 1] += (_velocity[_i2 + 1] * speed * delta) / view.height;
                if (Math.abs(_base[_i3]) > 0.55) _base[_i3] -= Math.sign(_base[_i3]) * 1.1;
                if (Math.abs(_base[_i3 + 1]) > 0.55) _base[_i3 + 1] -= Math.sign(_base[_i3 + 1]) * 1.1;

                const _x = _base[_i3] * view.width;
                const _y = _base[_i3 + 1] * view.height;

                // pushed away inside the radius, eased back
                let _pushX = 0;
                let _pushY = 0;
                const _dx = _x - _pointerX;
                const _dy = _y - _pointerY;
                const _distance = Math.hypot(_dx, _dy);

                if (pointer.inside && _distance < radius && _distance > 0) {
                    const _force = (1 - _distance / radius) ** 2 * push;
                    _pushX = (_dx / _distance) * _force;
                    _pushY = (_dy / _distance) * _force;
                }

                _offset[_i2] += (_pushX - _offset[_i2]) * _ease;
                _offset[_i2 + 1] += (_pushY - _offset[_i2 + 1]) * _ease;

                _positions[_i3] = _x + _offset[_i2];
                _positions[_i3 + 1] = _y + _offset[_i2 + 1];
                _positions[_i3 + 2] = _base[_i3 + 2];
            }

            _points.geometry.attributes.position.needsUpdate = true;

            // tilt toward the pointer, the depth gives parallax
            _tilt.x += ((pointer.inside ? pointer.x : 0) * parallax - _tilt.x) * _ease;
            _tilt.y += ((pointer.inside ? pointer.y : 0) * parallax - _tilt.y) * _ease;
            scene.rotation.y = _tilt.x;
            scene.rotation.x = -_tilt.y;
        },
    };
};
