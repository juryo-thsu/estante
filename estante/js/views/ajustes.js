// Tela "Ajustes": escolha de tema e as entradas das próximas etapas.

import { estado } from '../store.js';

export const VERSAO = '0.7.07';

export function renderAjustes() {
  const tema = (id, nome, descricao) => `<button class="tema" type="button" data-acao="tema" data-tema="${id}" aria-pressed="${estado.tema === id}">
    <span class="tema__amostra tema__amostra--${id}" aria-hidden="true"></span>
    <span class="tema__nome">${nome}</span>
    <span class="tema__descricao">${descricao}</span>
  </button>`;

  return `<header class="cabecalho"><h1 class="titulo">Ajustes</h1></header>
  <div class="rolagem" data-rolagem="ajustes">
    <div class="conteudo">
      <h2 class="ajustes__secao">Aparência</h2>
      <p class="ajustes__texto">Dois lados da mesma história.</p>
      <div class="temas" role="group" aria-label="Tema">
        ${tema('noite', 'Noite', 'Metal e bordô')}
        ${tema('morango', 'Morango', 'Creme e rosa')}
      </div>
      <button class="botao botao--secundario" type="button" data-acao="em-breve" data-o-que="As preferências de leitura chegam com o leitor.">Preferências de leitura</button>
      <button class="botao botao--secundario" type="button" data-acao="em-breve" data-o-que="Dados e backup chegam com a importação.">Dados, armazenamento e backup</button>
      <button class="botao botao--secundario" type="button" data-acao="anotacoes">Páginas e anotações</button>
      <p class="ajustes__nota">Animações curtas · respeita movimento reduzido</p>
      <p class="ajustes__versao">ESTANTE · versão ${VERSAO}</p>
    </div>
  </div>`;
}
