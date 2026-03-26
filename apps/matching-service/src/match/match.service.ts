import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

const QUEUE_KEY = 'matchmaking:queue';
const STAGE1_TIMEOUT = 60000;
const STAGE2_TIMEOUT = 120000;
const DIFFICULTY_RANK = {
    easy: 1,
    medium: 2,
    hard: 3,
};

@Injectable()
export class MatchService {
    private readonly logger = new Logger(MatchService.name);
    private readonly STREAM_NAME =
        process.env.MATCH_FOUND_STREAM || 'match.found';

    constructor(private readonly redisService: RedisService) { }

    private get client() {
        return this.redisService.getClient();
    }

    async joinQueue(userId: string, username: string, topic: string, difficulty: string) {

        //Check if already in queue
        const existingUser = await this.client.hgetall(`user:${userId}`);
        if (existingUser && existingUser.userId) {
            return { status: 'already_in_queue', message: 'You are already in the queue.' };
        }

        // Check if already matched
        const existingMatch = await this.client.hgetall(`match:${userId}`);
        if (existingMatch && existingMatch.status === 'matched') {
            return { status: 'already_matched', message: 'You already have a pending match.' };
        }

        //Ensure that all selections are filled
        const cleanTopic = topic || 'Random';
        const cleanDifficulty = difficulty || 'any';
        const timestamp = Date.now();

        //store the user details
        await this.client.hset(`user:${userId}`, [
            'userId', userId,
            'username', username,
            'topic', cleanTopic,
            'difficulty', cleanDifficulty,
            'originalDifficulty', cleanDifficulty,
            'joinedAt', timestamp.toString(),
        ]);

        //add the user into the queue
        await this.client.zadd(QUEUE_KEY, timestamp, userId);
        return { status: 'waiting', message: 'Waiting for a match...' };
    }

    async findMatch(userId: string, username: string, topic: string, difficulty: string) {
        const users = await this.client.zrange(QUEUE_KEY, 0, -1);
        const currentUserData = await this.client.hgetall(`user:${userId}`);
        const otherUsers = users.filter(id => id !== userId);

        //if empty queue, can just return
        if (otherUsers.length === 0) {
            return { status: "waiting", message: "Waiting for a match..." };
        }

        //get all the other users and ensure that they are not the primary user
        const allUserData = await Promise.all(
            otherUsers.map(id => this.client.hgetall(`user:${id}`))
        ).then(results => results.filter(u => u && u.userId));

        const isRandom = topic === "Random" && difficulty === "any";
        let match: Record<string, string> | undefined;

        if (isRandom) {
            match = allUserData.find(u => u.topic === "Random" && u.difficulty === "any");
            if (!match) match = allUserData[0];
        } else {

            // Priority 1: same topic + same difficulty (always)
            match = allUserData.find(u =>
                u.topic === topic && u.difficulty === difficulty
            );
            // Priority 2: same topic + other user is "any" difficulty but will check to make sure that other user original difficulty is not lower than user difficulty
            if (!match) match = allUserData.find(u =>
                u.topic === topic && u.difficulty === "any" && canMatch(currentUserData.originalDifficulty, u.originalDifficulty, difficulty, u.difficulty)
            );

            // Priority 3: random topic + same difficulty
            if (!match) match = allUserData.find(u =>
                u.topic === "Random" && u.difficulty === difficulty
            );
            // Priority 4: fully random user
            if (!match) match = allUserData.find(u =>
                u.topic === "Random" && u.difficulty === "any"
            );

        }

        if (!match) {
            return { status: "waiting", message: "Waiting for a match..." };
        }

        await this.client.zrem(QUEUE_KEY, userId);
        await this.client.zrem(QUEUE_KEY, match.userId);

        await this.client.hset(`match:${userId}`, [
            "status", "matched",
            "matchedWith_userId", match.userId,
            "matchedWith_username", match.username,
            "topic", match.topic,
            "difficulty", match.difficulty,
        ]);

        await this.client.hset(`match:${match.userId}`, [
            "status", "matched",
            "matchedWith_userId", userId,
            "matchedWith_username", username,
            "topic", topic,
            "difficulty", difficulty,
        ]);

        await this.client.expire(`match:${userId}`, 60);
        await this.client.expire(`match:${match.userId}`, 60);

        const published = await this.publishMatchFound(
            userId,
            match.userId,
            topic,
            currentUserData.originalDifficulty,
            match.originalDifficulty
        );

        await this.client.hset(`match:${userId}`, ['roomId', published.matchId]);
        await this.client.hset(`match:${match.userId}`, ['roomId', published.matchId]);

        return {
            status: "matched",
            roomId: published.matchId,
            matchDetails: {
                topic: published.topic,
                difficulty_1: published.userADifficulty,
                difficulty_2: published.userBDifficulty,
            },

            matchedWith: {
                userId: match.userId,
                username: match.username
            }
        };
    }

    async getQueueStatus(userId: string) {
        const matchData = await this.client.hgetall(`match:${userId}`);

        if (matchData && matchData.status === 'matched') {
            await this.client.del(`match:${userId}`);

            return {
                status: 'matched',
                roomId: matchData.roomId,
                matchedWith: {
                    userId: matchData.matchedWith_userId,
                    username: matchData.matchedWith_username
                },
                matchDetails: {
                    topic: matchData.topic,
                    difficulty: matchData.difficulty,
                }
            };
        }

        const userData = await this.client.hgetall(`user:${userId}`);
        if (!userData.userId) return { status: 'not_in_queue' };

        const elapsed = Date.now() - parseInt(userData.joinedAt);

        if (elapsed >= STAGE2_TIMEOUT) {
            return { status: 'timeout', message: 'No match found. Please try again later.', elapsed };
        }

        if (elapsed >= STAGE1_TIMEOUT) {
            const match = await this.findMatch(userId, userData.username, userData.topic, 'any');
            if (match.status === 'matched') {
                await this.client.del(`match:${userId}`);
                await this.client.del(`user:${userId}`);
                return match;
            }
            await this.client.hset(`user:${userId}`, [
                'difficulty', 'any'
            ]);

            return {
                status: 'expand_search_difficulty',
                message: 'Still no match found. Expanding to any difficulty...',
                elapsed,
                preferences: { topic: userData.topic, difficulty: 'any' }
            };

        }

        const match = await this.findMatch(
            userId,
            userData.username!,
            userData.topic!,
            userData.difficulty!
        );

        if (match.status === 'matched') {
            await this.client.del(`match:${userId}`);
            await this.client.del(`user:${userId}`);
            return match;
        }

        return {
            status: 'waiting',
            message: 'Searching for a match...',
            elapsed,
            preferences: { topic: userData.topic, difficulty: userData.difficulty }
        };
    }

    async leaveQueue(userId: string) {
        await this.client.zrem(QUEUE_KEY, userId);
        await this.client.del(`user:${userId}`);
    }

    /**
     * Publishes a match.found event to Redis Streams.
     *
     * Event payload matches what Collaboration Service expects:
     * {
     *   matchId: string,
     *   userAId: string,
     *   userBId: string,
     *   topic: string,
     *   userADifficulty: "Easy" | "Medium" | "Hard",
     *   userBDifficulty: "Easy" | "Medium" | "Hard"
     * }
     *
     * This will be called by:
     * 1. The test endpoint (for now)
     * 2. Your teammate's matching algorithm (later)
     */
    async publishMatchFound(
        userAId: string,
        userBId: string,
        topic: string,
        userADifficulty: string,
        userBDifficulty: string,
    ) {
        const matchId = uuidv4();

        const messageId = await this.redisService.publishToStream(
            this.STREAM_NAME,
            {
                matchId,
                userAId,
                userBId,
                topic,
                userADifficulty,
                userBDifficulty,
                timestamp: new Date().toISOString(),
            },
        );

        this.logger.log(
            'Match found! ' +
            userAId +
            ' <-> ' +
            userBId +
            ' | Topic: ' +
            topic +
            ' | Difficulty: ' +
            userADifficulty +
            '/' +
            userBDifficulty,
        );

        return {
            matchId,
            userAId,
            userBId,
            topic,
            userADifficulty,
            userBDifficulty,
            streamMessageId: messageId,
        };
    }
}

function canMatch(originalSearchDiff: string, originalTargetDiff: string, searchDiff: string, targetDiff: string): boolean {
    if (originalSearchDiff == 'any' || originalTargetDiff == 'any') return true
    if (searchDiff == 'any' && targetDiff == 'any') return true

    const searchRank = DIFFICULTY_RANK[searchDiff];
    const targetRank = DIFFICULTY_RANK[targetDiff];
    const originalSearchRank = DIFFICULTY_RANK[originalSearchDiff];
    const originalTargetRank = DIFFICULTY_RANK[originalTargetDiff];

    if (searchDiff === 'any' && originalTargetRank <= originalSearchRank) return true;
    if (targetDiff === 'any' && originalSearchRank <= originalTargetRank) return true;

    return searchRank >= targetRank;
}
