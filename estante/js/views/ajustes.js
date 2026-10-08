// Tela "Ajustes": escolha de tema e as entradas das próximas etapas.

import { estado } from '../store.js';

export const VERSAO = '0.8.0';

export function renderAjustes() {
  const tema = (id, nome) => `<button class="tema" type="button" data-acao="tema" data-tema="${id}" aria-pressed="${estado.tema === id}">
    <span class="tema__amostra tema__amostra--${id}" aria-hidden="true"></span>
    <span class="tema__nome">${nome}</span>
  </button>`;

  return `<header class="cabecalho"><h1 class="titulo">Ajustes</h1></header>
  <div class="rolagem" data-rolagem="ajustes">
    <div class="conteudo">
      <h2 class="ajustes__secao">Tema</h2>
      <div class="temas" role="group" aria-label="Tema">
        ${tema('noite', 'Noite')}
        ${tema('morango', 'Morango')}
      </div>
      <button class="botao botao--secundario" type="button" data-acao="ir" data-destino="dados">Seus dados</button>
      <button class="botao botao--secundario" type="button" data-acao="anotacoes">Páginas e anotações</button>
      <p class="ajustes__nota">Feita com amor pra Lua.</p>
      <p class="ajustes__versao">ESTANTE TSUKINA · versão ${VERSAO}</p>
    </div>
  </div>`;
}
