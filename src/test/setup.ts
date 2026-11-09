import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Só no ambiente jsdom: desmonta os componentes e limpa o storage entre testes.
if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });
  // jsdom não implementa estes métodos de rolagem.
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.scrollTo ??= () => {};
  // jsdom não tem Blob.text(); o import de JSON usa.
  Blob.prototype.text ??= function (this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsText(this);
    });
  };
}
