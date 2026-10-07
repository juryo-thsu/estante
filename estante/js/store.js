// Estado do app e o que fica salvo no aparelho.
// Nesta etapa: tema, ordenação e as marcas de cada volume (favorito, oculto, página)
// vão para o localStorage. A biblioteca em si passa para o IndexedDB na etapa de importação.

import { volumesDeExemplo } from './demo.js';

const CHAVE = 'estante:v1';

function lerSalvo() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) || {};
  } catch {
    return {};
  }
}

const salvo = lerSalvo();

export const estado = {
  tema: salvo.tema === 'morango' ? 'morango' : 'noite',
  ordem: ['volume-asc', 'volume-desc', 'recentes'].includes(salvo.ordem) ? salvo.ordem : 'volume-asc',
  filtro: 'todos',
  busca: '',
  volumes: volumesDeExemplo().map((v) => ({ ...v, ...(salvo.marcas?.[v.id] || {}) })),
};

function salvar() {
  const marcas = {};
  for (const v of estado.volumes) {
    marcas[v.id] = { favorito: v.favorito, oculto: v.oculto, pagina: v.pagina, paginaAntes: v.paginaAntes, lidoEm: v.lidoEm };
  }
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ tema: estado.tema, ordem: estado.ordem, marcas }));
  } catch {
    // Sem armazenamento (aba privada, cota): o app segue funcionando, só não lembra.
  }
}

const ouvintes = new Set();
export function assinar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
function avisar() {
  salvar();
  for (const fn of ouvintes) fn();
}

// ---------- Leitura ----------

export const naoLido = (v) => v.pagina <= 0;
export const lido = (v) => v.pagina >= v.paginas;
export const emLeitura = (v) => !naoLido(v) && !lido(v);

export function volume(id) {
  return estado.volumes.find((v) => v.id === id);
}

export function visiveis() {
  return estado.volumes.filter((v) => !v.oculto);
}

export function ocultos() {
  return estado.volumes.filter((v) => v.oculto);
}

export function favoritos() {
  return ordenar(visiveis().filter((v) => v.favorito), 'volume-asc');
}

const comparar = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export function ordenar(lista, ordem = estado.ordem) {
  const porVolume = (a, b) => comparar.compare(a.serie, b.serie) || a.numero - b.numero;
  const copia = [...lista];
  if (ordem === 'recentes') return copia.sort((a, b) => (b.lidoEm || 0) - (a.lidoEm || 0) || porVolume(a, b));
  if (ordem === 'volume-desc') return copia.sort((a, b) => comparar.compare(a.serie, b.serie) || b.numero - a.numero);
  return copia.sort(porVolume);
}

/** Volumes da grade, já com filtro, busca e ordenação aplicados. */
export function daGrade() {
  const termo = estado.busca.trim().toLocaleLowerCase('pt-BR');
  let lista = visiveis();
  if (estado.filtro === 'em-leitura') lista = lista.filter(emLeitura);
  if (estado.filtro === 'nao-lidos') lista = lista.filter(naoLido);
  if (termo) {
    lista = lista.filter((v) => `${v.serie} volume ${v.numero} v${v.numero}`.toLocaleLowerCase('pt-BR').includes(termo));
  }
  return ordenar(lista);
}

/** O volume em leitura mexido por último: é ele que aparece em "Continuar lendo". */
export function paraRetomar() {
  return visiveis()
    .filter((v) => emLeitura(v) && v.lidoEm)
    .sort((a, b) => b.lidoEm - a.lidoEm)[0];
}

export function ultimosLidos(quantos = 2) {
  const atual = paraRetomar();
  return visiveis()
    .filter((v) => v.lidoEm && !naoLido(v) && v !== atual)
    .sort((a, b) => b.lidoEm - a.lidoEm)
    .slice(0, quantos);
}

// ---------- Mudanças ----------

export function definirTema(tema) {
  estado.tema = tema === 'morango' ? 'morango' : 'noite';
  avisar();
}

export function definirFiltro(filtro) {
  estado.filtro = filtro;
  avisar();
}

export function definirBusca(texto) {
  estado.busca = texto;
  for (const fn of ouvintes) fn('busca');
}

export function proximaOrdem() {
  const ciclo = ['volume-asc', 'volume-desc', 'recentes'];
  estado.ordem = ciclo[(ciclo.indexOf(estado.ordem) + 1) % ciclo.length];
  avisar();
}

export function alternarFavorito(id) {
  const v = volume(id);
  if (!v) return false;
  v.favorito = !v.favorito;
  avisar();
  return v.favorito;
}

export function alternarLido(id) {
  const v = volume(id);
  if (!v) return;
  if (lido(v)) {
    v.pagina = v.paginaAntes || 0;
    v.paginaAntes = undefined;
  } else {
    v.paginaAntes = v.pagina;
    v.pagina = v.paginas;
    v.lidoEm = Date.now();
  }
  avisar();
}

export function definirOculto(id, oculto) {
  const v = volume(id);
  if (!v) return;
  v.oculto = oculto;
  avisar();
}

export function mostrarOcultos() {
  for (const v of estado.volumes) v.oculto = false;
  avisar();
}
