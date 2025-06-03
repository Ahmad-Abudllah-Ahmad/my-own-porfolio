// Three.js Background Animation
const initThreeJSBackground = () => {
    const canvas = document.getElementById('bg-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
    
    // Neural Network Configuration
    const networkConfig = {
        layers: [8, 14, 12, 8, 6], // Number of neurons in each layer
        neuronSize: 0.05,
        neuronColor: 0x6c63ff,
        activeNeuronColor: 0x00ffff,
        connectionColor: 0x8884ff,
        activeConnectionColor: 0x00ffff,
        layerDistance: 1.2,
        neuronSpacing: 0.4,
        signalSpeed: 0.02, // Slower signal speed
        neuronOpacity: 0.7,
        connectionOpacity: 0.25,
        activationThreshold: 0.65, // Threshold for neuron activation
        connectionProbability: 0.6 // Probability of creating connections between neurons
    };
    
    // Create objects to store our neurons and connections
    const neurons = [];
    const connections = [];
    const signals = [];
    const neuronStates = [];
    
    // Create neuron material
    const neuronMaterial = new THREE.MeshPhongMaterial({
        color: networkConfig.neuronColor,
        transparent: true,
        opacity: networkConfig.neuronOpacity,
        shininess: 80
    });
    
    // Create neuron geometry (reused for all neurons)
    const neuronGeometry = new THREE.SphereGeometry(networkConfig.neuronSize, 16, 16);
    
    // Generate neurons for each layer
    for (let layer = 0; layer < networkConfig.layers.length; layer++) {
        const neuronsInLayer = networkConfig.layers[layer];
        const layerNeurons = [];
        const layerStates = [];
        
        // Calculate total height of this layer
        const layerHeight = (neuronsInLayer - 1) * networkConfig.neuronSpacing;
        const startY = -layerHeight / 2;
        
        // Create neurons for this layer
        for (let i = 0; i < neuronsInLayer; i++) {
            const neuron = new THREE.Mesh(neuronGeometry, neuronMaterial.clone());
            neuron.position.x = layer * networkConfig.layerDistance - (networkConfig.layers.length * networkConfig.layerDistance) / 2.5;
            neuron.position.y = startY + (i * networkConfig.neuronSpacing);
            neuron.position.z = (Math.random() - 0.5) * 0.5;
            scene.add(neuron);
            layerNeurons.push(neuron);
            layerStates.push({
                active: false,
                activationTime: 0,
                initialColor: new THREE.Color(networkConfig.neuronColor),
                targetColor: new THREE.Color(networkConfig.activeNeuronColor)
            });
        }
        
        neurons.push(layerNeurons);
        neuronStates.push(layerStates);
    }
    
    // Material for connections
    const connectionMaterial = new THREE.LineBasicMaterial({
        color: networkConfig.connectionColor,
        transparent: true,
        opacity: networkConfig.connectionOpacity
    });
    
    // Create connections between layers
    for (let layer = 0; layer < networkConfig.layers.length - 1; layer++) {
        const layerConnections = [];
        
        for (let i = 0; i < neurons[layer].length; i++) {
            const neuronConnections = [];
            
            for (let j = 0; j < neurons[layer + 1].length; j++) {
                // Only create connections between some neurons for a more realistic look
                if (Math.random() < networkConfig.connectionProbability) {
                    const from = neurons[layer][i].position;
                    const to = neurons[layer + 1][j].position;
                    
                    // Create a slightly curved connection path for more visual interest
                    const midPoint = new THREE.Vector3(
                        (from.x + to.x) / 2,
                        (from.y + to.y) / 2,
                        (from.z + to.z) / 2 + (Math.random() - 0.5) * 0.2
                    );
                    
                    // Create a smooth curve for the connection
                    const curve = new THREE.QuadraticBezierCurve3(  
                        new THREE.Vector3(from.x, from.y, from.z),
                        midPoint,
                        new THREE.Vector3(to.x, to.y, to.z)
                    );
                    
                    // Create points along the curve
                    const curvePoints = curve.getPoints(10);
                    const points = new THREE.BufferGeometry().setFromPoints(curvePoints);
                    
                    const line = new THREE.Line(points, connectionMaterial.clone());
                    scene.add(line);
                    
                    neuronConnections.push({
                        line: line,
                        curve: curve,
                        targetNeuron: { layer: layer + 1, index: j },
                        active: false,
                        signal: null,
                        weight: Math.random() * 0.7 + 0.3 // Random connection weight (0.3-1.0)
                    });
                }
            };
            
            layerConnections.push(neuronConnections);
        }
        
        connections.push(layerConnections);
    }
    
    // Create a signal geometry/material to animate data flow
    const signalGeometry = new THREE.SphereGeometry(networkConfig.neuronSize * 0.4, 8, 8);
    const signalMaterial = new THREE.MeshBasicMaterial({
        color: networkConfig.activeNeuronColor,
        transparent: true,
        opacity: 0.8
    });
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0x8884ff, 0.3);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);
    
    // Camera position
    camera.position.z = 5;
    
    // Mouse movement effect
    let mouseX = 0;
    let mouseY = 0;
    
    const mouseMoveHandler = (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    
    window.addEventListener('mousemove', mouseMoveHandler);
    
    // Function to create a new signal in the network
    const createSignal = () => {
        // Pick multiple random neurons in the first layer to activate (more realistic)
        const neuronsToActivate = Math.floor(Math.random() * 3) + 1; // 1-3 neurons activate at once
        
        for (let i = 0; i < neuronsToActivate; i++) {
            const randomNeuronIndex = Math.floor(Math.random() * neurons[0].length);
            // Add slight delay between neuron activations
            setTimeout(() => {
                activateNeuron(0, randomNeuronIndex);
            }, i * 150); // Stagger the activations
        }
    };
    
    // Function to activate a neuron
    const activateNeuron = (layer, index) => {
        if (layer >= networkConfig.layers.length) return;
        
        const state = neuronStates[layer][index];
        // Only activate if not already active
        if (!state.active) {
            state.active = true;
            state.activationTime = Date.now();
            
            // If there are connections from this neuron, activate some of them (not all)
            if (layer < networkConfig.layers.length - 1 && connections[layer] && connections[layer][index]) {
                const neuronConnections = connections[layer][index];
                
                // Selective activation - not all connections fire (more like real neurons)
                neuronConnections.forEach(connection => {
                    // Only process the signal if the connection weight exceeds the activation threshold
                    if (connection.weight > networkConfig.activationThreshold) {
                        // Create signal with a small delay for more natural flow
                        setTimeout(() => {
                            const signal = new THREE.Mesh(signalGeometry, signalMaterial.clone());
                            const fromPos = neurons[layer][index].position;
                            signal.position.set(fromPos.x, fromPos.y, fromPos.z);
                            scene.add(signal);
                            
                            const targetNeuron = connection.targetNeuron;
                            
                            signals.push({
                                mesh: signal,
                                curve: connection.curve,
                                progress: 0,
                                speed: networkConfig.signalSpeed * (0.7 + Math.random() * 0.3), // Slight randomness in speed
                                targetNeuron: targetNeuron,
                                connection: connection
                            });
                        }, Math.random() * 100); // Random delay up to 100ms for more natural signal propagation
                    }
                });
            }
        }
    };
    
    // Create new signals regularly, but at a slower pace
    setInterval(createSignal, 1200); // Increased interval for slower overall activity
    
    const clock = new THREE.Clock();
    
    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();
        
        // Update neuron states with smoother transitions
        for (let layer = 0; layer < neuronStates.length; layer++) {
            for (let i = 0; i < neuronStates[layer].length; i++) {
                const state = neuronStates[layer][i];
                const neuron = neurons[layer][i];
                
                if (state.active) {
                    const timeSinceActivation = Date.now() - state.activationTime;
                    const activationDuration = 800; // Longer activation time for slower processing
                    
                    if (timeSinceActivation > activationDuration) {
                        // Smooth transition back to inactive state
                        state.active = false;
                        neuron.material.color.copy(state.initialColor);
                    } else {
                        // Smooth pulse effect using easing function
                        const progress = timeSinceActivation / activationDuration;
                        const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Smoother easing
                        
                        // More gradual color transition
                        neuron.material.color.copy(state.initialColor).lerp(state.targetColor, eased);
                        
                        // Smoother scale pulsing
                        const pulseAmount = Math.sin(progress * Math.PI);
                        const scale = 1 + 0.25 * pulseAmount;
                        neuron.scale.set(scale, scale, scale);
                        
                        // Increase brightness briefly during activation
                        neuron.material.emissive = new THREE.Color(state.targetColor).multiplyScalar(pulseAmount * 0.3);
                    }
                } else {
                    // Reset scale
                    neuron.scale.set(1, 1, 1);
                    neuron.material.emissive = new THREE.Color(0, 0, 0);
                    
                    // Add subtle, slower breathing effect to inactive neurons based on their position
                    // This creates a more organic, wave-like pattern through the network
                    const breatheSpeed = 0.8; // Slower breathing
                    const breatheOffset = layer * 0.5 + i * 0.2; // Offset based on position for wave effect
                    const breatheAmount = (Math.sin(time * breatheSpeed + breatheOffset) + 1) / 2 * 0.15;
                    
                    neuron.material.color.setRGB(
                        state.initialColor.r + breatheAmount,
                        state.initialColor.g + breatheAmount,
                        state.initialColor.b + breatheAmount
                    );
                }
            }
        }
        
        // Update signals with smoother path following along the curves
        for (let i = signals.length - 1; i >= 0; i--) {
            const signal = signals[i];
            signal.progress += signal.speed;
            
            if (signal.progress >= 1) {
                // Signal reached its destination
                scene.remove(signal.mesh);
                signals.splice(i, 1);
                
                // Only activate the target neuron with a probability based on connection weight
                // This simulates how real neurons don't always fire even with input
                if (Math.random() < signal.connection.weight) {
                    // Add a slight delay before activating the next neuron (more realistic)
                    setTimeout(() => {
                        activateNeuron(signal.targetNeuron.layer, signal.targetNeuron.index);
                    }, Math.random() * 50); // Small random delay
                }
            } else {
                // Update signal position using the curve for a smoother path
                if (signal.curve) {
                    const position = signal.curve.getPointAt(signal.progress);
                    signal.mesh.position.copy(position);
                }
                
                // Make the connection line glow as the signal passes with a smoother falloff
                if (signal.connection) {
                    // Create a smooth bell curve for the glow intensity
                    const intensity = Math.pow(Math.sin(signal.progress * Math.PI), 2) * 0.8;
                    
                    // Apply the glow effect to the line
                    signal.connection.line.material.color.set(networkConfig.connectionColor)
                        .lerp(new THREE.Color(networkConfig.activeConnectionColor), intensity);
                    signal.connection.line.material.opacity = networkConfig.connectionOpacity + intensity * 0.6;
                    
                    // Scale the signal slightly based on progress to create a pulse effect
                    const pulseScale = 1 + 0.3 * Math.sin(signal.progress * Math.PI * 2);
                    signal.mesh.scale.set(pulseScale, pulseScale, pulseScale);
                }
            }
        }
        
        // Gentle rotation of the entire network
        scene.rotation.y = Math.sin(time * 0.1) * 0.1;
        scene.rotation.x = Math.sin(time * 0.15) * 0.05;
        
        // Mouse influence
        scene.rotation.y += (mouseX * 0.01 - scene.rotation.y) * 0.02;
        scene.rotation.x += (-mouseY * 0.01 - scene.rotation.x) * 0.02;
        
        renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
};

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
