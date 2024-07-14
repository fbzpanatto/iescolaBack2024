"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteracySecondRouter = void 0;
const express_1 = require("express");
const literacySecond_1 = require("../controller/literacySecond");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.LiteracySecondRouter = (0, express_1.Router)();
exports.LiteracySecondRouter.get('/:year', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield literacySecond_1.litSecCtrl.getClassrooms(req); return res.status(response.status).json(response); }));
