// Estado do app e o que fica salvo no aparelho.
// Tema e ordenação ficam no localStorage (o tema precisa estar disponível antes da
// primeira pintura). Volumes, progresso, capas e arquivos ficam no IndexedDB (db.js).

import * as db from './db.js';
import { lerVolume, ErroDeImportacao } from './importacao.js';

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
  /** A dica "← Avançar · leitura da direita para a esquerda" aparece só na primeira leitura. */
  dicaDeDirecaoVista: salvo.dicaDeDirecaoVista === true,
  filtro: 'todos',
  busca: '',
  carregado: false,
  volumes: [],
  /** Importação em curso ou recém-terminada: `{ itens: [...] }`, ou null. */
  importacao: null,
  /** 'verificando' | 'preparando' | 'pronto' | 'indisponivel' | 'desligado' (no computador) */
  offline: 'verificando',
  /** navigator.storage: `{ suportado, usado, cota, persistente, recusada }`; vazio até a primeira leitura. */
  armazenamento: {},
};

function salvarPreferencias() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ tema: estado.tema, ordem: estado.ordem, dicaDeDirecaoVista: estado.dicaDeDirecaoVista }));
  } catch {
    // Sem armazenamento (aba privada, cota): o app segue funcionando, só não lembra.
  }
}

const ouvintes = new Set();
export function assinar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
function avisar(motivo) {
  for (const fn of ouvintes) fn(motivo);
}

// ---------- Banco ----------

/** O que vai para o IndexedDB: tudo menos o object URL da capa, que só vale nesta sessão. */
function registro(v) {
  const { capa, ...resto } = v;
  return resto;
}

function comCapa(reg) {
  return { ...reg, capa: reg.capaBlob ? URL.createObjectURL(reg.capaBlob) : null };
}

function persistir(v) {
  db.salvarVolume(registro(v)).catch((erro) => {
    console.error(erro);
    avisar('erro-gravacao');
  });
}

export async function carregar() {
  try {
    estado.volumes = (await db.lerVolumes()).map(comCapa);
  } finally {
    estado.carregado = true;
  }
  avisar();
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
  salvarPreferencias();
  avisar();
}

export function definirOffline(situacao) {
  if (estado.offline === situacao) return;
  estado.offline = situacao;
  avisar('offline');
}

export function definirArmazenamento(dados) {
  estado.armazenamento = { ...estado.armazenamento, ...dados };
  avisar('armazenamento');
}

export function definirFiltro(filtro) {
  estado.filtro = filtro;
  avisar();
}

export function definirBusca(texto) {
  estado.busca = texto;
  avisar('busca');
}

export function proximaOrdem() {
  const ciclo = ['volume-asc', 'volume-desc', 'recentes'];
  estado.ordem = ciclo[(ciclo.indexOf(estado.ordem) + 1) % ciclo.length];
  salvarPreferencias();
  avisar();
}

export function alternarFavorito(id) {
  const v = volume(id);
  if (!v) return false;
  v.favorito = !v.favorito;
  persistir(v);
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
  persistir(v);
  avisar();
}

export function definirOculto(id, oculto) {
  const v = volume(id);
  if (!v) return;
  v.oculto = oculto;
  persistir(v);
  avisar();
}

export function mostrarOcultos() {
  for (const v of ocultos()) {
    v.oculto = false;
    persistir(v);
  }
  avisar();
}

// ---------- Leitor ----------

/** Direção de leitura da série. Até as opções por série (3b), todo volume lê como mangá. */
export const direcaoDaSerie = () => 'rtl';

/** Página atual (de 1 a `paginas`) ao virar a página no leitor. */
export function salvarPagina(id, pagina) {
  const v = volume(id);
  if (!v || v.pagina === pagina) return;
  v.pagina = pagina;
  v.paginaAntes = undefined;
  v.lidoEm = Date.now();
  persistir(v);
  // Sem redesenhar a estante a cada página: ela está escondida atrás do leitor
  avisar('progresso');
}

export function marcarDicaDeDirecaoVista() {
  estado.dicaDeDirecaoVista = true;
  salvarPreferencias();
}

/** Apaga o CBZ/ZIP do aparelho. Série, capa, progresso e marcas ficam. */
export async function removerArquivo(id) {
  const v = volume(id);
  if (!v?.temArquivo) return;
  const atualizado = { ...registro(v), temArquivo: false, paginasDoArquivo: null };
  await db.removerArquivo(atualizado);
  Object.assign(v, atualizado);
  avisar();
}

// ---------- Importação ----------

// Mesmo volume = mesma série (sem diferença de maiúsculas) e mesmo número
const chaveDoVolume = (serie, numero) => `${serie.trim().normalize('NFC').toLocaleLowerCase('pt-BR')}#${numero}`;
const doVolume = (serie, numero) => estado.volumes.find((v) => chaveDoVolume(v.serie, v.numero) === chaveDoVolume(serie, numero));

let processando = false;
let contador = 0;

// crypto.randomUUID só existe em HTTPS, e a 2a é testada por HTTP no Wi-Fi
const novoId = () => `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const importando = () => processando;

/** Põe os arquivos escolhidos na fila. Um por vez, para não segurar dois volumes na memória. */
export function importar(arquivos) {
  if (!arquivos.length) return;
  estado.importacao ??= { itens: [] };
  for (const arquivo of arquivos) {
    estado.importacao.itens.push({ chave: `arquivo-${++contador}`, nome: arquivo.name, situacao: 'fila', arquivo });
  }
  avisar('importacao');
  if (!processando) processarFila();
}

async function processarFila() {
  processando = true;
  try {
    let item;
    while ((item = estado.importacao?.itens.find((i) => i.situacao === 'fila'))) {
      item.situacao = 'lendo';
      avisar('importacao');
      await importarUm(item);
      delete item.arquivo;
      avisar('importacao');
    }
  } finally {
    processando = false;
  }
  avisar('importacao');
}

async function importarUm(item) {
  try {
    const lido = await lerVolume(item.arquivo);
    const existente = doVolume(lido.serie, lido.numero);

    if (existente?.temArquivo) {
      item.situacao = 'repetido';
      item.volumeId = existente.id;
      return;
    }

    const doArquivo = {
      paginas: lido.paginas.length,
      paginasDoArquivo: lido.paginas,
      capaBlob: lido.capa,
      nomeDoArquivo: item.nome,
      tamanho: item.arquivo.size,
      temArquivo: true,
    };

    if (existente) {
      // O arquivo volta para um volume que já tinha progresso: mantém tudo, só ajusta a página
      // se a nova edição tiver menos páginas que a anterior.
      const atualizado = { ...registro(existente), ...doArquivo };
      atualizado.pagina = Math.min(atualizado.pagina, atualizado.paginas);
      await db.salvarComArquivo(atualizado, item.arquivo);
      if (existente.capa) URL.revokeObjectURL(existente.capa);
      Object.assign(existente, atualizado, { capa: URL.createObjectURL(lido.capa) });
      item.situacao = 'reanexado';
      item.volumeId = existente.id;
    } else {
      const novo = {
        id: novoId(),
        serie: lido.serie,
        numero: lido.numero,
        pagina: 0,
        lidoEm: null,
        favorito: false,
        oculto: false,
        adicionadoEm: Date.now(),
        ...doArquivo,
      };
      await db.salvarComArquivo(novo, item.arquivo);
      estado.volumes.push(comCapa(novo));
      item.situacao = 'salvo';
      item.volumeId = novo.id;
    }
  } catch (erro) {
    item.situacao = 'erro';
    if (erro instanceof ErroDeImportacao) {
      item.mensagem = erro.message;
      item.rotulo = 'Arquivo inválido';
    } else if (erro?.name === 'QuotaExceededError') {
      item.mensagem = 'Falta espaço no aparelho para este volume.';
      item.rotulo = 'Sem espaço';
    } else {
      console.error(erro);
      item.mensagem = 'Não deu para guardar este arquivo no aparelho.';
      item.rotulo = 'Erro ao salvar';
    }
  }
}

/** Fecha a tela de resultados. Com a fila andando, os resultados ficam até ela terminar. */
export function encerrarImportacao() {
  if (!processando) estado.importacao = null;
}

function itemDaImportacao(chave) {
  return estado.importacao?.itens.find((i) => i.chave === chave);
}

export function abrirCorrecao(chave, aberta) {
  const item = itemDaImportacao(chave);
  if (!item) return;
  item.corrigindo = aberta;
  item.erroDaCorrecao = null;
  avisar('importacao');
}

/** Corrige série e volume deduzidos do nome do arquivo. */
export function corrigirResultado(chave, serieDigitada, numeroDigitado) {
  const item = itemDaImportacao(chave);
  const v = item && volume(item.volumeId);
  if (!v) return;

  const serie = serieDigitada.trim().replace(/\s+/g, ' ');
  const numero = Number(String(numeroDigitado).trim().replace(',', '.'));
  let erro = null;
  if (!serie) erro = 'Escreva o nome da série.';
  else if (String(numeroDigitado).trim() === '' || !Number.isFinite(numero) || numero < 0) erro = 'O volume precisa ser um número.';
  else {
    const outro = doVolume(serie, numero);
    if (outro && outro !== v) erro = `${outro.serie} · Volume ${String(numero).padStart(2, '0')} já está na estante.`;
  }

  if (erro) {
    item.erroDaCorrecao = erro;
  } else {
    v.serie = serie;
    v.numero = numero;
    persistir(v);
    item.corrigindo = false;
    item.erroDaCorrecao = null;
  }
  avisar('importacao');
}
