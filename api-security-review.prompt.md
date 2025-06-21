# API security review

Your goal is to perform a comprehensive security review of REST API endpoints.

## Security Checklist

Use this checklist to ensure all security aspects are covered:

### Authentication & Authorization
- [ ] All endpoints are protected by authentication
- [ ] Proper authorization checks are implemented
- [ ] JWT tokens are validated and properly signed
- [ ] Role-based access control (RBAC) is enforced
- [ ] API keys are rotated regularly

### Input Validation & Sanitization
- [ ] All user inputs are validated on the server side
- [ ] SQL injection protection is implemented
- [ ] XSS prevention measures are in place
- [ ] File upload validation is secure
- [ ] Request size limits are enforced

### Rate Limiting & Throttling
- [ ] Rate limiting is implemented for all endpoints
- [ ] Burst protection is configured
- [ ] IP-based throttling is active
- [ ] User-based rate limiting is enforced
- [ ] Graceful degradation on rate limit exceeded

### Security Headers & HTTPS
- [ ] HTTPS is enforced for all communications
- [ ] Security headers are properly configured (HSTS, CSP, etc.)
- [ ] CORS is configured securely
- [ ] Content-Type validation is implemented

### Logging & Monitoring
- [ ] Security events are logged
- [ ] Failed authentication attempts are monitored
- [ ] Suspicious activity detection is active
- [ ] Audit logs are maintained
- [ ] Real-time alerting is configured

### Data Protection
- [ ] Sensitive data is encrypted at rest
- [ ] Data transmission is encrypted
- [ ] PII is properly handled
- [ ] Data retention policies are followed
- [ ] Secure deletion is implemented

## Review Template

When reviewing an API endpoint, include:

1. **Endpoint**: `[METHOD] /api/endpoint`
2. **Security Status**: ✅ Secure / ⚠️ Needs attention / ❌ Vulnerable
3. **Findings**: List of security issues found
4. **Recommendations**: Specific actions to improve security
5. **Priority**: High/Medium/Low based on risk assessment

## Common Vulnerabilities to Check

- Broken authentication
- Sensitive data exposure
- XML External Entities (XXE)
- Broken access control
- Security misconfiguration
- Cross-Site Scripting (XSS)
- Insecure deserialization
- Using components with known vulnerabilities
- Insufficient logging & monitoring
- Server-Side Request Forgery (SSRF)
