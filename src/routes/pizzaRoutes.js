const express = require('express');
const router = express.Router();
const PizzaController = require('../controllers/PizzaController');
const upload = require('../config/upload');

router.get('/', PizzaController.index);
router.get('/api/list', PizzaController.apiList);
router.get('/customizar', PizzaController.customizar);
router.get('/nova', PizzaController.createForm);
router.post('/nova', upload.single('imagem_upload'), PizzaController.store);
router.get('/:id/editar', PizzaController.editForm);
router.post('/:id/editar', upload.single('imagem_upload'), PizzaController.update);
router.post('/:id/deletar', PizzaController.destroy);

module.exports = router;
