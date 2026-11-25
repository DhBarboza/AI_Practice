### Análise de Risco: Pontos Cegos do Requisito

1. **Momento da Validação de Saldo e Limite:** O requisito assume que o limite é R$ 5.000,00, mas não define se a validação ocorre no momento do agendamento ou no momento da liquidação (execução). Se o usuário agendar múltiplos Pix que somem mais de R$ 5.000,00 para o mesmo dia futuro, a interface atual deixaria passar.
2. **Ciclo de Vida do Agendamento e Ponto de Não-Retorno:** Dizer apenas que "tem que ter um botão para cancelar depois" ignora a máquina de estados do Pix. Se o agendamento entrar na fila de processamento bancário (ex: às 00:01 do dia da execução), o botão de cancelamento precisa ser bloqueado para evitar condições de corrida (_race conditions_).
3. **Ausência de Autenticação/Assinatura da Transação:** Não foi especificada a etapa de autenticação forte (PIN transacional, biometria ou token 2FA). Agendamentos de pagamento exigem confirmação segura de autenticidade tanto quanto transferências imediatas.
4. **Resolução Dinâmica da Chave Pix:** Chaves Pix podem ser migradas ou canceladas entre a data do agendamento e a data do pagamento. Não há estratégia definida para validar se a chave do contato ainda é válida no agendamento.
5. **Idempotência no Front-End:** Sem controle de idempotência (via `Idempotency-Key` ou bloqueio de duplo clique no botão de confirmação), o usuário com conexão instável pode gerar múltiplos agendamentos idênticos.

---

### Mapeamento de Estados: Lista de Estados de UI

#### 1. Seleção de Contato / Chave

- **Default:** Campo de busca de contatos/chave Pix com lista de favoritos/recentes.
- **Searching:** Feedback visual de debounce enquanto digita.
- **Empty State:** Nenhum contato encontrado para o termo pesquisado.
- **Error State:** Falha na consulta de contatos salvos ou falha no DICT (Diretório de Identificadores de Contas Transacionais) para validar a chave digitada.

#### 2. Entrada de Valor

- **Default:** Campo monetário zerado (`R$ 0,00`) com teclado numérico formatado.
- **Validation Error (Limite Excedido):** Mensagem contextual abaixo do campo: _"Valor excede o limite diário de R$ 5.000,00"_.
- **Validation Error (Valor Zerado/Negativo):** Bloqueio de avanço para valores inferiores a R$ 0,01.

#### 3. Seleção de Data (DatePicker)

- **Disabled State:** Dias passados e o dia corrente (hoje) devem estar desabilitados/bloqueados no calendário.
- **Out of Range Error:** Bloqueio para datas além do limite máximo permitido pelo Bacen (ex: > 365 dias).

#### 4. Confirmação / Assinatura

- **Review (Modal/Tela):** Exibição clara de: Favorecido (Nome mascarado, CPF mascarado, Instituição), Valor, Data do débito, Taxas (se PJ).
- **Security Challenge:** Modal de biometria / PIN transacional.
- **Loading State:** Skeleton/Spinner de bloqueio de tela com CTA desabilitado (`isSubmitting: true`) impedindo múltiplos toques.
- **Error State (Negocial):** Feedback de erro para chave inválida/inativa, limite excedido na data alvo ou token incorreto.
- **Error State (Infraestrutura/Timeout):** Tela de "Processando Agendamento" alertando o usuário para não reenviar enquanto o status é confirmado via pooling/polling.

#### 5. Comprovante (Sucesso)

- **Success State:** Exibição do ID da transação/agendamento, código de autenticação, data de execução e CTAs de ação (_Compartilhar Comprovante_, _Ver Agendamentos_, _Novo Pix_).

#### 6. Gestão/Cancelamento de Agendamento (Tela Omitida)

- **Empty State:** "Você não possui agendamentos futuros".
- **Loading State:** Cancelamento em processamento.
- **Success State (Feedback):** Toast/Snack de confirmação de cancelamento.
- **Error State (Bloqueio):** "Este agendamento já está em processamento e não pode mais ser cancelado".

---

### Cenários Ocultos: Casos de Borda e Caminhos Infelizes

1. **A Regra "Se for hoje, é Pix normal":**
    - _Comportamento oculto:_ O usuário entrou no fluxo de "Agendamento", selecionou uma data futura, mas depois resolveu mudar para "Hoje".
    - _Ação necessária:_ A UI não deve quebrar nem emitir erro genérico; deve disparar um aviso contextual: _"Ao selecionar a data de hoje, a transferência será realizada imediatamente. Deseja continuar?"_ e alterar o payload da requisição para um Pix imediato (com validação imediata de saldo).
2. **Virada de Turno / Timezone (Fuso Horário):**
    - O usuário inicia o agendamento às 23:59:50 para o "dia seguinte". No momento em que clica em "Confirmar" (às 00:00:05), aquele dia passou a ser "hoje". A requisição falhará se o back-end validar que a data recebida é igual à data atual.
3. **Limite Noturno do Pix (Resolução Bacen):**
    - O limite geral é de R$ 5.000,00, mas o agendamento pode ser liquidado na virada da noite (entre 20h e 06h), onde o limite padrão regulatório muitas vezes é menor (ex: R$ 1.000,00). Se o Pix for executado às 04h pelo sistema de mensageria bancária, o agendamento falhará na data.
4. **Onde fica o "Botão para cancelar depois"?**
    - O ticket não especifica a existência de um histórico/extrato de agendamentos. O desenvolvedor precisa de uma tela de "Extrato de Agendamentos Futuros", com paginação e filtro por período.
5. **Agendamento em Fim de Semana ou Feriado:**
    - Embora o Pix funcione 24/7, nem todos os _core bankings_ realizam débitos agendados em fins de semana no mesmo horário dos dias úteis. A interface precisa deixar explícito ao usuário se o débito ocorrerá no próprio fim de semana ou se segue lógica diferenciada.
6. **Saldo Insuficiente na Data do Agendamento:**
    - No dia da liquidação, o usuário não possui saldo em conta. A UI do Extrato deve prever o status `FALHA_POR_SALDO` e exibir explicação clara de por que a transferência agendada não foi realizada.

---

### Regras de negócio conflitantes: Inconsistências e Falhas de Segurança

1. **Validação Estática vs. Limite Cumulativo Diário:**
    - _Conflito:_ "O limite diário é R$ 5.000,00".
    - _Problema:_ A regra permite agendar hoje um Pix de R$ 5.000,00 para sexta-feira. Amanhã, ela permite agendar outro Pix de R$ 5.000,00 para a mesma sexta-feira (pois hoje o limite não foi batido). Ambos somam R$ 10.000,00 na data alvo.
    - _Correção necessária:_ O limite diário precisa ser atrelado à **data de liquidação** e não à data de criação do agendamento. O Front-End precisa consultar a API passando a `data_alvo` para receber o saldo de limite disponível daquele dia específico.
2. **"Botão para Cancelar" sem Janela de Corte (_Cut-off Time_):**
    - _Insegurança:_ Permitir cancelamento a qualquer momento sem regra de trava temporal. Se a liquidação do Pix agendado ocorrer às 06:00, e o usuário enviar uma solicitação de cancelamento às 05:59:59 enquanto o lote de pagamento já foi despachado para o SPI (Sistema de Pagamentos Instantâneos), ocorrerá inconsistência contábil (dupla saída de dinheiro ou falha de conciliação).
    - _Correção necessária:_ Definir uma janela mínima de cancelamento (ex: _"Agendamentos só podem ser cancelados até as 23:59 do dia anterior"_ ou bloquear o botão caso o status retornado seja `EM_PROCESSAMENTO`).
3. **Ausência de Fluxo para Chave Inexistente no Agendamento:**
    - Permitir agendamento para contatos sem revalidar a chave Pix no momento do envio cria o risco de envio de dinheiro para destinatário errado (caso o contato tenha mudado de número de celular/e-mail cadastrado como chave).
