# Contributing to NEXUS

## Development Workflow

```bash
# Install dependencies
make install

# Run all tests
make test

# Run all linters
make lint

# Format all code
make format

# Start services locally
docker-compose up --build
```

## Code Quality

- **Python**: `ruff` for linting/formatting, `pytest` for tests
- **Rust**: `cargo clippy` and `cargo fmt`, `cargo test` for tests
- **TypeScript**: `eslint` and `prettier`

## Pull Request Process

1. Branch from `main`
2. Run `make ci` locally (lint + test)
3. Ensure all tests pass
4. Update README if architecture changes
5. Submit PR with clear description
