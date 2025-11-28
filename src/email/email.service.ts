import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.error('SENDGRID_API_KEY no está configurado');
    }
  }

  async sendVerificationCode(email: string, code: string) {
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    const msg = {
      to: email,
      from: fromEmail,
      subject: 'Tu código de verificación',
      text: `Tu código de verificación es: ${code}`,
      html: `
        <h2>Verificación de cuenta</h2>
        <p>Tu código de verificación es:</p>
        <h1 style="font-size: 32px; letter-spacing: 4px;">${code}</h1>
        <p>Este código vence en 15 minutos.</p>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Código enviado a ${email}`);
    } catch (error) {
      this.logger.error('Error enviando email', error);
      throw new Error('No se pudo enviar el email');
    }
  }
}
