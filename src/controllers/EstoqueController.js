const Ingrediente = require('../models/Ingrediente');

class EstoqueController {
  static index(req, res) {
    try {
      const categoria = req.query.categoria || 'todas';
      const apenasEstoqueBaixo = req.query.alerta === 'true';
      const search = req.query.search || '';

      const ingredientes = Ingrediente.findAll({ categoria, apenasEstoqueBaixo, search });
      const categorias = Ingrediente.getCategorias();
      const alertas = Ingrediente.getAlertasEstoqueBaixo();

      res.render('estoque/index', {
        title: 'Controle de Estoque - Pizzaria MVC',
        page: 'estoque',
        ingredientes,
        categorias,
        categoriaSelecionada: categoria,
        apenasEstoqueBaixo,
        search,
        totalAlertas: alertas.length
      });
    } catch (error) {
      console.error('Erro no controller de estoque:', error);
      res.status(500).send('Erro ao carregar controle de estoque');
    }
  }

  static createForm(req, res) {
    res.render('estoque/form', {
      title: 'Novo Ingrediente/Insumo',
      page: 'estoque',
      ingrediente: null,
      categorias: Ingrediente.getCategorias()
    });
  }

  static store(req, res) {
    try {
      const data = req.body;
      Ingrediente.create(data);
      res.redirect('/estoque');
    } catch (error) {
      console.error('Erro ao salvar ingrediente:', error);
      res.status(500).send('Erro ao salvar ingrediente');
    }
  }

  static editForm(req, res) {
    try {
      const ingrediente = Ingrediente.findById(req.params.id);
      if (!ingrediente) return res.status(404).send('Ingrediente não encontrado');

      res.render('estoque/form', {
        title: `Editar: ${ingrediente.nome}`,
        page: 'estoque',
        ingrediente,
        categorias: Ingrediente.getCategorias()
      });
    } catch (error) {
      res.status(500).send('Erro ao carregar edição');
    }
  }

  static update(req, res) {
    try {
      Ingrediente.update(req.params.id, req.body);
      res.redirect('/estoque');
    } catch (error) {
      res.status(500).send('Erro ao atualizar ingrediente');
    }
  }

  static ajuste(req, res) {
    try {
      const { id, tipo, quantidade, motivo } = req.body;
      Ingrediente.ajustarEstoque(id, tipo, quantidade, motivo);
      res.redirect('/estoque');
    } catch (error) {
      console.error('Erro ao ajustar estoque:', error);
      res.status(500).send('Erro ao ajustar estoque: ' + error.message);
    }
  }

  static movimentacoes(req, res) {
    try {
      const movimentacoes = Ingrediente.getMovimentacoes(100);
      res.render('estoque/movimentacoes', {
        title: 'Histórico de Movimentações do Estoque',
        page: 'estoque',
        movimentacoes
      });
    } catch (error) {
      res.status(500).send('Erro ao carregar histórico');
    }
  }

  static destroy(req, res) {
    try {
      Ingrediente.delete(req.params.id);
      res.redirect('/estoque');
    } catch (error) {
      res.status(500).send('Erro ao remover ingrediente');
    }
  }
}

module.exports = EstoqueController;
