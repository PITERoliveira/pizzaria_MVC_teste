const db = require('../config/database');

class Pizza {
  static findAll(options = {}) {
    let sql = `SELECT * FROM pizzas WHERE 1=1`;
    const params = [];

    if (options.categoria && options.categoria !== 'todas') {
      sql += ` AND categoria = ?`;
      params.push(options.categoria);
    }

    if (options.apenasAtivas) {
      sql += ` AND ativa = 1`;
    }

    if (options.search) {
      sql += ` AND (nome LIKE ? OR descricao LIKE ?)`;
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    sql += ` ORDER BY categoria ASC, nome ASC`;
    return db.prepare(sql).all(...params);
  }

  static findById(id) {
    const pizza = db.prepare('SELECT * FROM pizzas WHERE id = ?').get(id);
    if (!pizza) return null;

    // Buscar a receita (ingredientes que compõem essa pizza padrão)
    pizza.ingredientes = db.prepare(`
      SELECT 
        pi.id as rel_id,
        pi.quantidade_padrao,
        i.*
      FROM pizza_ingredientes pi
      JOIN ingredientes i ON i.id = pi.ingrediente_id
      WHERE pi.pizza_id = ?
    `).all(id);

    return pizza;
  }

  static create(data, ingredientesReceita = []) {
    const stmt = db.prepare(`
      INSERT INTO pizzas (nome, categoria, descricao, preco_brotinho, preco_media, preco_grande, preco_familia, imagem, ativa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.nome,
      data.categoria || 'Tradicional',
      data.descricao || '',
      parseFloat(data.preco_brotinho) || 0,
      parseFloat(data.preco_media) || 0,
      parseFloat(data.preco_grande) || 0,
      parseFloat(data.preco_familia) || 0,
      data.imagem || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
      data.ativa !== undefined ? (data.ativa ? 1 : 0) : 1
    );

    const pizzaId = result.lastInsertRowid;

    if (ingredientesReceita && ingredientesReceita.length > 0) {
      this.salvarReceita(pizzaId, ingredientesReceita);
    }

    return pizzaId;
  }

  static update(id, data, ingredientesReceita = null) {
    const fields = [
      'nome = ?',
      'categoria = ?',
      'descricao = ?',
      'preco_brotinho = ?',
      'preco_media = ?',
      'preco_grande = ?',
      'preco_familia = ?',
      'ativa = ?'
    ];
    const params = [
      data.nome,
      data.categoria,
      data.descricao || '',
      parseFloat(data.preco_brotinho) || 0,
      parseFloat(data.preco_media) || 0,
      parseFloat(data.preco_grande) || 0,
      parseFloat(data.preco_familia) || 0,
      data.ativa ? 1 : 0
    ];

    if (data.imagem) {
      fields.push('imagem = ?');
      params.push(data.imagem);
    }

    params.push(id);

    db.prepare(`UPDATE pizzas SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    if (ingredientesReceita !== null) {
      db.prepare('DELETE FROM pizza_ingredientes WHERE pizza_id = ?').run(id);
      this.salvarReceita(id, ingredientesReceita);
    }

    return id;
  }

  static salvarReceita(pizzaId, ingredientesReceita) {
    const stmt = db.prepare(`
      INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id, quantidade_padrao)
      VALUES (?, ?, ?)
    `);

    for (const item of ingredientesReceita) {
      if (item.ingrediente_id && parseFloat(item.quantidade_padrao) > 0) {
        stmt.run(pizzaId, item.ingrediente_id, parseFloat(item.quantidade_padrao));
      }
    }
  }

  static delete(id) {
    db.prepare('DELETE FROM pizza_ingredientes WHERE pizza_id = ?').run(id);
    return db.prepare('DELETE FROM pizzas WHERE id = ?').run(id);
  }

  static getCategorias() {
    return ['Tradicional', 'Especial', 'Premium', 'Doce'];
  }
}

module.exports = Pizza;
