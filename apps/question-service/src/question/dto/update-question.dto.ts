import { CreateQuestionDto } from './create-question.dto';

/**
 * DTO used when updating an existing question.
 *
 * All fields are optional for partial updates. `questionId` may appear in an
 * incoming payload but will be ignored by the service so the stable identifier
 * cannot be changed through the update endpoint.
 */
export type UpdateQuestionDto = Partial<CreateQuestionDto> & {
  questionId?: string;
};
