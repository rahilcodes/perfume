import * as THREE from 'three';

export class LiquidDistortion {
    private container: HTMLElement;
    private images: string[];
    private currentIndex: number = 0;
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private material: THREE.ShaderMaterial | null = null;
    private mesh: THREE.Mesh | null = null;
    private loader: THREE.TextureLoader;
    private textures: THREE.Texture[] = [];
    private disp: THREE.Texture | null = null;

    constructor(container: HTMLElement, images: string[], displacementMap: string) {
        this.container = container;
        this.images = images;
        this.loader = new THREE.TextureLoader();
        this.loader.setCrossOrigin('anonymous');

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(
            container.offsetWidth / -2,
            container.offsetWidth / 2,
            container.offsetHeight / 2,
            container.offsetHeight / -2,
            1,
            1000
        );
        this.camera.position.z = 1;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.loadAssets(displacementMap);
    }

    private async loadAssets(displacementMap: string) {
        this.disp = await this.loader.loadAsync(displacementMap);
        this.disp.wrapS = this.disp.wrapT = THREE.RepeatWrapping;

        for (const url of this.images) {
            const tex = await this.loader.loadAsync(url);
            tex.magFilter = THREE.LinearFilter;
            tex.minFilter = THREE.LinearFilter;
            this.textures.push(tex);
        }

        this.setupShader();
        this.animate();

        // Auto-advance
        setInterval(() => this.next(), 6000);
    }

    private setupShader() {
        const vertex = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

        const fragment = `
      varying vec2 vUv;
      uniform sampler2D texture1;
      uniform sampler2D texture2;
      uniform sampler2D disp;
      uniform float transition;
      uniform float dispFactor;

      void main() {
        vec2 uv = vUv;
        vec4 disp = texture2D(disp, uv);
        
        vec2 distortedPosition1 = vec2(uv.x + transition * (disp.r * dispFactor), uv.y);
        vec2 distortedPosition2 = vec2(uv.x - (1.0 - transition) * (disp.r * dispFactor), uv.y);
        
        vec4 _texture1 = texture2D(texture1, distortedPosition1);
        vec4 _texture2 = texture2D(texture2, distortedPosition2);
        
        gl_FragColor = mix(_texture1, _texture2, transition);
      }
    `;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                transition: { value: 0 },
                dispFactor: { value: 0.2 },
                texture1: { value: this.textures[0] },
                texture2: { value: this.textures[1] },
                disp: { value: this.disp }
            },
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            opacity: 1
        });

        const geometry = new THREE.PlaneGeometry(this.container.offsetWidth, this.container.offsetHeight);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);
    }

    public next() {
        if (!this.material) return;

        const nextIndex = (this.currentIndex + 1) % this.textures.length;
        this.material.uniforms.texture2.value = this.textures[nextIndex];

        let startTime = performance.now();
        const duration = 1500;

        const animateTransition = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing
            const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            if (this.material) {
                this.material.uniforms.transition.value = ease;
            }

            if (progress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.currentIndex = nextIndex;
                if (this.material) {
                    this.material.uniforms.texture1.value = this.textures[this.currentIndex];
                    this.material.uniforms.transition.value = 0;
                }
            }
        };

        requestAnimationFrame(animateTransition);
    }

    private animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}
