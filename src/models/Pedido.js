const db = require('../config/database');
const Ingrediente = require('./Ingrediente');

class Pedido {
  static findAll(options = {}) {
    let sql = `
      SELECT 
        p.*,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        c.foto as cliente_foto,
        COUNT(pi.id) as total_itens
      FROM pedidos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (options.status && options.status !== 'TODOS') {
      sql += ` AND p.status = ?`;
      params.push(options.status);
    }

    if (options.tipo_pedido && options.tipo_pedido !== 'TODOS') {
      sql += ` AND p.tipo_pedido = ?`;
      params.push(options.tipo_pedido);
    }

    if (options.data_inicio) {
      sql += ` AND DATE(p.created_at) >= ?`;
      params.push(options.data_inicio);
    }

    if (options.data_fim) {
      sql += ` AND DATE(p.created_at) <= ?`;
      params.push(options.data_fim);
    }

    if (options.search) {
      sql += ` AND (c.nome LIKE ? OR c.telefone LIKE ? OR p.id LIKE ?)`;
      const term = `%${options.search}%`;
      params.push(term, term, term);
    }

    sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(parseInt(options.limit));
    }

    return db.prepare(sql).all(...params);
  }

  static findById(id) {
    const pedido = db.prepare(`
      SELECT 
        p.*,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        c.cpf as cliente_cpf,
        c.foto as cliente_foto,
        c.logradouro as cliente_rua,
        c.numero as cliente_numero,
        c.bairro as cliente_bairro,
        c.cidade as cliente_cidade
      FROM pedidos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.id = ?
    `).get(id);

    if (!pedido) return null;

    pedido.itens = db.prepare(`
      SELECT pi.*, pz.imagem as pizza_imagem
      FROM pedido_itens pi
      LEFT JOIN pizzas pz ON pz.id = pi.pizza_id
      WHERE pi.pedido_id = ?
    `).all(id);

    // Para cada item, parsear detalhes_customizacao se for JSON
    pedido.itens.forEach(item => {
      if (item.detalhes_customizacao) {
        try {
          item.detalhes_obj = JSON.parse(item.detalhes_customizacao);
        } catch (e) {
          item.detalhes_obj = null;
        }
      }
    });

    return pedido;
  }

  static create(dadosPedido, itens) {
    const insertPedidoStmt = db.prepare(`
      INSERT INTO pedidos (
        cliente_id, tipo_pedido, mesa, endereco_entrega, taxa_entrega,
        desconto, subtotal, total, forma_pagamento, valor_pago, troco, status, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItemStmt = db.prepare(`
      INSERT INTO pedido_itens (
        pedido_id, tipo_item, pizza_id, nome_item, tamanho,
        quantidade, preco_unitario, subtotal, detalhes_customizacao, observacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertConsumoStmt = db.prepare(`
      INSERT INTO pedido_item_consumos (pedido_item_id, ingrediente_id, quantidade_consumida)
      VALUES (?, ?, ?)
    `);

    // Iniciar transação para integridade
    const transaction = db.transaction(() => {
      const resPedido = insertPedidoStmt.run(
        dadosPedido.cliente_id || null,
        dadosPedido.tipo_pedido,
        dadosPedido.mesa || null,
        dadosPedido.endereco_entrega || null,
        parseFloat(dadosPedido.taxa_entrega) || 0,
        parseFloat(dadosPedido.desconto) || 0,
        parseFloat(dadosPedido.subtotal),
        parseFloat(dadosPedido.total),
        dadosPedido.forma_pagamento,
        parseFloat(dadosPedido.valor_pago) || parseFloat(dadosPedido.total),
        parseFloat(dadosPedido.troco) || 0,
        dadosPedido.status || 'RECEBIDO',
        dadosPedido.observacoes || null
      );

      const pedidoId = resPedido.lastInsertRowid;

      for (const item of itens) {
        const resItem = insertItemStmt.run(
          pedidoId,
          item.tipo_item, // 'PIZZA_CARDAPIO', 'PIZZA_CUSTOMIZADA', 'BEBIDA', 'OUTRO'
          item.pizza_id || null,
          item.nome_item,
          item.tamanho || 'UNICO',
          parseInt(item.quantidade),
          parseFloat(item.preco_unitario),
          parseFloat(item.subtotal),
          item.detalhes_customizacao ? JSON.stringify(item.detalhes_customizacao) : null,
          item.observacao || null
        );

        const pedidoItemId = resItem.lastInsertRowid;
        const qtdItem = parseInt(item.quantidade);

        // BAIXA DE ESTOQUE AUTOMÁTICA
        if (item.tipo_item === 'PIZZA_CARDAPIO' && item.pizza_id) {
          // Buscar receita padrão da pizza
          const receita = db.prepare(`
            SELECT ingrediente_id, quantidade_padrao FROM pizza_ingredientes WHERE pizza_id = ?
          `).all(item.pizza_id);

          // Ajustar por tamanho de pizza (Fator multiplicador)
          let fatorTamanho = 1.0;
          if (item.tamanho === 'BROTINHO') fatorTamanho = 0.5;
          if (item.tamanho === 'MEDIA') fatorTamanho = 0.75;
          if (item.tamanho === 'GRANDE') fatorTamanho = 1.0;
          if (item.tamanho === 'FAMILIA') fatorTamanho = 1.3;

          for (const ing of receita) {
            const qtdConsumida = ing.quantidade_padrao * fatorTamanho * qtdItem;
            insertConsumoStmt.run(pedidoItemId, ing.ingrediente_id, qtdConsumida);
            Ingrediente.ajustarEstoque(ing.ingrediente_id, 'VENDA', qtdConsumida, `Venda Pedido #${pedidoId}`, pedidoId);
          }
        } 
        else if (item.tipo_item === 'PIZZA_CUSTOMIZADA' && item.detalhes_customizacao) {
          // Processar ingredientes selecionados da pizza customizada
          const cust = item.detalhes_customizacao;
          const ingredientesUsados = [];

          if (cust.massa_id) ingredientesUsados.push({ id: cust.massa_id, qtd: 300 });
          if (cust.molho_id) ingredientesUsados.push({ id: cust.molho_id, qtd: 150 });
          if (cust.borda_id) ingredientesUsados.push({ id: cust.borda_id, qtd: 1 });

          if (Array.isArray(cust.ingredientes)) {
            cust.ingredientes.forEach(ingId => {
              ingredientesUsados.push({ id: ingId, qtd: 100 });
            });
          }

          let fatorTamanho = 1.0;
          if (item.tamanho === 'BROTINHO') fatorTamanho = 0.5;
          if (item.tamanho === 'MEDIA') fatorTamanho = 0.75;
          if (item.tamanho === 'GRANDE') fatorTamanho = 1.0;
          if (item.tamanho === 'FAMILIA') fatorTamanho = 1.3;

          for (const ing of ingredientesUsados) {
            const qtdConsumida = ing.qtd * fatorTamanho * qtdItem;
            insertConsumoStmt.run(pedidoItemId, ing.id, qtdConsumida);
            Ingrediente.ajustarEstoque(ing.id, 'VENDA', qtdConsumida, `Venda Customizada Pedido #${pedidoId}`, pedidoId);
          }
        } 
        else if (item.tipo_item === 'BEBIDA' && item.ingrediente_id) {
          const qtdConsumida = 1 * qtdItem;
          insertConsumoStmt.run(pedidoItemId, item.ingrediente_id, qtdConsumida);
          Ingrediente.ajustarEstoque(item.ingrediente_id, 'VENDA', qtdConsumida, `Venda Bebida Pedido #${pedidoId}`, pedidoId);
        }
      }

      return pedidoId;
    });

    return transaction();
  }

  static updateStatus(id, novoStatus) {
    return db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(novoStatus, id);
  }

  static cancelar(id) {
    // Ao cancelar pedido, estornar o estoque consumido
    const transaction = db.transaction(() => {
      const consumos = db.prepare(`
        SELECT pic.ingrediente_id, pic.quantidade_consumida
        FROM pedido_item_consumos pic
        JOIN pedido_itens pi ON pi.id = pic.pedido_item_id
        WHERE pi.pedido_id = ?
      `).all(id);

      for (const c of consumos) {
        Ingrediente.ajustarEstoque(c.ingrediente_id, 'ENTRADA', c.quantidade_consumida, `Estorno Cancelamento Pedido #${id}`, id);
      }

      db.prepare("UPDATE pedidos SET status = 'CANCELADO' WHERE id = ?").run(id);
    });

    return transaction();
  }

  static getEstatisticasDashboard() {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = hoje.substring(0, 7) + '-01';

    // Métricas principais
    const faturamentoHoje = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(id) as qtd
      FROM pedidos
      WHERE DATE(created_at) = ? AND status != 'CANCELADO'
    `).get(hoje);

    const faturamentoMes = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(id) as qtd
      FROM pedidos
      WHERE DATE(created_at) >= ? AND status != 'CANCELADO'
    `).get(inicioMes);

    const faturamentoGeral = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(id) as qtd
      FROM pedidos
      WHERE status != 'CANCELADO'
    `).get();

    const ticketMedio = faturamentoGeral.qtd > 0 ? (faturamentoGeral.total / faturamentoGeral.qtd) : 0;

    const totalClientes = db.prepare(`SELECT COUNT(*) as total FROM clientes`).get().total;
    const totalAlertasEstoque = db.prepare(`SELECT COUNT(*) as total FROM ingredientes WHERE quantidade_estoque <= estoque_minimo AND ativo = 1`).get().total;

    // Vendas por dia nos últimos 7 dias (para gráfico de linhas)
    const vendasUltimos7Dias = db.prepare(`
      SELECT 
        DATE(created_at) as data,
        COALESCE(SUM(total), 0) as total,
        COUNT(id) as pedidos
      FROM pedidos
      WHERE status != 'CANCELADO' AND DATE(created_at) >= DATE('now', '-6 days')
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `).all();

    // Top 5 Pizzas / Produtos Mais Vendidos
    const topProdutos = db.prepare(`
      SELECT 
        pi.nome_item,
        SUM(pi.quantidade) as total_vendido,
        SUM(pi.subtotal) as faturamento_item
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id
      WHERE p.status != 'CANCELADO'
      GROUP BY pi.nome_item
      ORDER BY total_vendido DESC
      LIMIT 5
    `).all();

    // Formas de Pagamento
    const formasPagamento = db.prepare(`
      SELECT 
        forma_pagamento,
        COUNT(*) as quantidade,
        SUM(total) as total
      FROM pedidos
      WHERE status != 'CANCELADO'
      GROUP BY forma_pagamento
    `).all();

    // Pedidos por Tipo (Delivery vs Balcão vs Salão)
    const porTipo = db.prepare(`
      SELECT 
        tipo_pedido,
        COUNT(*) as quantidade,
        SUM(total) as total
      FROM pedidos
      WHERE status != 'CANCELADO'
      GROUP BY tipo_pedido
    `).all();

    // Últimos Pedidos Recentes
    const pedidosRecentes = this.findAll({ limit: 6 });

    return {
      faturamentoHoje,
      faturamentoMes,
      faturamentoGeral,
      ticketMedio,
      totalClientes,
      totalAlertasEstoque,
      vendasUltimos7Dias,
      topProdutos,
      formasPagamento,
      porTipo,
      pedidosRecentes
    };
  }
}

module.exports = Pedido;
