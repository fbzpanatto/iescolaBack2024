"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferRouter = void 0;
const express_1 = require("express");
const transfer_1 = require("../controller/transfer");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.TransferRouter = (0, express_1.Router)();
exports.TransferRouter.get('/:year', havePermission_1.default, (req, res) => {
    transfer_1.transferController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TransferRouter.get('/:id', havePermission_1.default, (req, res) => {
    transfer_1.transferController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TransferRouter.post('/', havePermission_1.default, (req, res) => {
    transfer_1.transferController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TransferRouter.put('/:id', havePermission_1.default, (req, res) => {
    transfer_1.transferController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TransferRouter.delete('/:id', havePermission_1.default, (req, res) => {
    transfer_1.transferController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
