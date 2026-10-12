// How many questions a chapter practice test holds, in one place.
//
// It was 12, written out separately in five files - the builder, the publish
// check, the top-up, the gap finder and the health check - so changing it
// meant finding all five. Everything reads it from here now.
//
// Tests built while it was 12 are still in the catalog. They stay live; the
// admin tops them up to 20 from Subject Practice ("Top up short tests"), which
// queues the work on the Generation page.
const PRACTICE_TEST_SIZE = 20;

// Questions are asked for this many at a time. Twenty in one request comes
// back with more rejected and more near-repeats than two requests of ten,
// and a request that fails costs half the test instead of all of it.
const PRACTICE_BATCH = 10;

// The size practice tests used to be, so an old full test can be told apart
// from one that is short because something went wrong.
const OLD_PRACTICE_TEST_SIZE = 12;

module.exports = { PRACTICE_TEST_SIZE, PRACTICE_BATCH, OLD_PRACTICE_TEST_SIZE };
