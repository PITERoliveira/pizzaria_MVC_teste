const Pizza = require('../models/Pizza');
const Ingrediente = require('../models/Ingrediente');

class PizzaController {
  static index(req, res) {
    try {
      const categoria = req.query.categoria || 'todas';
      const search = req.query.search || '';

      const pizzas = Pizza.findAll({ categoria, search });
      const categorias = Pizza.getCategorias();

      res.render('pizzas/index', {
        title: 'Cardápio de Pizzas - Pizzaria MVC',
        page: 'pizzas',
        pizzas,
        categorias,
        categoriaSelecionada: categoria,
        search
      });
    } catch (error) {
      console.error('Erro ao listar pizzas:', error);
      res.status(500).send('Erro ao carregar cardápio');
    }
  }

  static createForm(req, res) {
    const ingredientes = Ingrediente.findAll({ apenasAtivas: true });
    res.render('pizzas/form', {
      title: 'Nova Pizza no Cardápio',
      page: 'pizzas',
      pizza: null,
      categorias: Pizza.getCategorias(),
      ingredientes
    });
  }

  static store(req, res) {
    try {
      const data = req.body;
      if (req.file) {
        data.imagem = '/uploads/' + req.file.filename;
      }

      // Processar lista de ingredientes da receita
      let receita = [];
      if (data.ingredientes_ids) {
        const ids = Array.isArray(data.ingredientes_ids) ? data.ingredientes_ids : [data.ingredientes_ids];
        const qtds = Array.isArray(data.ingredientes_qtds) ? data.ingredientes_qtds : [data.ingredientes_qtds];

        for (let i = 0; i < ids.length; i++) {
          if (ids[i] && qtds[i]) {
            receita.push({
              ingrediente_id: ids[i],
              quantidade_padrao: qtds[i]
            });
          }
        }
      }

      Pizza.create(data, receita);
      res.redirect('/pizzas');
    } catch (error) {
      console.error('Erro ao cadastrar pizza:', error);
      res.status(500).send('Erro ao cadastrar pizza');
    }
  }

  static editForm(req, res) {
    try {
      const pizza = Pizza.findById(req.params.id);
      if (!pizza) return res.status(404).send('Pizza não encontrada');

      const ingredientes = Ingrediente.findAll({ apenasAtivas: true });

      res.render('pizzas/form', {
        title: `Editar: ${pizza.nome}`,
        page: 'pizzas',
        pizza,
        categorias: Pizza.getCategorias(),
        ingredientes
      });
    } catch (error) {
      res.status(500).send('Erro ao carregar edição de pizza');
    }
  }

  static update(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;

      if (req.file) {
        data.imagem = '/uploads/' + req.file.filename;
      }

      let receita = [];
      if (data.ingredientes_ids) {
        const ids = Array.isArray(data.ingredientes_ids) ? data.ingredientes_ids : [data.ingredientes_ids];
        const qtds = Array.isArray(data.ingredientes_qtds) ? data.ingredientes_qtds : [data.ingredientes_qtds];

        for (let i = 0; i < ids.length; i++) {
          if (ids[i] && qtds[i]) {
            receita.push({
              ingrediente_id: ids[i],
              quantidade_padrao: qtds[i]
            });
          }
        }
      }

      Pizza.update(id, data, receita);
      res.redirect('/pizzas');
    } catch (error) {
      console.error('Erro ao atualizar pizza:', error);
      res.status(500).send('Erro ao atualizar pizza');
    }
  }

  static customizar(req, res) {
    try {
      const ingredientes = Ingrediente.findAll();
      
      // Organizar ingredientes por categoria para o montador interativo
      const porCategoria = {
        massas: ingredientes.filter(i => i.categoria === 'Massa'),
        molhos: ingredientes.filter(i => i.categoria === 'Molho'),
        queijos: ingredientes.filter(i => i.categoria === 'Queijo'),
        carnes: ingredientes.filter(i => i.categoria === 'Carne'),
        vegetais: ingredientes.filter(i => i.categoria === 'Vegetal'),
        bordas: ingredientes.filter(i => i.categoria === 'Borda')
      };

      res.render('pizzas/customizar', {
        title: 'Montador de Pizza Customizada',
        page: 'customizar',
        porCategoria,
        ingredientes
      });
    } catch (error) {
      console.error('Erro ao abrir montador:', error);
      res.status(500).send('Erro ao abrir montador de pizza');
    }
  }

  static destroy(req, res) {
    try {
      Pizza.delete(req.params.id);
      res.redirect('/pizzas');
    } catch (error) {
      res.status(500).send('Erro ao excluir pizza');
    }
  }

  static apiList(req, res) {
    try {
      const pizzas = Pizza.findAll({ apenasAtivas: true });
      res.json(pizzas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PizzaController;
