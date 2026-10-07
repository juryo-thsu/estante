// Tela "Instalar app — tela de início".

import { esc, icone } from '../ui.js';

const PASSOS = [
  ['1. Abra no Safari', 'Use o navegador para iniciar a instalação.'],
  ['2. Compartilhar → Tela de Início', 'Escolha “Adicionar à Tela de Início”.'],
  ['3. Adicionar e abrir o app', 'Confirme o nome e abra pelo novo ícone.'],
];

export function renderInstalar() {
  return `<header class="barra-voltar">
    <button class="voltar" type="button" data-acao="fechar-instalacao" aria-label="Voltar">${icone('voltar', 20)}</button>
    <h1 class="barra-voltar__titulo">Instalar app</h1>
  </header>
  <div class="rolagem" data-rolagem="instalar">
    <div class="importar">
      <span class="icone-do-app" aria-hidden="true">${icone('planeta-original')}</span>
      <h2 class="importar__titulo">Sua estante, sempre à mão</h2>
      <p class="importar__texto">Abra este app pela tela de início para uma leitura sem barras do navegador.</p>
      <ol class="passos">
        ${PASSOS.map(([titulo, texto]) => `<li class="cartao-dados">
          <h3 class="cartao-dados__titulo">${esc(titulo)}</h3>
          <p class="cartao-dados__texto">${esc(texto)}</p>
        </li>`).join('')}
      </ol>
    </div>
  </div>
  <div class="rodape-acao"><button class="botao" type="button" data-acao="fechar-instalacao">Entendi</button></div>`;
}
