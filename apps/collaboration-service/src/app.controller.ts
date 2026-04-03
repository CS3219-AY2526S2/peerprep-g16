import { Controller, Get, Post, Body, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

// Judge0 CE language IDs
const LANGUAGE_IDS: Record<string, number> = {
    python: 71,
    javascript: 63,
    typescript: 74,
    java: 62,
    cpp: 54,
};

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly configService: ConfigService,
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    /**
     * Proxies code execution to Judge0 CE (RapidAPI).
     * Keeps the API key server-side.
     *
     * POST /execute
     * Body: { language: string, code: string, stdin?: string }
     * Returns: { stdout, stderr, compileOutput, status }
     */
    @Post('execute')
    async execute(@Body() body: { language: string; code: string; stdin?: string }) {
        const { language, code, stdin = '' } = body;

        const languageId = LANGUAGE_IDS[language];
        if (!languageId) throw new BadRequestException(`Unsupported language: ${language}`);

        const judge0Url = this.configService.get<string>('JUDGE0_URL');
        if (!judge0Url) throw new InternalServerErrorException('JUDGE0_URL is not configured');

        const response = await fetch(
            `${judge0Url}/submissions?base64_encoded=false&wait=true`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source_code: code,
                    language_id: languageId,
                    stdin,
                }),
            },
        );

        if (!response.ok) {
            throw new InternalServerErrorException(`Judge0 returned ${response.status}`);
        }

        const data = await response.json();

        return {
            stdout: data.stdout ?? '',
            stderr: data.stderr ?? '',
            compileOutput: data.compile_output ?? '',
            status: data.status?.description ?? 'Unknown',
            exitCode: data.exit_code ?? null,
        };
    }
}
