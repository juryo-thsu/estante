// Tela "Início — Estante" e seus estados (carregando, primeiro acesso, volume oculto).

import {
  estado, visiveis, ocultos, daGrade, paraRetomar, ultimosLidos, emLeitura, naoLido, volume,
} from '../store.js';
import {
  esc, plural, nomeLongo, nomeCurto, porcentagem, quando, icone, capa, cartaoDeVolume, perolas, mensagemVazia,
} from '../ui.js';

const ROTULO_DA_ORDEM = {
  'volume-asc': 'Volume ↑',
  'volume-desc': 'Volume ↓',
  recentes: 'Recentes',
};

export function renderEstante({ ocultoAgora } = {}) {
  const recemOculto = ocultoAgora && volume(ocultoAgora);
  if (recemOculto?.oculto) return telaVolumeOculto(recemOculto);
  if (estado.volumes.length === 0) return telaPrimeiroAcesso();

  const todos = visiveis();
  return `<div class="rolagem" data-rolagem="estante">
    <div class="estante">
      <header class="topo">
        <div class="topo__texto">
          <div class="topo__linha">
            <h1 class="titulo">Estante</h1>
            <span class="simbolo">${icone('planet')}</span>
          </div>
          <p class="topo__total">${plural(todos.length, 'volume', 'volumes')} · no seu aparelho</p>
        </div>
        <button class="adicionar" type="button" data-acao="adicionar">Adicionar</button>
      </header>

      ${cartaoRetomar()}

      <div class="busca-linha">
        <label class="busca">
          ${icone('search', 20)}
          <span class="so-leitor">Buscar na sua estante</span>
          <span class="busca__campo-area">
            <input class="busca__campo" id="busca" type="search" inputmode="search" enterkeyhint="search"
              autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
              placeholder="Buscar na sua estante" value="${esc(estado.busca)}">
          </span>
        </label>
        <button class="atalho atalho--anotacoes" type="button" data-acao="anotacoes">Anotações</button>
      </div>

      <section class="colecao" id="colecao" aria-label="Minha coleção">${renderColecao()}</section>

      ${secaoUltimosLidos()}
    </div>
  </div>`;
}

/** Só o miolo da coleção: é o que muda enquanto a pessoa digita na busca. */
export function renderColecao() {
  const todos = visiveis();
  const lista = daGrade();
  const series = [...new Set(todos.map((v) => v.serie))];
  const titulo = series.length === 1
    ? `${series[0]} · ${plural(todos.length, 'volume', 'volumes')}`
    : `Minha coleção · ${plural(todos.length, 'volume', 'volumes')}`;

  const filtro = (id, rotulo, n) => `<button class="filtro" type="button" data-acao="filtro" data-filtro="${id}" aria-pressed="${estado.filtro === id}">${rotulo} · ${n}</button>`;

  let grade;
  if (lista.length === 0) {
    const termo = estado.busca.trim();
    grade = `<p class="colecao__vazio">${termo ? `Nada na estante com “${esc(termo)}”.` : 'Nenhum volume neste filtro.'}</p>`;
  } else if (series.length > 1 && estado.ordem !== 'recentes') {
    const grupos = [...new Set(lista.map((v) => v.serie))];
    grade = grupos.map((serie) => {
      const dele = lista.filter((v) => v.serie === serie);
      return `<h3 class="colecao__grupo">${esc(serie)} · ${dele.length}</h3>
        <div class="grade">${dele.map((v) => cartaoDeVolume(v)).join('')}</div>`;
    }).join('');
  } else {
    grade = `<div class="grade">${lista.map((v) => cartaoDeVolume(v)).join('')}</div>`;
  }

  const escondidos = ocultos().length;

  return `<div class="colecao__topo">
      <h2 class="secao-titulo">${esc(titulo)}</h2>
      <button class="ordenar" type="button" data-acao="ordenar" aria-label="Ordenação: ${ROTULO_DA_ORDEM[estado.ordem]}. Trocar">
        ${ROTULO_DA_ORDEM[estado.ordem]} ${icone('sort', 16)}
      </button>
    </div>
    <div class="filtros" role="group" aria-label="Filtros de leitura">
      ${filtro('todos', 'Todos', todos.length)}
      ${filtro('em-leitura', 'Em leitura', todos.filter(emLeitura).length)}
      ${filtro('nao-lidos', 'Não lidos', todos.filter(naoLido).length)}
    </div>
    ${grade}
    ${escondidos ? `<button class="colecao__ocultos" type="button" data-acao="mostrar-ocultos">${plural(escondidos, 'volume oculto', 'volumes ocultos')} · Mostrar</button>` : ''}`;
}

function cartaoRetomar() {
  const v = paraRetomar();
  if (!v) return '';
  const pct = porcentagem(v);
  return `<section class="retomar" aria-label="Continue de onde parou">
    <span class="retomar__xadrez" aria-hidden="true"></span>
    ${capa(v, 'retomar')}
    <div class="retomar__texto">
      <p class="retomar__chamada">CONTINUAR LENDO</p>
      <h2 class="retomar__volume">${esc(nomeLongo(v))}</h2>
      <p class="retomar__pagina">Página ${v.pagina} de ${v.paginas} · ${pct}% lido</p>
      ${perolas(v.pagina / v.paginas, 'Progresso salvo')}
      <button class="botao" type="button" data-acao="abrir" data-id="${esc(v.id)}">Retomar leitura</button>
    </div>
  </section>`;
}

function secaoUltimosLidos() {
  const lista = ultimosLidos();
  if (lista.length === 0) return '';
  return `<section class="ultimos" aria-label="Últimos lidos">
    <div class="ultimos__topo">
      <h2 class="secao-titulo">Últimos lidos</h2>
      <button class="atalho atalho--ver" type="button" data-acao="anotacoes">Anotações →</button>
    </div>
    <div class="ultimos__atalhos">
      ${lista.map((v) => `<button class="ultimo" type="button" data-acao="abrir" data-id="${esc(v.id)}">
        ${capa(v, 'mini')}
        <span class="ultimo__posicao">
          <span class="ultimo__volume">${esc(nomeCurto(v))}</span>
          <span class="ultimo__pagina">Pág. ${v.pagina} / ${v.paginas}</span>
          <span class="ultimo__quando">${quando(v.lidoEm)}</span>
        </span>
      </button>`).join('')}
    </div>
  </section>`;
}

/** "Carregando — anel": só aparece se abrir o banco demorar (ver app.js). */
export function renderCarregando() {
  return `<header class="cabecalho"><h1 class="titulo">Estante</h1></header>
  <div class="carregando" role="status">
    <div class="carregando__simbolo">${icone('anel-girando', 48)}</div>
    <h2 class="carregando__titulo">Preparando sua estante</h2>
    <p class="carregando__texto">Salvando capas e organizando volumes…</p>
    <div class="carregando__capas" aria-hidden="true"><span></span><span></span></div>
  </div>`;
}

function telaPrimeiroAcesso() {
  return `<header class="cabecalho"><h1 class="titulo">Estante</h1></header>
  <div class="rolagem">
    <div class="conteudo">
      <div class="tartan" aria-hidden="true"></div>
      ${mensagemVazia({
        nomeIcone: 'planet',
        titulo: 'Uma estante só sua',
        linhas: ['Sua próxima história começa aqui.', 'Adicione um CBZ ou ZIP pelo app Arquivos.'],
        convite: true,
      })}
      <button class="botao" type="button" data-acao="adicionar">Adicionar primeiro mangá</button>
    </div>
  </div>`;
}

function telaVolumeOculto(v) {
  return `<header class="cabecalho"><h1 class="titulo">Estante</h1></header>
  <div class="rolagem">
    <div class="conteudo">
      ${mensagemVazia({
        nomeIcone: 'lock',
        titulo: 'Volume oculto',
        linhas: ['Ele fica fora da grade até você', 'escolher mostrá-lo novamente.'],
      })}
      <button class="botao" type="button" data-acao="mostrar-volume" data-id="${esc(v.id)}">Mostrar volume</button>
    </div>
  </div>`;
}
