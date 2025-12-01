/**
 * P-LikeMe Learning Project
 * Main JavaScript file
 */

// Log that JS is loaded (for learning/debugging)
console.log('P-LikeMe learning project loaded');

/**
 * Hero Carousel
 * Auto-switches images every 3 seconds
 */
(function() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');

    // Only run carousel code if slides exist (homepage only)
    if (slides.length === 0) return;

    let currentIndex = 0;
    const intervalTime = 3000; // 3 seconds

    // Function to show a specific slide
    function showSlide(index) {
        // Remove active class from all slides and dots
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        // Add active class to current slide and dot
        slides[index].classList.add('active');
        dots[index].classList.add('active');
    }

    // Function to go to next slide
    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
    }

    // Auto-advance slides every 3 seconds
    let autoSlide = setInterval(nextSlide, intervalTime);

    // Click on dots to navigate
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentIndex = index;
            showSlide(currentIndex);

            // Reset the auto-slide timer when user clicks
            clearInterval(autoSlide);
            autoSlide = setInterval(nextSlide, intervalTime);
        });
    });

    // Pause on hover (optional, better UX)
    const carousel = document.querySelector('.hero-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', () => {
            clearInterval(autoSlide);
        });

        carousel.addEventListener('mouseleave', () => {
            autoSlide = setInterval(nextSlide, intervalTime);
        });
    }
})();
