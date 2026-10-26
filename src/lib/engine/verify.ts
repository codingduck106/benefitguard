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
} from '../types';
import { normalizeInput, type NormalizedInput } from './normalizer';
import { extractClaims } from './claim-extractor';
import { analyzeUrls } from './url-analyzer';
import { matchClaimsToSources } from './knowledge-matcher';

/** Finding id for "have your SSN ready" style messages. */
const HAVE_READY_ID = 'have-ready';

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

function generateSummaryTitle(assessment: OverallAssessment): { en: string; es: string } {
  const titles = {
    'scam-indicators': {
      en: 'Potential scam indicators found',
      es: 'Se encontraron indicadores potenciales de estafa',
    },
    'conflicts-found': {
      en: 'Conflicts with official guidance',
      es: 'Conflictos con la guía oficial',
    },
    'no-issues': {
      en: 'No issues identified in the available evidence',
      es: 'No se identificaron problemas en la evidencia disponible',
    },
    'insufficient-info': {
      en: 'Unable to verify — more information needed',
      es: 'No se puede verificar — se necesita más información',
    },
  };
  return titles[assessment];
}

function generateSummaryDescription(
  assessment: OverallAssessment,
  findings: Finding[],
  urlResults: UrlAnalysisResult[]
): { en: string; es: string } {
  const contradictions = findings.filter((f) => f.evidenceStatus === 'contradicted');
  const suspicious = findings.filter((f) => f.evidenceStatus === 'suspicious');
  const unapprovedUrls = urlResults.filter((u) => !u.isApproved);

  switch (assessment) {
    case 'scam-indicators':
      return {
        en: `This message contains ${contradictions.length} claim(s) that contradict official government policy and ${suspicious.length} suspicious indicator(s). ${unapprovedUrls.length > 0 ? `It also contains ${unapprovedUrls.length} URL(s) not from verified official domains.` : ''} Do not respond to this message or follow its instructions.`,
        es: `Este mensaje contiene ${contradictions.length} afirmación(es) que contradicen la política oficial del gobierno y ${suspicious.length} indicador(es) sospechoso(s). ${unapprovedUrls.length > 0 ? `También contiene ${unapprovedUrls.length} URL(s) que no pertenecen a dominios oficiales verificados.` : ''} No responda a este mensaje ni siga sus instrucciones.`,
      };
    case 'conflicts-found':
      return {
        en: `This message contains claims or elements that do not align with verified official government information. Review the detailed findings below before taking any action.`,
        es: `Este mensaje contiene afirmaciones o elementos que no se alinean con la información oficial verificada del gobierno. Revise los hallazgos detallados a continuación antes de tomar cualquier acción.`,
      };
    case 'no-issues':
      return {
        en: `No obvious scam indicators or policy contradictions were found in this message. However, this does not confirm the message is genuine — the sender's identity and the message's authenticity remain unverified through this analysis.`,
        es: `No se encontraron indicadores obvios de estafa ni contradicciones de políticas en este mensaje. Sin embargo, esto no confirma que el mensaje sea genuino — la identidad del remitente y la autenticidad del mensaje siguen sin verificar a través de este análisis.`,
      };
    case 'insufficient-info':
      return {
        en: `This message does not contain enough specific claims or details to verify against official sources. Contact the agency directly through independently obtained contact information to determine its authenticity.`,
        es: `Este mensaje no contiene suficientes afirmaciones o detalles específicos para verificar contra fuentes oficiales. Comuníquese directamente con la agencia a través de información de contacto obtenida independientemente para determinar su autenticidad.`,
      };
  }
}

// ─── Next Steps ──────────────────────────────────────────────────────────────

function generateNextSteps(
  assessment: OverallAssessment,
  findings: Finding[],
  urlResults: UrlAnalysisResult[]
): NextStep[] {
  const steps: NextStep[] = [];

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
  const hasEbtIssue = findings.some(
    (f) => /\bebt\b/i.test(f.claim) || f.officialSource?.url.includes('cdss.ca.gov')
  );
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

  steps.push({
    action: 'Contact your county office directly',
    actionEs: 'Comuníquese directamente con su oficina del condado',
    description: 'Use the phone number on the back of your Benefits Identification Card (BIC) or visit your county office in person.',
    descriptionEs: 'Use el número de teléfono en la parte posterior de su Tarjeta de Identificación de Beneficios (BIC) o visite su oficina del condado en persona.',
    priority: 'high',
  });

  steps.push({
    action: 'Visit the official Medi-Cal website',
    actionEs: 'Visite el sitio web oficial de Medi-Cal',
    description: 'For official information about your Medi-Cal coverage and renewal, go directly to the DHCS website.',
    descriptionEs: 'Para información oficial sobre su cobertura y renovación de Medi-Cal, vaya directamente al sitio web de DHCS.',
    url: 'https://www.dhcs.ca.gov/faqs/',
    priority: 'medium',
  });

  steps.push({
    action: 'Manage your benefits online',
    actionEs: 'Administre sus beneficios en línea',
    description: 'Use BenefitsCal.com to check your benefits status and complete renewals online.',
    descriptionEs: 'Use BenefitsCal.com para verificar el estado de sus beneficios y completar renovaciones en línea.',
    url: 'https://benefitscal.com',
    priority: 'medium',
  });

  // EBT messages get the CDSS reporting step instead.
  if ((assessment === 'scam-indicators' || assessment === 'conflicts-found') && !hasEbtIssue) {
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
  // Step 1: Normalize input
  const normalized = normalizeInput(request.messageContent);

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
  const findings = matchClaimsToSources(claims);

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
    });
  }

  // Findings from the AI advisor are added here, so the same rules derive the verdict.
  findings.push(...extraFindings);

  // Step 6: Generate overall assessment
  const assessment = generateAssessment(findings, urlResults, normalized);

  // Step 7: Generate response
  const summaryTitle = generateSummaryTitle(assessment);
  const summaryDescription = generateSummaryDescription(assessment, findings, urlResults);
  const nextSteps = generateNextSteps(assessment, findings, urlResults);
  const explanation = generateExplanation(assessment, findings, urlResults, normalized);

  return {
    overallAssessment: assessment,
    summaryTitle: summaryTitle.en,
    summaryTitleEs: summaryTitle.es,
    summaryDescription: summaryDescription.en,
    summaryDescriptionEs: summaryDescription.es,
    findings,
    urlAnalysis: urlResults,
    nextSteps,
    explanationOfResult: explanation.en,
    explanationOfResultEs: explanation.es,
    analyzedAt: new Date().toISOString(),
    disclaimer:
      'This analysis is informational only. It does not constitute an official fraud determination. BenefitGuard is not affiliated with any government agency. When in doubt, contact the relevant agency directly through independently obtained official contact information.',
    disclaimerEs:
      'Este análisis es solo informativo. No constituye una determinación oficial de fraude. BenefitGuard no está afiliado con ninguna agencia gubernamental. En caso de duda, comuníquese directamente con la agencia correspondiente a través de información de contacto oficial obtenida independientemente.',
  };
}
