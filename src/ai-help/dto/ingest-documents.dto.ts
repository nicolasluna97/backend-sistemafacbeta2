import { IsBoolean } from 'class-validator';

export class IngestDocumentsDto {
  @IsBoolean()
  confirm: boolean;
}