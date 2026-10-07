// Pedaços de interface usados por mais de uma tela.

import { lido, naoLido } from './store.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const doisDigitos = (n) => String(n).padStart(2, '0');
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export const nomeLongo = (v) => `${v.serie} · Volume ${doisDigitos(v.numero)}`;
export const nomeCurto = (v) => `${v.serie} · v${doisDigitos(v.numero)}`;

/** Estado de leitura como aparece embaixo da capa. */
export function estadoDeLeitura(v) {
  if (!v.temArquivo) return 'Arquivo removido';
  if (naoLido(v)) return 'Não lido';
  if (lido(v)) return `Lido · ${v.paginas} / ${v.paginas}`;
  return `Página ${v.pagina} / ${v.paginas}`;
}

/** Bytes em unidades decimais, como o app Arquivos mostra: "71 MB", "1,2 GB". */
export function tamanhoLegivel(bytes = 0) {
  if (bytes < 1e6) return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
  if (bytes < 1e9) return `${Math.round(bytes / 1e6)} MB`;
  return `${(bytes / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
}

export function porcentagem(v) {
  return Math.round((v.pagina / v.paginas) * 100);
}

export function quando(momento, agora = Date.now()) {
  const meiaNoite = (t) => new Date(t).setHours(0, 0, 0, 0);
  const dias = Math.round((meiaNoite(agora) - meiaNoite(momento)) / 86400000);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return `Há ${dias} dias`;
}

export function icone(nome, tamanho) {
  return `<span class="icone icone--${nome}${tamanho ? ` icone--${tamanho}` : ''}" aria-hidden="true"></span>`;
}

/** Capa do volume: a miniatura feita na importação. Sem ela, um cartão com o número. */
export function capa(v, variante = '') {
  const classe = variante ? ` capa--${variante}` : '';
  if (v.capa) {
    return `<span class="capa${classe}"><img src="${esc(v.capa)}" alt="" loading="lazy" decoding="async" draggable="false"></span>`;
  }
  return `<span class="capa capa--sem-imagem${classe}" aria-hidden="true">
    <span class="capa__numero">${esc(v.numero)}</span>
  </span>`;
}

/**
 * Capítulo da página pela pasta dentro do ZIP ("Cap 03/012.jpg", "Chapter 3/…", "c003/…").
 * Página solta na raiz do ZIP não tem capítulo.
 */
export function capituloDe(nomeDaEntrada = '') {
  const pasta = nomeDaEntrada.split('/').slice(0, -1).pop();
  if (!pasta) return null;
  const achado = pasta.match(/(?:cap(?:[íi]tulo)?|ch(?:apter)?|c)[\s._-]*0*(\d+)/i) || pasta.match(/0*(\d+)(?!.*\d)/);
  return achado ? Number(achado[1]) : null;
}

const CORES_DAS_MARCAS = { pressed: 'var(--color-pressed)', accent: 'var(--color-accent)' };

/**
 * Camada de marcas sobre a página: traços e círculos num SVG de 0 a 1 (traço com espessura
 * real, em px), textos em HTML posicionados em %. Serve para o editor e para as miniaturas.
 */
export function camadaDeMarcas(marcas = [], { oculta = false } = {}) {
  const vetores = marcas.map((m, i) => {
    const cor = CORES_DAS_MARCAS[m.cor] || CORES_DAS_MARCAS.pressed;
    const estilo = `stroke:${cor};stroke-width:${Number(m.espessura) || 3}px`;
    if (m.tipo === 'caneta' && m.pontos?.length) {
      const d = m.pontos.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(4)} ${y.toFixed(4)}`).join('');
      return `<path class="marca" data-marca="${i}" d="${d}" style="${estilo}"/>`;
    }
    if (m.tipo === 'circulo') {
      return `<ellipse class="marca" data-marca="${i}" cx="${(m.x + m.w / 2).toFixed(4)}" cy="${(m.y + m.h / 2).toFixed(4)}" rx="${(m.w / 2).toFixed(4)}" ry="${(m.h / 2).toFixed(4)}" style="${estilo}"/>`;
    }
    return '';
  }).join('');
  const textos = marcas.map((m, i) => (m.tipo === 'texto'
    ? `<span class="marca-texto" data-marca="${i}" style="left:${(m.x * 100).toFixed(2)}%;top:${(m.y * 100).toFixed(2)}%">${esc(m.texto)}</span>`
    : '')).join('');
  return `<div class="marcas"${oculta ? ' hidden' : ''}>
    <svg class="marcas__vetores" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">${vetores}</svg>${textos}
  </div>`;
}

/** Componente "Estante / Mangá": capa, série, volume, estado e o botão ⋯. */
export function cartaoDeVolume(v, { favorito = false, pulsar = false } = {}) {
  const nome = `${v.serie}, volume ${doisDigitos(v.numero)}`;
  return `<article class="volume${v.temArquivo ? '' : ' volume--sem-arquivo'}" data-volume="${esc(v.id)}">
    <button class="volume__abrir" type="button" data-acao="abrir" data-id="${esc(v.id)}" aria-label="Abrir ${esc(nome)}. ${esc(estadoDeLeitura(v))}">
      ${capa(v)}
      <span class="volume__identificacao">
        <span class="volume__serie">${esc(v.serie)}</span>
        <span class="volume__numero">Volume ${doisDigitos(v.numero)}</span>
      </span>
      <span class="volume__estado">${esc(estadoDeLeitura(v))}</span>
    </button>
    ${favorito ? `<span class="coracao volume__favorito${pulsar ? ' pulsando' : ''}" role="img" aria-label="Favorito"></span>` : ''}
    <button class="volume__acoes" type="button" data-acao="acoes" data-id="${esc(v.id)}" aria-label="Ações de ${esc(nome)}">⋯</button>
  </article>`;
}

/** Componente "Estante / Progresso de pérolas". `fracao` vai de 0 a 1. */
export function perolas(fracao, rotulo) {
  const p = Math.min(1, Math.max(0, fracao));
  const contas = Array.from({ length: 7 }, (_, i) => `<span class="perolas__perola" style="--i:${i}"></span>`).join('');
  return `<div class="perolas" role="progressbar" aria-label="${esc(rotulo)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}" style="--p:${p.toFixed(4)}">
    <span class="perolas__fio"></span>${contas}
    <svg class="perolas__pingente" viewBox="10 0 6 8" aria-hidden="true"><path d="M13 0L16 4L13 8L10 4L13 0Z"/></svg>
  </div>`;
}

/** Bloco dos estados vazios: ícone de 48 px, título e mensagem. */
export function mensagemVazia({ nomeIcone, titulo, linhas, convite = false }) {
  return `<div class="vazio${convite ? ' vazio--convite' : ''}">
    ${icone(nomeIcone, 48)}
    <h2 class="vazio__titulo">${esc(titulo)}</h2>
    <p class="vazio__mensagem">${linhas.map(esc).join('<br>')}</p>
  </div>`;
}
