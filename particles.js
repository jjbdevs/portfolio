(function () {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');

    const COLOR = '180, 210, 255';
    const COUNT = window.innerWidth < 768 ? 70 : 160;

    // Orbital physics
    const ORBIT_RADIUS  = 140;   // target ring radius in px
    const SPRING_K      = 0.0004; // radial pull toward orbit (slow)
    const ANGULAR_SPEED = 0.008;  // ring rotation speed (rad/frame)
    const SPREAD_K      = 0.04;   // how strongly to enforce even spacing
    const DAMPING       = 0.94;
    const SPEED_CAP     = 2.5;

    // Background drift
    const BASE_SPEED    = 0.3;
    const CONNECT_DIST  = 120;

    let W, H;
    let globalAngle = 0;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
    });

    class Particle {
        constructor(index) {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.vx = (Math.random() - 0.5) * BASE_SPEED * 2;
            this.vy = (Math.random() - 0.5) * BASE_SPEED * 2;
            this.r = Math.random() * 1.4 + 0.4;
            this.alpha = Math.random() * 0.35 + 0.1;
            // Each particle owns a fixed evenly-spaced slot on the ring
            this.slotAngle = (index / COUNT) * Math.PI * 2;
        }

        update() {
            if (mouse.x !== -9999) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0.5) {
                    // Radial unit vector pointing away from mouse
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Clockwise tangential: rotate (nx, ny) 90 degrees CW = (ny, -nx)
                    const tx = ny;
                    const ty = -nx;

                    // Radial spring toward orbit ring
                    const radialForce = -(dist - ORBIT_RADIUS) * SPRING_K;
                    this.vx += nx * radialForce;
                    this.vy += ny * radialForce;

                    // Angular spreading: push toward this particle's evenly-spaced slot
                    const currentAngle = Math.atan2(dy, dx);
                    const desiredAngle = this.slotAngle + globalAngle;
                    let dAngle = desiredAngle - currentAngle;
                    // Wrap to [-π, π]
                    if (dAngle > Math.PI)  dAngle -= Math.PI * 2;
                    if (dAngle < -Math.PI) dAngle += Math.PI * 2;
                    // Blend uniform spin with slot correction
                    const tangentialForce = ANGULAR_SPEED * 6 + SPREAD_K * dAngle;
                    this.vx += tx * tangentialForce;
                    this.vy += ty * tangentialForce;
                }
            }

            this.vx *= DAMPING;
            this.vy *= DAMPING;

            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > SPEED_CAP) {
                this.vx = (this.vx / speed) * SPEED_CAP;
                this.vy = (this.vy / speed) * SPEED_CAP;
            }

            this.x += this.vx;
            this.y += this.vy;

            if (this.x < -5) this.x = W + 5;
            if (this.x > W + 5) this.x = -5;
            if (this.y < -5) this.y = H + 5;
            if (this.y > H + 5) this.y = -5;
        }

        draw() {
            let displayAlpha = this.alpha;
            let displayR = this.r;

            // Glow boost for particles sitting on the ring
            if (mouse.x !== -9999) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const distToRing = Math.abs(dist - ORBIT_RADIUS);
                const ringProximity = Math.max(0, 1 - distToRing / 28);
                displayAlpha = Math.min(0.95, this.alpha + ringProximity * 0.55);
                displayR = this.r + ringProximity * 0.9;
            }

            ctx.beginPath();
            ctx.arc(this.x, this.y, displayR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${COLOR}, ${displayAlpha})`;
            ctx.fill();
        }
    }

    const particles = Array.from({ length: COUNT }, (_, i) => new Particle(i));

    function loop() {
        ctx.clearRect(0, 0, W, H);
        globalAngle += ANGULAR_SPEED;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < CONNECT_DIST) {
                    const a = (1 - d / CONNECT_DIST) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${COLOR}, ${a})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        for (const p of particles) {
            p.update();
            p.draw();
        }

        requestAnimationFrame(loop);
    }

    loop();
})();
