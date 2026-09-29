// The department's own emblem for each exam, so a student finds their exam
// by the logo they already know from the notification and the admit card,
// not by reading a list of codes.
//
// Normalised copies in assets/logos (192px WebP on a transparent square) -
// the originals in assets/all-logo were seven different sizes, one of them a
// 1.3 MB PNG and one a .jfif that Metro will not bundle at all.
//
// Several exams share a department: every SSC paper carries the SSC emblem.
const SSC = require("../../assets/logos/ssc.webp");

const EXAM_LOGOS = {
  SSC_CGL: SSC,
  SSC_CHSL: SSC,
  SSC_MTS: SSC,
  SSC_GD: SSC,
  RAILWAY: require("../../assets/logos/rrb.webp"),
  BANKING: require("../../assets/logos/ibps.webp"),
  CTET: require("../../assets/logos/ctet.webp"),
  UP_POLICE: require("../../assets/logos/up-police.webp"),
  UPSSSC_PET: require("../../assets/logos/upsssc.webp"),
  AGNIVEER_GD: require("../../assets/logos/army.webp"),
};

/**
 * The emblem for an exam code, or null.
 *
 * Matches on the family too, so a post added later from the admin panel -
 * SSC_CPO, say, or AGNIVEER_TECHNICAL - still gets its department's logo
 * without anyone touching this file.
 */
export function examLogo(examType) {
  if (!examType) return null;
  if (EXAM_LOGOS[examType]) return EXAM_LOGOS[examType];
  const code = String(examType).toUpperCase();
  if (code.startsWith("SSC")) return SSC;
  if (code.startsWith("AGNIVEER") || code.includes("ARMY")) return EXAM_LOGOS.AGNIVEER_GD;
  if (code.startsWith("UPSSSC")) return EXAM_LOGOS.UPSSSC_PET;
  if (code.startsWith("UP_POLICE") || code.startsWith("UPP")) return EXAM_LOGOS.UP_POLICE;
  if (code.startsWith("RRB") || code.startsWith("RAILWAY")) return EXAM_LOGOS.RAILWAY;
  if (code.startsWith("IBPS") || code.startsWith("BANK")) return EXAM_LOGOS.BANKING;
  if (code.includes("TET")) return EXAM_LOGOS.CTET;
  return null;
}
