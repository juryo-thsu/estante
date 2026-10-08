// Espaço usado, cota e persistência reais do armazenamento do app (navigator.storage).

import { estado, definirArmazenamento } from './store.js';

const storage = navigator.storage;

export async function atualizarArmazenamento() {
  if (!storage?.estimate) {
    definirArmazenamento({ suportado: false });
    return;
  }
  try {
    const [{ usage = 0, quota = 0 }, persistente] = await Promise.all([
      storage.estimate(),
      storage.persisted ? storage.persisted() : Promise.resolve(null),
    ]);
    definirArmazenamento({ suportado: true, usado: usage, cota: quota, persistente });
  } catch (erro) {
    console.error(erro);
    definirArmazenamento({ suportado: false });
  }
}

let jaPediuSozinho = false;

/**
 * Depois da primeira importação o app pede persistência sozinho, uma vez por abertura:
 * nem o Safari nem o Chrome mostram pergunta, então não precisa de botão.
 */
export async function garantirPersistencia() {
  if (jaPediuSozinho || !storage?.persist || estado.armazenamento.persistente) return;
  if (!estado.volumes.some((v) => v.temArquivo)) return;
  jaPediuSozinho = true;
  try {
    if (!(await storage.persisted())) await storage.persist();
  } catch (erro) {
    console.error(erro);
  }
  atualizarArmazenamento();
}
