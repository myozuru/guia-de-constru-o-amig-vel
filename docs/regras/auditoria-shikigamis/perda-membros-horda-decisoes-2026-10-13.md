# Perda de membros da Horda — decisões e integração

Origem: decisões expressas do usuário nesta sessão, em 13/10/2026, após as perguntas sobre as lacunas das seções 9.2 e 9.4. Estas escolhas são regras da mesa; não atribuir ao livro.

## Regras aprovadas e aplicadas

1. Ao cruzar ou atingir metade dos PV máximos, perder floor(membros adicionais/2). O líder permanece. Com um membro adicional, a quantidade perdida é zero.
2. Prioridade: menor grau; entre graus iguais, entrada mais recente; entre entradas iguais, menor ID. A composição grava `ordemEntrada`. Registros legados usam a posição no array, do primeiro ao último, como ordem de entrada.
3. Novo máximo = máximo anterior menos metade do máximo individual registrado de cada membro retirado. Novo PV atual = PV após o dano / máximo anterior × novo máximo. Preservar frações e razão negativa; não curar nem aplicar dano adicional durante o recálculo.
4. Cada retirado mantém seus PV individuais do catálogo no momento da remoção. A vida compartilhada não é copiada para integrantes. Removidos ficam disponíveis após um bloqueio persistente de uma rodada; custo normal de reinvocação continua aplicável.
5. Após uma perda, desarmar o limiar. Rearmar quando a cura efetiva acumulada atingir 25% do novo máximo registrado naquela ativação. Cura excedente e PVT não contam. Cura por comando e descanso longo acumulam cura efetiva. A próxima perda exige novo cruzamento do limiar.

## Integrações

- `hordas.ts`: seleção pura, proporção de PV, rearme por cura.
- `schema.ts`: ordem de entrada, estado do limiar, histórico de membros removidos, bloqueio de rodada e IDs de dano processados.
- `mapa.ts`: composição sobrevivente, pool único, token/HUD, tamanho e intervalo de prejuízo recalculados; custo derivado atualizado sem restituição de PE já pago; catálogo dos removidos preservado.
- Invocação individual, em lote e criação de outra Horda verificam a espera de uma rodada. Avanço de rodada reduz o bloqueio persistido. Não há liberação por tempo de parede; sem avanço de rodada, a espera permanece.
- As escalas de ataque/suporte consultam a composição sobrevivente, sem acumular multiplicadores na ficha.
- Dano com ID de evento já processado não é aplicado novamente à Horda. Ataques com requestId e dano após TR propagam IDs. A deduplicação depende de callers fornecerem um ID estável; não constitui arbitragem atômica distribuída.
- A interface mostra espera do membro retirado e resolução pendente quando a remoção está desativada.

## Toggles e métricas

- `VITE_INVOCACOES_REMOCAO_HORDA=false`: desativa a remoção automática. Não modifica PV/membros em uma transição de perda.
- `VITE_INVOCACOES_PERDA_HORDA=false`: desativa o registro de perda pendente usado quando a remoção automática está desativada.
- Por padrão, ambos habilitados. Com remoção desativada e registro habilitado, a pendência persiste na instância e não duplica o aviso após cura/recarregamento.
- Métricas locais: `perdasHordaResolvidas`, `membrosHordaRemovidos`, `perdasHordaPendentes`. Os históricos persistidos permitem conferir as transições; não há serviço externo de telemetria.

## Limites de escopo

Esta entrega resolve perda por metade dos PV com as decisões acima. Dissolução voluntária da Horda, revogação do líder, saída por exílio/efeitos específicos, herança de efeitos contínuos e autoridade distribuída continuam assuntos separados. As decisões atuais sobre PV e remoção não atribuem novas ações a integrantes.

## Verificação

Teste anterior reproduziu a ausência de persistência da pendência. Novos testes puros reproduziram a ausência de remoção proporcional e rearme. Após implementação, **5 arquivos e 94 testes passaram**: autonomia, cálculo/escala de Horda, mapa e dano após TR.

Cobertura nova: menor grau/entrada/ID, frações, PV negativos, um único membro adicional, cura insuficiente e suficiente, composição/token atualizados, preservação de PV individuais, reinvocação bloqueada/liberada, replay com ID estável após serialização e modo de pendência persistente.

`git diff --check` e `npx tsc --noEmit --pretty false` aprovados. Pronto para validação de regras pela Luna e revisão arquitetural posterior pelo Opus, no escopo descrito.
