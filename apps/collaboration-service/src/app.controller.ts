import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

interface CodeExecutionResponse {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { description: string } | null;
  exit_code: number | null;
}

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

  @Post('execute')
  async execute(
    @Body() body: { language: string; code: string; stdin?: string },
  ) {
    const { language, code, stdin = '' } = body;

    const languageId = LANGUAGE_IDS[language];
    if (!languageId)
      throw new BadRequestException(`Unsupported language: ${language}`);

    const executorUrl = this.configService.get<string>('CODE_EXECUTOR_URL');
    if (!executorUrl)
      throw new InternalServerErrorException(
        'CODE_EXECUTOR_URL is not configured',
      );

    const response = await fetch(`${executorUrl}/submissions?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin,
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Code executor returned ${response.status}`,
      );
    }

    const data = (await response.json()) as CodeExecutionResponse;

    return {
      stdout: data.stdout ?? '',
      stderr: data.stderr ?? '',
      compileOutput: data.compile_output ?? '',
      status: data.status?.description ?? 'Unknown',
      exitCode: data.exit_code ?? null,
    };
  }
}
