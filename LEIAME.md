# Estante Tsukina

Leitor de mangás para iPhone (PWA), em HTML, CSS e JavaScript puros, sem etapa de build.
A base de design vem do arquivo do Figma "App · Design e protótipo", com direção editorial inspirada em Nana e Paradise Kiss na versão 0.8.0.

## Design e motion · 0.8.0

- Entrada com composição original de capas, xadrez, borboleta e selo dedicado à Lua, desenhada em CSS/SVG e disponível offline.
- Boas-vindas (0.8.1): só o título curto e "Trazer meu primeiro mangá". No Safari do iPhone, sem o app instalado, entram antes os três passos para pôr na Tela de Início (o app instalado guarda os mangás separado do Safari).
- Temas Noite e Morango com contraste revisado, tipografia editorial, cartões de tema ilustrados e novos estados de interação.
- Navegação com indicador deslizante; entradas em sequência nas telas; capas que se reposicionam ao filtrar, buscar e ordenar; feedback ao pressionar botões e passar o mouse sobre capas.
- Movimento de 180–220 ms e pequenos atrasos entre elementos. Com `prefers-reduced-motion`, ficam apenas fades curtos; mudar essa preferência também cancela as animações em andamento.
- Layout de 320 px até desktop, com duas, três ou quatro colunas de capas. As margens, os títulos e a entrada maiores só valem com 600 px de altura ou mais: com o iPhone deitado, fica o layout de celular (com mais colunas). O leitor continua ocupando toda a janela.
- Saíram o backup JSON, o cartão "Proteger seus mangás", o botão "Preferências de leitura" de Ajustes (só mostrava um aviso), as descrições dos temas e os subtextos e slogans enfeitados (pedido de J). Rótulos em maiúsculas têm no mínimo 10 a 11 px. A persistência continua sendo pedida sozinha depois da primeira importação.
- Nenhuma dependência de produção nova. `js/motion.js` usa a Web Animations API e mantém a interface funcional sem ela. O service worker inclui o módulo no novo cache.

Para conferir: alterne as abas e os temas; busque, filtre e ordene alguns volumes; abra os favoritos e o leitor. Repita com movimento reduzido no sistema. No iPhone instalado, confira também as áreas seguras e a reabertura offline.

## Pastas

```
Tsukina/
├─ estante/        o app: é esta pasta que vai para a hospedagem
│  ├─ index.html   moldura (tela, navegação inferior, aviso)
│  ├─ sw.js        service worker: guarda o app no aparelho para abrir sem internet
│  ├─ css/         tokens (temas), base, components, screens, fonts
│  ├─ js/          app, store, ui, motion, db, zip, importacao, paginas, offline, armazenamento e views/
│  └─ assets/      ícones (SVG do Figma), fontes e ícones do app
├─ docs/           especificação e direção visual copiadas do Figma (só no PC)
├─ entregas/       cópia da etapa 1; as entregas seguintes viram tags do git (só no PC)
├─ .vscode/        configuração do editor e do Live Server
├─ CLAUDE.md       contexto e convenções para o Claude Code (só no PC)
├─ .mcp.json       conexão do Claude Code com o Figma (só no PC)
└─ LEIAME.md
```

## Rodar no computador

O app usa módulos ES, então precisa ser servido por HTTP. Abrir o `index.html` direto do disco não funciona.

**Pelo VS Code:** instale a extensão Live Server (o VS Code sugere ao abrir a pasta) e clique em **Go Live** na barra de baixo. O app abre em `http://127.0.0.1:5500`, já apontando para `estante/`, e recarrega sozinho a cada alteração.

**Sem extensão:** no terminal, dentro de `Tsukina`:

```
python -m http.server 5500 --directory estante
```

## Testar no iPhone

Com o computador e o iPhone no mesmo Wi-Fi e o Live Server ligado, abra no Safari `http://IP-DO-COMPUTADOR:5500`. O IP aparece no comando `ipconfig` (linha "Endereço IPv4"). Na primeira vez o Windows pode pedir para liberar o acesso no firewall.

Fora do Wi-Fi, o app publicado fica em **https://juryo-thsu.github.io/estante/**: cada push na `main` publica a pasta `estante/` pelo GitHub Actions (`.github/workflows/pages.yml`), sem build.

Isso serve para as telas, os toques e a importação de arquivos. Instalar na tela de início, usar offline e ver a cota e a persistência exigem HTTPS, então essas partes (2b e 2c) são testadas com a pasta `estante/` publicada no GitHub Pages, a partir de um repositório git público.

O app é feito para o Safari do iOS 18.4 ou mais novo.

## Como o código está organizado

- `css/tokens.css` centraliza os temas Noite e Morango, a tipografia e o movimento. Os componentes usam só as variáveis `--color-*`, nunca cores fixas. O tema é o atributo `data-tema` no `<html>` (`noite` ou `morango`).
- `css/components.css` tem as peças reutilizáveis (botão, filtro, capa, cartão de volume, pérolas, navegação, folha de ações). `css/screens.css` tem o que é de cada tela.
- Os SVGs de `assets/icons/` são os exportados do Figma, sem alteração. A cor é aplicada por máscara no CSS, para seguir o tema.
- `js/store.js` guarda o estado e o que fica salvo no aparelho. As telas em `js/views/` só leem do store e devolvem HTML; os toques são tratados em `js/app.js`.
- `js/motion.js` cuida das entradas de tela e da posição das capas entre renderizações, respeitando movimento reduzido. Atualizações de armazenamento/offline só redesenham a tela de dados, preservando o foco e as animações nas outras telas.
- `js/db.js` é o IndexedDB: a loja `volumes` (série, progresso, marcas, miniatura da capa, índice das páginas) e a loja `arquivos` (o CBZ/ZIP original, na mesma chave). Remover do aparelho apaga só a segunda.
- `sw.js` guarda todos os arquivos do app num cache com o nome da versão (`estante-` + `VERSAO`). **A cada mudança em `estante/` que vai para a `main`, suba `VERSAO` no `sw.js`; arquivo novo entra também na lista `ARQUIVOS`.** Sem isso, quem já tem o app instalado continua com a versão antiga. Os CBZ não passam pelo cache: ficam só no IndexedDB.
- `js/offline.js` registra o service worker e pergunta a ele se o cache está completo, para mostrar "Pronto para usar offline" em Ajustes → Seus dados. No Live Server (`127.0.0.1`) o service worker fica desligado, para cada recarga mostrar o código editado; para testar o offline no computador, abra `http://127.0.0.1:5500/?offline`.
- `js/armazenamento.js` lê o espaço usado e a cota (`navigator.storage.estimate`) e a persistência (`persisted`/`persist`) para a tela Seus dados.
- `js/paginas.js` extrai as páginas do CBZ guardado para o leitor, só numa janela em volta da atual (uma antes, duas depois); o resto tem o object URL revogado. `js/views/leitor.js` é o leitor: uma camada sobre o app que troca só a imagem e os textos a cada página.
- `js/views/editor.js` é o editor de anotações (camada sobre o app e o leitor) e `js/views/anotacoes.js` a lista "Anotações". As marcas são desenhadas por `camadaDeMarcas` em `js/ui.js`, igual no editor e nas miniaturas.
- `js/zip.js` é o leitor de ZIP; `js/importacao.js` valida o arquivo, ordena as páginas, gera a miniatura e deduz série e volume pelo nome.
- Nomes de classes, funções e comentários em português.

## Etapas

1. **Estante, Favoritos, Ajustes, temas e folha de ações** (feita).
2. Importação de CBZ/ZIP, armazenamento, instalação e uso offline, em três partes: 2a importar e guardar, 2b instalar e usar offline e 2c armazenamento (entregues, em teste no iPhone).
3. Leitor, em três partes: 3a ler, 3b zoom e opções por série, 3c fim do volume, página dupla e tela ligada (entregues, em teste no iPhone).
4. Em duas partes: 4a gestão de espaço (o backup JSON entrou e saiu na 0.8.0), 4b anotações (entregues, em teste no iPhone).

## Decisões tomadas onde o Figma não definia

- Na versão 0.8.0, a nova direção visual pedida usa Nana e Paradise Kiss como referências de composição: xadrez, bordô, romance, borboleta e joalheria. Os ornamentos são originais; as capas da coleção continuam vindo dos arquivos importados. O layout cresce até 1100 px no computador.
- Tema selecionado em Ajustes: contorno dourado (no Figma os dois cartões são iguais).
- Volumes ocultos: link "N volumes ocultos · Mostrar" no fim da coleção.
- Ordenação: o toque alterna entre Volume ↑, Volume ↓ e Recentes.
- "Marcar como lido" vira "Marcar como não lido" quando o volume já está lido.
- A barra de status e o indicador de início do Figma não são desenhados; o app usa as áreas seguras do iPhone.
- CBZ/ZIP lidos por um leitor próprio, sem a zip.js que a especificação sugeria, para não ter dependência (escolha de J). Ele lê só o índice do ZIP: página sem compressão é lida direto do arquivo, e as comprimidas passam pelo descompactador do próprio Safari.
- Arquivos e metadados no IndexedDB (a especificação aceita OPFS ou IndexedDB): funciona sem HTTPS, então a importação pode ser testada pelo Live Server no Wi-Fi.
- Resultado da importação: cada cartão mostra "Série · Volume NN · N páginas" e um botão "Corrigir", que abre série e volume no próprio cartão (o Figma não desenha a correção). Colidir com um volume existente mostra o erro e não salva.
- Estados do resultado que o Figma não mostra: "Na fila", "Importando", "Já na estante", "De volta ao aparelho" e "Sem espaço". Os arquivos são lidos um por vez.
- Mesmo volume = mesma série (sem diferença de maiúsculas) e mesmo número. Importar de novo um volume cujo arquivo foi removido devolve o arquivo e mantém progresso e marcas; se o arquivo ainda está no aparelho, a cópia é ignorada.
- Nome sem número de volume vira volume 1, para corrigir no resultado.
- Remover do aparelho pede um segundo toque ("Toque de novo para remover · 71 MB"). Depois, a capa fica apagada na grade e o estado vira "Arquivo removido"; a miniatura, o progresso e as marcas ficam.
- "Preparando sua estante" (Carregando — anel) só aparece se o banco demorar mais de 250 ms para abrir. O anel gira; com movimento reduzido, só pulsa a opacidade.
- Campos de texto em 16 px: com menos, o iOS dá zoom ao focar.
- Tema e ordenação continuam no localStorage, para o tema valer antes da primeira pintura. As marcas dos volumes de exemplo da etapa 1 foram descartadas.
- Versão nova do app: o service worker novo assume assim que termina de guardar tudo. A tela que está aberta continua como estava, e a próxima abertura já vem atualizada (sem aviso de "nova versão").
- Tela "Dados e app" nesta parte só com "Ler como app" e o cartão do offline; espaço e persistência entram na 2c, backup e Gerenciar volumes na etapa 4. "Ler como app" some quando o app está aberto pela tela de início.
- Estados do cartão do offline que o Figma não mostra: "Conferindo…", "Preparando o uso offline…", "Uso offline indisponível" e, no computador, "Uso offline desligado".
- No Safari do iPhone, fora da tela de início, a tela "Adicionar mangá" mostra "Instale antes de importar": o app instalado guarda os dados separado do Safari, e importar antes de instalar obrigaria a importar de novo.
- Espaço no aparelho: a segunda linha mostra volumes, quantos estão sem arquivo e o limite do navegador ("2 volumes · limite de 10,7 GB"); a barra é o uso sobre esse limite, com 4 px mínimos para não sumir. As "páginas anotadas" do Figma entram com as anotações (etapa 4).
- Depois da primeira importação de cada abertura, o app pede persistência sozinho (sem pergunta na tela, no Safari e no Chrome). É o único pedido: na 0.8.0 saíram o cartão de persistência e o backup JSON (J achou inúteis; o código está na tag `etapa-4a` se um dia voltar).
- Leitor: janela fixa de páginas (uma antes, duas depois), sem medir a memória do aparelho (o Safari não informa). A página nova só troca depois de decodificada.
- Leitor: abre com os controles visíveis, exceto na primeira leitura, que mostra a dica de direção por 3 s com os controles escondidos. A dica aparece uma vez só, para o app todo.
- Leitor: volume lido ou nunca aberto começa da página 1; em leitura, volta à página salva. O progresso é salvo a cada página.
- Leitor: o slider pula para a página só ao soltar (arrastar mostra o número, sem extrair cada página do caminho). O slider vai sempre da esquerda para a direita, mesmo em mangá, como no Figma.
- Título do volume no leitor em Lora Bold, como no Figma (fonte nova, OFL, em `assets/fonts`).
- Opções de leitura por série (direção, modo, preto puro, sépia) ficam no localStorage junto do tema, com a série sem diferença de maiúsculas. Série nova lê da direita para a esquerda, em páginas.
- Preto puro: fundo #000 (`--color-pureBlack`, igual nos dois temas) e a página com brilho a 85%, como no frame "preto puro e brilho suave". Sépia: filtro sépia de 35% na página. O Figma não tem controle de brilho separado; os dois botões ligam e desligam cada um.
- Zoom só no modo Páginas, de 1× a 4×. O toque duplo funciona no centro da página (o toque simples no centro espera 250 ms para saber se vem o segundo); nas laterais o toque vira a página na hora, mesmo com zoom. Virar a página volta para 1×.
- Rolagem vertical: as páginas carregam quando chegam perto da tela (uma tela de margem) e são soltas quando se afastam; um toque parado alterna os controles. "Ver zoom 2×" fica desligado nesse modo.
- Ferramenta do leitor: o Figma mostra "Marcar" em uns frames e "Páginas" em outros; ficou "Marcar" (o frame principal). A lista de páginas marcadas entra com "Páginas e anotações" (etapa 4).
- Ajustes → Preferências de leitura explica que as preferências ficam em cada série (Opções, dentro do leitor).
- Fim do volume: avançar na última página abre "Volume terminado!" (com o verso do Djavan). Com "Emendar no próximo volume" ligado (padrão) e um volume seguinte da série guardado, ele abre sozinho depois de 1 s, com "Já abrindo o próximo…" e depois "Seguindo pro próximo" embaixo da página. Sem frase extra quando não abre sozinho: os botões ("Ler o Volume NN", "Voltar pra estante") bastam.
- Próximo volume = o de menor número acima do atual, da mesma série, que não está oculto e tem arquivo.
- Na rolagem vertical, o fim é o botão "Concluir volume" depois da última página (sem virada para concluir).
- Fim do volume: no lugar dos copos do Figma (pedido de J), um verso de "Lilás", do Djavan (1984): “Amanhã, outro dia, / Lua sai, ventania”, com o crédito embaixo. Aparece com fade de 1 s (curto com movimento reduzido), na cor de destaque do tema.
- Página dupla: só deitado; em pé, "Dupla em paisagem" lê uma página por vez. A capa fica sozinha e depois vêm os pares 2–3, 4–5… (como "10–11" no Figma); no mangá a primeira do par fica à direita. Sem zoom nesse modo.
- Deitado, o leitor usa o cabeçalho de uma linha e só a posição embaixo, como o frame "página dupla em paisagem", em qualquer modo de página. Slider, ferramentas e Opções ficam para a leitura em pé. O leitor ocupa a janela inteira (a coluna de 480 px do app não vale para ele).
- Manter tela acesa (Wake Lock): opção por série, desligada por padrão. O pedido sai do toque no botão; ao voltar para o app a trava é pedida de novo; recusa ("Tentar de novo") e indisponibilidade aparecem no cartão.
- O leitor segura os toques até sumir e não gera clique: sem isso, o toque que conclui o volume caía na capa de baixo e reabria o volume.
- Gerenciar volumes: abre com os volumes concluídos já marcados (são os que liberam espaço sem perder nada); o cartão inteiro marca e desmarca. "Remover" pede um segundo toque, como na folha de ações. Só aparecem volumes com arquivo no aparelho.
- Anotações: uma por página, guardada no próprio volume (`anotacoes`), com página, capítulo, `pageId` (nome da página dentro do ZIP), marcas e observação. As marcas ficam em coordenadas de 0 a 1 sobre a página e numa camada separada; a imagem original nunca muda. A cor é guardada pelo nome (`pressed` ou `accent`), então segue o tema.
- Capítulo: vem da pasta da página dentro do ZIP ("Cap 02/…", "Chapter 3/…", "c003/…"). Página solta na raiz do ZIP não tem capítulo, e a anotação mostra só volume e página.
- Editor: Caneta (traço livre), Círculo (arrastar de um canto ao outro), Texto (toca, escreve, Enter) e Borracha (toca ou arrasta sobre a marca). Espessura alterna 2, 3 e 5 px. "Ver original" esconde as marcas (vira "Mostrar marcas"). Salvar sem marcas nem observação apaga a anotação da página.
- Editor aberto pelo leitor volta para o leitor com o aviso "Anotação salva · original preservado"; aberto pela lista, volta para a lista com a faixa do Figma.
- O leitor não desenha as anotações sobre a página, como nos frames do leitor no Figma; elas aparecem no editor e nas miniaturas da lista.
- Lista "Anotações": junta páginas anotadas e páginas marcadas (Marcar, da 3b); página só marcada aparece como "Página marcada" com "Anotar" e "Ler página". Abre pela estante (Anotações), pela folha de ações (vai direto para o volume) e por Ajustes. A aba "Estante" volta para a biblioteca. "Anotar página atual" usa o volume em leitura (ou o último lido) e a página salva.
- Miniaturas da lista: extraídas do CBZ só com a tela aberta e soltas ao sair. Volume sem arquivo mostra "Sem arquivo" e não deixa editar.
- Textos (pedido de J, no lugar dos textos do Figma): o app se chama Estante Tsukina e tem tom informal, sem apelidos nem vocativos (J achou que chamar de "amor" e "xuxu" toda hora ficava feio; a Lua aparece só nas dedicatórias); sem "aparelho" e sem textos de instrução que não fazem falta. Os textos anteriores estão em `docs/textos-originais.md` (só no PC) e na tag `etapa-4b`. Embaixo do ícone, na Tela de Início, o nome é só "Tsukina" (o iOS corta nomes longos).
