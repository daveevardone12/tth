document.addEventListener("DOMContentLoaded", function () {
    // Apply animations to content
    const contentElements = document.querySelectorAll('.content h1, .content p, .signup');
    contentElements.forEach((el) => {
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 500); // Delay the animation for a smooth entrance
    });
  });