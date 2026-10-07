// Tela "Dados e app": espaço, persistência, instalação e disponibilidade offline.
// Backup e Gerenciar volumes entram na etapa 4.

import { estado } from '../store.js';
import { esc, icone, plural, tamanhoLegivel } from '../ui.js';
import { instalado } from '../offline.js';

const OFFLINE = {
  verificando: ['Conferindo o uso offline…', 'Um instante.'],
  preparando: ['Preparando o uso offline…', 'Guardando o app neste aparelho. Deixe a internet ligada até terminar.'],
  pronto: ['Pronto para usar offline', 'O app e os volumes importados estão disponíveis neste aparelho.'],
  indisponivel: ['Uso offline indisponível', 'Este navegador não guarda o app para abrir sem internet. Os volumes importados continuam no aparelho.'],
  desligado: ['Uso offline desligado no computador', 'No Live Server o app não fica guardado, para cada recarga mostrar a versão editada. Abra com ?offline para testar.'],
};

function cartao(titulo, texto, extra = '') {
  return `<section class="cartao-dados">
    <h2 class="cartao-dados__titulo">${esc(titulo)}</h2>
    <p class="cartao-dados__texto">${esc(texto)}</p>
    ${extra}
  </section>`;
}

const botao = (texto, acao, desligado = false) => `<button class="botao botao--secundario botao--44" type="button"${acao ? ` data-acao="${acao}"` : ''}${desligado ? ' disabled' : ''}>${esc(texto)}</button>`;

function cartaoEspaco() {
  const { suportado, usado, cota } = estado.armazenamento;
  if (suportado === undefined) return cartao('Calculando o espaço…', 'Um instante.');
  if (!suportado) return cartao('Espaço não informado', 'Este navegador não informa quanto o app ocupa.');

  const total = estado.volumes.length;
  const semArquivo = estado.volumes.filter((v) => !v.temArquivo).length;
  const partes = [plural(total, 'volume', 'volumes')];
  if (semArquivo) partes.push(`${semArquivo} sem arquivo`);
  if (cota) partes.push(`limite de ${tamanhoLegivel(cota)}`);

  const fracao = cota ? Math.min(1, usado / cota) : 0;
  const barra = `<div class="uso" role="meter" aria-label="Espaço usado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fracao * 100)}" style="--uso:${fracao.toFixed(4)}">
    <span class="uso__preenchido"></span>
  </div>`;
  return cartao(`${tamanhoLegivel(usado)} usados`, partes.join(' · '), barra);
}

function cartaoPersistencia() {
  const { persistente, recusada } = estado.armazenamento;
  if (!navigator.storage?.persist) {
    return cartao('Persistência indisponível', 'Este navegador não permite pedir armazenamento persistente.');
  }
  if (persistente) {
    return cartao('Persistência ativa', 'O navegador concedeu armazenamento persistente. Mantenha seu backup atualizado.',
      botao('Persistência concedida', '', true));
  }
  if (recusada) {
    return cartao('Persistência não concedida', 'O navegador recusou por enquanto. No iPhone, abrir pelo app da tela de início ajuda. Tente de novo mais tarde.',
      botao('Tentar de novo', 'pedir-persistencia'));
  }
  return cartao('Armazenamento local padrão', 'Solicite persistência para reduzir a remoção automática de dados.',
    botao('Solicitar persistência', 'pedir-persistencia'));
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
      ${cartaoEspaco()}
      <div aria-live="polite">${cartaoPersistencia()}</div>
      ${instalado() ? '' : cartao('Ler como app', 'Instale na tela de início para abrir sem barras do navegador.', botao('Como instalar', 'como-instalar'))}
      <div aria-live="polite">${cartao(tituloOffline, textoOffline)}</div>
    </div>
  </div>
  <div class="rodape-acao"><button class="botao" type="button" data-acao="ir" data-destino="biblioteca">Voltar à estante</button></div>`;
}
