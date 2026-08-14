# Dictator Privacy Features User Guide

Welcome to Dictator's comprehensive privacy features. This guide explains how to protect your data and understand how your information is processed.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Privacy Settings](#privacy-settings)
3. [Sensitive Data Detection](#sensitive-data-detection)
4. [AI Provider Choices](#ai-provider-choices)
5. [Exporting Your Data](#exporting-your-data)
6. [Deleting Your Data](#deleting-your-data)
7. [Audit Trails](#audit-trails)
8. [Common Questions](#common-questions)
9. [Contact Support](#contact-support)

---

## Getting Started

### Privacy-First by Default

Dictator starts with privacy-first defaults:

✅ **Enabled by default:**
- Sensitive data detection (warns before sending credit cards, passwords, etc.)
- Local storage encryption
- Warnings before cloud transmission

❌ **Disabled by default:**
- Telemetry and usage analytics
- Data used for model training
- Automatic cloud backups

**Your choice**: You can enable additional features in Settings at any time.

### First Time Setup

When you create an account:

1. **Review Privacy Notice** - Read our privacy policy
2. **Choose AI Provider** - Select how your data is processed
3. **Set Privacy Preferences** - Configure what's collected
4. **Understand Encryption** - Your data is encrypted by default

---

## Privacy Settings

### Accessing Privacy Settings

1. Open **Settings** (gear icon, top right)
2. Select **Privacy & Data**
3. Choose tab: **Overview**, **Telemetry**, **Storage**, or **Providers**

### Overview Tab

Shows your current privacy status with quick toggles for:

**🔍 Sensitive Data Detection**
- Automatically detects credit cards, passwords, API keys, etc.
- Warns you before sending to cloud AI
- **Default**: Enabled
- **Recommendation**: Keep enabled (protects you)

**⚠️ Cloud Transmission Warnings**
- Shows dialog before any data goes to cloud services
- Lets you review what's being sent
- Lets you redact sensitive content
- **Default**: Enabled
- **Recommendation**: Keep enabled (provides control)

**🖥️ Prefer Local Processing**
- Suggests Ollama (local AI) over cloud providers
- Keeps data on your device
- **Default**: Enabled
- **Recommendation**: Enable if privacy is priority

**🔐 Encrypt Local Storage**
- Encrypts all documents on your device
- Requires device PIN/biometric to access
- **Default**: Enabled
- **Recommendation**: Always enabled (for security)

### Telemetry Tab

Configure what analytics Dictator collects:

**📊 Telemetry Collection** (Default: OFF)
- Sends: Operation types ("document_edit", "ai_request"), AI models used, latency, token counts
- Never sends: Document text, prompts, responses, your name/email
- **Your choice**: Enable if you want to help improve Dictator

**🐛 Crash Report Submission** (Default: OFF)
- Sends error information when app crashes
- Helps us fix bugs
- No sensitive data included
- **Your choice**: Enable if you want to help improve stability

**Privacy Protection**: All telemetry is anonymized using one-way hashing - we can't identify you from the data.

### Storage Tab

Control how your data is stored and backed up:

**🔐 Encrypt Local Database**
- Encrypts all documents stored on your device
- Requires device unlock to read
- **Default**: Enabled

**💾 Require Backup Encryption**
- Cloud backups must be encrypted
- Prevents cloud provider from reading your documents
- **Default**: Enabled

**⏰ Auto-Delete AI Sessions**
- Automatically delete old AI conversations
- You set how many days to keep (default: 30)
- Reduces storage and improves privacy
- **Your choice**: Useful if you want to minimize data trail

### Providers Tab

Review privacy practices of each AI provider:

**Provider Cards Show:**
- Privacy rating (0-100, higher = more private)
- Data retention period (how long they keep your data)
- Whether they train models on your data
- Geographic processing locations (where your data goes)
- GDPR compliance status
- Full privacy policy link

**Compare Providers:**
- 🟢 **Ollama (100/100)** - Local, no data transmission
- 🟢 **Claude (95/100)** - Cloud, no training use
- 🟡 **OpenAI (75/100)** - Cloud, training use (opt-out available)

---

## Sensitive Data Detection

### What Gets Detected?

Dictator automatically scans for these sensitive patterns:

- 💳 **Credit Card Numbers**: All formats (Visa, Mastercard, Amex, etc.)
- 🔐 **Social Security Numbers**: ###-##-#### format
- 📞 **Phone Numbers**: Various formats (US and international)
- 📧 **Email Addresses**: Detected as potentially sensitive
- 🔑 **API Keys**: AWS, OpenAI, Anthropic, and others
- 🔓 **Passwords**: Common password indicators
- 🎫 **JWT Tokens**: Authentication tokens
- 📋 **Private Keys**: PEM, RSA, SSH keys
- 🗄️ **Database Strings**: Connection strings, URIs
- 📄 **Auth Headers**: Authorization header patterns

### How to Use

#### 1. Sending Text to AI

You write a message:
> "My API key is sk-1234567890abcdef and I want to..."

**Dictator warns you:**
- ⚠️ "Sensitive Data Detected"
- Shows: "API Key"
- Gives you 3 options

#### 2. Your Choices

**Option A: Send Anyway**
- Your message sent as-is
- Logged for audit trail
- Recommended only if it's a test/dummy key

**Option B: Redact & Send**
- Automatically removes sensitive data
- Sends: "My API key is [API_KEY_REDACTED] and I want to..."
- AI still understands context
- Recommended for real sensitive data

**Option C: Cancel**
- Don't send the message
- Edit and try again
- Recommended if you change your mind

### Example Scenarios

**Scenario 1: Asking for Help with Code**
```
❌ BAD: Send full code with API key
✅ GOOD: Click "Redact & Send" to remove the key first
```

**Scenario 2: Privacy Concern**
```
❌ BAD: "Please review my credit card transaction"
✅ GOOD: "I have a question about a transaction from [DATE]"
```

**Scenario 3: Test/Dummy Data**
```
OK: Using well-known test keys like:
- Test Card: 4111-1111-1111-1111
- Test SSN: 123-45-6789
```

### Disabling Detection

If you find false positives (legitimate text flagged as sensitive):

1. **Settings → Privacy → Overview**
2. Toggle **Sensitive Data Detection** OFF
3. Warnings will no longer appear
4. (Not recommended - you lose protection)

---

## AI Provider Choices

### Available Providers

**🟢 Ollama (Recommended for Privacy)**
- Runs locally on your device
- No data transmission
- No internet needed
- No privacy concerns
- Setup: Download from ollama.ai
- Cost: Free

**🔵 Claude (Anthropic)**
- Cloud-based AI
- 30-day data retention
- NOT used for training
- GDPR compliant
- Setup: Add API key in Settings
- Cost: Pay-as-you-go

**🟡 OpenAI (GPT-4)**
- Cloud-based AI
- 30-day data retention
- Used for model improvement (opt-out available)
- GDPR compliant
- Setup: Add API key in Settings
- Cost: Pay-as-you-go

### Switching Providers

**For a Single Request:**
1. Write your prompt
2. Click provider dropdown (top right)
3. Select different provider
4. Click "Send"

**For All Requests:**
1. Settings → Privacy → Providers
2. Select "Preferred Provider"
3. All future requests use that provider

### Understanding Privacy Ratings

The privacy rating (0-100) considers:
- **Data Retention**: Shorter is better (0 = indefinite, 100 = real-time delete)
- **Training Use**: Not using your data is better
- **GDPR Compliance**: Required for high ratings
- **Processing Location**: Local processing is better
- **Encryption**: End-to-end encryption is better

### Making the Choice

**Most Private** 🔒
- Use Ollama (local)
- Your data never leaves your device
- Requires setup but worth it for sensitive work

**Balanced** ⚖️
- Use Claude (Anthropic)
- Good privacy, good AI quality
- Data not used for training
- Standard industry practice

**Best AI Quality** 🤖
- Use OpenAI GPT-4
- More capable model
- Trade some privacy for better results
- Make an informed choice

---

## Exporting Your Data

### Why Export?

- **Backup**: Keep a copy for your records
- **Compliance**: Proof of your data for audits/GDPR
- **Portability**: Move to another service
- **Archive**: Long-term storage with audit trail

### How to Export

**Export One Document:**
1. Open document
2. Click menu (⋮) → "Export with Provenance"
3. Wait for download
4. ZIP file contains: document, metadata, audit trail

**Export All Data:**
1. Settings → Privacy → [in progress]
2. Click "Export My Data"
3. Wait for download
4. ZIP file contains everything

### What's Included in Export

**document.md** - Your document text in markdown format

**provenance.json** - Metadata about your content:
- When created/edited
- Which parts are AI-generated vs human-written
- Confidence scores
- AI provider and model used

**ai-history.json** - Your AI conversations:
- All prompts and responses
- Models used
- Dates and times
- Source (AI-generated, AI-modified, etc.)

**audit-log.json** - Complete activity log:
- Every action taken
- Timestamps
- What changed
- Who made changes (you)

**README.md** - Guide to understanding the files

### Viewing the Export

**On Windows/Mac:**
1. Download ZIP
2. Double-click to extract
3. Open files with text editor
4. Keep for your records

**Privacy Note:** The export contains your full audit trail - keep it secure!

---

## Deleting Your Data

### Types of Deletions

**Delete a Single Document:**
1. Right-click document
2. Select "Delete"
3. Confirm deletion
4. Document removed immediately

**Delete AI Conversation:**
1. Open document
2. Select AI messages
3. Click trash icon
4. Confirm deletion

**Delete All Account Data:**
1. Settings → Privacy → Account
2. Click "Delete Account"
3. Read warnings carefully
4. Choose what to delete (see options below)
5. Confirm with password
6. Process starts immediately

### Deletion Options

When deleting your account, choose what to delete:

**☑️ Documents** (Recommended)
- All your documents deleted immediately
- Removed from all devices
- Cannot be recovered

**☑️ AI Conversation History** (Recommended)
- All AI interactions deleted
- Prompts and responses removed
- Cannot be recovered

**☑️ Settings & Preferences** (Recommended)
- Your account preferences deleted
- Privacy settings cleared
- Cannot be recovered

**☑️ Cloud Sync & Backups** (Recommended)
- Cloud copies deleted within 30 days
- Backups removed after retention period
- Cannot be recovered

**☐ AI Provider History** (Optional)
- Sends deletion request to Claude, OpenAI, etc.
- May take 30+ days
- Providers handle independently

**☐ Telemetry & Analytics** (Optional)
- Removes usage data we collected
- All telemetry events deleted
- Cannot be recovered

### Deletion Timeline

**Immediate** (0-1 hour)
- Local documents deleted
- Settings and preferences cleared
- AI conversation history removed
- Audit log records creation

**Short Term** (1-30 days)
- Cloud backups cleared
- Sync data removed
- Cache cleaned up

**Long Term** (30+ days)
- AI provider deletion requests processed
- Your data removed from Claude, OpenAI, etc.
- Depends on provider response times

**Confirmation**
- Email receipt of deletion
- Audit trail showing deletion occurred
- You can request proof

### Before Deleting

**✅ DO:**
1. Export your data first (for records)
2. Download any documents you want to keep
3. Share any important documents with collaborators
4. Review deletion confirmations

**❌ DON'T:**
1. Don't delete if you might need the data later
2. Don't think you can undo it (you can't!)
3. Don't forget to export if legally required

---

## Audit Trails

### What Gets Logged?

Dictator maintains a privacy audit trail of:

- When you export data
- When you request account deletion
- When sensitive data is detected
- When settings are changed
- When data is sent to AI providers
- When backups are created/deleted
- When documents are shared
- AI provider selection changes

### Viewing Your Audit Log

**In App:**
1. Settings → Privacy → "View Audit Log"
2. See recent privacy actions
3. Timestamps and descriptions
4. Cannot be edited (immutable)

**In Exported Data:**
- Included in "audit-log.json"
- Complete history from creation to export

### Understanding Audit Log Entries

**Example Entry:**
```json
{
  "timestamp": "2024-08-13T14:30:00Z",
  "action": "ai_request_sent_to_provider",
  "provider": "claude",
  "scope": "selected-text",
  "sensitiveDataDetected": true,
  "userChoice": "redacted"
}
```

**Meanings:**
- **timestamp**: When it happened
- **action**: What type of action
- **provider**: Which AI was used
- **scope**: Full document or just selected text
- **sensitiveDataDetected**: Was sensitive data found
- **userChoice**: What you chose to do

### Compliance Uses

Your audit trail helps with:
- **GDPR Compliance**: Proof of consent and data handling
- **Audit Requests**: Evidence for legal/compliance reviews
- **Disputes**: Showing what happened when
- **Security**: Detecting unauthorized access

---

## Common Questions

### Q: Where does my data go?

**A:** 
- **Documents**: Stored on your device (encrypted)
- **Backups**: Optional cloud storage (encrypted)
- **AI Requests**: Only what you send to chosen provider
- **Telemetry**: Anonymized analytics (disabled by default)

### Q: Is my data encrypted?

**A:** Yes!
- **In Transit**: TLS encryption to all servers
- **At Rest**: AES-256 encryption on your device
- **At Provider**: Protected by provider's security
- **You Control Keys**: You hold encryption keys

### Q: Can you read my documents?

**A:** No.
- We cannot decrypt your local storage
- We don't have your encryption keys
- You maintain complete control
- This is "zero-knowledge" architecture

### Q: How long do you keep my data?

**A:**
- **Documents**: Until you delete them
- **AI Sessions**: 30 days by default (configurable)
- **Backups**: 90 days after deletion
- **Audit Logs**: 3 years (required by law)

### Q: What if I delete my account?

**A:** 
- All data deleted immediately (except legal holds)
- Cannot be recovered
- Export first if you need backup
- Deletion logged for compliance

### Q: Is Ollama safe?

**A:** Yes, very safe:
- Runs locally on your device
- No data transmission
- Open-source code
- You control when/how it runs
- Only downside: requires local setup

### Q: Can I trust Claude/OpenAI?

**A:** 
- **Claude**: Doesn't train on your data (good privacy)
- **OpenAI**: Trains on data (less private, but can opt out)
- Both are industry standard
- Review their policies yourself
- Check provider cards in Settings

### Q: What happens when I export?

**A:**
- ZIP file created with all your data
- Includes documents, metadata, audit trail
- Takes a few seconds to generate
- Downloaded to your computer
- You control what to do with it

### Q: How do I report a privacy issue?

**A:** Contact immediately:
- Email: privacy@dictator.app
- Phone: [YOUR PHONE]
- Report sensitive data exposure
- We'll investigate within 24 hours
- Follow up via email

### Q: Can I disable all tracking?

**A:** Yes:
- Telemetry: Toggle OFF in Settings
- Cookies: Disable in browser
- Analytics: Opt out in Privacy Settings
- Sensitive detection: Can turn off (not recommended)

### Q: What about law enforcement requests?

**A:**
- We require valid legal process (warrant, subpoena)
- We notify users unless prohibited by law
- We only provide what's legally required
- We keep records of all requests

---

## Contact Support

### Privacy Questions

**Email:** privacy@dictator.app  
**Response Time:** Within 24 hours  
**Topics:** Privacy concerns, data requests, compliance questions

### Report a Problem

**In App:** Settings → Help → Report Privacy Issue  
**Email:** support@dictator.app  
**Response Time:** Within 48 hours

### Data Protection Officer

If you have formal privacy complaints:

**Email:** dpo@dictator.app  
**Formal Requests:** GDPR, CCPA, PIPEDA requests

### Company Address

[ORGANIZATION NAME]  
[ADDRESS]  
[CITY, STATE, ZIP]

### Regulatory Complaints

**EU (GDPR):**
- Contact your local data protection authority
- Filing location: Where you reside

**California (CCPA):**
- California Attorney General
- Website: oag.ca.gov/privacy

**Canada (PIPEDA):**
- Privacy Commissioner of Canada
- Website: privcom.gc.ca

---

## Additional Resources

- **[Privacy Architecture](./PRIVACY_ARCHITECTURE.md)** - Technical details for developers
- **[Privacy Policy](./PRIVACY_POLICY_TEMPLATE.md)** - Full legal privacy policy
- **[Integration Guide](./PRIVACY_INTEGRATION_GUIDE.md)** - For developers
- **[Deployment Guide](./PRIVACY_DEPLOYMENT_GUIDE.md)** - For system administrators

---

## Need Help?

Still have questions? Our support team is here to help:

1. **In-App Help**: Settings → Help → Search
2. **Email Support**: support@dictator.app
3. **FAQ**: Visit our website
4. **Chat**: Available 9am-5pm EST, Monday-Friday

**We're committed to your privacy. If something isn't clear, just ask!**

---

*Last Updated: [DATE]*  
*Version: 1.0*
