/**
 * Simple Regex-based redaction pipeline.
 * In a real production app, this would use named entity recognition (NER) models.
 */

// Matches generic phone patterns
const PHONE_REGEX = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
// Matches generic ID patterns (e.g., S1234567A)
const ID_REGEX = /[A-Z]\d{7}[A-Z]/g;
// Matches likely names (Capitalized words in sequence - very naive for demo)
// Note: We won't use a regex for names here to avoid over-redacting common words, 
// but we assume the System Prompt will also be instructed to ignore PII.
// For the demo, we strictly redact specific patterns.

export const redactPII = (text: string): string => {
  let redacted = text;
  
  redacted = redacted.replace(PHONE_REGEX, '[REDACTED_PHONE]');
  redacted = redacted.replace(ID_REGEX, '[REDACTED_ID]');
  
  // Simulated name redaction for specific demo names
  redacted = redacted.replace(/\b(John Doe|Jane Smith|Alice|Bob)\b/gi, '[REDACTED_NAME]');

  return redacted;
};