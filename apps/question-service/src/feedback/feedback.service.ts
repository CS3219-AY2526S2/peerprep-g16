import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    userId: string,
  ): Promise<Feedback> {
    const feedback = new this.feedbackModel({
      ...createFeedbackDto,
      userId,
    });
    return feedback.save();
  }

  async findAll(filters: {
    status?: string;
    category?: string;
    questionId?: string;
  }): Promise<Feedback[]> {
    const query: Record<string, any> = {};

    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.questionId) query.questionId = filters.questionId;

    return this.feedbackModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findByUser(userId: string): Promise<Feedback[]> {
    return this.feedbackModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async update(
    id: string,
    updateFeedbackDto: UpdateFeedbackDto,
  ): Promise<Feedback> {
    const updated = await this.feedbackModel
      .findByIdAndUpdate(
        id,
        { $set: updateFeedbackDto },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<Feedback> {
    const deleted = await this.feedbackModel.findByIdAndDelete(id).exec();

    if (!deleted) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }

    return deleted;
  }
}
