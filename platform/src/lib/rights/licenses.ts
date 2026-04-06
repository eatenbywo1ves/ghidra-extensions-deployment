export type LicenseType =
  | "ALL_RIGHTS_RESERVED"
  | "CC_BY"
  | "CC_BY_SA"
  | "CC_BY_NC"
  | "CC_BY_ND"
  | "CC_BY_NC_SA"
  | "CC_BY_NC_ND"
  | "PUBLIC_DOMAIN";

export interface LicenseDefinition {
  id: LicenseType;
  name: string;
  shortName: string;
  description: string;
  allowsCommercialUse: boolean;
  allowsDerivatives: boolean;
  requiresAttribution: boolean;
  requiresShareAlike: boolean;
  url: string | null;
}

export const LICENSES: Record<LicenseType, LicenseDefinition> = {
  ALL_RIGHTS_RESERVED: {
    id: "ALL_RIGHTS_RESERVED",
    name: "All Rights Reserved",
    shortName: "© All Rights Reserved",
    description:
      "You retain all exclusive rights. No one may copy, distribute, or create derivative works without explicit permission.",
    allowsCommercialUse: false,
    allowsDerivatives: false,
    requiresAttribution: false,
    requiresShareAlike: false,
    url: null,
  },
  CC_BY: {
    id: "CC_BY",
    name: "Creative Commons Attribution 4.0",
    shortName: "CC BY 4.0",
    description:
      "Others may distribute, remix, adapt, and build upon your work commercially and non-commercially, as long as they credit you.",
    allowsCommercialUse: true,
    allowsDerivatives: true,
    requiresAttribution: true,
    requiresShareAlike: false,
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
  CC_BY_SA: {
    id: "CC_BY_SA",
    name: "Creative Commons Attribution-ShareAlike 4.0",
    shortName: "CC BY-SA 4.0",
    description:
      "Others may remix and adapt for any purpose, even commercially, but must credit you and license derivatives under identical terms.",
    allowsCommercialUse: true,
    allowsDerivatives: true,
    requiresAttribution: true,
    requiresShareAlike: true,
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  CC_BY_NC: {
    id: "CC_BY_NC",
    name: "Creative Commons Attribution-NonCommercial 4.0",
    shortName: "CC BY-NC 4.0",
    description:
      "Others may remix and adapt non-commercially, and must credit you. Derivatives do not need the same license.",
    allowsCommercialUse: false,
    allowsDerivatives: true,
    requiresAttribution: true,
    requiresShareAlike: false,
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
  },
  CC_BY_ND: {
    id: "CC_BY_ND",
    name: "Creative Commons Attribution-NoDerivatives 4.0",
    shortName: "CC BY-ND 4.0",
    description:
      "Others may redistribute your work commercially and non-commercially, without modification, as long as they credit you.",
    allowsCommercialUse: true,
    allowsDerivatives: false,
    requiresAttribution: true,
    requiresShareAlike: false,
    url: "https://creativecommons.org/licenses/by-nd/4.0/",
  },
  CC_BY_NC_SA: {
    id: "CC_BY_NC_SA",
    name: "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
    shortName: "CC BY-NC-SA 4.0",
    description:
      "Others may remix non-commercially, must credit you, and license derivatives under the same terms.",
    allowsCommercialUse: false,
    allowsDerivatives: true,
    requiresAttribution: true,
    requiresShareAlike: true,
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },
  CC_BY_NC_ND: {
    id: "CC_BY_NC_ND",
    name: "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0",
    shortName: "CC BY-NC-ND 4.0",
    description:
      "Others may download and share your work with credit, but cannot change it or use it commercially.",
    allowsCommercialUse: false,
    allowsDerivatives: false,
    requiresAttribution: true,
    requiresShareAlike: false,
    url: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  },
  PUBLIC_DOMAIN: {
    id: "PUBLIC_DOMAIN",
    name: "Public Domain (CC0 1.0)",
    shortName: "CC0 / Public Domain",
    description:
      "You waive all copyright and related rights. Anyone can copy, modify, distribute, and perform the work without asking permission.",
    allowsCommercialUse: true,
    allowsDerivatives: true,
    requiresAttribution: false,
    requiresShareAlike: false,
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
};

export function getLicense(id: LicenseType): LicenseDefinition {
  return LICENSES[id];
}

export function formatCopyrightLine(
  authorName: string,
  year: number,
  licenseId: LicenseType
): string {
  const license = LICENSES[licenseId];
  if (licenseId === "ALL_RIGHTS_RESERVED") {
    return `© ${year} ${authorName}. All rights reserved.`;
  }
  if (licenseId === "PUBLIC_DOMAIN") {
    return `${authorName} (${year}). Released to the public domain.`;
  }
  return `© ${year} ${authorName}. Licensed under ${license.shortName}.`;
}
