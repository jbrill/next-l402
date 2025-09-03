# Contributing to next-l402

Thank you for your interest in contributing to next-l402! This project aims to provide a robust L402 implementation for Next.js applications.

## Development Setup

1. Clone the repository
2. Install dependencies: `yarn install`
3. Set up environment variables (see README.md)
4. Run tests: `yarn test`

## Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Make** your changes
4. **Test** your changes: `yarn test`
5. **Lint** your code: `yarn lint`
6. **Format** your code: `yarn run format`
7. **Commit** your changes with a descriptive message
8. **Push** to your fork and create a Pull Request

## Code Standards

- Follow TypeScript best practices
- Write tests for new functionality
- Ensure all tests pass
- Follow the existing code style (enforced by Prettier)
- Add JSDoc comments for public APIs

## Testing

- Unit tests are required for new features
- Integration tests should cover the L402 flow
- Mock external dependencies (Lightning Network calls)

## Pull Request Guidelines

- Provide a clear description of changes
- Reference any related issues
- Include tests for new features
- Ensure CI passes
- Keep PRs focused and atomic

## Questions?

Open an issue for discussion or reach out to the maintainers.