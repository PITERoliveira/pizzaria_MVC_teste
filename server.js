const express = require('express');
const path = require('path');
const db = require('./src/config/database');

const dashboardRoutes = require('./src/routes/dashboardRoutes');
const clienteRoutes = require('./src/routes/clienteRoutes');
const estoqueRoutes = require('./src/routes/estoqueRoutes');
const pizzaRoutes = require('./src/routes/pizzaRoutes');
const vendaRoutes = require('./src/routes/vendaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/public')));

// Rotas do MVC
app.use('/', dashboardRoutes);
app.use('/clientes', clienteRoutes);
app.use('/estoque', estoqueRoutes);
app.use('/pizzas', pizzaRoutes);
app.use('/vendas', vendaRoutes);

// Tratamento 404
app.use((req, res) => {
  res.status(404).render('dashboard/index', {
    title: 'Página não encontrada',
    page: '404',
    stats: { faturamentoHoje: { total: 0, qtd: 0 }, faturamentoMes: { total: 0, qtd: 0 }, ticketMedio: 0, totalClientes: 0, totalAlertasEstoque: 0, vendasUltimos7Dias: [], topProdutos: [], formasPagamento: [], porTipo: [], pedidosRecentes: [] },
    alertasEstoque: []
  });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🍕 Sistema de Gerenciamento de Pizzaria Rodando!`);
  console.log(`🌐 Acesse no navegador: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
