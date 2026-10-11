# Etapa 18 — Recuperação, reinvocação, perda e Hordas

**Status:** recuperação e decisões de derrota implementadas; Hordas continuam pendentes de implementação.

## Decisões confirmadas em 2026-10-11

- Ao chegar a 0 PV, a ficha permanece no catálogo e continua invocável; materializa Caída. A perda permanente exige −100% dos PV máximos e depende de decisão do Mestre; atingir o limiar não remove a invocação automaticamente.
- Somente o Mestre resolve uma derrota. Ele pode autorizar a recuperação ou registrar a perda permanente.
- Enquanto a derrota em −100% aguarda o Mestre, a invocação não pode ser materializada novamente. Após autorização de recuperação, pode ser invocada com 0 PV e entra Caída.
- Ao autorizar a recuperação, o Mestre mantém a ficha com 0 PV. Um descanso longo restaura 100% dos PV. Descansos não resolvem derrotas que ainda aguardam decisão do Mestre e não revertem uma perda permanente.
- O custo de PE configurado continua sendo cobrado em cada invocação; invocar continua como Ação Livre. Uma instância recém-materializada espera seu próximo turno na iniciativa.
- A duração e os efeitos da incapacitação ficam pendentes de revisão. A regra antiga de cura parcial e levantar com Ação de Movimento precisa ser revisada; não foi criada uma duração provisória.
- O relógio é global, sem prioridade entre contribuições, e termina para todas as invocações quando o saldo global acaba. A retirada voluntária tem piso de 10 segundos.
- O limite de Hordas ativas é metade do limite de invocações, arredondado para baixo. Uma Horda tem uma única contribuição de tempo ao relógio global e um total geral compartilhado de PV; os integrantes não recebem relógios nem pools de PV individuais.

## Implementado

- `estadoInvocacao.ts` limita a resolução de derrotas ao Mestre, deixa a invocação recuperada com 0 PV e impede declarar perda permanente antes de −100% dos PV máximos.
- `mapa.ts` permite materializar uma invocação com 0 PV como Caída; preserva a instância derrotada e seu PV histórico; descansos restauram o catálogo e atualizam tokens ainda ativos, sem resolver derrotas pendentes nem alterar instâncias históricas.
- `useCharacterStore.applyLongRest` chama a restauração de invocações junto ao descanso longo normal.
- A interface remove a escolha manual de PV e apresenta ao Mestre as decisões de recuperação ou perda permanente.
- `controladorTempo.test.ts` cobre consumo proporcional e o piso de 10 segundos; os testes de resolução de derrota cobrem Mestre exclusivo, limiar de perda e recuperação integral após descanso longo.

## Pendências

- Definir a duração e os efeitos da incapacitação, incluindo se a regra antiga de recuperação parcial e ação para levantar continua válida. A regra de duração não foi inventada; 0 PV materializa Caída por enquanto.
- Implementar a montagem, materialização e ações da Horda. O TXT original fica intacto; somente regras confirmadas podem ser usadas.
- Definir o acréscimo de PE de um membro de Primeiro Grau sob líder Especial.
- Revisar, antes da implementação completa de Hordas, a perda de membros ao atingir metade dos PV, o tratamento de dano em área, o bônus contra alvo único, tamanho/ocupação e o destino do tempo ao terminar a Horda.

## Verificação

- Testes focados: **6 arquivos, 135 testes aprovados**.
- `npx tsc --noEmit` e `npm run build`: aprovados.
- Testes locais com stores/mocks; nenhuma chamada ao Supabase é necessária.
