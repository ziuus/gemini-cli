# Contributing to Gemini Terminal

Thank you for your interest in contributing to Gemini Terminal! We welcome contributions from the community.

## How to Contribute

1.  **Fork the Repository**: Create a fork of the project on GitHub.
2.  **Clone the Repository**: Clone your fork locally.
    ```bash
    git clone https://github.com/yourusername/gemini-cli.git
    cd gemini-cli
    ```
3.  **Install Dependencies**: Use `pnpm` to install dependencies.
    ```bash
    pnpm install
    ```
4.  **Create a Branch**: Create a new branch for your feature or fix.
    ```bash
    git checkout -b feature/my-new-feature
    ```
5.  **Make Changes**: Implement your changes.
6.  **Test**: Ensure the application builds and runs correctly.
    ```bash
    pnpm tauri dev
    ```
7.  **Commit**: Commit your changes with a descriptive message.
    ```bash
    git commit -m "feat: add amazing new feature"
    ```
8.  **Push**: Push your branch to your fork.
    ```bash
    git push origin feature/my-new-feature
    ```
9.  **Open a Pull Request**: Submit a Pull Request to the main repository.

## Coding Style

-   Use TypeScript for all new code.
-   Follow the existing project structure.
-   Ensure code is formatted (Prettier is recommended).

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub. Provide as much detail as possible.
