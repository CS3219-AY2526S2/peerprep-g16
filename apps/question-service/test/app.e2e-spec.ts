/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await, @typescript-eslint/only-throw-error */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdminGuard } from '../src/auth/admin.guard';
import { PrivilegeRevocationService } from '../src/auth/privilege-revocation.service';
import { UserGuard } from '../src/auth/user.guard';
import { FeedbackController } from '../src/feedback/feedback.controller';
import { FeedbackService } from '../src/feedback/feedback.service';
import { Feedback } from '../src/feedback/schemas/feedback.schema';
import { QuestionController } from '../src/question/question.controller';
import { QuestionService } from '../src/question/question.service';
import { Question } from '../src/question/schemas/question.schema';

const JWT_SECRET = randomBytes(32).toString('hex');

type StoredQuestion = {
  questionId: string;
  title: string;
  topic: string[];
  difficulty: string;
  description: string;
  constraints: string[];
  examples: Array<Record<string, unknown>>;
  hints: string[];
  testCases: {
    sample: Array<Record<string, unknown>>;
    hidden: Array<Record<string, unknown>>;
  };
  modelAnswer: string;
  modelAnswerTimeComplexity: string;
  modelAnswerExplanation: string;
};

type StoredFeedback = {
  _id: string;
  questionId: string;
  userId: string;
  category: string;
  comment: string;
  status: string;
  adminNote: string;
  createdAt: Date;
};

const makeQuestion = (
  overrides: Partial<StoredQuestion> = {},
): StoredQuestion => ({
  questionId: 'two-sum',
  title: 'Two Sum',
  topic: ['Arrays', 'Hash Table'],
  difficulty: 'Easy',
  description: 'Find two indices whose values sum to target.',
  constraints: ['2 <= nums.length <= 10^4'],
  examples: [{ input: { nums: [2, 7], target: 9 }, output: [0, 1] }],
  hints: ['Use a map.'],
  testCases: {
    sample: [{ input: '2 7\n9', expectedOutput: '0 1' }],
    hidden: [],
  },
  modelAnswer: 'def two_sum(nums, target): return []',
  modelAnswerTimeComplexity: 'O(n)',
  modelAnswerExplanation: 'Store complements while scanning.',
  ...overrides,
});

function createQuestionModel(seed: StoredQuestion[] = []) {
  const store = seed.map((question) => ({ ...question }));

  const matches = (question: StoredQuestion, filter: Record<string, any>) =>
    Object.entries(filter).every(([key, value]) => {
      if (key === 'questionId' && value?.$nin) {
        return !value.$nin.includes(question.questionId);
      }

      const currentValue = question[key as keyof StoredQuestion];
      if (Array.isArray(currentValue)) {
        return currentValue.includes(value);
      }

      return currentValue === value;
    });

  function QuestionModel(
    this: StoredQuestion & { save: () => Promise<StoredQuestion> },
    data: StoredQuestion,
  ) {
    Object.assign(this, data);
    this.save = async () => {
      if (store.some((question) => question.questionId === data.questionId)) {
        throw { code: 11000 };
      }

      store.push({ ...data });
      return data;
    };
  }

  Object.assign(QuestionModel, {
    find: jest.fn((filter = {}) => ({
      exec: jest.fn(async () =>
        store.filter((question) => matches(question, filter)),
      ),
    })),
    findOne: jest.fn((filter = {}) => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(
        async () => store.find((question) => matches(question, filter)) ?? null,
      ),
    })),
    findOneAndDelete: jest.fn((filter = {}) => ({
      exec: jest.fn(async () => {
        const index = store.findIndex((question) => matches(question, filter));
        if (index === -1) {
          return null;
        }

        return store.splice(index, 1)[0];
      }),
    })),
    findOneAndUpdate: jest.fn(
      (filter = {}, update: { $set: Partial<StoredQuestion> }) => ({
        exec: jest.fn(async () => {
          const question = store.find((item) => matches(item, filter));
          if (!question) {
            return null;
          }

          Object.assign(question, update.$set);
          return question;
        }),
      }),
    ),
    distinct: jest.fn((field: keyof StoredQuestion) => ({
      exec: jest.fn(async () =>
        Array.from(
          new Set(store.flatMap((question) => question[field] as string[])),
        ),
      ),
    })),
  });

  return QuestionModel;
}

function createFeedbackModel(seed: StoredFeedback[] = []) {
  const store = seed.map((feedback) => ({ ...feedback }));

  function FeedbackModel(
    this: StoredFeedback & { save: () => Promise<StoredFeedback> },
    data: Omit<StoredFeedback, '_id' | 'createdAt' | 'status' | 'adminNote'>,
  ) {
    Object.assign(this, {
      _id: `feedback-${store.length + 1}`,
      status: 'pending',
      adminNote: '',
      createdAt: new Date(),
      ...data,
    });

    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }

  Object.assign(FeedbackModel, {
    find: jest.fn((filter = {}) => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn(async () =>
        store.filter((feedback) =>
          Object.entries(filter).every(
            ([key, value]) => feedback[key as keyof StoredFeedback] === value,
          ),
        ),
      ),
    })),
    findByIdAndUpdate: jest.fn(
      (id: string, update: { $set: Partial<StoredFeedback> }) => ({
        exec: jest.fn(async () => {
          const feedback = store.find((item) => item._id === id);
          if (!feedback) {
            return null;
          }

          Object.assign(feedback, update.$set);
          return feedback;
        }),
      }),
    ),
    findByIdAndDelete: jest.fn((id: string) => ({
      exec: jest.fn(async () => {
        const index = store.findIndex((feedback) => feedback._id === id);
        if (index === -1) {
          return null;
        }

        return store.splice(index, 1)[0];
      }),
    })),
  });

  return FeedbackModel;
}

describe('question-service integration', () => {
  let app: INestApplication<App>;

  const userToken = sign({ id: 'user-1', isAdmin: false }, JWT_SECRET);
  const adminToken = sign({ id: 'admin-1', isAdmin: true }, JWT_SECRET);

  const bootstrap = async (
    questionSeed: StoredQuestion[] = [makeQuestion()],
    feedbackSeed: StoredFeedback[] = [],
  ) => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [QuestionController, FeedbackController],
      providers: [
        QuestionService,
        FeedbackService,
        UserGuard,
        AdminGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'JWT_SECRET' ? JWT_SECRET : undefined,
          },
        },
        {
          provide: PrivilegeRevocationService,
          useValue: { isTokenRevoked: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: getModelToken(Question.name),
          useValue: createQuestionModel(questionSeed),
        },
        {
          provide: getModelToken(Feedback.name),
          useValue: createFeedbackModel(feedbackSeed),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  };

  afterEach(async () => {
    await app?.close();
  });

  it('requires authentication for question listing', async () => {
    await bootstrap();

    await request(app.getHttpServer()).get('/questions').expect(401);
  });

  it('allows authenticated users to list, filter, and retrieve questions', async () => {
    await bootstrap([
      makeQuestion(),
      makeQuestion({
        questionId: 'merge-intervals',
        title: 'Merge Intervals',
        topic: ['Intervals'],
        difficulty: 'Medium',
      }),
    ]);

    const filtered = await request(app.getHttpServer())
      .get('/questions')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ topic: 'Arrays', difficulty: 'Easy' })
      .expect(200);

    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].questionId).toBe('two-sum');

    const single = await request(app.getHttpServer())
      .get('/questions/two-sum')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(single.body.title).toBe('Two Sum');
  });

  it('enforces admin-only question creation and rejects duplicate IDs', async () => {
    await bootstrap();

    await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${userToken}`)
      .send(makeQuestion({ questionId: 'new-question' }))
      .expect(403);

    await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(makeQuestion({ questionId: 'new-question' }))
      .expect(201);

    await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(makeQuestion({ questionId: 'new-question' }))
      .expect(409);
  });

  it('selects fresh matching questions before attempted-question fallback', async () => {
    await bootstrap([
      makeQuestion({ questionId: 'attempted-arrays' }),
      makeQuestion({ questionId: 'fresh-arrays', title: 'Fresh Arrays' }),
    ]);

    const fresh = await request(app.getHttpServer())
      .post('/questions/select')
      .send({
        topic: 'Arrays',
        difficulty: 'Easy',
        attemptedQuestionIds: ['attempted-arrays'],
      })
      .expect(201);

    expect(fresh.body.questionId).toBe('fresh-arrays');

    const fallback = await request(app.getHttpServer())
      .post('/questions/select')
      .send({
        topic: 'Arrays',
        difficulty: 'Easy',
        attemptedQuestionIds: ['attempted-arrays', 'fresh-arrays'],
      })
      .expect(201);

    expect(['attempted-arrays', 'fresh-arrays']).toContain(
      fallback.body.questionId,
    );
  });

  it('keeps user feedback private while allowing admin filtering', async () => {
    await bootstrap(
      [],
      [
        {
          _id: 'feedback-admin-seed',
          questionId: 'two-sum',
          userId: 'someone-else',
          category: 'wrong_difficulty',
          comment: 'Too hard.',
          status: 'reviewed',
          adminNote: '',
          createdAt: new Date(),
        },
      ],
    );

    await request(app.getHttpServer())
      .post('/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        questionId: 'two-sum',
        category: 'unclear_wording',
        comment: 'The statement needs one more example.',
      })
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get('/feedback/my')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(mine.body).toHaveLength(1);
    expect(mine.body[0]).toMatchObject({
      userId: 'user-1',
      category: 'unclear_wording',
      status: 'pending',
    });

    await request(app.getHttpServer())
      .get('/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const reviewed = await request(app.getHttpServer())
      .get('/feedback')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'reviewed' })
      .expect(200);

    expect(reviewed.body).toHaveLength(1);
    expect(reviewed.body[0].userId).toBe('someone-else');
  });
});
