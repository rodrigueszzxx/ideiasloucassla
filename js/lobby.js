/** Reproduz a entrada do fliperama enviado, mantendo o fluxo do Beyond Jump. */
(() => {
  const screen = document.getElementById('splash-screen');
  const button = document.getElementById('btn-splash-play');
  const cover = document.getElementById('entrance-cover');
  const glow = document.getElementById('entrance-glow');
  const logo = document.getElementById('entrance-logo');
  const links = document.querySelector('.entrance-links');
  const status = document.getElementById('entrance-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animations = [];

  const reset = () => {
    animations.forEach(animation => animation.cancel());
    animations = [];
    screen.classList.remove('entering');
    button.disabled = false;
    links.inert = false;
    screen.removeAttribute('aria-busy');
    status.textContent = '';
  };

  window.arcadeEntrance = {
    reset,
    async play() {
      screen.classList.add('entering');
      screen.setAttribute('aria-busy', 'true');
      button.disabled = true;
      links.inert = true;
      status.textContent = 'Entrando no fliperama…';
      if (reducedMotion.matches) return;

      // Os tempos e a origem do zoom seguem a abertura da referência.
      animations = [
        cover.animate([
          { transform: 'scale(1)', opacity: 1, offset: 0 },
          { transform: 'scale(4.5)', opacity: 1, offset: .65 },
          { transform: 'scale(4.5)', opacity: 0, offset: 1 },
        ], { duration: 1400, easing: 'cubic-bezier(.7,0,.9,.4)', fill: 'forwards' }),
        glow.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: 600, delay: 800, fill: 'forwards' }),
        logo.animate([
          { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        ], { duration: 900, delay: 1100, easing: 'cubic-bezier(.2,1.6,.4,1)', fill: 'forwards' }),
      ];
      await Promise.allSettled(animations.map(animation => animation.finished));
      // Hold the brand, then reveal the game's instructions. Animation timelines
      // survive background tabs and don't depend on gameplay timers.
      const hold = logo.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 600 });
      animations.push(hold);
      await hold.finished.catch(() => {});
      const fade = screen.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 700, fill: 'forwards' });
      animations.push(fade);
      await fade.finished.catch(() => {});
    },
  };
})();
