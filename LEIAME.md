# Estante

Leitor de mangás para iPhone (PWA), em HTML, CSS e JavaScript puros, sem etapa de build.
O design vem do arquivo do Figma "App · Design e protótipo".

## Pastas

```
Tsukina/
├─ estante/        o app: é esta pasta que vai para a hospedagem
│  ├─ index.html   moldura (tela, navegação inferior, aviso)
│  ├─ sw.js        service worker: guarda o app no aparelho para abrir sem internet
│  ├─ css/         tokens (temas), base, components, screens, fonts
│  ├─ js/          app, store, ui, db, zip, importacao, offline, armazenamento e uma tela por arquivo em views/
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

- `css/tokens.css` espelha a coleção de variáveis "Estante / Temas" do Figma. Os componentes usam só as variáveis `--color-*`, nunca cores fixas. O tema é o atributo `data-tema` no `<html>` (`noite` ou `morango`).
- `css/components.css` tem as peças reutilizáveis (botão, filtro, capa, cartão de volume, pérolas, navegação, folha de ações). `css/screens.css` tem o que é de cada tela.
- Os SVGs de `assets/icons/` são os exportados do Figma, sem alteração. A cor é aplicada por máscara no CSS, para seguir o tema.
- `js/store.js` guarda o estado e o que fica salvo no aparelho. As telas em `js/views/` só leem do store e devolvem HTML; os toques são tratados em `js/app.js`.
- `js/db.js` é o IndexedDB: a loja `volumes` (série, progresso, marcas, miniatura da capa, índice das páginas) e a loja `arquivos` (o CBZ/ZIP original, na mesma chave). Remover do aparelho apaga só a segunda.
- `sw.js` guarda todos os arquivos do app num cache com o nome da versão (`estante-2c-1`). **A cada mudança em `estante/` que vai para a `main`, suba `VERSAO` no `sw.js`; arquivo novo entra também na lista `ARQUIVOS`.** Sem isso, quem já tem o app instalado continua com a versão antiga. Os CBZ não passam pelo cache: ficam só no IndexedDB.
- `js/offline.js` registra o service worker e pergunta a ele se o cache está completo, para mostrar "Pronto para usar offline" em Ajustes → Dados, armazenamento e backup. No Live Server (`127.0.0.1`) o service worker fica desligado, para cada recarga mostrar o código editado; para testar o offline no computador, abra `http://127.0.0.1:5500/?offline`.
- `js/armazenamento.js` lê o espaço usado e a cota (`navigator.storage.estimate`) e a persistência (`persisted`/`persist`) para a tela Dados e app.
- `js/zip.js` é o leitor de ZIP; `js/importacao.js` valida o arquivo, ordena as páginas, gera a miniatura e deduz série e volume pelo nome.
- Nomes de classes, funções e comentários em português.

## Etapas

1. **Estante, Favoritos, Ajustes, temas e folha de ações** (feita).
2. Importação de CBZ/ZIP, armazenamento, instalação e uso offline, em três partes: 2a importar e guardar, 2b instalar e usar offline e 2c armazenamento (entregues, em teste no iPhone).
3. Leitor: gestos, direção de leitura, progresso, fim de volume.
4. Anotações, backup e gestão de espaço.

## Decisões tomadas onde o Figma não definia

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
- "Gerenciar volumes" e "Progresso e anotações" (backup) ainda não aparecem: são da etapa 4.
- Persistência: além de "Armazenamento local padrão" e "Persistência ativa" do Figma, há "Persistência não concedida" (com "Tentar de novo") e "Persistência indisponível". "Persistência concedida" é um botão desligado.
- Depois da primeira importação de cada abertura, o app pede persistência sozinho (sem pergunta na tela, no Safari e no Chrome). Assim os mangás ficam protegidos mesmo que ninguém abra Ajustes.
