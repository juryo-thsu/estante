// "Anotar página": editor de anotações. Abre por cima do app (e do leitor, que fica pausado).
// As marcas vão para uma camada separada, em coordenadas de 0 a 1 sobre a página;
// a imagem original nunca é alterada.

import { volume, anotacaoDa, salvarAnotacao } from '../store.js';
import { esc, icone, camadaDeMarcas, capituloDe, doisDigitos } from '../ui.js';
import { extrairPagina } from '../paginas.js';

const FERRAMENTAS = [
  ['caneta', 'Caneta', 'pen'],
  ['circulo', 'Círculo', 'circulo'],
  ['texto', 'Texto', 'texto'],
  ['borracha', 'Borracha', 'borracha'],
];
const ESPESSURAS = [2, 3, 5];
const ALCANCE_DA_BORRACHA = 14; // px em volta do dedo
const SAIDA_MS = 180;

let aberto = null;

export const editorAberto = () => Boolean(aberto);

const limitar = (valor) => Math.min(1, Math.max(0, valor));

function modelo(v, pagina, capitulo, url) {
  const contexto = [v.serie, `v${doisDigitos(v.numero)}`, capitulo != null ? `Cap. ${capitulo}` : null, `Pág. ${pagina}`].filter(Boolean).join(' · ');
  return `<header class="editor__topo">
      <button class="editor__cancelar" type="button" data-editor="cancelar">Cancelar</button>
      <h1 class="editor__titulo">Anotar página</h1>
      <button class="botao editor__salvar" type="button" data-editor="salvar">Salvar</button>
    </header>
    <div class="editor__contexto">
      <p>${esc(contexto)}</p>
      <p class="editor__situacao" aria-live="polite"></p>
    </div>
    <div class="editor__area">
      <div class="editor__folha">
        <img class="editor__imagem" src="${esc(url)}" alt="Página ${pagina}" draggable="false">
        <div class="editor__camada"></div>
        <div class="editor__toque" aria-hidden="true"></div>
      </div>
    </div>
    <div class="editor__visibilidade">
      <button class="editor__olho" type="button" data-editor="original">${icone('olho', 18)}<span class="editor__olho-rotulo">Ver original</span></button>
      <p class="editor__preservado">A página fica intacta</p>
    </div>
    <div class="editor__ferramentas">
      <div class="editor__selecao" role="group" aria-label="Ferramenta">
        ${FERRAMENTAS.map(([id, nome, simbolo]) => `<button class="ferramenta-anotar" type="button" data-editor="ferramenta" data-ferramenta="${id}" aria-pressed="false">
          ${icone(simbolo, 20)}<span>${nome}</span></button>`).join('')}
      </div>
      <div class="editor__ajustes">
        <div class="editor__cores" role="group" aria-label="Cor da marcação">
          <button class="cor cor--pressed" type="button" data-editor="cor" data-cor="pressed" aria-label="Rosa" aria-pressed="true"></button>
          <button class="cor cor--accent" type="button" data-editor="cor" data-cor="accent" aria-label="Dourado" aria-pressed="false"></button>
        </div>
        <button class="editor__espessura" type="button" data-editor="espessura" aria-label="Espessura da caneta"></button>
        <button class="editor__historico" type="button" data-editor="desfazer" aria-label="Desfazer">${icone('desfazer', 20)}</button>
        <button class="editor__historico" type="button" data-editor="refazer" aria-label="Refazer">${icone('refazer', 20)}</button>
      </div>
    </div>
    <div class="editor__observacao">
      <label class="editor__rotulo" for="editor-observacao">Observação</label>
      <input class="editor__campo" id="editor-observacao" type="text" autocomplete="off" enterkeyhint="done" placeholder="O que essa página te fez sentir?">
    </div>`;
}

/**
 * Abre o editor da página `pagina` (de 1 a `paginas`).
 * `aoSalvar(id, pagina)` e `aoFechar()` são chamados depois que a camada sai.
 */
export async function abrirEditor(id, pagina, { raiz, avisar, aoSalvar = () => {}, aoFechar = () => {} }) {
  const v = volume(id);
  if (!v || aberto) return;
  if (!v.temArquivo) {
    avisar('Esse precisa do arquivo de novo pra anotar, amor.');
    return;
  }
  aberto = { id };

  let url;
  try {
    url = await extrairPagina(v, pagina - 1);
  } catch (erro) {
    console.error(erro);
    aberto = null;
    avisar('Essa página não quis abrir, amor.');
    return;
  }

  const existente = anotacaoDa(id, pagina);
  const entrada = v.paginasDoArquivo?.[pagina - 1];
  const capitulo = existente?.capitulo ?? capituloDe(entrada?.nome);
  let marcas = structuredClone(existente?.marcas || []);
  const desfeitos = [];
  const refeitos = [];
  let ferramenta = 'caneta';
  let cor = 'pressed';
  let espessura = 3;
  let mostrarMarcas = true;
  let alterado = false;

  const camada = document.createElement('div');
  camada.className = 'editor';
  camada.setAttribute('role', 'dialog');
  camada.setAttribute('aria-modal', 'true');
  camada.setAttribute('aria-label', 'Anotar página');
  camada.tabIndex = -1;
  camada.innerHTML = modelo(v, pagina, capitulo, url);

  const $ = (seletor) => camada.querySelector(seletor);
  const folha = $('.editor__folha');
  const camadaDasMarcas = $('.editor__camada');
  const toque = $('.editor__toque');
  const situacao = $('.editor__situacao');
  const campo = $('.editor__campo');
  campo.value = existente?.observacao || '';

  // O que estava inerte antes (o app, com o leitor aberto ou não) volta igual ao fechar
  const inertesAntes = [...raiz.children].map((el) => [el, el.inert]);
  aberto = { id, camada };
  raiz.append(camada);
  for (const [el] of inertesAntes) el.inert = true;
  requestAnimationFrame(() => {
    camada.dataset.aberto = '';
    camada.focus({ preventScroll: true });
  });

  // ---------- Desenho da tela ----------

  let rascunho = null; // marca em andamento (ainda fora do histórico)

  function desenharMarcas() {
    camadaDasMarcas.innerHTML = camadaDeMarcas(rascunho ? [...marcas, rascunho] : marcas, { oculta: !mostrarMarcas });
  }

  function desenharControles() {
    for (const botao of camada.querySelectorAll('[data-ferramenta]')) {
      botao.setAttribute('aria-pressed', String(botao.dataset.ferramenta === ferramenta));
    }
    for (const botao of camada.querySelectorAll('[data-cor]')) {
      botao.setAttribute('aria-pressed', String(botao.dataset.cor === cor));
    }
    $('.editor__espessura').textContent = `${espessura} px`;
    $('[data-editor="desfazer"]').disabled = desfeitos.length === 0;
    $('[data-editor="refazer"]').disabled = refeitos.length === 0;
    $('.editor__olho-rotulo').textContent = mostrarMarcas ? 'Ver original' : 'Mostrar marcas';
    situacao.textContent = alterado || !existente ? 'Ainda não salvei' : 'Guardado';
    folha.dataset.ferramenta = ferramenta;
  }

  function mudar(novas) {
    desfeitos.push(marcas);
    refeitos.length = 0;
    marcas = novas;
    alterado = true;
    desenharMarcas();
    desenharControles();
  }

  // ---------- Gestos na página ----------

  function ponto(evento) {
    const caixa = folha.getBoundingClientRect();
    return { x: limitar((evento.clientX - caixa.left) / caixa.width), y: limitar((evento.clientY - caixa.top) / caixa.height), caixa };
  }

  /** Índice da marca sob o dedo (a de cima primeiro), ou -1. */
  function marcaEm(evento) {
    const { x, y, caixa } = ponto(evento);
    const px = x * caixa.width;
    const py = y * caixa.height;
    for (let i = marcas.length - 1; i >= 0; i--) {
      const m = marcas[i];
      if (m.tipo === 'caneta') {
        if (m.pontos.some(([mx, my]) => Math.hypot(mx * caixa.width - px, my * caixa.height - py) < ALCANCE_DA_BORRACHA)) return i;
      } else if (m.tipo === 'circulo') {
        const rx = (m.w / 2) * caixa.width;
        const ry = (m.h / 2) * caixa.height;
        const cx = (m.x + m.w / 2) * caixa.width;
        const cy = (m.y + m.h / 2) * caixa.height;
        const r = Math.hypot((px - cx) / Math.max(rx, 1), (py - cy) / Math.max(ry, 1));
        if (Math.abs(r - 1) * Math.min(rx, ry) < ALCANCE_DA_BORRACHA) return i;
      } else if (m.tipo === 'texto') {
        const caixaDoTexto = camadaDasMarcas.querySelector(`.marca-texto[data-marca="${i}"]`)?.getBoundingClientRect();
        if (caixaDoTexto && evento.clientX >= caixaDoTexto.left - 8 && evento.clientX <= caixaDoTexto.right + 8
          && evento.clientY >= caixaDoTexto.top - 8 && evento.clientY <= caixaDoTexto.bottom + 8) return i;
      }
    }
    return -1;
  }

  let inicio = null;
  let apagadas = null;

  toque.addEventListener('pointerdown', (evento) => {
    if (!evento.isPrimary || !mostrarMarcas) return;
    toque.setPointerCapture(evento.pointerId);
    const p = ponto(evento);
    inicio = p;
    if (ferramenta === 'caneta') rascunho = { tipo: 'caneta', cor, espessura, pontos: [[p.x, p.y]] };
    else if (ferramenta === 'circulo') rascunho = { tipo: 'circulo', cor, espessura, x: p.x, y: p.y, w: 0, h: 0 };
    else if (ferramenta === 'borracha') {
      apagadas = marcas;
      apagarEm(evento);
    }
  });

  function apagarEm(evento) {
    const i = marcaEm(evento);
    if (i < 0) return;
    marcas = marcas.filter((_, k) => k !== i);
    desenharMarcas();
  }

  let quadro = 0;
  toque.addEventListener('pointermove', (evento) => {
    if (!inicio) return;
    const p = ponto(evento);
    if (ferramenta === 'caneta' && rascunho) {
      const [ux, uy] = rascunho.pontos.at(-1);
      // Pula pontos colados: o traço fica leve sem perder a forma
      if (Math.hypot((p.x - ux) * p.caixa.width, (p.y - uy) * p.caixa.height) < 2) return;
      rascunho.pontos.push([Number(p.x.toFixed(4)), Number(p.y.toFixed(4))]);
    } else if (ferramenta === 'circulo' && rascunho) {
      Object.assign(rascunho, { x: Math.min(inicio.x, p.x), y: Math.min(inicio.y, p.y), w: Math.abs(p.x - inicio.x), h: Math.abs(p.y - inicio.y) });
    } else if (ferramenta === 'borracha') {
      apagarEm(evento);
      return;
    } else {
      return;
    }
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(desenharMarcas);
  });

  function terminar(evento, cancelado) {
    if (!inicio) return;
    const comeco = inicio;
    inicio = null;
    const marca = rascunho;
    rascunho = null;

    if (ferramenta === 'borracha') {
      const novas = marcas;
      marcas = apagadas;
      apagadas = null;
      if (novas.length !== marcas.length) mudar(novas);
      return;
    }
    if (cancelado) {
      desenharMarcas();
      return;
    }
    if (ferramenta === 'caneta' && marca?.pontos.length > 1) mudar([...marcas, marca]);
    else if (ferramenta === 'circulo' && marca && marca.w * comeco.caixa.width > 8 && marca.h * comeco.caixa.height > 8) mudar([...marcas, marca]);
    else if (ferramenta === 'texto') pedirTexto(ponto(evento));
    else desenharMarcas();
  }
  toque.addEventListener('pointerup', (evento) => terminar(evento, false));
  toque.addEventListener('pointercancel', (evento) => terminar(evento, true));

  /** Ferramenta Texto: um campo aparece onde o dedo tocou; Enter ou sair do campo grava. */
  function pedirTexto(p) {
    folha.querySelector('.editor__texto-novo')?.remove();
    const entradaDeTexto = document.createElement('input');
    entradaDeTexto.className = 'editor__texto-novo';
    entradaDeTexto.type = 'text';
    entradaDeTexto.enterKeyHint = 'done';
    entradaDeTexto.setAttribute('aria-label', 'Texto da anotação');
    entradaDeTexto.style.left = `${(p.x * 100).toFixed(2)}%`;
    entradaDeTexto.style.top = `${(p.y * 100).toFixed(2)}%`;
    folha.append(entradaDeTexto);
    entradaDeTexto.focus();
    let feito = false;
    const gravar = () => {
      if (feito) return;
      feito = true;
      const texto = entradaDeTexto.value.trim();
      entradaDeTexto.remove();
      if (texto) mudar([...marcas, { tipo: 'texto', cor, x: Number(p.x.toFixed(4)), y: Number(p.y.toFixed(4)), texto }]);
    };
    entradaDeTexto.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') gravar();
      if (evento.key === 'Escape') {
        feito = true;
        entradaDeTexto.remove();
      }
      evento.stopPropagation();
    });
    entradaDeTexto.addEventListener('blur', gravar);
  }

  // ---------- Botões ----------

  campo.addEventListener('input', () => {
    alterado = true;
    desenharControles();
  });
  campo.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') campo.blur();
    evento.stopPropagation();
  });

  camada.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('[data-editor]');
    if (!alvo || alvo.disabled) return;
    const acao = alvo.dataset.editor;
    if (acao === 'cancelar') fechar(aoFechar);
    else if (acao === 'salvar') salvar();
    else if (acao === 'ferramenta') ferramenta = alvo.dataset.ferramenta;
    else if (acao === 'cor') cor = alvo.dataset.cor;
    else if (acao === 'espessura') espessura = ESPESSURAS[(ESPESSURAS.indexOf(espessura) + 1) % ESPESSURAS.length];
    else if (acao === 'original') {
      mostrarMarcas = !mostrarMarcas;
      desenharMarcas();
    } else if (acao === 'desfazer' && desfeitos.length) {
      refeitos.push(marcas);
      marcas = desfeitos.pop();
      alterado = true;
      desenharMarcas();
    } else if (acao === 'refazer' && refeitos.length) {
      desfeitos.push(marcas);
      marcas = refeitos.pop();
      alterado = true;
      desenharMarcas();
    }
    desenharControles();
  });

  camada.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fechar(aoFechar);
  });

  function salvar() {
    folha.querySelector('.editor__texto-novo')?.blur();
    salvarAnotacao(id, {
      pagina,
      capitulo,
      pageId: entrada?.nome ?? existente?.pageId ?? null,
      marcas,
      observacao: campo.value.trim(),
      criadaEm: existente?.criadaEm ?? Date.now(),
      editadaEm: Date.now(),
    });
    fechar(() => aoSalvar(id, pagina));
  }

  function fechar(depois) {
    if (aberto?.camada !== camada) return;
    aberto = null;
    delete camada.dataset.aberto;
    setTimeout(() => {
      for (const [el, estava] of inertesAntes) el.inert = estava;
      camada.remove();
      URL.revokeObjectURL(url);
      depois?.();
    }, SAIDA_MS);
  }

  desenharMarcas();
  desenharControles();
}
