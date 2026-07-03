export class StartScreen {
  readonly element: HTMLDivElement;

  constructor(onCamera: () => Promise<void>, onMouse: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'start-screen';
    this.element.innerHTML = `
      <div class="start-card">
        <div class="start-buttons">
          <button class="btn-primary" data-action="camera">Camera</button>
          <button class="btn-ghost" data-action="mouse">Mouse</button>
        </div>
        <p class="start-note" data-role="status"></p>
      </div>
    `;

    const status = this.element.querySelector<HTMLParagraphElement>('[data-role="status"]')!;
    const camBtn = this.element.querySelector<HTMLButtonElement>('[data-action="camera"]')!;
    const mouseBtn = this.element.querySelector<HTMLButtonElement>('[data-action="mouse"]')!;

    camBtn.addEventListener('click', async () => {
      camBtn.disabled = true;
      status.textContent = 'Loading hand tracking…';
      try {
        await onCamera();
        this.hide();
      } catch (err) {
        camBtn.disabled = false;
        status.textContent =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. You can still play with the mouse.'
            : 'Hand tracking failed to load. You can still play with the mouse.';
      }
    });
    mouseBtn.addEventListener('click', () => {
      onMouse();
      this.hide();
    });
  }

  show(): void {
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }
}
