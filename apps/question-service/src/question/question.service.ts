import { Injectable, NotFoundException } from '@nestjs/common';
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
    const deleted = await this.questionModel.findOneAndDelete({ questionId }).exec();

    if (!deleted) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    return deleted;
  }

  /**
   * Updates an existing question using its stable questionId.
   *
   * This performs an in-place update rather than deleting and recreating
   * the record, which helps preserve question identity across services.
   * The questionId itself should generally remain unchanged.
   *
   * @param questionId Unique question identifier
   * @param updateQuestionDto Partial payload containing fields to update
   * @returns Promise resolving to the updated question document
   */
  async updateByQuestionId(questionId: string, updateQuestionDto: any) {
    delete updateQuestionDto.questionId;

    const updated = await this.questionModel
      .findOneAndUpdate(
        { questionId },
        { $set: updateQuestionDto },
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

}
