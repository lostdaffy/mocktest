// The reel's voice-over, one line per scene. `say` is what the voice reads
// (brand and exam names written the way they should be spoken); `show` is
// the on-screen caption.
module.exports = {
  voice: "hi-IN-SwaraNeural",
  rate: "+15%",
  gapSec: 0.2, // silence after each line
  scenes: [
    { id: "hook", say: "सरकारी नौकरी की तैयारी? अब होगी स्मार्ट तरीके से!", show: ["सरकारी नौकरी की तैयारी?", "अब होगी स्मार्ट तरीके से!"] },
    { id: "exams", say: "रैंकवीर पर पाइए एस एस सी, रेलवे, यूपी पुलिस और यूपी टेट जैसे कई एग्ज़ाम्स के मॉक टेस्ट।", show: ["कई एग्ज़ाम्स के", "मॉक टेस्ट"] },
    { id: "practice", say: "हर चैप्टर की प्रैक्टिस, पिछले सालों के पेपर, और रोज़ नया जी के क्विज़।", show: ["चैप्टर प्रैक्टिस", "पिछले साल के पेपर", "रोज़ नया GK क्विज़"] },
    { id: "lang", say: "हिंदी और इंग्लिश, दोनों में, पूरे हल के साथ।", show: ["हिंदी + English", "पूरे हल के साथ"] },
    { id: "result", say: "अपना रिज़ल्ट और कमज़ोर टॉपिक, तुरंत देखिए।", show: ["रिज़ल्ट और", "कमज़ोर टॉपिक तुरंत"] },
    { id: "cta", say: "आज ही रैंकवीर डाउनलोड कीजिए, गूगल प्ले पर। शुरुआत बिल्कुल फ्री!", show: ["आज ही डाउनलोड करें", "शुरुआत बिल्कुल फ्री!"] },
  ],
};
