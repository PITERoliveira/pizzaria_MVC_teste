const express = require('express');
const router = express.Router();
const EstoqueController = require('../controllers/EstoqueController');

router.get('/', EstoqueController.index);
router.get('/novo', EstoqueController.createForm);
router.post('/novo', EstoqueController.store);
router.get('/movimentacoes', EstoqueController.movimentacoes);
router.get('/:id/editar', EstoqueController.editForm);
router.post('/:id/editar', EstoqueController.update);
router.post('/ajuste', EstoqueController.ajuste);
router.post('/:id/deletar', EstoqueController.destroy);

module.exports = router;
