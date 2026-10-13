// Where a recruitment notice belongs in the app: upcoming or already held,
// and in which order the series are listed.
//
// The admin sets a notice "upcoming" when it comes out. Once its exam date has
// passed it is a previous exam whatever the setting says - nobody has to
// remember to move it - and the newer notice for the same exam goes to the top.

function startOfTodayIST(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000);
}

/** "upcoming" | "previous" | "hidden", with the exam date taken into account. */
function stageOf(vacancy, now = new Date()) {
  if (!vacancy || vacancy.status === "hidden") return "hidden";
  if (vacancy.status === "upcoming" && vacancy.examDate && new Date(vacancy.examDate) < startOfTodayIST(now)) {
    return "previous";
  }
  return vacancy.status === "upcoming" ? "upcoming" : "previous";
}

/**
 * Upcoming first, then previous; inside each, the newest notice first (year,
 * then exam date, then when it was added). The admin's display order only
 * breaks ties, so a new notice never has to be dragged above an old one.
 */
function orderVacancies(vacancies, now = new Date()) {
  const rank = { upcoming: 0, previous: 1, hidden: 2 };
  const time = (d) => (d ? new Date(d).getTime() : 0);
  return [...vacancies]
    .map((v) => ({ ...v, stage: stageOf(v, now) }))
    .sort(
      (a, b) =>
        rank[a.stage] - rank[b.stage] ||
        (b.year || 0) - (a.year || 0) ||
        time(b.examDate) - time(a.examDate) ||
        time(b.createdAt) - time(a.createdAt) ||
        (a.displayOrder || 0) - (b.displayOrder || 0)
    );
}

module.exports = { stageOf, orderVacancies, startOfTodayIST };
