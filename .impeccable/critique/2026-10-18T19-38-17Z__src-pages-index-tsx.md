---
target: critique de toda a interface do site após as fases Impeccable
total_score: 26
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
target_identity: "file:C:\\Users\\justs\\Downloads\\Nova pasta\\src\\pages\\Index.tsx"
target_fingerprint: "sha256:1e35b2356550d07d8e4d90a0d3d506e1ed623c5a04ba9b14d76d574387d23854"
target_path: "C:\\Users\\justs\\Downloads\\Nova pasta\\src\\pages\\Index.tsx"
timestamp: 2026-10-18T19-38-17Z
slug: src-pages-index-tsx
---
Method: dual-agent (A: /root/critique_a · B: /root/critique_b)

# Design Health Score

Avaliação da interface como um todo, com foco na rota inicial e no painel de campanha. As pontuações são estimativas baseadas no código; não houve inspeção visual renderizada.

| # | Heurística | Nota | Observação principal |
|---|---|---:|---|
| 1 | Visibilidade do estado do sistema | 3/4 | Módulo ativo, estado de carregamento, resultado dos dados e logs dão retorno; o padrão ainda varia entre módulos. |
| 2 | Correspondência com o mundo real | 3/4 | Fluxos e termos de campanha combinam com o produto; siglas como OMNI e PE presumem familiaridade com RPG. |
| 3 | Controle e liberdade do usuário | 3/4 | É possível trocar módulos, ordenar a navegação e fechar painéis; desfazer e cancelar variam por fluxo. |
| 4 | Consistência e padrões | 3/4 | Componentes compartilhados, cabeçalhos e tokens ajudam; módulos especializados ainda diferem em interações. |
| 5 | Prevenção de erros | 3/4 | Há confirmações e validação em vários fluxos, sem cobertura uniforme. |
| 6 | Reconhecimento em vez de memorização | 3/4 | Rótulos, módulo ativo e controles contextuais ajudam; ferramentas menos comuns exigem encontrar o módulo certo. |
| 7 | Flexibilidade e eficiência | 2/4 | A navegação por função e a reordenação ajudam; há poucos atalhos para ações frequentes. |
| 8 | Estética e minimalismo | 2/4 | A linguagem sombria e cerimonial serve ao jogo, mas controles persistentes e módulos densos competem pela atenção. |
| 9 | Reconhecimento e recuperação de erros | 2/4 | Confirmações e retorno existem em alguns fluxos; recuperação e orientação variam entre módulos. |
| 10 | Ajuda e documentação | 2/4 | O módulo Guia existe, mas a ajuda fica distante das tarefas mais complexas. |
| **Total** |  | **26/40 — aceitável** |  |

## Veredito de especificidade

A interface é distintiva para ferramentas de campanha e fluxos de RPG, com especificidade moderada na execução. O conjunto de módulos por função e a paleta violeta/dourada dão identidade. Em partes secundárias, cartões escuros, formulários e ações por ícone ainda poderiam pertencer a outro painel de administração de RPG sem muita adaptação.

### Varredura determinística

O Impeccable detectou 11 avisos `advisory` da regra `quality/design-system-color`, sem achados de severidade superior. Todos apontam cores literais fora da paleta ou das rampas documentadas em `DESIGN.md`:

- `src/components/dice-physics/DiceTrayPanel.tsx`: 9 literais nas camadas de luz e no resumo cinematográfico dos dados (linhas 146, 287–288, 303–304 e 316).
- `src/components/mapa/ui/BackgroundButton.tsx:78`: `#a3e3ff`.
- `src/pages/Index.tsx:211`: `hsla(270, 100%, 50%, 0.9)`.

A regra identificou corretamente os valores fora dos tokens. Pelo uso no código, eles parecem acentos intencionais de iluminação, mapa e abertura; a varredura não demonstra problema de contraste. Não alterei essas cores nesta rodada para preservar a aparência estabelecida.

## Impressão geral

A entrada e a caixa de ferramentas transmitem com clareza o contexto de uma campanha. O principal risco de usabilidade está na densidade: a navegação e alguns módulos pedem mais varredura e familiaridade prévia do que uma sessão em andamento deveria exigir.

## O que funciona

- A paleta escura com acentos violeta e dourado, junto aos papéis tipográficos de título, leitura e dados, cria um clima próprio.
- A casca do produto atende fluxos de Mestre e jogador com ferramentas específicas de campanha.
- Nesta rodada, vários controles ganharam nomes e estados semânticos; abertura por teclado, resultado de dados anunciado, painéis recolhidos fora da ordem de foco e ações antes ocultas por hover ficaram mais acessíveis.

## Problemas prioritários

1. **[P2] A navegação ainda exige varrer módulos demais.** `Header.tsx` mantém seis destinos visíveis e o menu “Módulos” lista novamente toda a coleção — 10 opções para jogador e 15 para Mestre. Isso duplica escolhas e deixa o menu longo. **Impacto:** encontrar destinos frequentes leva mais atenção, sobretudo para quem está entrando no produto. **Correção:** manter os destinos mais usados visíveis e listar no menu apenas os módulos de overflow, preservando a ordem salva e o destino ativo. **Comando sugerido:** `$impeccable polish`.

2. **[P2] Remover um marcador do mapa depende de hover.** Em `WorldMapView.tsx:414–425`, a ação do Mestre fica oculta por `hidden group-hover:flex`; não aparece ao navegar por teclado. **Impacto:** a ação fica indisponível para quem usa teclado e difícil de descobrir em toque. **Correção:** mostrar o controle em `focus-within` ou mantê-lo visível com um estado de foco claro. **Comando sugerido:** `$impeccable harden`.

3. **[P2] A ajuda está distante de tarefas complexas.** O Guia é um módulo separado e não aparece entre os seis primeiros destinos padrão, enquanto pedidos de teste, fichas e edição do mapa têm controles próprios. **Impacto:** iniciantes precisam lembrar termos e procurar explicações fora do fluxo. **Correção:** acrescentar instruções curtas nos pontos de decisão mais difíceis e manter o Guia como referência completa. **Comando sugerido:** `$impeccable clarify`.

4. **[P3] Alguns acentos visuais ficam fora dos tokens documentados.** O detector apontou 11 cores literais no dado, no fundo do mapa e na abertura. **Impacto:** futuras alterações de cor não os atualizam de forma centralizada. **Correção:** registrar esses acentos como tokens intencionais ou migrá-los para variáveis semânticas depois de conferir a aparência renderizada. **Comando sugerido:** `$impeccable polish`.

## Correções aplicadas nesta rodada

- Abertura inicial acionável por teclado; botões de zoom e de abertura do Hub com nomes explícitos; fallback de carregamento anunciado.
- Gatilhos de expansão de Cardápios, Itens e Baús com semântica de botão, estado expandido e conteúdo recolhido fora da ordem de foco.
- Ações de convite, Hub, logs, grimório, chefes e Omni com nomes acessíveis; ações do Grimório e dos chefes sempre visíveis.
- Dias do calendário com data e contagem de eventos anunciadas; seleções de combate, névoa, luz, descanso e emblema com estado exposto.
- Configurações da luz uniformizadas em português; resultado dos dados anunciado por região viva.
- Cabeçalho de Baús reorganizado para manter edição e salvamento fora do botão de expansão.

## Alertas por perfil

- **Sam (acessibilidade):** as ações do Grimório, dos chefes, dos convites e dos painéis agora têm nomes ou estados; a remoção de marcador no mapa continua inacessível sem hover.
- **Jordan (primeiro acesso):** o Guia não está entre os seis primeiros destinos padrão; “OMNI” e “PE” podem exigir conhecimento prévio de campanha.
- **Alex (usuário frequente):** a navegação pode ser reordenada, mas há poucos atalhos de teclado para ações frequentes.

## Observações menores

- Alguns rótulos de navegação e apoio usam `text-xs`; serifas pequenas podem desacelerar a leitura.
- Logs, zoom, dados e Hub ajudam durante a sessão; a soma de sua presença deve ser comparada à tarefa principal em cada módulo.
- Inspeção do código não confirma contraste, espaçamento ou tempo das animações no navegador.

## Questões para considerar

- Quais quatro ou cinco módulos precisam ficar visíveis para cada função durante uma sessão comum?
- Quais fluxos mais precisam de ajuda no contexto: fichas, pedidos de teste ou edição do mapa?
- Durante a partida, qual efeito visual deve ter prioridade: o momento cerimonial dos dados ou a confirmação mais rápida da ação?
