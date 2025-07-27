// Three.js Ripple Effect Background
const initThreeJSBackground = () => {
    const canvas = document.getElementById('bg-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Mouse tracking
    const mouse = { x: 0, y: 0 };
    const prevMouse = { x: 0, y: 0 };
    let currentWave = 0;
    const maxWaves = 100;
    
    // Create ripple geometry and material
    const rippleGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    const rippleMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        color: 0x6c63ff
    });
    
    // Create array of ripple meshes
    const ripples = [];
    for (let i = 0; i < maxWaves; i++) {
        const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial.clone());
        ripple.position.set(0, 0, 0);
        ripple.visible = false;
        scene.add(ripple);
        ripples.push(ripple);
    }
    
    // Shader uniforms
    const uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uRipples: { value: new Array(maxWaves).fill().map(() => new THREE.Vector4(0, 0, 0, 0)) }
    };
    
    // Vertex shader
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    // Fragment shader with ripple effect
    const fragmentShader = `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;
        uniform vec4 uRipples[100];
        
        varying vec2 vUv;
        
        void main() {
            vec2 uv = vUv;
            vec3 color = vec3(0.0);
            
            // Background gradient
            vec3 bg1 = vec3(0.1, 0.1, 0.2); // Dark blue
            vec3 bg2 = vec3(0.05, 0.05, 0.15); // Darker blue
            vec3 bgColor = mix(bg1, bg2, uv.y);
            
            // Add some animated particles
            for (int i = 0; i < 20; i++) {
                float fi = float(i);
                vec2 pos = vec2(
                    sin(uTime * 0.5 + fi * 0.5) * 0.3 + 0.5,
                    cos(uTime * 0.3 + fi * 0.7) * 0.3 + 0.5 + sin(uTime * 0.2 + fi) * 0.1
                );
                
                float dist = distance(uv, pos);
                float size = 0.002 + sin(uTime + fi) * 0.001;
                float alpha = smoothstep(size + 0.005, size, dist);
                
                vec3 particleColor = vec3(0.4, 0.3, 1.0) * alpha * 0.3;
                bgColor += particleColor;
            }
            
            // Add ripples
            for (int i = 0; i < 100; i++) {
                vec4 ripple = uRipples[i];
                if (ripple.w > 0.0) { // If ripple is active
                    vec2 center = ripple.xy;
                    float time = ripple.z;
                    float intensity = ripple.w;
                    
                    float dist = distance(uv, center);
                    float rippleRadius = time * 0.5;
                    
                    // Create ripple wave
                    float wave = sin((dist - rippleRadius) * 20.0) * exp(-dist * 5.0) * intensity;
                    wave *= smoothstep(0.0, 0.1, time) * smoothstep(1.0, 0.8, time);
                    
                    // Add color to ripple
                    vec3 rippleColor = vec3(0.4, 0.3, 1.0) * wave * 0.5;
                    bgColor += rippleColor;
                }
            }
            
            // Add subtle noise
            float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
            bgColor += noise * 0.02;
            
            gl_FragColor = vec4(bgColor, 1.0);
        }
    `;
    
    // Create background plane with shader
    const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
    const backgroundMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });
    
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    scene.add(backgroundMesh);
    
    // Mouse tracking
    const mouseMoveHandler = (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (event.clientX - rect.left) / rect.width;
        mouse.y = 1.0 - (event.clientY - rect.top) / rect.height;
        
        // Update mouse uniform
        uniforms.uMouse.value.set(mouse.x, mouse.y);
        
        // Create ripples on mouse movement
        if (Math.abs(mouse.x - prevMouse.x) > 0.01 || Math.abs(mouse.y - prevMouse.y) > 0.01) {
            createRipple(mouse.x, mouse.y);
            prevMouse.x = mouse.x;
            prevMouse.y = mouse.y;
        }
    };
    
    // Touch events for mobile
    const touchMoveHandler = (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouse.x = (touch.clientX - rect.left) / rect.width;
        mouse.y = 1.0 - (touch.clientY - rect.top) / rect.height;
        
        uniforms.uMouse.value.set(mouse.x, mouse.y);
        createRipple(mouse.x, mouse.y);
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouse.x = (touch.clientX - rect.left) / rect.width;
        mouse.y = 1.0 - (touch.clientY - rect.top) / rect.height;
        createRipple(mouse.x, mouse.y);
    });
    
    // Ripple management
    const activeRipples = [];
    
    const createRipple = (x, y) => {
        const ripple = {
            x: x,
            y: y,
            time: 0,
            intensity: 1.0,
            index: currentWave % maxWaves
        };
        
        activeRipples.push(ripple);
        currentWave++;
    };
    
    // Create automatic ripples
    setInterval(() => {
        if (Math.random() > 0.7) {
            createRipple(Math.random(), Math.random());
        }
    }, 2000);
    
    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        
        const time = performance.now() * 0.001;
        uniforms.uTime.value = time;
        
        // Update ripples
        activeRipples.forEach((ripple, index) => {
            ripple.time += 0.016; // ~60fps
            ripple.intensity *= 0.98; // Fade out
            
            // Update uniform
            uniforms.uRipples.value[ripple.index] = new THREE.Vector4(
                ripple.x,
                ripple.y,
                ripple.time,
                ripple.intensity
            );
            
            // Remove dead ripples
            if (ripple.intensity < 0.01 || ripple.time > 2.0) {
                uniforms.uRipples.value[ripple.index] = new THREE.Vector4(0, 0, 0, 0);
                activeRipples.splice(index, 1);
            }
        });
        
        renderer.render(scene, camera);
    };
    
    // Handle window resize
    const handleResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    animate();
};

// Card Carousel Implementation
const initCardCarousel = () => {
    const carousel = document.querySelector('.card-carousel');
    const cards = document.querySelectorAll('.carousel-card');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!carousel || cards.length === 0) return;
    
    let currentIndex = 0;
    const totalCards = cards.length;
    let autoplayInterval;
    let startX = 0;
    let isDragging = false;
    
    // Calculate dynamic heights for each card
    const calculateCardHeights = () => {
        let maxHeight = 650; // minimum height
        
        cards.forEach(card => {
            // Temporarily make card visible and reset transforms to measure content
            const originalTransform = card.style.transform;
            const originalOpacity = card.style.opacity;
            
            card.style.transform = 'none';
            card.style.opacity = '1';
            card.style.position = 'static';
            card.style.width = '420px';
            
            // Measure the natural height
            const naturalHeight = card.scrollHeight;
            
            // Apply constraints
            const finalHeight = Math.min(Math.max(naturalHeight, 650), 900);
            maxHeight = Math.max(maxHeight, finalHeight);
            
            // Restore original positioning and set final height
            card.style.position = 'absolute';
            card.style.height = `${finalHeight}px`;
            card.style.transform = originalTransform;
            card.style.opacity = originalOpacity;
        });
        
        // Adjust carousel container height to accommodate the tallest card
        carousel.style.minHeight = `${maxHeight + 80}px`;
    };
    
    // Initial setup with delay for smooth loading
    setTimeout(() => {
        calculateCardHeights();
        updateCarousel(0);
    }, 100);

    const updateCarousel = (index) => {
        const containerWidth = carousel.offsetWidth;
        const cardWidth = 420; // Updated to match new CSS
        const spacing = 90; // Increased spacing for larger cards
        
        // Update cards positioning and classes
        cards.forEach((card, i) => {
            card.classList.remove('active', 'prev', 'next');
            
            // Calculate position relative to active card
            const distance = i - index;
            const translateX = containerWidth / 2 + (distance * (cardWidth + spacing));
            
            // Set position with smooth transition
            card.style.left = `${translateX}px`;
            
            // Add appropriate class based on position
            if (i === index) {
                card.classList.add('active');
            } else if (i === index - 1 || (index === 0 && i === totalCards - 1)) {
                card.classList.add('prev');
            } else if (i === index + 1 || (index === totalCards - 1 && i === 0)) {
                card.classList.add('next');
            }
        });
        
        // Pagination dots removed as requested
    };
    
    // Go to next slide
    const nextSlide = () => {
        currentIndex = (currentIndex + 1) % totalCards;
        updateCarousel(currentIndex);
    };
    
    // Go to previous slide
    const prevSlide = () => {
        currentIndex = (currentIndex - 1 + totalCards) % totalCards;
        updateCarousel(currentIndex);
    };
    
    // Go to specific slide
    const goToSlide = (index) => {
        currentIndex = index;
        updateCarousel(currentIndex);
    };
    
    // Auto-play functionality
    const startAutoplay = () => {
        autoplayInterval = setInterval(nextSlide, 4000); // 4 second delay
    };
    
    const stopAutoplay = () => {
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
        }
    };
    
    // Event listeners
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            stopAutoplay();
            setTimeout(startAutoplay, 1000); // Restart autoplay after 1 second
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            stopAutoplay();
            setTimeout(startAutoplay, 1000); // Restart autoplay after 1 second
        });
    }
    
    // Pagination dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            stopAutoplay();
            setTimeout(startAutoplay, 1000); // Restart autoplay after 1 second
        });
    });
    
    // Pause autoplay on hover
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
            stopAutoplay();
            setTimeout(startAutoplay, 1000);
        } else if (e.key === 'ArrowRight') {
            nextSlide();
            stopAutoplay();
            setTimeout(startAutoplay, 1000);
        }
    });
    
    // Touch/swipe support for mobile
    let endX = 0;
    
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        stopAutoplay();
    });
    
    carousel.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        if (Math.abs(diffX) > 50) { // Minimum swipe distance
            if (diffX > 0) {
                nextSlide(); // Swipe left - next slide
            } else {
                prevSlide(); // Swipe right - previous slide
            }
        }
        
        setTimeout(startAutoplay, 1000);
    });
    
    // Initialize carousel
    updateCarousel(0);
    startAutoplay();
};

// Hover Expand Skills Component
const initHoverExpandSkills = () => {
    const container = document.getElementById('digitalSkills');
    const skillItems = document.querySelectorAll('.skill-expand-item');
    
    if (!container || skillItems.length === 0) return;
    
    let activeItem = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let isMobile = window.innerWidth <= 768;
    
    // Update mobile detection on resize
    const handleResize = () => {
        const wasMobile = isMobile;
        isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== isMobile) {
            // Reset active states when switching between mobile/desktop
            skillItems.forEach(item => item.classList.remove('active'));
            activeItem = null;
        }
    };
    
    // Handle mouse events for desktop
    const handleMouseEnter = (item) => {
        if (isMobile) return;
        
        skillItems.forEach(other => {
            if (other !== item) {
                other.classList.remove('active');
            }
        });
        
        item.classList.add('active');
        activeItem = item;
        
        // Add subtle animation to other items
        skillItems.forEach(other => {
            if (other !== item) {
                other.style.opacity = '0.7';
            }
        });
    };
    
    const handleMouseLeave = () => {
        if (isMobile) return;
        
        skillItems.forEach(item => {
            item.classList.remove('active');
            item.style.opacity = '1';
        });
        activeItem = null;
    };
    
    // Handle click/touch events for mobile
    const handleClick = (item, event) => {
        if (!isMobile) return;
        
        event.preventDefault();
        
        if (activeItem === item) {
            // If already active, deactivate
            item.classList.remove('active');
            activeItem = null;
        } else {
            // Deactivate all others and activate this one
            skillItems.forEach(other => other.classList.remove('active'));
            item.classList.add('active');
            activeItem = item;
        }
    };
    
    // Handle touch events for better mobile interaction
    const handleTouchStart = (event) => {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    };
    
    const handleTouchEnd = (item, event) => {
        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;
        
        const deltaX = Math.abs(touchEndX - touchStartX);
        const deltaY = Math.abs(touchEndY - touchStartY);
        
        // Only treat as tap if minimal movement
        if (deltaX < 10 && deltaY < 10) {
            handleClick(item, event);
        }
    };
    
    // Initialize event listeners
    skillItems.forEach(item => {
        // Mouse events for desktop
        item.addEventListener('mouseenter', () => handleMouseEnter(item));
        
        // Touch events for mobile
        item.addEventListener('touchstart', handleTouchStart, { passive: true });
        item.addEventListener('touchend', (e) => handleTouchEnd(item, e));
        
        // Click fallback
        item.addEventListener('click', (e) => handleClick(item, e));
        
        // Focus events for keyboard navigation
        item.addEventListener('focus', () => {
            if (!isMobile) handleMouseEnter(item);
        });
        
        // Make items focusable for accessibility
        item.setAttribute('tabindex', '0');
        
        // Add smooth staggered animation on load
        const index = Array.from(skillItems).indexOf(item);
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 100 + 200);
    });
    
    // Container mouse leave event
    container.addEventListener('mouseleave', handleMouseLeave);
    
    // Handle keyboard navigation
    container.addEventListener('keydown', (event) => {
        if (!activeItem) return;
        
        const currentIndex = Array.from(skillItems).indexOf(activeItem);
        let newIndex = currentIndex;
        
        switch (event.key) {
            case 'ArrowLeft':
                newIndex = currentIndex > 0 ? currentIndex - 1 : skillItems.length - 1;
                break;
            case 'ArrowRight':
                newIndex = currentIndex < skillItems.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Escape':
                handleMouseLeave();
                return;
        }
        
        if (newIndex !== currentIndex) {
            event.preventDefault();
            skillItems[newIndex].focus();
            handleMouseEnter(skillItems[newIndex]);
        }
    });
    
    // Window resize handler
    window.addEventListener('resize', handleResize);
    
    // Intersection Observer for performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Component is visible, enable interactions
                container.style.pointerEvents = 'auto';
            } else {
                // Component is not visible, disable interactions for performance
                container.style.pointerEvents = 'none';
                if (activeItem) handleMouseLeave();
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(container);
};

// Adaptive Navbar Functionality
const initAdaptiveNavbar = () => {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-links a');
    const logo = document.querySelector('.logo span');
    const hamburgerBars = document.querySelectorAll('.hamburger .bar');
    const downloadBtn = document.querySelector('.download-cv .btn');
    
    if (!navbar) return;
    
    // Define sections with their background types
    const sections = [
        { id: 'home', type: 'dark' },
        { id: 'about', type: 'dark' },
        { id: 'skills', type: 'dark' },
        { id: 'experience', type: 'dark' },
        { id: 'education', type: 'dark' },
        { id: 'projects', type: 'dark' },
        { id: 'contact', type: 'dark' }
    ];
    
    const updateNavbarStyle = (backgroundType) => {
        // Remove existing classes
        navbar.classList.remove('navbar-light', 'navbar-dark');
        
        if (backgroundType === 'light') {
            // Light background - use dark/blue text
            navbar.classList.add('navbar-light');
            
            // Update text colors
            if (logo) logo.style.color = 'var(--primary-accent)';
            navLinks.forEach(link => {
                link.style.color = 'var(--primary-accent)';
            });
            hamburgerBars.forEach(bar => {
                bar.style.background = 'var(--primary-accent)';
            });
            
            // Update navbar background
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.backdropFilter = 'blur(20px)';
            navbar.style.borderBottom = '1px solid rgba(63, 81, 181, 0.1)';
            
        } else {
            // Dark background - use white text with blue accents
            navbar.classList.add('navbar-dark');
            
            // Update text colors
            if (logo) logo.style.color = '#ffffff';
            navLinks.forEach(link => {
                link.style.color = '#ffffff';
            });
            hamburgerBars.forEach(bar => {
                bar.style.background = '#ffffff';
            });
            
            // Update navbar background
            navbar.style.background = 'rgba(0, 0, 0, 0.1)';
            navbar.style.backdropFilter = 'blur(20px)';
            navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        }
    };
    
    // Check current section and update navbar
    const checkCurrentSection = () => {
        const scrollPosition = window.scrollY + 100; // Offset for navbar height
        
        let currentSection = sections[0]; // Default to first section
        
        sections.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top + window.scrollY;
                const elementBottom = elementTop + rect.height;
                
                if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
                    currentSection = section;
                }
            }
        });
        
        updateNavbarStyle(currentSection.type);
    };
    
    // Initial check
    checkCurrentSection();
    
    // Update on scroll
    let ticking = false;
    const onScroll = () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                checkCurrentSection();
                ticking = false;
            });
            ticking = true;
        }
    };
    
    window.addEventListener('scroll', onScroll);
};

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initThreeJSBackground();
    initCardCarousel();
    initHoverExpandSkills();
    initAdaptiveNavbar();
});

// Navbar Scroll Effect
const initNavbarScroll = () => {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.section');
    
    window.addEventListener('scroll', () => {
        // Add shadow and reduce padding when scrolled
        if (window.scrollY > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Highlight active section in navbar
        let current = '';
        
        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach((link) => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
};

// Mobile Menu Toggle
const initMobileMenu = () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navLinksItems = document.querySelectorAll('.nav-links a');
    
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
    
    navLinksItems.forEach((item) => {
        item.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    });
};

// Loading Animation
const initLoadingAnimation = () => {
    const loader = document.querySelector('.loading-container');
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, 1500);
    });
};

// Contact Form Handling with FormSubmit.co service
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const successMessage = document.querySelector('.success-message');
    const submitBtn = document.getElementById('submit-btn');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Change button to loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending...';
            
            // Prepare form data for submission
            const formData = new FormData();
            formData.append('name', document.getElementById('name').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('subject', document.getElementById('subject').value);
            formData.append('message', document.getElementById('message').value);
            formData.append('_subject', 'New message from Portfolio Website');
            
            // Use fetch API to send the form data
            fetch('https://formsubmit.co/ajax/fayyazahmad481w@gmail.com', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json'
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Success:', data);
                
                // Reset form
                contactForm.reset();
                
                // Show success message with animation
                successMessage.style.display = 'flex';
                setTimeout(() => {
                    successMessage.classList.add('show');
                }, 10);
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Message';
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    successMessage.classList.remove('show');
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 500);
                }, 5000);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to send message. Please try again later.');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Message';
            });
        });
    }
});

// Smooth scrolling for anchor links
const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
};

// Animation on scroll
const initScrollAnimations = () => {
    const animateElements = () => {
        const elements = document.querySelectorAll('.skill-card, .project-card, .timeline-item');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 100) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Set initial styles
    const elements = document.querySelectorAll('.skill-card, .project-card, .timeline-item');
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(50px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Run on scroll
    window.addEventListener('scroll', animateElements);
    
    // Run once on page load
    animateElements();
};

// Initialize CV download functionality
const initCVDownload = () => {
    const downloadButton = document.getElementById('download-cv-btn');
    
    if (!downloadButton) {
        console.error('Download CV button not found');
        return;
    }
    
    downloadButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Show loading indicator
        const originalText = downloadButton.textContent;
        downloadButton.textContent = 'Generating...';
        downloadButton.disabled = true;
        
        // Create an iframe that loads the HTML resume
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'assets/Ahmad_Abdullah_Resume_ATS.html';
        document.body.appendChild(iframe);
        
        iframe.onload = function() {
            try {
                // Get the HTML content from the iframe
                const element = iframe.contentDocument.body;
                
                // Configure the PDF options
                const options = {
                    margin: 10,
                    filename: 'Ahmad_Abdullah_Resume_ATS.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                
                // Generate the PDF
                html2pdf().from(element).set(options).save().then(() => {
                    // Clean up and reset button
                    document.body.removeChild(iframe);
                    downloadButton.textContent = originalText;
                    downloadButton.disabled = false;
                });
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('There was an error generating the PDF. Please try again.');
                document.body.removeChild(iframe);
                downloadButton.textContent = originalText;
                downloadButton.disabled = false;
            }
        };
        
        iframe.onerror = function() {
            console.error('Error loading resume HTML');
            alert('Could not load the resume template. Please try again.');
            document.body.removeChild(iframe);
            downloadButton.textContent = originalText;
            downloadButton.disabled = false;
        };
    });
};

// Projects Slideshow Functionality
const initProjectsSlideshow = () => {
    console.log("Starting slideshow initialization");
    
    // Get all slides and dots
    const slides = document.querySelectorAll(".project-slide");
    const dots = document.querySelectorAll(".dot");
    const prevButton = document.querySelector('.prev');
    const nextButton = document.querySelector('.next');
    
    console.log(`Found ${slides.length} slides and ${dots.length} dots`);
    
    if (!slides.length || !dots.length) {
        console.error("Missing slides or dots, cannot initialize slideshow");
        return;
    }
    
    let currentSlideIndex = 0;
    let slideTimer = null;
    const slideInterval = 5000; // Time between automatic slide changes (5 seconds)
    
    // Function to show a specific slide
    const showSlide = (index) => {
        // Validate index
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        
        // Update current index
        currentSlideIndex = index;
        
        console.log(`Showing slide ${currentSlideIndex + 1} of ${slides.length}`);
        
        // Hide all slides and remove active classes
        slides.forEach((slide, i) => {
            slide.style.display = "none";
            slide.classList.remove("active", "fade");
            dots[i].classList.remove("active-dot");
        });
        
        // Show the current slide and add active class
        slides[currentSlideIndex].style.display = "block";
        slides[currentSlideIndex].classList.add("active", "fade");
        dots[currentSlideIndex].classList.add("active-dot");
        
        // Reset timer for automatic slideshow
        clearTimeout(slideTimer);
        startAutoSlide();
    };
    
    // Function to start automatic slideshow
    const startAutoSlide = () => {
        clearTimeout(slideTimer); // Clear any existing timer
        slideTimer = setTimeout(() => {
            console.log("Auto advancing to next slide");
            nextSlide();
        }, slideInterval);
        console.log("Auto slide timer started");
    };
    
    // Function to show the next slide
    const nextSlide = () => {
        showSlide(currentSlideIndex + 1);
    };
    
    // Function to show the previous slide
    const prevSlide = () => {
        showSlide(currentSlideIndex - 1);
    };
    
    // Add event listeners to navigation buttons
    if (prevButton) {
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Previous button clicked");
            prevSlide();
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Next button clicked");
            nextSlide();
        });
    }
    
    // Add event listeners to dots
    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            console.log(`Dot ${i + 1} clicked`);
            showSlide(i);
        });
    });
    
    // Initialize the slideshow with the first slide
    console.log("Showing first slide");
    showSlide(0);
    
    // Start automatic slideshow
    startAutoSlide();
    
    // For debugging - log all slides
    slides.forEach((slide, i) => {
        console.log(`Slide ${i + 1} HTML:`, slide.innerHTML.substring(0, 50) + '...');
    });
    
    // Make sure the slideshow is visible
    document.querySelector('.projects-slideshow-container').style.display = 'block';
};

// Initialize all functions when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initLoadingAnimation();
    initThreeJSBackground();
    initNavbarScroll();
    initMobileMenu();
    initContactForm();
    initSmoothScroll();
    initScrollAnimations();
    initCVDownload();
    initProjectsSlideshow(); // Initialize the projects slideshow
    
    // Hide loading screen if it takes too long
    setTimeout(() => {
        const loader = document.querySelector('.loading-container');
        if (loader.style.display !== 'none') {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }, 3000);
});
