import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { QuestionController } from './question/question.controller';
import { findPackageJSON } from 'module';
import { QuestionService } from './question/question.service';
import { create } from 'domain';

describe('QuestionController', () => {
  let controller: QuestionController;

  const mockQuestionService = {
    findAll: jest.fn(),
    create: jest.fn(),
  };

  /**
   * Builds a fresh testing module before each test and injects
   * a mocked QuestionService into the controller.
   */
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionController],
      providers: [
        {
          provide: QuestionService,
          useValue: mockQuestionService,
        },
      ],
    }).compile;

    controller = module.get<QuestionController>(QuestionController);
  })

  describe('findAll', () => {
    /**
     * Verifies that the controller returns all questions when
     * no topic or difficulty filters are supplied.
     */
    it('should return all questions when no filters are provided', async () => {
      const questions = [
        { questionId: 'two-sum', title: 'Two Sum' },
        { questionId: 'valid-anagram', title: 'Valid Anagram' },
      ];

      mockQuestionService.findAll.mockResolvedValue(questions);

      await expect(controller.findAll()).resolves.toEqual(questions);
      expect(mockQuestionService.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    /**
     * Verifies that the controller forwards topic and difficulty
     * query values to the service layer unchanged.
     */
    it('should pass topic and difficulty filters to the service', async () => {
      const questions = [{ questionId: 'two-sum', topic: 'Arrays', difficulty: 'Easy' }];

      mockQuestionService.findAll.mockResolvedValue(questions);

      await expect(controller.findAll('Arrays', 'Easy')).resolves.toEqual(questions);
      expect(mockQuestionService.findAll).toHaveBeenCalledWith('Arrays', 'Easy');
    });
  });

  describe('create', () => {
    /**
     * Verifies that the controller forwards the request payload
     * to the service and returns the created question result.
     */
    it('should create a question via the service', async () => {
      const body = {
        questionId: 'two-sum',
        title: 'Two Sum',
        topic: 'Arrays',
        difficulty: 'Easy',
        description: 'Find two numbers that add up to target.',
        constraints: ['2 <= nums.length <= 10^4'],
        examples: [
          {
            input: { nums: [2, 7, 11, 15], target: 9 },
            output: [0, 1],
            explanation: 'nums[0] + nums[1] = 9',
          },
        ],
        hints: ['Use a hash map'],
        testCases: {
          sample: [
            {
              input: { nums: [2, 7, 11, 15], target: 9 },
              expectedOutput: [0, 1],
            },
          ],
          hidden: [
            {
              input: { nums: [3, 2, 4], target: 6 },
              expectedOutput: [1, 2],
            },
          ],
        },
      };

      const createdQuestion = {_id: 'mock-id', ...body };

      mockQuestionService.create.mockResolvedValue(createdQuestion);

      await expect(controller.create(body)).resolves.toEqual(createdQuestion);
      expect(mockQuestionService.create).toHaveBeenCalledWith(body);
    })
  })
});
