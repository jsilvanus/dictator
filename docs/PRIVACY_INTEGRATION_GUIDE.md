# Privacy Features Integration Guide

This guide explains how to integrate the privacy-first features into your Dictator application components.

## Quick Reference

### Components
- **PrivacySettingsPanel** - Full privacy settings UI
- **SensitiveDataWarningDialog** - Warning before sending sensitive data
- **ProviderPolicyCard** - Display AI provider policies
- **DocumentExportButton** - Export with full provenance
- **AccountDeletionPanel** - Account and data deletion

### Hooks
- **usePrivacyCheck()** - Check content for sensitive data

### API Endpoints
- `POST /api/ai/privacy/check-sensitive` - Scan for sensitive data
- `POST /api/ai/privacy/redact-sensitive` - Redact sensitive data
- `GET /api/ai/privacy/policies` - Fetch provider policies
- `POST /api/user/privacy-settings` - Save privacy settings
- `GET /api/documents/:id/export-with-provenance` - Export with audit trail
- `POST /api/user/delete-account` - Delete account and all data

---

## Integration Examples

### 1. Add Privacy Settings Page

```tsx
// app/settings/privacy/page.tsx
import { PrivacySettingsPanel } from '@/components/privacy';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth.config';

export default async function PrivacySettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="container py-8">
      <PrivacySettingsPanel 
        userId={session.user.id}
        onSettingsUpdate={(settings) => console.log('Settings saved:', settings)}
      />
    </div>
  );
}
```

### 2. Check Sensitive Data Before AI Requests

```tsx
// components/editor/AIAssistantPanel.tsx
'use client';

import { useState } from 'react';
import { usePrivacyCheck } from '@/lib/hooks/usePrivacyCheck';
import { SensitiveDataWarningDialog } from '@/components/privacy';

export function AIAssistantPanel() {
  const [selectedText, setSelectedText] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  
  const privacyCheck = usePrivacyCheck({
    enabled: true,
    warnBeforeSending: true
  });

  const handleSendToAI = async () => {
    // Check for sensitive data
    const check = await privacyCheck.checkSensitiveData(selectedText);
    
    if (check?.hasSensitiveData) {
      setShowWarning(true);
    } else {
      // Safe to send to AI
      await sendToAI(selectedText);
    }
  };

  const handleRedactAndSend = async () => {
    const redacted = await privacyCheck.redactSensitiveData(selectedText);
    if (redacted) {
      await sendToAI(redacted);
    }
  };

  return (
    <>
      <button onClick={handleSendToAI}>Send to AI</button>
      
      <SensitiveDataWarningDialog
        isOpen={showWarning}
        detectedData={privacyCheck.lastCheck?.detectedData || []}
        dataTypes={privacyCheck.lastCheck?.dataTypes || []}
        warningMessage={privacyCheck.lastCheck?.warningMessage || null}
        onProceed={() => sendToAI(selectedText)}
        onRedact={handleRedactAndSend}
        onCancel={() => setShowWarning(false)}
        provider="Claude"
      />
    </>
  );
}

async function sendToAI(content: string) {
  // Send to AI API
}
```

### 3. Show Provider Policies

```tsx
// components/ai/ProviderSelector.tsx
'use client';

import { useEffect, useState } from 'react';
import { ProviderPolicyCard } from '@/components/privacy';
import type { AiProviderPolicy } from '@/lib/privacy/types';

export function ProviderSelector() {
  const [providers, setProviders] = useState<Array<{policy: AiProviderPolicy, rating: number}>>([]);

  useEffect(() => {
    fetch('/api/ai/privacy/policies')
      .then(r => r.json())
      .then(data => setProviders(data.providers || []));
  }, []);

  return (
    <div className="space-y-4">
      <h2>Choose an AI Provider</h2>
      {providers.map(item => (
        <ProviderPolicyCard
          key={item.policy.provider}
          policy={item.policy}
          privacyRating={item.rating}
          compact={false}
          showLink={true}
        />
      ))}
    </div>
  );
}
```

### 4. Add Export Button to Document

```tsx
// components/document/DocumentHeader.tsx
import { DocumentExportButton } from '@/components/privacy';

interface DocumentHeaderProps {
  documentId: string;
  documentTitle: string;
  hasAiHistory: boolean;
}

export function DocumentHeader({ 
  documentId, 
  documentTitle, 
  hasAiHistory 
}: DocumentHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <h1>{documentTitle}</h1>
      <DocumentExportButton
        documentId={documentId}
        documentTitle={documentTitle}
        hasAiHistory={hasAiHistory}
        onExportStart={() => console.log('Exporting...')}
        onExportComplete={() => console.log('Export complete')}
      />
    </div>
  );
}
```

### 5. Add Account Deletion Option

```tsx
// app/settings/account/page.tsx
import { AccountDeletionPanel } from '@/components/privacy';

export default function AccountPage() {
  return (
    <div className="container py-8">
      <h1>Account Management</h1>
      
      {/* Other account settings above */}
      
      <div className="mt-12 border-t pt-8">
        <AccountDeletionPanel />
      </div>
    </div>
  );
}
```

---

## Using the usePrivacyCheck Hook

```tsx
import { usePrivacyCheck } from '@/lib/hooks/usePrivacyCheck';

function MyComponent() {
  const privacy = usePrivacyCheck({
    enabled: true,
    warnBeforeSending: true,
  });

  // Check content
  const handleCheck = async (content: string) => {
    const result = await privacy.checkSensitiveData(content);
    
    if (result?.hasSensitiveData) {
      console.log('Detected types:', result.dataTypes);
      console.log('Details:', result.detectedData);
    }
  };

  // Redact content
  const handleRedact = async (content: string) => {
    const redacted = await privacy.redactSensitiveData(content);
    console.log('Redacted:', redacted);
  };

  // Check and redact in one call
  const handleCheckAndRedact = async (content: string) => {
    const result = await privacy.checkAndRedact(content);
    if (result?.hasSensitiveData) {
      console.log('Was redacted:', result.redacted);
    }
  };

  return (
    <div>
      {privacy.isChecking && <p>Checking...</p>}
      {privacy.error && <p>Error: {privacy.error}</p>}
      {privacy.hasSensitiveData && (
        <p>⚠️ Detected: {privacy.detectedDataTypes.join(', ')}</p>
      )}
    </div>
  );
}
```

---

## API Endpoint Examples

### Check for Sensitive Data

```bash
curl -X POST http://localhost:3000/api/ai/privacy/check-sensitive \
  -H "Content-Type: application/json" \
  -d '{"content": "My credit card is 4111-1111-1111-1111"}'

# Response:
{
  "hasSensitiveData": true,
  "detectedData": [
    {
      "type": "credit-card",
      "snippet": "4111-1111-1111-1111",
      "confidence": 0.95,
      "position": 25
    }
  ],
  "dataTypes": ["credit-card"],
  "warningMessage": "Found 1 credit card number..."
}
```

### Redact Sensitive Data

```bash
curl -X POST http://localhost:3000/api/ai/privacy/redact-sensitive \
  -H "Content-Type: application/json" \
  -d '{"content": "My SSN is 123-45-6789"}'

# Response:
{
  "redactedContent": "My SSN is [SSN_REDACTED]",
  "hasSensitiveData": true,
  "redactedCount": 1
}
```

### Get Provider Policies

```bash
curl http://localhost:3000/api/ai/privacy/policies

# Response:
{
  "providers": [
    {
      "policy": {
        "provider": "claude",
        "displayName": "Claude (Anthropic)",
        "dataRetentionDays": 30,
        "usesDataForTraining": false,
        ...
      },
      "rating": 95
    },
    ...
  ]
}
```

### Save Privacy Settings

```bash
curl -X POST http://localhost:3000/api/user/privacy-settings \
  -H "Content-Type: application/json" \
  -d '{
    "telemetryEnabled": false,
    "sensitiveDataDetectionEnabled": true,
    "warnBeforeSendingToCloud": true,
    "preferLocalProcessing": true
  }'
```

---

## Database Migrations

Run the privacy migration to create necessary tables:

```bash
# With Drizzle ORM
npm run db:push

# Or manually apply:
psql -f drizzle/0009_privacy_architecture.sql
```

This creates:
- `user_privacy_settings` - User preferences
- `ai_provider_policies` - Provider data policies
- `ai_turn_provenance` - AI interaction tracking
- `deletion_records` - Data deletion audit trail
- `privacy_audit_log` - Complete audit history

---

## Best Practices

1. **Always check before sending to cloud AI**
   ```tsx
   const check = await privacyCheck.checkSensitiveData(content);
   if (check?.hasSensitiveData) {
     // Show warning or redact
   }
   ```

2. **Use selected text, not full document**
   - Only send the text the user specifically selected
   - Minimize what goes to the AI provider

3. **Store privacy settings per user**
   - Respect user's data collection preferences
   - Never override their choices

4. **Log privacy-relevant actions**
   - Track when sensitive data was detected
   - Log user's response (proceed/redact/cancel)
   - Maintain audit trail for compliance

5. **Offer export before deletion**
   - Always suggest data export
   - Users may need records for compliance

6. **Handle errors gracefully**
   - Network errors checking sensitive data
   - Failed redactions
   - API timeouts

---

## Environment Configuration

Create `.env.local`:

```env
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Database
DATABASE_URL=******localhost/dictator

# Telemetry (optional)
TELEMETRY_ENABLED=false
TELEMETRY_SERVER_SECRET=your-hmac-secret

# AI Providers
NEXT_PUBLIC_ANTHROPIC_API_KEY=
NEXT_PUBLIC_OPENAI_API_KEY=
```

---

## Testing Privacy Features

```tsx
// __tests__/privacy.test.tsx
import { render, screen } from '@testing-library/react';
import { SensitiveDataWarningDialog } from '@/components/privacy';

test('shows warning for detected data', () => {
  render(
    <SensitiveDataWarningDialog
      isOpen={true}
      detectedData={[{
        type: 'credit-card',
        snippet: '4111-1111-1111-1111',
        confidence: 0.95
      }]}
      dataTypes={['credit-card']}
      warningMessage="Found credit card"
      onProceed={() => {}}
      onRedact={() => {}}
      onCancel={() => {}}
    />
  );
  
  expect(screen.getByText(/Sensitive Data Detected/)).toBeInTheDocument();
});
```

---

## Compliance Checklist

- [ ] Privacy settings page created
- [ ] Sensitive data warnings integrated
- [ ] Document export with provenance enabled
- [ ] Account deletion implemented
- [ ] Provider policies displayed
- [ ] Database migrations applied
- [ ] Telemetry privacy checks enabled
- [ ] Audit logging configured
- [ ] Privacy documentation created
- [ ] GDPR compliance verified
- [ ] User consent collected before any data transmission
- [ ] Encryption enabled for local storage

---

## Troubleshooting

**Sensitive data check returns false positives?**
- Adjust confidence thresholds in `SensitiveDataDetector.ts`
- Add custom patterns for your use case
- Review regex patterns for false matches

**Redaction removes legitimate text?**
- Increase confidence thresholds
- Disable specific pattern types
- Use manual review before redaction

**Export file not generating?**
- Check disk space for temp files
- Verify archiver library is installed
- Check API logs for errors

**Privacy settings not saving?**
- Verify user is authenticated
- Check database connection
- Review browser console for network errors

---

## Further Reading

- **PRIVACY_ARCHITECTURE.md** - Comprehensive privacy architecture documentation
- **README.md** - Project overview with privacy-first value proposition
- **lib/privacy/types.ts** - Type definitions for all privacy features
- **GDPR Compliance** - See privacy audit log tables and deletion records

