export function initToTop() {
  const btn = document.querySelector('.to-top');
  const update = () => btn.classList.toggle('is-visible', scrollY > innerHeight);
  update();
  addEventListener('scroll', update, { passive: true });
  btn.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
}
