const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/pizzaria.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      email TEXT,
      cpf TEXT,
      data_nascimento TEXT,
      cep TEXT,
      logradouro TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      cidade TEXT,
      ponto_referencia TEXT,
      foto TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ingredientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      unidade_medida TEXT NOT NULL,
      quantidade_estoque REAL DEFAULT 0,
      estoque_minimo REAL DEFAULT 0,
      custo_unitario REAL DEFAULT 0,
      preco_adicional REAL DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id),
      tipo TEXT NOT NULL,
      quantidade REAL NOT NULL,
      motivo TEXT,
      pedido_id INTEGER REFERENCES pedidos(id),
      data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pizzas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descricao TEXT,
      preco_brotinho REAL DEFAULT 0,
      preco_media REAL DEFAULT 0,
      preco_grande REAL DEFAULT 0,
      preco_familia REAL DEFAULT 0,
      imagem TEXT,
      ativa INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pizza_ingredientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pizza_id INTEGER NOT NULL REFERENCES pizzas(id) ON DELETE CASCADE,
      ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id),
      quantidade_padrao REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER REFERENCES clientes(id),
      tipo_pedido TEXT NOT NULL,
      mesa TEXT,
      endereco_entrega TEXT,
      taxa_entrega REAL DEFAULT 0,
      desconto REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      total REAL NOT NULL,
      forma_pagamento TEXT NOT NULL,
      valor_pago REAL,
      troco REAL,
      status TEXT DEFAULT 'RECEBIDO',
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pedido_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      tipo_item TEXT NOT NULL,
      pizza_id INTEGER REFERENCES pizzas(id),
      nome_item TEXT NOT NULL,
      tamanho TEXT,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      detalhes_customizacao TEXT,
      observacao TEXT
    );

    CREATE TABLE IF NOT EXISTS pedido_item_consumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_item_id INTEGER NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
      ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id),
      quantidade_consumida REAL NOT NULL
    );
  `);

  // Verificar se precisa popular dados iniciais
  const countClientes = db.prepare("SELECT COUNT(*) as count FROM clientes").get();
  if (countClientes.count === 0) {
    seedData();
  }
}

function seedData() {
  console.log('Populando banco de dados com dados iniciais...');

  const insertIngrediente = db.prepare(`
    INSERT INTO ingredientes (nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo, custo_unitario, preco_adicional)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const ingredientesData = [
    // Massas & Molhos
    ['Massa Tradicional Italiana', 'Massa', 'g', 15000, 3000, 0.015, 0.00],
    ['Massa Pan de Pizza', 'Massa', 'g', 10000, 2000, 0.018, 4.00],
    ['Massa Integral Seleta', 'Massa', 'g', 8000, 1500, 0.020, 5.00],
    ['Molho de Tomate Rústico', 'Molho', 'ml', 12000, 2500, 0.012, 0.00],
    ['Molho Barbecue Defumado', 'Molho', 'ml', 5000, 1000, 0.025, 3.50],
    ['Molho Branco Alfredo', 'Molho', 'ml', 4000, 1000, 0.028, 4.00],
    
    // Queijos
    ['Queijo Mussarela Especial', 'Queijo', 'g', 25000, 5000, 0.045, 6.00],
    ['Catupiry Original Requeijão', 'Queijo', 'g', 12000, 3000, 0.055, 7.50],
    ['Queijo Cheddar Cremoso', 'Queijo', 'g', 9000, 2000, 0.050, 7.00],
    ['Queijo Gorgonzola Intensivo', 'Queijo', 'g', 4000, 1000, 0.080, 9.00],
    ['Queijo Parmesão Ralado', 'Queijo', 'g', 6000, 1200, 0.075, 8.00],
    ['Queijo Provolone Defumado', 'Queijo', 'g', 5000, 1000, 0.065, 8.00],

    // Carnes e Proteínas
    ['Calabresa Fatiada Defumada', 'Carne', 'g', 18000, 4000, 0.038, 7.00],
    ['Peito de Frango Desfiado', 'Carne', 'g', 15000, 3500, 0.032, 6.50],
    ['Pepperoni Fatiado Premium', 'Carne', 'g', 10000, 2000, 0.085, 9.50],
    ['Bacon Crocante em Cubos', 'Carne', 'g', 8000, 2000, 0.060, 8.00],
    ['Presunto Cozido Fatiado', 'Carne', 'g', 12000, 3000, 0.030, 6.00],
    ['Carne Seca Desfiada Temperada', 'Carne', 'g', 6000, 1500, 0.090, 11.00],
    ['Lombinho Canadense', 'Carne', 'g', 5000, 1000, 0.070, 8.50],

    // Vegetais e Acompanhamentos
    ['Cebola Roxa Fatiada', 'Vegetal', 'g', 8000, 1500, 0.008, 3.00],
    ['Tomate Fresco em Rodelas', 'Vegetal', 'g', 10000, 2000, 0.010, 3.50],
    ['Azeitonas Pretas Fatiadas', 'Vegetal', 'g', 6000, 1000, 0.035, 4.50],
    ['Manjericão Fresco Orgânico', 'Vegetal', 'g', 2000, 500, 0.050, 3.00],
    ['Champignon Fatiado', 'Vegetal', 'g', 4000, 800, 0.045, 6.00],
    ['Milho Verde Doce', 'Vegetal', 'g', 7000, 1500, 0.015, 3.50],
    ['Pimentão Verde e Vermelho', 'Vegetal', 'g', 5000, 1000, 0.012, 3.00],

    // Bordas Recheadas
    ['Borda de Catupiry', 'Borda', 'un', 100, 20, 2.50, 8.00],
    ['Borda de Cheddar', 'Borda', 'un', 80, 15, 2.50, 8.00],
    ['Borda de Chocolate com Avelã', 'Borda', 'un', 50, 10, 3.50, 10.00],

    // Bebidas
    ['Coca-Cola 2 Litros', 'Bebida', 'un', 48, 10, 7.50, 14.00],
    ['Guaraná Antarctica 2L', 'Bebida', 'un', 36, 10, 6.80, 12.50],
    ['Suco de Laranja Prats 1L', 'Bebida', 'un', 25, 8, 8.00, 15.00],
    ['Cerveja Heineken Long Neck 330ml', 'Bebida', 'un', 60, 15, 5.50, 11.00],
    ['Água Mineral Sem Gás 500ml', 'Bebida', 'un', 100, 20, 1.50, 4.50]
  ];

  for (const ing of ingredientesData) {
    insertIngrediente.run(ing);
  }

  // Clientes
  const insertCliente = db.prepare(`
    INSERT INTO clientes (nome, telefone, email, cpf, data_nascimento, cep, logradouro, numero, complemento, bairro, cidade, ponto_referencia, foto, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const clientesData = [
    [
      'Carlos Eduardo Silva',
      '(11) 98765-4321',
      'carlos.silva@email.com',
      '123.456.789-00',
      '1988-05-14',
      '01310-100',
      'Av. Paulista',
      '1500',
      'Apto 82',
      'Bela Vista',
      'São Paulo',
      'Próximo ao MASP',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'Prefere pizza bem assada e sem cebola.'
    ],
    [
      'Mariana Oliveira Santos',
      '(11) 97654-3210',
      'mariana.santos@email.com',
      '234.567.890-11',
      '1993-11-20',
      '04538-132',
      'Rua Clodomiro Amazonas',
      '450',
      'Bloco B - 121',
      'Itaim Bibi',
      'São Paulo',
      'Em frente à padaria',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'Cliente VIP. Gosta de borda recheada de Catupiry.'
    ],
    [
      'Fernanda Lima Rodrigues',
      '(11) 99887-1122',
      'fernanda.lima@email.com',
      '345.678.901-22',
      '1995-03-08',
      '05403-000',
      'Rua Oscar Freire',
      '980',
      'Casa 2',
      'Pinheiros',
      'São Paulo',
      'Esquina com Teodoro Sampaio',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      'Pedir para tocar a campainha verde.'
    ],
    [
      'Lucas Mendes Alencar',
      '(11) 91234-5678',
      'lucas.mendes@email.com',
      '456.789.012-33',
      '1990-08-25',
      '02011-000',
      'Rua Voluntários da Pátria',
      '2100',
      'Apto 44',
      'Santana',
      'São Paulo',
      'Ao lado do metrô Santana',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      'Gosta de molho extra de tomate.'
    ],
    [
      'Beatriz Costa Ferreira',
      '(11) 98112-2334',
      'beatriz.costa@email.com',
      '567.890.123-44',
      '2000-01-30',
      '04101-000',
      'Rua Vergueiro',
      '3200',
      'Apto 153',
      'Vila Mariana',
      'São Paulo',
      'Próximo ao Hospital São Paulo',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      'Sempre pede refrigerante gelado.'
    ]
  ];

  for (const c of clientesData) {
    insertCliente.run(c);
  }

  // Pizzas
  const insertPizza = db.prepare(`
    INSERT INTO pizzas (nome, categoria, descricao, preco_brotinho, preco_media, preco_grande, preco_familia, imagem)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const pizzasData = [
    [
      'Calabresa Especial',
      'Tradicional',
      'Molho de tomate caseiro, bastante mussarela derretida, fatias generosas de calabresa defumada, cebola roxa fresca e azeitonas pretas.',
      35.00, 48.00, 62.00, 75.00,
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500'
    ],
    [
      'Frango com Catupiry',
      'Tradicional',
      'Peito de frango desfiado e temperado na medida certa, coberto com o genuíno Catupiry cremoso e milho verde.',
      38.00, 52.00, 68.00, 82.00,
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500'
    ],
    [
      'Pepperoni Supreme',
      'Especial',
      'Massa artesanal, molho de tomate rústico, generosa camada de mussarela e fatias selecionadas de pepperoni crocante.',
      42.00, 56.00, 74.00, 89.00,
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500'
    ],
    [
      'Quatro Queijos Nobres',
      'Especial',
      'Combinação harmoniosa de Mussarela, Catupiry, Gorgonzola marcante e Provolone defumado.',
      40.00, 55.00, 72.00, 86.00,
      'https://images.unsplash.com/photo-1573821663912-569905455b1c?w=500'
    ],
    [
      'Portuguesa Completa',
      'Tradicional',
      'Presunto fatiado, mussarela, ovos, cebola, ervilha, azeitonas pretas e um toque especial de azeite extra virgem.',
      36.00, 50.00, 65.00, 78.00,
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500'
    ],
    [
      'Marguerita Gourmet',
      'Especial',
      'Molho de tomate rústico, mussarela de alta qualidade, rodelas de tomate fresco, manjericão fresco e parmesão ralado.',
      34.00, 46.00, 60.00, 72.00,
      'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500'
    ],
    [
      'Carne Seca com Catupiry',
      'Premium',
      'Deliciosa carne seca desfiada e bem temperada, coberta com autêntico Catupiry e cebola roxa grelhada.',
      45.00, 60.00, 79.00, 95.00,
      'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=500'
    ]
  ];

  for (const p of pizzasData) {
    insertPizza.run(p);
  }

  // Receitas das pizzas (associação com ingredientes para baixa automática)
  const insertPizzaIngrediente = db.prepare(`
    INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id, quantidade_padrao) VALUES (?, ?, ?)
  `);

  // Pizza 1: Calabresa Especial (ingredientes base: 1=Massa, 4=Molho, 7=Mussarela, 13=Calabresa, 20=Cebola, 22=Azeitona)
  insertPizzaIngrediente.run(1, 1, 300); // 300g massa
  insertPizzaIngrediente.run(1, 4, 150); // 150ml molho
  insertPizzaIngrediente.run(1, 7, 250); // 250g mussarela
  insertPizzaIngrediente.run(1, 13, 200); // 200g calabresa
  insertPizzaIngrediente.run(1, 20, 60);  // 60g cebola
  insertPizzaIngrediente.run(1, 22, 40);  // 40g azeitona

  // Pizza 2: Frango com Catupiry
  insertPizzaIngrediente.run(2, 1, 300);
  insertPizzaIngrediente.run(2, 4, 150);
  insertPizzaIngrediente.run(2, 7, 150);
  insertPizzaIngrediente.run(2, 14, 250); // Frango
  insertPizzaIngrediente.run(2, 8, 150);  // Catupiry
  insertPizzaIngrediente.run(2, 25, 50);  // Milho

  // Pizza 3: Pepperoni Supreme
  insertPizzaIngrediente.run(3, 1, 300);
  insertPizzaIngrediente.run(3, 4, 150);
  insertPizzaIngrediente.run(3, 7, 250);
  insertPizzaIngrediente.run(3, 15, 180); // Pepperoni

  // Simular Histórico de Vendas nos últimos 30 dias
  const insertPedido = db.prepare(`
    INSERT INTO pedidos (cliente_id, tipo_pedido, mesa, endereco_entrega, taxa_entrega, desconto, subtotal, total, forma_pagamento, valor_pago, troco, status, observacoes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPedidoItem = db.prepare(`
    INSERT INTO pedido_itens (pedido_id, tipo_item, pizza_id, nome_item, tamanho, quantidade, preco_unitario, subtotal, detalhes_customizacao, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const formas = ['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO'];
  const tipos = ['DELIVERY', 'BALCAO', 'SALAO'];
  const statusList = ['FINALIZADO', 'FINALIZADO', 'FINALIZADO', 'EM_PREPARO', 'RECEBIDO'];

  const now = new Date();
  
  for (let i = 25; i >= 0; i--) {
    const dataPedido = new Date(now.getTime() - i * 24 * 60 * 60 * 1000 - Math.random() * 8 * 3600 * 1000);
    const dateStr = dataPedido.toISOString().replace('T', ' ').substring(0, 19);

    const clienteId = (i % 5) + 1;
    const tipo = tipos[i % 3];
    const forma = formas[i % 4];
    const status = i < 2 ? statusList[i] : 'FINALIZADO';
    const taxa = tipo === 'DELIVERY' ? 8.00 : 0.00;

    let subtotal = 0;
    const pizzaSel = (i % 7) + 1;
    const prec = 62.00 + (i % 4) * 6;
    subtotal = prec;
    const total = subtotal + taxa;

    const res = insertPedido.run(
      clienteId,
      tipo,
      tipo === 'SALAO' ? `Mesa ${(i % 6) + 1}` : null,
      tipo === 'DELIVERY' ? 'Av. Paulista, 1500 - Bela Vista' : null,
      taxa,
      0,
      subtotal,
      total,
      forma,
      forma === 'DINHEIRO' ? total + 10 : total,
      forma === 'DINHEIRO' ? 10 : 0,
      status,
      'Sem pimentão',
      dateStr
    );

    const pedidoId = res.lastInsertRowid;

    insertPedidoItem.run(
      pedidoId,
      'PIZZA_CARDAPIO',
      pizzaSel,
      pizzasData[(pizzaSel - 1) % pizzasData.length][0],
      'GRANDE',
      1,
      prec,
      prec,
      null,
      'Massa fina'
    );
  }

  console.log('Dados iniciais inseridos com sucesso!');
}

initDb();

module.exports = db;
