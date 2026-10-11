# Etapa 18 — Recuperação, reinvocação, perda e Hordas

**Status:** recuperação e decisões de derrota implementadas; cálculo-base de Hordas implementado, mas criação e uso em combate ainda pendentes.

## Decisões confirmadas em 2026-10-11

- Ao chegar a 0 PV, a ficha permanece no catálogo e continua invocável; materializa Caída. A perda permanente exige −100% dos PV máximos e depende de decisão do Mestre; atingir o limiar não remove a invocação automaticamente.
- Somente o Mestre resolve uma derrota. Ele pode autorizar a recuperação ou registrar a perda permanente.
- Enquanto a derrota em −100% aguarda o Mestre, a invocação não pode ser materializada novamente. Após autorização de recuperação, pode ser invocada com 0 PV e entra Caída.
- Ao autorizar a recuperação, o Mestre mantém a ficha com 0 PV. Um descanso longo restaura 100% dos PV. Descansos não resolvem derrotas que ainda aguardam decisão do Mestre e não revertem uma perda permanente.
- Após dissipação voluntária, o texto-base permite trazer a invocação de volta sem pagar PE novamente e com os PV que tinha ao ser dissipada. Após dissipação forçada a 0 PV, a nova invocação cobra o PE configurado; por decisão do usuário, materializa com 0 PV e Caída até um descanso longo restaurar 100% dos PV. Cada nova materialização acrescenta novamente o tempo configurado ao relógio global. Invocar continua como Ação Livre, e a instância espera seu próximo turno na iniciativa.
- A duração e os efeitos da incapacitação ficam pendentes de revisão. A regra antiga de cura parcial e levantar com Ação de Movimento precisa ser revisada; não foi criada uma duração provisória.
- O relógio é global, sem prioridade entre contribuições, e termina para todas as invocações quando o saldo global acaba. A retirada voluntária tem piso de 10 segundos.
- O limite de Hordas ativas é metade do limite de invocações, arredondado para baixo. Uma Horda tem uma única contribuição de tempo ao relógio global e um total geral compartilhado de PV; os integrantes não recebem relógios nem pools de PV individuais.

## Implementado

- `estadoInvocacao.ts` limita a resolução de derrotas ao Mestre, deixa a invocação recuperada com 0 PV e impede declarar perda permanente antes de −100% dos PV máximos.
- `mapa.ts` permite materializar uma invocação com 0 PV como Caída; preserva a instância derrotada e seu PV histórico; descansos restauram o catálogo e atualizam tokens ainda ativos, sem resolver derrotas pendentes nem alterar instâncias históricas.
- `useCharacterStore.applyLongRest` chama a restauração de invocações junto ao descanso longo normal.
- A interface remove a escolha manual de PV e apresenta ao Mestre as decisões de recuperação ou perda permanente.
- `hordas.ts` valida os graus e integrantes permitidos pelo texto-base e calcula PV compartilhados, custo PE adicional, efeitos por quantidade de membros e um único campo de tempo para a entidade.
- `controladorTempo.test.ts` cobre consumo proporcional e o piso de 10 segundos; os testes de resolução de derrota cobrem Mestre exclusivo, limiar de perda e recuperação integral após descanso longo.
- `controladorHordas.test.ts` cobre limites, composição, cálculo de PV/custo e efeitos derivados da Horda.

## Pendências

- Definir a duração e os efeitos da incapacitação, incluindo se a regra antiga de recuperação parcial e ação para levantar continua válida. A regra de duração não foi inventada; 0 PV materializa Caída por enquanto.
- Integrar o cálculo à ficha, persistência e mapa: criar uma Horda como uma entidade/token, retirar os tokens dos membros, usar apenas as ações do líder, e respeitar aprovação, propriedade e limite de vagas.
- Aplicar no fluxo de combate as regras calculadas: PV geral, contribuição temporal única, tamanho, terreno difícil/flanqueamento, Fragilizada por área e RD contra alvo único.
- Implementar a perda de metade dos membros ao chegar a metade dos PV. O texto-base não esclarece o arredondamento com número ímpar de membros nem como ajustar o PV atual quando os PV máximos diminuem; não inventar esses detalhes.
- Implementar a dissipação voluntária da Horda apenas no fim do combate e a redução pela metade dos PV máximos do líder caso ele forme outra Horda após uma dissipação durante o combate.
- O texto-base limita o líder a Primeiro Grau ou inferior; o cálculo atual rejeita líder Especial. Só reabrir o custo de membro de Primeiro Grau sob líder Especial se o usuário autorizar essa exceção.

## Verificação

- `npx vitest run src/test/controladorHordas.test.ts --reporter=dot`: **1 arquivo, 5 testes aprovados**.
- `npx tsc --noEmit --pretty false`: aprovado.
- `git diff --check` e verificação de espaços finais: limpos.
- Os testes da fundação usam apenas o calculador puro; nenhuma chamada ao Supabase é necessária.
