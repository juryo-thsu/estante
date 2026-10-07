# Estante

Leitor de mangás para iPhone (PWA), em HTML, CSS e JavaScript puros, sem etapa de build.
O design vem do arquivo do Figma "App · Design e protótipo".

## Pastas

```
Tsukina/
├─ estante/        o app: é esta pasta que vai para a hospedagem
│  ├─ index.html   moldura (tela, navegação inferior, aviso)
│  ├─ css/         tokens (temas), base, components, screens, fonts
│  ├─ js/          app, store, ui, demo e uma tela por arquivo em views/
│  └─ assets/      ícones (SVG do Figma), fontes e ícones do app
├─ docs/           especificação e direção visual copiadas do Figma
├─ entregas/       cópia da etapa 1; as entregas seguintes viram tags do git
├─ .vscode/        configuração do editor e do Live Server
├─ CLAUDE.md       contexto e convenções para o Claude Code
├─ .mcp.json       conexão do Claude Code com o Figma
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

Isso serve para as telas, os toques e a importação de arquivos. Instalar na tela de início, usar offline e ver a cota e a persistência exigem HTTPS, então essas partes (2b e 2c) são testadas com a pasta `estante/` publicada no GitHub Pages, a partir de um repositório git público.

O app é feito para o Safari do iOS 18.4 ou mais novo.

## Como o código está organizado

- `css/tokens.css` espelha a coleção de variáveis "Estante / Temas" do Figma. Os componentes usam só as variáveis `--color-*`, nunca cores fixas. O tema é o atributo `data-tema` no `<html>` (`noite` ou `morango`).
- `css/components.css` tem as peças reutilizáveis (botão, filtro, capa, cartão de volume, pérolas, navegação, folha de ações). `css/screens.css` tem o que é de cada tela.
- Os SVGs de `assets/icons/` são os exportados do Figma, sem alteração. A cor é aplicada por máscara no CSS, para seguir o tema.
- `js/store.js` guarda o estado e o que fica salvo no aparelho. As telas em `js/views/` só leem do store e devolvem HTML; os toques são tratados em `js/app.js`.
- `js/demo.js` são os volumes de exemplo. O arquivo sai quando a importação de CBZ/ZIP entrar.
- Nomes de classes, funções e comentários em português.

## Etapas

1. **Estante, Favoritos, Ajustes, temas e folha de ações** (feita).
2. Importação de CBZ/ZIP, armazenamento, instalação e uso offline, em três partes: 2a importar e guardar; 2b instalar e usar offline; 2c armazenamento.
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
