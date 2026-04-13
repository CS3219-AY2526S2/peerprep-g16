import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  questionId!: string;

  @IsString()
  @IsIn(
    ['unclear_wording', 'wrong_difficulty', 'insufficient_test_cases', 'other'],
    {
      message:
        'category must be one of: unclear_wording, wrong_difficulty, insufficient_test_cases, other',
    },
  )
  category!: string;

  @IsString()
  @MaxLength(1000)
  comment!: string;
}
