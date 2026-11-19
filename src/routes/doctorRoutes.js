const express = require('express');
const controller = require('../controllers/doctorController');

const router = express.Router();

router.get('/reports/summary', controller.report);
router.get('/reports/busy-days', controller.busyDays);
router.get('/', controller.list);
router.get('/:id/statistics', controller.statistics);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
