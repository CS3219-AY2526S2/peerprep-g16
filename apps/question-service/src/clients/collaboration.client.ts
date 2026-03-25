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
    private readonly baseUrl = process.env.COLLAB_SERVICE_URL;
    private readonly maxAttempts = 3;
    private readonly retryDelayMs = 1000;

    constructor(private readonly httpService: HttpService) {}

    /**
     * Sends the selected question to Collaboration Service.
     *
     * Endpoint: POST /collab-question
     *
     * @param matchId unique identifier of the match/session
     * @param question selected question object
     */
    async sendQuestionToCollab(
        matchId: string,
        question: any, 
    ): Promise<void> {
        const url = `${this.baseUrl}/collab-question`;
        const payload = { matchId, question};

        let lastError: any;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                this.logger.log(
                    `Attempt ${attempt}/${this.maxAttempts}: sending question ${question.questionId} for matchId=${matchId}`,
                );

                const response = await firstValueFrom(
                    this.httpService.post(url, payload),
                );

                this.logger.log(
                    `Successfully sent question ${question.questionId} for matchId=${matchId}. Status=${response.status}`,
                );

                return;
            } catch (error: any) {
                lastError = error;

                this.logger.warn(
                `Attempt ${attempt}/${this.maxAttempts} failed for matchId=${matchId}: ${
                    error?.message || 'Unknown error'
                }`,
                );

                if (attempt < this.maxAttempts) {
                    await this.sleep(this.retryDelayMs);
                }
            }
        }

        this.logger.error(
            `All delivery attempts failed for matchId=${matchId}. The caller should retry later with the same assigned question.`,
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
