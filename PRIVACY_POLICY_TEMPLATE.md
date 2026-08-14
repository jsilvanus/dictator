# Privacy Policy Template for Dictator

This template provides a starting point for creating your organization's privacy policy when using Dictator. **Customize this based on your specific implementation, jurisdiction, and data handling practices.**

---

## PRIVACY POLICY

**Last Updated**: [DATE]  
**Effective Date**: [DATE]

---

## 1. Introduction

[ORGANIZATION NAME] ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and otherwise process information about you in connection with Dictator, our AI-powered document management and voice dictation platform.

### 1.1 Privacy-First Principles

Dictator is designed with privacy as a foundational principle:

- **Local-first processing**: Your documents and voice data stay on your device by default
- **Minimal transmission**: Only what you explicitly choose is sent to cloud services
- **Transparent practices**: Clear disclosure of where your data goes and how it's used
- **User control**: You decide what's collected, processed, and deleted
- **Strong encryption**: Data is encrypted both locally and in transit

---

## 2. Information We Collect

### 2.1 Information You Provide

**Documents and Content**
- Documents you create or edit in Dictator
- Text, prompts, and responses you provide to AI assistants
- Document metadata (title, creation date, modification date)

**Account Information**
- Email address and username (for account creation)
- Password (hashed and never logged)
- Profile information you choose to add

**Voice/Audio Data**
- Voice recordings for speech-to-text conversion
- Audio is processed locally and NOT uploaded unless explicitly sent to AI

**AI Interaction Data**
- AI requests you make (prompts and responses)
- Which AI provider you selected
- Model and processing parameters used

### 2.2 Information We Collect Automatically

**Usage Analytics** (if enabled)
- What operations you perform (e.g., "document_edit", "ai_request")
- Which AI model you use (NOT the content of your prompts)
- Response latency and performance metrics
- Token counts for API usage
- App version and platform (web/Android)

**Technical Information**
- Device type and operating system
- Browser or app version
- IP address (hashed for privacy)
- Access timestamps
- Error types (not full stack traces)

**We Never Automatically Collect**
- Document text or content
- Prompts or AI responses
- Your personal information (emails, names, phone numbers)
- Transcripts or audio data
- Full error messages or stack traces

---

## 3. How We Use Your Information

### 3.1 Core Services

| Purpose | Data Used | Retention |
|---------|-----------|-----------|
| **Document Storage** | Documents, metadata | Until you delete |
| **Voice-to-Text** | Audio (processed locally) | Real-time; not stored |
| **AI Assistance** | Selected text + context | As per provider policy |
| **Sync/Backup** | Encrypted documents | Until you delete |
| **Account Management** | Email, password | While account active |

### 3.2 Legitimate Business Interests

We use your information to:
- Improve service reliability and performance
- Detect and prevent fraud or abuse
- Comply with legal obligations
- Enforce our terms of service
- Secure and protect our systems

### 3.3 AI Provider Data Sharing

When you send content to an AI provider, that provider's privacy policy applies:

#### Anthropic (Claude)
- **Data Retention**: 30 days by default
- **Training Use**: No - data NOT used for model training
- **GDPR**: Compliant
- **Policy**: https://www.anthropic.com/privacy

#### OpenAI (GPT-4, etc.)
- **Data Retention**: 30 days (can be deleted via settings)
- **Training Use**: Yes, unless opted out
- **GDPR**: Compliant  
- **Policy**: https://openai.com/policies/privacy-policy

#### Ollama (Local)
- **Data Retention**: On your device only
- **Training Use**: N/A - local processing
- **GDPR**: Fully compliant
- **Policy**: N/A

---

## 4. Data Protection & Security

### 4.1 Encryption

- **Local Storage**: AES-256-GCM encryption for all local documents
- **In Transit**: TLS 1.3 for all network communication
- **Encryption Keys**: Protected by device's native security (Keystore, Keychain)
- **Zero-Knowledge**: We cannot decrypt your documents (you hold the keys)

### 4.2 Security Measures

- Multi-factor authentication support
- Rate limiting on API endpoints
- Secure session management
- Regular security audits and penetration testing
- Incident response plan in place
- Employee access controls

### 4.3 Data Minimization

We only transmit to cloud services:
- Text you explicitly select (not your full document)
- Necessary context (with your permission)
- None: document text, full prompts, personal identifiers, or metadata

---

## 5. Your Privacy Rights

### 5.1 Access Your Data

You can access all your data by:
- Viewing your documents in the app
- Exporting with full provenance (includes audit trail)
- Requesting account data export

### 5.2 Correct or Delete Data

You can:
- Edit or delete any document
- Delete your entire account and all associated data
- Request deletion from AI providers

**Deletion Process**:
1. Request deletion in Settings
2. Local data deleted immediately
3. Cloud backups deleted within 30 days
4. AI provider deletion requests submitted (may take 30+ days)
5. Confirmation sent via email

### 5.3 Withdraw Consent

You can at any time:
- Disable telemetry collection
- Disable sensitive data detection
- Stop using cloud AI providers (use local models instead)
- Disable automatic backup

### 5.4 Data Portability

You can export all your data as a ZIP file including:
- Documents in standard formats
- Complete audit trail
- AI interaction history
- Privacy metadata

### 5.5 GDPR Rights (If You're in the EU)

If you're in the European Union, you have additional rights under GDPR:
- **Right to Access**: See what we know about you
- **Right to Rectification**: Correct inaccurate data
- **Right to Erasure**: "Right to be forgotten"
- **Right to Restrict Processing**: Limit how we use your data
- **Right to Portability**: Get your data in portable format
- **Right to Object**: Opt out of certain processing
- **Right to Complain**: Contact a data protection authority

Contact us: [DPO EMAIL]

---

## 6. Data Retention

### 6.1 Document Data

| Data Type | Retention Period |
|-----------|-----------------|
| Documents (Your ownership) | Until deleted by you |
| Documents (Cloud backup) | 90 days after deletion, then purged |
| AI Session History | 30 days (configurable per user) |
| Document Versions | 365 days (if versioning enabled) |

### 6.2 System Data

| Data Type | Retention Period |
|-----------|-----------------|
| Telemetry Events | 90 days |
| Error Logs | 30 days |
| Access Logs | 365 days |
| Audit Logs | 3 years (for compliance) |
| Backup Copies | 90 days |

### 6.3 Automatic Cleanup

- Ephemeral AI requests deleted after retention period expires
- Old telemetry events automatically archived
- Failed deletion requests retried for 90 days
- Backup files deleted per retention policy

---

## 7. Disclosure of Information

### 7.1 When We Share Your Data

We do NOT sell your personal data. We may share information:

**By Your Request**
- When you explicitly grant permission
- To AI providers you choose
- For document sharing/collaboration

**Legal Requirements**
- Law enforcement requests (with legal process)
- Court orders or government requests
- Protection of rights, privacy, safety

**Service Providers**
- Cloud hosting providers (encrypted)
- Email services (for notifications only)
- Payment processors (for subscriptions)

### 7.2 Third-Party Services

These services have access to limited information:

| Service | Access | Opt-Out |
|---------|--------|---------|
| Anthropic Claude | Selected text only | Use different provider |
| OpenAI GPT | Selected text only | Use different provider |
| Ollama (local) | N/A - local only | Default |
| Email (notifications) | Email only | Settings → Notifications |

---

## 8. Children's Privacy

Dictator is not intended for children under 13. We don't knowingly collect information from children under 13. If we become aware that a child under 13 has provided us information, we will delete it immediately.

**Parental Control**: If you're a parent and believe your child has accessed Dictator, please contact us immediately.

---

## 9. International Data Transfers

Dictator operates servers in [REGIONS]. Your information may be transferred to, stored in, and processed in these locations.

For international users: When we process your information outside your country, we implement appropriate safeguards:
- Standard Contractual Clauses (for EU data)
- Encryption ensuring you retain control
- Regular audits of cross-border transfers

---

## 10. Sensitive Data Handling

### 10.1 Automatic Detection

Dictator scans for sensitive patterns:
- Credit card numbers
- Social Security Numbers (SSN)
- API keys and tokens
- Private keys and certificates
- Database connection strings
- Phone numbers and email addresses
- Passwords and authentication tokens

### 10.2 User Warnings

When sensitive data is detected:
1. Warning dialog appears
2. You can choose to:
   - Proceed anyway (logged for audit trail)
   - Redact before sending (sensitive patterns removed)
   - Cancel and don't send

### 10.3 No Automatic Handling

We DO NOT automatically redact, remove, or report sensitive data. **You control what happens.**

---

## 11. Audit Trail & Compliance

### 11.1 What We Log

Privacy-related actions we track for audit purposes:
- When you export data
- When you request account deletion
- When sensitive data is detected
- When settings are changed
- When data is sent to AI providers
- When backups are created/deleted

### 11.2 Privacy Audit Log

You can view your privacy audit trail in Settings:
- "View Audit Log" shows all privacy-related actions
- Timestamps and action descriptions
- Exported with your data
- Cannot be modified (immutable log)

---

## 12. Contact Us

### 12.1 Privacy Questions

Email: privacy@[ORGANIZATION].com  
Address: [YOUR ADDRESS]  
Phone: [YOUR PHONE]

### 12.2 Data Protection Officer

If you have privacy concerns, contact our Data Protection Officer (DPO):  
Email: dpo@[ORGANIZATION].com

### 12.3 Complaints

You have the right to lodge a complaint with a data protection authority. If you're in the EU, you can file a complaint with your local supervisory authority.

---

## 13. Policy Changes

We may update this Privacy Policy from time to time. We will notify you of material changes by:
- Email notification (for account holders)
- In-app notification banner
- Updated "Last Updated" date

Your continued use after changes constitutes acceptance.

---

## 14. California Consumer Privacy Act (CCPA)

If you're a California resident, you have additional rights:

**Right to Know**: You can request what personal information we collect, use, and share.

**Right to Delete**: You can request deletion of personal information we've collected.

**Right to Opt-Out**: You can opt out of the sale/sharing of your personal information. (Note: We don't sell your personal data, but you can still opt out of data sharing).

**Right to Non-Discrimination**: We won't discriminate against you for exercising your CCPA rights.

**How to Submit Requests**:
- Email: ccpa@[ORGANIZATION].com
- Online: [CCPA REQUEST FORM URL]
- Phone: [YOUR PHONE]

---

## 15. Additional Resources

- **Privacy Architecture**: See PRIVACY_ARCHITECTURE.md for technical details
- **Integration Guide**: See PRIVACY_INTEGRATION_GUIDE.md for developers
- **Deployment Guide**: See PRIVACY_DEPLOYMENT_GUIDE.md for operators
- **Frequently Asked Questions**: [LINK TO FAQ]
- **Glossary**: Terms like "ephemeral," "provenance," "pseudonymization" are explained in the main documentation

---

## Acknowledgment

By using Dictator, you acknowledge that you have read this Privacy Policy and understand our privacy practices. If you don't agree with this policy, please don't use our service.

**Last Updated**: [DATE]  
**Effective Date**: [DATE]  
**Version**: 1.0

---

## Appendix A: Provider Policies Summary

### Anthropic (Claude)
- ✅ No model training on your data
- ✅ GDPR compliant
- ✅ 30-day retention by default
- ✅ Can delete data on request
- Learn more: https://www.anthropic.com/privacy

### OpenAI (GPT-4, etc.)
- ⚠️ Uses data for model improvement (unless opted out)
- ✅ GDPR compliant
- ✅ 30-day retention
- ✅ Can delete conversations
- Learn more: https://openai.com/policies/privacy-policy

### Ollama (Local)
- ✅ No data transmission (local processing)
- ✅ Fully private
- ✅ You control all data
- ✅ Open source
- Learn more: https://ollama.ai

---

## Appendix B: GDPR Compliance Checklist

- [ ] Privacy notice provided before data collection
- [ ] Consent obtained for non-essential processing
- [ ] Data processing agreement signed with processors
- [ ] Data protection impact assessment completed
- [ ] Legitimate interest assessment documented (where applicable)
- [ ] Data retention periods defined and enforced
- [ ] User rights (access, deletion, portability) implemented
- [ ] Data breach response plan in place
- [ ] Audit logs maintained
- [ ] DPO appointed (if applicable)
- [ ] International transfers documented and secured
- [ ] Third-party processor agreements reviewed

---

**This Privacy Policy is provided as a template. Customize it for your organization's specific implementation, jurisdiction, and data practices. Consult with a privacy attorney before publishing.**
