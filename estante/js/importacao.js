// Leitura de um CBZ/ZIP na importação: valida, lista as páginas em ordem,
// gera a miniatura da capa e deduz série e volume pelo nome do arquivo.
// Não grava nada: quem guarda é o store.

import { lerIndice, lerEntrada, legivel } from './zip.js';

const TIPOS = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
};

// Largura da miniatura: a capa da grade tem ~165 pt, ou seja ~500 px numa tela 3x.
// 360 px fica nítido o bastante e mantém cada capa perto de 30 KB.
const LARGURA_DA_CAPA = 360;

/** Mensagem que vai para o cartão de resultado daquele arquivo. */
export class ErroDeImportacao extends Error {}

// Ordem natural: página 2 antes da 10, como pede a especificação
const colador = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export const tipoDaImagem = (nome) => TIPOS[nome.split('.').pop().toLowerCase()];

// Pastas de sistema que entram no ZIP sem querer (macOS, arquivos ocultos)
const deSistema = (nome) => nome.split('/').some((parte) => parte.startsWith('.') || parte === '__MACOSX');

/**
 * Deduz série e volume do nome do arquivo.
 * "Nana v02.cbz", "[Grupo] One Piece Vol. 100 (Digital).cbz", "Berserk_Volume_41.zip", "Nana - 05.cbz".
 * Sem número, fica volume 1: a pessoa corrige no resultado.
 */
export function inferirSerieEVolume(nomeDoArquivo) {
  const original = nomeDoArquivo.replace(/\.(cbz|zip)$/i, '').trim();
  const base = original
    .replace(/_/g, ' ')
    .replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let achado = null;
  for (const m of base.matchAll(/(?:^|[\s\-–.,#])(?:v|vol|volume|tomo|t)\.?\s*(\d+(?:[.,]\d+)?)(?!\d)/gi)) achado = m;
  achado ??= base.match(/(?:^|[\s\-–#])(\d+(?:[.,]\d+)?)$/);

  if (!achado) return { serie: base || original || nomeDoArquivo, numero: 1 };
  const serie = base.slice(0, achado.index).replace(/[\s\-–.,#:]+$/, '').trim();
  return { serie: serie || base || original, numero: Number(achado[1].replace(',', '.')) };
}

async function miniatura(imagem) {
  const url = URL.createObjectURL(imagem);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const largura = Math.min(LARGURA_DA_CAPA, img.naturalWidth);
    const altura = Math.max(1, Math.round((img.naturalHeight * largura) / img.naturalWidth));
    const tela = document.createElement('canvas');
    tela.width = largura;
    tela.height = altura;
    const contexto = tela.getContext('2d');
    contexto.imageSmoothingQuality = 'high';
    contexto.drawImage(img, 0, 0, largura, altura);
    const capa = await new Promise((ok) => tela.toBlob(ok, 'image/jpeg', 0.82));
    // O Safari segura a memória do canvas até ele encolher
    tela.width = 0;
    tela.height = 0;
    if (!capa) throw new Error('miniatura vazia');
    return capa;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Lê um arquivo escolhido. Devolve `{ serie, numero, paginas, capa }`, em que `paginas`
 * é o índice das imagens em ordem (o leitor extrai uma a uma depois).
 * Lança ErroDeImportacao com a explicação para a pessoa.
 */
export async function lerVolume(arquivo) {
  if (/\.(cbr|rar)$/i.test(arquivo.name)) {
    throw new ErroDeImportacao('Esse é CBR. Preciso dele em CBZ.');
  }
  if (arquivo.size === 0) throw new ErroDeImportacao('Esse arquivo tá vazinho.');

  let entradas;
  try {
    entradas = await lerIndice(arquivo);
  } catch (erro) {
    // Sem o fim do índice, um ZIP cortado (download interrompido) parece não ser ZIP:
    // a assinatura "PK" no começo do arquivo separa os dois casos.
    const comeco = new Uint8Array(await arquivo.slice(0, 2).arrayBuffer());
    const pareceZip = comeco[0] === 0x50 && comeco[1] === 0x4b;
    if (erro.codigo === 'nao-zip' && !pareceZip) throw new ErroDeImportacao('Esse não é CBZ nem ZIP.');
    throw new ErroDeImportacao('Esse arquivo veio quebradinho ou pela metade.');
  }

  const imagens = entradas.filter((e) => !e.nome.endsWith('/') && !deSistema(e.nome) && tipoDaImagem(e.nome));
  if (imagens.length === 0) throw new ErroDeImportacao('Não achei nenhuma página aqui dentro.');
  if (imagens.some((e) => e.cifrado)) throw new ErroDeImportacao('Esse ZIP tem senha, não consigo abrir.');
  if (!imagens.every(legivel)) throw new ErroDeImportacao('Esse ZIP foi compactado de um jeito que eu não leio.');

  imagens.sort((a, b) => colador.compare(a.nome, b.nome));

  let capa;
  try {
    capa = await miniatura(await lerEntrada(arquivo, imagens[0], tipoDaImagem(imagens[0].nome)));
  } catch {
    throw new ErroDeImportacao('Não consegui abrir a primeira página. Acho que o arquivo tá quebradinho.');
  }

  return {
    ...inferirSerieEVolume(arquivo.name),
    paginas: imagens.map(({ nome, metodo, comprimido, tamanho, local }) => ({ nome, metodo, comprimido, tamanho, local })),
    capa,
  };
}
