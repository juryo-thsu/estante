// "Leitor de mangá": página ou rolagem vertical, toques laterais e central, deslizar, pinça e
// toque duplo, controles com fade, slider de pérolas, marcador, opções por série e progresso salvo.
// É uma camada sobre o app, como a folha de ações: a cada página troca só a imagem e os
// textos, sem redesenhar a tela.

import {
  estado, volume, salvarPagina, preferenciasDaSerie, definirPreferenciaDaSerie, alternarMarcador, marcarDicaDeDirecaoVista,
  proximoVolume,
} from '../store.js';
import { esc, nomeLongo, icone } from '../ui.js';
import { abrirPaginas } from '../paginas.js';
import { renderOpcoes } from './opcoes.js';

const ZONA_LATERAL = 0.35; // 137,55 de 393 no Figma, de cada lado; o centro alterna os controles
const DESLIZE_MINIMO = 40; // px na horizontal para virar a página deslizando
const TOQUE_MAXIMO = 10; // px de folga para ainda contar como toque
const TOQUE_DUPLO_MS = 250;
const ZOOM_MAXIMO = 4;
const DICA_MS = 3000;
const SAIDA_MS = 180;

let aberto = null;

export const leitorAberto = () => Boolean(aberto);

const limitar = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor));
const formatarZoom = (s) => (Math.round(s * 10) / 10).toLocaleString('pt-BR');

function modelo(v, total, controlesVisiveis) {
  const fase = controlesVisiveis ? 'visivel' : 'oculto';
  const perolas = Array.from({ length: 7 }, (_, i) => `<span class="leitor-slider__perola" style="--i:${i}"></span>`).join('');
  return `<div class="leitor__pagina">
      <img class="leitor__imagem" alt="" draggable="false">
      <img class="leitor__imagem leitor__imagem--par" alt="" draggable="false" hidden>
      <p class="leitor__erro" hidden>Essa página não quis abrir.</p>
    </div>
    <div class="leitor__rolo"></div>
    <div class="leitor__toques" aria-hidden="true"></div>

    <header class="leitor__topo leitor__ui" data-fase="${fase}">
      <div class="leitor__navegacao">
        <button class="leitor__voltar" type="button" data-leitor="fechar">${icone('arrow-left', 18)}<span>Estante</span></button>
        <p class="leitor__lendo">BOA LEITURA</p>
      </div>
      <h1 class="leitor__titulo">${esc(nomeLongo(v))}</h1>
    </header>

    <div class="leitor__base leitor__ui" data-fase="${fase}">
      <p class="leitor__dica-toque"></p>
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
          <button class="ferramenta ferramenta--marcar" type="button" data-leitor="marcar" aria-pressed="false">${icone('pin', 16)}<span class="ferramenta__rotulo">Marcar</span></button>
          <button class="ferramenta" type="button" data-leitor="ajustar">${icone('maximize', 16)}<span>Ajustar à tela</span></button>
          <button class="ferramenta" type="button" data-leitor="opcoes">${icone('sliders-horizontal', 16)}<span>Opções</span></button>
          <button class="ferramenta ferramenta--anotar" type="button" data-leitor="anotar">${icone('pen', 20)}<span>Anotar</span></button>
        </div>
      </div>
    </div>

    <p class="leitor__aviso-direcao" role="status"></p>
    <div class="leitor__opcoes" role="dialog" aria-label="Opções de leitura" tabindex="-1" hidden></div>`;
}

/**
 * Abre o volume no leitor. `avisar(texto)` mostra o aviso curto do app;
 * `aoFechar(id)` é chamado depois que a camada sai; `aoConcluir(id, proximoId, automatico)`,
 * quando a leitura passa da última página. `continuacao`: aberto pelo próximo volume automático.
 */
export async function abrirLeitor(id, {
  raiz, avisar, aoFechar = () => {}, aoConcluir = () => {}, aoAnotar = () => {}, continuacao = false, pagina = null,
}) {
  const v = volume(id);
  if (!v || aberto) return;
  aberto = { id }; // reserva já: um segundo toque durante a abertura não abre outro leitor

  let paginas;
  try {
    paginas = await abrirPaginas(v);
  } catch (erro) {
    console.error(erro);
    aberto = null;
    avisar('Esse volume não quis abrir, desculpa.');
    return;
  }

  const total = paginas.total;
  let p = preferenciasDaSerie(v.serie);
  let modoAtual = null;
  // Lido ou nunca aberto começa do início; em leitura, volta à página salva
  let indice = v.pagina >= 1 && v.pagina < total ? v.pagina - 1 : 0;
  // "Ler página" (lista de anotações) abre direto na página pedida
  if (pagina >= 1 && pagina <= total) indice = pagina - 1;
  const mostrarDica = !estado.dicaDeDirecaoVista;
  let controles = !mostrarDica;
  const zoom = { s: 1, x: 0, y: 0 };
  let continuou = continuacao; // "Você continuou no próximo volume" até a primeira virada
  // Página dupla só faz sentido deitado; em pé, "Dupla em paisagem" lê uma página por vez
  const paisagem = matchMedia('(orientation: landscape) and (max-height: 600px)');
  const dupla = () => p.modo === 'dupla' && paisagem.matches;

  const camada = document.createElement('div');
  camada.className = 'leitor';
  camada.setAttribute('role', 'dialog');
  camada.setAttribute('aria-modal', 'true');
  camada.setAttribute('aria-label', `Leitor: ${nomeLongo(v)}`);
  camada.tabIndex = -1;
  camada.innerHTML = modelo(v, total, controles);

  const $ = (seletor) => camada.querySelector(seletor);
  const area = $('.leitor__pagina');
  const imagem = $('.leitor__imagem');
  const imagemPar = $('.leitor__imagem--par');
  const erro = $('.leitor__erro');
  const rolo = $('.leitor__rolo');
  const toques = $('.leitor__toques');
  const slider = $('.leitor-slider');
  const textoPagina = $('.leitor__pagina-atual');
  const textoLido = $('.leitor__lido');
  const lendo = $('.leitor__lendo');
  const dicaToque = $('.leitor__dica-toque');
  const botaoMarcar = $('[data-leitor="marcar"]');
  const rotuloMarcar = $('.ferramenta__rotulo');
  const dica = $('.leitor__aviso-direcao');
  const painelOpcoes = $('.leitor__opcoes');
  const partes = [...camada.querySelectorAll('.leitor__ui')];

  aberto = { id, camada };
  raiz.append(camada);
  for (const irmao of raiz.children) if (irmao !== camada) irmao.inert = true;
  requestAnimationFrame(() => {
    camada.dataset.aberto = '';
    camada.focus({ preventScroll: true });
  });

  // ---------- Posição ----------

  // Pares da página dupla: a capa sozinha, depois 2–3, 4–5… (como 10–11 no Figma)
  const inicioDoPar = (i) => (i === 0 ? 0 : i - ((i + 1) % 2));
  const fimDoPar = (i) => (i === 0 ? 0 : Math.min(total - 1, inicioDoPar(i) + 1));
  const ultimaVisivel = () => (dupla() ? fimDoPar(indice) : indice);

  function mostrarPosicao(i) {
    const pagina = i + 1;
    const prefixo = zoom.s > 1.01 ? `Zoom ${formatarZoom(zoom.s)}× · ` : '';
    if (dupla()) {
      const fim = fimDoPar(i) + 1;
      const doPar = fim > pagina ? `${pagina}–${fim}` : `${pagina}`;
      textoPagina.textContent = `${doPar} de ${total} · ${p.direcao === 'rtl' ? 'Direita → esquerda' : 'Esquerda → direita'}`;
    } else {
      textoPagina.textContent = `${prefixo}Página ${pagina} de ${total}`;
    }
    textoLido.textContent = `${Math.round((pagina / total) * 100)}% lido`;
    slider.style.setProperty('--p', (pagina / total).toFixed(4));
    slider.setAttribute('aria-valuenow', pagina);
    slider.setAttribute('aria-valuetext', `Página ${pagina} de ${total}`);

    const marcada = (volume(v.id)?.marcadores || []).includes(pagina);
    lendo.textContent = marcada ? 'PÁGINA MARCADA' : 'BOA LEITURA';
    rotuloMarcar.textContent = marcada ? 'Marcada' : 'Marcar';
    botaoMarcar.setAttribute('aria-pressed', String(marcada));

    const lado = p.direcao === 'rtl' ? 'esquerda' : 'direita';
    const naUltima = (dupla() ? fimDoPar(i) : i) === total - 1;
    if (naUltima && modoAtual !== 'vertical') {
      dicaToque.textContent = proximoVolume(volume(v.id)) ? 'Tem o próximo esperando' : 'Última página';
    } else if (continuou) {
      dicaToque.textContent = 'Seguindo pro próximo';
    } else {
      dicaToque.textContent = '';
    }
  }

  function registrar(i, ultima = i) {
    if (i !== indice) continuou = false;
    indice = i;
    mostrarPosicao(i);
    salvarPagina(v.id, ultima + 1);
  }

  // ---------- Modo páginas ----------

  let ultimoPedido = 0;
  async function decodificada(i) {
    const url = await paginas.url(i);
    // Decodifica antes de trocar, para a página nova não aparecer pela metade
    const previa = new Image();
    previa.src = url;
    await previa.decode().catch(() => {});
    return url;
  }

  async function mostrarPagina(i) {
    if (zoom.s !== 1) zerarZoom();
    const comPar = dupla();
    const inicio = comPar ? inicioDoPar(i) : i;
    const fim = comPar ? fimDoPar(i) : i;
    registrar(inicio, fim);
    const pedido = ++ultimoPedido;
    paginas.manterPerto(fim);
    try {
      const [url, urlPar] = await Promise.all([decodificada(inicio), fim > inicio ? decodificada(fim) : null]);
      if (pedido !== ultimoPedido || !aberto || modoAtual !== 'paginas') return;
      camada.toggleAttribute('data-dupla', comPar);
      imagem.src = url;
      imagem.alt = `Página ${inicio + 1} de ${total}`;
      imagem.hidden = false;
      if (urlPar) {
        imagemPar.src = urlPar;
        imagemPar.alt = `Página ${fim + 1} de ${total}`;
      }
      imagemPar.hidden = !urlPar;
      erro.hidden = true;
    } catch (falha) {
      console.error(falha);
      if (pedido !== ultimoPedido) return;
      imagem.hidden = true;
      erro.hidden = false;
    }
  }

  // ---------- Modo rolagem vertical ----------
  // Só as páginas perto da tela ficam carregadas; ao sair, a imagem e o object URL são soltos.

  const folhas = () => rolo.querySelectorAll('.leitor__folha');
  let observadorCarga = null;
  let observadorCentro = null;

  async function carregarFolha(folha) {
    const i = Number(folha.dataset.i);
    const img = folha.firstElementChild;
    try {
      const url = await paginas.url(i);
      if (folha.dataset.perto !== 'sim' || !rolo.contains(folha)) return;
      img.src = url;
      await img.decode().catch(() => {});
      // Fixa a proporção real para a rolagem não pular quando a imagem sair
      if (img.naturalWidth) folha.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
    } catch (falha) {
      console.error(falha);
    }
  }

  async function montarRolo() {
    // A proporção da página atual vale de palpite para as que ainda não carregaram
    try {
      const previa = new Image();
      previa.src = await paginas.url(indice);
      await previa.decode();
      if (previa.naturalWidth) rolo.style.setProperty('--proporcao', `${previa.naturalWidth} / ${previa.naturalHeight}`);
    } catch {
      // Sem a prévia fica a proporção padrão do CSS
    }
    if (modoAtual !== 'vertical' || !aberto) return;

    rolo.innerHTML = Array.from({ length: total }, (_, i) => `<div class="leitor__folha" data-i="${i}">
      <img alt="Página ${i + 1} de ${total}" draggable="false"></div>`).join('')
      + '<div class="leitor__fim"><button class="botao" type="button" data-leitor="concluir">Terminei!</button></div>';

    observadorCarga = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        const folha = entrada.target;
        if (entrada.isIntersecting) {
          folha.dataset.perto = 'sim';
          carregarFolha(folha);
        } else if (folha.dataset.perto === 'sim') {
          folha.dataset.perto = 'nao';
          folha.firstElementChild.removeAttribute('src');
          paginas.soltar(Number(folha.dataset.i));
        }
      }
    }, { root: rolo, rootMargin: '100% 0px' });

    // A página atual é a que está cruzando a linha do meio da tela
    observadorCentro = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        const i = Number(entrada.target.dataset.i);
        if (entrada.isIntersecting && i !== indice) registrar(i);
      }
    }, { root: rolo, rootMargin: '-50% 0px -50% 0px' });

    for (const folha of folhas()) {
      observadorCarga.observe(folha);
      observadorCentro.observe(folha);
    }
    folhas()[indice]?.scrollIntoView({ block: 'start' });
    registrar(indice);
  }

  function desmontarRolo() {
    observadorCarga?.disconnect();
    observadorCentro?.disconnect();
    observadorCarga = observadorCentro = null;
    for (const folha of folhas()) if (folha.dataset.perto === 'sim') paginas.soltar(Number(folha.dataset.i));
    rolo.innerHTML = '';
  }

  // ---------- Navegação comum aos dois modos ----------

  function irPara(i) {
    const alvo = limitar(i, 0, total - 1);
    if (modoAtual === 'vertical') {
      folhas()[alvo]?.scrollIntoView({ block: 'start' });
      registrar(alvo);
    } else {
      mostrarPagina(alvo);
    }
  }

  function avancar() {
    const ultima = ultimaVisivel();
    if (ultima < total - 1) irPara(ultima + 1);
    else concluir();
  }

  function voltar() {
    if (indice > 0) irPara(dupla() ? inicioDoPar(indice - 1) : indice - 1);
  }

  /** Passou da última página: brinde e, se houver, o próximo volume. */
  function concluir() {
    // Não interrompe um zoom: o primeiro toque só volta a página inteira
    if (zoom.s > 1) {
      zerarZoom({ animar: true });
      return;
    }
    salvarPagina(v.id, total);
    const proximo = proximoVolume(volume(v.id));
    fechar(() => aoConcluir(id, proximo?.id ?? null, p.proximoAutomatico));
  }

  // ---------- Preferências da série ----------

  function aplicarPreferencias() {
    p = preferenciasDaSerie(v.serie);
    camada.dataset.modo = p.modo;
    camada.dataset.direcao = p.direcao;
    if (p.telaAcesa && !trava) pedirTelaAcesa();
    else if (!p.telaAcesa) soltarTelaAcesa();
    camada.toggleAttribute('data-preto-puro', p.pretoPuro);
    camada.toggleAttribute('data-sepia', p.sepia);
    dica.textContent = p.direcao === 'rtl' ? '← pra cá avança' : 'pra cá avança →';

    const motor = p.modo === 'vertical' ? 'vertical' : 'paginas';
    if (motor === modoAtual) {
      // Páginas e Dupla usam o mesmo motor: só redesenha (par ou página única)
      if (motor === 'paginas') mostrarPagina(indice);
      else mostrarPosicao(indice);
      return;
    }
    const anterior = modoAtual;
    modoAtual = motor;
    if (anterior === 'vertical') desmontarRolo();
    if (motor === 'vertical') {
      zerarZoom();
      imagem.removeAttribute('src');
      paginas.manterPerto(indice);
      montarRolo();
    } else {
      mostrarPagina(indice);
    }
  }

  // ---------- Tela acesa (Wake Lock) ----------
  // O iPhone solta a trava quando o app sai da tela: ao voltar, ela é pedida de novo.

  let trava = null;
  let situacaoTela = 'wakeLock' in navigator ? null : 'indisponivel';

  async function pedirTelaAcesa() {
    if (situacaoTela === 'indisponivel') return;
    try {
      trava = await navigator.wakeLock.request('screen');
      situacaoTela = 'ativa';
      trava.addEventListener('release', () => { trava = null; });
    } catch {
      situacaoTela = 'recusada';
    }
  }

  function soltarTelaAcesa() {
    trava?.release().catch(() => {});
    trava = null;
    if (situacaoTela === 'ativa') situacaoTela = null;
  }

  function aoVoltarAoApp() {
    if (document.visibilityState === 'visible' && p.telaAcesa && !trava) pedirTelaAcesa();
  }
  document.addEventListener('visibilitychange', aoVoltarAoApp);

  function aoGirar() {
    if (modoAtual === 'paginas') mostrarPagina(indice);
  }
  paisagem.addEventListener('change', aoGirar);

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

  // ---------- Zoom (modo páginas) ----------

  /** Ponto da tela relativo ao centro da página, que é a origem do zoom. */
  function relativo(x, y) {
    const caixa = area.getBoundingClientRect();
    return { x: x - (caixa.left + caixa.width / 2), y: y - (caixa.top + caixa.height / 2) };
  }

  function aplicarZoom({ animar = false } = {}) {
    // A imagem ampliada pode ir até a borda da tela, não além
    const tela = camada.getBoundingClientRect();
    const limiteX = Math.max(0, (imagem.offsetWidth * zoom.s - tela.width) / 2);
    const limiteY = Math.max(0, (imagem.offsetHeight * zoom.s - tela.height) / 2);
    zoom.x = limitar(zoom.x, -limiteX, limiteX);
    zoom.y = limitar(zoom.y, -limiteY, limiteY);
    imagem.classList.toggle('leitor__imagem--animando', animar);
    imagem.style.transform = zoom.s === 1 ? '' : `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
    camada.toggleAttribute('data-com-zoom', zoom.s > 1);
    mostrarPosicao(indice);
  }

  function zoomEm(s, foco, opcoes) {
    const anterior = zoom.s;
    zoom.s = limitar(s, 1, ZOOM_MAXIMO);
    // O ponto sob o dedo (ou o toque) continua no mesmo lugar depois do zoom
    zoom.x = foco.x - ((foco.x - zoom.x) * zoom.s) / anterior;
    zoom.y = foco.y - ((foco.y - zoom.y) * zoom.s) / anterior;
    aplicarZoom(opcoes);
  }

  function zerarZoom(opcoes) {
    zoom.s = 1;
    zoom.x = 0;
    zoom.y = 0;
    aplicarZoom(opcoes);
  }

  // ---------- Gestos na página ----------

  const ponteiros = new Map();
  let gesto = null;
  let toquePendente = null;

  const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const meio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  function tocar(x, y) {
    esconderDica();
    const caixa = toques.getBoundingClientRect();
    const fracao = (x - caixa.left) / caixa.width;

    if (fracao < ZONA_LATERAL || fracao > 1 - ZONA_LATERAL) {
      const esquerda = fracao < ZONA_LATERAL;
      (esquerda === (p.direcao === 'rtl') ? avancar : voltar)();
      return;
    }

    if (dupla()) {
      definirControles(!controles);
      return;
    }
    // Centro: espera um instante para saber se é toque duplo (zoom) ou simples (controles)
    if (toquePendente && Math.hypot(x - toquePendente.x, y - toquePendente.y) < 40) {
      clearTimeout(toquePendente.timer);
      toquePendente = null;
      if (zoom.s > 1) zerarZoom({ animar: true });
      else zoomEm(2, relativo(x, y), { animar: true });
      return;
    }
    toquePendente = {
      x,
      y,
      timer: setTimeout(() => {
        toquePendente = null;
        definirControles(!controles);
      }, TOQUE_DUPLO_MS),
    };
  }

  toques.addEventListener('pointerdown', (evento) => {
    ponteiros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    if (ponteiros.size === 2 && !dupla()) {
      const [a, b] = ponteiros.values();
      const centro = meio(a, b);
      gesto = { tipo: 'pinca', d0: distancia(a, b) || 1, s0: zoom.s, f0: relativo(centro.x, centro.y), x0: zoom.x, y0: zoom.y };
    } else if (ponteiros.size === 1) {
      gesto = { tipo: 'toque', x: evento.clientX, y: evento.clientY, x0: zoom.x, y0: zoom.y };
    }
  });

  toques.addEventListener('pointermove', (evento) => {
    if (!ponteiros.has(evento.pointerId)) return;
    ponteiros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });

    if (gesto?.tipo === 'pinca' && ponteiros.size >= 2) {
      const [a, b] = ponteiros.values();
      const centro = meio(a, b);
      const f = relativo(centro.x, centro.y);
      zoom.s = limitar((gesto.s0 * distancia(a, b)) / gesto.d0, 1, ZOOM_MAXIMO);
      zoom.x = f.x - ((gesto.f0.x - gesto.x0) * zoom.s) / gesto.s0;
      zoom.y = f.y - ((gesto.f0.y - gesto.y0) * zoom.s) / gesto.s0;
      aplicarZoom();
    } else if (gesto?.tipo === 'toque' && zoom.s > 1) {
      // Com zoom, arrastar move a imagem (e não vira a página)
      zoom.x = gesto.x0 + evento.clientX - gesto.x;
      zoom.y = gesto.y0 + evento.clientY - gesto.y;
      aplicarZoom();
    }
  });

  function fimDoPonteiro(evento, cancelado) {
    if (!ponteiros.delete(evento.pointerId)) return;
    if (gesto?.tipo === 'pinca') {
      if (ponteiros.size === 0) {
        gesto = null;
        if (zoom.s < 1.05) zerarZoom({ animar: true });
      }
      return;
    }
    const atual = gesto;
    gesto = null;
    if (cancelado || atual?.tipo !== 'toque') return;

    const dx = evento.clientX - atual.x;
    const dy = evento.clientY - atual.y;
    const parado = Math.abs(dx) <= TOQUE_MAXIMO && Math.abs(dy) <= TOQUE_MAXIMO;
    if (zoom.s > 1 && !parado) return; // foi arrasto da imagem

    if (zoom.s === 1 && Math.abs(dx) >= DESLIZE_MINIMO && Math.abs(dx) > Math.abs(dy) * 1.2) {
      esconderDica();
      // O deslize segue a direção: no mangá, puxar para a direita traz a próxima página
      (Math.sign(dx) === (p.direcao === 'rtl' ? 1 : -1) ? avancar : voltar)();
      return;
    }
    if (parado) tocar(evento.clientX, evento.clientY);
  }
  toques.addEventListener('pointerup', (evento) => fimDoPonteiro(evento, false));
  // Os toques do leitor não geram clique: ele cairia no que está por baixo ao concluir o volume
  toques.addEventListener('touchend', (evento) => evento.preventDefault(), { passive: false });
  toques.addEventListener('pointercancel', (evento) => fimDoPonteiro(evento, true));
  // Safari antigo trata a pinça como zoom da página inteira
  camada.addEventListener('gesturestart', (evento) => evento.preventDefault());

  // Rolagem vertical: o rolo rola sozinho; um toque parado alterna os controles
  let toqueNoRolo = null;
  rolo.addEventListener('pointerdown', (evento) => {
    toqueNoRolo = { x: evento.clientX, y: evento.clientY };
  });
  rolo.addEventListener('pointercancel', () => { toqueNoRolo = null; });
  rolo.addEventListener('pointerup', (evento) => {
    if (!toqueNoRolo) return;
    const parado = Math.hypot(evento.clientX - toqueNoRolo.x, evento.clientY - toqueNoRolo.y) <= TOQUE_MAXIMO;
    toqueNoRolo = null;
    esconderDica();
    if (parado) definirControles(!controles);
  });

  // ---------- Slider de pérolas ----------

  let arrastando = false;
  function indiceNoSlider(evento) {
    const caixa = slider.getBoundingClientRect();
    const fracao = limitar((evento.clientX - caixa.left) / caixa.width, 0, 1);
    return limitar(Math.round(fracao * total) - 1, 0, total - 1);
  }
  slider.addEventListener('pointerdown', (evento) => {
    arrastando = true;
    slider.setPointerCapture(evento.pointerId);
    mostrarPosicao(indiceNoSlider(evento));
  });
  slider.addEventListener('pointermove', (evento) => {
    if (arrastando) mostrarPosicao(indiceNoSlider(evento));
  });
  slider.addEventListener('pointerup', (evento) => {
    if (!arrastando) return;
    arrastando = false;
    // Só ao soltar a página é extraída: arrastar não descompacta cada página do caminho
    irPara(indiceNoSlider(evento));
  });
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

  // ---------- Opções de leitura ----------

  function desenharOpcoes() {
    const rolagem = painelOpcoes.querySelector('.rolagem');
    const topo = rolagem?.scrollTop ?? 0;
    painelOpcoes.innerHTML = renderOpcoes(v.serie, p, situacaoTela);
    painelOpcoes.querySelector('.rolagem').scrollTop = topo;
  }

  function abrirOpcoes() {
    p = preferenciasDaSerie(v.serie);
    desenharOpcoes();
    painelOpcoes.hidden = false;
    requestAnimationFrame(() => {
      painelOpcoes.dataset.aberto = '';
      painelOpcoes.focus({ preventScroll: true });
    });
  }

  function fecharOpcoes(depois) {
    delete painelOpcoes.dataset.aberto;
    setTimeout(() => {
      painelOpcoes.hidden = true;
      painelOpcoes.innerHTML = '';
      aplicarPreferencias();
      camada.focus({ preventScroll: true });
      depois?.();
    }, SAIDA_MS);
  }

  painelOpcoes.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('[data-opcao]');
    if (!alvo || alvo.disabled) return;
    const { opcao, valor } = alvo.dataset;
    if (opcao === 'fechar') return fecharOpcoes();
    if (opcao === 'ver-zoom') return fecharOpcoes(() => zoomEm(2, { x: 0, y: 0 }, { animar: true }));
    if (opcao === 'telaAcesa') {
      if (valor !== 'tentar') definirPreferenciaDaSerie(v.serie, 'telaAcesa', !p.telaAcesa);
      p = preferenciasDaSerie(v.serie);
      if (!p.telaAcesa) soltarTelaAcesa();
      // O pedido sai deste toque: o Safari só concede a trava com um gesto da pessoa
      (p.telaAcesa ? pedirTelaAcesa() : Promise.resolve()).then(desenharOpcoes);
      return;
    }
    if (opcao === 'direcao' || opcao === 'modo') definirPreferenciaDaSerie(v.serie, opcao, valor);
    else if (['pretoPuro', 'sepia', 'proximoAutomatico'].includes(opcao)) definirPreferenciaDaSerie(v.serie, opcao, !p[opcao]);
    p = preferenciasDaSerie(v.serie);
    desenharOpcoes();
    painelOpcoes.querySelector(`[data-opcao="${opcao}"][aria-pressed="true"]`)?.focus({ preventScroll: true });
  });

  // ---------- Botões e teclado ----------

  camada.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('[data-leitor]');
    if (!alvo) return;
    const acao = alvo.dataset.leitor;
    if (acao === 'fechar') fechar();
    else if (acao === 'marcar') {
      alternarMarcador(v.id, indice + 1);
      mostrarPosicao(indice);
    } else if (acao === 'ajustar') {
      if (modoAtual === 'vertical') avisar('O zoom é só no modo Páginas.');
      else zerarZoom({ animar: true });
    } else if (acao === 'opcoes') abrirOpcoes();
    else if (acao === 'concluir') concluir();
    else if (acao === 'anotar') aoAnotar(v.id, indice + 1);
  });

  camada.addEventListener('keydown', (evento) => {
    if (!painelOpcoes.hidden) {
      if (evento.key === 'Escape') fecharOpcoes();
      return;
    }
    const paraEsquerda = p.direcao === 'rtl' ? avancar : voltar;
    const paraDireita = p.direcao === 'rtl' ? voltar : avancar;
    if (evento.key === 'Escape') fechar();
    else if (evento.key === 'ArrowLeft') paraEsquerda();
    else if (evento.key === 'ArrowRight') paraDireita();
    else if (evento.key === ' ') definirControles(!controles);
    else return;
    evento.preventDefault();
  });

  function fechar(depois) {
    if (aberto?.camada !== camada) return;
    aberto = null;
    clearTimeout(dicaTimer);
    clearTimeout(toquePendente?.timer);
    soltarTelaAcesa();
    document.removeEventListener('visibilitychange', aoVoltarAoApp);
    paisagem.removeEventListener('change', aoGirar);
    desmontarRolo();
    paginas.fechar();
    // A camada segura os toques até sair: senão o clique que vem depois do último toque
    // cairia na capa que está por baixo e reabriria o volume
    delete camada.dataset.aberto;
    setTimeout(() => {
      for (const irmao of raiz.children) if (irmao !== camada) irmao.inert = false;
      camada.remove();
      if (depois) depois();
      else aoFechar(id);
    }, SAIDA_MS);
  }

  aplicarPreferencias();
}
