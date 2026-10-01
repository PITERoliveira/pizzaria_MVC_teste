const Cliente = require('../models/Cliente');

class ClienteController {
  static index(req, res) {
    try {
      const search = req.query.search || '';
      const clientes = Cliente.findAll(search);

      res.render('clientes/index', {
        title: 'Gestão de Clientes - Pizzaria MVC',
        page: 'clientes',
        clientes,
        search
      });
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).send('Erro ao listar clientes');
    }
  }

  static createForm(req, res) {
    res.render('clientes/form', {
      title: 'Novo Cliente',
      page: 'clientes',
      cliente: null
    });
  }

  static store(req, res) {
    try {
      const data = req.body;
      if (req.file) {
        data.foto = '/uploads/' + req.file.filename;
      } else if (!data.foto) {
        // Avatar padrão caso não envie foto
        data.foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nome)}&background=e63946&color=fff&size=200`;
      }

      const id = Cliente.create(data);
      res.redirect(`/clientes/${id}`);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).send('Erro ao criar cliente: ' + error.message);
    }
  }

  static show(req, res) {
    try {
      const id = req.params.id;
      const cliente = Cliente.findById(id);

      if (!cliente) {
        return res.status(404).send('Cliente não encontrado');
      }

      res.render('clientes/detalhes', {
        title: `Cliente: ${cliente.nome}`,
        page: 'clientes',
        cliente
      });
    } catch (error) {
      console.error('Erro ao exibir cliente:', error);
      res.status(500).send('Erro ao exibir cliente');
    }
  }

  static editForm(req, res) {
    try {
      const cliente = Cliente.findById(req.params.id);
      if (!cliente) return res.status(404).send('Cliente não encontrado');

      res.render('clientes/form', {
        title: `Editar Cliente - ${cliente.nome}`,
        page: 'clientes',
        cliente
      });
    } catch (error) {
      res.status(500).send('Erro ao carregar edição do cliente');
    }
  }

  static update(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;

      if (req.file) {
        data.foto = '/uploads/' + req.file.filename;
      }

      Cliente.update(id, data);
      res.redirect(`/clientes/${id}`);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).send('Erro ao atualizar cliente');
    }
  }

  static destroy(req, res) {
    try {
      Cliente.delete(req.params.id);
      res.redirect('/clientes');
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      res.status(500).send('Erro ao deletar cliente');
    }
  }

  static apiList(req, res) {
    try {
      const search = req.query.q || '';
      const clientes = Cliente.findAll(search);
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ClienteController;
