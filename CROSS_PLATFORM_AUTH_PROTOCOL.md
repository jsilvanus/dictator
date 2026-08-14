# Cross-Platform Authentication Protocol for Dictator

## Overview

This document defines the unified authentication protocol for Dictator across web (TypeScript/Next.js) and Android (Kotlin) platforms to enable seamless cross-device user experiences.

## Authentication Architecture

### Web Platform (TypeScript/Next.js)
- **Mechanism**: NextAuth.js with JWT strategy
- **Session Type**: Server-side HTTP sessions with JWT tokens
- **Storage**: Token stored in secure HTTP-only cookie
- **Token Format**: JWT with standard claims (id, role, email, name)
- **Token Refresh**: Via NextAuth session refresh
- **Validation**: JWT verification on each request

### Android Platform (Kotlin)
- **Mechanism**: Direct JWT token management
- **Session Type**: Client-side token storage
- **Storage**: JWT token in SharedPreferences (secure storage)
- **Token Format**: Identical to web JWT (id, role, email, name)
- **Token Refresh**: Via `/api/auth/refresh` endpoint
- **Validation**: Remote validation via `/api/auth/validate` endpoint

## Unified Token Format

All JWT tokens across platforms MUST contain:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "editor | admin",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## API Endpoints (Cross-Platform)

### 1. Login
**POST /api/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "password"
}

Response (200 OK):
{
  "token": "eyJhbGc...",
  "userId": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "editor",
  "expiresIn": 604800
}
```

### 2. Signup
**POST /api/auth/signup**
```json
Request:
{
  "email": "user@example.com",
  "name": "User Name",
  "password": "password"
}

Response (200 OK):
{
  "token": "eyJhbGc...",
  "userId": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "editor",
  "expiresIn": 604800
}
```

### 3. Logout
**POST /api/auth/logout**
```
Headers:
  Authorization: ******

Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 4. Validate Token
**POST /api/auth/validate**
```json
Request:
{
  "token": "eyJhbGc..."
}

Response (200 OK):
{
  "valid": true,
  "userId": "user-id",
  "email": "user@example.com",
  "expiresAt": 1234571490
}

Response (401 Unauthorized):
{
  "valid": false,
  "reason": "Token expired | Invalid signature | Malformed token"
}
```

### 5. Refresh Token
**POST /api/auth/refresh**
```json
Request:
{
  "token": "eyJhbGc..."
}

Response (200 OK):
{
  "token": "eyJhbGc...",
  "expiresIn": 604800
}

Response (401 Unauthorized):
{
  "error": "Token refresh failed",
  "reason": "Token expired | Invalid signature"
}
```

### 6. Get Session
**GET /api/auth/session**
```
Headers:
  Authorization: ******

Response (200 OK):
{
  "userId": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "editor"
}

Response (401 Unauthorized):
{
  "error": "Unauthorized"
}
```

## Multi-Device Session Management

### Session Coordination
1. Each device maintains its own authentication token independently
2. Tokens are issued with unique device identifiers in JWT claims
3. All tokens remain valid simultaneously across devices
4. User can revoke all sessions via settings (future enhancement)

### Token Format with Device Info
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "editor",
  "deviceId": "android-device-id | web-session-id",
  "deviceType": "web | android",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Logout Coordination

### Single Device Logout
- **Web**: User clicks logout → NextAuth invalidates session and clears cookie
- **Android**: User clicks logout → Token removed from SharedPreferences

### Cross-Device Logout (Future)
When implementing, follow this protocol:
1. User initiates logout on primary device
2. Device sends logout request to `/api/auth/logout-all-devices`
3. Server invalidates all tokens for user
4. All other devices receive notification via push/polling
5. All devices clear local authentication state

## Security Considerations

### Token Storage
- **Web**: HTTP-only secure cookie (CSRF protected)
- **Android**: SharedPreferences with encryption

### Token Validation
- All tokens validated server-side before processing requests
- Tokens include expiration time (default 7 days)
- Refresh tokens obtained via refresh endpoint

### HTTPS Requirement
- All authentication API calls MUST use HTTPS
- HTTP fallback not permitted for production

### Password Handling
- Passwords hashed with bcrypt (salted)
- Never transmitted over unencrypted channels
- Never stored client-side

## Implementation Status

### Web (TypeScript/Next.js)
- ✅ NextAuth.js configured
- ✅ JWT token generation
- ✅ Session management
- ✅ Token refresh
- ✅ Logout support

### Android (Kotlin)
- ✅ JWT token storage
- ✅ Token validation
- ✅ Token refresh
- ✅ Logout support
- ⚠️ Device ID tracking (planned)

## Testing Strategy

### Unit Tests
- Token format validation
- Token expiration handling
- Password hashing verification

### Integration Tests
- Login/signup flow end-to-end
- Token refresh on expiration
- Coordinated logout across devices
- Multi-device session management

### Interoperability Tests
- Web login → Android token validation
- Android login → Web session usage
- Cross-platform token refresh
- Cross-platform logout

## Future Enhancements

1. **Device Identification**: Add persistent device IDs to track sessions
2. **Session Revocation**: Allow users to revoke specific device sessions
3. **Biometric Auth**: Add fingerprint/face recognition for Android
4. **SSO Integration**: Support third-party identity providers
5. **Session Notifications**: Notify users of login from new devices

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
