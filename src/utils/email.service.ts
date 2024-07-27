import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

let INFO: SMTPTransport.SentMessageInfo;
const FRONT_URL: string = "http://localhost:4200/teacher";
const RESET_URL: string = "http://localhost:4200/reset-password/?token=";
const transport = { host: "smtp.gmail.com", port: 465, secure: true, auth: { user: "appescola7@gmail.com", pass: "paev fpmr arym prsb" }}
const TRANSPORTER: nodemailer.Transporter<SMTPTransport.SentMessageInfo> = nodemailer.createTransport(transport);

export async function transferEmail(email: string, student: string, rClassroom: string, requester: string, rSchool: string): Promise<void> {

  INFO = await TRANSPORTER.sendMail({
    from: "EscolApp - Prefeitura de Itatiba <fbzpanatto@gmail.com@gmail.com>",
    to: email,
    subject: `EscolApp: Solicitação de transferência para: ${student}`,
    html: `
        <p>Olá,</p>
        <p>Você tem um novo pedido de transferência.</p>
        <p>Solicitante: ${requester}</p>
        <p>Sala: ${rClassroom}</p>
        <p>Escola: ${rSchool}</p>
        <p>Aluno: <b>${student}</b></p>
        <a href="${FRONT_URL}">Clique aqui para fazer login.</a>
        <p>Atenciosamente,</p>
        <p>Equipe EscolApp - Prefeitura de Itatiba</p>
      `,
  });
  console.log("Message sent: " + INFO.messageId);
  return;
}

export async function resetPassword(email: string, token: string) {
  INFO = await TRANSPORTER.sendMail({
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
}

export async function credentialsEmail(email: string, password: string, post: boolean ): Promise<void> {

  if (post) {
    INFO = await TRANSPORTER.sendMail({
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

  INFO = await TRANSPORTER.sendMail({
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
}
