const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Mirror Judge0 CE language IDs
const LANGUAGES = {
    71: { name: 'python',     cmd: ['python3'],              ext: 'py'  },
    63: { name: 'javascript', cmd: ['node'],                 ext: 'js'  },
    74: { name: 'typescript', cmd: ['npx', 'ts-node', '--skip-project'], ext: 'ts'  },
    62: { name: 'java',       cmd: null,                     ext: 'java' },
    54: { name: 'cpp',        cmd: null,                     ext: 'cpp'  },
};

const COMPILE = {
    62: (src) => ({ compiler: 'javac', args: [src] }),
    54: (src, out) => ({ compiler: 'g++', args: ['-o', out, src] }),
};

const TIMEOUT_MS = 10000;

// Judge0-compatible submission endpoint
app.post('/submissions', async (req, res) => {
    const { source_code, language_id, stdin = '' } = req.body;

    const lang = LANGUAGES[language_id];
    if (!lang) {
        return res.status(400).json({ error: `Unsupported language_id: ${language_id}` });
    }

    const id = crypto.randomUUID();
    const tmpDir = path.join(os.tmpdir(), `exec-${id}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    let srcFile = path.join(tmpDir, `solution.${lang.ext}`);
    // Java class name must match filename
    if (lang.name === 'java') {
        const match = source_code.match(/public\s+class\s+(\w+)/);
        const className = match ? match[1] : 'Solution';
        srcFile = path.join(tmpDir, `${className}.java`);
    }
    fs.writeFileSync(srcFile, source_code);

    try {
        // Compile step (Java / C++)
        if (COMPILE[language_id]) {
            const outFile = path.join(tmpDir, 'solution');
            const { compiler, args } = COMPILE[language_id](srcFile, outFile);
            const compileResult = await runProcess(compiler, args, '', tmpDir);
            if (compileResult.exitCode !== 0) {
                return res.json({
                    stdout: null,
                    stderr: null,
                    compile_output: compileResult.stderr || compileResult.stdout,
                    status: { id: 6, description: 'Compilation Error' },
                    time: null, memory: null, exit_code: compileResult.exitCode,
                });
            }
            // Run compiled binary
            const runCmd = lang.name === 'java'
                ? ['java', '-cp', tmpDir, path.basename(srcFile, '.java')]
                : [outFile];
            const runResult = await runProcess(runCmd[0], runCmd.slice(1), stdin, tmpDir);
            return res.json(toResponse(runResult));
        }

        // Interpreted languages
        const [cmd, ...args] = lang.cmd;
        const result = await runProcess(cmd, [...args, srcFile], stdin, tmpDir);
        return res.json(toResponse(result));

    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

function runProcess(cmd, args, stdin, cwd) {
    return new Promise((resolve) => {
        const child = spawn(cmd, args, {
            cwd,
            env: {
                PATH: process.env.PATH,
                HOME: process.env.HOME ?? '/tmp',
                TMPDIR: process.env.TMPDIR ?? '/tmp',
                NODE_PATH: '',
            },
        });
        let stdout = '', stderr = '';

        if (stdin) child.stdin.write(stdin);
        child.stdin.end();

        child.stdout.on('data', d => { stdout += d; });
        child.stderr.on('data', d => { stderr += d; });

        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            resolve({ stdout, stderr, exitCode: -1, timedOut: true });
        }, TIMEOUT_MS);

        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({ stdout, stderr: stderr || null, exitCode: code ?? 0, timedOut: false });
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({ stdout: '', stderr: err.message, exitCode: 1, timedOut: false });
        });
    });
}

function toResponse({ stdout, stderr, exitCode, timedOut }) {
    if (timedOut) {
        return { stdout: stdout || null, stderr, compile_output: null, status: { id: 5, description: 'Time Limit Exceeded' }, time: null, memory: null, exit_code: exitCode };
    }
    const statusId = exitCode === 0 ? 3 : 11;
    const description = exitCode === 0 ? 'Accepted' : 'Runtime Error (NZEC)';
    return {
        stdout: stdout || null,
        stderr: stderr || null,
        compile_output: null,
        status: { id: statusId, description },
        time: null,
        memory: null,
        exit_code: exitCode,
    };
}

const PORT = process.env.PORT || 2358;
app.listen(PORT, () => console.log(`Code executor listening on :${PORT}`));
