import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeedbackDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'reviewed', 'resolved'], {
    message: 'status must be one of: pending, reviewed, resolved',
  })
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
