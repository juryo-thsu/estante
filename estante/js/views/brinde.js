// "Volume concluído": aparece ao passar da última página.
// No lugar dos copos do Figma, um verso de "Lilás", do Djavan (pedido de J).

import { esc, nomeLongo, doisDigitos } from '../ui.js';

export function renderBrinde(v, proximo, { automatico = false } = {}) {
  // Só avisa quando o próximo vai abrir sozinho; nos outros casos os botões já dizem tudo
  const aviso = proximo && automatico ? 'Já abrindo o próximo…' : '';

  return `<header class="cabecalho"><h1 class="titulo">Mais um!</h1></header>
  <div class="rolagem">
    <div class="brinde" role="status">
      <figure class="brinde__verso">
        <blockquote>“Amanhã, outro dia,<br>Lua sai, ventania”</blockquote>
        <figcaption>Djavan · Lilás</figcaption>
      </figure>
      <h2 class="brinde__titulo">Volume terminado!</h2>
      <p class="brinde__volume">${esc(nomeLongo(v))}</p>
      ${aviso ? `<p class="brinde__texto">${esc(aviso)}</p>` : ''}
      ${proximo
        ? `<button class="botao botao--brinde" type="button" data-acao="abrir-proximo" data-id="${esc(proximo.id)}">Ler o Volume ${esc(doisDigitos(proximo.numero))}</button>
           <button class="brinde__voltar" type="button" data-acao="fim-do-brinde">Voltar pra estante</button>`
        : '<button class="botao botao--brinde" type="button" data-acao="fim-do-brinde">Voltar pra estante</button>'}
    </div>
  </div>`;
}
