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
exports.transferEmail = transferEmail;
exports.resetPassword = resetPassword;
exports.credentialsEmail = credentialsEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
let INFO;
const FRONT_URL = "http://localhost:4200/teacher";
const RESET_URL = "http://localhost:4200/reset-password/?token=";
const transport = { host: "smtp.gmail.com", port: 465, secure: true, auth: { user: "appescola7@gmail.com", pass: "paev fpmr arym prsb" } };
const TRANSPORTER = nodemailer_1.default.createTransport(transport);
function transferEmail(email, student, rClassroom, requester, rSchool) {
    return __awaiter(this, void 0, void 0, function* () {
        INFO = yield TRANSPORTER.sendMail({
            from: "EscolApp - Prefeitura de Itatiba <fbzpanatto@gmail.com@gmail.com>",
            to: email,
            subject: `EscolApp: Solicitação de transferência para: ${student}`,
            html: `
        <p>Olá,</p>
        <p>Pedido de transferência</p>
        <p>Solicitante: ${requester}</p>
        <p>Sala: ${rClassroom}</p>
        <p>Escola: ${rSchool}</p>
        <p>para</p>
        <p>Aluno: <b>${student}</b></p>
        <a href="${FRONT_URL}">Clique aqui para fazer login.</a>
        <p>Atenciosamente,</p>
        <p>Equipe EscolApp - Prefeitura de Itatiba</p>
      `,
        });
        console.log("Message sent: " + INFO.messageId);
        return;
    });
}
function resetPassword(email, token) {
    return __awaiter(this, void 0, void 0, function* () {
        INFO = yield TRANSPORTER.sendMail({
            from: "EscolApp - Prefeitura de Itatiba <fbzpanatto@gmail.com@gmail.com>",
            to: email,
            subject: "EscolApp: Redefinir Senha",
            html: `
      <p>Olá,</p>
      <a href="${RESET_URL}${token}">Clique aqui para redefinir sua senha.</a>
      <p>Atenciosamente,</p>
      <p>Equipe EscolApp - Prefeitura de Itatiba</p>
    `,
        });
        return console.log("Message sent: " + INFO.messageId);
    });
}
function credentialsEmail(email, password, post) {
    return __awaiter(this, void 0, void 0, function* () {
        if (post) {
            INFO = yield TRANSPORTER.sendMail({
                from: "EscolApp - Prefeitura de Itatiba <fbzpanatto@gmail.com@gmail.com>",
                to: email,
                subject: "EscolApp: Conta criada com sucesso.",
                html: `
        <p>Olá,</p>
        <p>Uma conta EscolApp acabou de ser criada para você.</p>
        <p>Usuário: <b>${email}</b></p>
        <p>Senha: <b>${password}</b></p>
        <a href="${FRONT_URL}">Clique aqui para fazer login.</a>
        <p>Atenciosamente,</p>
        <p>Equipe EscolApp - Prefeitura de Itatiba</p>
      `,
            });
            console.log("Message sent: " + INFO.messageId);
            return;
        }
        INFO = yield TRANSPORTER.sendMail({
            from: "EscolApp - Prefeitura de Itatiba <fbzpanatto@gmail.com@gmail.com>",
            to: email,
            subject: "EscolApp: Lembrete de senha",
            html: `
      <p>Olá,</p>
      <p>Você solicitou um lembrete de senha para sua conta EscolApp</p>
      <p>Usuário: <b>${email}</b></p>
      <p>Senha: <b>${password}</b></p>
      <p>Atenciosamente,</p>
      <p>Equipe EscolApp - Prefeitura de Itatiba</p>
    `,
        });
        console.log("Message sent: " + INFO.messageId);
        return;
    });
}
