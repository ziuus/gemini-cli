
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Command } from '@tauri-apps/plugin-shell';
import 'xterm/css/xterm.css';

export default function Terminal() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const commandRef = useRef<string>('');
    const hasGeminiSession = useRef<boolean>(false);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef<number>(-1);

    // Helper to convert simple Markdown to ANSI
    const markdownToAnsi = (text: string): string => {
        let res = text;
        // Bold **text** -> \x1b[1mtext\x1b[0m
        res = res.replace(/\*\*(.*?)\*\*/g, '\x1b[1m$1\x1b[0m');
        // Code `text` -> \x1b[36mtext\x1b[0m (Cyan)
        res = res.replace(/`([^`]+)`/g, '\x1b[36m$1\x1b[0m');
        // Code blocks ```...``` -> \x1b[36m...\x1b[0m (Cyan) - simplified
        res = res.replace(/```([\s\S]*?)```/g, '\x1b[36m$1\x1b[0m');
        return res;
    };

    const writeSeparator = (term: XTerm) => {
        // Separator line
        term.write('\r\n\x1b[90m' + '─'.repeat(term.cols) + '\x1b[0m\r\n');
    };

    const writePrompt = (term: XTerm) => {
        // Distinct prompts
        if (commandRef.current.startsWith('ai ')) {
            term.write('\x1b[35m✨ AI\x1b[0m \x1b[1;32m➜\x1b[0m '); // Purple AI, Green Arrow
        } else {
            term.write('\x1b[1;32m➜\x1b[0m \x1b[34m~\x1b[0m '); // Green Arrow, Blue Tilde
        }
    };

    useEffect(() => {
        if (!terminalRef.current) return;

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
                const current = commandRef.current;
                let newCmd = '';
                if (current.startsWith('ai ')) {
                    newCmd = current.slice(3);
                } else {
                    newCmd = 'ai ' + current;
                }
                commandRef.current = newCmd;

                term.write('\x1b[2K\r');
                writePrompt(term);
                term.write(newCmd);
                return;
            }

            if (code === 13) { // Enter
                term.write('\r\n');
                const cmd = commandRef.current;
                if (cmd.trim()) {
                    historyRef.current.push(cmd);
                    historyIndexRef.current = -1; // Reset history index
                }
                handleCommand(cmd);
                commandRef.current = '';
            } else if (code === 127) { // Backspace
                if (commandRef.current.length > 0) {
                    term.write('\b \b');
                    commandRef.current = commandRef.current.slice(0, -1);

                    // Check if we removed 'ai ' prefix, might need to update prompt style?
                    // This is tricky dynamically. For now, prompt style is static per line until Enter.
                    // But Ctrl+Space updates it.
                    // If user manually backspaces 'ai ', prompt won't update automatically with current logic unless we re-render prompt on every keystroke which is expensive/flickery.
                    // Let's leave it for now.
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
                // Just new prompt line if empty command? Or separator?
                // Usually just new prompt.
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

        // Check for AI command
        if (trimmedCmd.startsWith('ai ')) {
            const prompt = trimmedCmd.slice(3).trim();
            await runGemini(prompt);
            return;
        }

        await runShellCommand(trimmedCmd);
    };

    const runShellCommand = async (cmd: string) => {
        // We use sh -c to run the command so we can use pipes etc.
        // Note: This is not a persistent shell, so env vars set in one command won't persist.
        const command = Command.create('sh', ['-c', cmd]);

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
            // Filter out "Loaded cached credentials"
            if (line.includes('Loaded cached credentials')) return;

            // Apply Markdown to ANSI conversion
            const formatted = markdownToAnsi(line);

            // Use a distinct color for AI output (e.g., light purple/magenta)
            // \x1b[38;5;147m is a nice lavender if 256 colors supported, else \x1b[35m (magenta)
            // Let's stick to standard bright magenta for safety: \x1b[95m
            // But markdownToAnsi adds its own colors, so maybe we wrap the whole thing or just let it be?
            // Let's try to just print formatted and see.

            xtermRef.current?.write(formatted.replace(/\n/g, '\r\n'));
        });

        command.stderr.on('data', (line) => {
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

