// "Ações da capa": a folha que sobe de baixo no toque longo ou no ⋯.

import { volume, lido, naoLido, alternarFavorito, alternarLido, definirOculto } from '../store.js';
import { esc, nomeLongo, icone, tamanhoLegivel } from '../ui.js';

let aberta = null; // { camada, folha, id, quemAbriu, aoFechar }

function posicao(v) {
  const onde = v.temArquivo ? '' : ' · sem arquivo agora';
  if (naoLido(v)) return `Ainda não lido${onde}`;
  if (lido(v)) return `Lido · ${v.paginas} páginas${onde}`;
  return `Página ${v.pagina} de ${v.paginas}${onde}`;
}

function acaoFavorito(v, pulsar = false) {
  return `<button class="acao acao--favorito" type="button" data-acao-folha="favorito" aria-pressed="${v.favorito}">
    <span class="acao__area">${v.favorito
      ? `<span class="coracao coracao--ativo${pulsar ? ' pulsando' : ''}" aria-hidden="true"></span>`
      : icone('heart')}</span>
    <span>${v.favorito ? 'Favoritado' : 'Favoritar'}</span>
  </button>`;
}

function conteudo(v) {
  return `<div class="folha__alca" data-puxar><span class="folha__puxador"></span></div>
    <h2 class="folha__titulo" id="folha-titulo" data-puxar>${esc(nomeLongo(v))}</h2>
    <p class="folha__posicao">${esc(posicao(v))}</p>
    ${acaoFavorito(v)}
    <button class="acao" type="button" data-acao-folha="anotacoes">${icone('pin')}<span>Páginas e anotações</span></button>
    <button class="acao" type="button" data-acao-folha="lido"><span>${lido(v) ? 'Marcar como não lido' : 'Marcar como lido'}</span></button>
    <button class="acao" type="button" data-acao-folha="ocultar">${icone('lock')}<span>Esconder volume</span></button>
    ${v.temArquivo ? '<button class="acao" type="button" data-acao-folha="remover"><span>Remover arquivo</span></button>' : ''}
    <button class="botao botao--secundario" type="button" data-acao-folha="fechar">Pronto</button>`;
}

/**
 * Abre a folha para um volume.
 * `aoAgir(acao, id)` recebe o que a folha não resolve sozinha: 'ocultar', 'anotacoes', 'remover' (já confirmado), 'favoritou'.
 */
export function abrirFolha(id, { raiz, aoAgir = () => {} } = {}) {
  const v = volume(id);
  if (!v || aberta) return;

  const camada = document.createElement('div');
  camada.className = 'camada';
  camada.innerHTML = `<button class="camada__fundo" type="button" data-acao-folha="fechar" aria-label="Fechar ações" tabindex="-1"></button>
    <div class="folha" role="dialog" aria-modal="true" aria-labelledby="folha-titulo" tabindex="-1">${conteudo(v)}</div>`;
  const folha = camada.querySelector('.folha');

  aberta = { camada, folha, id, quemAbriu: document.activeElement };
  raiz.append(camada);
  for (const irmao of raiz.children) if (irmao !== camada) irmao.inert = true;

  // Um quadro de espera para a transição de entrada (220 ms) acontecer
  requestAnimationFrame(() => requestAnimationFrame(() => {
    camada.dataset.aberta = '';
    folha.focus({ preventScroll: true });
  }));

  camada.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('[data-acao-folha]');
    if (!alvo) return;
    const acao = alvo.dataset.acaoFolha;

    if (acao === 'fechar') return fecharFolha();

    if (acao === 'favorito') {
      const agora = alternarFavorito(id);
      alvo.outerHTML = acaoFavorito(volume(id), agora);
      camada.querySelector('[data-acao-folha="favorito"]').focus({ preventScroll: true });
      if (agora) aoAgir('favoritou', id);
      return;
    }

    if (acao === 'lido') {
      alternarLido(id);
      return fecharFolha();
    }

    if (acao === 'ocultar') {
      definirOculto(id, true);
      return fecharFolha(() => aoAgir('ocultar', id));
    }

    // Remover apaga o arquivo de verdade: o primeiro toque só pede confirmação
    if (acao === 'remover' && !alvo.hasAttribute('data-confirmar')) {
      alvo.setAttribute('data-confirmar', '');
      alvo.classList.add('acao--confirmar');
      alvo.querySelector('span').textContent = `Tem certeza, amor? Toque de novo · ${tamanhoLegivel(volume(id).tamanho)}`;
      return;
    }

    // 'anotacoes' é de uma próxima etapa; 'remover' quem faz é o app.js
    fecharFolha(() => aoAgir(acao, id));
  });

  camada.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharFolha();
  });

  arrastarParaFechar(folha);
}

export function fecharFolha(depois) {
  if (!aberta) return;
  const { camada, quemAbriu, id } = aberta;
  const raiz = camada.parentElement;
  aberta = null;

  delete camada.dataset.aberta;
  camada.style.pointerEvents = 'none';
  for (const irmao of raiz.children) irmao.inert = false;

  const remover = () => {
    camada.remove();
    // A tela pode ter sido redesenhada por baixo: volta o foco para o ⋯ do mesmo volume
    const destino = quemAbriu?.isConnected ? quemAbriu : raiz.querySelector(`[data-acao="acoes"][data-id="${CSS.escape(id)}"]`);
    destino?.focus({ preventScroll: true });
    depois?.();
  };
  // Saída: 180 ms (com folga para o caso de a transição não disparar)
  setTimeout(remover, 200);
}

export const folhaAberta = () => Boolean(aberta);

/** Puxar a alça ou o título para baixo fecha a folha, como nas folhas do iOS. */
function arrastarParaFechar(folha) {
  let inicio = null;

  folha.addEventListener('pointerdown', (evento) => {
    if (!evento.target.closest('[data-puxar]')) return;
    inicio = evento.clientY;
    folha.setPointerCapture(evento.pointerId);
    folha.dataset.arrastando = '';
  });

  folha.addEventListener('pointermove', (evento) => {
    if (inicio === null) return;
    const dy = Math.max(0, evento.clientY - inicio);
    folha.style.setProperty('--arrasto', `${dy}px`);
  });

  const soltar = (evento) => {
    if (inicio === null) return;
    const dy = Math.max(0, evento.clientY - inicio);
    inicio = null;
    delete folha.dataset.arrastando;
    if (dy > 80) {
      fecharFolha();
    } else {
      folha.style.removeProperty('--arrasto');
    }
  };
  folha.addEventListener('pointerup', soltar);
  folha.addEventListener('pointercancel', soltar);
}
