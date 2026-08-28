export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatOrderWhatsAppMessage(order: any, items: any[], store: any): string {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const trackingUrl = `${appUrl}/tracking/${order.trackingToken}`;

  const lines: string[] = [];
  lines.push(`🍔 *NOVO PEDIDO #${order.orderNumber}* - _${store.name}_`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`👤 *Cliente:* ${order.customerName}`);
  lines.push(`📱 *WhatsApp:* ${order.customerPhone}`);
  if (order.customerEmail) {
    lines.push(`✉️ *E-mail:* ${order.customerEmail}`);
  }
  lines.push(``);

  lines.push(`📋 *ITENS DO PEDIDO:*`);
  items.forEach((item, index) => {
    const itemTotal = formatCentsToBRL(item.subtotalCents);
    lines.push(`${index + 1}. *${item.quantity}x ${item.productName}* (${itemTotal})`);
    
    if (item.options && item.options.length > 0) {
      item.options.forEach((opt: any) => {
        const optPrice = opt.priceCents > 0 ? ` (+${formatCentsToBRL(opt.priceCents)})` : "";
        lines.push(`   └ • ${opt.optionName}${optPrice}`);
      });
    }

    if (item.notes && item.notes.trim()) {
      lines.push(`   └ 📝 _Obs: ${item.notes.trim()}_`);
    }
  });

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💵 *RESUMO DE VALORES:*`);
  lines.push(`Subtotal: ${formatCentsToBRL(order.subtotalCents)}`);
  
  if (order.deliveryType === "delivery") {
    lines.push(`Taxa de Entrega: ${formatCentsToBRL(order.deliveryFeeCents)}`);
  } else {
    lines.push(`Retirada no Balcão: R$ 0,00`);
  }

  if (order.discountCents > 0) {
    lines.push(`Desconto (${order.couponCode || "Cupom"}): -${formatCentsToBRL(order.discountCents)}`);
  }

  lines.push(`*TOTAL: ${formatCentsToBRL(order.totalCents)}*`);
  lines.push(``);

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🛵 *ENTREGA:* ${order.deliveryType === "delivery" ? "Delivery" : "Retirada no Balcão"}`);
  
  if (order.deliveryType === "delivery" && order.deliveryAddress) {
    const addr = order.deliveryAddress;
    lines.push(`📍 *Endereço:* ${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ""}`);
    lines.push(`🏘️ *Bairro:* ${addr.neighborhood} - ${addr.city}/${addr.state || "SP"}`);
    lines.push(`📮 *CEP:* ${addr.zip}`);
    if (addr.reference) {
      lines.push(`📌 *Ponto de Ref.:* ${addr.reference}`);
    }
  }

  lines.push(``);
  const paymentLabels: Record<string, string> = {
    pix: "PIX",
    cash: "Dinheiro na Entrega",
    card_delivery: "Cartão na Maquininha (Entrega)",
    online_mercado_pago: "Pagamento Online (Mercado Pago)",
  };
  const payMethodText = paymentLabels[order.paymentMethod] || order.paymentMethod;
  lines.push(`💳 *FORMA DE PAGAMENTO:* ${payMethodText}`);
  
  if (order.paymentMethod === "cash" && order.changeForCents) {
    lines.push(`💰 *Troco para:* ${formatCentsToBRL(order.changeForCents)} (Troco: ${formatCentsToBRL(order.changeForCents - order.totalCents)})`);
  }

  if (order.notes && order.notes.trim()) {
    lines.push(``);
    lines.push(`📝 *Observações Gerais:* ${order.notes.trim()}`);
  }

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📍 *Acompanhe seu pedido em tempo real:*`);
  lines.push(`${trackingUrl}`);

  return lines.join("\n");
}

export function generateWaMeLink(rawPhone: string, message: string): string {
  // Limpa caracteres não numéricos
  const cleanPhone = rawPhone.replace(/\D/g, "");
  // Garante DDI 55 do Brasil se necessário
  const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}
