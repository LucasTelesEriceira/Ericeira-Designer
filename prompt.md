Esse arquivo serve para quebrar os prompts em partes e deixar mais legível para IA.
Me ajude com essa tarefa de querbra os prompts em partes.



Próximos passos (prioridade)
4. Notificações amigáveis — alert() usado em todo lugar. Substituir por toasts.
5. Validação consistente — Só faturas.js valida. servicos.js, despesas.js, clientes.js enviam dados vazios.
6. Bloqueios manuais ("Futuro") — blockedDates, blockedDayOfWeek, blockedTimeRanges declarados mas nunca populados via UI. As estruturas e stubs já existem.
7. Paginação — Todas as listas crescem sem limite.
8. Padronizar deleção — DELETE /scheduling/:id vs DELETE /services com body vs POST com status.
9. Duplicação de código — Template de card de agendamento repetido 3x no HTML; lógica de cache de serviços copiada em 4 JS files.
10. Ordem de carregamento do Alpine — agendamento.html carrega plugins antes do core (invertido).
11. Colocar mask em campo do WhatsApp no form novo cliente.
