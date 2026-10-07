// "Leitor de mangá" (parte 3a): página, toques laterais e central, deslizar, controles com fade,
// slider de pérolas e progresso salvo. É uma camada sobre o app, como a folha de ações:
// a cada página troca só a imagem e os textos, sem redesenhar a tela.

import { estado, volume, salvarPagina, direcaoDaSerie, marcarDicaDeDirecaoVista } from '../store.js';
import { esc, nomeLongo, icone } from '../ui.js';
import { abrirPaginas } from '../paginas.js';

const ZONA_LATERAL = 0.35; // 137,55 de 393 no Figma, de cada lado; o centro alterna os controles
const DESLIZE_MINIMO = 40; // px na horizontal para virar a página deslizando
const TOQUE_MAXIMO = 10; // px de folga para ainda contar como toque
const DICA_MS = 3000;
const SAIDA_MS = 180;

const EM_BREVE = {
  marcar: 'Marcar página chega na parte 3b.',
  ajustar: 'Zoom e Ajustar à tela chegam na parte 3b.',
  opcoes: 'As opções de leitura chegam na parte 3b.',
  anotar: 'As anotações chegam na etapa 4.',
};

let aberto = null;

export const leitorAberto = () => Boolean(aberto);

function modelo(v, total, direcao, controlesVisiveis) {
  const fase = controlesVisiveis ? 'visivel' : 'oculto';
  const avancar = direcao === 'rtl' ? 'Esquerda' : 'Direita';
  const perolas = Array.from({ length: 7 }, (_, i) => `<span class="leitor-slider__perola" style="--i:${i}"></span>`).join('');
  return `<div class="leitor__pagina">
      <img class="leitor__imagem" alt="" draggable="false">
      <p class="leitor__erro" hidden>Não deu para abrir esta página.</p>
    </div>
    <div class="leitor__toques" aria-hidden="true"></div>

    <header class="leitor__topo leitor__ui" data-fase="${fase}">
      <div class="leitor__navegacao">
        <button class="leitor__voltar" type="button" data-leitor="fechar">${icone('arrow-left', 18)}<span>Estante</span></button>
        <p class="leitor__lendo">LENDO AGORA</p>
      </div>
      <h1 class="leitor__titulo">${esc(nomeLongo(v))}</h1>
    </header>

    <div class="leitor__base leitor__ui" data-fase="${fase}">
      <p class="leitor__dica-toque">Centro: controles · ${avancar}: avançar</p>
      <div class="leitor__controles">
        <div class="leitor__posicao">
          <p class="leitor__pagina-atual"></p>
          <p class="leitor__lido"></p>
        </div>
        <div class="leitor-slider" role="slider" tabindex="0" aria-label="Página" aria-valuemin="1" aria-valuemax="${total}">
          <span class="leitor-slider__trilho"></span>
          <span class="leitor-slider__lido"></span>
          ${perolas}
          <svg class="leitor-slider__pingente" viewBox="0 0 8 10" aria-hidden="true"><path d="M4 0L8 5L4 10L0 5L4 0Z"/></svg>
        </div>
        <div class="leitor__ferramentas">
          <button class="ferramenta" type="button" data-leitor="marcar">${icone('pin', 16)}<span>Marcar</span></button>
          <button class="ferramenta" type="button" data-leitor="ajustar">${icone('maximize', 16)}<span>Ajustar à tela</span></button>
          <button class="ferramenta" type="button" data-leitor="opcoes">${icone('sliders-horizontal', 16)}<span>Opções</span></button>
          <button class="ferramenta ferramenta--anotar" type="button" data-leitor="anotar">${icone('pen', 20)}<span>Anotar</span></button>
        </div>
      </div>
    </div>

    <p class="leitor__aviso-direcao" role="status">${direcao === 'rtl' ? '← Avançar · leitura da direita para a esquerda' : 'Avançar → · leitura da esquerda para a direita'}</p>`;
}

/**
 * Abre o volume no leitor. `avisar(texto)` mostra o aviso curto do app;
 * `aoFechar(id)` é chamado depois que a camada sai.
 */
export async function abrirLeitor(id, { raiz, avisar, aoFechar = () => {} }) {
  const v = volume(id);
  if (!v || aberto) return;
  aberto = { id }; // reserva já: um segundo toque durante a abertura não abre outro leitor

  let paginas;
  try {
    paginas = await abrirPaginas(v);
  } catch (erro) {
    console.error(erro);
    aberto = null;
    avisar('Não deu para abrir este volume.');
    return;
  }

  const total = paginas.total;
  const direcao = direcaoDaSerie(v.serie);
  // Lido ou nunca aberto começa do início; em leitura, volta à página salva
  let indice = v.pagina >= 1 && v.pagina < total ? v.pagina - 1 : 0;
  const mostrarDica = !estado.dicaDeDirecaoVista;
  let controles = !mostrarDica;

  const camada = document.createElement('div');
  camada.className = 'leitor';
  camada.setAttribute('role', 'dialog');
  camada.setAttribute('aria-modal', 'true');
  camada.setAttribute('aria-label', `Leitor: ${nomeLongo(v)}`);
  camada.tabIndex = -1;
  camada.innerHTML = modelo(v, total, direcao, controles);

  const $ = (seletor) => camada.querySelector(seletor);
  const imagem = $('.leitor__imagem');
  const erro = $('.leitor__erro');
  const toques = $('.leitor__toques');
  const slider = $('.leitor-slider');
  const textoPagina = $('.leitor__pagina-atual');
  const textoLido = $('.leitor__lido');
  const dica = $('.leitor__aviso-direcao');
  const partes = [...camada.querySelectorAll('.leitor__ui')];

  aberto = { id, camada };
  raiz.append(camada);
  for (const irmao of raiz.children) if (irmao !== camada) irmao.inert = true;
  requestAnimationFrame(() => {
    camada.dataset.aberto = '';
    camada.focus({ preventScroll: true });
  });

  // ---------- Posição e página ----------

  function mostrarPosicao(i) {
    const pagina = i + 1;
    textoPagina.textContent = `Página ${pagina} de ${total}`;
    textoLido.textContent = `${Math.round((pagina / total) * 100)}% lido`;
    slider.style.setProperty('--p', (pagina / total).toFixed(4));
    slider.setAttribute('aria-valuenow', pagina);
    slider.setAttribute('aria-valuetext', `Página ${pagina} de ${total}`);
  }

  let ultimoPedido = 0;
  async function irPara(i) {
    indice = Math.max(0, Math.min(total - 1, i));
    const pedido = ++ultimoPedido;
    mostrarPosicao(indice);
    salvarPagina(v.id, indice + 1);
    paginas.manterPerto(indice);
    try {
      const url = await paginas.url(indice);
      // Decodifica antes de trocar, para a página nova não aparecer pela metade
      const previa = new Image();
      previa.src = url;
      await previa.decode().catch(() => {});
      if (pedido !== ultimoPedido || !aberto) return;
      imagem.src = url;
      imagem.alt = `Página ${indice + 1} de ${total}`;
      imagem.hidden = false;
      erro.hidden = true;
    } catch (falha) {
      console.error(falha);
      if (pedido !== ultimoPedido) return;
      imagem.hidden = true;
      erro.hidden = false;
    }
  }

  function avancar() {
    if (indice < total - 1) irPara(indice + 1);
    else avisar('Você chegou ao fim do volume.');
  }

  function voltar() {
    if (indice > 0) irPara(indice - 1);
  }

  // ---------- Controles com fade ----------

  function definirControles(visiveis) {
    controles = visiveis;
    for (const parte of partes) {
      if (visiveis) {
        // Entrada: a posição de partida (y+32) é colocada sem transição, com tudo invisível
        parte.dataset.fase = 'antes';
        parte.getBoundingClientRect();
        parte.dataset.fase = 'visivel';
      } else {
        parte.dataset.fase = 'oculto';
      }
    }
  }

  let dicaTimer;
  function esconderDica() {
    clearTimeout(dicaTimer);
    delete dica.dataset.visivel;
  }
  if (mostrarDica) {
    marcarDicaDeDirecaoVista();
    requestAnimationFrame(() => { dica.dataset.visivel = ''; });
    dicaTimer = setTimeout(esconderDica, DICA_MS);
  }

  // ---------- Toques e deslize na página ----------

  let inicio = null;
  toques.addEventListener('pointerdown', (evento) => {
    if (!evento.isPrimary) return;
    inicio = { x: evento.clientX, y: evento.clientY };
  });
  toques.addEventListener('pointercancel', () => { inicio = null; });
  toques.addEventListener('pointerup', (evento) => {
    if (!inicio || !evento.isPrimary) return;
    const dx = evento.clientX - inicio.x;
    const dy = evento.clientY - inicio.y;
    inicio = null;
    esconderDica();

    const paraFrente = direcao === 'rtl' ? 1 : -1;
    if (Math.abs(dx) >= DESLIZE_MINIMO && Math.abs(dx) > Math.abs(dy) * 1.2) {
      // O deslize segue a direção: no mangá, puxar para a direita traz a próxima página
      if (Math.sign(dx) === paraFrente) avancar();
      else voltar();
      return;
    }
    if (Math.abs(dx) > TOQUE_MAXIMO || Math.abs(dy) > TOQUE_MAXIMO) return;

    const caixa = toques.getBoundingClientRect();
    const fracao = (evento.clientX - caixa.left) / caixa.width;
    if (fracao < ZONA_LATERAL) (direcao === 'rtl' ? avancar : voltar)();
    else if (fracao > 1 - ZONA_LATERAL) (direcao === 'rtl' ? voltar : avancar)();
    else definirControles(!controles);
  });

  // ---------- Slider de pérolas ----------

  let arrastando = false;
  function indiceNoSlider(evento) {
    const caixa = slider.getBoundingClientRect();
    const fracao = Math.min(1, Math.max(0, (evento.clientX - caixa.left) / caixa.width));
    return Math.min(total - 1, Math.max(0, Math.round(fracao * total) - 1));
  }
  slider.addEventListener('pointerdown', (evento) => {
    arrastando = true;
    slider.setPointerCapture(evento.pointerId);
    mostrarPosicao(indiceNoSlider(evento));
  });
  slider.addEventListener('pointermove', (evento) => {
    if (arrastando) mostrarPosicao(indiceNoSlider(evento));
  });
  const soltarSlider = (evento) => {
    if (!arrastando) return;
    arrastando = false;
    // Só ao soltar a página é extraída: arrastar não descompacta cada página do caminho
    irPara(indiceNoSlider(evento));
  };
  slider.addEventListener('pointerup', soltarSlider);
  slider.addEventListener('pointercancel', () => {
    arrastando = false;
    mostrarPosicao(indice);
  });
  slider.addEventListener('keydown', (evento) => {
    const passos = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    if (evento.key in passos) irPara(indice + passos[evento.key]);
    else if (evento.key === 'Home') irPara(0);
    else if (evento.key === 'End') irPara(total - 1);
    else return;
    evento.preventDefault();
    evento.stopPropagation();
  });

  // ---------- Botões e teclado ----------

  camada.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('[data-leitor]');
    if (!alvo) return;
    const acao = alvo.dataset.leitor;
    if (acao === 'fechar') fechar();
    else if (EM_BREVE[acao]) avisar(EM_BREVE[acao]);
  });

  camada.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fechar();
    else if (evento.key === 'ArrowLeft') (direcao === 'rtl' ? avancar : voltar)();
    else if (evento.key === 'ArrowRight') (direcao === 'rtl' ? voltar : avancar)();
    else if (evento.key === ' ') definirControles(!controles);
    else return;
    evento.preventDefault();
  });

  function fechar() {
    if (aberto?.camada !== camada) return;
    aberto = null;
    clearTimeout(dicaTimer);
    paginas.fechar();
    delete camada.dataset.aberto;
    camada.style.pointerEvents = 'none';
    for (const irmao of raiz.children) irmao.inert = false;
    setTimeout(() => {
      camada.remove();
      aoFechar(id);
    }, SAIDA_MS);
  }

  irPara(indice);
}
