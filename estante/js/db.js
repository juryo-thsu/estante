// IndexedDB do app: "volumes" guarda os metadados (com progresso e miniatura da capa),
// "arquivos" guarda o CBZ/ZIP original, na mesma chave do volume.
// Ficam separados para que remover o arquivo não toque no progresso.

const NOME = 'estante';
const VERSAO = 1;

let conexao = null;

function abrir() {
  conexao ??= new Promise((ok, falha) => {
    const pedido = indexedDB.open(NOME, VERSAO);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains('volumes')) db.createObjectStore('volumes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('arquivos')) db.createObjectStore('arquivos');
    };
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => {
      conexao = null;
      falha(pedido.error);
    };
  });
  return conexao;
}

/**
 * Roda `fn` numa transação e só resolve quando ela termina de gravar.
 * Esperar o `complete` (e não o sucesso do pedido) é o que garante que uma falta de
 * espaço (QuotaExceededError) chegue aqui como erro, e não depois.
 */
async function emTransacao(lojas, modo, fn) {
  const db = await abrir();
  return new Promise((ok, falha) => {
    const transacao = db.transaction(lojas, modo);
    const pedido = fn(transacao);
    transacao.oncomplete = () => ok(pedido?.result);
    transacao.onabort = () => falha(transacao.error || new DOMException('Transação cancelada', 'AbortError'));
  });
}

export function lerVolumes() {
  return emTransacao('volumes', 'readonly', (t) => t.objectStore('volumes').getAll());
}

export function salvarVolume(registro) {
  return emTransacao('volumes', 'readwrite', (t) => t.objectStore('volumes').put(registro));
}

/** Volume e arquivo na mesma transação: se faltar espaço, nenhum dos dois fica pela metade. */
export function salvarComArquivo(registro, arquivo) {
  return emTransacao(['volumes', 'arquivos'], 'readwrite', (t) => {
    t.objectStore('arquivos').put(arquivo, registro.id);
    t.objectStore('volumes').put(registro);
  });
}

export function lerArquivo(id) {
  return emTransacao('arquivos', 'readonly', (t) => t.objectStore('arquivos').get(id));
}

/** Apaga só o arquivo e grava o registro atualizado (sem arquivo, com o progresso). */
export function removerArquivo(registro) {
  return emTransacao(['volumes', 'arquivos'], 'readwrite', (t) => {
    t.objectStore('arquivos').delete(registro.id);
    t.objectStore('volumes').put(registro);
  });
}
