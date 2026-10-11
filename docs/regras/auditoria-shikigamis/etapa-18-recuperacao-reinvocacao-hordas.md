# Etapa 18 — Recuperação, reinvocação, perda e Hordas

**Status:** em andamento. As decisões de recuperação, tempo e Hordas recebidas em 2026-10-11 estão registradas aqui; ainda falta implementar e validar as regras de PV e Hordas.

## Implementado antes das decisões de 2026-10-11 (revisar)

- Em combate, a dissipação voluntária só passa no turno do dono.
- Uma invocação não pode ser dissipada voluntariamente na rodada em que foi chamada.
- Invocações Caídas ainda podem ser recolhidas quando os demais requisitos forem atendidos.
- A causa `dissipacao_voluntaria` fica registrada na instância preservada.
- Uma instância derrotada continua aguardando resolução; a dissipação voluntária não a remove nem substitui essa decisão.
- O código ainda permite resolução pelo Controlador dono e pelo Mestre, com PV de recuperação escolhidos manualmente. A decisão atual restringe a resolução ao Mestre e restaura 100% dos PV após descanso longo.
- O código guarda no histórico os PV da derrota e os PV escolhidos; esse fluxo deve ser alterado para não oferecer recuperação parcial.
- A perda permanente mantém a ficha e a instância no histórico, arquiva o modelo e bloqueia novas invocações. Essa decisão será exclusiva do Mestre e só pode ocorrer a −100% dos PV máximos.

## Decisões confirmadas em 2026-10-11

- Com 0 PV a ficha continua disponível; um descanso longo restaura 100% dos PV.
- A duração e os efeitos da incapacitação ficam pendentes de revisão. A regra anterior de cura parcial e levantar com Ação de Movimento precisa ser reavaliada antes de ser mantida.
- O Mestre sempre decide. Perda permanente antes de −100% dos PV máximos é proibida; alcançar −100% não apaga a ficha automaticamente.
- O relógio de Shikigamis é global e compartilhado, sem prioridade por invocação. Ao acabar o relógio global, termina o tempo de todos.
- O limite de Hordas ativas arredonda para baixo.
- Uma Horda tem uma única reserva de tempo como entidade; seus integrantes não recebem temporizadores separados. A Horda compartilha um único total geral de PV.

## Divergências e dependências ainda abertas

- Revisar o código atual de PV 0, cura parcial, estado Caído e ação para se levantar para aplicar a decisão de descanso longo e guardar a duração de incapacitação como pendência.
- Restringir a resolução de derrota ao Mestre e trocar a recuperação manual parcial pela restauração integral no descanso longo.
- Reinvocação: cobrança de PE e política de reinício de ações. O descanso longo restaura 100% dos PV.
- Hordas: valor adicional de PE para membro de Primeiro Grau sob líder Especial (revisar depois); interação da reserva temporal única da Horda com o relógio global; aplicação da regra de −100% dos PV e tratamento do tempo quando a Horda termina.
- O sistema não cria nem materializa Hordas até essas regras serem definidas. As regras do livro que já são determinadas podem ser implementadas sem alterar o TXT original.

## Verificação

- `src/test/controladorDissipacaoVoluntaria.test.ts` testa turno do dono, rodada de criação, estado Caído, derrota e dissipação fora de combate.
- `src/test/controladorResolucaoDerrota.test.ts` ainda testa a permissão e recuperação manuais anteriores; atualizá-lo para Mestre exclusivo e recuperação integral após descanso longo.
- Testes locais sem conexão com Supabase.
