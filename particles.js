// Custom Particle System for Black & White Theme
(function() {
    'use strict';

    // Particle class
    class Particle {
        constructor(canvas) {
            this.canvas = canvas;
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = (Math.random() - 0.5) * 1;
            this.radius = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.3;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Wrap around screen
            if (this.x < 0) this.x = this.canvas.width;
            if (this.x > this.canvas.width) this.x = 0;
            if (this.y < 0) this.y = this.canvas.height;
            if (this.y > this.canvas.height) this.y = 0;
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
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
            this.particleCount = 80;
            this.maxDistance = 150;
            this.mouse = { x: null, y: null, radius: 150 };

            this.init();
            this.animate();
            this.setupEventListeners();
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
                this.particles.push(new Particle(this.canvas));
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
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
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
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.stroke();
                }
            });
        }

        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.particles.forEach(particle => {
                particle.update();
                particle.draw(this.ctx);
            });

            this.drawLines();
            this.connectMouse();

            requestAnimationFrame(() => this.animate());
        }

        setupEventListeners() {
            window.addEventListener('resize', () => {
                this.resizeCanvas();
                this.createParticles();
            });

            this.canvas.addEventListener('mousemove', (e) => {
                this.mouse.x = e.x;
                this.mouse.y = e.y;
            });

            this.canvas.addEventListener('mouseleave', () => {
                this.mouse.x = null;
                this.mouse.y = null;
            });

            this.canvas.addEventListener('click', () => {
                for (let i = 0; i < 4; i++) {
                    this.particles.push(new Particle(this.canvas));
                }
                // Remove excess particles
                if (this.particles.length > this.particleCount + 20) {
                    this.particles.splice(0, 4);
                }
            });
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
