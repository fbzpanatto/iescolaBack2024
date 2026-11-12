import { Request } from "express";
import { contactEmail } from "../services/email";

export interface Contact { name: string, email: string, institution: string, segment: string, message: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const oneLine = (value: unknown, max: number): string => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function parseContact(body: Record<string, unknown> | undefined): Contact | null {
  const name = oneLine(body?.name, 120);
  const email = oneLine(body?.email, 254);
  const message = String(body?.message ?? '').trim().slice(0, 3000);

  if (name.length < 2 || message.length < 10 || !EMAIL_PATTERN.test(email)) { return null }

  return { name, email, message, institution: oneLine(body?.institution, 160), segment: oneLine(body?.segment, 40) };
}

class ContactController {
  async send(req: Request) {
    const sent = { status: 200, data: { message: "Mensagem enviada. Retornaremos em breve." } };

    // Honeypot: real visitors never see the "website" field, so a value means a bot. Answer 200 and send nothing.
    if (req.body?.website) { return sent }

    const contact = parseContact(req.body);
    if (!contact) { return { status: 400, message: "Preencha nome, e-mail válido e uma mensagem com pelo menos 10 caracteres." } }

    try {
      await contactEmail(contact);
      return sent;
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const contactController = new ContactController();
