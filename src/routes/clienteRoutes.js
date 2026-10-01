const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/ClienteController');
const upload = require('../config/upload');

router.get('/', ClienteController.index);
router.get('/api/search', ClienteController.apiList);
router.get('/novo', ClienteController.createForm);
router.post('/novo', upload.single('foto_upload'), ClienteController.store);
router.get('/:id', ClienteController.show);
router.get('/:id/editar', ClienteController.editForm);
router.post('/:id/editar', upload.single('foto_upload'), ClienteController.update);
router.post('/:id/deletar', ClienteController.destroy);

module.exports = router;
