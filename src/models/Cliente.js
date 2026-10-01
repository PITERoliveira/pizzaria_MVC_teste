const db = require('../config/database');

class Cliente {
  static findAll(search = '') {
    let sql = `
      SELECT 
        c.*,
        COUNT(p.id) as total_pedidos,
        COALESCE(SUM(CASE WHEN p.status != 'CANCELADO' THEN p.total ELSE 0 END), 0) as total_gasto,
        MAX(p.created_at) as ultima_compra
      FROM clientes c
      LEFT JOIN pedidos p ON p.cliente_id = c.id
    `;
    const params = [];

    if (search && search.trim() !== '') {
      sql += ` WHERE c.nome LIKE ? OR c.telefone LIKE ? OR c.cpf LIKE ? OR c.email LIKE ? OR c.bairro LIKE ?`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    sql += ` GROUP BY c.id ORDER BY c.nome ASC`;

    return db.prepare(sql).all(...params);
  }

  static findById(id) {
    const cliente = db.prepare(`
      SELECT 
        c.*,
        COUNT(p.id) as total_pedidos,
        COALESCE(SUM(CASE WHEN p.status != 'CANCELADO' THEN p.total ELSE 0 END), 0) as total_gasto,
        COALESCE(AVG(CASE WHEN p.status != 'CANCELADO' THEN p.total ELSE NULL END), 0) as ticket_medio,
        MAX(p.created_at) as ultima_compra
      FROM clientes c
      LEFT JOIN pedidos p ON p.cliente_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id);

    if (!cliente) return null;

    // Histórico de pedidos do cliente
    cliente.pedidos = db.prepare(`
      SELECT p.*, COUNT(pi.id) as total_itens
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
      WHERE p.cliente_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all(id);

    // Identificar sabor favorito
    const saborFavorito = db.prepare(`
      SELECT pi.nome_item, COUNT(*) as qtd
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id
      WHERE p.cliente_id = ? AND p.status != 'CANCELADO'
      GROUP BY pi.nome_item
      ORDER BY qtd DESC
      LIMIT 1
    `).get(id);

    cliente.sabor_favorito = saborFavorito ? saborFavorito.nome_item : 'Nenhum ainda';

    return cliente;
  }

  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO clientes (
        nome, telefone, email, cpf, data_nascimento,
        cep, logradouro, numero, complemento, bairro, cidade, ponto_referencia,
        foto, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.nome,
      data.telefone,
      data.email || null,
      data.cpf || null,
      data.data_nascimento || null,
      data.cep || null,
      data.logradouro || null,
      data.numero || null,
      data.complemento || null,
      data.bairro || null,
      data.cidade || null,
      data.ponto_referencia || null,
      data.foto || null,
      data.observacoes || null
    );

    return result.lastInsertRowid;
  }

  static update(id, data) {
    const fields = [
      'nome = ?',
      'telefone = ?',
      'email = ?',
      'cpf = ?',
      'data_nascimento = ?',
      'cep = ?',
      'logradouro = ?',
      'numero = ?',
      'complemento = ?',
      'bairro = ?',
      'cidade = ?',
      'ponto_referencia = ?',
      'observacoes = ?'
    ];
    const params = [
      data.nome,
      data.telefone,
      data.email || null,
      data.cpf || null,
      data.data_nascimento || null,
      data.cep || null,
      data.logradouro || null,
      data.numero || null,
      data.complemento || null,
      data.bairro || null,
      data.cidade || null,
      data.ponto_referencia || null,
      data.observacoes || null
    ];

    if (data.foto) {
      fields.push('foto = ?');
      params.push(data.foto);
    }

    params.push(id);

    const sql = `UPDATE clientes SET ${fields.join(', ')} WHERE id = ?`;
    return db.prepare(sql).run(...params);
  }

  static delete(id) {
    return db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
  }

  static getTopClientes(limit = 5) {
    return db.prepare(`
      SELECT 
        c.id, c.nome, c.telefone, c.foto,
        COUNT(p.id) as total_pedidos,
        SUM(p.total) as total_gasto
      FROM clientes c
      JOIN pedidos p ON p.cliente_id = c.id
      WHERE p.status != 'CANCELADO'
      GROUP BY c.id
      ORDER BY total_gasto DESC
      LIMIT ?
    `).all(limit);
  }
}

module.exports = Cliente;
