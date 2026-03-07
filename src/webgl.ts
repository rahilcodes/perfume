import * as THREE from 'three';
import gsap from 'gsap';

export class WebGLEngine {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private container: HTMLElement;
    private bottleGroup!: THREE.Group;
    private particles!: THREE.Points;

    constructor(containerId: string) {
        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Container ${containerId} not found`);
        this.container = el;

        this.init();
        this.createBottle();
        this.createVaporParticles();
        this.createLighting();
        this.bindEvents();
        this.animate();
    }

    private init() {
        this.scene = new THREE.Scene();

        // Very subtle fog to blend particles into the dark obsidian background
        this.scene.fog = new THREE.FogExp2(0x0B0B0B, 0.05);

        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            100
        );
        this.camera.position.z = 10;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);
    }

    private createBottle() {
        this.bottleGroup = new THREE.Group();

        // High-end glass material
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.95, // glass effect
            ior: 1.5,
            thickness: 0.5,
            transparent: true,
        });

        // Gold accent material
        const goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xD4AF37,
            metalness: 1,
            roughness: 0.2,
        });

        // Main Body (Cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(1.2, 1.2, 3, 32);
        const body = new THREE.Mesh(bodyGeometry, glassMaterial);

        // Neck
        const neckGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 32);
        const neck = new THREE.Mesh(neckGeometry, glassMaterial);
        neck.position.y = 1.9;

        // Gold Collar
        const collarGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.2, 32);
        const collar = new THREE.Mesh(collarGeometry, goldMaterial);
        collar.position.y = 1.6;

        // Cap (Obsidian/Black)
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2,
        });
        const capGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 32);
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 2.5;

        this.bottleGroup.add(body, neck, collar, cap);

        // Initial position
        this.bottleGroup.position.set(2, 0, 0); // Offset to the right for layout
        this.bottleGroup.rotation.y = -0.5;

        this.scene.add(this.bottleGroup);

        // Enter animation
        gsap.fromTo(this.bottleGroup.position,
            { y: -5, opacity: 0 },
            { y: 0, opacity: 1, duration: 2, ease: "power3.out" }
        );
    }

    private createVaporParticles() {
        const particleCount = 800;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const opacities = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            // Clustered around the bottle
            positions[i * 3] = (Math.random() - 0.5) * 8 + 2; // x (biased right)
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10 - 2; // y (starting slightly low)
            positions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 2; // z (behind bottle)

            opacities[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

        // Custom shader material for soft glowing particles
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0xD4AF37) }
            },
            vertexShader: `
        uniform float uTime;
        attribute float aOpacity;
        varying float vOpacity;
        void main() {
          vOpacity = aOpacity;
          vec3 pos = position;
          // Soft slow drift upwards
          pos.y += sin(uTime * 0.2 + pos.x) * 0.5;
          pos.x += cos(uTime * 0.1 + pos.y) * 0.3;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 40.0 * (1.0 / -mvPosition.z) * aOpacity;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        uniform vec3 uColor;
        varying float vOpacity;
        void main() {
          // Create soft circular particle
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Soft edge alpha
          float alpha = (0.5 - dist) * 2.0 * vOpacity * 0.3;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    private createLighting() {
        const ambientInfo = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientInfo);

        // Warm gold rim light
        const spotLight = new THREE.SpotLight(0xD4AF37, 2);
        spotLight.position.set(5, 5, 5);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        this.scene.add(spotLight);

        // Cool rim light for contrast
        const dirLight = new THREE.DirectionalLight(0x88bbff, 1);
        dirLight.position.set(-5, 0, -5);
        this.scene.add(dirLight);
    }

    private bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });

        // Mouse parallax
        let targetRotationX = -0.5;
        let targetRotationY = 0;

        document.addEventListener('mousemove', (e) => {
            const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

            targetRotationX = -0.5 + (mouseX * 0.3);
            targetRotationY = mouseY * 0.2;
        });

        // Scroll rotation
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            targetRotationX = -0.5 + (scrollY * 0.001); // Slowly rotate as user scrolls down
        });

        // RAF Loop
        gsap.ticker.add(() => {
            if (this.bottleGroup) {
                // Smooth lerp to target
                this.bottleGroup.rotation.y += (targetRotationX - this.bottleGroup.rotation.y) * 0.05;
                this.bottleGroup.rotation.x += (targetRotationY - this.bottleGroup.rotation.x) * 0.05;

                // Gentle floating
                this.bottleGroup.position.y += Math.sin(Date.now() * 0.001) * 0.002;
            }
        });
    }

    private animate = () => {
        requestAnimationFrame(this.animate);

        // Update particle shader time
        if (this.particles && this.particles.material instanceof THREE.ShaderMaterial) {
            this.particles.material.uniforms.uTime.value = performance.now() * 0.001;
        }

        this.renderer.render(this.scene, this.camera);
    }

    public destroy() {
        // Cleanup if needed for page transitions
        this.renderer.dispose();
    }
}
