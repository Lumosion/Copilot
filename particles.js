// Custom Particle System for Black & White Theme
(function() {
    'use strict';

    // Particle class
    class Particle {
        constructor(canvas, isTextParticle = false) {
            this.canvas = canvas;
            this.isTextParticle = isTextParticle;
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.baseX = this.x;
            this.baseY = this.y;
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = (Math.random() - 0.5) * 1;
            this.radius = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.3;
            this.attractionStrength = isTextParticle ? 0.05 : 0.03;
            this.returnSpeed = isTextParticle ? 0.05 : 0.01;
        }

        update(mouse) {
            // Mouse attraction effect
            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const angle = Math.atan2(dy, dx);
                    this.vx += Math.cos(angle) * force * this.attractionStrength;
                    this.vy += Math.sin(angle) * force * this.attractionStrength;
                }
            }

            // Apply velocity with damping
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.95;
            this.vy *= 0.95;

            // Gentle drift back to original position
            const driftX = (this.baseX - this.x) * this.returnSpeed;
            const driftY = (this.baseY - this.y) * this.returnSpeed;
            this.vx += driftX;
            this.vy += driftY;

            // For non-text particles, wrap around screen and update base position
            if (!this.isTextParticle) {
                if (this.x < 0) {
                    this.x = this.canvas.width;
                    this.baseX = this.x;
                }
                if (this.x > this.canvas.width) {
                    this.x = 0;
                    this.baseX = this.x;
                }
                if (this.y < 0) {
                    this.y = this.canvas.height;
                    this.baseY = this.y;
                }
                if (this.y > this.canvas.height) {
                    this.y = 0;
                    this.baseY = this.y;
                }
            }
        }

        draw(ctx, time) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            
            // Add color variation for particles
            const hue = this.isTextParticle ? 190 : (180 + Math.sin(time / 1000 + this.x) * 30);
            const saturation = this.isTextParticle ? 100 : 80;
            const lightness = this.isTextParticle ? 70 : 60;
            
            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${this.opacity})`;
            ctx.fill();
        }
    }

    // ParticleSystem class
    class ParticleSystem {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                console.error('Canvas element not found');
                return;
            }
            
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.textParticles = [];
            this.particleCount = 80;
            this.maxDistance = 150;
            this.mouse = { x: null, y: null, radius: 150 };
            this.clickEffect = { active: false, x: 0, y: 0, radius: 0, maxRadius: 100, expanding: true };
            this.currentTime = Date.now();

            this.init();
            this.animate();
            this.setupEventListeners();
            this.createTextParticles();
        }

        init() {
            this.resizeCanvas();
            this.createParticles();
        }

        resizeCanvas() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        createParticles() {
            this.particles = [];
            for (let i = 0; i < this.particleCount; i++) {
                this.particles.push(new Particle(this.canvas, false));
            }
        }

        createTextParticles() {
            // Create particles for the hero title
            const text = '开发者';
            const fontSize = 60;
            const x = this.canvas.width / 2;
            const y = this.canvas.height / 2 - 100;

            // Create temporary canvas to get text pixels
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            
            tempCtx.font = `bold ${fontSize}px 'Orbitron', sans-serif`;
            tempCtx.fillStyle = 'white';
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            tempCtx.fillText(text, x, y);

            // Get pixel data
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const pixels = imageData.data;

            // Sample pixels to create particles
            const particleDensity = 3; // Lower = more particles
            for (let y = 0; y < tempCanvas.height; y += particleDensity) {
                for (let x = 0; x < tempCanvas.width; x += particleDensity) {
                    const index = (y * tempCanvas.width + x) * 4;
                    const alpha = pixels[index + 3];
                    
                    if (alpha > 128) { // If pixel is visible
                        const particle = new Particle(this.canvas, true);
                        particle.x = x;
                        particle.y = y;
                        particle.baseX = x;
                        particle.baseY = y;
                        particle.radius = 1.5;
                        particle.opacity = 0.8;
                        this.textParticles.push(particle);
                    }
                }
            }
        }

        drawLines() {
            for (let i = 0; i < this.particles.length; i++) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    const dx = this.particles[i].x - this.particles[j].x;
                    const dy = this.particles[i].y - this.particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < this.maxDistance) {
                        const opacity = (1 - distance / this.maxDistance) * 0.4;
                        const hue = 190 + (distance / this.maxDistance) * 30;
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${opacity})`;
                        this.ctx.lineWidth = 1;
                        this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                        this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                        this.ctx.stroke();
                    }
                }
            }
        }

        connectMouse() {
            if (this.mouse.x === null || this.mouse.y === null) return;

            this.particles.forEach(particle => {
                const dx = particle.x - this.mouse.x;
                const dy = particle.y - this.mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.mouse.radius) {
                    const opacity = (1 - distance / this.mouse.radius) * 0.8;
                    const hue = 180 + (1 - distance / this.mouse.radius) * 60;
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${opacity})`;
                    this.ctx.lineWidth = 1.5;
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.stroke();
                }
            });
        }

        animate() {
            this.currentTime = Date.now();
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw text particles first (background layer)
            this.textParticles.forEach(particle => {
                particle.update(this.mouse);
                particle.draw(this.ctx, this.currentTime);
            });

            // Draw regular particles and effects (foreground layer)
            this.particles.forEach(particle => {
                particle.update(this.mouse);
                particle.draw(this.ctx, this.currentTime);
            });

            this.drawLines();
            this.connectMouse();
            this.drawClickEffect();

            requestAnimationFrame(() => this.animate());
        }

        drawClickEffect() {
            if (!this.clickEffect.active) return;

            // Update click effect
            if (this.clickEffect.expanding) {
                this.clickEffect.radius += 3;
                if (this.clickEffect.radius >= this.clickEffect.maxRadius) {
                    this.clickEffect.expanding = false;
                }
            } else {
                this.clickEffect.radius -= 5;
                if (this.clickEffect.radius <= 0) {
                    this.clickEffect.active = false;
                }
            }

            // Draw ripple effect with cyan/purple gradient
            const alpha = 1 - (this.clickEffect.radius / this.clickEffect.maxRadius);
            const hue1 = 180;
            const hue2 = 270;
            
            // Outer ripple
            this.ctx.beginPath();
            this.ctx.arc(this.clickEffect.x, this.clickEffect.y, this.clickEffect.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `hsla(${hue1}, 100%, 60%, ${alpha * 0.6})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Inner ripple with different color
            if (this.clickEffect.radius > 20) {
                this.ctx.beginPath();
                this.ctx.arc(this.clickEffect.x, this.clickEffect.y, this.clickEffect.radius - 20, 0, Math.PI * 2);
                this.ctx.strokeStyle = `hsla(${hue2}, 100%, 60%, ${alpha * 0.4})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }

        setupEventListeners() {
            window.addEventListener('resize', () => {
                this.resizeCanvas();
                this.createParticles();
                this.createTextParticles();
            });

            // Mouse events
            this.canvas.addEventListener('mousemove', (e) => {
                this.mouse.x = e.x;
                this.mouse.y = e.y;
            });

            this.canvas.addEventListener('mouseleave', () => {
                this.mouse.x = null;
                this.mouse.y = null;
            });

            this.canvas.addEventListener('click', (e) => {
                this.triggerClickEffect(e.x, e.y);
            });

            // Touch events for mobile support
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.x = touch.clientX - rect.left;
                this.mouse.y = touch.clientY - rect.top;
                this.triggerClickEffect(this.mouse.x, this.mouse.y);
            }, { passive: false });

            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.x = touch.clientX - rect.left;
                this.mouse.y = touch.clientY - rect.top;
            }, { passive: false });

            this.canvas.addEventListener('touchend', () => {
                this.mouse.x = null;
                this.mouse.y = null;
            });
        }

        triggerClickEffect(x, y) {
            this.clickEffect = {
                active: true,
                x: x,
                y: y,
                radius: 0,
                maxRadius: 100,
                expanding: true
            };

            // Create burst of particles at click location
            for (let i = 0; i < 5; i++) {
                this.particles.push(new Particle(this.canvas));
                const lastParticle = this.particles[this.particles.length - 1];
                lastParticle.x = x;
                lastParticle.y = y;
                lastParticle.baseX = x;
                lastParticle.baseY = y;
                const angle = (Math.PI * 2 * i) / 5;
                lastParticle.vx = Math.cos(angle) * 3;
                lastParticle.vy = Math.sin(angle) * 3;
            }

            // Remove excess particles
            if (this.particles.length > this.particleCount + 30) {
                this.particles.splice(0, 5);
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new ParticleSystem('particles-js');
        });
    } else {
        new ParticleSystem('particles-js');
    }
})();
