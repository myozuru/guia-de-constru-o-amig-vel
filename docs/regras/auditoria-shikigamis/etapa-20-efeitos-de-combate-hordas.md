# Etapa 20 — Efeitos de combate das Hordas

**Status:** efeitos de alvo único e de área ligados ao fluxo de dano de invocações. Movimento, flanqueamento e escala por número de membros permanecem em aberto.

## Implementado

- Ataques comandados podem selecionar uma invocação visível no mapa como alvo individual, incluindo uma Horda. O controlador valida ficha, instância, estado e alcance antes de executar o ataque.
- O tipo de alvo acompanha o dano imediato e o dano aplicado depois de um Teste de Resistência.
- Uma Horda atingida por alvo único soma o nível do Controlador à RD normal da invocação. O bônus especial é aplicado sem uma rota de negação de RD.
- Uma Horda atingida por uma ação em área resolve aquele dano com RD e resistências zeradas, conforme o estado Fragilizada descrito no texto-base.
- Os integrantes continuam representados por um único token e o alvo continua contando como uma única invocação.

## Pendências preservadas

- O texto-base não informa por quanto tempo Fragilizada permanece. A implementação zera RD/resistências na resolução do dano da área; não prolonga a condição para ações posteriores.
- O mapa trata entidades como bloqueadoras e ainda não tem uma regra operacional geral para distinguir aliados de inimigos em todos os movimentos. Falta permitir ocupação/invasão do espaço da Horda apenas por inimigos e cobrar o custo de terreno difícil na trajetória.
- O sistema de flanqueamento atual deriva o estado de posições e aliados adjacentes; ainda não representa a Horda como flanqueadora por si só.
- Os painéis de ataque e feitiço de personagens ainda não direcionam dano para instâncias de invocação; a RD especial ainda precisa ser conectada aos ataques comuns de jogador e Mestre.
- `usosAntesPrejuizoMultiplo` e `categoriasTamanhoAdicionais` ainda são metadados de composição. Falta integrá-los à contagem de penalidades de ataques/auxílios e aos efeitos configurados de cada ação, mantendo o token em um espaço.
- A perda de metade dos membros ao cruzar metade dos PV, o novo máximo de PV e o tratamento de dano que cruza o limiar continuam sem resolução, conforme registrado na etapa 18.

## Verificação

- Testes puros cobrem RD normal, RD de Horda contra alvo único e Fragilizada durante dano em área.
- Teste de controlador materializa uma Horda e confirma o dano resultante nos dois tipos de alvo.
- O fluxo de seleção e o caminho de dano após TR passam o tipo de alvo explicitamente.
