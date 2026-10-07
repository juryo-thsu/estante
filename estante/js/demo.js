// Volumes de exemplo, só para a Estante ter o que mostrar nesta etapa.
// Sai (o arquivo inteiro) quando a importação de CBZ/ZIP entrar.

const DIA = 24 * 60 * 60 * 1000;

export function volumesDeExemplo(agora = Date.now()) {
  return [
    { id: 'exemplo-nana-01', serie: 'Nana', numero: 1, paginas: 184, pagina: 10, lidoEm: agora - 2 * 60 * 60 * 1000, tom: 'acao' },
    { id: 'exemplo-nana-17', serie: 'Nana', numero: 17, paginas: 192, pagina: 0, lidoEm: null, tom: 'rosa' },
    { id: 'exemplo-nana-18', serie: 'Nana', numero: 18, paginas: 250, pagina: 88, lidoEm: agora - 2 * DIA, tom: 'elevado' },
    { id: 'exemplo-nana-19', serie: 'Nana', numero: 19, paginas: 189, pagina: 42, lidoEm: agora - DIA, tom: 'perola' },
    { id: 'exemplo-nana-20', serie: 'Nana', numero: 20, paginas: 208, pagina: 0, lidoEm: null, tom: 'elevado' },
    { id: 'exemplo-nana-21', serie: 'Nana', numero: 21, paginas: 196, pagina: 0, lidoEm: null, tom: 'acao' },
  ].map((v) => ({ ...v, exemplo: true, capa: null, favorito: false, oculto: false }));
}
