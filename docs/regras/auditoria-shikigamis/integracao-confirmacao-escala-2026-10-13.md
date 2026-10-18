# Integração incremental: confirmação e escala de Horda

Branch: `fix/invocacoes-confirmacao-escala`. Alterações locais anteriores foram preservadas. Sem commit, push ou integração na main.

## Fontes e decisões

- Nota `Luna_Analise_Regras_Invocacoes`, lida no arquivo local do workspace Maestri (não estava conectada ao terminal).
- Documentos `AUTONOMIA_CONFIRMACAO_IMPLEMENTACAO.md`, `HORDA_PERDA_MEMBROS_IMPLEMENTACAO.md`, `HORDA_ESCALA_COMBATE_IMPLEMENTACAO.md`, no papel do orquestrador.
- Plano em `Downloads/PLANO_COMPLETO_IMPLEMENTACAO_SHIKIGAMIS_TSP_2026-10-09.txt`, especificação complementar e auditorias das etapas 18/20.
- O usuário confirmou nesta sessão implementar confirmação e escalas verificadas e manter remoção bloqueada até resolver as lacunas.

Os exemplos técnicos de multiplicar dano por `1 + 0,5 × membros` não foram aplicados: os aumentos são níveis de dados, resolvidos pela tabela existente `damageStep`. A proposta de somar líder ou escalar toda ação pelo multiplicador de PV conflita com as regras específicas e a instrução inicial. A escala usa membros adicionais, com o líder mantendo suas ações e características; não há soma de ações individuais.

## Implementado

- Proposta local com Confirmar/Recusar na interface Sonner existente, endereçada ao perfil do dono. Mostra invocação, regra/gatilho, alvos, categoria, custos/debitos e configuração dos efeitos.
- Recusa/cancelamento não gastam recursos nem usos. Mudança de rodada, índice de turno ou fim de combate cancela ofertas.
- Aceite opaco de uso único, vinculado a requestId, perfil, dono, instância, modelo, ação e alvos. O executor autônomo rejeita chamadas sem aceite, inclusive chamadas diretas.
- Após confirmação, revalida snapshot do modelo/OMNI/instância/token/turno e seleção de alvos; o executor verifica alcance, saldo e economia. Mudança da proposta exige nova oferta em outro evento.
- Ataques e dano após TR usam dados escalados uma única vez; bônus fixos não são multiplicados nem a ficha-base alterada.
- Cura: níveis por membro, +2 para cada membro de Segundo Grau; modificador de atributo preservado.
- Auxílios: Defesa/Acerto +floor(Segundo Grau/2), dano adicional +floor(membros/2) níveis, RD +membros.
- Tamanho continua como categorias adicionais já calculadas na composição, mantendo token/espaço único. Não foi criada soma de turnos nem movimento extra.
- Perda por metade dos PV agora é resolvida com as decisões adicionais do usuário; veja `perda-membros-horda-decisoes-2026-10-13.md`. O modo de pendência persistente continua disponível quando a remoção automática está desativada.

## Toggles e métricas

`VITE_INVOCACOES_CONFIRMACAO=false` bloqueia propostas/execuções autônomas; nunca retorna ao comportamento sem aceite. `VITE_INVOCACOES_ESCALA_HORDA=false` desativa os novos aumentos de ataque/suporte. Ambos habilitados por padrão. São configurações de build, não flags persistidas da mesa.

`metricasIntegracaoInvocacoes` registra propostas, aceites, recusas, cancelamentos, propostas invalidadas, chamadas sem aceite bloqueadas, execuções confirmadas, limiares pendentes e distribuição de escala por tipo. Contadores locais em memória; sem envio de dados de fichas ou serviço de telemetria.

## Limitações para revisão do Opus

- A oferta e o aceite são locais ao processo/tela do perfil dono. Eventos originados somente em tela remota não têm transporte de propostas implementado. Não há arbitragem/CAS entre duas telas do mesmo perfil: o uso único protege este processo, não constitui garantia distribuída.
- O despachante aguarda resposta na fila da instância e na cadeia OMNI. Não pausa explicitamente o relógio. Revisar a interação do await com cadeias longas; não foi definido prazo automático.
- A autonomia existente resolve apenas ações compatíveis com seu executor de ataque. Suporte autônomo, áreas e outros tipos incompatíveis continuam bloqueados; não foram inventados novos executores.
- Suporte contínuo com proveniência agora é reescalado por pedido expresso do usuário. Detalhes em `correcoes-validacao-luna-2026-10-13.md`; registros antigos sem origem não são reconstruídos por suposição.
- Perda por metade dos PV: usuário definiu PV proporcional, desempate por entrada/ID, preservação de PV individuais, espera de uma rodada e rearme com cura efetiva de 25%; integrados ao mapa. Dissolução da Horda continua bloqueada e separada da reinvocação individual dos removidos.
- Penalidades por múltiplos ataques/auxílios agora usam os contadores reais e resets; tamanho efetivo está disponível na interface e no contexto de autonomia. Movimento/flanqueamento permanecem pendências separadas da etapa 20.
- Não foram realizados testes de navegador ou build de produção. A integração é candidata a revisão, não conclusão integral das etapas 9/10/16.

## Verificação

Testes escritos antes dos novos módulos reproduziram falhas por funções ausentes. Após integração, os quatro arquivos relevantes passaram inicialmente (77 testes). Expansão posterior: autonomia e escala passaram em conjunto (16 testes); mapa passou (63 testes), incluindo dois ataques escalados sem acumulação e auxílio de RD no mapa. O arquivo existente de Hordas passou na execução inicial (6 testes). Total do escopo atual: 85 testes aprovados em execuções por grupos.

Verificação final conjunta: **4 arquivos, 85 testes aprovados**. `npx tsc --noEmit --pretty false` aprovado após o último teste de mapa. `git diff --check` aprovado; o Git emitiu apenas aviso de CRLF no arquivo gerado já alterado anteriormente.
