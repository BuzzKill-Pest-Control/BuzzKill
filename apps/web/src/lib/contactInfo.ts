/**
 * The office's public contact details for the marketing site.
 *
 * Every public form ends with these two, clickable: a form is the slow path,
 * and someone who does not want to fill one in should never have to hunt for
 * the phone number or the inbox. The values come from the single company
 * record (amplify/functions/shared/company.ts), the same one the footer, the
 * legal pages, the JSON-LD graph, the emails, and the PDFs read, so a visitor
 * is never given two different "real" addresses for the same company.
 */
import {
  COMPANY,
  companyAddressLines,
  companyAddressOneLine,
} from "../../amplify/functions/shared/company";

export const OFFICE_PHONE = COMPANY.phone.display;
export const OFFICE_PHONE_PRETTY = COMPANY.phone.pretty;
export const OFFICE_TEL = COMPANY.phone.href;
export const OFFICE_EMAIL = COMPANY.email.address;
export const OFFICE_MAILTO = COMPANY.email.href;
export const OFFICE_ADDRESS_LINES = companyAddressLines();
export const OFFICE_ADDRESS = companyAddressOneLine();
