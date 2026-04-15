import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { UserGuard } from '../auth/user.guard';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    isAdmin: boolean;
  };
};

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(UserGuard)
  @Post()
  async create(
    @Body() body: CreateFeedbackDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.feedbackService.create(body, req.user.id);
  }

  @UseGuards(UserGuard)
  @Get('my')
  async findMy(@Req() req: AuthenticatedRequest) {
    return this.feedbackService.findByUser(req.user.id);
  }

  @UseGuards(AdminGuard)
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('questionId') questionId?: string,
  ) {
    return this.feedbackService.findAll({ status, category, questionId });
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateFeedbackDto) {
    return this.feedbackService.update(id, body);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.feedbackService.delete(id);
  }
}
