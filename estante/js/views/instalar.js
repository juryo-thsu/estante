// Tela "Instalar app — tela de início".

import { esc, icone } from '../ui.js';

const PASSOS = [
  ['1. Abre no Safari, amor', ''],
  ['2. Toca em Compartilhar', 'E escolhe “Adicionar à Tela de Início”.'],
  ['3. Adicionar e pronto', 'Agora é só abrir pelo ícone novo, xuxu.'],
];

export function renderInstalar() {
  return `<header class="barra-voltar">
    <button class="voltar" type="button" data-acao="fechar-instalacao" aria-label="Voltar">${icone('voltar', 20)}</button>
    <h1 class="barra-voltar__titulo">Tsukina na tela de início</h1>
  </header>
  <div class="rolagem" data-rolagem="instalar">
    <div class="importar">
      <span class="icone-do-app" aria-hidden="true">${icone('planeta-original')}</span>
      <h2 class="importar__titulo">Sua estante sempre pertinho, Lua</h2>
      <ol class="passos">
        ${PASSOS.map(([titulo, texto]) => `<li class="cartao-dados">
          <h3 class="cartao-dados__titulo">${esc(titulo)}</h3>
          ${texto ? `<p class="cartao-dados__texto">${esc(texto)}</p>` : ''}
        </li>`).join('')}
      </ol>
    </div>
  </div>
  <div class="rodape-acao"><button class="botao" type="button" data-acao="fechar-instalacao">Entendi!</button></div>`;
}
