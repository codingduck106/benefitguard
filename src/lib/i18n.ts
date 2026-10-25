export type Locale = 'en' | 'es';

export const translations = {
  en: {
    // Navigation
    nav: {
      home: 'Home',
      check: 'Check a Message',
      resources: 'Official Resources',
      learn: 'Learn',
      language: 'Español',
    },
    // Home page
    home: {
      headline: 'Check a benefits message before you trust it.',
      subheadline:
        'BenefitGuard compares claims in text messages, emails, and letters against verified official government information to help you determine if a benefits communication is consistent with official guidance.',
      cta: 'Check a Message',
      howItWorks: 'How it works',
      step1Title: 'Paste the message',
      step1Desc: 'Copy and paste the text of the message you received. Remove any personal information first.',
      step2Title: 'We compare with official sources',
      step2Desc: 'Each claim is checked against verified government policies and known official domains.',
      step3Title: 'Review the evidence',
      step3Desc: 'See exactly which claims match or conflict with official guidance, with sources cited.',
      learnTitle: 'Learn how to spot scams',
      learnDesc: 'Common tactics used in benefits scams and how to protect yourself.',
      learnCta: 'View safety tips',
      supportedTitle: 'Currently supported',
      supportedMediCal: 'Medi-Cal enrollment and renewal',
      supportedMore: 'More benefits programs coming soon',
      privacyTitle: 'Your privacy',
      privacyText:
        'Messages you paste are checked by our rules and sent to an AI service (Anthropic\'s Claude) to help explain the result. BenefitGuard does not save your messages, but the AI provider may keep them for a limited time under its own policies. Remove all personal information before submitting.',
      disclaimerText:
        'BenefitGuard is an independent tool and is not affiliated with, endorsed by, or connected to any government agency. Results are informational and do not constitute an official fraud determination.',
    },
    // Check page
    check: {
      title: 'Check a benefits message',
      subtitle:
        'Paste the text of a message you received about your benefits. We will compare its claims against official government information.',
      privacyWarning:
        'Before pasting, remove your name, member ID, Social Security number, address, date of birth, passwords, and other personal information.',
      messageLabel: 'Message content',
      messagePlaceholder: 'Paste the text of the message here...',
      urlLabel: 'URL from the message (optional)',
      urlPlaceholder: 'https://example.com',
      typeLabel: 'Message type',
      topicLabel: 'Topic',
      checkButton: 'Check Message',
      clearButton: 'Clear',
      checking: 'Checking...',
      sampleLabel: 'Load a sample message',
      sampleSelect: 'Select a sample...',
      screenshotLabel: 'Or upload or paste a screenshot',
      screenshotHelp:
        'Choose an image or take a photo. On a computer you can also drag it here or paste it with Ctrl+V / ⌘V. Text is read on your device; the image is not uploaded or stored. The first time, this downloads about 10 MB of text-reading data, so Wi-Fi is best. Check the text below before submitting.',
      screenshotButton: 'Choose image',
      screenshotReading: 'Reading text from image...',
      screenshotNoText: 'No text could be read from that image. Try a clearer screenshot or type the message.',
      screenshotError: 'Could not read that image. Please try another file or type the message.',
      screenshotNotImage: 'Please choose an image file.',
      errorRequired: 'Please enter a message to check.',
      errorTooLong: 'Message must be under 5,000 characters.',
      errorUrl: 'Please enter a valid URL or leave blank.',
      types: {
        text: 'Text message',
        email: 'Email',
        letter: 'Letter',
        website: 'Website',
      },
      topics: {
        'medi-cal-enrollment': 'Medi-Cal enrollment',
        'medi-cal-renewal': 'Medi-Cal renewal',
        'payment-request': 'Payment request',
        'benefit-card': 'Benefit card',
        other: 'Other',
      },
    },
    // Results
    results: {
      title: 'Verification Results',
      backToCheck: '← Check another message',
      assessments: {
        'scam-indicators': {
          title: 'Potential scam indicators found',
          description:
            'This message contains elements commonly associated with scams, such as requests for payment or sensitive personal information that conflict with official government policy.',
        },
        'conflicts-found': {
          title: 'Conflicts with official guidance',
          description:
            'One or more claims in this message appear to contradict verified official government information.',
        },
        'no-issues': {
          title: 'No issues identified in the available evidence',
          description:
            'No obvious scam indicators or policy contradictions were found. However, this does not confirm the message is genuine. The sender and authenticity remain unverified.',
        },
        'insufficient-info': {
          title: 'Unable to verify — more information needed',
          description:
            'The message does not contain enough specific claims or details to verify against official sources.',
        },
      },
      findingsTitle: 'Detailed Findings',
      aiBadge: 'Flagged by AI',
      aiTitle: 'AI explanation',
      aiNote:
        'Generated by an AI model from the findings above. AI can make mistakes; it can add warnings but cannot remove findings from the rule checks.',
      claimLabel: 'Claim or indicator:',
      reasonLabel: 'Why this was flagged:',
      sourceLabel: 'Official source:',
      evidenceLabel: 'Evidence:',
      lastVerifiedLabel: 'Last verified:',
      unverifiedSourceNote: 'We could not confirm this statement on the official website recently. Treat it as general guidance.',
      strengthLabel: 'Evidence strength:',
      actionLabel: 'Recommended action:',
      urlTitle: 'URL Analysis',
      nextStepsTitle: 'What should I do next?',
      whyTitle: 'Why did we reach this result?',
      evidenceStrength: {
        strong: 'Strong — directly supported by verified official source',
        moderate: 'Moderate — consistent with official guidance but not a direct match',
        weak: 'Weak — based on general patterns, not a specific official source',
        none: 'None — no official source available for this claim',
      },
      evidenceStatus: {
        supported: 'Supported by official source',
        contradicted: 'Contradicted by official source',
        suspicious: 'Suspicious indicator',
        insufficient: 'Insufficient evidence',
      },
      disclaimer:
        'This analysis is informational only and does not constitute an official fraud determination. When in doubt, contact the agency directly through independently obtained contact information.',
    },
    // Resources page
    resources: {
      title: 'Official Resources',
      subtitle:
        'Trusted government resources for verifying benefits information. Only confirmed official sources are listed.',
      searchPlaceholder: 'Search resources...',
      agencyLabel: 'Agency:',
      topicLabel: 'Topic:',
      urlLabel: 'Official URL:',
      descriptionLabel: 'Verifies:',
      lastVerifiedLabel: 'Last verified:',
      statusLabel: 'Status:',
      statuses: {
        verified: 'Verified',
        unverified: 'Requires verification',
        stale: 'Needs re-verification',
        unavailable: 'Currently unavailable',
      },
    },
    // Learn page
    learn: {
      title: 'How to Spot Benefits Scams',
      subtitle:
        'Learn to recognize common tactics used in benefits-related scams and how to protect yourself.',
      importantNote:
        'Important: Legitimate government communications can also contain deadlines and requests for action. Urgency alone does not prove a message is a scam. Always verify through official channels.',
      sections: [
        {
          title: 'Requests for payment to renew benefits',
          content:
            'Medi-Cal renewal is free. You should never have to pay a fee to renew your Medi-Cal coverage. If a message asks you to pay to keep your benefits, that is a strong indicator of a scam.',
          icon: '💳',
        },
        {
          title: 'Requests for PINs or passwords',
          content:
            'Government agencies will never ask for your EBT PIN, passwords, or Social Security number via text message, email, or unsolicited phone calls. If someone asks for these, do not respond.',
          icon: '🔒',
        },
        {
          title: 'Suspicious shortened URLs',
          content:
            'Scam messages often include shortened URLs (like bit.ly or tinyurl.com links) to hide the real destination. Official government communications typically use full .gov or official agency domains.',
          icon: '🔗',
        },
        {
          title: 'Urgent threats of losing coverage',
          content:
            'Messages that threaten immediate loss of coverage unless you act right now are designed to make you panic and skip verification. While legitimate notices may include deadlines, they typically give you reasonable time to respond.',
          icon: '⚠️',
        },
        {
          title: 'Fake government impersonation',
          content:
            'Scammers may use official-sounding names, logos, or language to appear legitimate. Always verify by navigating directly to the official agency website — type the address yourself instead of clicking links in messages.',
          icon: '🏛️',
        },
        {
          title: 'How to navigate to an official agency website',
          content:
            'Instead of clicking any link in a message, open your browser and type the official website address directly. For Medi-Cal, go to dhcs.ca.gov. For your benefits account, go to BenefitsCal.com. You can also call your county office using the number on the back of your Benefits Identification Card.',
          icon: '🌐',
        },
      ],
    },
    // Footer
    footer: {
      disclaimer:
        'BenefitGuard is not affiliated with any government agency. This tool provides informational analysis only.',
      privacy: 'Privacy',
      terms: 'Terms',
      about: 'About',
    },
  },
  es: {
    nav: {
      home: 'Inicio',
      check: 'Verificar un Mensaje',
      resources: 'Recursos Oficiales',
      learn: 'Aprender',
      language: 'English',
    },
    home: {
      headline: 'Verifique un mensaje sobre beneficios antes de confiar en él.',
      subheadline:
        'BenefitGuard compara las afirmaciones en mensajes de texto, correos electrónicos y cartas con información oficial verificada del gobierno para ayudarle a determinar si una comunicación sobre beneficios es consistente con la guía oficial.',
      cta: 'Verificar un Mensaje',
      howItWorks: 'Cómo funciona',
      step1Title: 'Pegue el mensaje',
      step1Desc: 'Copie y pegue el texto del mensaje que recibió. Elimine cualquier información personal primero.',
      step2Title: 'Comparamos con fuentes oficiales',
      step2Desc: 'Cada afirmación se verifica contra políticas gubernamentales verificadas y dominios oficiales conocidos.',
      step3Title: 'Revise la evidencia',
      step3Desc: 'Vea exactamente qué afirmaciones coinciden o contradicen la guía oficial, con fuentes citadas.',
      learnTitle: 'Aprenda a detectar estafas',
      learnDesc: 'Tácticas comunes utilizadas en estafas de beneficios y cómo protegerse.',
      learnCta: 'Ver consejos de seguridad',
      supportedTitle: 'Actualmente soportado',
      supportedMediCal: 'Inscripción y renovación de Medi-Cal',
      supportedMore: 'Más programas de beneficios próximamente',
      privacyTitle: 'Su privacidad',
      privacyText:
        'Los mensajes que pegue se revisan con nuestras reglas y se envían a un servicio de IA (Claude, de Anthropic) para ayudar a explicar el resultado. BenefitGuard no guarda sus mensajes, pero el proveedor de IA puede conservarlos por un tiempo limitado según sus propias políticas. Elimine toda información personal antes de enviar.',
      disclaimerText:
        'BenefitGuard es una herramienta independiente y no está afiliada, respaldada ni conectada con ninguna agencia gubernamental. Los resultados son informativos y no constituyen una determinación oficial de fraude.',
    },
    check: {
      title: 'Verificar un mensaje de beneficios',
      subtitle:
        'Pegue el texto de un mensaje que recibió sobre sus beneficios. Compararemos sus afirmaciones con información oficial del gobierno.',
      privacyWarning:
        'Antes de pegar, elimine su nombre, número de miembro, número de Seguro Social, dirección, fecha de nacimiento, contraseñas y otra información personal.',
      messageLabel: 'Contenido del mensaje',
      messagePlaceholder: 'Pegue el texto del mensaje aquí...',
      urlLabel: 'URL del mensaje (opcional)',
      urlPlaceholder: 'https://ejemplo.com',
      typeLabel: 'Tipo de mensaje',
      topicLabel: 'Tema',
      checkButton: 'Verificar Mensaje',
      clearButton: 'Borrar',
      checking: 'Verificando...',
      sampleLabel: 'Cargar un mensaje de ejemplo',
      sampleSelect: 'Seleccione un ejemplo...',
      screenshotLabel: 'O suba o pegue una captura de pantalla',
      screenshotHelp:
        'Elija una imagen o tome una foto. En una computadora también puede arrastrarla aquí o pegarla con Ctrl+V / ⌘V. El texto se lee en su dispositivo; la imagen no se sube ni se guarda. La primera vez se descargan unos 10 MB de datos para leer texto, así que es mejor usar Wi-Fi. Revise el texto antes de enviarlo.',
      screenshotButton: 'Elegir imagen',
      screenshotReading: 'Leyendo texto de la imagen...',
      screenshotNoText: 'No se pudo leer texto de esa imagen. Pruebe con una captura más clara o escriba el mensaje.',
      screenshotError: 'No se pudo leer esa imagen. Pruebe con otro archivo o escriba el mensaje.',
      screenshotNotImage: 'Por favor elija un archivo de imagen.',
      errorRequired: 'Por favor ingrese un mensaje para verificar.',
      errorTooLong: 'El mensaje debe tener menos de 5,000 caracteres.',
      errorUrl: 'Por favor ingrese una URL válida o deje el campo vacío.',
      types: {
        text: 'Mensaje de texto',
        email: 'Correo electrónico',
        letter: 'Carta',
        website: 'Sitio web',
      },
      topics: {
        'medi-cal-enrollment': 'Inscripción en Medi-Cal',
        'medi-cal-renewal': 'Renovación de Medi-Cal',
        'payment-request': 'Solicitud de pago',
        'benefit-card': 'Tarjeta de beneficios',
        other: 'Otro',
      },
    },
    results: {
      title: 'Resultados de Verificación',
      backToCheck: '← Verificar otro mensaje',
      assessments: {
        'scam-indicators': {
          title: 'Se encontraron indicadores potenciales de estafa',
          description:
            'Este mensaje contiene elementos comúnmente asociados con estafas, como solicitudes de pago o información personal confidencial que contradicen la política oficial del gobierno.',
        },
        'conflicts-found': {
          title: 'Conflictos con la guía oficial',
          description:
            'Una o más afirmaciones en este mensaje parecen contradecir información oficial verificada del gobierno.',
        },
        'no-issues': {
          title: 'No se identificaron problemas en la evidencia disponible',
          description:
            'No se encontraron indicadores obvios de estafa ni contradicciones de políticas. Sin embargo, esto no confirma que el mensaje sea genuino. El remitente y la autenticidad siguen sin verificar.',
        },
        'insufficient-info': {
          title: 'No se puede verificar — se necesita más información',
          description:
            'El mensaje no contiene suficientes afirmaciones o detalles específicos para verificar contra fuentes oficiales.',
        },
      },
      findingsTitle: 'Hallazgos Detallados',
      aiBadge: 'Señalado por IA',
      aiTitle: 'Explicación de IA',
      aiNote:
        'Generado por un modelo de IA a partir de los hallazgos anteriores. La IA puede cometer errores; puede agregar advertencias, pero no puede eliminar hallazgos de las verificaciones de reglas.',
      claimLabel: 'Afirmación o indicador:',
      reasonLabel: 'Por qué se marcó:',
      sourceLabel: 'Fuente oficial:',
      evidenceLabel: 'Evidencia:',
      lastVerifiedLabel: 'Última verificación:',
      unverifiedSourceNote: 'No pudimos confirmar esta declaración en el sitio web oficial recientemente. Tómela como orientación general.',
      strengthLabel: 'Fuerza de la evidencia:',
      actionLabel: 'Acción recomendada:',
      urlTitle: 'Análisis de URL',
      nextStepsTitle: '¿Qué debo hacer a continuación?',
      whyTitle: '¿Por qué llegamos a este resultado?',
      evidenceStrength: {
        strong: 'Fuerte — respaldado directamente por fuente oficial verificada',
        moderate: 'Moderado — consistente con la guía oficial pero no es coincidencia directa',
        weak: 'Débil — basado en patrones generales, no en fuente oficial específica',
        none: 'Ninguna — no hay fuente oficial disponible para esta afirmación',
      },
      evidenceStatus: {
        supported: 'Respaldado por fuente oficial',
        contradicted: 'Contradice fuente oficial',
        suspicious: 'Indicador sospechoso',
        insufficient: 'Evidencia insuficiente',
      },
      disclaimer:
        'Este análisis es solo informativo y no constituye una determinación oficial de fraude. En caso de duda, contacte a la agencia directamente a través de información de contacto obtenida independientemente.',
    },
    resources: {
      title: 'Recursos Oficiales',
      subtitle:
        'Recursos gubernamentales confiables para verificar información sobre beneficios. Solo se listan fuentes oficiales confirmadas.',
      searchPlaceholder: 'Buscar recursos...',
      agencyLabel: 'Agencia:',
      topicLabel: 'Tema:',
      urlLabel: 'URL oficial:',
      descriptionLabel: 'Verifica:',
      lastVerifiedLabel: 'Última verificación:',
      statusLabel: 'Estado:',
      statuses: {
        verified: 'Verificado',
        unverified: 'Requiere verificación',
        stale: 'Necesita re-verificación',
        unavailable: 'Actualmente no disponible',
      },
    },
    learn: {
      title: 'Cómo Detectar Estafas de Beneficios',
      subtitle:
        'Aprenda a reconocer tácticas comunes utilizadas en estafas relacionadas con beneficios y cómo protegerse.',
      importantNote:
        'Importante: Las comunicaciones gubernamentales legítimas también pueden contener plazos y solicitudes de acción. La urgencia por sí sola no demuestra que un mensaje sea una estafa. Siempre verifique a través de canales oficiales.',
      sections: [
        {
          title: 'Solicitudes de pago para renovar beneficios',
          content:
            'La renovación de Medi-Cal es gratuita. Nunca debería tener que pagar una tarifa para renovar su cobertura de Medi-Cal. Si un mensaje le pide que pague para mantener sus beneficios, es un fuerte indicador de estafa.',
          icon: '💳',
        },
        {
          title: 'Solicitudes de PINs o contraseñas',
          content:
            'Las agencias gubernamentales nunca le pedirán su PIN de EBT, contraseñas o número de Seguro Social por mensaje de texto, correo electrónico o llamadas telefónicas no solicitadas. Si alguien le pide estos datos, no responda.',
          icon: '🔒',
        },
        {
          title: 'URLs acortadas sospechosas',
          content:
            'Los mensajes de estafa a menudo incluyen URLs acortadas (como enlaces de bit.ly o tinyurl.com) para ocultar el destino real. Las comunicaciones oficiales del gobierno generalmente usan dominios .gov o de agencias oficiales completos.',
          icon: '🔗',
        },
        {
          title: 'Amenazas urgentes de perder cobertura',
          content:
            'Los mensajes que amenazan con la pérdida inmediata de cobertura a menos que actúe de inmediato están diseñados para causar pánico y saltarse la verificación. Si bien los avisos legítimos pueden incluir plazos, generalmente le dan un tiempo razonable para responder.',
          icon: '⚠️',
        },
        {
          title: 'Suplantación de identidad gubernamental',
          content:
            'Los estafadores pueden usar nombres, logotipos o lenguaje que suenen oficiales para parecer legítimos. Siempre verifique navegando directamente al sitio web oficial de la agencia — escriba la dirección usted mismo en lugar de hacer clic en enlaces de mensajes.',
          icon: '🏛️',
        },
        {
          title: 'Cómo navegar a un sitio web oficial de una agencia',
          content:
            'En lugar de hacer clic en cualquier enlace en un mensaje, abra su navegador y escriba la dirección del sitio web oficial directamente. Para Medi-Cal, vaya a dhcs.ca.gov. Para su cuenta de beneficios, vaya a BenefitsCal.com. También puede llamar a su oficina del condado usando el número en la parte posterior de su Tarjeta de Identificación de Beneficios.',
          icon: '🌐',
        },
      ],
    },
    footer: {
      disclaimer:
        'BenefitGuard no está afiliado con ninguna agencia gubernamental. Esta herramienta proporciona solo análisis informativo.',
      privacy: 'Privacidad',
      terms: 'Términos',
      about: 'Acerca de',
    },
  },
} as const;

export function t(locale: Locale) {
  return translations[locale];
}
