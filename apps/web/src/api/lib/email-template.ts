import { escapeHtml } from './utils';

/**
 * `customerName` is plain text and is escaped here. Button URLs are escaped as
 * attribute values. Every other field is inserted as HTML, so callers must
 * escape any user-supplied text they interpolate into it.
 */
export interface EmailTemplateOptions {
  preheader?: string;
  badge?: string;
  badgeColor?: 'lime' | 'amber' | 'cyan' | 'purple' | 'red';
  title: string;
  subtitle?: string;
  customerName?: string;
  bodyHtml: string;
  buttonText?: string;
  buttonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  footerNotice?: string;
  showSocials?: boolean;
}

/**
 * Universal HTML Email Template Engine for CLAPCULTURE.
 * Provides a unified cyber-streetwear theme across all services:
 * Deep Black (#090909) / Soft Charcoal (#141414) / Electric Lime (#d2f000) / White (#ffffff)
 */
export function buildClapCultureEmailTemplate(options: EmailTemplateOptions): string {
  const {
    preheader = 'CLAPCULTURE — Premium Streetwear for the Rebels',
    badge = 'OFFICIAL DISPATCH',
    badgeColor = 'lime',
    title,
    subtitle,
    customerName,
    bodyHtml,
    buttonText,
    buttonUrl,
    secondaryButtonText,
    secondaryButtonUrl,
    footerNotice = 'You are receiving this communication regarding your activity on CLAPCULTURE.',
    showSocials = true,
  } = options;

  const badgeBg =
    badgeColor === 'amber' ? '#f59e0b' :
    badgeColor === 'cyan' ? '#06b6d4' :
    badgeColor === 'purple' ? '#a855f7' :
    badgeColor === 'red' ? '#ef4444' :
    '#d2f000';

  const badgeText =
    badgeColor === 'amber' || badgeColor === 'cyan' || badgeColor === 'lime' ? '#090909' : '#ffffff';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style type="text/css">
    /* CLIENT-SPECIFIC RESETS */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #050505; }

    /* TYPOGRAPHY */
    body {
      color: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }

    /* RESPONSIVE STYLES */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
      .headline {
        font-size: 24px !important;
        line-height: 1.2 !important;
      }
      .button-stack {
        display: block !important;
        width: 100% !important;
        margin-bottom: 10px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050505;">
  <!-- HIDDEN PREHEADER TEXT -->
  <div style="display: none; font-size: 1px; color: #050505; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050505; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 30px 12px 50px 12px;">
        
        <!-- MAIN CONTAINER (600px MAX) -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #121212; border: 1px solid #262626; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          
          <!-- 1. BRAND HEADER -->
          <tr>
            <td align="center" style="background-color: #0a0a0a; padding: 32px 24px; border-bottom: 2px solid #222222;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://clapculture.com" target="_blank" style="text-decoration: none;">
                      <div style="font-size: 32px; font-weight: 900; letter-spacing: 0.18em; color: #ffffff; text-transform: uppercase; font-family: 'Arial Black', -apple-system, sans-serif;">
                        CLAPCULTURE
                      </div>
                    </a>
                    <div style="display: inline-block; margin-top: 10px; background-color: ${badgeBg}; color: ${badgeText}; font-size: 10px; font-weight: 900; letter-spacing: 0.2em; padding: 4px 12px; text-transform: uppercase; border-radius: 3px; font-family: monospace;">
                      ${badge}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. CONTENT HERO SECTION -->
          <tr>
            <td class="mobile-padding" style="padding: 36px 36px 20px 36px;">
              ${customerName ? `
              <div style="font-size: 13px; font-weight: 700; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px;">
                HELLO ${escapeHtml(customerName.toUpperCase())},
              </div>` : ''}

              <h1 class="headline" style="font-size: 28px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 8px 0; line-height: 1.2; font-family: 'Arial Black', -apple-system, sans-serif;">
                ${title}
              </h1>

              ${subtitle ? `
              <div style="font-size: 14px; font-weight: 700; color: #d2f000; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 20px;">
                ${subtitle}
              </div>` : '<div style="height: 12px;"></div>'}

              <div style="color: #d4d4d4; font-size: 14px; line-height: 1.7;">
                ${bodyHtml}
              </div>
            </td>
          </tr>

          <!-- 3. ACTION CTA BUTTONS -->
          ${(buttonText && buttonUrl) ? `
          <tr>
            <td align="center" class="mobile-padding" style="padding: 10px 36px 32px 36px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: #d2f000;">
                    <a href="${escapeHtml(buttonUrl)}" target="_blank" class="button-stack" style="font-size: 13px; font-weight: 900; font-family: -apple-system, sans-serif; color: #090909; text-decoration: none; border-radius: 4px; padding: 14px 32px; border: 1px solid #d2f000; display: inline-block; text-transform: uppercase; letter-spacing: 0.12em;">
                      ${buttonText} &rarr;
                    </a>
                  </td>
                  ${(secondaryButtonText && secondaryButtonUrl) ? `
                  <td style="width: 12px;"></td>
                  <td align="center" style="border-radius: 4px; background-color: transparent;">
                    <a href="${escapeHtml(secondaryButtonUrl)}" target="_blank" class="button-stack" style="font-size: 13px; font-weight: 800; font-family: -apple-system, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 14px 24px; border: 1px solid #404040; display: inline-block; text-transform: uppercase; letter-spacing: 0.1em;">
                      ${secondaryButtonText}
                    </a>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- 4. FOOTER -->
          <tr>
            <td align="center" style="background-color: #0a0a0a; padding: 30px 24px; border-top: 1px solid #222222;">
              ${showSocials ? `
              <!-- Social Icons / Quick Nav -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="https://clapculture.com/shop" target="_blank" style="color: #737373; font-size: 11px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em;">SHOP</a>
                  </td>
                  <td style="color: #404040;">&bull;</td>
                  <td style="padding: 0 10px;">
                    <a href="https://clapculture.com/collections" target="_blank" style="color: #737373; font-size: 11px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em;">COLLECTIONS</a>
                  </td>
                  <td style="color: #404040;">&bull;</td>
                  <td style="padding: 0 10px;">
                    <a href="https://clapculture.com/track-order" target="_blank" style="color: #737373; font-size: 11px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em;">TRACK ORDER</a>
                  </td>
                  <td style="color: #404040;">&bull;</td>
                  <td style="padding: 0 10px;">
                    <a href="https://clapculture.com/contact" target="_blank" style="color: #737373; font-size: 11px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em;">SUPPORT</a>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Security / Transaction Notice -->
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #525252; line-height: 1.5; max-width: 480px;">
                ${footerNotice}
              </p>

              <!-- Need Help Box -->
              <p style="margin: 0; color: #737373; font-size: 11px;">
                Have questions? Reach us directly at <a href="mailto:clapcultureofficial@gmail.com" style="color: #d2f000; text-decoration: underline;">clapcultureofficial@gmail.com</a>
              </p>

              <!-- Copyright & Developer Credits -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #1a1a1a; padding-top: 16px;">
                <tr>
                  <td align="center" style="font-size: 11px; color: #525252; letter-spacing: 0.05em;">
                    &copy; ${new Date().getFullYear()} CLAPCULTURE. ALL RIGHTS RESERVED. <br/>
                    DESIGN & DEVELOPED BY <a href="https://vcard.stemlen.com/u/surendra" target="_blank" style="color: #d2f000; font-weight: 700; text-decoration: none;">SURENDRA.CODES</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
