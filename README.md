# Gemini Terminal

A modern, AI-powered terminal emulator built with Tauri, React, and TypeScript. It integrates Google's Gemini AI directly into your command line workflow.

## Features

-   **Persistent AI Mode**: Chat with Gemini directly in your terminal.
-   **Smart Context**: Gemini knows it's running in a terminal and can help with shell commands.
-   **One-off AI Commands**: Run quick AI queries without leaving your shell.
-   **Modern UI**: Sleek, dark-themed interface with JetBrains Mono font.
-   **Cross-Platform**: Runs on Linux and Windows.

## Installation

### Download
Go to the [Releases](https://github.com/yourusername/gemini-cli/releases) page and download the installer for your operating system:
-   **Windows**: `.msi` or `.exe`
-   **Linux**: `.deb` or `.AppImage`

### Manual Build
1.  **Prerequisites**:
    -   [Rust](https://www.rust-lang.org/tools/install)
    -   [Node.js](https://nodejs.org/)
    -   [pnpm](https://pnpm.io/installation)

2.  **Clone and Install**:
    ```bash
    git clone https://github.com/yourusername/gemini-cli.git
    cd gemini-cli
    pnpm install
    ```

3.  **Run in Development Mode**:
    ```bash
    pnpm tauri dev
    ```

4.  **Build for Production**:
    ```bash
    pnpm tauri build
    ```

## Usage

### Standard Shell
The terminal behaves like a standard shell (e.g., `bash` or `zsh` on Linux, `cmd` or `PowerShell` on Windows). You can run all your usual commands (`ls`, `cd`, `git`, etc.).

### AI Commands
-   **One-off Command**:
    Type `ai <prompt>` to get a quick answer from Gemini.
    ```bash
    ➜ ~ ai how do I list all files including hidden ones?
    ```

-   **Persistent AI Mode**:
    Type `ai` (without arguments) or press `Ctrl+Space` to enter AI mode.
    ```bash
    ➜ ~ ai
    ✨ AI ➜ write a python script to calculate fibonacci
    ```
    Type `exit` or press `Ctrl+Space` again to return to the shell.

-   **Help**:
    Type `help` to see a list of available commands and shortcuts.

### Shortcuts
-   `Ctrl+Space`: Toggle AI mode.
-   `Ctrl+L`: Clear the terminal.
-   `Ctrl+C`: Interrupt current command.

## Tech Stack
-   **Frontend**: React, TypeScript, xterm.js
-   **Backend**: Rust (Tauri)
-   **Build Tool**: Vite, pnpm

## License
MIT

