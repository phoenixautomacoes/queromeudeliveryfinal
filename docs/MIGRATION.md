# Guia de Migração de Dados do Legado V1 para V2 (MIGRATION.md)

## 1. Estratégia de Migração de Dados
Para lojas que já utilizavam a versão 1.0 (QMD-BASE):

1. **Lojas:** O slug da loja e o número do WhatsApp são preservados integralmente.
2. **Categorias e Produtos:** Os IDs antigos podem ser mantidos ou mapeados 1:1 para a nova tabela `products` com preço convertido para centavos (`price_cents = ROUND(price * 100)`).
3. **Grupos de Adicionais:** A estrutura plana legada é normalizada nas tabelas `product_option_groups` e `product_options`.
4. **Clientes e Pedidos:** Pedidos legados podem ser importados como histórico imutável com status correspondente.
