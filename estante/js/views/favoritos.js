// Tela "Favoritos": volumes guardados e o estado vazio.

import { favoritos } from '../store.js';
import { cartaoDeVolume, mensagemVazia } from '../ui.js';

export function renderFavoritos({ recemFavoritados = new Set() } = {}) {
  const lista = favoritos();
  const cabecalho = '<header class="cabecalho"><h1 class="titulo">Favoritos</h1></header>';

  if (lista.length === 0) {
    return `${cabecalho}
    <div class="rolagem">
      <div class="conteudo">
        ${mensagemVazia({
          nomeIcone: 'heart',
          titulo: 'Ainda sem favoritos',
          linhas: ['Algumas histórias ficam com a gente.', 'Guarde um volume pelo coração no menu da capa.'],
        })}
        <button class="botao" type="button" data-acao="ir" data-destino="biblioteca">Explorar biblioteca</button>
      </div>
    </div>`;
  }

  return `${cabecalho}
  <div class="rolagem" data-rolagem="favoritos">
    <div class="conteudo">
      <p class="introducao">Os volumes que merecem ficar por perto.</p>
      <div class="grade">
        ${lista.map((v) => cartaoDeVolume(v, { favorito: true, pulsar: recemFavoritados.has(v.id) })).join('')}
      </div>
    </div>
  </div>`;
}
