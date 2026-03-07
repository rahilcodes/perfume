import './style.css'
import { CustomCursor, MagneticElement, VanillaTilt } from './interactions'
import { AnimationController } from './animations'
import { initLenis } from './lenis'
import { WebGLEngine } from './webgl'

// Types
interface Product {
  id: string;
  name: string;
  category: string;
  inspiredBy: string;
  price: number;
  sizes: { ml: number; price: number }[];
  notes: { top: string[]; heart: string[]; base: string[] };
  images: string[];
  image: string;
  description: string;
}

// Simple Router / State Management
const state: {
  products: Product[],
  currentCategory: string,
  searchQuery: string,
  selectedProduct: Product | null,
  selectedSize: number,
  quantity: number,
  gridQuantities: Record<string, number>,
  gridSizes: Record<string, number>,
  wishlist: string[],
  recentlyViewed: string[],
  currentGalleryIndex: number,
  darkMode: boolean,
  giftWrap: boolean,
} = {
  products: [],
  currentCategory: 'All',
  searchQuery: '',
  selectedProduct: null,
  selectedSize: 50,
  quantity: 1,
  gridQuantities: {},
  gridSizes: {},
  wishlist: JSON.parse(localStorage.getItem('ea_wishlist') || '[]'),
  recentlyViewed: JSON.parse(localStorage.getItem('ea_recent') || '[]'),
  currentGalleryIndex: 0,
  darkMode: localStorage.getItem('ea_theme') === 'light' ? false : true,
  giftWrap: false,
}

let cursor: CustomCursor | null = null;
let webglInstance: WebGLEngine | null = null;
let ambientAudio: HTMLAudioElement | null = null;
let ambientPlaying = false;

function initAmbientAudio() {
  if (ambientAudio) return;
  ambientAudio = new Audio('music.mp3');
  ambientAudio.loop = true;
  ambientAudio.volume = 0.3;
  // Try to play immediately
  ambientAudio.play().then(() => {
    ambientPlaying = true;
    updateAmbientBtn();
    showMusicToast();
  }).catch(() => {
    // Blocked by browser — play on first interaction
    const startOnInteraction = () => {
      ambientAudio!.play().then(() => {
        ambientPlaying = true;
        updateAmbientBtn();
        showMusicToast();
      });
      document.removeEventListener('click', startOnInteraction);
      document.removeEventListener('keydown', startOnInteraction);
      document.removeEventListener('scroll', startOnInteraction);
    };
    document.addEventListener('click', startOnInteraction, { once: true });
    document.addEventListener('keydown', startOnInteraction, { once: true });
    document.addEventListener('scroll', startOnInteraction, { once: true });
  });
}

function updateAmbientBtn() {
  const btn = document.querySelector('.js-ambient-toggle');
  if (btn) {
    btn.textContent = ambientPlaying ? '🔊' : '🔈';
    btn.classList.toggle('playing', ambientPlaying);
  }
}

function showMusicToast() {
  const existing = document.getElementById('music-toast');
  if (existing) return;
  const toast = document.createElement('div');
  toast.id = 'music-toast';
  toast.innerHTML = '🎵 Ambient music playing';
  toast.style.cssText = `
    position:fixed;bottom:6rem;left:2rem;z-index:9998;
    background:rgba(11,11,11,0.9);backdrop-filter:blur(10px);
    border:1px solid rgba(212,175,55,0.4);color:#D4AF37;
    padding:0.7rem 1.2rem;font-family:var(--font-body);
    font-size:0.8rem;letter-spacing:0.08em;
    animation:fadeIn 0.4s ease,fadeOut 0.5s ease 3s forwards;
    border-radius:2px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

async function init() {
  const response = await fetch('data/products.json');
  state.products = await response.json();
  render();

  // Auto-start ambient music (plays immediately or on first interaction)
  initAmbientAudio();

  // Initialize WebGL Hero
  const heroContainer = document.querySelector<HTMLElement>('#hero-canvas-container');
  if (heroContainer && !webglInstance) {
    webglInstance = new WebGLEngine('hero-canvas-container');
  }

  // Initialize Custom Cursor for desktop
  if (window.matchMedia("(pointer: fine)").matches) {
    cursor = new CustomCursor();
  }
}


function render() {
  const app = document.querySelector<HTMLDivElement>('#app')!

  // Apply theme
  document.body.classList.toggle('light-mode', !state.darkMode);

  const wishlistCount = state.wishlist.length;

  app.innerHTML = `
    <div class="page-transition-overlay"></div>
    <div class="main-wrapper">
      <nav class="glass">
        <div class="container nav-content">
          <div class="logo" data-route="Home" style="cursor:pointer">ELIXIR ARTISTRY</div>
          <div class="nav-links">
            <a href="#" data-route="Home">Home</a>
            <a href="#" data-route="Men">Men</a>
            <a href="#" data-route="Women">Women</a>
            <a href="#" data-route="Unisex">Unisex</a>
            <a href="#" data-route="Originals">Originals</a>
            <a href="#" data-route="Quiz">Scent Quiz</a>
            <a href="#" data-route="Contact">Contact</a>
          </div>
          <div class="nav-right">
            <button class="nav-icon-btn js-wishlist-nav" title="Wishlist">♡<span class="wishlist-count ${wishlistCount > 0 ? 'visible' : ''}">${wishlistCount}</span></button>
            <button class="theme-toggle js-theme-toggle" title="Toggle Day/Night">${state.darkMode ? '☀️' : '🌙'}</button>
            <div class="mobile-toggle">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </nav>

      <main>
        ${renderContent()}
      </main>
    </div>

    <footer class="footer-parallax">
      <div class="container footer-grid">
        <div class="footer-brand">
          <h2>ELIXIR ARTISTRY</h2>
          <p>The art of scents, redefined. We curate the world's most evocative inspirations into a gallery of liquid gold. Each drop is a journey; each essence is a memory.</p>
        </div>
        <div class="footer-links-group">
          <h4>Collection</h4>
          <ul>
            <li><a href="#" data-route="Men">Men's Fragrances</a></li>
            <li><a href="#" data-route="Women">Women's Fragrances</a></li>
            <li><a href="#" data-route="Unisex">Unisex Selection</a></li>
            <li><a href="#" data-route="Originals">Originals / Private Blend</a></li>
          </ul>
        </div>
        <div class="footer-links-group">
          <h4>Customer Care</h4>
          <ul>
            <li><a href="#" data-route="Quiz">Scent Discovery Quiz</a></li>
            <li><a href="#" data-route="Contact">Contact & Support</a></li>
            <li><a href="#" data-route="Terms">Terms & Conditions</a></li>
            <li><a href="#" data-route="Wishlist">My Wishlist</a></li>
          </ul>
        </div>
      </div>
      <div class="container footer-bottom">
        <p>&copy; 2026 ELIXIR ARTISTRY. All Rights Reserved.</p>
        <div class="footer-payment-icons">
          <span>UPID</span> <span>VISA</span> <span>MC</span>
        </div>
      </div>
    </footer>

    <!-- Floating Buttons -->
    <a class="wa-float" href="https://wa.me/918125320728" target="_blank" title="Chat on WhatsApp">💬</a>
    <button class="ambient-btn js-ambient-toggle ${ambientPlaying ? 'playing' : ''}" title="Ambient Music">${ambientPlaying ? '🔊' : '🔈'}</button>
  `

  // Apply dark mode on body immediately
  document.body.classList.toggle('light-mode', !state.darkMode);

  bindEvents();
  initInteractions();
}

function renderContent() {
  if (state.selectedProduct) {
    return renderProductDetail(state.selectedProduct);
  }

  switch (state.currentCategory) {
    case 'Contact': return renderContact();
    case 'Terms': return renderTerms();
    case 'Originals': return renderOriginals();
    case 'Quiz': return renderQuiz();
    case 'Wishlist': return renderWishlistPage();
    default: return `
      ${renderHero()}
      <section id="products" class="container products-section">
        <div class="section-header reveal">
          <h2>${state.currentCategory === 'All' ? 'Our' : state.currentCategory} Collection</h2>
          <p>Curated inspirations of the world's most iconic scents.</p>
        </div>
        
        <div class="search-container reveal">
          <input type="text" class="search-input js-search-input" placeholder="Search our fragrance collection..." value="${state.searchQuery}">
          <span class="search-icon">🔍</span>
        </div>

        <div class="product-grid" id="main-product-grid">
          ${renderProducts()}
        </div>
      </section>
      ${state.currentCategory === 'All' ? renderRecentlyViewed() : ''}
      ${state.currentCategory === 'All' ? renderBrandStory() : ''}
      ${state.currentCategory === 'All' ? renderExperienceSection() : ''}
    `;
  }
}

function renderProductDetail(product: Product) {
  const selectedSizeObj = product.sizes.find(s => s.ml === state.selectedSize) || product.sizes[0];
  const giftWrapPrice = (state as any).giftWrap ? 99 : 0;
  const totalPrice = selectedSizeObj.price * state.quantity + giftWrapPrice;
  const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPrice);
  const currentImg = product.images?.[state.currentGalleryIndex] || product.image;
  const isWishlisted = state.wishlist.includes(product.id);

  const noteTags = [
    ...product.notes.top.map(n => `<span class="note-tag top">${n}</span>`),
    ...product.notes.heart.map(n => `<span class="note-tag heart">${n}</span>`),
    ...product.notes.base.map(n => `<span class="note-tag base">${n}</span>`)
  ].join('');

  // Upsell: other 3 products
  const upsells = state.products.filter(p => p.id !== product.id).slice(0, 3);
  const upsellHtml = upsells.map(p => `
    <div class="upsell-card js-upsell-card" data-id="${p.id}">
      <img src="${p.image}" alt="${p.name}" loading="lazy">
      <h4>${p.name}</h4>
      <p>${p.inspiredBy === 'Original Creation' ? 'Exclusive Selection' : 'Inspired by ' + p.inspiredBy}</p>
      <p class="upsell-price">${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.sizes[0].price)}</p>
    </div>
  `).join('');

  return `
    <section class="container product-detail-view reveal">
      <button class="back-btn js-back-btn">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M10 3L5 8l5 5"/>
        </svg>
        Back to Collection
      </button>

      <div class="product-detail-grid">
        <div class="product-detail-image glass">
           <img src="${currentImg}" alt="${product.name}" loading="lazy" class="js-lightbox-trigger" style="cursor:zoom-in">
           <div class="gallery-thumbs">
             ${(product.images || [product.image]).map((img, i) => `<img src="${img}" class="gallery-thumb ${i === state.currentGalleryIndex ? 'active' : ''} js-gallery-thumb" data-index="${i}" loading="lazy">`).join('')}
           </div>
        </div>
        <div class="product-detail-info">
          <span class="category">${product.category}</span>
          <h1 class="magnetic">${product.name}</h1>
          <p class="inspired">${product.inspiredBy === 'Original Creation' ? 'Exclusive Selection' : 'Inspired by ' + product.inspiredBy}</p>
          <div class="note-tags" style="margin-bottom:2rem">${noteTags}</div>
          <p class="description">${product.description}</p>
          
          <div class="size-selector-detail reveal">
            <p class="selector-label">Select Size</p>
            <div class="size-options">
              ${product.sizes.map(s => `
                <button class="size-btn ${state.selectedSize === s.ml ? 'active' : ''} js-detail-size" data-ml="${s.ml}">
                  ${s.ml}ml
                </button>
              `).join('')}
            </div>
          </div>

          <div class="purchase-area">
            <div class="price-display">
              <h2 id="dynamic-price">${formattedPrice}</h2>
              <div class="quantity-selector">
                <button class="qty-btn js-qty-minus">-</button>
                <span class="qty-display" id="qty-val">${state.quantity}</span>
                <button class="qty-btn js-qty-plus">+</button>
              </div>
            </div>

            <label class="gift-wrap-row">
              <input type="checkbox" class="js-gift-wrap" ${(state as any).giftWrap ? 'checked' : ''}>
              <span class="gift-wrap-label">🎁 <strong>Add Gift Wrapping</strong> — Premium black box with gold ribbon</span>
              <span class="gift-wrap-price">+₹99</span>
            </label>

            <button class="btn btn-primary btn-large js-buy-whatsapp magnetic" style="margin-top:1.5rem">BUY NOW via WhatsApp</button>
            <button class="btn js-wishlist-detail" style="width:100%;margin-top:0.8rem" data-id="${product.id}">${isWishlisted ? '♥ Remove from Wishlist' : '♡ Add to Wishlist'}</button>
            <button class="share-btn js-share-btn" data-name="${product.name}" data-price="${formattedPrice}">
              📲 Share this Fragrance
            </button>
          </div>
        </div>
      </div>

      <div class="upsell-section container">
        <h3>Complete the Collection</h3>
        <div class="upsell-grid">${upsellHtml}</div>
      </div>
    </section>
  `;
}


function renderHero() {
  const slides = state.products.map((p, i) => `
    <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
      <div class="hero-slide-bg" style="background-image: url('${p.image}')"></div>
      <div class="hero-slide-overlay"></div>
      <div class="container hero-slide-content">
        <div class="hero-slide-meta">
          <span class="hero-slide-category">${p.category}</span>
          <h1 class="hero-slide-title">${p.name}</h1>
          <p class="hero-slide-inspired">${p.inspiredBy === 'Original Creation' ? 'Exclusive Creation' : 'Inspired by ' + p.inspiredBy}</p>
          <p class="hero-slide-desc">${p.description.substring(0, 110)}...</p>
          <div class="hero-slide-actions">
            <a href="#products" class="btn btn-primary js-hero-explore" data-id="${p.id}">Explore Fragrance</a>
            <a href="#products" class="btn hero-btn-secondary">View Collection</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  const dots = state.products.map((_, i) => `
    <button class="hero-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></button>
  `).join('');

  return `
    <section class="hero-slider" id="hero-slider">
      <div class="hero-slides-wrapper">
        ${slides}
      </div>
      <div class="hero-controls">
        <div class="hero-dots">${dots}</div>
        <div class="hero-arrows">
          <button class="hero-arrow hero-arrow-prev">&#8592;</button>
          <button class="hero-arrow hero-arrow-next">&#8594;</button>
        </div>
      </div>
      <div class="hero-scroll-hint">
        <span></span>
        <p>Scroll</p>
      </div>
    </section>
  `;
}

let heroSliderInterval: ReturnType<typeof setInterval> | null = null;
let currentSlide = 0;

function initHeroSlider() {
  const slides = document.querySelectorAll<HTMLElement>('.hero-slide');
  const dots = document.querySelectorAll<HTMLElement>('.hero-dot');
  if (!slides.length) return;

  function goToSlide(idx: number) {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = (idx + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  (window as any).goToSlide = goToSlide;

  document.querySelector('.hero-arrow-next')?.addEventListener('click', () => {
    clearInterval(heroSliderInterval!);
    goToSlide(currentSlide + 1);
    heroSliderInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
  });

  document.querySelector('.hero-arrow-prev')?.addEventListener('click', () => {
    clearInterval(heroSliderInterval!);
    goToSlide(currentSlide - 1);
    heroSliderInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
  });

  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-slide') || '0');
      clearInterval(heroSliderInterval!);
      goToSlide(idx);
      heroSliderInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
    });
  });

  // Explore button => navigate to product detail
  document.querySelectorAll('.js-hero-explore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const product = state.products.find(p => p.id === id);
      if (product) {
        state.selectedProduct = product;
        state.selectedSize = product.sizes[0].ml;
        state.quantity = 1;
        render();
      }
    });
  });

  if (heroSliderInterval) clearInterval(heroSliderInterval);
  heroSliderInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
}



function renderOriginals() {
  const originals = state.products.filter(p => p.category === 'Originals');
  return `
    <section class="page-hero">
      <div class="container">
        <h1>Grand Originals</h1>
        <p>Masterpieces born from our own laboratory. Unique, timeless, and strictly original.</p>
      </div>
    </section>
    <section class="container products-section">
      <div class="product-grid">
        ${renderProductsList(originals)}
      </div>
    </section>
  `;
}

function renderContact() {
  return `
    <section class="page-hero">
      <div class="container">
        <h1>Connect With Us</h1>
        <p>Experience luxury service. Reach out for inquiries or custom consultations.</p>
      </div>
    </section>
    <section class="container contact-section">
      <div class="contact-grid">
        <div class="contact-form glass reveal">
          <form>
            <div class="form-group">
              <label>Name</label>
              <input type="text" placeholder="Your Name">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" placeholder="your@email.com">
            </div>
            <div class="form-group">
              <label>Message</label>
              <textarea rows="5" placeholder="How can we help?"></textarea>
            </div>
            <button type="button" class="btn btn-primary">Send Message</button>
          </form>
        </div>
        <div class="contact-info reveal" style="animation-delay: 0.2s">
          <h3>Visit Our Atelier</h3>
          <p>123 Luxury Lane, Perfume District<br>Grasse, France</p>
          <br>
          <h3>Email Us</h3>
          <p>concierge@elixirluxe.com</p>
          <br>
          <h3>Call Us</h3>
          <p>+33 (0) 1 23 45 67 89</p>
        </div>
      </div>
    </section>
  `;
}

function renderTerms() {
  return `
    <section class="page-hero">
      <div class="container">
        <h1>Terms & Conditions</h1>
      </div>
    </section>
    <section class="container text-page reveal">
      <div class="glass" style="padding: 4rem;">
        <h3>1. Introduction</h3>
        <p>Welcome to ELIXIR ARTISTRY. By accessing our website, you agree to these terms.</p>
        <br>
        <h3>2. Product Inspiration</h3>
        <p>Our "Inspired By" collection represents our own interpretations of famous scents. We are not affiliated with the original brands.</p>
        <br>
        <h3>3. Intellectual Property</h3>
        <p>All content on this site is the property of ELIXIR ARTISTRY.</p>
      </div>
    </section>
  `;
}

function renderBrandStory() {
  return `
    <section class="brand-story container reveal">
      <div class="brand-story-grid">
        <div class="brand-text">
          <h2>The Art of Essence</h2>
          <p>We believe fragrance is more than a scent—it is an invisible architecture that defines your presence. Crafted using rare, ethically sourced ingredients from around the world, every bottle in our collection represents a meticulous distillation of luxury and emotion.</p>
        </div>
        <div class="brand-image-wrapper">
          <img src="https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80" alt="Brand Aesthetics" class="js-parallax-img">
        </div>
      </div>
    </section>
  `;
}

function renderExperienceSection() {
  return `
    <section class="experience-section reveal">
      <div class="container section-header">
        <h2>The Scent Experience</h2>
        <p>Understanding the architecture of our luxury creations.</p>
        
        <div class="notes-grid">
          <div class="note-card glass reveal js-product-card" style="cursor: default; pointer-events: none;">
            <div class="scent-visualization">
              <div class="scent-ring-top"></div>
            </div>
            <h3>Top Notes</h3>
            <p>The immediate, striking introduction. Vibrant citrus, rare spices, and fleeting botanicals that form the first impression.</p>
          </div>
          <div class="note-card glass reveal js-product-card" style="cursor: default; pointer-events: none;">
            <div class="scent-visualization">
              <div class="scent-ring-heart">
                <span></span><span></span><span></span>
              </div>
            </div>
            <h3>Heart Notes</h3>
            <p>The true character. Lush florals, deep woods, and complex resins that emerge as the fragrance bonds with your skin.</p>
          </div>
          <div class="note-card glass reveal js-product-card" style="cursor: default; pointer-events: none;">
            <div class="scent-visualization">
              <div class="scent-ring-base"></div>
            </div>
            <h3>Base Notes</h3>
            <p>The lasting legacy. Rich oud, sensual musks, and dark ambers that leave an unforgettable trail.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderProducts() {
  let filtered = state.currentCategory === 'All'
    ? state.products
    : state.products.filter(p => p.category === state.currentCategory);

  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.inspiredBy.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    return `<div class="no-results">No fragrances match your search criteria.</div>`;
  }

  return renderProductsList(filtered);
}

function renderProductsList(list: any[]) {
  return list.map(p => {
    // Initialize product grid quantities/sizes if not set
    if (!state.gridQuantities) state.gridQuantities = {};
    if (!state.gridSizes) state.gridSizes = {};
    if (!state.gridQuantities[p.id]) state.gridQuantities[p.id] = 1;
    if (!state.gridSizes[p.id]) state.gridSizes[p.id] = p.sizes[0].ml;

    const qty = state.gridQuantities[p.id];
    const ml = state.gridSizes[p.id];
    const sizeObj = p.sizes.find((s: any) => s.ml === ml) || p.sizes[0];
    const totalPrice = sizeObj.price * qty;
    const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPrice);
    const isWishlisted = state.wishlist.includes(p.id);

    const noteTags = [
      ...(p.notes?.top || []).slice(0, 1).map((n: string) => `<span class="note-tag top">${n}</span>`),
      ...(p.notes?.heart || []).slice(0, 1).map((n: string) => `<span class="note-tag heart">${n}</span>`),
      ...(p.notes?.base || []).slice(0, 1).map((n: string) => `<span class="note-tag base">${n}</span>`)
    ].join('');

    return `
    <div class="product-card glass reveal js-product-card" data-id="${p.id}">
      <div class="product-img-wrapper js-view-details" style="cursor: pointer;">
         <img src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      <button class="wishlist-btn js-wishlist-card ${isWishlisted ? 'active' : ''}" data-id="${p.id}">${isWishlisted ? '♥' : '♡'}</button>
      <div class="product-info">
        <span class="category">${p.category}</span>
        <h3 class="js-view-details" style="cursor: pointer;">${p.name}</h3>
        <p class="inspired">${p.inspiredBy === 'Original Creation' ? 'Exclusive Selection' : 'Inspired by ' + p.inspiredBy}</p>
        
        <div class="note-tags">${noteTags}</div>

        <div class="size-selector-grid">
          ${p.sizes.map((s: any) => `
            <button class="size-btn-mini ${ml === s.ml ? 'active' : ''} js-grid-size" data-id="${p.id}" data-ml="${s.ml}">
              ${s.ml}ml
            </button>
          `).join('')}
        </div>

        <div class="card-purchase-area">
          <p class="price" id="grid-price-${p.id}">${formattedPrice}</p>
          <div class="quantity-selector small">
            <button class="qty-btn js-grid-qty-minus" data-id="${p.id}">-</button>
            <span class="qty-display" id="grid-qty-val-${p.id}">${qty}</span>
            <button class="qty-btn js-grid-qty-plus" data-id="${p.id}">+</button>
          </div>
        </div>
        <button class="btn js-grid-buy-whatsapp" data-id="${p.id}">Buy Now</button>
      </div>
    </div>
  `}).join('');
}


function bindEvents() {
  // Navigation Routing
  document.querySelectorAll('[data-route]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = (e.currentTarget as HTMLElement).getAttribute('data-route');
      if (route) {
        AnimationController.pageTransition(() => {
          state.selectedProduct = null; // Clear product view on nav
          state.quantity = 1; // reset quantity
          state.searchQuery = ''; // reset search
          if (['Home', 'Men', 'Women', 'Unisex', 'Originals'].includes(route)) {
            state.currentCategory = route === 'Home' ? 'All' : route;
          } else {
            state.currentCategory = route;
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
          render();
        });
      }
    });
  });

  // Search Logic
  const searchInput = document.querySelector('.js-search-input') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = (e.target as HTMLInputElement).value;
      const grid = document.getElementById('main-product-grid');
      if (grid) {
        grid.innerHTML = renderProducts();
        initInteractions(); // rebind interactions for new DOM nodes
      }
    });
  }

  // Product Card Clicks (View Details Navigation)
  document.querySelectorAll('.js-view-details').forEach(el => {
    el.addEventListener('click', (e) => {
      // Find closest card to get ID
      const card = (e.currentTarget as HTMLElement).closest('.js-product-card');
      if (!card) return;

      const id = card.getAttribute('data-id');
      const product = state.products.find(p => p.id === id);
      if (product) {
        AnimationController.pageTransition(() => {
          state.selectedProduct = product;
          state.quantity = 1;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          render();
        });
      }
    });
  });

  // Quantity Management (Detail Page)
  const btnMinus = document.querySelector('.js-qty-minus');
  const btnPlus = document.querySelector('.js-qty-plus');
  if (btnMinus && btnPlus && state.selectedProduct) {
    btnMinus.addEventListener('click', () => updateQuantity(-1));
    btnPlus.addEventListener('click', () => updateQuantity(1));
  }

  // Quantity Management (Grid)
  document.querySelectorAll('.js-grid-qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent opening detail view
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) updateGridQuantity(id, -1);
    });
  });

  document.querySelectorAll('.js-grid-qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) updateGridQuantity(id, 1);
    });
  });

  // WhatsApp Checkout (Detail Page)
  const btnBuy = document.querySelector('.js-buy-whatsapp');
  if (btnBuy && state.selectedProduct) {
    btnBuy.addEventListener('click', () => {
      const p = state.selectedProduct!;
      triggerWhatsApp(p, state.quantity, state.selectedSize);
    });
  }

  // WhatsApp Checkout (Grid)
  document.querySelectorAll('.js-grid-buy-whatsapp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) {
        const p = state.products.find(prod => prod.id === id);
        const qty = state.gridQuantities[id] || 1;
        const ml = state.gridSizes[id] || (p ? p.sizes[0].ml : 50);
        if (p) triggerWhatsApp(p, qty, ml);
      }
    });
  });

  // Size Selection (Detail Page)
  document.querySelectorAll('.js-detail-size').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ml = parseInt((e.currentTarget as HTMLElement).getAttribute('data-ml') || '50');
      state.selectedSize = ml;
      render();
    });
  });

  // Size Selection (Grid)
  document.querySelectorAll('.js-grid-size').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const ml = parseInt((e.currentTarget as HTMLElement).getAttribute('data-ml') || '50');
      if (id) {
        state.gridSizes[id] = ml;
        // Update price in grid immediately
        const p = state.products.find(prod => prod.id === id);
        if (p) {
          const qty = state.gridQuantities[id] || 1;
          const sizeObj = p.sizes.find(s => s.ml === ml) || p.sizes[0];
          const totalPrice = sizeObj.price * qty;
          const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPrice);
          document.getElementById(`grid-price-${id}`)!.textContent = formattedPrice;

          // Update active state of buttons
          const card = (e.currentTarget as HTMLElement).closest('.product-card');
          if (card) {
            card.querySelectorAll('.js-grid-size').forEach(b => b.classList.remove('active'));
            (e.currentTarget as HTMLElement).classList.add('active');
          }
        }
      }
    });
  });

  // --- Wishlist (Card grid) ---
  document.querySelectorAll('.js-wishlist-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
      toggleWishlist(id);
      const isNowWishlisted = state.wishlist.includes(id);
      (e.currentTarget as HTMLElement).textContent = isNowWishlisted ? '♥' : '♡';
      (e.currentTarget as HTMLElement).classList.toggle('active', isNowWishlisted);
      // Update counter badge
      const badge = document.querySelector('.wishlist-count');
      if (badge) {
        badge.textContent = state.wishlist.length.toString();
        badge.classList.toggle('visible', state.wishlist.length > 0);
      }
    });
  });

  // --- Wishlist (Detail page) ---
  const wishlistDetailBtn = document.querySelector('.js-wishlist-detail');
  if (wishlistDetailBtn && state.selectedProduct) {
    wishlistDetailBtn.addEventListener('click', () => {
      const id = state.selectedProduct!.id;
      toggleWishlist(id);
      const isNow = state.wishlist.includes(id);
      wishlistDetailBtn.textContent = isNow ? '♥ Remove from Wishlist' : '♡ Add to Wishlist';
    });
  }

  // --- Wishlist nav button ---
  document.querySelector('.js-wishlist-nav')?.addEventListener('click', () => {
    state.currentCategory = 'Wishlist';
    state.selectedProduct = null;
    render();
  });

  // --- Dark / Light Mode Toggle ---
  document.querySelector('.js-theme-toggle')?.addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    localStorage.setItem('ea_theme', state.darkMode ? 'dark' : 'light');
    document.body.classList.toggle('light-mode', !state.darkMode);
    const btn = document.querySelector('.js-theme-toggle');
    if (btn) btn.textContent = state.darkMode ? '☀️' : '🌙';
  });

  // --- Ambient Sound Toggle ---
  document.querySelector('.js-ambient-toggle')?.addEventListener('click', () => {
    if (!ambientAudio) {
      initAmbientAudio();
      return;
    }
    if (ambientPlaying) {
      ambientAudio.pause();
      ambientPlaying = false;
    } else {
      ambientAudio.play();
      ambientPlaying = true;
    }
    updateAmbientBtn();
  });

  // --- Gallery Thumbnails (Detail Page) ---
  document.querySelectorAll('.js-gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', (e) => {
      const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0');
      state.currentGalleryIndex = idx;
      const mainImg = document.querySelector<HTMLImageElement>('.product-detail-image > img');
      if (mainImg && state.selectedProduct) {
        mainImg.src = state.selectedProduct.images[idx];
        document.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
      }
    });
  });

  // --- Lightbox (click main detail image) ---
  document.querySelector('.js-lightbox-trigger')?.addEventListener('click', () => {
    if (!state.selectedProduct) return;
    openLightbox(state.selectedProduct.images, state.currentGalleryIndex);
  });

  // --- Quiz options ---
  document.querySelectorAll('.js-quiz-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const step = parseInt((e.currentTarget as HTMLElement).getAttribute('data-step') || '0');
      const value = (e.currentTarget as HTMLElement).getAttribute('data-value') || '';
      advanceQuiz(step, value);
    });
  });

  // --- Quiz restart ---
  document.querySelector('.js-quiz-restart')?.addEventListener('click', () => {
    state.currentCategory = 'Quiz';
    render();
  });

  // --- Quiz result - View Product ---
  document.querySelector('.js-quiz-view-product')?.addEventListener('click', (e) => {
    const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
    const product = state.products.find(p => p.id === id);
    if (product) {
      trackRecentlyViewed(product.id);
      state.selectedProduct = product;
      state.currentCategory = 'All';
      state.selectedSize = product.sizes[0].ml;
      state.quantity = 1;
      render();
    }
  });

  // --- Feature 8: Back Button ---
  document.querySelector('.js-back-btn')?.addEventListener('click', () => {
    AnimationController.pageTransition(() => {
      state.selectedProduct = null;
      render();
    });
  });

  // --- Feature 4: Gift Wrap Toggle ---
  document.querySelector('.js-gift-wrap')?.addEventListener('change', (e) => {
    state.giftWrap = (e.target as HTMLInputElement).checked;
    render();
  });

  // --- Feature 10: Share Button ---
  document.querySelector('.js-share-btn')?.addEventListener('click', (e) => {
    const name = (e.currentTarget as HTMLElement).getAttribute('data-name');
    const price = (e.currentTarget as HTMLElement).getAttribute('data-price');
    const text = `Check out this exquisite fragrance: ${name} (${price}) at ELIXIR ARTISTRY.`;

    if (navigator.share) {
      navigator.share({
        title: 'ELIXIR ARTISTRY',
        text: text,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`${text} ${window.location.href}`);
      const toast = document.createElement('div');
      toast.className = 'share-toast';
      toast.textContent = 'Link copied to clipboard!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  });

  // --- Feature 9: Upsell Clicks ---
  document.querySelectorAll('.js-upsell-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const product = state.products.find(p => p.id === id);
      if (product) {
        AnimationController.pageTransition(() => {
          state.selectedProduct = product;
          state.quantity = 1;
          state.currentGalleryIndex = 0;
          state.selectedSize = product.sizes[0].ml;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          render();
        });
      }
    });
  });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function toggleWishlist(id: string) {
  const idx = state.wishlist.indexOf(id);
  if (idx > -1) {
    state.wishlist.splice(idx, 1);
  } else {
    state.wishlist.push(id);
  }
  localStorage.setItem('ea_wishlist', JSON.stringify(state.wishlist));
}

function trackRecentlyViewed(id: string) {
  state.recentlyViewed = state.recentlyViewed.filter(r => r !== id);
  state.recentlyViewed.unshift(id);
  if (state.recentlyViewed.length > 6) state.recentlyViewed = state.recentlyViewed.slice(0, 6);
  localStorage.setItem('ea_recent', JSON.stringify(state.recentlyViewed));
}

function openLightbox(images: string[], startIndex: number) {
  let current = startIndex;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-inner">
      <button class="lightbox-close">&#x2715;</button>
      <button class="lightbox-nav lightbox-prev">&#8592;</button>
      <img src="${images[current]}" alt="Gallery">
      <button class="lightbox-nav lightbox-next">&#8594;</button>
      <div class="lightbox-thumbs">
        ${images.map((img, i) => `<img src="${img}" class="lightbox-thumb ${i === current ? 'active' : ''}" data-index="${i}">`).join('')}
      </div>
    </div>
  `;

  const updateImage = (idx: number) => {
    current = (idx + images.length) % images.length;
    (overlay.querySelector('.lightbox-inner img') as HTMLImageElement).src = images[current];
    overlay.querySelectorAll('.lightbox-thumb').forEach((t, i) => t.classList.toggle('active', i === current));
  };

  overlay.querySelector('.lightbox-close')!.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.lightbox-prev')!.addEventListener('click', () => updateImage(current - 1));
  overlay.querySelector('.lightbox-next')!.addEventListener('click', () => updateImage(current + 1));
  overlay.querySelectorAll('.lightbox-thumb').forEach(t => {
    t.addEventListener('click', (e) => updateImage(parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0')));
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.body.appendChild(overlay);
}

// --- Quiz State ---
const quizAnswers: string[] = [];

function advanceQuiz(step: number, value: string) {
  quizAnswers[step] = value;
  const steps = document.querySelectorAll('.quiz-step');
  const dots = document.querySelectorAll('.quiz-dot');

  if (step + 1 < steps.length - 1) {
    steps[step].classList.remove('active');
    steps[step + 1].classList.add('active');
    dots[step].classList.remove('active');
    dots[step + 1].classList.add('active');
  } else {
    // Determine result
    const recommendation = getQuizRecommendation(quizAnswers);
    steps[step].classList.remove('active');
    const resultStep = steps[steps.length - 1] as HTMLElement;
    resultStep.classList.add('active');

    const container = resultStep.querySelector('.quiz-result-content');
    if (container && recommendation) {
      container.innerHTML = `
        <p class="quiz-result-title">YOUR PERFECT SCENT</p>
        <img src="${recommendation.image}" alt="${recommendation.name}" style="width:100%;max-width:280px;height:320px;object-fit:cover;margin:1.5rem auto;display:block;">
        <h2 style="font-size:2.5rem;font-weight:300;margin-bottom:0.5rem">${recommendation.name}</h2>
        <p style="color:var(--text-secondary);margin-bottom:2rem;font-style:italic">${recommendation.inspiredBy === 'Original Creation' ? 'Exclusive Selection' : 'Inspired by ' + recommendation.inspiredBy}</p>
        <button class="btn btn-primary js-quiz-view-product" data-id="${recommendation.id}" style="margin-bottom:1rem;width:100%">Explore This Fragrance</button>
        <button class="btn js-quiz-restart" style="width:100%">Take Quiz Again</button>
      `;
      // Re-bind these new buttons
      container.querySelector('.js-quiz-view-product')?.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const product = state.products.find(p => p.id === id);
        if (product) {
          trackRecentlyViewed(product.id);
          state.selectedProduct = product;
          state.currentCategory = 'All';
          state.selectedSize = product.sizes[0].ml;
          state.quantity = 1;
          render();
        }
      });
      container.querySelector('.js-quiz-restart')?.addEventListener('click', () => {
        quizAnswers.length = 0;
        state.currentCategory = 'Quiz';
        render();
      });
    }
  }
}

function getQuizRecommendation(answers: string[]): Product | null {
  if (answers.includes('wood') || answers.includes('masculine')) {
    return state.products.find(p => p.id === 'm1') || null;
  } else if (answers.includes('floral') || answers.includes('feminine')) {
    return state.products.find(p => p.id === 'w1') || null;
  } else if (answers.includes('fresh') || answers.includes('unisex')) {
    return state.products.find(p => p.id === 'u1') || null;
  }
  return state.products.find(p => p.id === 'o1') || null;
}

// ==========================================
// PAGE RENDERERS
// ==========================================

function renderRecentlyViewed(): string {
  const recent = state.recentlyViewed
    .map(id => state.products.find(p => p.id === id))
    .filter(Boolean) as Product[];
  if (recent.length === 0) return '';
  return `
    <section class="container recently-viewed">
      <h3>Recently Viewed</h3>
      <div class="recently-grid">
        ${recent.map(p => `
          <div class="recently-card js-view-product" data-id="${p.id}">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            <strong>${p.name}</strong>
            <p>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.sizes[0].price)}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderWishlistPage(): string {
  const items = state.wishlist
    .map(id => state.products.find(p => p.id === id))
    .filter(Boolean) as Product[];
  return `
    <section class="page-hero">
      <div class="container">
        <h1>My Wishlist</h1>
      </div>
    </section>
    <section class="container products-section">
      ${items.length === 0
      ? `<div class="wishlist-empty"><p>Your wishlist is empty.</p><button class="btn btn-primary" data-route="Home">Explore Collection</button></div>`
      : `<div class="product-grid">${renderProductsList(items)}</div>`
    }
    </section>
  `;
}

function renderQuiz(): string {
  return `
    <div class="quiz-page">
      <div class="quiz-card glass">
        <h2 style="font-size:1rem;letter-spacing:0.3em;color:var(--accent-gold);text-transform:uppercase;margin-bottom:0.5rem;font-family:var(--font-body)">ELIXIR ARTISTRY</h2>
        <h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:300;margin-bottom:3rem">Scent Finder</h1>
        
        <div class="quiz-progress">
          <div class="quiz-dot active"></div>
          <div class="quiz-dot"></div>
          <div class="quiz-dot"></div>
          <div class="quiz-dot"></div>
        </div>

        <div class="quiz-step active">
          <p class="quiz-question">What is your preferred scent profile?</p>
          <div class="quiz-options">
            <button class="quiz-option js-quiz-option" data-step="0" data-value="wood"><span class="quiz-option-icon">🌿</span> Deep & Woody</button>
            <button class="quiz-option js-quiz-option" data-step="0" data-value="floral"><span class="quiz-option-icon">🌹</span> Floral & Romantic</button>
            <button class="quiz-option js-quiz-option" data-step="0" data-value="fresh"><span class="quiz-option-icon">🌊</span> Fresh & Airy</button>
            <button class="quiz-option js-quiz-option" data-step="0" data-value="oriental"><span class="quiz-option-icon">✨</span> Oriental & Mysterious</button>
          </div>
        </div>

        <div class="quiz-step">
          <p class="quiz-question">Who is this fragrance for?</p>
          <div class="quiz-options">
            <button class="quiz-option js-quiz-option" data-step="1" data-value="masculine"><span class="quiz-option-icon">🕴️</span> Him</button>
            <button class="quiz-option js-quiz-option" data-step="1" data-value="feminine"><span class="quiz-option-icon">👗</span> Her</button>
            <button class="quiz-option js-quiz-option" data-step="1" data-value="unisex"><span class="quiz-option-icon">🤝</span> Both of us</button>
          </div>
        </div>

        <div class="quiz-step">
          <p class="quiz-question">What is the occasion?</p>
          <div class="quiz-options">
            <button class="quiz-option js-quiz-option" data-step="2" data-value="daily"><span class="quiz-option-icon">☀️</span> Everyday wear</button>
            <button class="quiz-option js-quiz-option" data-step="2" data-value="evening"><span class="quiz-option-icon">🌙</span> Evening & Events</button>
            <button class="quiz-option js-quiz-option" data-step="2" data-value="special"><span class="quiz-option-icon">💎</span> Special Occasion</button>
          </div>
        </div>

        <div class="quiz-step quiz-result">
          <div class="quiz-result-content"></div>
        </div>
      </div>
    </div>
  `;
}



function triggerWhatsApp(product: Product, qty: number, ml: number) {
  const sizeObj = product.sizes.find(s => s.ml === ml) || product.sizes[0];
  const giftWrapAddon = state.giftWrap ? '\n🎁 + Premium Gift Wrapping requested' : '';
  const total = (sizeObj.price * qty) + (state.giftWrap ? 99 : 0);
  const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(total);

  const message = `Hello ELIXIR ARTISTRY, I'm interested in:
Fragrance: ${product.name}
Quantity: ${qty} x ${ml}ml
Total: ${formatted}${giftWrapAddon}

Please share the details for payment.`;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/918125320728?text=${encoded}`, '_blank');
}

function updateGridQuantity(id: string, change: number) {
  const current = state.gridQuantities[id] || 1;
  const newQty = current + change;
  if (newQty < 1) return;

  state.gridQuantities[id] = newQty;
  document.getElementById(`grid-qty-val-${id}`)!.textContent = newQty.toString();

  const product = state.products.find(p => p.id === id);
  if (product) {
    const ml = state.gridSizes[id] || product.sizes[0].ml;
    const sizeObj = product.sizes.find(s => s.ml === ml) || product.sizes[0];
    const totalPrice = sizeObj.price * newQty;
    const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPrice);
    document.getElementById(`grid-price-${id}`)!.textContent = formattedPrice;
  }
}

function updateQuantity(change: number) {
  if (!state.selectedProduct) return;
  const newQty = state.quantity + change;
  if (newQty < 1) return;

  state.quantity = newQty;
  document.getElementById('qty-val')!.textContent = state.quantity.toString();

  const selectedSizeObj = state.selectedProduct.sizes.find(s => s.ml === state.selectedSize) || state.selectedProduct.sizes[0];
  const totalPrice = selectedSizeObj.price * state.quantity;
  const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPrice);
  document.getElementById('dynamic-price')!.textContent = formattedPrice;
}

function initInteractions() {
  if (cursor) cursor.refresh(); // Re-bind dynamic elements

  document.querySelectorAll('.magnetic').forEach(el => new MagneticElement(el as HTMLElement));
  document.querySelectorAll('.js-product-card, .product-detail-image').forEach(el => new VanillaTilt(el as HTMLElement));

  // Feature 1: Cursor Trail
  window.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.15) return; // limit density
    const particle = document.createElement('div');
    particle.className = 'cursor-trail-particle';
    particle.style.left = `${e.clientX}px`;
    particle.style.top = `${e.clientY}px`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 800);
  });

  // Feature 7: Swipe Gestures on Hero
  const hero = document.querySelector('.hero-slider');
  if (hero) {
    let touchX = 0;
    hero.addEventListener('touchstart', (e: any) => touchX = e.touches[0].clientX, { passive: true });
    hero.addEventListener('touchend', (e: any) => {
      const delta = e.changedTouches[0].clientX - touchX;
      if (Math.abs(delta) > 50) {
        if (delta > 0) { // swipe right
          const prev = (currentSlide - 1 + state.products.length) % state.products.length;
          (window as any).goToSlide?.(prev);
        } else { // swipe left
          const next = (currentSlide + 1) % state.products.length;
          (window as any).goToSlide?.(next);
        }
      }
    }, { passive: true });
  }

  // Initialize Hero Slider (only if on home page)
  currentSlide = 0;
  initHeroSlider();

  // Initialize GSAP Animations
  AnimationController.initTextSplit();
  AnimationController.initScrollReveals();
  AnimationController.initParallax();
}


// Start
initLenis();
init();
