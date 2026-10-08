// Tela "Início — Estante" e seus estados (carregando, primeiro acesso, volume oculto).

import {
  estado, visiveis, ocultos, daGrade, paraRetomar, ultimosLidos, emLeitura, naoLido, volume,
} from '../store.js';
import {
  esc, plural, nomeLongo, nomeCurto, porcentagem, quando, icone, capa, cartaoDeVolume, perolas, mensagemVazia,
} from '../ui.js';
import { instalado, safariDoIos } from '../offline.js';

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
          <p class="topo__total">${plural(todos.length, 'volume guardadinho', 'volumes guardadinhos')} pra você</p>
        </div>
        <button class="adicionar" type="button" data-acao="adicionar"><span aria-hidden="true">＋</span> Adicionar</button>
      </header>

      <div class="filete-editorial" aria-hidden="true"><span>✧</span></div>

      ${cartaoRetomar()}

      <div class="busca-linha">
        <label class="busca">
          ${icone('search', 20)}
          <span class="so-leitor">Procurar na estante</span>
          <span class="busca__campo-area">
            <input class="busca__campo" id="busca" type="search" inputmode="search" enterkeyhint="search"
              autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
              placeholder="Procurar na estante" value="${esc(estado.busca)}">
          </span>
        </label>
        <button class="atalho atalho--anotacoes" type="button" data-acao="anotacoes">Anotações</button>
      </div>

      <section class="colecao" id="colecao" aria-label="Sua coleção">${renderColecao()}</section>

      ${secaoUltimosLidos()}
    </div>
  </div>`;
}

/** Só o miolo da coleção: é o que muda enquanto a pessoa digita na busca. */
export function renderColecao() {
  const todos = visiveis();
  const lista = daGrade();
  const series = [...new Set(todos.map((v) => v.serie))];
  const titulo = series.length === 1 ? series[0] : 'Sua coleção';

  const filtro = (id, rotulo, n) => `<button class="filtro" type="button" data-acao="filtro" data-filtro="${id}" aria-pressed="${estado.filtro === id}">${rotulo} · ${n}</button>`;

  let grade;
  if (lista.length === 0) {
    const termo = estado.busca.trim();
    grade = `<p class="colecao__vazio">${termo ? `Não achei “${esc(termo)}”.` : 'Nada aqui por enquanto.'}</p>`;
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
      <h2 class="secao-titulo">${esc(titulo)} <span class="colecao__contagem">${todos.length}</span></h2>
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
    ${escondidos ? `<button class="colecao__ocultos" type="button" data-acao="mostrar-ocultos">${plural(escondidos, 'volume escondidinho', 'volumes escondidinhos')} · Mostrar</button>` : ''}`;
}

function cartaoRetomar() {
  const v = paraRetomar();
  if (!v) return '';
  const pct = porcentagem(v);
  return `<section class="retomar" aria-label="Continue de onde parou">
    <span class="retomar__xadrez" aria-hidden="true"></span>
    ${capa(v, 'retomar')}
    <div class="retomar__texto">
      <p class="retomar__chamada">SÓ MAIS UM CAPÍTULO</p>
      <h2 class="retomar__volume">${esc(nomeLongo(v))}</h2>
      <p class="retomar__pagina">Página ${v.pagina} de ${v.paginas} · ${pct}% lido</p>
      ${perolas(v.pagina / v.paginas, 'Progresso salvo')}
      <button class="botao" type="button" data-acao="abrir" data-id="${esc(v.id)}">Continuar lendo</button>
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
    <h2 class="carregando__titulo">Arrumando sua estante</h2>
    <p class="carregando__texto">Só um instantinho…</p>
    <div class="carregando__capas" aria-hidden="true"><span></span><span></span></div>
  </div>`;
}

// No iPhone, o app da Tela de Início guarda os mangás separado do Safari:
// instalar antes de importar evita trazer tudo duas vezes.
const passosDeInstalacao = () => `<div class="boas-vindas__instalar">
  <p class="sobretitulo">Antes, põe na Tela de Início</p>
  <ol class="boas-vindas__passos">
    <li><span>Toca em <strong>Compartilhar</strong>, no Safari</span></li>
    <li><span>Escolhe <strong>Adicionar à Tela de Início</strong></span></li>
    <li><span>Abre pelo ícone <strong>Tsukina</strong></span></li>
  </ol>
</div>`;

function telaPrimeiroAcesso() {
  const pedirInstalacao = safariDoIos() && !instalado();
  return `<div class="rolagem" data-rolagem="boas-vindas">
    <div class="boas-vindas">
      <header class="marca-editorial">
        <span class="sobretitulo">ESTANTE PESSOAL</span>
        <span class="marca-editorial__nome">Tsukina<span aria-hidden="true">✧</span></span>
        <span class="sobretitulo">FEITA PRA LUA</span>
      </header>
      <div class="boas-vindas__miolo">
        <div class="colagem" aria-hidden="true">
          <div class="colagem__orbita"></div>
          <span class="colagem__estrela colagem__estrela--um">✧</span>
          <span class="colagem__estrela colagem__estrela--dois">✦</span>
          <div class="colagem__capa colagem__capa--xadrez"><span>VOL.</span><strong>707</strong><span>UM LUGAR SÓ NOSSO</span></div>
          <div class="colagem__capa colagem__capa--flor">
            <span>PEQUENOS UNIVERSOS</span>
            <svg class="borboleta" viewBox="0 0 160 130" fill="none"><path d="M80 103C53 102 17 88 21 58C24 32 63 42 80 85C97 42 136 32 139 58C143 88 107 102 80 103ZM79 91C44 76 29 107 47 118C61 128 76 111 80 101C84 111 99 128 113 118C131 107 116 76 81 91M80 101V69M80 74C72 60 64 58 60 61M80 74C88 60 96 58 100 61" stroke="currentColor" stroke-width="1.5"/><path d="M34 61C41 51 61 66 68 84M126 61C119 51 99 66 92 84M46 108L65 100M114 108L95 100" stroke="currentColor" stroke-width="1"/></svg>
            <strong>entre<br><em>páginas.</em></strong>
          </div>
          <span class="colagem__selo">com amor,<br><em>pra Lua ♡</em></span>
        </div>
        <section class="boas-vindas__texto" aria-labelledby="boas-vindas-titulo">
          <h1 id="boas-vindas-titulo">Um lugar para<br>suas <em>histórias.</em></h1>
          ${pedirInstalacao ? passosDeInstalacao() : ''}
          <button class="botao${pedirInstalacao ? ' botao--secundario' : ''}" type="button" data-acao="adicionar">Trazer meu primeiro mangá <span aria-hidden="true">↗</span></button>
        </section>
      </div>
    </div>
  </div>`;
}

function telaVolumeOculto(v) {
  return `<header class="cabecalho"><h1 class="titulo">Estante</h1></header>
  <div class="rolagem">
    <div class="conteudo">
      ${mensagemVazia({
        nomeIcone: 'lock',
        titulo: 'Volume escondido',
        linhas: ['Tá guardadinho longe da estante,', 'só você sabe onde.'],
      })}
      <button class="botao" type="button" data-acao="mostrar-volume" data-id="${esc(v.id)}">Mostrar de novo</button>
    </div>
  </div>`;
}
