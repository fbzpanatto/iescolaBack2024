"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transporter = void 0;
const nodemailer_1 = require("nodemailer");
exports.Transporter = (0, nodemailer_1.createTransport)({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        type: "OAuth2",
        user: "appescola7@gmail.com",
        clientId: "675139228268-av30ks4hl3mnqebtpcui1ob6filgfq88.apps.googleusercontent.com",
        clientSecret: "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",
        // refreshToken: "1//04C7H-FfCsw0uCgYIARAAGAQSNwF-L9IrZIfdRdpeXwzSHuPhiS7Bkv9TbzXxahCN9qLW13s_Ul9rsDGsI-KhyB1a6K_bf0qerK8",
        accessToken: "ya29.a0AfB_byBRAYs1xuJXEzxGk6KLCtqgDYCHO2jz6aLVOOOK8gWzDjP1Z2AJV0QgH4M-oTYkFfKv7lc-k7R4RFKAM7JR0jp9RtVRnfbvnkNYbEjxzdZ5kAtW-tgsGVC7T0eWiko_HQ--papUPBTW2ogTnrF48PZUPACN4rVfaCgYKAXgSARESFQHGX2MiW2ZbFJZJi-LO3WmHWONN8w0171"
    },
});
