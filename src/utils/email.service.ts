import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export async function mainEmail(
  email: string,
  password: string,
  post: boolean,
) {
  const url = "http://localhost:4200/home";
  let info: SMTPTransport.SentMessageInfo;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "appescola7@gmail.com",
      pass: "paev fpmr arym prsb",
    },
  });

  if (post) {
    info = await transporter.sendMail({
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

  info = await transporter.sendMail({
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
}
