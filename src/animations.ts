import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class AnimationController {

    public static initScrollReveals() {
        // Reveal any element with the JS class hook '.reveal' -> '.js-reveal'
        const revealElements = document.querySelectorAll('.reveal');

        // Set initial state
        gsap.set(revealElements, {
            opacity: 0,
            y: 50,
            visibility: 'hidden'
        });

        // Animate on scroll
        revealElements.forEach((el) => {
            gsap.to(el, {
                scrollTrigger: {
                    trigger: el,
                    start: "top 85%", // Trigger when top of element hits 85% of viewport
                    toggleActions: "play none none reverse", // Play forward when entering, reverse when exiting gracefully
                },
                duration: 1.2,
                opacity: 1,
                y: 0,
                ease: "power3.out",
                autoAlpha: 1, // handles visibility
                clearProps: "transform" // clear transforms after animation to help vanilla tilt
            });
        });
    }

    public static initParallax() {
        // Apply parallax to the Brand Story image
        const parallaxImages = document.querySelectorAll('.js-parallax-img');

        parallaxImages.forEach((img) => {
            gsap.to(img, {
                scrollTrigger: {
                    trigger: img.parentElement,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true, // Smooth scrubbing effect true to scroll speed
                },
                y: "20%", // Move down by 20% over the scroll duration
                ease: "none"
            });
        });
    }

    public static initTextSplit() {
        const splitElements = document.querySelectorAll('.js-split-text');

        splitElements.forEach(el => {
            // Basic split by words for effect. Wrapping in generic spans.
            const text = el.textContent || '';
            el.innerHTML = ''; // clear original

            const words = text.split(' ');

            words.forEach((word, index) => {
                const lineSpan = document.createElement('span');
                lineSpan.className = 'split-line';
                lineSpan.style.display = 'inline-block';

                const wordSpan = document.createElement('span');
                wordSpan.className = 'split-word';
                wordSpan.textContent = word + (index < words.length - 1 ? '\u00A0' : ''); // add space

                lineSpan.appendChild(wordSpan);
                el.appendChild(lineSpan);
            });

            // Animate the words up
            gsap.to(el.querySelectorAll('.split-word'), {
                scrollTrigger: {
                    trigger: el,
                    start: "top 90%",
                },
                y: 0,
                duration: 1,
                stagger: 0.05,
                ease: "power4.out"
            });
        });
    }

    public static pageTransition(onComplete: () => void) {
        const overlay = document.querySelector('.page-transition-overlay');
        if (!overlay) {
            onComplete();
            return;
        }

        const tl = gsap.timeline({
            onComplete: () => {
                onComplete();
                // Fade out overlay after DOM swap
                gsap.to(overlay, { yPercent: -100, duration: 0.8, ease: "power4.inOut", delay: 0.1 });
            }
        });

        // Bring overlay up
        tl.fromTo(overlay, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: "power4.inOut" });
    }

    public static refresh() {
        ScrollTrigger.refresh();
    }
}
