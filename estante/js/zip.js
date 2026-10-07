// Leitor de ZIP próprio, sem dependência (escolha de J no lugar da zip.js).
// Lê só o índice (diretório central) e, quando pedido, uma entrada por vez, com
// `blob.slice`: o volume nunca é carregado inteiro na memória. Entradas sem compressão
// saem direto do arquivo; as comprimidas passam pelo DecompressionStream do Safari.

const FIM = 0x06054b50;
const FIM_64 = 0x06064b50;
const LOCALIZADOR_64 = 0x07064b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

const SEM_VALOR_16 = 0xffff;
const SEM_VALOR_32 = 0xffffffff;

export class ErroZip extends Error {
  /** `codigo`: 'nao-zip' | 'corrompido' | 'compressao' */
  constructor(codigo) {
    super(codigo);
    this.codigo = codigo;
  }
}

async function ler(blob, inicio, fim) {
  if (inicio < 0 || fim > blob.size || inicio > fim) throw new ErroZip('corrompido');
  return new DataView(await blob.slice(inicio, fim).arrayBuffer());
}

const utf8 = new TextDecoder();

/**
 * Lê o diretório central do ZIP.
 * Devolve `[{ nome, metodo, comprimido, tamanho, local, cifrado }]`, na ordem do arquivo.
 */
export async function lerIndice(blob) {
  // O fim do diretório fica nos últimos 22 bytes, mais até 64 KB de comentário
  const tamanhoCauda = Math.min(blob.size, 22 + 0xffff);
  const cauda = await ler(blob, blob.size - tamanhoCauda, blob.size);

  let fim = -1;
  for (let i = cauda.byteLength - 22; i >= 0; i--) {
    if (cauda.getUint32(i, true) === FIM) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new ErroZip('nao-zip');

  let total = cauda.getUint16(fim + 10, true);
  let tamanhoCentral = cauda.getUint32(fim + 12, true);
  let inicioCentral = cauda.getUint32(fim + 16, true);

  // ZIP64: arquivos acima de 4 GB ou com mais de 65 mil entradas
  if (total === SEM_VALOR_16 || tamanhoCentral === SEM_VALOR_32 || inicioCentral === SEM_VALOR_32) {
    const localizador = fim - 20;
    if (localizador >= 0 && cauda.getUint32(localizador, true) === LOCALIZADOR_64) {
      const posicao = Number(cauda.getBigUint64(localizador + 8, true));
      const fim64 = await ler(blob, posicao, posicao + 56);
      if (fim64.getUint32(0, true) !== FIM_64) throw new ErroZip('corrompido');
      total = Number(fim64.getBigUint64(32, true));
      tamanhoCentral = Number(fim64.getBigUint64(40, true));
      inicioCentral = Number(fim64.getBigUint64(48, true));
    }
  }

  const central = await ler(blob, inicioCentral, inicioCentral + tamanhoCentral);
  const entradas = [];
  let o = 0;

  for (let i = 0; i < total; i++) {
    if (o + 46 > central.byteLength || central.getUint32(o, true) !== CENTRAL) throw new ErroZip('corrompido');

    const flags = central.getUint16(o + 8, true);
    const metodo = central.getUint16(o + 10, true);
    let comprimido = central.getUint32(o + 20, true);
    let tamanho = central.getUint32(o + 24, true);
    const tamanhoNome = central.getUint16(o + 28, true);
    const tamanhoExtra = central.getUint16(o + 30, true);
    const tamanhoComentario = central.getUint16(o + 32, true);
    let local = central.getUint32(o + 42, true);

    const inicioNome = o + 46;
    if (inicioNome + tamanhoNome + tamanhoExtra > central.byteLength) throw new ErroZip('corrompido');
    // Sem a flag de UTF-8 o nome deveria ser CP437, mas na prática quase todo
    // compactador grava UTF-8; o pior caso é um nome de página com acento trocado.
    const nome = utf8.decode(new Uint8Array(central.buffer, central.byteOffset + inicioNome, tamanhoNome));

    // Campo extra do ZIP64: traz os valores que não couberam em 32 bits, nesta ordem
    let e = inicioNome + tamanhoNome;
    const fimExtra = e + tamanhoExtra;
    while (e + 4 <= fimExtra) {
      const tipo = central.getUint16(e, true);
      const tamanhoCampo = central.getUint16(e + 2, true);
      if (tipo === 0x0001) {
        let q = e + 4;
        if (tamanho === SEM_VALOR_32) { tamanho = Number(central.getBigUint64(q, true)); q += 8; }
        if (comprimido === SEM_VALOR_32) { comprimido = Number(central.getBigUint64(q, true)); q += 8; }
        if (local === SEM_VALOR_32) { local = Number(central.getBigUint64(q, true)); }
      }
      e += 4 + tamanhoCampo;
    }

    entradas.push({ nome, metodo, comprimido, tamanho, local, cifrado: (flags & 1) === 1 });
    o = fimExtra + tamanhoComentario;
  }

  return entradas;
}

/** O app sabe ler: sem compressão (0) e deflate (8). */
export const legivel = (entrada) => !entrada.cifrado && (entrada.metodo === 0 || entrada.metodo === 8);

/** Extrai uma entrada como Blob do `tipo` pedido. */
export async function lerEntrada(blob, entrada, tipo = '') {
  // O cabeçalho local pode ter um campo extra diferente do central: o início dos dados vem dele
  const local = await ler(blob, entrada.local, entrada.local + 30);
  if (local.getUint32(0, true) !== LOCAL) throw new ErroZip('corrompido');
  const inicio = entrada.local + 30 + local.getUint16(26, true) + local.getUint16(28, true);
  if (inicio + entrada.comprimido > blob.size) throw new ErroZip('corrompido');
  const dados = blob.slice(inicio, inicio + entrada.comprimido, tipo);

  if (entrada.metodo === 0) return dados;
  if (entrada.metodo === 8) {
    const fluxo = dados.stream().pipeThrough(new DecompressionStream('deflate-raw'));
    try {
      const descomprimido = await new Response(fluxo).blob();
      return new Blob([descomprimido], { type: tipo });
    } catch {
      throw new ErroZip('corrompido');
    }
  }
  throw new ErroZip('compressao');
}
