# Controlador — Especificação complementar aprovada

**Data da decisão:** 2026-10-08  
**Status:** decisões de produto aprovadas pelo usuário; **não equivale a funcionalidades já implementadas**.  
**Fonte normativa preservada, sem alterações:** [Invocações — TXT original](./invocacoes_texto_original_2026-10-08.txt).

## Prioridade e interpretação
- O TXT original permanece intacto e fornece as regras-base do livro.
- Este documento especifica decisões de implementação, personalização e exceções expressamente autorizadas pelo usuário.
- Divergências entre funcionalidades existentes e estas decisões geram tarefas de correção; não devem ser tratadas como já resolvidas.
- Sempre que houver dúvida relevante de regra, comportamento ou design, **perguntar ao usuário antes de decidir**.
- Criador de Shikigamis: interface de **ficha completa**, com todos os campos em seções, não um assistente de etapas.

## Decisões anteriores confirmadas
1. **Livro como referência, com liberdade de edição:** usar os valores e tabelas do livro como sugestões/padrões; permitir alterações livres.
2. **Motor único OMNI:** ações, efeitos, gatilhos, características e fórmulas dos Shikigamis usam o OMNI; ampliar o motor quando necessário em vez de duplicá-lo.
3. **Evolução decidida pelo Controlador:** o jogador escolhe como evoluir sua invocação, inclusive suas opções e distribuição, em vez de impor uma reconstrução fixa.
4. **Limites informativos:** mostrar avisos de divergência em relação ao livro, sem bloquear salvamento ou edição apenas por exceder valores recomendados; preservar validações técnicas e de segurança.
5. **Combate conforme a fonte:** substituir comportamentos provisórios conflitantes, especialmente comandos e movimentação, pelas regras do TXT ou por exceções explicitamente aprovadas.

## Sete esclarecimentos adicionais aprovados
### 1. Alternância automática/manual por campo
Cada campo derivado da ficha deve oferecer um controle explícito para alternar entre **valor calculado automaticamente** e **valor manual**. Ao utilizar o modo manual, preservar o valor inserido, sem sobrescrevê-lo silenciosamente pelo cálculo automático. A alternância deve ser independente por campo.

### 2. Evolução e recálculo
Ao subir de nível ou evoluir, atualizar automaticamente os **valores derivados em modo automático**, preservando atributos e escolhas feitas pelo Controlador. Os valores em modo manual permanecem sob controle do jogador. As escolhas de evolução continuam livres.

### 3. Independência e automações
Permitir **automações de combate configuradas no OMNI**, além das que ocorrerem fora do combate. Sua execução deve respeitar a validação do motor e as regras de custo, turno, comandos, gatilhos e segurança aplicáveis; detalhes ainda não especificados devem ser esclarecidos com o usuário.

### 4. Capacidades totalmente personalizadas
Permitir ações e características personalizadas com as keys, fórmulas, condições e gatilhos do OMNI, sem restrições artificiais do editor além das validações técnicas e da segurança do motor. Limites do livro são exibidos como avisos, salvo quando o usuário determinar uma proibição específica.

### 5. Recuperação e perda de invocações
**O Mestre decide a resolução da perda.** Chegar a 0 PV não remove a invocação permanentemente. A perda permanente só pode ser decidida quando os PV atingirem −100% dos PV máximos; essa consequência não é automática e depende da decisão do Mestre. Não excluir a ficha da biblioteca sem essa decisão.

### 6. Reações dos Shikigamis
Ao ocorrer gatilho válido de reação, abrir **prompt para o jogador Controlador**, pausando o combate/relógio durante a resolução. Integrar às janelas de reação do sistema em vez de criar uma lógica paralela. O Mestre conserva controle total conforme a decisão 7. As ofertas passam automaticamente quando o prazo termina.

### 7. Permissões do Mestre
O **Mestre possui controle e edição total sobre qualquer Shikigami**, independentemente de seu proprietário. Os jogadores controlam suas próprias invocações de acordo com as permissões usuais.


## Decisões adicionais de controle, autonomia e tempo — 2026-10-09

**Status:** especificação aprovada; a implementação existente precisa ser revisada e validada. Estas decisões são complementares ao TXT original e, em caso de diferença, representam uma personalização solicitada pelo usuário, sem alterar a fonte.

### 8. Duas formas de controle individual
Cada Shikigami deve permitir **ambas as interfaces**: (a) selecionar seu token e assumir o controle pela HUD própria da invocação; (b) selecioná-lo e enviar comandos pela HUD do Controlador. O controle e a seleção são individuais por Shikigami, mesmo quando vários pertencem ao mesmo jogador.

### 9. Tempo configurável e relógio global
A ficha de criação de **cada Shikigami** deve oferecer um campo livre para definir seu tempo. O Mestre aprova a ficha conforme seu julgamento; o aplicativo não impõe um teto numérico de regra. No combate, há **um único relógio global compartilhado**: não existe prioridade nem consumo de relógios individuais, e quando o relógio global termina, termina o tempo de todos os Shikigamis ativos.

**Regra confirmada em 2026-10-09 — momento do acréscimo:** o tempo adicional de um Shikigami é acrescido **no instante em que ele é invocado**, não automaticamente no começo de cada turno e não somente quando recebe um comando.

**Regra confirmada em 2026-10-11 — tempo compartilhado:** a invocação adiciona seu tempo configurado ao relógio global ao ser materializada. Depois do acréscimo, todos compartilham o mesmo saldo e a mesma expiração; não há escolha de prioridade ou reserva separada a consumir por Shikigami. Cada acréscimo ainda deve ser identificado para evitar duplicação do mesmo evento de invocação.

**Regra confirmada em 2026-10-11 — dissipação voluntária:** quando a invocação é dissipada por escolha do Controlador ou Mestre, retirar do relógio global o tempo restante associado àquela invocação. Se essa retirada levaria o saldo abaixo de 10 segundos, o relógio fica em 10 segundos. Não retirar tempo já consumido.

**Regra confirmada em 2026-10-11 — 0 PV e derrota:** chegar a **0 PV não causa perda permanente**. A invocação continua disponível como ficha e não é removida da biblioteca. A perda permanente só pode ser considerada ao atingir **−100% dos PV máximos** (por exemplo, −20 PV para uma invocação com PV máximo 20), e o Mestre decide se ela ocorre. A duração e os efeitos da incapacitação ainda serão definidos; não implementar uma regra provisória para esse período.

**Regra confirmada em 2026-10-11 — recuperação:** a invocação recupera **100% dos PV após um descanso longo**. O tratamento de cura parcial, retorno à ação e duração da incapacitação fica pendente de revisão; não aplicar a regra anterior de levantar com Ação de Movimento até essa revisão.

**Regra confirmada em 2026-10-11 — tempo após derrota:** ao atingir −100% dos PV máximos, não descontar do relógio global o tempo já adicionado por aquela invocação. Registrar o evento separado da dissipação voluntária; a decisão sobre perda permanente continua exclusiva do Mestre.

**Regra confirmada em 2026-10-11 — Hordas:** uma Horda usa um tempo próprio como **uma única entidade**, sem cronômetros individuais por integrante. A Horda compartilha uma reserva geral de PV; não há uma vida separada para cada integrante.

**Pendências que exigem esclarecimento antes da implementação:** duração/efeitos da incapacitação; regras de reinvocação (PE, PV e ações); valor adicional de PE para integrante de Primeiro Grau sob líder Especial; como a reserva temporal única da Horda interage com o relógio global e com seu fim; fim do combate. O limite de Hordas ativas é arredondado para baixo.

### 10. Economia de ações independente
Cada Shikigami terá **seu próprio conjunto de ações e recursos**, definidos na sua ficha no momento da criação, em vez de compartilhar as quantidades de ações do jogador. Eles são entidades autônomas em combate, funcionando quase como personagens individuais, mas mantendo vínculo com o proprietário e com o relógio global conforme a decisão anterior.

**Regra confirmada em 2026-10-11 — entrada na iniciativa:** depois de materializado, o Shikigami espera seu próximo turno na ordem de iniciativa para agir; não recebe uma ação imediata no momento da invocação.

**Revisão obrigatória:** a implementação provisória que debita `actionsCurrent` e `bonusActionsCurrent` do Controlador para ações da invocação não atende a esta decisão; revisar antes de afirmar que o combate está concluído.

### 11. Autonomia configurada individualmente
A autonomia é uma configuração **por Shikigami**, definida na sua própria ficha, inclusive o **custo dos comandos**. Deve permitir comportamentos e ações automáticas em combate por meio do motor OMNI, respeitando sua validação e segurança. Não impor o mesmo conjunto de regras de autonomia a todas as invocações.

**Pormenores ainda não definidos:** quais custos são permitidos, como são pagos e quais gatilhos OMNI podem operar sem intervenção do Controlador. Perguntar antes de escolher defaults de regra.

### 12. Identidade e gestão separadas
Cada Shikigami deve ter identidade visual, imagem/token, ficha, HUD e indicadores próprios de PV, ações e tempo, distinguíveis dos personagens jogadores. Suas rolagens, habilidades, reações e estado devem ser rastreados por invocação, sem confundirem seus valores com os do dono. O Mestre conserva edição e controle total (decisão 7).

### 13. Prazo e controle das reações — 2026-10-11
- Toda reação tem prazo padrão de **12 segundos** e passa automaticamente ao terminar.
- O Mestre pode acrescentar segundos ou pausar e retomar **todas as reações ativas** a qualquer momento.
- Esses controles ficam disponíveis somente para o Mestre. A pausa conserva o tempo restante; ao retomar, a contagem continua desse saldo.

## Novas verificações de aceitação
- [ ] Seleção e controle por HUD de invocação e por HUD do Controlador.
- [ ] Campo configurável de tempo extra na criação de cada Shikigami.
- [ ] Acrescentar o tempo configurado ao relógio global ao invocar, sem duplicar o evento; todos compartilham o saldo e terminam quando esse relógio chega a zero, sem FIFO/prioridade por Shikigami.
- [ ] Na dissipação voluntária, descontar o tempo associado à invocação e respeitar o piso de 10 segundos; a contabilização desse desconto precisa ser definida sem recriar prioridade individual.
- [ ] Manter a invocação disponível ao chegar a 0 PV e recuperar 100% dos PV em descanso longo; definir e implementar a duração/efeitos da incapacitação.
- [ ] Perda permanente só após atingir −100% dos PV máximos e sempre por decisão do Mestre.
- [ ] Criar Horda com um relógio e um total geral de PV para a entidade inteira; definir interação do relógio da Horda com o global.
- [ ] Preservar o tempo restante no relógio global após derrota definitiva.
- [ ] Recursos e ações separados por invocação e independentes do saldo de ações do dono.
- [ ] Autonomia e custos próprios configuráveis por invocação no OMNI.
- [ ] Imagem, token, HUD, PV, rolagens e estados individualizados.
- [ ] Testes de duas ou mais invocações simultâneas, inclusive relógio, comandos, economia e sincronização.

## Acesso universal ao criador de Shikigamis — 2026-10-09

**Decisão do usuário:** a seção de criação deve estar disponível para **todas as especializações**, não apenas Controladores. O acesso ao editor não significa aquisição gratuita no jogo: seguem válidas as condições do TXT original.

- **Controlador:** obtém 2 invocações no nível 1 e mais 1 a cada 3 níveis (níveis 4, 7, 10, 13, 16, 19...). Invocações adicionais dependem de Interlúdio.
- **Demais personagens:** podem construir/obter invocações por Interlúdio, conforme as regras de talismãs e Corpos Amaldiçoados. O trecho fornecido não fixa um limite numérico geral para invocações conhecidas por outros personagens; não inventar esse número.
- **Em campo:** por padrão, qualquer personagem mantém **1 invocação simultânea**. Controladores ampliam esse limite pela habilidade **Treinamento em Controle**, de acordo com o valor efetivo da habilidade.
- **Acesso a grau:** a progressão automática de graus (quarto grau nos níveis 1–4, terceiro a partir de 5 etc.) está especificada no texto para **Controladores**. Para outros, a criação via Interlúdio tem regras próprias fora do trecho disponível. Não aplicar automaticamente a tabela de acesso do Controlador a personagens de outra especialização.
- **Personalização:** limites do livro devem ser exibidos como avisos, conforme a decisão anterior do usuário. A interface e o sistema devem distinguir **criar uma ficha de invocação** de **ter adquirido aquela invocação no jogo**, evitando que a edição signifique aquisição gratuita.
- **Trabalho pendente:** integrar confirmação de aquisição/Interlúdio, Treinamento em Controle real, propriedades de talismã, edição pelo Mestre, verificações de posse e testes de multiplayer. Não marcar como implementado só por exibir a aba.

## Aprovação obrigatória pelo Mestre — 2026-10-09

**Decisão confirmada:** todos os personagens podem criar e editar a ficha de uma invocação, mas a aquisição para uso no jogo exige **aprovação explícita do Mestre**. Criar ou salvar não equivale a obter o Shikigami.

- Novos registros feitos por jogadores começam **pendentes de aprovação** e não podem ser invocados enquanto pendentes ou rejeitados.
- O Mestre tem botões de **Aprovar** e **Rejeitar**; quando o Mestre registra diretamente a invocação, ela pode entrar aprovada.
- Invocações antigas sem campo de aprovação são tratadas como legado já adquirido para não retirar criaturas existentes sem uma migração confirmada.
- A aprovação deve ser verificada na lógica de materialização, além da interface.
- A aprovação reconhece a aquisição; permanece necessária a aplicação de limites de campo, custos de PE e regras próprias de Interlúdio, quando aplicáveis.
- **Regra confirmada em 2026-10-11:** qualquer alteração em uma ficha já aprovada cria uma nova revisão que precisa de nova aprovação antes de a revisão alterada ser usada.
- **Pendente para revisão de segurança:** autorização reforçada por identidade/perfil no backend multiplayer, trilha de auditoria e revisão de edição após aprovação. A checagem de papel no cliente não constitui autorização confiável por si só.

## Checklist de implementação — pendente de validação funcional
- [ ] Campos da ficha de criação e edição com alternância automática/manual individual.
- [ ] Recálculo de PV, Defesa e outros valores derivados, respeitando o modo manual.
- [ ] Avisos não bloqueantes de orçamento de atributos, limites de ações e custos do livro.
- [ ] Integração real de ações/características e automações ao executor OMNI.
- [ ] Adequação dos comandos/movimentação às regras e exceções aprovadas.
- [ ] Resolução de derrota pelo Mestre e restauração de 100% dos PV no descanso longo, sem decidir ainda a duração da incapacitação.
- [ ] Prompts de reação ao jogador com pausa do relógio.
- [ ] Passagem automática de toda reação após 12 segundos e controles globais de prazo exclusivos do Mestre.
- [ ] Permissões de edição/controle de qualquer invocação para o Mestre.
- [ ] Nova aprovação do Mestre após cada alteração de uma ficha já aprovada.
- [ ] Testes automatizados e validação em navegador dos fluxos finais.

**Nota:** marcar itens somente depois de implementação e testes verificáveis. O TXT original não deve ser alterado para acomodar estas decisões.
