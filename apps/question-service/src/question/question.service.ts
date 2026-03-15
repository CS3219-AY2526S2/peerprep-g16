import { Injectable } from '@nestjs/common';
import { Question, QuestionDocument } from './schemas/question.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

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

    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;

    return this.questionModel.find(filter).exec();
  }

  /**
   * Creates and persists a new question in the database.
   *
   * @param createQuestionDto Request payload containing question data
   * @returns Promise resolving to the newly created question
   */
  async create(createQuestionDto: any) {
    const createdQuestion = new this.questionModel(createQuestionDto);
    return createdQuestion.save();
  }
}
