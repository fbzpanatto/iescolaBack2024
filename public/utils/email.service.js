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
exports.mainEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
function mainEmail(email, password, post) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = "http://localhost:4200/home";
        let info;
        const transporter = nodemailer_1.default.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: "appescola7@gmail.com",
                pass: "paev fpmr arym prsb",
            },
        });
        if (post) {
            info = yield transporter.sendMail({
                from: "IEscolApp <fbzpanatto@gmail.com@gmail.com>",
                to: email,
                subject: "IEscolApp: Conta criada com sucesso.",
                html: `
        <p>Olá,</p>
        <p>Uma conta IEscolApp acabou de ser criada para você.</p>
        <p>Usuário: <b>${email}</b></p>
        <p>Senha: <b>${password}</b></p>
        <a href="${url}">Clique aqui para fazer login.</a>
        <p>Atenciosamente,</p>
        <p>Equipe IEScola</p>
      `,
            });
            console.log("Message sent: " + info.messageId);
            return;
        }
        info = yield transporter.sendMail({
            from: "IEscolApp <fbzpanatto@gmail.com@gmail.com>",
            to: email,
            subject: "IEscolApp: Lembrete de senha",
            html: `
      <p>Olá,</p>
      <p>Você solicitou um lembrete de senha para sua conta IEscolApp</p>
      <p>Usuário: <b>${email}</b></p>
      <p>Senha: <b>${password}</b></p>
      <p>Atenciosamente,</p>
      <p>Equipe IEScola</p>
    `,
        });
        console.log("Message sent: " + info.messageId);
    });
}
exports.mainEmail = mainEmail;
