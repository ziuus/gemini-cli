import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Command } from '@tauri-apps/plugin-shell';
import 'xterm/css/xterm.css';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked with TerminalRenderer
marked.setOptions({
    // @ts-ignore - marked-terminal types might be slightly off or incompatible with latest marked types
    renderer: new TerminalRenderer({
        width: 80, // Default width, will be updated dynamically if possible or just kept safe
        reflowText: true,
        showSectionPrefix: false,
        unescape: true,
        emoji: true,
    }),
});

export default function Terminal() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const commandRef = useRef<string>('');
    const hasGeminiSession = useRef<boolean>(false);
    const isAiMode = useRef<boolean>(false);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef<number>(-1);

    const writeSeparator = (term: XTerm) => {
        // Separator line
        term.write('\r\n\x1b[90m' + '─'.repeat(term.cols) + '\x1b[0m\r\n');
    };

    const writePrompt = (term: XTerm) => {
        // Distinct prompts
        if (isAiMode.current) {
            term.write('\x1b[35m✨ AI\x1b[0m \x1b[1;32m➜\x1b[0m '); // Purple AI, Green Arrow
        } else {
            term.write('\x1b[1;32m➜\x1b[0m \x1b[34m~\x1b[0m '); // Green Arrow, Blue Tilde
        }
    };

    useEffect(() => {
        if (!terminalRef.current) return;

        // Load history from localStorage
        const savedHistory = localStorage.getItem('cmd_history');
        if (savedHistory) {
            try {
                historyRef.current = JSON.parse(savedHistory);
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }

        const term = new XTerm({
            cursorBlink: true,
            theme: {
                background: '#1a1b26',
                foreground: '#c0caf5',
                cursor: '#c0caf5',
                selectionBackground: '#33467c',
                black: '#15161e',
                red: '#f7768e',
                green: '#9ece6a',
                yellow: '#e0af68',
                blue: '#7aa2f7',
                magenta: '#bb9af7',
                cyan: '#7dcfff',
                white: '#a9b1d6',
                brightBlack: '#414868',
                brightRed: '#f7768e',
                brightGreen: '#9ece6a',
                brightYellow: '#e0af68',
                brightBlue: '#7aa2f7',
                brightMagenta: '#bb9af7',
                brightCyan: '#7dcfff',
                brightWhite: '#c0caf5',
            },
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 14,
            allowTransparency: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        // Welcome message with color
        term.write('\x1b[1;34mWelcome to Gemini Terminal\x1b[0m\r\n');
        term.write('\x1b[90mType "help" to see available commands and shortcuts.\x1b[0m\r\n');
        writePrompt(term);

        term.onData((data) => {
            const code = data.charCodeAt(0);

            // Handle special keys
            if (data === '\x1b[A') { // Up Arrow
                if (historyRef.current.length > 0) {
                    if (historyIndexRef.current === -1) {
                        historyIndexRef.current = historyRef.current.length - 1;
                    } else if (historyIndexRef.current > 0) {
                        historyIndexRef.current--;
                    }

                    const cmd = historyRef.current[historyIndexRef.current];
                    // Clear current line
                    term.write('\x1b[2K\r');
                    writePrompt(term); // Re-write prompt to keep styling correct
                    term.write(cmd);
                    commandRef.current = cmd;
                }
                return;
            } else if (data === '\x1b[B') { // Down Arrow
                if (historyIndexRef.current !== -1) {
                    if (historyIndexRef.current < historyRef.current.length - 1) {
                        historyIndexRef.current++;
                        const cmd = historyRef.current[historyIndexRef.current];
                        term.write('\x1b[2K\r');
                        writePrompt(term);
                        term.write(cmd);
                        commandRef.current = cmd;
                    } else {
                        historyIndexRef.current = -1;
                        term.write('\x1b[2K\r');
                        writePrompt(term);
                        commandRef.current = '';
                    }
                }
                return;
            } else if (data === '\x03') { // Ctrl+C
                term.write('^C');
                writeSeparator(term);
                writePrompt(term);
                commandRef.current = '';
                historyIndexRef.current = -1;
                return;
            } else if (data === '\x0c') { // Ctrl+L
                term.clear();
                writePrompt(term);
                if (commandRef.current) term.write(commandRef.current);
                return;
            } else if (data === '\x00') { // Ctrl+Space (AI Toggle)
                // Toggle AI mode directly? Or just prefix?
                // Let's make it toggle the mode for better UX now
                isAiMode.current = !isAiMode.current;
                term.write('\x1b[2K\r');
                writePrompt(term);
                term.write(commandRef.current);
                return;
            }

            if (code === 13) { // Enter
                term.write('\r\n');
                const cmd = commandRef.current;
                if (cmd.trim()) {
                    historyRef.current.push(cmd);
                    // Save to localStorage
                    localStorage.setItem('cmd_history', JSON.stringify(historyRef.current));
                    historyIndexRef.current = -1; // Reset history index
                }
                handleCommand(cmd);
                commandRef.current = '';
            } else if (code === 127) { // Backspace
                if (commandRef.current.length > 0) {
                    term.write('\b \b');
                    commandRef.current = commandRef.current.slice(0, -1);
                }
            } else {
                // Filter out other control characters if needed, but for now just write
                if (code >= 32) {
                    term.write(data);
                    commandRef.current += data;
                }
            }
        });

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        const handleResize = () => {
            fitAddon.fit();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
        };
    }, []);

    const handleCommand = async (cmd: string) => {
        const trimmedCmd = cmd.trim();
        if (!trimmedCmd) {
            if (xtermRef.current) {
                writePrompt(xtermRef.current);
            }
            return;
        }

        if (isAiMode.current) {
            if (trimmedCmd === 'exit') {
                isAiMode.current = false;
                xtermRef.current?.write('\x1b[33mExited AI mode.\x1b[0m\r\n');
                if (xtermRef.current) {
                    writeSeparator(xtermRef.current);
                    writePrompt(xtermRef.current);
                }
                return;
            }
            if (trimmedCmd === 'help') {
                xtermRef.current?.write('\r\n\x1b[1mAI Mode Commands:\x1b[0m\r\n');
                xtermRef.current?.write('  \x1b[36mexit\x1b[0m        Exit AI mode and return to shell\r\n');
                xtermRef.current?.write('  \x1b[36mCtrl+Space\x1b[0m  Toggle AI mode\r\n');
                if (xtermRef.current) {
                    writeSeparator(xtermRef.current);
                    writePrompt(xtermRef.current);
                }
                return;
            }
            await runGemini(trimmedCmd);
            return;
        }

        if (trimmedCmd === 'help') {
            xtermRef.current?.write('\r\n\x1b[1mAvailable Commands:\x1b[0m\r\n');
            xtermRef.current?.write('  \x1b[36mai <prompt>\x1b[0m   Run a one-off AI command\r\n');
            xtermRef.current?.write('  \x1b[36mai\x1b[0m            Enter persistent AI chat mode\r\n');
            xtermRef.current?.write('  \x1b[36mCtrl+Space\x1b[0m    Toggle AI mode\r\n');
            xtermRef.current?.write('  \x1b[36mclear\x1b[0m         Clear the terminal (or Ctrl+L)\r\n');
            xtermRef.current?.write('  \x1b[36menv-debug\x1b[0m     Show environment variables\r\n');
            if (xtermRef.current) {
                writeSeparator(xtermRef.current);
                writePrompt(xtermRef.current);
            }
            return;
        }

        if (trimmedCmd === 'clear') {
            xtermRef.current?.clear();
            if (xtermRef.current) {
                writePrompt(xtermRef.current);
            }
            return;
        }

        if (trimmedCmd === 'env-debug') {
            await runShellCommand('env');
            return;
        }

        if (trimmedCmd.startsWith('cd ')) {
            const newDir = trimmedCmd.slice(3).trim();
            xtermRef.current?.write(`\r\n\x1b[33m[Info] cd to "${newDir}" is not supported in this stateless shell.\x1b[0m\r\n`);
            if (xtermRef.current) {
                writeSeparator(xtermRef.current);
                writePrompt(xtermRef.current);
            }
            return;
        }

        // Check for AI command to enter AI mode
        if (trimmedCmd.startsWith('ai ')) {
            const prompt = trimmedCmd.slice(3).trim();
            // If there is a prompt, run it one-off. If just 'ai', just enter mode.
            if (prompt) {
                await runGemini(prompt);
            } else {
                isAiMode.current = true;
                xtermRef.current?.write('\x1b[35mEntered AI mode. Type "exit" to leave.\x1b[0m\r\n');
                if (xtermRef.current) {
                    writeSeparator(xtermRef.current);
                    writePrompt(xtermRef.current);
                }
            }
            return;
        }

        if (trimmedCmd === 'ai') {
            isAiMode.current = true;
            xtermRef.current?.write('\x1b[35mEntered AI mode. Type "exit" to leave.\x1b[0m\r\n');
            if (xtermRef.current) {
                writeSeparator(xtermRef.current);
                writePrompt(xtermRef.current);
            }
            return;
        }

        await runShellCommand(trimmedCmd);
    };

    const runShellCommand = async (cmd: string) => {
        // Detect OS (simple check for Windows)
        const isWindows = navigator.userAgent.includes('Windows');

        let commandName = 'sh';
        let commandArgs = ['-c', cmd];

        if (isWindows) {
            commandName = 'powershell';
            commandArgs = ['-c', cmd]; // PowerShell also uses -c (or -Command)
        }

        // We use sh -c (or powershell -c) to run the command so we can use pipes etc.
        // Note: This is not a persistent shell, so env vars set in one command won't persist.
        const command = Command.create(commandName, commandArgs);

        command.on('close', (_data) => {
            if (xtermRef.current) {
                writeSeparator(xtermRef.current);
                writePrompt(xtermRef.current);
            }
        });

        command.on('error', (error) => {
            xtermRef.current?.write(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`);
            if (xtermRef.current) {
                writeSeparator(xtermRef.current);
                writePrompt(xtermRef.current);
            }
        });

        command.stdout.on('data', (line) => {
            xtermRef.current?.write(line + '\r\n');
        });

        command.stderr.on('data', (line) => {
            xtermRef.current?.write(line + '\r\n');
        });

        try {
            await command.spawn();
        } catch (err) {
            xtermRef.current?.write(`\r\n\x1b[31mFailed to execute: ${err}\x1b[0m\r\n`);
            if (xtermRef.current) {
                writeSeparator(xtermRef.current);
                writePrompt(xtermRef.current);
            }
        }
    };

    const runGemini = async (prompt: string) => {
        // Cyan color for thinking
        xtermRef.current?.write('\r\n\x1b[36mThinking...\x1b[0m\r\n');

        let args = [];
        if (hasGeminiSession.current) {
            // When resuming, the CLI requires -p for the prompt
            args = ['--resume', 'latest', '--yolo', '-p', prompt];
        } else {
            // For new sessions, positional argument works and -p is deprecated (but works)
            // Let's stick to positional for new sessions as it seemed to work fine
            args = ['--yolo', prompt];
        }

        // gemini cli takes the prompt as arguments
        const command = Command.create('gemini', args);

        command.stdout.on('data', (line) => {
            // Filter out "Loaded cached credentials" and "YOLO mode"
            if (line.includes('Loaded cached credentials')) return;
            if (line.includes('YOLO mode is enabled')) return;

            // Apply Markdown to ANSI conversion using marked
            try {
                // marked.parse returns a string (Promise if async, but sync by default)
                // We need to cast or ensure it's string.
                const raw = marked.parse(line) as string;
                // marked-terminal output might need some cleanup for xterm.js if it adds too many newlines
                // But usually it's fine.
                xtermRef.current?.write(raw.replace(/\n/g, '\r\n'));
            } catch (e) {
                // Fallback if parsing fails
                xtermRef.current?.write(line.replace(/\n/g, '\r\n'));
            }
        });

        command.stderr.on('data', (line) => {
            // Filter out "Loaded cached credentials" and "YOLO mode" from stderr too
            if (line.includes('Loaded cached credentials')) return;
            if (line.includes('YOLO mode is enabled')) return;

            xtermRef.current?.write(line.replace(/\n/g, '\r\n'));
        });

        command.on('close', () => {
            if (xtermRef.current) {
                writeSeparator(xtermRef.current);
                writePrompt(xtermRef.current);
            }
            hasGeminiSession.current = true;
        });

        try {
            await command.spawn();
        } catch (err) {
            xtermRef.current?.write(`\r\n\x1b[31mFailed to run Gemini: ${err}\x1b[0m\r\n`);
            if (xtermRef.current) {
                writeSeparator(xtermRef.current);
                writePrompt(xtermRef.current);
            }
        }
    };

    return (
        <div
            ref={terminalRef}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#1a1b26'
            }}
        />
    );
}

