/**
 * Verification Engine — Main orchestrator for the verification pipeline.
 * Combines normalizer, claim extractor, URL analyzer, knowledge matcher,
 * and assessment generator into a single verification flow.
 * 
 * Pipeline:
 * 1. Normalize input
 * 2. Extract claims
 * 3. Match claims to knowledge base
 * 4. Analyze URLs
 * 5. Generate overall assessment
 * 6. Build response
 */

import type {
  VerifyRequest,
  VerificationResponse,
  OverallAssessment,
  Finding,
  UrlAnalysisResult,
  NextStep,
  MessageContext,
  AlreadyResponded,
  Localized,
} from '../types';
import { normalizeInput, type NormalizedInput } from './normalizer';
import { extractClaims } from './claim-extractor';
import { analyzeUrls } from './url-analyzer';
import { matchClaimsToSources } from './knowledge-matcher';

/** Finding id for "have your SSN ready" style messages. */
const HAVE_READY_ID = 'have-ready';

/** The context the rules and the AI advisor both use. */
export function contextOf(request: VerifyRequest): MessageContext {
  return { channel: request.messageType, program: request.program, alreadyResponded: request.alreadyResponded };
}

// What to do now, for users who already responded. Shown first, whatever the verdict.
const RECOVERY_STEPS: Record<Exclude<AlreadyResponded, 'no'>, NextStep> = {
  paid: {
    action: 'You paid: contact your bank or payment company now',
    actionEs: 'Usted pagó: comuníquese ahora con su banco o compañía de pago',
    description: 'Call your bank, card company, or payment app (such as Zelle, Venmo, or Cash App) right away and ask them to stop or reverse the payment. If you paid with gift cards, contact the gift card company and keep the cards and receipts. Then report it at ReportFraud.ftc.gov.',
    descriptionEs: 'Llame de inmediato a su banco, compañía de tarjeta o aplicación de pago (como Zelle, Venmo o Cash App) y pida que detengan o reviertan el pago. Si pagó con tarjetas de regalo, comuníquese con la compañía de la tarjeta y guarde las tarjetas y los recibos. Luego repórtelo en ReportFraud.ftc.gov.',
    url: 'https://reportfraud.ftc.gov',
    priority: 'high',
  },
  'shared-info': {
    action: 'You shared personal information: act now',
    actionEs: 'Usted compartió información personal: actúe ahora',
    description: 'Go to IdentityTheft.gov to report it and get a recovery plan. If you shared your Social Security number, consider a free credit freeze with Equifax, Experian, and TransUnion. If you shared a password, change it. If you shared your EBT card number or PIN, change your PIN by calling the number on the back of your card and tell your county.',
    descriptionEs: 'Vaya a IdentityTheft.gov para reportarlo y obtener un plan de recuperación. Si compartió su número de Seguro Social, considere congelar su crédito gratis con Equifax, Experian y TransUnion. Si compartió una contraseña, cámbiela. Si compartió el número de su tarjeta EBT o su PIN, cambie su PIN llamando al número en la parte de atrás de su tarjeta e informe a su condado.',
    url: 'https://www.identitytheft.gov',
    priority: 'high',
  },
  clicked: {
    action: 'You clicked a link or called a number: stop there',
    actionEs: 'Usted hizo clic en un enlace o llamó a un número: no siga',
    description: 'Do not enter anything on that website or give anything on the call. If you entered a password, change it now, starting with your BenefitsCal and email accounts. Watch your benefits and bank accounts for changes you did not make.',
    descriptionEs: 'No escriba nada en ese sitio web ni dé información en la llamada. Si escribió una contraseña, cámbiela ahora, empezando por sus cuentas de BenefitsCal y de correo electrónico. Revise sus cuentas de beneficios y de banco para ver cambios que usted no hizo.',
    priority: 'high',
  },
  unsure: {
    action: 'Not sure if you responded? Check your accounts',
    actionEs: '¿No está seguro si respondió? Revise sus cuentas',
    description: 'Check your bank, payment apps, and BenefitsCal account for activity you do not recognize. If you find any, or remember paying or sharing information, report it at ReportFraud.ftc.gov and contact your county office.',
    descriptionEs: 'Revise su banco, sus aplicaciones de pago y su cuenta de BenefitsCal para ver actividad que no reconozca. Si encuentra algo, o recuerda haber pagado o compartido información, repórtelo en ReportFraud.ftc.gov y comuníquese con su oficina del condado.',
    url: 'https://reportfraud.ftc.gov',
    priority: 'high',
  },
};

/** Sentences with deadlines or pressure tactics, quoted so the user can judge them. */
function findPressure(normalized: NormalizedInput): string[] {
  const cues = [...normalized.urgencyPhrases, ...normalized.extractedDates].map((c) => c.toLowerCase());
  if (cues.length === 0) return [];
  return normalized.normalizedText
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => cues.some((c) => s.toLowerCase().includes(c)))
    .map((s) => (s.length > 160 ? `${s.slice(0, 157)}...` : s))
    .slice(0, 3);
}

// ─── Assessment Generator ────────────────────────────────────────────────────

function generateAssessment(
  findings: Finding[],
  urlResults: UrlAnalysisResult[],
  normalizedInput: NormalizedInput
): OverallAssessment {
  const hasContradictions = findings.some((f) => f.evidenceStatus === 'contradicted');
  const hasSuspicious = findings.some((f) => f.evidenceStatus === 'suspicious');
  const hasUnapprovedUrls = urlResults.some((u) => !u.isApproved && (u.isLookalike || u.isShortener));
  const hasPaymentRequests = findings.some(
    (f) => f.category === 'policy-contradiction' || 
           (f.evidenceStatus === 'suspicious' && f.claim.toLowerCase().includes('pay'))
  );
  const hasSensitiveInfoRequest = normalizedInput.hasSensitiveInfoRequest;

  // Scam indicators: contradicted claims + payment requests or sensitive info
  if (
    (hasContradictions && (hasPaymentRequests || hasSensitiveInfoRequest)) ||
    (hasSensitiveInfoRequest && hasSuspicious)
  ) {
    return 'scam-indicators';
  }

  // Conflicts: contradictions or suspicious URLs with suspicious claims
  if (hasContradictions || (hasUnapprovedUrls && hasSuspicious)) {
    return 'conflicts-found';
  }

  // Suspicious but no direct contradiction
  if (hasSuspicious || hasUnapprovedUrls) {
    return 'conflicts-found';
  }

  // No claims or findings at all — insufficient info
  if (findings.length === 0 && urlResults.length === 0) {
    return 'insufficient-info';
  }

  // Very few words and no specific claims
  if (normalizedInput.wordCount < 10 && findings.length === 0) {
    return 'insufficient-info';
  }

  // All findings are insufficient evidence
  if (findings.every((f) => f.evidenceStatus === 'insufficient')) {
    return 'insufficient-info';
  }

  return 'no-issues';
}

// ─── Summary Text Generation ─────────────────────────────────────────────────

// The four outcomes. None of them says a message is safe.
const OUTCOMES: Record<OverallAssessment, { title: Localized; description: Localized }> = {
  'scam-indicators': {
    title: { en: 'High risk', es: 'Riesgo alto' },
    description: {
      en: 'This message has strong signs of a scam or clearly conflicts with official guidance. Do not respond to it or follow its instructions.',
      es: 'Este mensaje tiene señales fuertes de estafa o contradice claramente la guía oficial. No responda ni siga sus instrucciones.',
    },
  },
  'conflicts-found': {
    title: { en: 'Suspicious', es: 'Sospechoso' },
    description: {
      en: 'This message has one or more warning signs, but they are not conclusive. Check it with an official contact you find yourself before you act.',
      es: 'Este mensaje tiene una o más señales de alerta, pero no son concluyentes. Verifíquelo con un contacto oficial que usted mismo busque antes de actuar.',
    },
  },
  'insufficient-info': {
    title: { en: 'Unable to verify', es: 'No se puede verificar' },
    description: {
      en: 'We could not find enough evidence either way. This does not mean the message is safe. Check it with an official contact you find yourself.',
      es: 'No encontramos suficiente evidencia en ningún sentido. Esto no significa que el mensaje sea seguro. Verifíquelo con un contacto oficial que usted mismo busque.',
    },
  },
  'no-issues': {
    title: { en: 'No significant red flags detected', es: 'No se detectaron señales de alerta importantes' },
    description: {
      en: 'We found no strong warning signs. This is not a guarantee that the message is real, because we cannot confirm who sent it.',
      es: 'No encontramos señales de alerta fuertes. Esto no garantiza que el mensaje sea real, porque no podemos confirmar quién lo envió.',
    },
  },
};

/** What this check could not establish, so the user knows its limits. */
function generateUncertainties(
  findings: Finding[],
  urlResults: UrlAnalysisResult[],
  normalized: NormalizedInput,
  context: MessageContext
): Localized[] {
  const items: Localized[] = [
    {
      en: 'Who sent this message. We cannot confirm the sender from the text alone.',
      es: 'Quién envió este mensaje. No podemos confirmar el remitente solo con el texto.',
    },
  ];
  if (findings.some((f) => f.officialSource && f.officialSource.verificationStatus !== 'verified')) {
    items.push({
      en: 'One official statement we cite could not be confirmed on the official website recently.',
      es: 'Una declaración oficial que citamos no se pudo confirmar recientemente en el sitio web oficial.',
    });
  }
  for (const u of urlResults.filter((u) => !u.isApproved && !u.isLookalike).slice(0, 2)) {
    items.push({
      en: `Whether ${u.hostname} is safe. It is not on our list of official websites, which alone does not make it a scam.`,
      es: `Si ${u.hostname} es seguro. No está en nuestra lista de sitios web oficiales, lo cual por sí solo no lo convierte en una estafa.`,
    });
  }
  if (normalized.extractedPhoneNumbers.length > 0) {
    items.push({
      en: 'Whether the phone number in this message is official. Compare it with the number on your card or an official website.',
      es: 'Si el número de teléfono de este mensaje es oficial. Compárelo con el número de su tarjeta o de un sitio web oficial.',
    });
  }
  if (normalized.extractedDates.length > 0) {
    items.push({
      en: 'Whether the date or deadline in this message is real. Check it with the agency using a contact you find yourself.',
      es: 'Si la fecha o el plazo de este mensaje es real. Verifíquelo con la agencia usando un contacto que usted mismo busque.',
    });
  }
  if (findings.length === 0) {
    items.push({
      en: 'Most of this message. It has few specific claims or requests we can check against official sources.',
      es: 'La mayor parte de este mensaje. Tiene pocas afirmaciones o solicitudes específicas que podamos comparar con fuentes oficiales.',
    });
  }
  if (context.program) {
    items.push({
      en: 'The program you selected. We used it as you gave it.',
      es: 'El programa que usted seleccionó. Lo usamos tal como lo indicó.',
    });
  }
  return items;
}

// ─── Next Steps ──────────────────────────────────────────────────────────────

function generateNextSteps(
  assessment: OverallAssessment,
  findings: Finding[],
  context: MessageContext
): NextStep[] {
  const steps: NextStep[] = [];
  const flagged = assessment === 'scam-indicators' || assessment === 'conflicts-found';
  const { program } = context;
  const isMediCal = !program || program === 'medi-cal' || program === 'other';
  // Medi-Cal and CalFresh are run by counties and use BenefitsCal; Medicare and health plans are not.
  const isCountyRun = program !== 'medicare' && program !== 'health-plan';

  if (context.alreadyResponded && context.alreadyResponded !== 'no') {
    steps.push(RECOVERY_STEPS[context.alreadyResponded]);
  }

  if (context.channel === 'call') {
    steps.push({
      action: 'Do not trust caller ID',
      actionEs: 'No confíe en el identificador de llamadas',
      description: 'Scammers can make a call look like it comes from an official number. Hang up and call the number on the back of your Benefits Identification Card (BIC) or your county office yourself.',
      descriptionEs: 'Los estafadores pueden hacer que una llamada parezca venir de un número oficial. Cuelgue y llame usted mismo al número en la parte de atrás de su Tarjeta de Identificación de Beneficios (BIC) o a su oficina del condado.',
      priority: 'high',
    });
  }

  // Shown first: the message prepares the user to give sensitive data on a call.
  if (findings.some((f) => f.id === HAVE_READY_ID)) {
    steps.push({
      action: 'Only share personal information on a call you made',
      actionEs: 'Solo comparta información personal en una llamada que usted hizo',
      description: 'Never give your Social Security number or other personal information to someone who calls you, even if they say they are from Medi-Cal or your county. Hang up and call the number on the back of your Benefits Identification Card (BIC) or your county office yourself.',
      descriptionEs: 'Nunca dé su número de Seguro Social ni otra información personal a alguien que le llame, aunque diga que es de Medi-Cal o de su condado. Cuelgue y llame usted mismo al número en la parte de atrás de su Tarjeta de Identificación de Beneficios (BIC) o a su oficina del condado.',
      priority: 'high',
    });
  }
  const hasPaymentIssue = findings.some(
    (f) => f.claim.toLowerCase().includes('pay') || f.claim.toLowerCase().includes('fee') || f.claim.toLowerCase().includes('$')
  );
  const hasSensitiveInfoIssue = findings.some(
    (f) => f.id !== HAVE_READY_ID && (f.claim.toLowerCase().includes('pin') || f.claim.toLowerCase().includes('password') || f.claim.toLowerCase().includes('social security'))
  );

  if (assessment === 'scam-indicators' || assessment === 'conflicts-found') {
    steps.push({
      action: 'Do not respond to the message',
      actionEs: 'No responda al mensaje',
      description: 'Do not reply, click links, or provide any information requested in this message.',
      descriptionEs: 'No responda, no haga clic en enlaces ni proporcione ninguna información solicitada en este mensaje.',
      priority: 'high',
    });
  }

  if (hasPaymentIssue) {
    steps.push({
      action: 'Do not make any payment',
      actionEs: 'No realice ningún pago',
      description: 'Medi-Cal renewal is free. You should never have to pay a fee to renew your Medi-Cal coverage.',
      descriptionEs: 'La renovación de Medi-Cal es gratuita. Nunca debería tener que pagar una tarifa para renovar su cobertura de Medi-Cal.',
      priority: 'high',
    });
  }

  if (hasSensitiveInfoIssue) {
    steps.push({
      action: 'Do not share sensitive information',
      actionEs: 'No comparta información confidencial',
      description: 'Never share your EBT PIN, Social Security number, or passwords via text, email, or phone unless you initiated the contact through a verified official channel.',
      descriptionEs: 'Nunca comparta su PIN de EBT, número de Seguro Social o contraseñas por mensaje de texto, correo electrónico o teléfono a menos que usted haya iniciado el contacto a través de un canal oficial verificado.',
      priority: 'high',
    });
  }

  // EBT (CalFresh/CalWORKs) is run by CDSS, not Medi-Cal, and has its own PIN-change and reporting steps.
  const hasEbtIssue =
    findings.some((f) => /\bebt\b/i.test(f.claim) || f.officialSource?.url.includes('cdss.ca.gov')) ||
    (program === 'calfresh-ebt' && flagged);
  if (hasEbtIssue) {
    steps.push({
      action: 'Protect your EBT card',
      actionEs: 'Proteja su tarjeta EBT',
      description: 'The state and your county never text or call to ask for your EBT card number or PIN. If you shared them, change your PIN right away by calling the EBT customer service line on the back of your card, and contact your county if benefits are missing. You can report the message to CDSS at CDSSEBT@dss.ca.gov.',
      descriptionEs: 'El estado y su condado nunca le envían mensajes de texto ni le llaman para pedirle el número de su tarjeta EBT o su PIN. Si los compartió, cambie su PIN de inmediato llamando a la línea de servicio al cliente de EBT que aparece en la parte de atrás de su tarjeta, y comuníquese con su condado si faltan beneficios. Puede reportar el mensaje a CDSS en CDSSEBT@dss.ca.gov.',
      url: 'https://www.cdss.ca.gov/ebt-safety',
      priority: 'high',
    });
  }

  if (isCountyRun) {
    steps.push({
      action: 'Contact your county office directly',
      actionEs: 'Comuníquese directamente con su oficina del condado',
      description: 'Use the phone number on the back of your Benefits Identification Card (BIC) or visit your county office in person.',
      descriptionEs: 'Use el número de teléfono en la parte posterior de su Tarjeta de Identificación de Beneficios (BIC) o visite su oficina del condado en persona.',
      priority: 'high',
    });
  }

  if (program === 'health-plan') {
    steps.push({
      action: 'Contact your health plan directly',
      actionEs: 'Comuníquese directamente con su plan de salud',
      description: 'Call the member services number on your health plan ID card, or log in to your plan account by typing its address yourself.',
      descriptionEs: 'Llame al número de servicios para miembros que aparece en la tarjeta de identificación de su plan de salud, o entre a su cuenta del plan escribiendo usted mismo la dirección.',
      priority: 'high',
    });
  }

  if (program === 'medicare') {
    steps.push({
      action: 'Contact Medicare directly',
      actionEs: 'Comuníquese directamente con Medicare',
      description: 'Medicare is a federal program, separate from Medi-Cal. Use the phone number on your Medicare card or the paperwork Medicare mailed you, not a number from this message.',
      descriptionEs: 'Medicare es un programa federal, distinto de Medi-Cal. Use el número de teléfono de su tarjeta de Medicare o de los documentos que Medicare le envió por correo, no un número de este mensaje.',
      priority: 'high',
    });
  }

  if (isMediCal) {
    steps.push({
      action: 'Visit the official Medi-Cal website',
      actionEs: 'Visite el sitio web oficial de Medi-Cal',
      description: 'For official information about your Medi-Cal coverage and renewal, go directly to the DHCS website.',
      descriptionEs: 'Para información oficial sobre su cobertura y renovación de Medi-Cal, vaya directamente al sitio web de DHCS.',
      url: 'https://www.dhcs.ca.gov/faqs/',
      priority: 'medium',
    });
  }

  if (isCountyRun) {
    steps.push({
      action: 'Manage your benefits online',
      actionEs: 'Administre sus beneficios en línea',
      description: 'Use BenefitsCal.com to check your benefits status and complete renewals online.',
      descriptionEs: 'Use BenefitsCal.com para verificar el estado de sus beneficios y completar renovaciones en línea.',
      url: 'https://benefitscal.com',
      priority: 'medium',
    });
  }

  // EBT messages get the CDSS reporting step instead.
  if (flagged && isMediCal && !hasEbtIssue) {
    steps.push({
      action: 'Report it to the Medi-Cal fraud hotline',
      actionEs: 'Repórtelo a la línea directa de fraude de Medi-Cal',
      description: 'DHCS asks people to report suspected Medi-Cal fraud, including anyone asking for money to complete a renewal, to the Medi-Cal fraud hotline at (800) 822-6222. The call is free and you can stay anonymous.',
      descriptionEs: 'DHCS pide reportar cualquier sospecha de fraude de Medi-Cal, incluida cualquier persona que pida dinero para completar una renovación, a la línea directa de fraude de Medi-Cal al (800) 822-6222. La llamada es gratuita y puede permanecer en el anonimato.',
      url: 'https://www.dhcs.ca.gov/individuals/do-you-suspect-medi-cal-fraud-report-it/',
      priority: 'medium',
    });
  }

  if (assessment === 'scam-indicators') {
    steps.push({
      action: 'Report the suspicious message',
      actionEs: 'Reporte el mensaje sospechoso',
      description: 'Consider reporting scam messages to your county office and the FTC at reportfraud.ftc.gov.',
      descriptionEs: 'Considere reportar mensajes de estafa a su oficina del condado y a la FTC en reportfraud.ftc.gov.',
      url: 'https://reportfraud.ftc.gov',
      priority: 'low',
    });
  }

  return steps;
}

// ─── Result Explanation ──────────────────────────────────────────────────────

function generateExplanation(
  assessment: OverallAssessment,
  findings: Finding[],
  urlResults: UrlAnalysisResult[],
  normalizedInput: NormalizedInput
): { en: string; es: string } {
  const parts: string[] = [];
  const partsEs: string[] = [];

  parts.push(`BenefitGuard analyzed the message and identified ${findings.length} verifiable claim(s) and ${urlResults.length} URL(s).`);
  partsEs.push(`BenefitGuard analizó el mensaje e identificó ${findings.length} afirmación(es) verificable(s) y ${urlResults.length} URL(s).`);

  const contradictions = findings.filter((f) => f.evidenceStatus === 'contradicted');
  if (contradictions.length > 0) {
    parts.push(`${contradictions.length} claim(s) directly contradict verified official government policies.`);
    partsEs.push(`${contradictions.length} afirmación(es) contradicen directamente las políticas oficiales verificadas del gobierno.`);
  }

  const suspicious = findings.filter((f) => f.evidenceStatus === 'suspicious');
  if (suspicious.length > 0) {
    parts.push(`${suspicious.length} element(s) show patterns commonly associated with scams.`);
    partsEs.push(`${suspicious.length} elemento(s) muestran patrones comúnmente asociados con estafas.`);
  }

  const unapprovedUrls = urlResults.filter((u) => !u.isApproved);
  if (unapprovedUrls.length > 0) {
    parts.push(`${unapprovedUrls.length} URL(s) are not from verified official government domains.`);
    partsEs.push(`${unapprovedUrls.length} URL(s) no pertenecen a dominios oficiales verificados del gobierno.`);
  }

  if (normalizedInput.hasUrgencyIndicators) {
    parts.push('The message uses urgent or threatening language to pressure immediate action.');
    partsEs.push('El mensaje utiliza lenguaje urgente o amenazante para presionar una acción inmediata.');
  }

  parts.push('Each finding is based on comparison with specific official sources, which are cited below. This analysis does not verify the identity of the message sender.');
  partsEs.push('Cada hallazgo se basa en la comparación con fuentes oficiales específicas, que se citan a continuación. Este análisis no verifica la identidad del remitente del mensaje.');

  return { en: parts.join(' '), es: partsEs.join(' ') };
}

// ─── Main Verification Function ──────────────────────────────────────────────

export function verifyMessage(
  request: VerifyRequest,
  extraFindings: Finding[] = []
): VerificationResponse {
  const context = contextOf(request);

  // Step 1: Normalize input
  const base = normalizeInput(request.messageContent);
  // On a call, the caller's number can't be checked against the card, so "have it ready" is a request.
  const normalized: NormalizedInput =
    context.channel === 'call' && base.sensitiveInfoReadyTypes.length > 0
      ? {
          ...base,
          sensitiveInfoTypes: [...base.sensitiveInfoTypes, ...base.sensitiveInfoReadyTypes],
          sensitiveInfoReadyTypes: [],
          hasSensitiveInfoRequest: true,
        }
      : base;

  // Collect all URLs (from message text + optional URL field)
  const allUrls = [...normalized.extractedUrls];
  if (request.url && request.url.length > 0) {
    if (!allUrls.includes(request.url)) {
      allUrls.push(request.url);
    }
  }

  // Step 2: Extract claims
  const claims = extractClaims(normalized);

  // Step 3 & 4: Match claims against knowledge base
  const findings = matchClaimsToSources(claims, context.program);

  // Step 5: Analyze URLs
  const urlResults = analyzeUrls(allUrls);

  // Add URL analysis findings
  for (const urlResult of urlResults) {
    if (!urlResult.isApproved) {
      findings.push({
        id: `url-${urlResult.hostname}`,
        claim: `Message contains URL: ${urlResult.url}`,
        reason: urlResult.notes,
        evidenceStatus: urlResult.isLookalike ? 'suspicious' : 'insufficient',
        evidenceStrength: urlResult.isLookalike || urlResult.isShortener ? 'moderate' : 'weak',
        evidenceExplanation: urlResult.isLookalike
          ? 'This domain is not verified as an official government domain and may be designed to impersonate one.'
          : 'This domain is not on the list of verified official government domains.',
        recommendedAction: 'Do not click this link. Navigate directly to the official website by typing the address yourself.',
        recommendedActionEs: 'No haga clic en este enlace. Navegue directamente al sitio web oficial escribiendo la dirección usted mismo.',
        category: 'url-analysis',
        rule: urlResult.isLookalike ? 'lookalike-link' : urlResult.isShortener ? 'shortened-link' : 'unapproved-link',
      });
    }
  }

  // A caution, not a red flag: it never changes the verdict on its own.
  if (normalized.sensitiveInfoReadyTypes.length > 0) {
    findings.push({
      id: HAVE_READY_ID,
      claim: `Asks you to have this ready: ${normalized.sensitiveInfoReadyTypes.join(', ')}`,
      reason: 'The message does not ask you to send this information, but it prepares you to give it on a call. Scammers use this too.',
      evidenceStatus: 'insufficient',
      evidenceStrength: 'none',
      evidenceExplanation: 'Legitimate offices sometimes ask you to have documents ready. Who you share them with is what matters.',
      recommendedAction: 'Only share it on a call you made yourself to the number on the back of your Benefits Identification Card (BIC) or to your county office. If someone calls you, hang up and call that official number.',
      recommendedActionEs: 'Compártala solo en una llamada que usted haya hecho al número en la parte de atrás de su Tarjeta de Identificación de Beneficios (BIC) o a su oficina del condado. Si alguien le llama, cuelgue y llame a ese número oficial.',
      category: 'informational',
      rule: 'have-ready',
    });
  }

  // Findings from the AI advisor are added here, so the same rules derive the verdict.
  findings.push(...extraFindings);

  // Step 6: Generate overall assessment
  const assessment = generateAssessment(findings, urlResults, normalized);

  // Step 7: Generate response
  const outcome = OUTCOMES[assessment];
  const nextSteps = generateNextSteps(assessment, findings, context);
  const explanation = generateExplanation(assessment, findings, urlResults, normalized);

  return {
    overallAssessment: assessment,
    summaryTitle: outcome.title.en,
    summaryTitleEs: outcome.title.es,
    summaryDescription: outcome.description.en,
    summaryDescriptionEs: outcome.description.es,
    findings,
    urlAnalysis: urlResults,
    nextSteps,
    explanationOfResult: explanation.en,
    explanationOfResultEs: explanation.es,
    pressure: findPressure(normalized),
    uncertainties: generateUncertainties(findings, urlResults, normalized, context),
    analyzedAt: new Date().toISOString(),
    disclaimer:
      'This analysis is informational only. It does not constitute an official fraud determination. BenefitGuard is not affiliated with any government agency. When in doubt, contact the relevant agency directly through independently obtained official contact information.',
    disclaimerEs:
      'Este análisis es solo informativo. No constituye una determinación oficial de fraude. BenefitGuard no está afiliado con ninguna agencia gubernamental. En caso de duda, comuníquese directamente con la agencia correspondiente a través de información de contacto oficial obtenida independientemente.',
  };
}
