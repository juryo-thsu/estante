// "Volume concluído — brinde": aparece ao passar da última página.
// Os dois copos se aproximam e brindam em 1 s.

import { esc, nomeLongo, doisDigitos } from '../ui.js';

// Os copos têm duas cores (traço dourado e morango rosa): entram como imagem, sem máscara
const copo = (lado) => `<img class="brinde__copo brinde__copo--${lado}" src="assets/icons/copo-${lado}.svg" alt="" width="36" height="66" draggable="false">`;

export function renderBrinde(v, proximo, { automatico = false } = {}) {
  const linhas = proximo
    ? ['Guardei tudo direitinho.', automatico ? 'Já abrindo o próximo, amor…' : 'O próximo já tá te esperando.']
    : ['Guardei tudo direitinho.', 'Era o último que você tem dessa série, xuxu.'];

  return `<header class="cabecalho"><h1 class="titulo">Mais um, Lua!</h1></header>
  <div class="rolagem">
    <div class="brinde" role="status">
      <div class="brinde__copos" aria-hidden="true">${copo('esquerdo')}${copo('direito')}</div>
      <h2 class="brinde__titulo">Volume terminado!</h2>
      <p class="brinde__volume">${esc(nomeLongo(v))}</p>
      <p class="brinde__texto">${linhas.map(esc).join('<br>')}</p>
      ${proximo
        ? `<button class="botao botao--brinde" type="button" data-acao="abrir-proximo" data-id="${esc(proximo.id)}">Ler o Volume ${esc(doisDigitos(proximo.numero))}</button>
           <button class="brinde__voltar" type="button" data-acao="fim-do-brinde">Voltar pra estante</button>`
        : '<button class="botao botao--brinde" type="button" data-acao="fim-do-brinde">Voltar pra estante</button>'}
    </div>
  </div>`;
}
