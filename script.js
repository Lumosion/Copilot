// Food Discovery App JavaScript

// Data storage
let foods = [
    {
        id: 1,
        name: '川味火锅',
        shop: '老四川火锅店',
        price: 80,
        rating: 5,
        distance: 500,
        category: '中餐',
        emoji: '🍲'
    },
    {
        id: 2,
        name: '兰州拉面',
        shop: '马子禄牛肉面',
        price: 25,
        rating: 4,
        distance: 300,
        category: '中餐',
        emoji: '🍜'
    },
    {
        id: 3,
        name: '寿司拼盘',
        shop: '禾绿回转寿司',
        price: 120,
        rating: 5,
        distance: 800,
        category: '日料',
        emoji: '🍣'
    },
    {
        id: 4,
        name: '意大利披萨',
        shop: 'Papa John\'s',
        price: 60,
        rating: 4,
        distance: 600,
        category: '西餐',
        emoji: '🍕'
    },
    {
        id: 5,
        name: '韩式烤肉',
        shop: '权金城烤肉',
        price: 100,
        rating: 5,
        distance: 1000,
        category: '韩餐',
        emoji: '🥩'
    },
    {
        id: 6,
        name: '汉堡套餐',
        shop: '麦当劳',
        price: 35,
        rating: 3,
        distance: 200,
        category: '快餐',
        emoji: '🍔'
    }
];

// Load foods from localStorage if available
const loadFoods = () => {
    const savedFoods = localStorage.getItem('foods');
    if (savedFoods) {
        foods = JSON.parse(savedFoods);
    }
};

// Save foods to localStorage
const saveFoods = () => {
    localStorage.setItem('foods', JSON.stringify(foods));
};

// Calculate walking time (assume 80 meters per minute)
const calculateWalkTime = (distance) => {
    const minutes = Math.ceil(distance / 80);
    return `${minutes}分钟`;
};

// Create food card HTML
const createFoodCard = (food) => {
    return `
        <div class="food-card" data-rating="${food.rating}">
            <div class="food-image">${food.emoji}</div>
            <div class="food-info">
                <div class="food-header">
                    <div>
                        <h3 class="food-name">${food.name}</h3>
                        <p class="food-shop">${food.shop}</p>
                    </div>
                    <div class="food-price">¥${food.price}</div>
                </div>
                <div class="food-rating">${'⭐'.repeat(food.rating)}</div>
                <div class="food-details">
                    <div class="detail-item">
                        <span class="detail-label">距离</span>
                        <span class="detail-value">${food.distance}m</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">步行</span>
                        <span class="detail-value">${calculateWalkTime(food.distance)}</span>
                    </div>
                </div>
                <span class="food-category">${food.category}</span>
            </div>
        </div>
    `;
};

// Display foods
const displayFoods = (filter = 'all') => {
    const foodsGrid = document.getElementById('foodsGrid');
    if (!foodsGrid) return;
    
    let filteredFoods = foods;
    if (filter !== 'all') {
        filteredFoods = foods.filter(food => food.rating === parseInt(filter));
    }
    
    if (filteredFoods.length === 0) {
        foodsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #999;">暂无美食数据，快去添加吧！</p>';
        return;
    }
    
    foodsGrid.innerHTML = filteredFoods.map(food => createFoodCard(food)).join('');
};

// Food emojis for random selection
const foodEmojis = ['🍕', '🍔', '🍟', '🍗', '🍖', '🌭', '🥪', '🌮', '🌯', '🥙', 
                    '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🥘', '🍝'];

// Handle form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    
    const formData = {
        id: Date.now(),
        name: document.getElementById('foodName').value,
        shop: document.getElementById('shopName').value,
        price: parseInt(document.getElementById('price').value),
        rating: parseInt(document.getElementById('rating').value),
        distance: parseInt(document.getElementById('distance').value),
        category: document.getElementById('category').value,
        emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)]
    };
    
    foods.push(formData);
    saveFoods();
    
    // Reset form
    document.getElementById('foodForm').reset();
    
    // Show success message
    alert('美食添加成功！');
    
    // Refresh display
    displayFoods();
    
    // Scroll to foods section
    document.getElementById('foods').scrollIntoView({ behavior: 'smooth' });
};

// Filter functionality
const setupFilters = () => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            displayFoods(filter);
        });
    });
};

// Spinning Wheel Implementation
class SpinningWheel {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.spinning = false;
        this.currentRotation = 0;
        this.targetRotation = 0;
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
        
        this.drawWheel();
    }
    
    drawWheel() {
        if (!this.canvas) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (foods.length === 0) {
            this.ctx.fillStyle = '#666';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('请先添加美食', centerX, centerY);
            return;
        }
        
        const sliceAngle = (2 * Math.PI) / foods.length;
        
        foods.forEach((food, index) => {
            const startAngle = this.currentRotation + index * sliceAngle;
            const endAngle = startAngle + sliceAngle;
            
            // Draw slice
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = this.colors[index % this.colors.length];
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Draw text
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(startAngle + sliceAngle / 2);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText(food.name, radius * 0.65, 0);
            this.ctx.font = '24px Arial';
            this.ctx.fillText(food.emoji, radius * 0.35, 5);
            this.ctx.restore();
        });
        
        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw pointer at top
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, 10);
        this.ctx.lineTo(centerX - 15, 40);
        this.ctx.lineTo(centerX + 15, 40);
        this.ctx.closePath();
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    spin() {
        if (this.spinning || foods.length === 0) return;
        
        this.spinning = true;
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) spinBtn.disabled = true;
        
        // Random rotation (5-8 full spins plus random offset)
        const spins = 5 + Math.random() * 3;
        const randomOffset = Math.random() * Math.PI * 2;
        this.targetRotation = this.currentRotation + spins * Math.PI * 2 + randomOffset;
        
        const duration = 3000; // 3 seconds
        const startTime = Date.now();
        const startRotation = this.currentRotation;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            this.currentRotation = startRotation + (this.targetRotation - startRotation) * easeOut;
            this.drawWheel();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.spinning = false;
                if (spinBtn) spinBtn.disabled = false;
                this.showResult();
            }
        };
        
        animate();
    }
    
    showResult() {
        const normalizedRotation = this.currentRotation % (2 * Math.PI);
        const sliceAngle = (2 * Math.PI) / foods.length;
        
        // The pointer is at the top (0 radians), so we need to find which slice is there
        // Account for rotation direction
        let selectedIndex = Math.floor(((2 * Math.PI - normalizedRotation) % (2 * Math.PI)) / sliceAngle);
        selectedIndex = selectedIndex % foods.length;
        
        const selectedFood = foods[selectedIndex];
        const resultDiv = document.getElementById('wheelResult');
        
        if (resultDiv && selectedFood) {
            resultDiv.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">${selectedFood.emoji}</div>
                <div>今天就吃：${selectedFood.name}</div>
                <div style="font-size: 16px; margin-top: 10px;">📍 ${selectedFood.shop} - ¥${selectedFood.price}</div>
            `;
        }
    }
}

// Initialize wheel
let wheel = null;

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navigation scroll effect
let lastScroll = 0;
const nav = document.querySelector('.main-nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
        nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
    } else {
        nav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load saved foods
    loadFoods();
    
    // Display foods
    displayFoods();
    
    // Setup filters
    setupFilters();
    
    // Setup form
    const foodForm = document.getElementById('foodForm');
    if (foodForm) {
        foodForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Initialize wheel
    wheel = new SpinningWheel('wheelCanvas');
    
    // Setup spin button
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) {
        spinBtn.addEventListener('click', () => {
            if (foods.length === 0) {
                alert('请先添加美食再转转盘！');
                return;
            }
            wheel.spin();
        });
    }
});

// Update footer year
const updateFooterYear = () => {
    const yearElements = document.querySelectorAll('.footer-copyright p');
    const currentYear = new Date().getFullYear();
    yearElements.forEach(el => {
        el.innerHTML = el.innerHTML.replace(/2026/g, currentYear);
    });
};

updateFooterYear();

console.log('Food Discovery App loaded successfully!');
