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
Object.defineProperty(exports, "__esModule", { value: true });
exports.descriptorController = void 0;
const genericController_1 = require("./genericController");
const Descriptor_1 = require("../model/Descriptor");
const data_source_1 = require("../data-source");
class DescriptorController extends genericController_1.GenericController {
    constructor() {
        super(Descriptor_1.Descriptor);
    }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const topic = request === null || request === void 0 ? void 0 : request.query.topic;
            try {
                const result = yield data_source_1.AppDataSource.getRepository(Descriptor_1.Descriptor).find({
                    where: { topic: { id: Number(topic) } }
                });
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.descriptorController = new DescriptorController();
