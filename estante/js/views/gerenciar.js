// "Gerenciar volumes — preservar progresso": remove vários arquivos de uma vez.

import { estado, lido, naoLido } from '../store.js';
import { esc, icone, nomeLongo, plural, tamanhoLegivel } from '../ui.js';

function situacao(v) {
  if (lido(v)) return 'concluído';
  if (naoLido(v)) return 'não lido';
  return `página ${v.pagina} de ${v.paginas}`;
}

export function renderGerenciar({ confirmando = false } = {}) {
  const lista = estado.volumes
    .filter((v) => v.temArquivo)
    .sort((a, b) => a.serie.localeCompare(b.serie, 'pt-BR', { numeric: true }) || a.numero - b.numero);
  const marcados = lista.filter((v) => estado.paraRemover.has(v.id));
  const total = marcados.reduce((soma, v) => soma + (v.tamanho || 0), 0);

  let rodape;
  if (marcados.length === 0) {
    rodape = '<button class="botao" type="button" disabled>Selecione volumes para remover</button>';
  } else if (confirmando) {
    rodape = `<button class="botao" type="button" data-acao="remover-marcados">Toque de novo para remover · ${tamanhoLegivel(total)}</button>`;
  } else {
    rodape = `<button class="botao" type="button" data-acao="remover-marcados">Remover ${plural(marcados.length, 'volume', 'volumes')} · ${tamanhoLegivel(total)}</button>`;
  }

  return `<header class="barra-voltar">
    <button class="voltar" type="button" data-acao="ir" data-destino="dados" aria-label="Voltar para Dados e app">${icone('voltar', 20)}</button>
    <h1 class="barra-voltar__titulo">Gerenciar volumes</h1>
  </header>
  <div class="rolagem" data-rolagem="gerenciar">
    <div class="importar">
      <h2 class="importar__titulo">Libere espaço para ler</h2>
      <p class="importar__texto">O progresso e as anotações continuam salvos ao remover os arquivos deste aparelho.</p>
      ${lista.length ? lista.map((v) => {
        const marcado = estado.paraRemover.has(v.id);
        return `<button class="cartao-dados selecao" type="button" data-acao="marcar-para-remover" data-id="${esc(v.id)}" aria-pressed="${marcado}">
          <span class="selecao__linha">
            <span class="selecao__caixa" aria-hidden="true">${marcado ? icone('check', 20) : ''}</span>
            <span class="selecao__nome">${esc(nomeLongo(v))}</span>
          </span>
          <span class="selecao__detalhe">${esc(`${tamanhoLegivel(v.tamanho)} · ${situacao(v)}`)}</span>
        </button>`;
      }).join('') : '<p class="importar__texto">Nenhum volume com arquivo neste aparelho.</p>'}
      <h2 class="importar__titulo">Apenas os arquivos são removidos</h2>
      <p class="importar__texto">Para ler esses volumes novamente, importe os CBZ ou ZIP originais.</p>
    </div>
  </div>
  <div class="rodape-acao">${rodape}</div>`;
}
