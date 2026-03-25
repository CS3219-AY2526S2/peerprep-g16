import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { QuestionAssignmentService } from '../question/question-assignment.service';

/**
 * Payload published by Matching Service after a successful match.
 * This is the event shape that Question Service expects to consume.
 */
export interface MatchCreatedEvent {
    matchRequestId: string;
    userAId: string;
    userBId: string;
    topic: string;
    difficulty: string;
}

/**
 * RedisStreamsListeners continuously consumes match-create events
 * from a Redis Stream using a consumer group.
 */
@Injectable()
export class RedisStreamsListeners implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisStreamsListeners.name);

    /**
     *  Name of the Redis Stream that Matching Service writes to.
     */
    private readonly streamKey = process.env.MATCHING_SERVICE_REDIS_STREAM;

    private readonly groupName = 'question-service-group';
    private readonly consumerName = `question-service-${process.pid}`;
    private isRunning = true;
    private readonly redis: Redis;

    constructor(
        private readonly questionAssignmentService: QuestionAssignmentService,
    ) {
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT) || 6379,
        });
    }

    /**
     * Bootstraps the listener when the NestJS module starts.
     * Ensures the consumer group exists, then starts polling for messages.
     */
    async onModuleInit(): Promise<void> {
        const streamKey = this.streamKey;

        if (!this.streamKey) {
            throw new Error('MATCHING_SERVICE_REDIS_STREAM not configured');
        }

        await this.ensureConsumerGroup();
        void this.consumeMessages();
    }

    async onModuleDestroy(): Promise<void> {
        this.isRunning = false;
        await this.redis.quit();
    }

    /**
     * Ensures the Redis Stream consumer group exists before consumption starts.
     *
     * MKSTREAM creates the stream if it does not already exist.
     * If the group already exists, Redis throws BUSYGROUP, which we safely ignore.
     */
    private async ensureConsumerGroup(): Promise<void> {
        try {
            await this.redis.call(
                'XGROUP',
                'CREATE',
                this.streamKey,
                this.groupName,
                '0',
                'MKSTREAM',
            );
            this.logger.log(
                `Created consumer group "${this.groupName}" on stream "${this.streamKey}"`,
            );
        } catch(error: any) {
            if (error?.message?.includes('BUSYGROUP')) {
                this.logger.log(
                    `Consumer group "${this.groupName}" already exists on stream "${this.streamKey}"`,
                );  
                return;
            }
            throw error
        }
    }

    /**
     * Main polling loop.
     *
     * Reads new messages from the stream using XREADGROUP with BLOCK.
     * Each message is processed individually. On success, the message is acknowledged.
     * On failure, the message is left pending for later retry/inspection.
     */
    private async consumeMessages(): Promise<void> {
        this.logger.log(
            `Listening to Redis Stream "${this.streamKey}" as consumer "${this.consumerName}"`,
        );

        while (this.isRunning) {
            try {
                const response = await this.redis.call(
                    'XREADGROUP',
                    'GROUP',
                    this.groupName,
                    this.consumerName,
                    'COUNT',
                    10,
                    'BLOCK',
                    5000,
                    'STREAMS',
                    this.streamKey,
                    '>',
                ) as [string, [string, string[]][]][] | null;

                if (!response) {
                    continue;
                }

                for (const [stream, messages] of response) {
                    for (const [ messageId, fields] of messages) {
                        await this.handleMessage(stream, messageId, fields);
                    }
                }
            } catch (error) {
                this.logger.error('Error while consuming Redis Stream', error);
            }
        }
    }

    /**
     * Processes one Redis Stream message.
     *
     * Steps:
     * 1. Convert Redis field array into a normal object
     * 2. Validate required fields
     * 3. Trigger question generation flow
     * 4. Acknowledge the message only if processing succeeds
     *
     * If processing fails, the message is intentionally not acknowledged,
     * so it remains pending for future retry handling.
     */
    private async handleMessage(
        stream: string, 
        messageId: string, 
        fields: string[],
    ): Promise<void> {
        try {
            const payload = this.parseFields(fields);
            const event = this.validateMatchCreatedEvent(payload);

            this.logger.log(
             `Received match.created event ${messageId} for matchRequestId=${event.matchRequestId}`,
            );

            await this.questionAssignmentService.chooseQuestion({
                matchRequestId: event.matchRequestId,
                userAId: event.userAId,
                userBId: event.userBId,
                topic: event.topic,
                difficulty: event.difficulty,
            });

            await this.redis.xack(stream, this.groupName, messageId);

            this.logger.log(
                `Successfully processed and acknowledged message ${messageId}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to process message ${messageId}. Leaving it pending.`,
                error,
            );
        }
    }

    /**
     * Converts the Redis Stream field array into a key-value object.
     *
     * Redis returns fields in this format:
     * ['matchRequestId', '123', 'topic', 'Arrays', ...]
     *
     * This helper transforms it into:
     * { matchRequestId: '123', topic: 'Arrays', ... }
     */
    private parseFields(fields: string[]): Record<string, string> {
        const obj: Record<string, string> = {};

        for (let i =0; i < fields.length; i+=2) {
            obj[fields[i]] = fields[i+1];
        }

        return obj;
    }

    /**
     * Validates that the incoming payload contains all fields needed
     * for question generation.
     *
     * Throws an error if any required field is missing.
     */
    private validateMatchCreatedEvent(
        payload: Record<string, string>,
    ) : MatchCreatedEvent {
        const requiredFields = [
            'matchRequestId',
            'userAId',
            'userBId',
            'topic',
            'difficulty',
        ];

        for (const field of requiredFields) {
            if (!payload[field]) {
                throw new Error(`Missing required field "${field}" in stream message`);
            }
        }

        return {
            matchRequestId: payload.matchRequestId,
            userAId: payload.userAId,
            userBId: payload.userBId,
            topic: payload.topic,
            difficulty: payload.difficulty,
        };
    }
}
