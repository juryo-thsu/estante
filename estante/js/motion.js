// Movimento acompanha ações reais. Nunca esconde conteúdo se a API não existir.
const reducao = matchMedia('(prefers-reduced-motion: reduce)');
const animacoes = new Set();
const DURACAO = 220;
const CURVA = 'cubic-bezier(0.2, 0, 0, 1)';

function animar(elemento, quadros, atraso = 0) {
  if (!elemento?.animate) return;
  const animacao = elemento.animate(quadros, {
    duration: reducao.matches ? 120 : DURACAO,
    delay: reducao.matches ? 0 : atraso,
    easing: CURVA,
    fill: 'backwards',
  });
  animacoes.add(animacao);
  animacao.finished.then(() => animacoes.delete(animacao), () => animacoes.delete(animacao));
}

// A preferência pode mudar com o app aberto, inclusive durante uma transição.
reducao.addEventListener('change', () => {
  for (const animacao of animacoes) animacao.cancel();
  animacoes.clear();
});

export function animarEntrada(raiz, direcao = 1) {
  for (const animacao of animacoes) animacao.cancel();
  animacoes.clear();
  const partes = raiz.querySelectorAll('.marca-editorial, .colagem, .boas-vindas__texto, .topo, .filete-editorial, .retomar, .busca-linha, .colecao, .ultimos, .cabecalho, .barra-voltar, .conteudo, .importar, .rodape-acao');
  partes.forEach((parte, i) => {
    animar(parte, reducao.matches
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: `translateY(${12 * direcao}px)` }, { opacity: 1, transform: 'translateY(0)' }], Math.min(i * 24, 96));
  });
}

export function capturarVolumes(raiz) {
  return new Map([...raiz.querySelectorAll('[data-volume]')].map((el) => [el.dataset.volume, el.getBoundingClientRect()]));
}

export function animarColecao(raiz, anteriores) {
  const limite = raiz.getBoundingClientRect();
  raiz.querySelectorAll('[data-volume]').forEach((el, i) => {
    const atual = el.getBoundingClientRect();
    // Nada de animar capas fora da área visível de uma coleção longa.
    if (atual.top > limite.bottom || atual.bottom < limite.top) return;
    const antes = anteriores.get(el.dataset.volume);
    if (reducao.matches) {
      if (!antes) animar(el, [{ opacity: 0 }, { opacity: 1 }]);
    } else if (antes) {
      const x = antes.left - atual.left;
      const y = antes.top - atual.top;
      if (x || y) animar(el, [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }]);
    } else {
      animar(el, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], Math.min(i * 20, 80));
    }
  });
}
