# Etapa 19 — auditoria inicial de multiplayer e segurança

**Data:** 11/10/2026  
**Branch revisada:** `main`  
**Commit-base revisado:** `a512391`  
**Status:** em andamento; esta auditoria não conclui a etapa.

## Escopo executado

- Revisadas as políticas de acesso de `realtime_world` e as proteções das
  fatias compartilhadas.
- Verificados os caminhos autenticados de aprovação de invocações e de
  intenções de combate.
- Rodados testes unitários de permissão e protocolo sem sessão, credenciais ou
  conexão com Supabase.

## Evidências

- `supabase/migrations/20261006010000_harden_shared_world_access.sql` permite
  leitura, inserção e atualização de `realtime_world` para qualquer conta
  autenticada.
- `supabase/migrations/20261009010000_restrict_master_world_slices.sql`
  restringe no banco as fatias `worldBosses`, `worldBossesMaster`, `worldMap`,
  `chronos` e `omniEntidades`.
- As migrações `20261011010000_secure_character_slice_writes.sql` e
  `20261011020000_secure_map_scene_writes.sql` bloqueiam gravações diretas de
  `characters` e `mapScene`; ainda precisam ser aplicadas e verificadas no
  projeto Supabase.
- `src/hooks/useMultiplayerSync.ts` consulta
  `podePublicarWorldSlice(useRoleStore.getState().role, slice)` antes de
  publicar certas fatias. Essa checagem ocorre no cliente e não substitui a
  política do banco.
- `src/lib/controlador/aprovacao.functions.ts` valida identidade, papel,
  propriedade e revisão por Server Functions autenticadas.
- `src/lib/combat/actionRequests.functions.ts` valida o vínculo persistido em
  `combat_character_owners` ao receber uma intenção e agora encaminha as
  gravações autenticadas de `characters` e `mapScene`.
- `src/test/worldSliceAuthorization.test.ts` e
  `src/test/combatActionProtocol.test.ts` cobrem regras puras; não exercitam
  políticas RLS nem a sincronização real.

## Achado S19-01 — gravação de personagens e mapa sem autorização por dono

**Severidade:** alta. Antes do incremento desta rodada, uma conta autenticada
podia enviar gravações diretas das fichas e do mapa, inclusive alterando dados
de personagens e tokens alheios. As duas fatias agora têm caminhos
transacionais preparados com validação de propriedade.

Não é seguro resolver o achado apenas bloqueando essas fatias para jogadores:
eles precisam sincronizar alterações próprias e controlar suas invocações. A
proteção continua parcial até validar no banco os fluxos reais e cobrir as
operações de criação/recolhimento de tokens e alteração de assets.

## Mitigação S19-04 — mapa com escrita autenticada

`write_owned_map_scene` usa `auth.uid()` e `has_role` no banco, recebe um
`requestId` e serializa as gravações da cena. O Mestre grava a cena completa
com revisão otimista; o jogador não inicializa nem altera a estrutura da cena.
Para jogadores, o banco mescla somente `x` e `y` de tokens já existentes,
desbloqueados e cujo `ownerCharId` ou `characterId` está vinculado à conta em
`combat_character_owners`. O restante do snapshot enviado é ignorado. A
resposta devolve o mapa efetivo para corrigir o estado local.

A política RLS bloqueia `INSERT`/`UPDATE` diretos em `mapScene`. No modo Cloud,
os broadcasts de mapa e os patches incrementais abertos deixam de ser enviados
ou aplicados; posições são persistidas pela RPC após a janela de salvamento e
chegam aos clientes pelo Postgres Changes. Isso aumenta a latência visível do
movimento no modo Cloud para até cerca de 1,5 s. A trajetória ao vivo não é
replicada nesta versão, então gatilhos que dependem do percurso ainda precisam
de um transporte autenticado próprio.

O incremento ainda não autoriza jogadores a criar/remover tokens de invocação
nem altera assets de mapa. O Mestre continua responsável por alterações
estruturais, incluindo inserir/recolher tokens; a gravação em `realtime_assets`
continua fora desta mitigação. As migrações precisam ser aplicadas e validadas
no Supabase antes de considerar o fluxo protegido em produção.

## Mitigação S19-03 — fatia `characters` com CAS no banco

`write_owned_characters_slice` é uma RPC `SECURITY DEFINER` que deriva a conta
de `auth.uid()` e o papel com `has_role`; nunca confia em `profileId` ou em um
papel enviado no corpo. A transação serializa gravações, compara a revisão,
deduplica `requestId` e, para jogadores, substitui apenas as fichas que já
estão vinculadas a essa conta em `combat_character_owners`. Jogadores não
podem criar nem remover fichas pela fatia; o Mestre pode administrar a lista.
Na ficha do jogador, um modelo de invocação precisa coincidir com a versão e o
snapshot registrados em `invocation_approval_requests`; a única exceção de
estado é `hpAtual`. O banco usa a decisão registrada pelo Mestre, protege os
limites de invocações e impede remover modelos pendentes, perdidos ou ainda
referenciados por uma instância ativa.

A política RLS bloqueia `INSERT`/`UPDATE` diretos na fatia `characters`. O
cliente chama uma Server Function autenticada, não publica personagens em
broadcast aberto e aplica atualizações recebidas pelo canal Postgres Changes.
Em conflito de revisão, busca o estado atual e tenta mesclar uma vez.

Esta mitigação não valida as regras de cada operação de combate no servidor.
A transição de PV/economia das instâncias também continua dependendo da lógica
do cliente. A etapa permanece aberta até esses fluxos terem caminhos
autoritativos e ser possível verificar as migrações no banco de destino.

## Mitigação S19-02 — mesclagem concorrente de instâncias

`src/lib/charSyncStamps.ts` agora mescla `instanciasInvocacao` por ID próprio:
preserva instâncias novas criadas por clientes diferentes e, para a mesma
instância, prefere a revisão maior. Empates de revisão convergem pelo conteúdo
serializado para que os clientes terminem com o mesmo estado. `createdAt` é
registrado ao criar uma instância para manter a ordem do histórico.

Isso reduz a perda de instâncias distintas por sobrescrita de uma lista inteira.
Empates de revisão ainda podem descartar uma das duas edições concorrentes da
mesma instância; a escolha determinística garante convergência, não preservação
semântica. A mesclagem também roda no cliente e não prova propriedade, não impede
escritas diretas de terceiros e não substitui a validação autoritativa com
compare-and-swap no servidor. O achado S19-01 permanece aberto.

## Verificações anteriores sem Supabase

Comando executado:

```text
npx vitest run src/test/worldSliceAuthorization.test.ts src/test/combatActionProtocol.test.ts src/test/controladorResolucaoDerrota.test.ts src/test/controladorFundacao.test.ts
```

Resultado: **4 arquivos e 52 testes passaram**. Nenhuma conexão ou sessão
Supabase foi iniciada. Esses testes validam regras puras e não comprovam as
políticas de banco nem a autorização no transporte multiplayer.

Verificação incremental da S19-02:

- `npx vitest run src/test/charSyncStamps.test.ts src/test/controladorResolucaoDerrota.test.ts`: **2 arquivos e 24 testes passaram**.
- `npx tsc --noEmit --pretty false`: passou.
- `npm run build`: passou.

Essas verificações foram executadas localmente, offline e sem Supabase.

## Verificação deste incremento sem Supabase

- `npx vitest run src/test/ownedCharacterSlice.test.ts src/test/charSyncStamps.test.ts src/test/combatActionProtocol.test.ts src/test/worldSliceAuthorization.test.ts src/test/omniInventorySync.test.ts`: **5 arquivos e 48 testes aprovados**.
- `npx tsc --noEmit --pretty false`: passou.
- `npm run build`: passou.
- `git diff --check`: passou.
- Os testes cobrem a regra pura de propriedade, Mestre e revisão. Não conectam
  ao Supabase; a migração SQL ainda precisa ser aplicada e validada no ambiente.

## Próximo incremento

Completar a autorização de criação/recolhimento de tokens e a proteção dos
assets do mapa; depois aplicar e testar as duas migrações em uma mesa de
homologação com contas separadas de Mestre e Jogador.

## Estado das etapas

- Etapa 18: parcialmente concluída; recuperação manual foi publicada, mas
  reinvocação e Hordas ainda aguardam regras pendentes.
- Etapa 19: parcial; as rotas seguras e políticas RLS de `characters` e
  `mapScene` foram preparadas; criação/recolhimento de tokens, assets e
  validação no banco continuam pendentes.
- Etapa 20: pendente.

Assim, há **3 etapas numéricas abertas** (18, 19 e 20); a etapa 18 permanece
aberta junto com o início da etapa 19.
