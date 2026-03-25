import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { diff } from 'node:util';

const QUEUE_KEY = 'matchmaking:queue';
const STAGE1_TIMEOUT = 60000;
const STAGE2_TIMEOUT = 120000;
const DIFFICULTY_RANK = {
    easy: 1,
    medium: 2,
    hard: 3,
};

@Injectable()
export class MatchingService {
    constructor(private readonly redisService: RedisService) { }

    private get client() {
        return this.redisService.getClient();
    }

    async joinQueue(userId: string, username: string, topic: string, difficulty: string) {
        const cleanTopic = topic || 'Random';
        const cleanDifficulty = difficulty || 'any';
        const timestamp = Date.now();

        await this.client.hSet(`user:${userId}`, [
            'userId', userId,
            'username', username,
            'topic', cleanTopic,
            'difficulty', cleanDifficulty,
            'originalDifficulty', cleanDifficulty,
            'joinedAt', timestamp.toString(),
        ]);

        await this.client.zAdd(QUEUE_KEY, { score: timestamp, value: userId });
        return await this.findMatch(userId, username, cleanTopic, cleanDifficulty);
    }

    async findMatch(userId: string, username: string, topic: string, difficulty: string) {
        const users = await this.client.zRange(QUEUE_KEY, 0, -1);
        const currentUserData = await this.client.hGetAll(`user:${userId}`);
        const otherUsers = users.filter(id => id !== userId);

        if (otherUsers.length === 0) {
            return { status: "waiting", message: "Waiting for a match..." };
        }

        const allUserData = await Promise.all(
            otherUsers.map(id => this.client.hGetAll(`user:${id}`))
        ).then(results => results.filter(u => u && u.userId));

        const isRandom = topic === "Random" && difficulty === "any";
        let match = null;

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

        await this.client.zRem(QUEUE_KEY, userId);
        await this.client.zRem(QUEUE_KEY, match.userId);

        await this.client.hSet(`match:${userId}`, [
            "status", "matched",
            "matchedWith_userId", match.userId,
            "matchedWith_username", match.username,
            "topic", match.topic,
            "difficulty", match.difficulty,
        ]);

        await this.client.hSet(`match:${match.userId}`, [
            "status", "matched",
            "matchedWith_userId", userId,
            "matchedWith_username", username,
            "topic", topic,
            "difficulty", difficulty,
        ]);

        await this.client.expire(`match:${userId}`, 300);
        await this.client.expire(`match:${match.userId}`, 300);

        await this.leaveQueue(userId);
        await this.leaveQueue(match.userId);
        
        const published = await this.publishMatchFound(
            userId,
            match.userId,
            topic,
            currentUserData.originalDifficulty,
            match.originalDifficulty
        );
        
        return {
            status: "matched",
            roomId: published.matchId,
            matchDetails: {
                topic: published.topic,
                difficulty: published.difficulty
            },
            
            matchedWith: {
                userId: match.userId,
                username: match.username
            }
        };
    }

    async getQueueStatus(userId: string) {
        const matchData = await this.client.hGetAll(`match:${userId}`);

        if (matchData && matchData.status === 'matched') {
            await this.client.del(`match:${userId}`);
            return {
                status: 'matched',
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

        const userData = await this.client.hGetAll(`user:${userId}`);
        if (!userData.userId) return { status: 'not_in_queue' };

        const elapsed = Date.now() - parseInt(userData.joinedAt);

        if (elapsed >= STAGE2_TIMEOUT) {
            return { status: 'timeout', message: 'No match found. Please try again later.', elapsed };
        }

        if (elapsed >= STAGE1_TIMEOUT) {
            await this.client.hSet(`user:${userId}`, [
                'difficulty', 'any'
            ]);

            const match = await this.findMatch(userId, userData.username, userData.topic, 'any');
            if (match.status === 'matched') return match;

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
        await this.client.zRem(QUEUE_KEY, userId);
        await this.client.del(`user:${userId}`);
    }
}
function canMatch(originalSearchDiff : string, originalTargetDiff: string, searchDiff: string, targetDiff: string): boolean {
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
