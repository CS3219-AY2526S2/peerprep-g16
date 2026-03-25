import { HttpService } from "@nestjs/axios";
import { HttpException, Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

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

        let lastError: any;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                this.logger.log(
                    `Attempt ${attempt}/${this.maxAttempts}: sending question ${question.questionId} for matchRequestId=${matchRequestId}`,
                );

                const response = await firstValueFrom(
                    this.httpService.post(url, payload),
                );

                this.logger.log(
                    `Successfully sent question ${question.questionId} for matchRequestId=${matchRequestId}. Status=${response.status}`,
                );

                return;
            } catch (error: any) {
                lastError = error;

                this.logger.warn(
                `Attempt ${attempt}/${this.maxAttempts} failed for matchRequestId=${matchRequestId}: ${
                    error?.message || 'Unknown error'
                }`,
                );

                const status = error?.response?.status;

                if (status && status < 500 && status !== 429) {
                    break;
                }

                if (attempt < this.maxAttempts) {
                    await this.sleep(this.retryDelayMs);
                }
            }
        }

        this.logger.error(
            `All delivery attempts failed for matchRequestId=${matchRequestId}. The caller should retry later with the same assigned question.`,
        );

        throw new HttpException(
            'Failed to send question to Collaboration Service',
            lastError?.response?.status || 500,
        );
    }

    /**
     * Pauses execution briefly between retry attempts.
     *
     * @param ms number of milliseconds to wait
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
