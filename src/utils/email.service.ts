import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export async function mainEmail(email: string, password?: string){

  const url = 'http://localhost:4200/home'
  let info: SMTPTransport.SentMessageInfo
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'appescola7@gmail.com',
      pass: 'paev fpmr arym prsb',
    }
  })

  if(!password) {
    info = await transporter.sendMail({
      from: "IEscolApp <fbzpanatto@gmail.com@gmail.com>",
      to: email,
      subject: "IEscolApp: Conta criada com sucesso.",
      html: `
        <p>Olá,</p>
        <p>Uma conta IEscolApp acabou de ser criada para você.</p>
        <p>Clique no link abaixo para criar uma nova senha:</p>
        <a href="${url}">Redefinir Senha</a>
        <p>Atenciosamente,</p>
        <p>Equipe IEScola</p>
      `,
    })
    return
  }

  info = await transporter.sendMail({
    from: "IEscolApp <fbzpanatto@gmail.com@gmail.com>",
    to: email,
    subject: "IEscolApp: Lembrete de senha",
    html: `
      <p>Olá,</p>
      <p>Você solicitou um lembrete de senha para sua conta IEscolApp</p>
      <p>A sua senha é: <b>${password}</b></p>
      <p>Atenciosamente,</p>
      <p>Equipe IEScola</p>
    `,
  })
  
  console.log('Message sent: ' + info.messageId);
}