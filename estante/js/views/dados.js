// Tela "Dados e app": espaço, persistência, instalação, disponibilidade offline e backup.

import { estado, paginasAnotadas } from '../store.js';
import { esc, icone, plural, tamanhoLegivel } from '../ui.js';
import { instalado } from '../offline.js';

const OFFLINE = {
  verificando: ['Conferindo…', 'Um instantinho.'],
  preparando: ['Preparando pra funcionar sem internet…', 'Deixa a internet ligadinha até terminar, amor.'],
  pronto: ['Funciona sem internet', 'Pode ler até no modo avião, Lua.'],
  indisponivel: ['Sem internet não vai dar', 'Esse navegador não guarda o app, mas seus mangás continuam aqui.'],
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
  if (suportado === undefined) return cartao('Medindo o espaço…', 'Um instantinho.');
  if (!suportado) return cartao('Espaço', 'Não consegui ver o espaço agora.');

  const total = estado.volumes.length;
  const semArquivo = estado.volumes.filter((v) => !v.temArquivo).length;
  const partes = [plural(total, 'volume', 'volumes')];
  const anotadas = paginasAnotadas();
  if (anotadas) partes.push(plural(anotadas, 'página anotada', 'páginas anotadas'));
  if (semArquivo) partes.push(`${semArquivo} sem arquivo`);
  if (cota) partes.push(`cabem até ${tamanhoLegivel(cota)}`);

  const fracao = cota ? Math.min(1, usado / cota) : 0;
  const barra = `<div class="uso" role="meter" aria-label="Espaço usado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fracao * 100)}" style="--uso:${fracao.toFixed(4)}">
    <span class="uso__preenchido"></span>
  </div>`;
  const gerenciar = estado.volumes.some((v) => v.temArquivo) ? botao('Liberar espaço', 'gerenciar') : '';
  return cartao(`${tamanhoLegivel(usado)} usados`, partes.join(' · '), barra + gerenciar);
}

function cartaoPersistencia() {
  const { persistente, recusada } = estado.armazenamento;
  if (!navigator.storage?.persist) {
    return cartao('Proteção indisponível', 'Esse navegador não deixa, amor.');
  }
  if (persistente) {
    return cartao('Tudo protegido, amor', 'Nada vai sumir sozinho. Faz um backup de vez em quando, tá?',
      botao('Protegido', '', true));
  }
  if (recusada) {
    return cartao('Ainda não deu pra proteger', 'Abre pelo ícone da tela de início e tenta de novo, xuxu.',
      botao('Tentar de novo', 'pedir-persistencia'));
  }
  return cartao('Proteger seus mangás', 'Pra nada sumir sem você querer.',
    botao('Proteger', 'pedir-persistencia'));
}

export function renderDados() {
  const [tituloOffline, textoOffline] = OFFLINE[estado.offline] || OFFLINE.verificando;

  return `<header class="barra-voltar">
    <button class="voltar" type="button" data-acao="ir" data-destino="ajustes" aria-label="Voltar para Ajustes">${icone('voltar', 20)}</button>
    <h1 class="barra-voltar__titulo">Seus dados</h1>
  </header>
  <div class="rolagem" data-rolagem="dados">
    <div class="importar">
      ${estado.avisoDeDados ? `<div role="status">${cartao(estado.avisoDeDados.titulo, estado.avisoDeDados.texto)}</div>` : ''}
      <h2 class="importar__titulo">Tudo guardadinho aqui, Lua</h2>
      ${cartaoEspaco()}
      <div aria-live="polite">${cartaoPersistencia()}</div>
      ${instalado() ? '' : cartao('Ícone na tela de início', 'Fica mais bonito sem as barras do Safari, Lulu.', botao('Me mostra como', 'como-instalar'))}
      <div aria-live="polite">${cartao(tituloOffline, textoOffline)}</div>
      ${cartao('Backup', 'Seu progresso e suas anotações num arquivinho.', `<div class="par-de-botoes">
        ${botao('Fazer backup', 'exportar-backup')}
        ${botao('Restaurar', 'importar-backup')}
      </div>`)}
    </div>
  </div>
  <div class="rodape-acao"><button class="botao" type="button" data-acao="ir" data-destino="biblioteca">Voltar pra estante</button></div>`;
}
