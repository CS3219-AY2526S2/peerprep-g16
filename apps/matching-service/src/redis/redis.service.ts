import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: any;

    async onModuleInit() {
        this.client = createClient({
            socket: {
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: parseInt(process.env.REDIS_PORT || '6379')
            }
        });
        this.client.on('error', err => console.error('Redis error:', err));
        await this.client.connect();
        console.log('Redis Connected!');
    }

    async onModuleDestroy() {
        await this.client.disconnect();
    }

    getClient() {
        return this.client;
    }
}