import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { isAxiosError, type AxiosError } from 'axios';

/**
 * CollaborationClient sends selected questions
 * from Question Service to Collaboration Service.
 */
@Injectable()
export class CollaborationClient {
  private readonly logger = new Logger(CollaborationClient.name);
  private readonly baseUrl = process.env.COLLAB_SERVICE_URL?.trim();
  private readonly maxAttempts = 3;
  private readonly retryDelayMs = 1000;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Sends the selected question to Collaboration Service.
   *
   * Endpoint: POST /sessions/:id/question
   *
   * @param matchRequestId unique identifier of the match/session
   * @param question selected question object
   */
  async sendQuestionToCollab(
    matchRequestId: string,
    question: {
      questionId: string;
      title: string;
      topic: string[];
      difficulty: string;
      description: string;
      constraints: string[];
      examples: any[];
      hints: string[];
      testCases: {
        sample: any[];
        hidden: any[];
      };
    },
  ): Promise<void> {
    if (!this.baseUrl) {
      throw new HttpException('COLLAB_SERVICE_URL is not configured', 500);
    }

    const url = `${this.baseUrl}/sessions/${matchRequestId}/question`;
    const payload = {
      questionId: question.questionId,
      title: question.title,
      topic: question.topic,
      difficulty: question.difficulty,
      description: question.description,
      constraints: question.constraints,
      examples: question.examples,
      hints: question.hints,
      testCases: question.testCases,
    };

    type CollaborationErrorResponse = {
      message?: string;
    };

    let lastError: AxiosError<CollaborationErrorResponse> | Error | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(url, payload),
        );

        this.logger.log(
          `Successfully sent question ${question.questionId} for matchRequestId=${matchRequestId}. Status=${response.status}`,
        );

        return;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        this.logger.warn(
          `Attempt ${attempt}/${this.maxAttempts} failed for matchRequestId=${matchRequestId}: ${message}`,
        );

        if (isAxiosError<CollaborationErrorResponse>(error)) {
          lastError = error;
          const status = error.response?.status;

          if (status !== undefined && status < 500 && status !== 429) {
            break;
          }
        } else {
          lastError =
            error instanceof Error ? error : new Error('Unknown error');
        }

        if (attempt < this.maxAttempts) {
          await this.sleep(this.retryDelayMs);
        }
      }
    }

    this.logger.error(
      `All delivery attempts failed for matchRequestId=${matchRequestId}. The caller should retry later with the same assigned question.`,
    );

    const status =
      isAxiosError(lastError) && lastError.response?.status !== undefined
        ? lastError.response.status
        : 500;

    throw new HttpException(
      'Failed to send question to Collaboration Service',
      status,
    );
  }

  /**
   * Pauses execution briefly between retry attempts.
   *
   * @param ms number of milliseconds to wait
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), ms);
    });
  }
}
