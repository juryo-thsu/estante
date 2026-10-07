// Páginas de um volume para o leitor, extraídas do CBZ guardado uma a uma.
// A especificação pede para não descompactar o volume inteiro: fica na memória só uma janela
// em volta da página atual (uma antes, duas depois), e o que sai dela tem o object URL revogado.
// Revogar solta a referência; quando a memória volta de fato fica a cargo do Safari.

import { lerArquivo } from './db.js';
import { lerEntrada } from './zip.js';
import { tipoDaImagem } from './importacao.js';

const ANTES = 1;
const DEPOIS = 2;

/** Uma página só, fora do leitor (editor de anotações e miniaturas). Devolve um object URL. */
export async function extrairPagina(v, i) {
  const arquivo = await lerArquivo(v.id);
  const entrada = v.paginasDoArquivo?.[i];
  if (!arquivo || !entrada) throw new Error('Página sem arquivo no aparelho');
  return URL.createObjectURL(await lerEntrada(arquivo, entrada, tipoDaImagem(entrada.nome)));
}

export async function abrirPaginas(v) {
  const arquivo = await lerArquivo(v.id);
  const entradas = v.paginasDoArquivo;
  if (!arquivo || !entradas?.length) throw new Error('Volume sem arquivo no aparelho');

  const urls = new Map(); // índice → Promise<object URL>
  let fechado = false;

  function url(i) {
    if (!urls.has(i)) {
      const pedido = lerEntrada(arquivo, entradas[i], tipoDaImagem(entradas[i].nome)).then((imagem) => URL.createObjectURL(imagem));
      // Uma página que falhou pode ser tentada de novo na próxima visita
      pedido.catch(() => urls.delete(i));
      urls.set(i, pedido);
    }
    return urls.get(i);
  }

  const revogar = (pedido) => pedido.then((u) => URL.revokeObjectURL(u), () => {});

  /** Solta o que ficou longe de `i` e já prepara (extrai e decodifica) as vizinhas. */
  function manterPerto(i) {
    for (const [j, pedido] of urls) {
      if (j < i - ANTES || j > i + DEPOIS) {
        urls.delete(j);
        revogar(pedido);
      }
    }
    for (const j of [i + 1, i + 2, i - 1]) {
      if (j < 0 || j >= entradas.length) continue;
      url(j)
        .then((u) => {
          if (fechado) return;
          const img = new Image();
          img.src = u;
          return img.decode();
        })
        .catch(() => {});
    }
  }

  /** Solta uma página que saiu da tela (rolagem vertical). */
  function soltar(i) {
    const pedido = urls.get(i);
    if (!pedido) return;
    urls.delete(i);
    revogar(pedido);
  }

  function fechar() {
    fechado = true;
    for (const pedido of urls.values()) revogar(pedido);
    urls.clear();
  }

  return { total: entradas.length, url, manterPerto, soltar, fechar };
}
