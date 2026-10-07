// Estante · ponto de entrada: navegação entre as abas e a importação, tema, toques e avisos.

import {
  estado, assinar, carregar, volume, definirTema, definirFiltro, definirBusca, proximaOrdem, definirOculto, mostrarOcultos,
  removerArquivo, importar, encerrarImportacao, abrirCorrecao, corrigirResultado,
} from './store.js';
import { renderEstante, renderColecao, renderCarregando } from './views/estante.js';
import { renderFavoritos } from './views/favoritos.js';
import { renderAjustes } from './views/ajustes.js';
import { renderImportar } from './views/importar.js';
import { renderDados } from './views/dados.js';
import { renderInstalar } from './views/instalar.js';
import { abrirFolha, folhaAberta } from './views/folha.js';
import { iniciarOffline } from './offline.js';

const app = document.getElementById('app');
const tela = document.getElementById('tela');
const nav = document.getElementById('nav');
const aviso = document.getElementById('aviso');
const seletor = document.getElementById('seletor');

const DESTINOS = ['biblioteca', 'favoritos', 'ajustes', 'importar', 'dados', 'instalar'];
// Telas cheias, com voltar e ação embaixo no lugar da navegação inferior (como no Figma)
const TELAS_CHEIAS = ['importar', 'dados', 'instalar'];
const TOQUE_LONGO = 400; // ms, como na especificação

const ui = {
  destino: DESTINOS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'biblioteca',
  ocultoAgora: null, // volume recém-oculto: a Biblioteca mostra a tela "Volume oculto"
  recemFavoritados: new Set(), // para o pulso do coração ao abrir Favoritos
  voltarDaInstalacao: 'dados', // "Instalar app" abre de Dados e app ou da importação
};

// ---------- Tema ----------

function aplicarTema() {
  document.documentElement.dataset.tema = estado.tema;
  const cor = getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor);
}

// ---------- Renderização ----------

/** Campos digitados sobrevivem ao redesenho: a fila da importação redesenha a tela no meio de uma correção. */
function guardarCampos() {
  const ativo = document.activeElement;
  const campos = [...tela.querySelectorAll('input[id]')].map((campo) => ({
    id: campo.id,
    valor: campo.value,
    focado: campo === ativo,
    selecao: campo === ativo ? [campo.selectionStart, campo.selectionEnd] : null,
  }));
  return () => {
    for (const { id, valor, focado, selecao } of campos) {
      const campo = document.getElementById(id);
      if (!campo || !tela.contains(campo)) continue;
      campo.value = valor;
      if (!focado) continue;
      campo.focus({ preventScroll: true });
      try {
        campo.setSelectionRange(...selecao);
      } catch {
        // Campo sem seleção de texto: o foco basta
      }
    }
  };
}

function render({ manterRolagem = true } = {}) {
  const rolagem = tela.querySelector('[data-rolagem]');
  const chave = rolagem?.dataset.rolagem;
  const topo = rolagem?.scrollTop ?? 0;
  const restaurarCampos = guardarCampos();

  nav.hidden = TELAS_CHEIAS.includes(ui.destino);

  if (!estado.carregado) {
    tela.innerHTML = renderCarregando();
  } else if (ui.destino === 'importar') {
    tela.innerHTML = renderImportar();
  } else if (ui.destino === 'dados') {
    tela.innerHTML = renderDados();
  } else if (ui.destino === 'instalar') {
    tela.innerHTML = renderInstalar();
  } else if (ui.destino === 'favoritos') {
    tela.innerHTML = renderFavoritos({ recemFavoritados: ui.recemFavoritados });
    ui.recemFavoritados = new Set();
  } else if (ui.destino === 'ajustes') {
    tela.innerHTML = renderAjustes();
  } else {
    tela.innerHTML = renderEstante({ ocultoAgora: ui.ocultoAgora });
  }

  const nova = tela.querySelector('[data-rolagem]');
  if (manterRolagem && nova && nova.dataset.rolagem === chave) nova.scrollTop = topo;
  restaurarCampos();

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
  if (motivo === 'erro-gravacao') {
    avisar('Não deu para salvar no aparelho. Confira o espaço livre.');
    return;
  }
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
  anotacoes: 'As anotações chegam em uma próxima etapa.',
};

// ---------- Importação ----------

function escolherArquivos() {
  // Precisa acontecer dentro do toque, senão o iOS não abre o app Arquivos
  seletor.click();
}

seletor.addEventListener('change', () => {
  const arquivos = [...seletor.files];
  // Limpar permite escolher o mesmo arquivo de novo depois
  seletor.value = '';
  if (arquivos.length === 0) return;
  importar(arquivos);
  if (ui.destino !== 'importar') ir('importar');
});

function sairDaImportacao() {
  encerrarImportacao();
  ir('biblioteca');
}

async function removerDoAparelho(id) {
  try {
    await removerArquivo(id);
    avisar('Arquivo removido. O progresso continua salvo.');
  } catch (erro) {
    console.error(erro);
    avisar('Não deu para remover o arquivo.');
  }
}

function abrirVolume(id) {
  const v = volume(id);
  if (v && !v.temArquivo) avisar('Importe o CBZ ou ZIP de novo para ler este volume.');
  else avisar(EM_BREVE.abrir);
}

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
      } else if (acao === 'remover') {
        removerDoAparelho(idDoVolume);
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
  else if (acao === 'abrir') abrirVolume(id);
  else if (acao === 'adicionar') ir('importar');
  else if (acao === 'escolher-arquivos') escolherArquivos();
  else if (acao === 'sair-importacao') sairDaImportacao();
  else if (acao === 'corrigir') abrirCorrecao(alvo.dataset.chave, true);
  else if (acao === 'cancelar-correcao') abrirCorrecao(alvo.dataset.chave, false);
  else if (acao === 'como-instalar') {
    ui.voltarDaInstalacao = ui.destino;
    ir('instalar');
  } else if (acao === 'fechar-instalacao') ir(ui.voltarDaInstalacao);
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

tela.addEventListener('submit', (evento) => {
  const formulario = evento.target.closest('[data-form="corrigir"]');
  if (!formulario) return;
  evento.preventDefault();
  const dados = new FormData(formulario);
  corrigirResultado(formulario.dataset.chave, dados.get('serie') ?? '', dados.get('numero') ?? '');
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

// O banco costuma abrir em poucos ms: "Preparando sua estante" só aparece se demorar,
// para não piscar a cada abertura do app.
const esperaLonga = setTimeout(render, 250);
carregar()
  .catch((erro) => {
    console.error(erro);
    avisar('Não deu para abrir o armazenamento do aparelho.');
  })
  .finally(() => {
    clearTimeout(esperaLonga);
    render();
  });

iniciarOffline();
