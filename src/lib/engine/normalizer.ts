/**
 * Input Normalizer — Step 1 of the verification pipeline.
 * Normalizes whitespace, extracts URLs, phone numbers, dates,
 * money amounts, and sensitive information requests.
 * 
 * SECURITY: Never logs raw message contents.
 */

export interface NormalizedInput {
  normalizedText: string;
  extractedUrls: string[];
  extractedPhoneNumbers: string[];
  extractedDates: string[];
  extractedMoneyAmounts: string[];
  hasSensitiveInfoRequest: boolean;
  sensitiveInfoTypes: string[];
  hasUrgencyIndicators: boolean;
  urgencyPhrases: string[];
  wordCount: number;
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
// Links written without a scheme, e.g. "bit.ly/abc" or "benefitscal.com". Skips email addresses.
const BARE_URL_REGEX = /(?<![@\w./-])(?:[a-z0-9-]+\.)+(?:com|net|org|info|gov|ly|co|io|us|me|link|app|site|online|help|xyz|top|click|live|shop|support|biz|cc)\b(?:\/[^\s<>"]*)?/gi;
const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?[2-9]\d{2}\)?[-.\s]?)?[2-9]\d{2}[-.\s]?\d{4}/g;
const DATE_REGEX = /(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{2,4})/gi;
const MONEY_REGEX = /\$\s?\d+(?:\.\d{2})?|\d+\s*(?:dollars?|d[oó]lares|USD)/gi;

// Sentences that warn the user ("Never share your PIN") mention sensitive data without asking for it.
const WARNING_REGEX = /\b(?:never|nunca|do\s+not|don'?t)\s+(?:\w+\s+){0,2}(?:share|give|send|tell|comparta|d[eé]|env[ií]e|diga)|\bno\s+(?:comparta|d[eé]|env[ií]e|diga)\b/i;

/** Undo common OCR or obfuscation noise so patterns still match ("y0ur", "r e n e w a l", "$ 35"). */
function undoOcrNoise(text: string): string {
  const digitToLetter: Record<string, string> = { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't' };
  return text
    .replace(/\b(?:[A-Za-z] ){2,}[A-Za-z]\b/g, (m) => m.replace(/ /g, ''))
    .replace(/(?<=[a-z])[0-9](?=[a-z])/gi, (d) => digitToLetter[d] ?? d)
    .replace(/\$\s+(?=\d)/g, '$');
}

const SENSITIVE_INFO_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /\b(?:social\s*security\s*(?:number)?|SSN)\b/i, type: 'Social Security number' },
  { pattern: /\b(?:EBT\s*PIN|PIN\s*number|your\s*PIN)\b/i, type: 'EBT PIN' },
  { pattern: /\b(?:password|passcode|login\s*credentials?)\b/i, type: 'password' },
  { pattern: /\b(?:bank\s*account|routing\s*number|account\s*number)\b/i, type: 'bank account information' },
  { pattern: /\b(?:credit\s*card|debit\s*card|card\s*number)\b/i, type: 'credit/debit card' },
  { pattern: /\b(?:date\s*of\s*birth|DOB|birth\s*date)\b/i, type: 'date of birth' },
  { pattern: /\b(?:driver'?s?\s*license|DL\s*number)\b/i, type: "driver's license" },
  // Spanish
  { pattern: /\b(?:seguro\s+social)\b/i, type: 'Social Security number' },
  { pattern: /\b(?:su|tu|el)\s+PIN\b/i, type: 'EBT PIN' },
  { pattern: /\b(?:contrase[nñ]a|clave\s+de\s+acceso)/i, type: 'password' },
  { pattern: /\b(?:cuenta\s+bancaria|n[uú]mero\s+de\s+(?:su\s+)?cuenta)/i, type: 'bank account information' },
  { pattern: /\bn[uú]mero\s+de\s+(?:su\s+)?tarjeta/i, type: 'credit/debit card' },
  { pattern: /\bfecha\s+de\s+nacimiento\b/i, type: 'date of birth' },
  { pattern: /\b(?:your|su|tu)\s+social\b(?!\s+(?:services?|worker|media))/i, type: 'Social Security number' },
  { pattern: /\blicencia\s+de\s+(?:manejar|conducir)\b/i, type: "driver's license" },
  { pattern: /\b(?:verification|security|one[-\s]?time|\d-digit)\s+code\b|\bc[oó]digo\s+de\s+(?:\d+\s+d[ií]gitos|verificaci[oó]n|seguridad)/i, type: 'one-time verification code' },
  { pattern: /\b(?:sign|log)\s+in\s+(?:with|to)\s+your\s+bank\b|\binicie\s+sesi[oó]n\s+(?:con|en)\s+su\s+banco\b/i, type: 'online banking login' },
  // Remote-access software (any language)
  { pattern: /\b(?:AnyDesk|TeamViewer|remote\s+access|acceso\s+remoto)\b/i, type: 'remote access to your device' },
];

const URGENCY_PATTERNS: RegExp[] = [
  /\b(?:immediately|right\s*now|today|urgent|URGENT)\b/i,
  /\b(?:expire|expir(?:ed|es|ing))\b/i,
  /\b(?:terminat(?:e|ed|ing|ion))\b/i,
  /\b(?:cancel(?:ed|led|lation)?)\b/i,
  /\b(?:last\s*chance|final\s*notice|final\s*warning)\b/i,
  /\b(?:act\s*now|respond\s*immediately|time\s*is\s*running\s*out)\b/i,
  /\b(?:within\s*\d+\s*(?:hours?|minutes?|days?))\b/i,
  /\b(?:or\s*(?:your|you\s*will)\s*(?:lose|forfeit))\b/i,
];

export function normalizeInput(rawText: string): NormalizedInput {
  // Step 1: Normalize whitespace (preserve line breaks for readability)
  const cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Pattern matching runs on a de-noised copy; URLs are read from cleanText so their spelling is kept.
  const normalizedText = undoOcrNoise(cleanText);

  // Step 2: Extract URLs
  const schemeUrls = cleanText.match(URL_REGEX) || [];
  const bareUrls = (cleanText.replace(URL_REGEX, ' ').match(BARE_URL_REGEX) || []).map(
    (u) => `https://${u.replace(/[.,;:!?)]+$/, '')}`
  );
  const extractedUrls = [...new Set([...schemeUrls, ...bareUrls])];

  // Step 3: Extract phone numbers
  const extractedPhoneNumbers = [...new Set(normalizedText.match(PHONE_REGEX) || [])];

  // Step 4: Extract dates
  const extractedDates = [...new Set(normalizedText.match(DATE_REGEX) || [])];

  // Step 5: Extract money amounts
  const extractedMoneyAmounts = [...new Set(normalizedText.match(MONEY_REGEX) || [])];

  // Step 6: Check for sensitive information requests
  const requestText = normalizedText
    .split(/(?<=[.!?\n])\s+/)
    .filter((sentence) => !WARNING_REGEX.test(sentence))
    .join(' ');
  const sensitiveInfoTypes: string[] = [];
  for (const { pattern, type } of SENSITIVE_INFO_PATTERNS) {
    if (pattern.test(requestText) && !sensitiveInfoTypes.includes(type)) {
      sensitiveInfoTypes.push(type);
    }
  }

  // Step 7: Check for urgency indicators
  const urgencyPhrases: string[] = [];
  for (const pattern of URGENCY_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      urgencyPhrases.push(match[0]);
    }
  }

  return {
    normalizedText,
    extractedUrls,
    extractedPhoneNumbers,
    extractedDates,
    extractedMoneyAmounts,
    hasSensitiveInfoRequest: sensitiveInfoTypes.length > 0,
    sensitiveInfoTypes,
    hasUrgencyIndicators: urgencyPhrases.length > 0,
    urgencyPhrases,
    wordCount: normalizedText.split(/\s+/).filter(Boolean).length,
  };
}
