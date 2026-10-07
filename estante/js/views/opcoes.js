// "Opções de leitura — por série": abre por cima do leitor, pelo botão Opções.
// Cada toque grava na hora (store) e o leitor aplica ao voltar.

import { esc, icone } from '../ui.js';

/** Botão de escolha: preenchido quando é a opção atual, como no Figma. */
function escolha(texto, opcao, valor, atual) {
  const ativo = atual === valor;
  return `<button class="botao botao--44${ativo ? '' : ' botao--secundario'}" type="button"
    data-opcao="${opcao}" data-valor="${esc(valor)}" aria-pressed="${ativo}">${esc(texto)}</button>`;
}

function cartao(titulo, texto, conteudo) {
  return `<section class="cartao-dados">
    <h2 class="cartao-dados__titulo">${esc(titulo)}</h2>
    ${texto ? `<p class="cartao-dados__texto">${esc(texto)}</p>` : ''}
    ${conteudo}
  </section>`;
}

export function renderOpcoes(serie, p) {
  const explicacaoDaDirecao = p.direcao === 'rtl'
    ? 'Esquerda avança · direita retorna. O centro alterna os controles.'
    : 'Direita avança · esquerda retorna. O centro alterna os controles.';

  return `<header class="barra-voltar">
    <button class="voltar" type="button" data-opcao="fechar" aria-label="Voltar à leitura">${icone('voltar', 20)}</button>
    <h1 class="barra-voltar__titulo">Opções de leitura</h1>
  </header>
  <div class="rolagem" data-rolagem="opcoes">
    <div class="importar">
      <h2 class="importar__titulo">${esc(serie)}</h2>
      <p class="importar__texto">Preferências salvas para esta série.</p>

      ${cartao('Direção de leitura', explicacaoDaDirecao, `<div class="par-de-botoes" role="group" aria-label="Direção de leitura">
        ${escolha('Direita → esquerda', 'direcao', 'rtl', p.direcao)}
        ${escolha('Esquerda → direita', 'direcao', 'ltr', p.direcao)}
      </div>`)}

      ${cartao('Como deseja ler?', '', `<div class="pilha-de-botoes" role="group" aria-label="Modo de leitura">
        ${escolha('Páginas', 'modo', 'paginas', p.modo)}
        ${escolha('Rolagem vertical', 'modo', 'vertical', p.modo)}
      </div>`)}

      ${cartao('Pinça e toque duplo', 'Com zoom ativo, arraste para mover a imagem.',
        `<button class="botao botao--secundario botao--44" type="button" data-opcao="ver-zoom"${p.modo === 'paginas' ? '' : ' disabled'}>Ver zoom 2×</button>`)}

      ${cartao('Conforto visual', 'Ajuste o brilho da página e escolha o filtro.', `<div class="par-de-botoes">
        ${escolha('Preto puro', 'pretoPuro', 'true', String(p.pretoPuro))}
        ${escolha('Sépia', 'sepia', 'true', String(p.sepia))}
      </div>`)}
    </div>
  </div>
  <div class="rodape-acao"><button class="botao" type="button" data-opcao="fechar">Voltar à leitura</button></div>`;
}
