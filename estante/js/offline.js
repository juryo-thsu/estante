// Registro do service worker e o estado do "Pronto para usar offline".

import { definirOffline } from './store.js';

// No computador (Live Server) o service worker fica de fora: com ele, cada recarga
// mostraria a versão guardada e não a que acabou de ser editada.
// Para testar o offline localmente, abra com ?offline no endereço.
const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const forcado = new URLSearchParams(location.search).has('offline');

/** Pergunta ao service worker ativo se o cache da versão dele está completo. */
function perguntarAoServico(servico) {
  return new Promise((ok) => {
    const canal = new MessageChannel();
    const espera = setTimeout(() => ok(null), 4000);
    canal.port1.onmessage = (evento) => {
      clearTimeout(espera);
      ok(evento.data);
    };
    servico.postMessage('pronto-offline?', [canal.port2]);
  });
}

async function conferir() {
  const registro = await navigator.serviceWorker.ready;
  const resposta = registro.active && (await perguntarAoServico(registro.active));
  definirOffline(resposta?.pronto ? 'pronto' : 'preparando');
}

export async function iniciarOffline() {
  if (!('serviceWorker' in navigator) || !isSecureContext) {
    definirOffline('indisponivel');
    return;
  }

  if (local && !forcado) {
    // Tira um service worker que tenha ficado de um teste com ?offline
    for (const registro of await navigator.serviceWorker.getRegistrations()) await registro.unregister();
    definirOffline('desligado');
    return;
  }

  definirOffline('preparando');
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (erro) {
    console.error(erro);
    definirOffline('indisponivel');
    return;
  }
  // Uma versão nova assume no meio do uso: confere de novo o cache dela
  navigator.serviceWorker.addEventListener('controllerchange', () => conferir().catch(() => {}));
  conferir().catch(() => definirOffline('preparando'));
}

/** Aberto pelo ícone da tela de início (e não numa aba do Safari). */
export const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/** Safari do iPhone/iPad: é onde instalar antes de importar faz diferença. */
export const safariDoIos = () => 'standalone' in navigator;
