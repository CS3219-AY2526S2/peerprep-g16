import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Question, QuestionDocument } from "./schemas/question.schema";
import { Model } from "mongoose";

export interface ChooseQuestionInput {
    matchRequestId: string;
    userAId: string;
    userBId: string;
    topic: string;
    difficulty: string;
}

/**
 * QuestionAssignmentService orchestrates the process of selecting
 * a question for a newly created match.
 *
 * For now, this version only logs the event and acts as the entry point
 * for future logic such as:
 * - retrieving eligible questions by topic and difficulty
 * - random selection
 * - idempotency checks by matchRequestId
 * - sending the chosen question to Collaboration Service
 */
@Injectable()
export class QuestionAssignmentService {
    private readonly logger = new Logger(QuestionAssignmentService.name);

    constructor(
    @InjectModel(Question.name)
        private readonly questionModel: Model<QuestionDocument>,
    ) {}

    /**
     * Main entry point triggered after a successful match event is consumed.
     *
     * Steps:
     * 1. Retrieve a random eligible question based on topic and difficulty
     * 2. Return or hand off the selected question for downstream processing
     *
     * @param input details of the successful match
     * @returns the randomly selected question
     * @throws NotFoundException if no matching question exists
     */
    async chooseQuestion(input: ChooseQuestionInput): Promise<Question> {
        this.logger.log(
            `Choosing question for matchRequestId=${input.matchRequestId}, topic=${input.topic}, difficulty=${input.difficulty}`,
        );

        const selectedQuestion = await this.getRandomQuestionByTopicAndDifficulty(
            input.topic,
            input.difficulty,
        );

        this.logger.log(
            `Selected questionId=${selectedQuestion.questionId} for matchRequestId=${input.matchRequestId}`,
        );

        return selectedQuestion;
    }

    /**
     * Retrieves one random question matching the given topic and difficulty.
     *
     * This method uses MongoDB aggregation with `$sample`
     * to retrieve one random eligible question.
     * 
     * Fallback stragegy:
     * 1. Try strict match: topic + difficulty
     * 2. If none found, relax to topic only
     *
     * @param topic selected topic from the match event
     * @param difficulty resolved difficulty from the match event
     * @returns one randomly selected eligible question
     * @throws NotFoundException if no question exists in this topic
     */
    private async getRandomQuestionByTopicAndDifficulty(
        topic: string, 
        difficulty: string,
    ): Promise<QuestionDocument> {
        // Step 1: Strict match (topic + difficulty)
        const strictResults = await this.questionModel.aggregate([
            {$match: {topic, difficulty}},
            {$sample: { size: 1 }},
        ]);

        if (strictResults.length > 0) {
            this.logger.log(
            `Found question with topic=${topic} and difficulty=${difficulty}`,
            );
            return strictResults[0];
        }

        this.logger.warn(
            `No question found for topic=${topic} and difficulty=${difficulty}. Falling back to topic-only.`,
        );

        // Step 2: Relaxed match (topic only)
        const relaxedResults = await this.questionModel.aggregate([
            {$match: {topic}}, {$sample: { size: 1 }}
        ]);

        if (relaxedResults.length > 0) {
            this.logger.log(`Fallback success: selected question with topic=${topic} (any difficulty)`);
            return relaxedResults[0];
        }

        // Step 3: True failure
        this.logger.error(
            `No question exists at all for topic=${topic}`,
        );

        throw new NotFoundException(
            `No question found for topic "${topic}"`,
        );
    }
}