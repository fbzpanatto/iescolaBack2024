"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextGenderClassroomRouter = void 0;
const express_1 = require("express");
const textGenderClassroom_1 = require("../controller/textGenderClassroom");
exports.TextGenderClassroomRouter = (0, express_1.Router)();
exports.TextGenderClassroomRouter.get('/:id', (req, res) => {
    textGenderClassroom_1.textGenderClassroomController.getTabs(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TextGenderClassroomRouter.get('/report/:classroomNumber', (req, res) => {
    textGenderClassroom_1.textGenderClassroomController.getTabsReport(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
