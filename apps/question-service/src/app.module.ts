import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { QuestionModule } from './question/question.module';
import { AuthModule } from './auth/auth.module';
import { FeedbackModule } from './feedback/feedback.module';

/**
 * Root application module.
 * Configures environment variables, MongoDB connection,
 * and feature modules for the service.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || ''),
    AuthModule,
    QuestionModule,
    FeedbackModule,
  ],
})
export class AppModule {}
