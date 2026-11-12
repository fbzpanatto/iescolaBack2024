import nodemailer from "nodemailer";
import type { SMTPSentMessageInfo, Transporter } from "nodemailer";
import type { Contact } from "../controller/contact";

let INFO: SMTPSentMessageInfo;

const isDevelopment = process.env.NODE_ENV === 'development';

const sender = process.env.EMAIL;

const FRONT_URL: string = isDevelopment
  ? (process.env.FRONT_URL_DEV as string)
  : (process.env.FRONT_URL as string);

const RESET_URL: string = isDevelopment
  ? (process.env.RESET_URL_DEV as string)
  : (process.env.RESET_URL as string);

const transport_backup = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
};

const transport = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
};

const TRANSPORTER: Transporter<SMTPSentMessageInfo> = nodemailer.createTransport(transport);

export async function transferEmail(email: string, student: string, rClassroom: string, requester: string, rSchool: string): Promise<void> {

  INFO = await TRANSPORTER.sendMail({
    from: `"EscolApp - Prefeitura de Itatiba" <${sender}>`,
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

export async function resetPasswordEmailService(email: string, token: string) {
  INFO = await TRANSPORTER.sendMail({
    from: `"EscolApp - Prefeitura de Itatiba" <${sender}>`,
    to: email,
    subject: "EscolApp: Redefinir Senha",
    html: `
      <p>Olá,</p>
      <p>Você solicitou um link para redefinição de senha.</p>
      <p style="font-weight: bold">A senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número, e possuir no máximo 8 carateres.</p>
      <a href="${RESET_URL}${token}">Clique aqui para redefinir sua senha.</a>
      <p>Atenciosamente,</p>
      <p>Equipe EscolApp - Prefeitura de Itatiba</p>
    `,
  });
  return console.log("Message sent: " + INFO.messageId);
}

export async function credentialsEmail(email: string, password: string, post: boolean ): Promise<void> {

  if (!post) { return }

  INFO = await TRANSPORTER.sendMail({
    from: `"EscolApp - Prefeitura de Itatiba" <${sender}>`,
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

  console.log("Message sent POST: " + INFO.messageId);

  return;
}
const CONTACT_CC = 'fbzpanatto@gmail.com';

// Plain text on purpose: the fields come from an anonymous visitor and must never be rendered as HTML.
export async function contactEmail(contact: Contact): Promise<void> {
  INFO = await TRANSPORTER.sendMail({
    from: `"EscolApp - Contato" <${sender}>`,
    to: sender,
    cc: CONTACT_CC,
    replyTo: contact.email,
    subject: `EscolApp: novo contato de ${contact.name}`,
    text: [
      `Nome: ${contact.name}`,
      `E-mail: ${contact.email}`,
      `Instituição: ${contact.institution || '-'}`,
      `Segmento: ${contact.segment || '-'}`,
      '',
      contact.message
    ].join('\n'),
  });
  console.log("Message sent: " + INFO.messageId);
}
