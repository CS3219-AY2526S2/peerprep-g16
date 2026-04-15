import { Injectable, NotFoundException } from '@nestjs/common';
import { Question, QuestionDocument } from './schemas/question.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SelectQuestionDto } from './dto/select-question.dto';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

type QuestionFilter = {
  topic?: string;
  difficulty?: string;
  questionId?: { $nin: string[] };
};

type DuplicateKeyError = {
  code?: number;
};

type ValidationError = {
  name?: string;
  errors?: Record<string, { path: string }>;
};

/**
 * Service layer for question-related business logic.
 * Handles database interaction for creating and retrieving questions.
 */
@Injectable()
export class QuestionService {
  /**
   * Injects the Mongoose model for Question documents.
   *
   * @param questionModel Mongoose model used to query and persist questions
   */
  constructor(
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
  ) {}

  /**
   * Retrieves all questions matching the optional topic and difficulty filters.
   *
   * @param topic Optional topic filter
   * @param difficulty Optional difficulty filter
   * @returns Promise resolving to the list of matching questions
   */
  async findAll(topic?: string, difficulty?: string) {
    const filter: Record<string, string> = {};

    if (topic && !this.isRandomTopic(topic)) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;

    return this.questionModel.find(filter).exec();
  }

  /**
   * Retrieves a single question by its stable questionId.
   *
   * This is used by attempt review pages to reconstruct the original problem
   * statement for a saved attempt. The questionId is the human-readable stable
   * identifier, such as "binary-search", not the MongoDB document _id.
   *
   * @param questionId Stable question identifier stored on the attempt record
   * @returns Promise resolving to the matching question document
   * @throws NotFoundException if no question exists with the given questionId
   */
  async findByQuestionId(questionId: string) {
    const question = await this.questionModel.findOne({ questionId }).exec();

    if (!question) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    return question;
  }

  /**
   * Creates and persists a new question in the database.
   *
   * @param createQuestionDto Request payload containing question data
   * @returns Promise resolving to the newly created question
   */
  async create(createQuestionDto: CreateQuestionDto) {
    try {
      const createdQuestion = new this.questionModel(createQuestionDto);
      return await createdQuestion.save();
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null) {
        const duplicateKeyError = error as DuplicateKeyError;
        if (duplicateKeyError.code === 11000) {
          throw new ConflictException(
            `Question ${createQuestionDto.questionId} already exists`,
          );
        }
        const validationError = error as ValidationError;
        if (
          validationError.name === 'ValidationError' &&
          validationError.errors
        ) {
          const fields = Object.values(validationError.errors).map(
            (e) => e.path,
          );
          throw new BadRequestException(
            `Missing required fields: ${fields.join(', ')}`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Deletes an existing question using its stable questionId.
   *
   * This is intended for admin-only question management. If no matching
   * question exists, a NotFoundException should be thrown.
   *
   * @param questionId Unique question identifier
   * @returns Promise resolving to the deleted question document
   */
  async deleteByQuestionId(questionId: string) {
    const deleted = await this.questionModel
      .findOneAndDelete({ questionId })
      .exec();

    if (!deleted) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    return deleted;
  }

  /**
   * Updates an existing question using its stable questionId.
   *
   * The incoming payload allows partial updates, but any provided `questionId`
   * is ignored so callers cannot change the question's stable identifier.
   *
   * @param questionId Unique question identifier
   * @param updateQuestionDto Partial payload containing fields to update
   * @returns Promise resolving to the updated question document
   */
  async updateByQuestionId(
    questionId: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const updateData: UpdateQuestionDto = { ...updateQuestionDto };
    delete updateData.questionId;

    const updated = await this.questionModel
      .findOneAndUpdate(
        { questionId },
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    return updated;
  }

  /**
   * Retrieves all unique topics from the question bank.
   *
   * Since `topic` is stored as a string array on each question,
   * MongoDB distinct will return the unique topic values across
   * all documents.
   *
   * @returns Promise resolving to a sorted list of unique topics
   */
  async findTopics(): Promise<string[]> {
    const topics = await this.questionModel.distinct('topic').exec();

    return topics.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Selects a question based on topic and difficulty, with optional exclusion logic.
   *
   * Selection process:
   * 1. Attempt to retrieve questions matching the given topic(s) and difficulty,
   *    excluding any question IDs provided in excludeQuestionIds.
   * 2. If no unattempted questions are found, retry the query without exclusion
   *    to allow reuse of previously attempted questions.
   * 3. If no questions exist at all for the given criteria, throw a NotFoundException.
   *
   * This ensures that users are prioritised with unseen questions while still
   * guaranteeing that a question can be returned whenever possible.
   *
   * @param selectQuestionDto - Object containing:
   *   - topics: array of topics to filter by
   *   - difficulty: difficulty level (Easy | Medium | Hard)
   *   - excludeQuestionIds (optional): list of questionIds to exclude
   *
   * @returns A randomly selected Question document
   *
   * @throws NotFoundException if no questions exist for the given criteria
   */
  async selectQuestion(
    selectQuestionDto: SelectQuestionDto,
  ): Promise<Question> {
    const { topic, difficulty, attemptedQuestionIds = [] } = selectQuestionDto;

    const uniqueExcludeIds = Array.from(new Set(attemptedQuestionIds));

    // Step 1: try to find unattempted questions first
    const primaryFilter = this.buildTopicFilter(topic);
    if (difficulty) primaryFilter.difficulty = difficulty;
    if (uniqueExcludeIds.length > 0) {
      primaryFilter.questionId = { $nin: uniqueExcludeIds };
    }

    const freshQuestions = await this.questionModel.find(primaryFilter).exec();

    if (freshQuestions.length > 0) {
      return this.pickRandomQuestion(freshQuestions);
    }

    // Step 2: fallback — allow previously attempted questions
    const fallbackFilter = this.buildTopicFilter(topic);
    if (difficulty) fallbackFilter.difficulty = difficulty;

    const fallbackQuestions = await this.questionModel
      .find(fallbackFilter)
      .exec();

    if (fallbackQuestions.length > 0) {
      return this.pickRandomQuestion(fallbackQuestions);
    }

    // Step 3: fallback 2 — allow other difficulty levels
    const fallbackFilter2 = this.buildTopicFilter(topic);

    const fallbackQuestions2 = await this.questionModel
      .find(fallbackFilter2)
      .exec();

    if (fallbackQuestions2.length > 0) {
      return this.pickRandomQuestion(fallbackQuestions2);
    }

    // Step 4: true no-question case
    throw new NotFoundException(
      `No question found for ${this.isRandomTopic(topic) ? 'any topic' : topic}`,
    );
  }

  /**
   * Matching Service uses "Random" as a placeholder for any topic. It should
   * never be treated as a stored question topic.
   */
  private isRandomTopic(topic: string): boolean {
    return !!topic && topic.trim().toLowerCase() === 'random';
  }

  private buildTopicFilter(topic: string): QuestionFilter {
    return this.isRandomTopic(topic) ? {} : { topic };
  }

  /**
   * Returns one random question from a non-empty result set.
   *
   * This helper centralises random selection so all fallback branches use the
   * same selection behavior.
   *
   * @param questions Candidate questions to choose from
   * @returns One randomly selected question
   */
  private pickRandomQuestion(questions: Question[]): Question {
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  async findModelAnswer(questionId: string) {
    const result = await this.questionModel
      .findOne({ questionId })
      .select(
        'modelAnswer modelAnswerTimeComplexity modelAnswerExplanation -_id',
      )
      .lean()
      .exec();

    if (!result)
      throw new NotFoundException(`Question ${questionId} not found`);
    return result;
  }

  async findQuestionDescription(questionId: string) {
    const result = await this.questionModel
      .findOne({ questionId })
      .select('description -_id')
      .lean()
      .exec();

    if (!result)
      throw new NotFoundException(`Question ${questionId} not found`);
    return result;
  }
}
