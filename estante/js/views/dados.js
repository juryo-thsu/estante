// Tela "Dados e app". Nesta parte (2b): instalação e disponibilidade offline.
// Espaço e persistência entram na 2c; backup e gerenciar volumes, na etapa 4.

import { estado } from '../store.js';
import { esc, icone } from '../ui.js';
import { instalado } from '../offline.js';

const OFFLINE = {
  verificando: ['Conferindo o uso offline…', 'Um instante.'],
  preparando: ['Preparando o uso offline…', 'Guardando o app neste aparelho. Deixe a internet ligada até terminar.'],
  pronto: ['Pronto para usar offline', 'O app e os volumes importados estão disponíveis neste aparelho.'],
  indisponivel: ['Uso offline indisponível', 'Este navegador não guarda o app para abrir sem internet. Os volumes importados continuam no aparelho.'],
  desligado: ['Uso offline desligado no computador', 'No Live Server o app não fica guardado, para cada recarga mostrar a versão editada. Abra com ?offline para testar.'],
};

function cartao(titulo, texto, botao = '') {
  return `<section class="cartao-dados">
    <h2 class="cartao-dados__titulo">${esc(titulo)}</h2>
    <p class="cartao-dados__texto">${esc(texto)}</p>
    ${botao}
  </section>`;
}

export function renderDados() {
  const [tituloOffline, textoOffline] = OFFLINE[estado.offline] || OFFLINE.verificando;

  return `<header class="barra-voltar">
    <button class="voltar" type="button" data-acao="ir" data-destino="ajustes" aria-label="Voltar para Ajustes">${icone('voltar', 20)}</button>
    <h1 class="barra-voltar__titulo">Dados e app</h1>
  </header>
  <div class="rolagem" data-rolagem="dados">
    <div class="importar">
      <h2 class="importar__titulo">Sua coleção, no aparelho</h2>
      <p class="importar__texto">Arquivos, progresso e anotações ficam disponíveis aqui.</p>
      ${instalado() ? '' : cartao('Ler como app', 'Instale na tela de início para abrir sem barras do navegador.',
        '<button class="botao botao--secundario botao--44" type="button" data-acao="como-instalar">Como instalar</button>')}
      <div aria-live="polite">${cartao(tituloOffline, textoOffline)}</div>
    </div>
  </div>
  <div class="rodape-acao"><button class="botao" type="button" data-acao="ir" data-destino="biblioteca">Voltar à estante</button></div>`;
}
