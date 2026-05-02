import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendVerificationCode(email: string, code: string) {
    // MODO DESARROLLO: Loguea el código en consola en lugar de enviarlo por email
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment) {
      // Esto aparecerá en la terminal donde corre el backend
      console.log('\n');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║          📧 EMAIL DE VERIFICACIÓN (MODO DESARROLLO)        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log(`\n📧 Para:     ${email}`);
      console.log(`🔐 Código:   ${code}`);
      console.log(`⏱️  Válido:   15 minutos`);
      console.log('\n💡 Copia el código arriba y pégalo en la aplicación\n');
      console.log('╔════════════════════════════════════════════════════════════╗\n');

      this.logger.log(`✅ Código de verificación para ${email}: ${code}`);
      return;
    }

    // PRODUCCIÓN: Aquí iría el código para enviar emails reales
    this.logger.error('Email service no configurado para producción');
    throw new Error('Email service no disponible en este entorno');
  }
}
