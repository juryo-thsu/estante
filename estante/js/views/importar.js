// Telas "Importar — múltiplos arquivos" e "Importar — resultados por arquivo".

import { estado, volume, importando } from '../store.js';
import { esc, plural, doisDigitos, nomeLongo, icone } from '../ui.js';
import { instalado, safariDoIos } from '../offline.js';

export function renderImportar() {
  return estado.importacao ? telaResultados(estado.importacao) : telaEscolher();
}

function barraComVoltar(titulo) {
  return `<header class="barra-voltar">
    <button class="voltar" type="button" data-acao="sair-importacao" aria-label="Voltar para a estante">${icone('voltar', 20)}</button>
    <h1 class="barra-voltar__titulo">${esc(titulo)}</h1>
  </header>`;
}

function rodape(botao) {
  return `<div class="rodape-acao">${botao}</div>`;
}

/**
 * No iPhone, o app da tela de início guarda os dados separado do Safari:
 * importar numa aba e instalar depois deixaria o app instalado vazio.
 */
function avisoDeInstalacao() {
  if (!safariDoIos() || instalado()) return '';
  return `<section class="cartao-dados">
    <h2 class="cartao-dados__titulo">Instale antes de importar</h2>
    <p class="cartao-dados__texto">No iPhone, o app da tela de início guarda os mangás separado do Safari. Instale primeiro para não importar duas vezes.</p>
    <button class="botao botao--secundario botao--44" type="button" data-acao="como-instalar">Como instalar</button>
  </section>`;
}

function telaEscolher() {
  return `${barraComVoltar('Adicionar mangá')}
  <div class="rolagem" data-rolagem="importar">
    <div class="importar">
      ${avisoDeInstalacao()}
      <section class="importar__cartao">
        ${icone('arquivos-zip', 40)}
        <h2 class="importar__titulo">Traga sua coleção</h2>
        <p class="importar__texto">Escolha arquivos .cbz ou .zip pelo app Arquivos. Você pode selecionar vários de uma vez.</p>
      </section>
      <ul class="formatos" aria-label="Formatos aceitos">
        <li class="formato">CBZ</li>
        <li class="formato">ZIP</li>
        <li class="formato formato--largo">Vários arquivos</li>
      </ul>
      <h2 class="importar__titulo">Organizados por série</h2>
      <p class="importar__texto">Confirme a série e o número do volume depois da importação.</p>
      <h2 class="importar__titulo">Leitura no seu ritmo</h2>
      <p class="importar__texto">Depois de salvar os arquivos, você pode ler sem conexão.</p>
    </div>
  </div>
  ${rodape('<button class="botao" type="button" data-acao="escolher-arquivos">Escolher arquivos</button>')}`;
}

/** "02 e 10", "02, 05 e 10" */
function emLista(partes) {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
}

function resumo(adicionados) {
  const porSerie = new Map();
  for (const v of adicionados) porSerie.set(v.serie, [...(porSerie.get(v.serie) || []), v.numero]);
  return [...porSerie].map(([serie, numeros]) => {
    const ordenados = numeros.sort((a, b) => a - b).map(doisDigitos);
    return `${serie} · ${ordenados.length === 1 ? 'volume' : 'volumes'} ${emLista(ordenados)}`;
  });
}

function telaResultados({ itens }) {
  const andando = importando();
  const adicionados = itens
    .filter((i) => i.situacao === 'salvo' || i.situacao === 'reanexado')
    .map((i) => volume(i.volumeId))
    .filter(Boolean);
  const prontos = itens.filter((i) => i.situacao !== 'fila' && i.situacao !== 'lendo').length;

  let titulo;
  let linhas;
  if (andando) {
    titulo = `Importando ${Math.min(prontos + 1, itens.length)} de ${itens.length}…`;
    linhas = ['Mantenha o app aberto até terminar.'];
  } else {
    titulo = adicionados.length ? plural(adicionados.length, 'volume adicionado', 'volumes adicionados') : 'Nenhum volume adicionado';
    linhas = adicionados.length ? resumo(adicionados) : ['Confira o motivo em cada arquivo.'];
  }

  return `${barraComVoltar('Importação')}
  <div class="rolagem" data-rolagem="importacao">
    <div class="importar">
      <h2 class="importar__titulo" aria-live="polite">${esc(titulo)}</h2>
      <p class="importar__texto">${linhas.map(esc).join('<br>')}</p>
      ${itens.map(cartaoDeResultado).join('')}
      <button class="botao botao--secundario botao--44" type="button" data-acao="escolher-arquivos">Escolher outros arquivos</button>
    </div>
  </div>
  ${rodape('<button class="botao" type="button" data-acao="sair-importacao">Ir para a estante</button>')}`;
}

function cartaoDeResultado(item) {
  const v = item.volumeId ? volume(item.volumeId) : null;
  let detalhe;
  let rotulo;
  let destaque = false;
  let corrigivel = false;

  if (item.situacao === 'fila') {
    detalhe = 'Na fila';
    rotulo = 'Aguardando';
  } else if (item.situacao === 'lendo') {
    detalhe = 'Lendo as páginas e preparando a capa…';
    rotulo = 'Importando';
  } else if (item.situacao === 'salvo' && v) {
    detalhe = `${nomeLongo(v)} · ${v.paginas} páginas · capa pronta`;
    rotulo = 'Salvo no aparelho';
    destaque = corrigivel = true;
  } else if (item.situacao === 'reanexado' && v) {
    detalhe = `${nomeLongo(v)} · ${v.paginas} páginas · progresso mantido`;
    rotulo = 'De volta ao aparelho';
    destaque = corrigivel = true;
  } else if (item.situacao === 'repetido' && v) {
    detalhe = `${nomeLongo(v)} já está na estante.`;
    rotulo = 'Já na estante';
  } else {
    detalhe = item.mensagem || 'Não deu para importar este arquivo.';
    rotulo = item.rotulo || 'Arquivo inválido';
  }

  const corpo = item.corrigindo && v ? formularioDeCorrecao(item, v) : `<p class="resultado__detalhe">${esc(detalhe)}</p>
    <div class="resultado__rodape">
      <p class="resultado__rotulo${destaque ? ' resultado__rotulo--ok' : ''}">${esc(rotulo)}</p>
      ${corrigivel && !item.corrigindo ? `<button class="resultado__corrigir" type="button" data-acao="corrigir" data-chave="${esc(item.chave)}" aria-label="Corrigir série e volume de ${esc(item.nome)}">Corrigir</button>` : ''}
    </div>`;

  return `<article class="resultado" aria-busy="${item.situacao === 'lendo'}">
    <h3 class="resultado__arquivo">${esc(item.nome)}</h3>
    ${corpo}
  </article>`;
}

function formularioDeCorrecao(item, v) {
  const id = (campo) => `corrigir-${campo}-${esc(item.chave)}`;
  return `<form class="corrigir" data-form="corrigir" data-chave="${esc(item.chave)}" novalidate>
    <label class="campo" for="${id('serie')}">
      <span class="campo__rotulo">Série</span>
      <input class="campo__entrada" id="${id('serie')}" name="serie" type="text" value="${esc(v.serie)}"
        autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="next">
    </label>
    <label class="campo" for="${id('numero')}">
      <span class="campo__rotulo">Volume</span>
      <input class="campo__entrada" id="${id('numero')}" name="numero" type="text" inputmode="decimal" value="${esc(v.numero)}"
        autocomplete="off" enterkeyhint="done">
    </label>
    ${item.erroDaCorrecao ? `<p class="corrigir__erro" role="alert">${esc(item.erroDaCorrecao)}</p>` : ''}
    <div class="corrigir__botoes">
      <button class="botao botao--secundario botao--44" type="button" data-acao="cancelar-correcao" data-chave="${esc(item.chave)}">Cancelar</button>
      <button class="botao botao--44" type="submit">Salvar</button>
    </div>
  </form>`;
}
