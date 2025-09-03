# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in next-l402, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to: jasonbrill@example.com (replace with your email)
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for response and fix

## Security Considerations

### Lightning Network Security
- Always use TLS certificates when connecting to LND
- Store macaroons securely and rotate them regularly
- Validate all Lightning Network responses
- Use testnet for development and testing

### Authentication Security
- Macaroons are cryptographically signed tokens
- Preimage validation ensures payment proof
- Caveats provide fine-grained access control
- Secret keys should be cryptographically random

### Environment Variables
- Never commit `.env` files to version control
- Use secure key management in production
- Rotate credentials regularly
- Validate all configuration inputs

## Best Practices

1. **Environment Isolation**: Use separate Lightning nodes for dev/prod
2. **Input Validation**: Validate all user inputs and API responses
3. **Error Handling**: Don't expose internal details in error messages
4. **Monitoring**: Log authentication events for security analysis
5. **Dependencies**: Keep dependencies updated for security patches

## Known Security Considerations

- This library handles cryptocurrency payments - use with appropriate security measures
- Lightning Network preimages are payment proofs - protect them appropriately
- Macaroons contain payment authorization - treat as sensitive credentials