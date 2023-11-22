import { createTransport } from 'nodemailer';

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: '',
    pass: ''
  }
})

const mailOptions = {
  from: '',
  to: '',
  subject: '',
  html: ''
}

export const sendEmail = (param = mailOptions) => {
  transporter.sendMail(param, (error, info) => {
    if (error) { console.log(error) }
    else { console.log('Email sent: ' + info.response) }
  })
}
