// Estante · ponto de entrada: navegação entre as três abas, tema, toques e avisos.

import {
  estado, assinar, definirTema, definirFiltro, definirBusca, proximaOrdem, definirOculto, mostrarOcultos,
} from './store.js';
import { renderEstante, renderColecao } from './views/estante.js';
import { renderFavoritos } from './views/favoritos.js';
import { renderAjustes } from './views/ajustes.js';
import { abrirFolha, folhaAberta } from './views/folha.js';

const app = document.getElementById('app');
const tela = document.getElementById('tela');
const nav = document.getElementById('nav');
const aviso = document.getElementById('aviso');

const DESTINOS = ['biblioteca', 'favoritos', 'ajustes'];
const TOQUE_LONGO = 400; // ms, como na especificação

const ui = {
  destino: DESTINOS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'biblioteca',
  ocultoAgora: null, // volume recém-oculto: a Biblioteca mostra a tela "Volume oculto"
  recemFavoritados: new Set(), // para o pulso do coração ao abrir Favoritos
};

// ---------- Tema ----------

function aplicarTema() {
  document.documentElement.dataset.tema = estado.tema;
  const cor = getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor);
}

// ---------- Renderização ----------

function render({ manterRolagem = true } = {}) {
  const rolagem = tela.querySelector('[data-rolagem]');
  const chave = rolagem?.dataset.rolagem;
  const topo = rolagem?.scrollTop ?? 0;

  if (ui.destino === 'favoritos') {
    tela.innerHTML = renderFavoritos({ recemFavoritados: ui.recemFavoritados });
    ui.recemFavoritados = new Set();
  } else if (ui.destino === 'ajustes') {
    tela.innerHTML = renderAjustes();
  } else {
    tela.innerHTML = renderEstante({ ocultoAgora: ui.ocultoAgora });
  }

  const nova = tela.querySelector('[data-rolagem]');
  if (manterRolagem && nova && nova.dataset.rolagem === chave) nova.scrollTop = topo;

  for (const botao of nav.querySelectorAll('[data-destino]')) {
    if (botao.dataset.destino === ui.destino) botao.setAttribute('aria-current', 'page');
    else botao.removeAttribute('aria-current');
  }
}

function ir(destino) {
  if (!DESTINOS.includes(destino)) return;
  const mudou = destino !== ui.destino;
  ui.destino = destino;
  ui.ocultoAgora = null;
  if (location.hash.slice(1) !== destino) {
    try {
      history.replaceState(null, '', `#${destino}`);
    } catch {
      // Alguns contêineres bloqueiam o histórico; a navegação segue sem o endereço.
    }
  }
  render({ manterRolagem: !mudou });
  // Tocar de novo na aba atual volta ao topo, como nas abas do iOS
  if (!mudou) tela.querySelector('[data-rolagem]')?.scrollTo({ top: 0, behavior: 'smooth' });
}

assinar((motivo) => {
  if (motivo === 'busca') {
    const colecao = document.getElementById('colecao');
    if (colecao) colecao.innerHTML = renderColecao();
    return;
  }
  aplicarTema();
  render();
});

// ---------- Aviso curto ----------

let avisoTimer;
function avisar(texto) {
  clearTimeout(avisoTimer);
  aviso.textContent = texto;
  aviso.dataset.visivel = '';
  avisoTimer = setTimeout(() => delete aviso.dataset.visivel, 2400);
}

const EM_BREVE = {
  abrir: 'O leitor chega em uma próxima etapa.',
  adicionar: 'A importação de CBZ e ZIP é a próxima etapa.',
  anotacoes: 'As anotações chegam em uma próxima etapa.',
  remover: 'Remover do aparelho chega com a importação.',
};

// ---------- Folha de ações ----------

function abrirAcoes(id) {
  abrirFolha(id, {
    raiz: app,
    aoAgir(acao, idDoVolume) {
      if (acao === 'favoritou') {
        ui.recemFavoritados.add(idDoVolume);
      } else if (acao === 'ocultar') {
        ui.destino = 'biblioteca';
        ui.ocultoAgora = idDoVolume;
        render({ manterRolagem: false });
      } else if (EM_BREVE[acao]) {
        avisar(EM_BREVE[acao]);
      }
    },
  });
}

// ---------- Toques ----------

// Toque longo de 400 ms na capa abre as ações; o ⋯ faz o mesmo.
let toque = null;

tela.addEventListener('pointerdown', (evento) => {
  const cartao = evento.target.closest('[data-volume]');
  if (!cartao || evento.target.closest('[data-acao="acoes"]') || evento.button > 0) return;
  const atual = { id: cartao.dataset.volume, x: evento.clientX, y: evento.clientY, longo: false };
  atual.timer = setTimeout(() => {
    atual.longo = true;
    abrirAcoes(atual.id);
  }, TOQUE_LONGO);
  toque = atual;
});

tela.addEventListener('pointermove', (evento) => {
  if (toque && Math.hypot(evento.clientX - toque.x, evento.clientY - toque.y) > 10) clearTimeout(toque.timer);
});

// O fim do toque é ouvido na janela: com a folha aberta, o dedo pode soltar fora da tela.
function fimDoToque() {
  if (!toque) return;
  clearTimeout(toque.timer);
  // Se nenhum clique vier depois do toque longo, não deixa o próximo toque ser engolido
  if (toque.longo) setTimeout(() => { toque = null; }, 80);
}
window.addEventListener('pointerup', fimDoToque);
window.addEventListener('pointercancel', fimDoToque);
tela.addEventListener('pointerleave', () => toque && clearTimeout(toque.timer));

tela.addEventListener('contextmenu', (evento) => {
  if (evento.target.closest('[data-volume]')) evento.preventDefault();
});

tela.addEventListener('click', (evento) => {
  // O clique que vem depois de um toque longo não deve abrir o volume
  if (toque?.longo) {
    toque = null;
    evento.preventDefault();
    return;
  }
  toque = null;

  const alvo = evento.target.closest('[data-acao]');
  if (!alvo || folhaAberta()) return;
  const { acao, id } = alvo.dataset;

  if (acao === 'acoes') abrirAcoes(id);
  else if (acao === 'filtro') definirFiltro(alvo.dataset.filtro);
  else if (acao === 'ordenar') proximaOrdem();
  else if (acao === 'tema') definirTema(alvo.dataset.tema);
  else if (acao === 'ir') ir(alvo.dataset.destino);
  else if (acao === 'mostrar-ocultos') mostrarOcultos();
  else if (acao === 'mostrar-volume') {
    ui.ocultoAgora = null;
    definirOculto(id, false);
  } else if (acao === 'em-breve') avisar(alvo.dataset.oQue);
  else if (EM_BREVE[acao]) avisar(EM_BREVE[acao]);
});

tela.addEventListener('input', (evento) => {
  if (evento.target.id === 'busca') definirBusca(evento.target.value);
});

tela.addEventListener('keydown', (evento) => {
  if (evento.target.id === 'busca' && evento.key === 'Enter') evento.target.blur();
});

nav.addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-destino]');
  if (botao) ir(botao.dataset.destino);
});

window.addEventListener('hashchange', () => {
  const destino = location.hash.slice(1);
  if (DESTINOS.includes(destino) && destino !== ui.destino) ir(destino);
});

// Sem isso o Safari do iOS não aplica :active (estado pressionado) nos botões
document.addEventListener('touchstart', () => {}, { passive: true });

aplicarTema();
render();
