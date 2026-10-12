// Terms agreement. Bump TERMS_VERSION whenever the Privacy and Terms text changes materially; everyone is asked again.
export const TERMS_VERSION = "2026-10-12";
export const needsAgreement = (stored: string | null) => stored !== TERMS_VERSION;
