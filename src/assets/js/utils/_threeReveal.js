// reveal effect for _threeBackground: the mouse paints a trail that shows a second look of the image, then it fades back
// usage: new _threeBackground({ target, effect: _threeReveal({ image, reveal, gray, radius, fade, soft }) })
// reveal: the image under the trail, the same one by default, gray from 0 to 1 on the top one, radius in px, fade in seconds
// the trail is drawn into a small texture each frame, cover fit like a background, the instance emits "load"
export const _threeReveal = (props = {}) => {
    const _options = { image: "", reveal: "", gray: 1, radius: 90, fade: 1.2, soft: 0.25, ...props };

    let _instance = null;
    let _mesh = null;
    let _trail = null;
    let _targets = [];
    const _last = { x: 0, y: 0, inside: false };

    // the quad that fades the last trail and adds the brush along the pointer's path
    const _trailMesh = (THREE) =>
        new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.ShaderMaterial({
                uniforms: {
                    uPrevious: { value: null },
                    uFrom: { value: new THREE.Vector2() },
                    uTo: { value: new THREE.Vector2() },
                    uAspect: { value: 1 },
                    uRadius: { value: 0.1 },
                    uDecay: { value: 1 },
                    uPaint: { value: 0 },
                },
                vertexShader: `
                    varying vec2 vUv;

                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D uPrevious;
                    uniform vec2 uFrom;
                    uniform vec2 uTo;
                    uniform float uAspect;
                    uniform float uRadius;
                    uniform float uDecay;
                    uniform float uPaint;
                    varying vec2 vUv;

                    void main() {
                        // distance to the segment, so fast moves leave no gaps
                        vec2 p = vUv * vec2(uAspect, 1.0);
                        vec2 a = uFrom * vec2(uAspect, 1.0);
                        vec2 b = uTo * vec2(uAspect, 1.0);
                        float t = clamp(dot(p - a, b - a) / max(dot(b - a, b - a), 1e-6), 0.0, 1.0);
                        float brush = smoothstep(uRadius, uRadius * 0.3, distance(p, a + (b - a) * t)) * uPaint;

                        float trail = texture2D(uPrevious, vUv).r * uDecay;
                        gl_FragColor = vec4(max(trail, brush), 0.0, 0.0, 1.0);
                    }
                `,
                depthTest: false,
            }),
        );

    return {
        options: _options,

        setup(instance) {
            const { three: THREE, scene } = instance;
            const _loader = new THREE.TextureLoader();
            _instance = instance;
            _trail = { scene: new THREE.Scene(), mesh: _trailMesh(THREE) };
            _trail.scene.add(_trail.mesh);

            const _material = new THREE.ShaderMaterial({
                uniforms: {
                    uImage: { value: null },
                    uReveal: { value: null },
                    uTrail: { value: null },
                    uResolution: { value: new THREE.Vector2(1, 1) },
                    uImageSize: { value: new THREE.Vector2(1, 1) },
                    uGray: { value: _options.gray },
                    uSoft: { value: _options.soft },
                },
                // fills the canvas, no camera
                vertexShader: `
                    varying vec2 vUv;

                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D uImage;
                    uniform sampler2D uReveal;
                    uniform sampler2D uTrail;
                    uniform vec2 uResolution;
                    uniform vec2 uImageSize;
                    uniform float uGray;
                    uniform float uSoft;
                    varying vec2 vUv;

                    void main() {
                        // cover, like background-size
                        vec2 ratio = vec2(
                            min((uResolution.x / uResolution.y) / (uImageSize.x / uImageSize.y), 1.0),
                            min((uResolution.y / uResolution.x) / (uImageSize.y / uImageSize.x), 1.0)
                        );
                        vec2 uv = (vUv - 0.5) * ratio + 0.5;

                        vec4 top = texture2D(uImage, uv);
                        top.rgb = mix(top.rgb, vec3(dot(top.rgb, vec3(0.299, 0.587, 0.114))), uGray);

                        // a soft edge that closes in as the trail fades
                        float mask = smoothstep(0.5 - uSoft, 0.5 + uSoft, texture2D(uTrail, vUv).r);
                        gl_FragColor = mix(top, texture2D(uReveal, uv), mask);
                        #include <colorspace_fragment>
                    }
                `,
                depthTest: false,
            });

            _mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), _material);
            _mesh.frustumCulled = false;
            _mesh.visible = false;
            scene.add(_mesh);

            // shown once both are in
            Promise.all([_loader.loadAsync(_options.image), _loader.loadAsync(_options.reveal || _options.image)]).then(([image, reveal]) => {
                if (instance.destroyed) return [image, reveal].forEach((texture) => texture.dispose());

                [image, reveal].forEach((texture) => (texture.colorSpace = THREE.SRGBColorSpace));
                _material.uniforms.uImage.value = image;
                _material.uniforms.uReveal.value = reveal;
                _material.uniforms.uImageSize.value.set(image.image.width, image.image.height);
                _mesh.visible = true;

                if (!instance.running) instance.render();
                instance.emit("load", instance);
            });
        },

        // two small trail textures, one read while the other is drawn, 256px on the long side
        resize({ three: THREE, size }) {
            const _scale = 256 / Math.max(size.width, size.height);
            _targets.forEach((target) => target.dispose());
            _targets = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.ceil(size.width * _scale), Math.ceil(size.height * _scale), { type: THREE.HalfFloatType }));

            _mesh.material.uniforms.uResolution.value.set(size.width, size.height);
            _trail.mesh.material.uniforms.uAspect.value = size.width / size.height;
            _trail.mesh.material.uniforms.uRadius.value = _options.radius / size.height;
        },

        update({ delta, pointer, renderer, camera }) {
            if (!_targets.length) return;

            const _uniforms = _trail.mesh.material.uniforms;
            const _x = (pointer.x + 1) / 2;
            const _y = (pointer.y + 1) / 2;

            // paint from where it was last frame, a fresh start when it comes back in
            if (pointer.inside && !_last.inside) Object.assign(_last, { x: _x, y: _y });
            _uniforms.uFrom.value.set(_last.x, _last.y);
            _uniforms.uTo.value.set(_x, _y);
            _uniforms.uPaint.value = pointer.inside ? 1 : 0;
            _uniforms.uDecay.value = Math.exp((-delta * Math.log(4)) / _options.fade);
            _uniforms.uPrevious.value = _targets[0].texture;
            Object.assign(_last, { x: _x, y: _y, inside: pointer.inside });

            renderer.setRenderTarget(_targets[1]);
            renderer.render(_trail.scene, camera);
            renderer.setRenderTarget(null);

            _targets.reverse();
            _mesh.material.uniforms.uTrail.value = _targets[0].texture;
        },

        destroy() {
            _targets.forEach((target) => target.dispose());
            _trail.mesh.geometry.dispose();
            _trail.mesh.material.dispose();
            _mesh.material.uniforms.uImage.value?.dispose();
            _mesh.material.uniforms.uReveal.value?.dispose();
        },
    };
};
