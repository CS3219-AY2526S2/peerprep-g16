import { QuestionService } from './question.service';
import type { Model } from 'mongoose';
import type { QuestionDocument } from './schemas/question.schema';

describe('QuestionService', () => {
  let service: QuestionService;
  let questionModel: {
    find: jest.Mock;
  };

  const execResult = (value: unknown) => ({
    exec: jest.fn().mockResolvedValue(value),
  });

  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    questionModel = {
      find: jest.fn(),
    };

    service = new QuestionService(
      questionModel as unknown as Model<QuestionDocument>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('does not treat Random as a stored topic filter', async () => {
      const questions = [{ questionId: 'two-sum', topic: ['Arrays'] }];
      questionModel.find.mockReturnValue(execResult(questions));

      await expect(service.findAll('Random')).resolves.toEqual(questions);

      expect(questionModel.find).toHaveBeenCalledWith({});
    });

    it('keeps real topics as topic filters', async () => {
      const questions = [{ questionId: 'two-sum', topic: ['Arrays'] }];
      questionModel.find.mockReturnValue(execResult(questions));

      await expect(service.findAll('Arrays')).resolves.toEqual(questions);

      expect(questionModel.find).toHaveBeenCalledWith({ topic: 'Arrays' });
    });
  });

  describe('selectQuestion', () => {
    it('selects from any topic when Random is provided', async () => {
      const selectedQuestion = {
        questionId: 'two-sum',
        topic: ['Arrays'],
        difficulty: 'Easy',
      };

      questionModel.find.mockReturnValueOnce(execResult([selectedQuestion]));

      await expect(
        service.selectQuestion({
          topic: 'Random',
          difficulty: 'Easy',
          attemptedQuestionIds: ['old-question', 'old-question'],
        }),
      ).resolves.toEqual(selectedQuestion);

      expect(questionModel.find).toHaveBeenCalledWith({
        difficulty: 'Easy',
        questionId: { $nin: ['old-question'] },
      });
    });

    it('still filters by real topics during selection', async () => {
      const selectedQuestion = {
        questionId: 'number-of-islands',
        topic: ['Graphs'],
        difficulty: 'Medium',
      };

      questionModel.find.mockReturnValueOnce(execResult([selectedQuestion]));

      await expect(
        service.selectQuestion({
          topic: 'Graphs',
          difficulty: 'Medium',
        }),
      ).resolves.toEqual(selectedQuestion);

      expect(questionModel.find).toHaveBeenCalledWith({
        topic: 'Graphs',
        difficulty: 'Medium',
      });
    });
  });
});
