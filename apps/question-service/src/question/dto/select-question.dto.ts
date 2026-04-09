import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class SelectQuestionDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  @IsIn(['Easy', 'Medium', 'Hard'])
  difficulty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    if (Array.isArray(value)) {
      return Array.from(
        new Set(
          value.filter((item): item is string => typeof item === 'string'),
        ),
      );
    }

    if (typeof value === 'string') {
      return [value];
    }

    return [];
  })
  attemptedQuestionIds?: string[];
}
