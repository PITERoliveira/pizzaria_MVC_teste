const db = require('../config/database');

class Ingrediente {
  static findAll(options = {}) {
    let sql = `SELECT * FROM ingredientes WHERE 1=1`;
    const params = [];

    if (options.categoria && options.categoria !== 'todas') {
      sql += ` AND categoria = ?`;
      params.push(options.categoria);
    }

    if (options.apenasEstoqueBaixo) {
      sql += ` AND quantidade_estoque <= estoque_minimo`;
    }

    if (options.search) {
      sql += ` AND nome LIKE ?`;
      params.push(`%${options.search}%`);
    }

    sql += ` ORDER BY categoria ASC, nome ASC`;
    return db.prepare(sql).all(...params);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM ingredientes WHERE id = ?').get(id);
  }

  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO ingredientes (nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo, custo_unitario, preco_adicional, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.nome,
      data.categoria,
      data.unidade_medida,
      parseFloat(data.quantidade_estoque) || 0,
      parseFloat(data.estoque_minimo) || 0,
      parseFloat(data.custo_unitario) || 0,
      parseFloat(data.preco_adicional) || 0,
      data.ativo !== undefined ? (data.ativo ? 1 : 0) : 1
    );

    const id = result.lastInsertRowid;

    if (parseFloat(data.quantidade_estoque) > 0) {
      this.registrarMovimentacao(id, 'ENTRADA', parseFloat(data.quantidade_estoque), 'Estoque inicial cadastrado');
    }

    return id;
  }

  static update(id, data) {
    const stmt = db.prepare(`
      UPDATE ingredientes
      SET nome = ?, categoria = ?, unidade_medida = ?, estoque_minimo = ?, custo_unitario = ?, preco_adicional = ?, ativo = ?
      WHERE id = ?
    `);

    return stmt.run(
      data.nome,
      data.categoria,
      data.unidade_medida,
      parseFloat(data.estoque_minimo) || 0,
      parseFloat(data.custo_unitario) || 0,
      parseFloat(data.preco_adicional) || 0,
      data.ativo ? 1 : 0,
      id
    );
  }

  static registrarMovimentacao(ingredienteId, tipo, quantidade, motivo = '', pedidoId = null) {
    const stmt = db.prepare(`
      INSERT INTO movimentacoes_estoque (ingrediente_id, tipo, quantidade, motivo, pedido_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(ingredienteId, tipo, quantidade, motivo, pedidoId);
  }

  static ajustarEstoque(id, tipo, quantidade, motivo = '', pedidoId = null) {
    const ingrediente = this.findById(id);
    if (!ingrediente) throw new Error('Ingrediente não encontrado');

    const qtd = parseFloat(quantidade);
    let novaQuantidade = ingrediente.quantidade_estoque;

    if (tipo === 'ENTRADA') {
      novaQuantidade += qtd;
    } else if (tipo === 'SAIDA_MANUAL' || tipo === 'VENDA' || tipo === 'PERDA') {
      novaQuantidade = Math.max(0, novaQuantidade - qtd);
    } else if (tipo === 'AJUSTE') {
      novaQuantidade = qtd;
    }

    db.prepare('UPDATE ingredientes SET quantidade_estoque = ? WHERE id = ?').run(novaQuantidade, id);
    this.registrarMovimentacao(id, tipo, qtd, motivo, pedidoId);

    return novaQuantidade;
  }

  static getAlertasEstoqueBaixo() {
    return db.prepare(`
      SELECT * FROM ingredientes 
      WHERE quantidade_estoque <= estoque_minimo AND ativo = 1
      ORDER BY (quantidade_estoque / NULLIF(estoque_minimo, 0)) ASC
    `).all();
  }

  static getMovimentacoes(limit = 50) {
    return db.prepare(`
      SELECT 
        m.*,
        i.nome as ingrediente_nome,
        i.unidade_medida,
        i.categoria
      FROM movimentacoes_estoque m
      JOIN ingredientes i ON i.id = m.ingrediente_id
      ORDER BY m.data_movimentacao DESC
      LIMIT ?
    `).all(limit);
  }

  static delete(id) {
    // Excluir movimentacoes e ingrediente
    db.prepare('DELETE FROM movimentacoes_estoque WHERE ingrediente_id = ?').run(id);
    db.prepare('DELETE FROM pizza_ingredientes WHERE ingrediente_id = ?').run(id);
    return db.prepare('DELETE FROM ingredientes WHERE id = ?').run(id);
  }

  static getCategorias() {
    return ['Massa', 'Molho', 'Queijo', 'Carne', 'Vegetal', 'Borda', 'Bebida', 'Outro'];
  }
}

module.exports = Ingrediente;
