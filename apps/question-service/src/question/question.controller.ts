import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { QuestionService } from './question.service';

/**
 * Controller exposing HTTP endpoints for question management.
 * Maps incoming requests to the QuestionService.
 */
@Controller('questions')
@UseGuards(AdminGuard)
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
  @Post()
  async create(@Body() body: any) {
    return this.questionService.create(body);
  }
}
