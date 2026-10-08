// Service worker da Estante: guarda o app no aparelho para abrir sem internet.
// Os CBZ/ZIP não passam por aqui: já ficam no IndexedDB (a especificação pede para não duplicá-los no cache).
//
// Cache versionado: cada versão é um cache novo e completo, e o antigo só sai quando o novo
// está inteiro. Assim o app nunca mistura arquivos de duas versões.
// TODA mudança em estante/ que vai para a main precisa subir VERSAO (e um arquivo novo entra em ARQUIVOS).

const VERSAO = '4b-3';
const CACHE = `estante-${VERSAO}`;

const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/fonts.css',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'css/screens.css',
  'js/app.js',
  'js/store.js',
  'js/ui.js',
  'js/db.js',
  'js/zip.js',
  'js/importacao.js',
  'js/offline.js',
  'js/armazenamento.js',
  'js/paginas.js',
  'js/views/estante.js',
  'js/views/favoritos.js',
  'js/views/ajustes.js',
  'js/views/folha.js',
  'js/views/importar.js',
  'js/views/dados.js',
  'js/views/instalar.js',
  'js/views/leitor.js',
  'js/views/opcoes.js',
  'js/views/brinde.js',
  'js/views/gerenciar.js',
  'js/views/anotacoes.js',
  'js/views/editor.js',
  'assets/apple-touch-icon.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/fonts/inter-latin-400-normal.woff2',
  'assets/fonts/inter-latin-500-normal.woff2',
  'assets/fonts/inter-latin-600-normal.woff2',
  'assets/fonts/lora-latin-700-normal.woff2',
  'assets/fonts/playfair-display-latin-700-normal.woff2',
  'assets/icons/anel-girando.svg',
  'assets/icons/app-icon.svg',
  'assets/icons/arrow-left.svg',
  'assets/icons/arquivos-zip.svg',
  'assets/icons/books.svg',
  'assets/icons/borracha.svg',
  'assets/icons/check.svg',
  'assets/icons/circulo.svg',
  'assets/icons/copo-direito.svg',
  'assets/icons/copo-esquerdo.svg',
  'assets/icons/desfazer.svg',
  'assets/icons/heart.svg',
  'assets/icons/heart-active.svg',
  'assets/icons/heart-filled.svg',
  'assets/icons/lock.svg',
  'assets/icons/maximize.svg',
  'assets/icons/olho.svg',
  'assets/icons/pen.svg',
  'assets/icons/pin.svg',
  'assets/icons/planet.svg',
  'assets/icons/planeta-original.svg',
  'assets/icons/refazer.svg',
  'assets/icons/search.svg',
  'assets/icons/settings.svg',
  'assets/icons/sliders-horizontal.svg',
  'assets/icons/sort.svg',
  'assets/icons/tartan-corner.svg',
  'assets/icons/tartan-strip.svg',
  'assets/icons/texto.svg',
  'assets/icons/voltar.svg',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // "reload" passa por cima do cache HTTP (o GitHub Pages guarda arquivos por 10 min):
    // sem isso, a versão nova poderia ser montada com arquivos da anterior.
    await cache.addAll(ARQUIVOS.map((url) => new Request(url, { cache: 'reload' })));
    // A versão nova assume já; a tela aberta segue com o que carregou, e a próxima abertura usa a nova.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome.startsWith('estante-') && nome !== CACHE) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Qualquer endereço do app (com #aba ou ?algo) abre a mesma página
    if (pedido.mode === 'navigate') return (await cache.match('index.html')) || fetch(pedido);
    return (await cache.match(pedido, { ignoreSearch: true })) || fetch(pedido);
  })());
});

// O app pergunta se o cache desta versão está completo, para mostrar "Pronto para usar offline"
self.addEventListener('message', (evento) => {
  if (evento.data !== 'pronto-offline?') return;
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const faltando = [];
    for (const url of ARQUIVOS) if (!(await cache.match(url))) faltando.push(url);
    evento.ports[0]?.postMessage({ versao: VERSAO, pronto: faltando.length === 0, faltando });
  })());
});
