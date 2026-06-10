{{--
  ADD-Services — nouveau service (HTML e-mail, Laravel Blade).
  Variables : client_name, agency_name, service_name, service_url, publication_date (optionnel), deadline (optionnel), team_signature
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>E-Services — ADD-Services</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        @media only screen and (max-width: 620px) {
            .wrapper-table { width: 100% !important; }
            .card-shell { width: 100% !important; max-width: 100% !important; }
            .card-padding { padding: 24px 20px !important; }
            .header-padding { padding: 22px 20px !important; }
            .btn-td { display: block !important; }
        }
        .btn-primary:hover { background-color: #1d4ed8 !important; border-color: #1d4ed8 !important; }
        .btn-primary:focus { background-color: #1d4ed8 !important; border-color: #1d4ed8 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f1f5f9;opacity:0;">
        Nouveau service — {{ e($service_name) }}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="wrapper-table" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
                    <tr>
                        <td class="header-padding" align="center" style="padding:28px 24px;border-radius:12px 12px 0 0;background-color:#4f46e5;background-image:linear-gradient(135deg, #5b21b6 0%, #2563eb 55%, #1d4ed8 100%);">
                            <h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:0.02em;color:#ffffff;line-height:1.3;">
                                E-Services
                            </h1>
                            <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.88);line-height:1.4;">
                                ADD-Services
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="card-shell" style="background-color:#ffffff;border-radius:0 0 12px 12px;box-shadow:0 10px 40px rgba(15,23,42,0.08);border:1px solid #e2e8f0;border-top:none;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td class="card-padding" style="padding:36px 40px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#334155;">
                                        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#0f172a;">
                                            Bonjour {{ e($client_name) }},
                                        </p>
                                        <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#475569;">
                                            Nous vous informons que <strong style="color:#0f172a;">{{ e($agency_name) }}</strong> a mis en place un nouveau service sur votre espace personnel.
                                        </p>
                                        @if (! empty($publication_date))
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px;">
                                                <tr>
                                                    <td style="padding:14px 16px;background-color:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;border-left:4px solid #7c3aed;">
                                                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.5;color:#5b21b6;">
                                                            📅 Date de publication : {{ e($publication_date) }} (heure du Maroc)
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        @endif
                                        @if (! empty($deadline))
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">
                                                <tr>
                                                    <td style="padding:14px 16px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;border-left:4px solid #2563eb;">
                                                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.5;color:#1e3a8a;">
                                                            📅 Date limite : {{ e($deadline) }} (heure du Maroc)
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        @endif
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 26px;">
                                            <tr>
                                                <td style="padding:16px 18px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                                                    <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">
                                                        Service
                                                    </p>
                                                    <p style="margin:6px 0 0;font-size:17px;font-weight:600;color:#0f172a;line-height:1.4;">
                                                        {{ e($service_name) }}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#475569;">
                                            Accédez au service&nbsp;:
                                        </p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 32px;">
                                            <tr>
                                                <td class="btn-td" align="center" style="border-radius:10px;background-color:#2563eb;">
                                                    <!--[if mso]>
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ $service_url }}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="12%" fillcolor="#2563eb" stroke="f">
                                                        <w:anchorlock/>
                                                        <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">Accéder au service</center>
                                                    </v:roundrect>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-- -->
                                                    <a class="btn-primary" href="{{ $service_url }}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;border-radius:10px;background-color:#2563eb;border:2px solid #2563eb;line-height:1.35;mso-hide:all;">
                                                        Accéder au service
                                                    </a>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin:0;font-size:15px;line-height:1.65;color:#0f172a;">
                                            Cordialement,&nbsp;<span style="font-weight:600;">{{ e($team_signature) }}</span>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:0 40px 24px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="height:1px;background-color:#e2e8f0;font-size:0;line-height:0;">&nbsp;</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.55;color:#94a3b8;text-align:center;">
                                                    Ce message a été envoyé automatiquement. Merci de ne pas y répondre.
                                                </td>
                                            </tr>
                                        </table>
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
</html>
