# Etapa 18 — Recuperação, reinvocação, perda e Hordas

**Status:** recuperação e decisões de derrota implementadas; Hordas já podem ser criadas e persistidas no mapa como uma única entidade com PV e contribuição temporal compartilhados. Efeitos de combate e dissipação ainda estão pendentes.

## Decisões confirmadas em 2026-10-11

- Ao chegar a 0 PV, a ficha permanece no catálogo e continua invocável; materializa Caída. A perda permanente exige −100% dos PV máximos e depende de decisão do Mestre; atingir o limiar não remove a invocação automaticamente.
- Somente o Mestre resolve uma derrota. Ele pode autorizar a recuperação ou registrar a perda permanente.
- Enquanto a derrota em −100% aguarda o Mestre, a invocação não pode ser materializada novamente. Após autorização de recuperação, pode ser invocada com 0 PV e entra Caída.
- Ao autorizar a recuperação, o Mestre mantém a ficha com 0 PV. Um descanso longo restaura 100% dos PV. Descansos não resolvem derrotas que ainda aguardam decisão do Mestre e não revertem uma perda permanente.
- Após dissipação voluntária, o texto-base permite trazer a invocação de volta sem pagar PE novamente e com os PV que tinha ao ser dissipada. Após dissipação forçada a 0 PV, a nova invocação cobra o PE configurado; por decisão do usuário, materializa com 0 PV e Caída até um descanso longo restaurar 100% dos PV. Cada nova materialização acrescenta novamente o tempo configurado ao relógio global. Invocar continua como Ação Livre, e a instância espera seu próximo turno na iniciativa.
- A duração e os efeitos da incapacitação ficam pendentes de revisão. A regra antiga de cura parcial e levantar com Ação de Movimento precisa ser revisada; não foi criada uma duração provisória.
- O relógio é global, sem prioridade entre contribuições, e termina para todas as invocações quando o saldo global acaba. A retirada voluntária tem piso de 10 segundos.
- O limite de Hordas ativas é metade do limite de invocações, arredondado para baixo. Uma Horda tem uma única contribuição de tempo ao relógio global e um total geral compartilhado de PV; os integrantes não recebem relógios nem pools de PV individuais.
- Quando a Horda perde metade dos membros ao chegar à metade dos PV máximos, arredonda-se para baixo a quantidade de membros perdidos. O ajuste do PV atual quando o máximo diminui continua sem regra definida.

## Implementado

- `estadoInvocacao.ts` limita a resolução de derrotas ao Mestre, deixa a invocação recuperada com 0 PV e impede declarar perda permanente antes de −100% dos PV máximos.
- `mapa.ts` permite materializar uma invocação com 0 PV como Caída; preserva a instância derrotada e seu PV histórico; descansos restauram o catálogo e atualizam tokens ainda ativos, sem resolver derrotas pendentes nem alterar instâncias históricas.
- `useCharacterStore.applyLongRest` chama a restauração de invocações junto ao descanso longo normal.
- A interface remove a escolha manual de PV e apresenta ao Mestre as decisões de recuperação ou perda permanente.
- `hordas.ts` valida os graus e integrantes permitidos pelo texto-base e calcula PV compartilhados, custo PE adicional, efeitos por quantidade de membros e um único campo de tempo para a entidade.
- `mapa.ts` materializa a Horda com um token e uma instância, grava a composição e o PV compartilhado, cobra o PE total e registra uma contribuição temporal. A Horda conta como uma vaga; seus membros não podem ser invocados individualmente enquanto permanecerem vinculados.
- A aba **Invocações** permite selecionar líder, membros e contribuição temporal na criação, mostra a prévia de PV/custo e identifica as fichas vinculadas. O cartão mostra o pool compartilhado e as ações do líder; edição, remoção e invocação separada ficam bloqueadas enquanto a composição existir.
- A dissipação da Horda continua bloqueada na interface e no controlador até definir como devolver o pool compartilhado às fichas individuais.
- `controladorTempo.test.ts` cobre consumo proporcional e o piso de 10 segundos; os testes de resolução de derrota cobrem Mestre exclusivo, limiar de perda e recuperação integral após descanso longo.
- `controladorHordas.test.ts` cobre limites, composição, cálculo de PV/custo e efeitos derivados da Horda.

## Pendências

- Definir a duração e os efeitos da incapacitação, incluindo se a regra antiga de recuperação parcial e ação para levantar continua válida. A regra de duração não foi inventada; 0 PV materializa Caída por enquanto.
- Aplicar no fluxo de combate as regras calculadas: tamanho, terreno difícil/flanqueamento, Fragilizada por área e RD contra alvo único.
- Implementar a perda de metade dos membros ao chegar a metade dos PV, removendo primeiro os de menor grau. O arredondamento para baixo está definido; ainda falta decidir como ajustar os PV atuais quando o máximo diminui e processar o caso em que o dano cruza o limiar.
- Implementar a dissipação voluntária da Horda apenas no fim do combate e a redução pela metade dos PV máximos do líder caso ele forme outra Horda após uma dissipação durante o combate.
- Definir como o pool geral de PV se relaciona com as fichas individuais quando a Horda se dissipa ou perde membros; até lá, dissipação e reinvocação da composição permanecem bloqueadas.
- O texto-base limita o líder a Primeiro Grau ou inferior; o cálculo atual rejeita líder Especial. Só reabrir o custo de membro de Primeiro Grau sob líder Especial se o usuário autorizar essa exceção.

## Verificação

- `npx vitest run src/test/controladorHordas.test.ts --reporter=dot`: **1 arquivo, 5 testes aprovados**.
- `npx vitest run src/test/controladorMapa.test.ts --reporter=dot`: **1 arquivo, 60 testes aprovados**, incluindo materialização única da Horda, custo, PV e contribuição temporal.
- `npx tsc --noEmit --pretty false`: aprovado após os ajustes finais da interface.
- `git diff --check`: limpo.
- Os testes da fundação usam apenas o calculador puro; nenhuma chamada ao Supabase é necessária.
