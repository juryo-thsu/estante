// "Anotações — por volume e capítulo": páginas anotadas e marcadas, com miniatura e busca.

import { estado, visiveis, paraRetomar, ordenar } from '../store.js';
import { esc, icone, capa, nomeLongo, plural, camadaDeMarcas, capituloDe, mensagemVazia } from '../ui.js';
import { extrairPagina } from '../paginas.js';

/** Todas as páginas com anotação ou marcador, por volume. */
function paginasDoVolume(v) {
  const anotacoes = new Map((v.anotacoes || []).map((a) => [a.pagina, a]));
  const numeros = new Set([...anotacoes.keys(), ...(v.marcadores || [])]);
  return [...numeros].sort((a, b) => a - b).map((pagina) => {
    const anotacao = anotacoes.get(pagina) || null;
    return {
      pagina,
      anotacao,
      capitulo: anotacao?.capitulo ?? capituloDe(v.paginasDoArquivo?.[pagina - 1]?.nome),
    };
  });
}

export function totalDePaginasMarcadas() {
  return estado.volumes.reduce((total, v) => total + paginasDoVolume(v).length, 0);
}

function combina(v, item, termo) {
  if (!termo) return true;
  const textos = (item.anotacao?.marcas || []).filter((m) => m.tipo === 'texto').map((m) => m.texto);
  return [v.serie, `volume ${v.numero}`, `página ${item.pagina}`, item.anotacao?.observacao || '', ...textos]
    .join(' ').toLocaleLowerCase('pt-BR').includes(termo);
}

/** O volume em leitura (ou o último lido) e sua página atual, para "Anotar página atual". */
function paginaAtual() {
  const v = paraRetomar() || visiveis().filter((o) => o.temArquivo && o.lidoEm).sort((a, b) => b.lidoEm - a.lidoEm)[0];
  if (!v?.temArquivo) return null;
  return { v, pagina: Math.min(Math.max(1, v.pagina), v.paginas) };
}

function cartao(v, item) {
  const marcas = item.anotacao?.marcas || [];
  const meta = [item.capitulo != null ? `Capítulo ${item.capitulo}` : null,
    marcas.length ? plural(marcas.length, 'marcação', 'marcações') : 'sem marcações'].filter(Boolean).join(' · ');
  const observacao = item.anotacao?.observacao || (item.anotacao ? '' : 'Página marcada');
  const miniatura = v.temArquivo
    ? `<span class="miniatura-folha"><img data-miniatura data-id="${esc(v.id)}" data-i="${item.pagina - 1}" alt="">${camadaDeMarcas(marcas)}</span>`
    : '<span class="anotacao__sem-arquivo">Sem arquivo</span>';
  return `<article class="anotacao">
    <div class="anotacao__miniatura">${miniatura}</div>
    <div class="anotacao__texto">
      <h3 class="anotacao__pagina">Página ${item.pagina}</h3>
      ${observacao ? `<p class="anotacao__observacao">${esc(observacao)}</p>` : ''}
      <p class="anotacao__meta">${esc(meta)}</p>
      <div class="anotacao__acoes">
        <button class="botao botao--secundario botao--44" type="button" data-acao="editar-anotacao" data-id="${esc(v.id)}" data-pagina="${item.pagina}"${v.temArquivo ? '' : ' disabled'}>${item.anotacao ? 'Editar' : 'Anotar'}</button>
        <button class="botao botao--secundario botao--44" type="button" data-acao="ler-pagina" data-id="${esc(v.id)}" data-pagina="${item.pagina}"${v.temArquivo ? '' : ' disabled'}>Ler página</button>
      </div>
    </div>
  </article>`;
}

export function renderAnotacoes({ busca = '', salva = false } = {}) {
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const total = totalDePaginasMarcadas();

  const grupos = [];
  for (const v of ordenar(estado.volumes, 'volume-asc')) {
    const itens = paginasDoVolume(v).filter((item) => combina(v, item, termo));
    // Um grupo por capítulo, na ordem das páginas
    const porCapitulo = new Map();
    for (const item of itens) porCapitulo.set(item.capitulo, [...(porCapitulo.get(item.capitulo) || []), item]);
    for (const [capitulo, doCapitulo] of porCapitulo) {
      const contexto = [capitulo != null ? `Capítulo ${capitulo}` : null, plural(doCapitulo.length, 'página', 'páginas')].filter(Boolean).join(' · ');
      grupos.push(`<section class="anotacoes__grupo" data-grupo="${esc(v.id)}">
        <div class="anotacoes__volume">
          ${capa(v, 'anotacao')}
          <div class="anotacoes__volume-texto">
            <h2 class="anotacoes__volume-nome">${esc(nomeLongo(v))}</h2>
            <p class="anotacoes__volume-contexto">${esc(contexto)}</p>
          </div>
        </div>
        ${doCapitulo.map((item) => cartao(v, item)).join('')}
      </section>`);
    }
  }

  const atual = paginaAtual();
  let lista;
  if (total === 0) {
    lista = mensagemVazia({
      nomeIcone: 'pin',
      titulo: 'Nenhuma anotação ainda',
      linhas: ['Quando quiser lembrar de uma página,', 'ela aparece aqui.'],
    });
  } else if (grupos.length === 0) {
    lista = `<p class="colecao__vazio">Não achei “${esc(busca.trim())}”.</p>`;
  } else {
    lista = grupos.join('');
  }

  return `<div class="rolagem" data-rolagem="anotacoes">
    <div class="anotacoes">
      <header class="anotacoes__cabecalho">
        <h1 class="titulo">Anotações</h1>
        <p class="anotacoes__total">${plural(total, 'página marcada', 'páginas marcadas')}</p>
      </header>
      <div class="abas" role="tablist" aria-label="Estante ou anotações">
        <button class="aba" type="button" role="tab" aria-selected="false" data-acao="ir" data-destino="biblioteca">Estante</button>
        <button class="aba" type="button" role="tab" aria-selected="true">Anotações</button>
      </div>
      <label class="busca busca--anotacoes">
        ${icone('search', 20)}
        <span class="so-leitor">Procurar nas suas anotações</span>
        <span class="busca__campo-area">
          <input class="busca__campo" id="busca-anotacoes" type="search" inputmode="search" enterkeyhint="search"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
            placeholder="Procurar nas suas anotações" value="${esc(busca)}">
        </span>
      </label>
      ${salva ? `<p class="anotacoes__salva" role="status">${icone('check', 20)}Anotação guardada</p>` : ''}
      ${lista}
    </div>
  </div>
  <div class="rodape-acao rodape-acao--com-linha">
    ${atual
      ? `<button class="botao" type="button" data-acao="editar-anotacao" data-id="${esc(atual.v.id)}" data-pagina="${atual.pagina}">Anotar onde parei</button>`
      : '<button class="botao" type="button" disabled>Lê um pouco primeiro</button>'}
  </div>`;
}

// ---------- Miniaturas ----------
// Extraídas do CBZ só quando a tela está aberta; guardadas enquanto ela fica aberta
// (a busca redesenha a lista) e soltas ao sair.

const miniaturas = new Map(); // "id:i" → Promise<object URL>

export function carregarMiniaturas(raiz) {
  for (const img of raiz.querySelectorAll('img[data-miniatura]')) {
    const v = estado.volumes.find((o) => o.id === img.dataset.id);
    if (!v?.temArquivo) continue;
    const chave = `${v.id}:${img.dataset.i}`;
    if (!miniaturas.has(chave)) {
      const pedido = extrairPagina(v, Number(img.dataset.i));
      pedido.catch(() => miniaturas.delete(chave));
      miniaturas.set(chave, pedido);
    }
    miniaturas.get(chave).then((url) => { if (img.isConnected) img.src = url; }, () => {});
  }
}

export function soltarMiniaturas() {
  for (const pedido of miniaturas.values()) pedido.then((url) => URL.revokeObjectURL(url), () => {});
  miniaturas.clear();
}
