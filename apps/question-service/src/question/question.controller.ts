import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { UserGuard } from '../auth/user.guard';
import { QuestionService } from './question.service';

/**
 * Controller exposing HTTP endpoints for question management.
 * Maps incoming requests to the QuestionService.
 */
@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  /**
   * Retrieves all questions, optionally filtered by topic and difficulty.
   *
   * Example:
   * GET /questions?topic=Arrays&difficulty=Easy
   *
   * @param topic Optional topic query parameter
   * @param difficulty Optional difficulty query parameter
   * @returns List of matching questions
   */
  @UseGuards(UserGuard)
  @Get()
  async findAll(
    @Query('topic') topic?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return this.questionService.findAll(topic, difficulty);
  }

  /**
   * Creates a new question in the question bank.
   *
   * @param body Request body containing the question data
   * @returns The newly created question
   */
  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() body: any) {
    return this.questionService.create(body);
  }

  /**
   * Deletes a question from the question bank by its questionId.
   *
   * This endpoint is intended for admin-only use.
   *
   * @param questionId Unique question identifier from the route parameter
   * @returns The deleted question
   */
  @UseGuards(AdminGuard)
  @Delete(':questionId')
  async delete(@Param('questionId') questionId: string) {
    return this.questionService.deleteByQuestionId(questionId);
  }

  /**
   * Updates an existing question in the question bank by its questionId.
   *
   * This endpoint is intended for admin-only use and allows partial or full
   * modification of a question's stored data without recreating the record.
   *
   * @param questionId Unique question identifier from the route parameter
   * @param body Request body containing the fields to update
   * @returns The updated question
   */
  @UseGuards(AdminGuard)
  @Patch(':questionId')
  async update(
    @Param('questionId') questionId: string,
    @Body() body: any,
  ) {
    return this.questionService.updateByQuestionId(questionId, body);
  }

  /**
   * Retrieves the list of unique topics available in the question bank.
   *
   * Example:
   * GET /questions/topics
   *
   * @returns Object containing sorted unique topic names
   */
  @UseGuards(UserGuard)
  @Get('topics')
  async findTopics() {
    const topics = await this.questionService.findTopics();
    return { topics };
  }
}
