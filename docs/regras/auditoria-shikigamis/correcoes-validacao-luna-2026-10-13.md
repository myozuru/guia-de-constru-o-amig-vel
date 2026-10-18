# Correções após validação da Luna

Branch: `fix/invocacoes-confirmacao-escala`.
Origem: pedido expresso do usuário nesta sessão após validação técnica da Luna.

## Etapa 16

`confirmacaoAutonomia.ts` cancela propostas do perfil anterior na troca de perfil, incluindo troca para nenhum perfil. O cancelamento resolve a espera sem emitir aceite e libera a fila da instância. O teste enfileira dois eventos, troca o perfil, verifica ausência de execução/débito/uso e depois confirma uma nova proposta no perfil original para provar que a fila continua utilizável.

## Seção 10.4

- Ataques de Horda contam comandos efetivamente debitados, incluindo erros; um ataque com vários alvos conta como um uso. O contador é por instância, sem somar as ações dos membros. Cada par de membros aumenta em um o intervalo entre penalidades de −3.
- Auxílios mantêm o total bruto de usos e calculam o número de repetições penalizadas como floor(usos anteriores / intervalo atual). O total persistido continua sendo a quantidade real de usos, não a quantidade de penalidades.
- `processarResetEconomiaInstancia` limpa os contadores no início do turno do dono, rodada ou combate, preservando a proteção contra o mesmo evento de reset repetido.
- O tamanho é calculado da categoria-base e da composição atual. Fica disponível no token, cartão da Horda e contexto declarativo da autonomia (`shikigami.tamanho`, `shikigami.categoriaTamanho`). Não amplia a ocupação do token nem cria multiplicadores de dano por tamanho.
- Defesa, Acerto, RD e dano adicional concedidos pela Horda recebem proveniência: dono, instância, grau/categoria/configuração original e usos brutos anteriores à concessão. Mudanças de composição recalculam esses efeitos da base original, em personagens e invocações, sem modificar sua duração, consumir ações ou reaplicar cura.
- `suporteContinuoHorda.ts` observa composição e efeitos persistidos; não altera a função de perda de membros. O recálculo é idempotente, protegido contra reentrada, e atualiza a Defesa do token quando necessário. Movimento comum não dispara a varredura pelo observador do mapa.
- Efeitos antigos sem proveniência são preservados; não inferir ação ou uso original pelo nome do bônus. Cura/PVT já aplicados são resultados imediatos e não são reaplicados pela reescala.
- O auxílio da invocação em si mesma agora preserva os débitos já gravados na instância, evitando sobrescrever a economia com um snapshot anterior à concessão.

## Preservação das seções 9.2/9.4

As regras de remoção, ajuste proporcional de PV, seleção de membros, espera de uma rodada e rearme por cura não foram alteradas neste lote. Permanecem conforme `perda-membros-horda-decisoes-2026-10-13.md`. Os testes de perda continuam aprovados.

## Flags e métricas

O toggle existente `VITE_INVOCACOES_ESCALA_HORDA` governa escala e intervalo adicional. Desativá-lo retorna aos valores-base; continua sendo obrigatório confirmar qualquer execução autônoma. `efeitosSuporteReescalados` conta os efeitos que realmente mudaram de valor/fórmula, sem contar sincronizações sem alteração. As flags e métricas anteriores permanecem disponíveis.

## Validação

- 6 arquivos de teste e 105 testes aprovados: autonomia, escala, mapa, Hordas, economia e resolução após TR.
- Teste no mapa: dois ataques sem penalidade, terceiro com −3; auxílios 10/10/9; reset idempotente; reescala ao sair/entrar membro; tamanho Grande/Médio/Grande; efeitos de personagem e invocação; Defesa, Acerto, RD e fórmula de dano adicional; sincronização repetida não altera a ficha.
- `npx tsc --noEmit --pretty false` e `git diff --check` aprovados. A fixture do teste novo foi corrigida para declarar os seis atributos exigidos; o teste direcionado passou após essa correção.
- Sem teste de navegador, publicação, commit ou push. Limites de transporte/autoridade entre telas permanecem conforme o relatório anterior.
