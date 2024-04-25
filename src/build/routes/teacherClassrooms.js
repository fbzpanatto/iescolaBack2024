"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherClassroomsRouter = void 0;
const express_1 = require("express");
const teacherClassrooms_1 = require("../controller/teacherClassrooms");
exports.TeacherClassroomsRouter = (0, express_1.Router)();
exports.TeacherClassroomsRouter.get('/', (req, res) => {
    teacherClassrooms_1.teacherClassroomsController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherClassroomsRouter.post('/', (req, res) => {
    teacherClassrooms_1.teacherClassroomsController.save(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
