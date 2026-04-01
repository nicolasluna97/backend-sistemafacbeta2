import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskHelpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;
}