import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movement } from '../movements/entities/movement.entity';
import { GetStatisticsDto, StatsMode } from './dto/get-statistics.dto';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Movement)
    private readonly movementRepo: Repository<Movement>,
  ) {}

async getStatistics(userId: string, dto: GetStatisticsDto) {
  const mode = dto.mode as StatsMode;
  const anchor = dto.anchor;

  const tzOffset = this.normalizeTzOffset(dto.tzOffset);

  if (!mode || !anchor) {
    throw new BadRequestException('Parámetros inválidos');
  }

  const { startUtc, endUtc, labels } = this.buildRangeUtc(mode, anchor, tzOffset);

  const movements = await this.movementRepo
    .createQueryBuilder('m')
    .where('m."userId" = :userId', { userId })
    .andWhere('m."createdAt" >= :start', { start: startUtc.toISOString() })
    .andWhere('m."createdAt" < :end', { end: endUtc.toISOString() })
    .orderBy('m."createdAt"', 'ASC')
    .getMany();

  const values = new Array(labels.length).fill(0);

  let totalAmount = 0;
  let totalSales = 0;
  let totalProfit = 0;
  let totalProducts = 0;

  for (const m of movements) {
    // qty seguro
    const qty = Number(m.quantity ?? 0);
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 0;

    // numeric puede venir como string
    const unit = Number((m.unitPrice as any) ?? 0);
    const buy = Number((m.purchasePriceAtSale as any) ?? 0);

    const amount = unit * safeQty;
    const profit = (unit - buy) * safeQty;

    totalAmount += amount;
    totalProfit += profit;
    totalSales += 1;
    totalProducts += safeQty;

    const idx = this.bucketIndex(mode, m.createdAt, startUtc, tzOffset);
    if (idx >= 0 && idx < values.length) values[idx] += amount;
  }

  totalAmount = Math.round(totalAmount);
  totalProfit = Math.round(totalProfit);
  totalProducts = Math.round(totalProducts);

  const roundedValues = values.map(v => Math.round(v));

  return {
    labels,
    values: roundedValues,
    totalAmount,
    totalSales,
    totalProfit,
    totalProducts, // ✅ ACÁ
  };

  }

  // Helpers (timezone seguro)

  private normalizeTzOffset(input?: number): number {
    // Si no viene, asumimos 0 (UTC)
    if (input === undefined || input === null) return 0;

    // Debe ser entero (minutos)
    if (!Number.isFinite(input) || !Number.isInteger(input)) {
      throw new BadRequestException('tzOffset must be an integer number');
    }

    // Rango razonable: -14h..+14h => -840..+840
    if (input < -840 || input > 840) {
      throw new BadRequestException('tzOffset out of range');
    }

    return input;
  }

  private buildRangeUtc(mode: StatsMode, anchor: string, tzOffset: number) {
    if (mode === 'day') {
      // anchor: YYYY-MM-DD
      const { y, m, d } = this.parseYMD(anchor);

      const startUtc = this.localMidnightToUtc(y, m, d, tzOffset);
      const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

      const labels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
      return { startUtc, endUtc, labels };
    }

    if (mode === 'week') {
      // anchor: YYYY-MM-DD (cualquier día de la semana local del usuario)
      const { y, m, d } = this.parseYMD(anchor);

      // Tomamos el "día local" y lo convertimos a un Date UTC representando ese instante
      const anchorUtcAtLocalMidnight = this.localMidnightToUtc(y, m, d, tzOffset);

      // Para calcular el lunes, trabajamos en "tiempo local" pero en UTC methods (estable)
      const anchorLocalMs = anchorUtcAtLocalMidnight.getTime() - tzOffset * 60 * 1000; // pasar a reloj local (en ms)
      const anchorLocal = new Date(anchorLocalMs);

      const day = anchorLocal.getUTCDay(); // 0 dom ... 1 lun ...
      const diffToMonday = (day + 6) % 7;

      const mondayLocalMs = anchorLocalMs - diffToMonday * 24 * 60 * 60 * 1000;
      const startUtc = new Date(mondayLocalMs + tzOffset * 60 * 1000); // volvemos a UTC real
      const endUtc = new Date(startUtc.getTime() + 7 * 24 * 60 * 60 * 1000);

      const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      return { startUtc, endUtc, labels };
    }

    if (mode === 'month') {

      const [yy, mm] = anchor.split('-').map(Number);
      if (!yy || !mm) throw new BadRequestException('Anchor inválido para mes');
      
      const startUtc = this.localMidnightToUtc(yy, mm, 1, tzOffset);

      const nextMonth = mm === 12 ? { y: yy + 1, m: 1 } : { y: yy, m: mm + 1 };
      const endUtc = this.localMidnightToUtc(nextMonth.y, nextMonth.m, 1, tzOffset);

      // labels por día del mes (local)
      const daysInMonth = new Date(Date.UTC(yy, mm, 0)).getUTCDate(); // mm aquí es 1..12, Date.UTC usa 0..11, pero mm=mes+1 en "día 0" funciona para fin de mes
      const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
      return { startUtc, endUtc, labels };
    }

    // year: anchor: YYYY
    const year = Number(anchor);
    if (!year) throw new BadRequestException('Anchor inválido para año');

    const startUtc = this.localMidnightToUtc(year, 1, 1, tzOffset);
    const endUtc = this.localMidnightToUtc(year + 1, 1, 1, tzOffset);

    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return { startUtc, endUtc, labels };
  }

  private bucketIndex(mode: StatsMode, createdAt: Date, startUtc: Date, tzOffset: number) {

    const localMs = new Date(createdAt).getTime() - tzOffset * 60 * 1000;
    const local = new Date(localMs);

    if (mode === 'day') {
      return local.getUTCHours(); 
    }

    if (mode === 'week') {
      // startUtc es lunes 00:00 local convertido a UTC.
      const startLocalMs = startUtc.getTime() - tzOffset * 60 * 1000;

      const diffMs = localMs - startLocalMs;
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      return diffDays; // 0..6
    }

    if (mode === 'month') {
      return local.getUTCDate() - 1; // 0..(days-1) usando día local
    }

    // year
    return local.getUTCMonth(); // 0..11 usando mes local
  }

  private parseYMD(anchor: string) {
    const [yy, mm, dd] = anchor.split('-').map(Number);
    if (!yy || !mm || !dd) throw new BadRequestException('Anchor inválido para día/semana');
    return { y: yy, m: mm, d: dd };
  }


  private localMidnightToUtc(year: number, month: number, day: number, tzOffset: number) {
    // base: UTC midnight de la fecha (si fuese UTC)
    const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  
    return new Date(utcMidnight + tzOffset * 60 * 1000);
  }
}
