// Navbar scroll effect
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Intersection Observer for elegant scroll animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Stop observing once visible for performance
        }
    });
}, observerOptions);

// Observe all standard hidden elements
document.querySelectorAll('.hidden').forEach(section => {
    observer.observe(section);
});

// Smooth scroll implementation for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if(targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            // Update active state in nav
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
            });
            this.classList.add('active');
            
            // Scroll to the element
            window.scrollTo({
                top: targetElement.offsetTop,
                behavior: 'smooth'
            });
            
            // Update URL hash without jumping
            history.pushState(null, null, targetId);
        }
    });
});

// RSVP Form Submission Handling (Simulated)
const rsvpForm = document.getElementById('rsvp-form');
const formSuccess = document.getElementById('form-success');

if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Give immediate visual feedback
        const submitBtn = rsvpForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        // Simulate a network request delay
        setTimeout(() => {
            // Initiate fade out of the form
            rsvpForm.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            rsvpForm.style.opacity = '0';
            rsvpForm.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                // Ensure form is hidden from flow
                rsvpForm.style.display = 'none';
                
                // Show success message smoothly
                formSuccess.style.display = 'block';
                // Trigger reflow to ensure transition works
                void formSuccess.offsetWidth; 
                formSuccess.classList.remove('hidden-state');
                formSuccess.classList.add('fade-in');
            }, 600);
            
        }, 1200);
    });
    
    // Toggle Guest/Dietary fields based on attendance radio buttons
    const attendingRadios = document.querySelectorAll('input[name="attending"]');
    const guestGroup = document.getElementById('guest-count-group');
    const dietaryGroup = document.getElementById('dietary-group');
    
    attendingRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'no') {
                guestGroup.style.display = 'none';
                dietaryGroup.style.display = 'none';
                
                // Remove required flags if declining
                const guestSelect = document.getElementById('guests');
                if(guestSelect) guestSelect.removeAttribute('required');
            } else {
                // Restore fields with a clean fade-in
                guestGroup.style.display = 'block';
                dietaryGroup.style.display = 'block';
                guestGroup.style.animation = 'fadeIn 0.5s ease-out';
                dietaryGroup.style.animation = 'fadeIn 0.5s ease-out';
                
                const guestSelect = document.getElementById('guests');
                if(guestSelect) guestSelect.setAttribute('required', 'true');
            }
        });
    });
}
