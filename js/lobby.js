/** Scene previews are decorative; they do not change the selected game character. */
(() => {
  const display = document.getElementById('arcade-display');
  const names = { dungeon: 'Masmorra', pokemon: 'Pokémon', forest: 'Floresta' };
  document.querySelectorAll('[data-scene]').forEach((button) => {
    button.addEventListener('click', () => {
      display.dataset.world = button.dataset.scene;
      document.getElementById('world-name').textContent = names[button.dataset.scene];
      document.querySelectorAll('[data-scene]').forEach((item) => {
        item.setAttribute('aria-pressed', String(item === button));
      });
    });
  });
})();
