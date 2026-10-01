const express = require('express');
const router = express.Router();
const VendaController = require('../controllers/VendaController');

router.get('/', VendaController.index);
router.get('/pdv', VendaController.pdv);
router.post('/nova', VendaController.store);
router.get('/:id', VendaController.show);
router.get('/:id/cupom', VendaController.cupom);
router.post('/:id/status', VendaController.updateStatus);
router.post('/:id/cancelar', VendaController.cancelar);

module.exports = router;
