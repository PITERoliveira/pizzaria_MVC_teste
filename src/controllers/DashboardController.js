const Pedido = require('../models/Pedido');
const Ingrediente = require('../models/Ingrediente');

class DashboardController {
  static index(req, res) {
    try {
      const stats = Pedido.getEstatisticasDashboard();
      const alertasEstoque = Ingrediente.getAlertasEstoqueBaixo();

      res.render('dashboard/index', {
        title: 'Dashboard de Vendas - Pizzaria MVC',
        page: 'dashboard',
        stats,
        alertasEstoque
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      res.status(500).send('Erro interno ao carregar o dashboard: ' + error.message);
    }
  }
}

module.exports = DashboardController;
