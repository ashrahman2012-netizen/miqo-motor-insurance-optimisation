export type LeadEmailInput = {
  interestYesUrl: string;
  interestNoUrl: string;
  unsubscribeUrl: string;
  privacyUrl: string;
  firstName?: string;
  companyName?: string;
  logoUrl?: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"\']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"\\"': "&quot;",
  "'": "&#39;",
}[char] ?? char));

export function renderLeadGenerationEmail(input: LeadEmailInput) {
  const company = escapeHtml(input.companyName ?? "MIQOS");
  const greeting = input.firstName ? "Hi " + escapeHtml(input.firstName) + "," : "Hello,";
  const logo = input.logoUrl
    ? '<img src="' + escapeHtml(input.logoUrl) + '" width="128" alt="' + company + '" style="display:block;border:0;max-width:128px;height:auto">'
    : '<div style="font:700 24px/1.2 Arial,sans-serif;letter-spacing:.04em">' + company + '</div>';

  const subject = "Could you be paying more than you need to for car insurance?";
  const preheader = "Before your next renewal, see whether the quotation itself can be optimised.";
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;background:#f4f6f8;color:#17212b;font-family:Arial,sans-serif">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + preheader + '</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden">' +
    '<tr><td style="padding:28px 32px 18px">' + logo + '<div style="margin-top:8px;font-size:12px;color:#5f6b76">Motor Insurance Quotation Optimisation</div></td></tr>' +
    '<tr><td style="padding:8px 32px 4px;font-size:16px;line-height:1.6">' + greeting + '</td></tr>' +
    '<tr><td style="padding:0 32px"><h1 style="font-size:30px;line-height:1.15;margin:18px 0 14px">Could you be paying more than you need to for your car insurance?</h1>' +
    '<p style="font-size:17px;line-height:1.6">Car insurance is essential. Paying unnecessarily more for it isn\'t.</p>' +
    '<p style="font-size:17px;line-height:1.6">' + company + ' helps drivers explore legitimate quotation choices before renewal to see whether a more competitive premium may be available.</p>' +
    '<p style="font-size:17px;line-height:1.6"><strong>Your factual information stays factual.</strong> ' + company + ' works on the choices around the quotation — not by changing the facts.</p></td></tr>' +
    '<tr><td style="padding:8px 32px 28px"><h2 style="font-size:21px;line-height:1.3">Do you currently own a car that needs insurance?</h2>' +
    '<p><a href="' + escapeHtml(input.interestYesUrl) + '" style="display:inline-block;background:#143d59;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">Yes — check my options</a></p>' +
    '<p><a href="' + escapeHtml(input.interestNoUrl) + '" style="color:#17212b">No — I do not need this</a></p>' +
    '<p style="font-size:13px;color:#5f6b76">It takes around 2 minutes to register your interest. There is no obligation to proceed.</p></td></tr>' +
    '<tr><td style="background:#eef4f7;padding:24px 32px"><strong>Why use ' + company + '?</strong>' +
    '<p style="font-size:14px;line-height:1.6">Explore legitimate quotation configurations, compare the resulting option with quotations you obtain elsewhere, and see clearly what changed and why.</p>' +
    '<p style="font-size:12px;line-height:1.6;color:#5f6b76">' + company + ' does not guarantee that every driver will receive a lower premium. Availability and pricing depend on individual circumstances, insurers and quotation criteria.</p></td></tr>' +
    '<tr><td style="padding:22px 32px;font-size:11px;line-height:1.6;color:#697681"><a href="' + escapeHtml(input.privacyUrl) + '">Privacy notice</a> · <a href="' + escapeHtml(input.unsubscribeUrl) + '">Unsubscribe</a></td></tr>' +
    '</table></td></tr></table></body></html>';

  const text = [
    greeting, "",
    "Could you be paying more than you need to for your car insurance?", "",
    "Car insurance is essential. Paying unnecessarily more for it isn't.",
    company + " helps drivers explore legitimate quotation choices before renewal to see whether a more competitive premium may be available.",
    "Your factual information stays factual. MIQOS works on the choices around the quotation — not by changing the facts.", "",
    "Do you currently own a car that needs insurance?",
    "YES — check my options: " + input.interestYesUrl,
    "NO: " + input.interestNoUrl, "",
    "MIQOS does not guarantee that every driver will receive a lower premium.", "",
    "Privacy: " + input.privacyUrl,
    "Unsubscribe: " + input.unsubscribeUrl,
  ].join("\n");

  return { subject, preheader, html, text };
}
