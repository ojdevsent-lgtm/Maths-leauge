const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.documentElement.dataset.reducedMotion = String(prefersReducedMotion);

// V2 application entry point. Feature modules will be registered here as they are built.
console.info('Maths League V2 foundation loaded');
