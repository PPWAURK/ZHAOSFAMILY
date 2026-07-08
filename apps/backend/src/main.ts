import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseCorsOrigins(corsOrigin: string | undefined): string[] {
  if (!corsOrigin) {
    return ['http://localhost:3000', 'https://zhaoplatforme.com'];
  }

  return corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api';
  const port = Number(configService.get<string>('PORT') || 3002);

  const corsOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS') ||
      configService.get<string>('CORS_ORIGIN'),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', ...corsOrigins],
          frameAncestors: corsOrigins,
        },
      },
    }),
  );

  app.use(json({ limit: '6mb' }));
  app.use(urlencoded({ extended: true, limit: '6mb' }));
  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
    origin: corsOrigins,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
