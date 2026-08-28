# Arquitetura de Integrações (INTEGRATIONS.md)

## 1. Fluxo de Eventos e Outbox Pattern

Para garantir que nenhuma notificação de pedido seja perdida por instabilidade de rede ou reinicialização de instâncias, o Quero Meu Delivery V2 utiliza o **Transactional Outbox Pattern**:

```
[Transação Atômica do Pedido]
  ├── Insere Pedido (orders)
  ├── Insere Itens (order_items)
  ├── Registra Histórico (order_status_history)
  └── Insere Evento na Outbox (outbox_events)

[Worker / Dispatcher de Eventos Assíncronos]
  ├── Lê outbox_events com status 'pending'
  ├── Assina o payload com HMAC SHA-256 (chave N8N_WEBHOOK_SECRET)
  ├── Envia POST para N8N_WEBHOOK_URL
  ├── n8n aciona Evolution API para envio no WhatsApp
  └── Atualiza outbox_events para 'delivered' ou registra 'failed' com retry backoff
```

## 2. Eventos Suportados

1. `order.created`: Emitido imediatamente após a gravação do pedido no banco de dados.
2. `order.status_changed`: Emitido sempre que o status do pedido avança (preparando, pronto, saiu para entrega, entregue, cancelado).
3. `payment.confirmed`: Emitido na confirmação de pagamento PIX ou online.
4. `integration.failure_alert`: Emitido após 5 tentativas consecutivas de falha para alerta ao administrador.

## 3. Contingência via Link `wa.me`

Caso o restaurante não utilize n8n/Evolution API ou a automação esteja desativada, a interface do cliente gera o link de contingência `wa.me/55...` oficial contendo:
- Número público do pedido
- Lista detalhada de itens com adicionais e remoções
- Subtotal, frete, desconto e total calculados pelo servidor
- Forma de pagamento e troco
- Link seguro de acompanhamento do pedido com o `tracking_token`
