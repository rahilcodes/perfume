// ==========================================================================
// AWWWARDS-LEVEL MICRO-INTERACTIONS
// ==========================================================================
import gsap from 'gsap';

export class CustomCursor {
    private cursor: HTMLElement;
    private follower: HTMLElement;

    constructor() {
        this.cursor = document.createElement('div');
        this.cursor.classList.add('custom-cursor');

        this.follower = document.createElement('div');
        this.follower.classList.add('custom-cursor-follower');

        document.body.appendChild(this.cursor);
        document.body.appendChild(this.follower);

        this.bindEvents();
    }

    private bindEvents() {
        gsap.set(this.cursor, { xPercent: -50, yPercent: -50 });
        gsap.set(this.follower, { xPercent: -50, yPercent: -50 });

        let mouseX = 0;
        let mouseY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Instant follow for the dot
            gsap.to(this.cursor, {
                x: mouseX,
                y: mouseY,
                duration: 0,
                ease: 'none'
            });

            // Trailing effect for the circle
            gsap.to(this.follower, {
                x: mouseX,
                y: mouseY,
                duration: 0.6,
                ease: 'power3.out'
            });
        });

        document.addEventListener('mousedown', () => gsap.to(this.follower, { scale: 0.8, duration: 0.2 }));
        document.addEventListener('mouseup', () => gsap.to(this.follower, { scale: 1, duration: 0.2 }));

        this.attachHoverEvents();
    }

    private attachHoverEvents() {
        const hoverElements = document.querySelectorAll('a, button, .product-card, .qty-btn, .magnetic');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => this.follower.classList.add('hover'));
            el.addEventListener('mouseleave', () => this.follower.classList.remove('hover'));
        });
    }

    public refresh() {
        this.attachHoverEvents();
    }
}

export class MagneticElement {
    constructor(element: HTMLElement) {
        this.bindEvents(element);
    }

    private bindEvents(el: HTMLElement) {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const multiplier = 0.3; // Strength of the magnetic pull
            el.style.transform = `translate(${x * multiplier}px, ${y * multiplier}px)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0px, 0px)';
            el.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
        });

        el.addEventListener('mouseenter', () => {
            el.style.transition = 'none'; // Remove transition for instant following
        });
    }
}

export class VanillaTilt {
    private glareElement: HTMLElement;
    private element: HTMLElement;

    constructor(element: HTMLElement) {
        this.element = element;
        // Inject Glare wrapper
        const glareWrapper = document.createElement('div');
        glareWrapper.classList.add('glare-wrapper');
        this.glareElement = document.createElement('div');
        this.glareElement.classList.add('glare');
        glareWrapper.appendChild(this.glareElement);
        element.appendChild(glareWrapper);

        // Ensure parent has appropriate positioning
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }

        this.bindEvents();
    }

    private bindEvents() {
        this.element.addEventListener('mousemove', (e) => {
            const rect = this.element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -8; // Max tilt 8deg
            const rotateY = ((x - centerX) / centerX) * 8;

            // Apply Tilt
            gsap.to(this.element, {
                rotationX: rotateX,
                rotationY: rotateY,
                transformPerspective: 1000,
                scale: 1.02,
                duration: 0.5,
                ease: 'power2.out'
            });

            // Map glare to mouse position (inverse mapping for realism)
            const glareX = (x / rect.width) * 100;
            const glareY = (y / rect.height) * 100;

            gsap.to(this.glareElement, {
                x: `${glareX}%`,
                y: `${glareY}%`,
                opacity: 1,
                duration: 0.5,
                ease: 'power2.out',
            });
        });

        this.element.addEventListener('mouseleave', () => {
            gsap.to(this.element, {
                rotationX: 0,
                rotationY: 0,
                scale: 1,
                duration: 0.8,
                ease: 'elastic.out(1, 0.5)' // Spring back effect
            });

            gsap.to(this.glareElement, {
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out'
            });
        });
    }
}
