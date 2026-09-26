// Which language a subject's questions belong in.
//
// The generator wrote every question in English with a Hindi translation
// beside it, which is right for Maths and wrong for Hindi. A General Hindi
// test came out with ten of its twelve questions written in English - "Which
// of the following is a 'swar' (vowel) in Hindi?" - and seven of them with
// romanised options like "Vyakti vachak" instead of व्यक्तिवाचक. A student
// sitting a Hindi paper was being asked about Hindi, in English, in the one
// place where the language IS the subject.
//
// Nothing new has to be filled in for this: the catalog already says so. A
// Hindi subject either says "Hindi" in its name or has chapters written in
// Devanagari - व्याकरण, संधि, समास - and so does Sanskrit. English Pedagogy
// says neither, which is the point.

const DEVANAGARI = /[ऀ-ॿ]/;

const named = (s) => /\b(hindi|sanskrit|संस्कृत|हिंदी|हिन्दी)\b/i.test(String(s || ""));

const topicText = (t) => (typeof t === "string" ? t : String(t?.topic || ""));

/**
 * True when a subject's questions should be written in Hindi rather than
 * translated into it. Takes whatever of subject/topic/syllabusTopics is to
 * hand, so both the generator and the quality gate can ask the same question
 * of the same data.
 */
function isHindiMedium({ subject, topic, chapter, syllabusTopics } = {}) {
  const labels = [subject, topic, chapter];
  if (labels.some(named) || labels.some((l) => DEVANAGARI.test(String(l || "")))) return true;
  return (syllabusTopics || []).some((t) => named(topicText(t)) || DEVANAGARI.test(topicText(t)));
}

// Devanagari anywhere in the string. A Hindi question may legitimately carry
// English or digits - "CBSE", "2011", a quoted English word - so the test is
// "has Hindi in it", never "is only Hindi".
const hasDevanagari = (s) => DEVANAGARI.test(String(s || ""));

// An option with no letters at all - "42", "12.5%", "1:3" - is language
// neutral and must not be asked to be in Hindi.
const isLanguageNeutral = (s) => !/[A-Za-zऀ-ॿ]/.test(String(s || ""));

module.exports = { isHindiMedium, hasDevanagari, isLanguageNeutral, DEVANAGARI };
