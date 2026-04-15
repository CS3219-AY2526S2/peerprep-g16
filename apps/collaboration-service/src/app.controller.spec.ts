/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'CODE_EXECUTOR_URL' ? 'http://executor' : undefined,
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHello()', () => {
    it('returns "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('execute()', () => {
    it('throws BadRequestException for an unsupported language', async () => {
      await expect(
        appController.execute({ language: 'cobol', code: 'DISPLAY "hi"' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws InternalServerErrorException when CODE_EXECUTOR_URL is not set', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AppController],
        providers: [
          AppService,
          {
            provide: ConfigService,
            useValue: { get: () => undefined },
          },
        ],
      }).compile();
      const ctrl = module.get<AppController>(AppController);

      await expect(
        ctrl.execute({ language: 'python', code: 'print(1)' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('returns formatted result on a successful execution', async () => {
      const mockResponse = {
        stdout: 'hello\n',
        stderr: null,
        compile_output: null,
        status: { description: 'Accepted' },
        exit_code: 0,
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }) as any;

      const result = await appController.execute({
        language: 'python',
        code: 'print("hello")',
      });

      expect(result).toEqual({
        stdout: 'hello\n',
        stderr: '',
        compileOutput: '',
        status: 'Accepted',
        exitCode: 0,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://executor/submissions?wait=true',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('passes stdin to the executor when provided', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            stdout: '42\n',
            stderr: null,
            compile_output: null,
            status: { description: 'Accepted' },
            exit_code: 0,
          }),
      }) as any;

      await appController.execute({
        language: 'python',
        code: 'print(input())',
        stdin: '42',
      });

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body as string,
      );
      expect(body.stdin).toBe('42');
    });

    it('throws InternalServerErrorException when the executor returns a non-ok response', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 500 }) as any;

      await expect(
        appController.execute({
          language: 'javascript',
          code: 'console.log(1)',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('uses language_id 71 for python', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            stdout: '',
            stderr: null,
            compile_output: null,
            status: { description: 'Accepted' },
            exit_code: 0,
          }),
      }) as any;

      await appController.execute({ language: 'python', code: '' });
      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body as string,
      );
      expect(body.language_id).toBe(71);
    });

    it('uses language_id 63 for javascript', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            stdout: '',
            stderr: null,
            compile_output: null,
            status: { description: 'Accepted' },
            exit_code: 0,
          }),
      }) as any;

      await appController.execute({ language: 'javascript', code: '' });
      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body as string,
      );
      expect(body.language_id).toBe(63);
    });
  });
});
