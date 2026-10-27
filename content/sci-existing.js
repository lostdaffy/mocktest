// The Simple & Compound Interest practice questions already on the server
// (admin API, 2026-10-27): the four Mixed Practice #1 tests, 12 questions
// each, made by the AI. New questions must not repeat them.
module.exports = {
  ids: {
    easy: "6ab670c773daa241b30fb5c4",
    medium: "6ab6719173daa241b30fb5e9",
    hard: "6ab6732573daa241b30fb626",
    advanced: "6ab6756d73daa241b30fb667",
  },
  texts: [
    // easy
    "Find the simple interest on Rs. 5000 at a rate of 10% per annum for 3 years.",
    "A sum of Rs. 2000 amounts to Rs. 2200 in 1 year at simple interest. What is the rate of interest?",
    "Calculate the compound interest on Rs. 1000 at 10% per annum for 2 years compounded annually.",
    "If a sum of money doubles itself in 5 years at simple interest, what is the rate of interest per annum?",
    "What is the difference between simple and compound interest on Rs. 2000 for 2 years at 10% per annum?",
    "The compound interest on Rs. 4000 at 5% per annum for 2 years is:",
    "Find the simple interest on Rs. 800 at 5% per annum for 4 years.",
    "At what rate percent per annum will a sum of Rs. 1000 amount to Rs. 1300 in 3 years at simple interest?",
    "What sum of money will amount to Rs. 600 in 2 years at 5% per annum simple interest?",
    "If a sum of money amounts to Rs. 1210 in 2 years at 10% compound interest, what is the principal?",
    "A sum of ₹5,000 is invested at a simple interest rate of 10% per annum for 3 years. What is the total simple interest earned?",
    "What will be the compound interest on ₹10,000 at 10% per annum for 2 years, compounded annually?",
    // medium
    "A sum of money becomes 3 times itself in 5 years at simple interest. In how many years will it become 6 times itself at the same rate of interest?",
    "The difference between simple interest and compound interest on a sum of Rs 8,000 for 2 years at 5% per annum is:",
    "A sum of money doubles itself in 4 years at compound interest. In how many years will it become 8 times itself?",
    "The simple interest on a sum of money at 8% per annum for 4 years is Rs 2,400. What will be the simple interest on the same sum at 10% per annum for 3 years?",
    "If the compound interest on a certain sum for 2 years at 12% per annum is Rs 2,544, what is the simple interest on the same sum for the same period at the same rate?",
    "At what rate percent per annum will a sum of money double itself in 8 years at simple interest?",
    "What is the difference between simple and compound interest on Rs 20,000 for 3 years at 10% per annum?",
    "A sum of money doubles itself in 5 years at a certain rate of simple interest. In how many years will it become 4 times of itself at the same rate of interest?",
    "The compound interest on a certain sum for 2 years at 10% per annum is Rs. 420. What would be the simple interest on the same sum at the same rate for the same period?",
    "The simple interest on a sum of money for 2 years at 8% per annum is Rs. 400. What would be the compound interest on the same sum at the same rate for the same period?",
    "A sum of money invested at simple interest amounts to Rs. 800 in 3 years and Rs. 920 in 4 years. Find the principal amount.",
    "A sum becomes Rs. 1,331 in 3 years at 10% per annum compound interest, compounded annually. Find the principal.",
    // hard
    "The simple interest on a sum of money for 2 years at 12% per annum is Rs. 1200. What will be the compound interest on the same sum for the same period at the same rate, compounded annually?",
    "A sum was put at simple interest at a certain rate for 3 years. Had it been put at 2% higher rate, it would have fetched Rs. 360 more. Find the sum.",
    "The difference between simple and compound interest on a sum of money for 2 years at 5% per annum is Rs. 15. What is the sum?",
    "A sum of Rs. 10,000 is lent in two parts: one at 8% p.a. simple interest and the other at 10% p.a. simple interest. If the total annual interest is Rs. 920, find the amount lent at 8%.",
    "A sum of money doubles itself in 5 years at simple interest. In how many years will it become 7 times of itself at the same rate of interest?",
    "The compound interest on a certain sum for 2 years at 10% per annum is Rs. 2100. What would be the simple interest on the same sum at the same rate for the same period?",
    "A sum of Rs. 8000 is invested at 5% per annum compound interest, compounded annually. What is the difference between the compound interest for the 3rd year and the 2nd year?",
    "The simple interest on a sum for 8 years at 12% per annum is Rs. 19200. What will be the compound interest on the same sum at 10% per annum for 2 years, compounded annually?",
    "A sum of money amounts to Rs. 4840 in 2 years and Rs. 5324 in 3 years at compound interest compounded annually. Find the rate of interest per annum.",
    "A sum of money becomes 1.331 times of itself in 3 years when invested at compound interest, compounded annually. If the same sum is invested at the same rate of interest under simple interest, in how many years will it become 1.6 times of itself?",
    "The simple interest on a sum of money for 2 years at 8% per annum is Rs. 2400. What will be the compound interest on the same sum at the same rate for the same period?",
    "A sum of Rs. 10,000 is borrowed at 10% per annum compound interest, compounded half-yearly. What will be the amount to be paid after 1.5 years?",
    // advanced
    "A sum of Rs 15,000 is invested in two schemes. Scheme A offers 10% p.a. simple interest and Scheme B offers 12% p.a. simple interest. After 2 years, the total interest earned is Rs 3,360. Find the amount invested in Scheme A.",
    "A sum of money invested at compound interest doubles itself in 4 years. In how many years will it become 16 times itself?",
    "The difference between Simple Interest and Compound Interest (compounded annually) on a certain sum of money for 2 years at 8% per annum is Rs 128. Find the sum.",
    "A sum of Rs 10,000 amounts to Rs 13,310 in 3 years at a certain rate of compound interest compounded annually. Find the rate percent per annum.",
    "The simple interest on a sum of money for 3 years at 6% per annum is Rs 675. What will be the compound interest on the same sum at the same rate for 2 years?",
    "A sum of money is lent for 3 years at 10% per annum compound interest. If the difference between the interest of the third year and the interest of the second year is Rs 132, what is the principal sum?",
    "The compound interest on Rs 20,000 at 20% per annum for 9 months, compounded quarterly, is:",
    "A man borrows Rs 5,000 at 12% p.a. simple interest. He lends it immediately to another person at 12% compound interest compounded half-yearly. What is his gain after 1 year?",
    "If the difference between CI and SI on a sum for 3 years at 10% per annum is Rs 93, what is the sum?",
    "A sum of Rs 10,000 is lent at 5% simple interest. After 4 years, the principal and interest are together invested at 10% compound interest. What is the total amount after another 2 years?",
    "The difference between compound interest and simple interest on a certain sum of money for 3 years at 5% per annum is Rs. 122. Find the sum.",
    "A sum of money becomes 8 times of itself in 3 years at compound interest, compounded annually. In how many years will the same sum become 64 times of itself?",
  ],
  // Found wrong when read on 2026-10-27; replaced in place.
  bad: {
    easy: [
      ["6ab6709d73daa241b30fb5b5", "No option is right: 600 ÷ 1.1 = ₹545.45, not ₹500 (₹500 grows to ₹550)"],
      ["6ab670c773daa241b30fb5bf", "Same question as #1 of this test (₹5,000 at 10% for 3 years)"],
      ["6ab670c773daa241b30fb5c0", "Same sum as #3 of this test with every amount ×10 (CI at 10% for 2 years)"],
    ],
    advanced: [
      ["6ab673ed73daa241b30fb639", "No option is right: CI = 3,750 × 0.1236 = ₹463.50, marked ₹459.9"],
      ["6ab673ed73daa241b30fb63c", "Marked answer ₹3,152 is not exact: 20,000 × 1.157625 − 20,000 = ₹3,152.50"],
    ],
  },
};
