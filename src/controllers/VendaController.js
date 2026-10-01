const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
const Pizza = require('../models/Pizza');
const Ingrediente = require('../models/Ingrediente');

class VendaController {
  static index(req, res) {
    try {
      const status = req.query.status || 'TODOS';
      const tipo_pedido = req.query.tipo || 'TODOS';
      const search = req.query.search || '';

      const pedidos = Pedido.findAll({ status, tipo_pedido, search });

      res.render('vendas/index', {
        title: 'Gerenciamento de Vendas e Pedidos',
        page: 'vendas',
        pedidos,
        statusSelecionado: status,
        tipoSelecionado: tipo_pedido,
        search
      });
    } catch (error) {
      console.error('Erro ao listar vendas:', error);
      res.status(500).send('Erro ao carregar lista de vendas');
    }
  }

  static pdv(req, res) {
    try {
      const clientes = Cliente.findAll();
      const pizzas = Pizza.findAll({ apenasAtivas: true });
      const bebidas = Ingrediente.findAll({ categoria: 'Bebida' });
      const ingredientes = Ingrediente.findAll();

      const porCategoriaIngredientes = {
        massas: ingredientes.filter(i => i.categoria === 'Massa'),
        molhos: ingredientes.filter(i => i.categoria === 'Molho'),
        queijos: ingredientes.filter(i => i.categoria === 'Queijo'),
        carnes: ingredientes.filter(i => i.categoria === 'Carne'),
        vegetais: ingredientes.filter(i => i.categoria === 'Vegetal'),
        bordas: ingredientes.filter(i => i.categoria === 'Borda')
      };

      res.render('vendas/pdv', {
        title: 'Ponto de Venda (PDV) - Caixa',
        page: 'pdv',
        clientes,
        pizzas,
        bebidas,
        porCategoriaIngredientes
      });
    } catch (error) {
      console.error('Erro no PDV:', error);
      res.status(500).send('Erro ao carregar o PDV');
    }
  }

  static store(req, res) {
    try {
      const { dadosPedido, itens } = req.body;

      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ success: false, error: 'O pedido deve conter pelo menos um item.' });
      }

      const pedidoId = Pedido.create(dadosPedido, itens);

      res.json({
        success: true,
        pedidoId,
        message: 'Pedido realizado com sucesso e estoque atualizado!'
      });
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar o pedido.'
      });
    }
  }

  static show(req, res) {
    try {
      const pedido = Pedido.findById(req.params.id);
      if (!pedido) return res.status(404).send('Pedido não encontrado');

      res.render('vendas/detalhes', {
        title: `Pedido #${pedido.id}`,
        page: 'vendas',
        pedido
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes do pedido:', error);
      res.status(500).send('Erro ao carregar pedido');
    }
  }

  static updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      Pedido.updateStatus(id, status);

      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({ success: true, status });
      }

      res.redirect(`/vendas/${id}`);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      res.status(500).send('Erro ao atualizar status');
    }
  }

  static cancelar(req, res) {
    try {
      const { id } = req.params;
      Pedido.cancelar(id);

      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({ success: true });
      }

      res.redirect('/vendas');
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      res.status(500).send('Erro ao cancelar pedido: ' + error.message);
    }
  }

  static cupom(req, res) {
    try {
      const pedido = Pedido.findById(req.params.id);
      if (!pedido) return res.status(404).send('Pedido não encontrado');

      res.render('vendas/cupom', {
        layout: false,
        pedido
      });
    } catch (error) {
      res.status(500).send('Erro ao gerar cupom');
    }
  }
}

module.exports = VendaController;
