import { IsBoolean } from 'class-validator';

export class EmbedChunksDto {
  @IsBoolean()
  confirm: boolean;
}