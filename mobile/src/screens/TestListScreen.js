import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppAlert from "../components/AppAlert";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { isSubscribed } from "../utils/subscription";

import {
  colors,
  spacing,
  radius,
  type,
  card,
  shadow,
} from "../theme/theme";

/* =========================================================
   DATE HELPERS
========================================================= */

function startOfDay(date) {
  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  return d;
}

function daysFromToday(date) {
  const diff =
    startOfDay(date) -
    startOfDay(new Date());

  return Math.round(
    diff / (1000 * 60 * 60 * 24)
  );
}

function whenLabel(date) {
  const days =
    daysFromToday(date);

  if (days < 0) return "PAST";
  if (days === 0) return "TODAY";
  if (days === 1) return "TOMORROW";

  return `IN ${days} DAYS`;
}

function formatDate(date) {
  return new Date(
    date
  ).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
}

function formatTime(date) {
  return new Date(
    date
  ).toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function timeRange(
  scheduledAt,
  durationMinutes
) {
  const start =
    new Date(scheduledAt);

  if (!durationMinutes) {
    return formatTime(start);
  }

  const end = new Date(
    start.getTime() +
      durationMinutes * 60000
  );

  return `${formatTime(
    start
  )} - ${formatTime(end)}`;
}

/* =========================================================
   LIVE WINDOW HELPERS

   A live exam runs on ONE shared clock - it opens at its
   scheduled moment and closes at the same wall-clock moment
   for every student. These mirror server/utils/liveExam.js
   so the UI never tells a student something the backend
   would contradict.
========================================================= */

function examWindow(exam) {
  const startsAt = new Date(
    exam.startsAt ||
      exam.scheduledAt
  );

  const endsAt = new Date(
    exam.endsAt ||
      startsAt.getTime() +
        (exam.durationMinutes ||
          60) *
          60000
  );

  return { startsAt, endsAt };
}

function examState(exam, now) {
  const { startsAt, endsAt } =
    examWindow(exam);

  if (now < startsAt)
    return "upcoming";

  if (now <= endsAt)
    return "ongoing";

  return "ended";
}

function hasSubmitted(exam) {
  return (
    !!exam.attemptStatus &&
    exam.attemptStatus !==
      "in_progress"
  );
}

// Countdown to the shared start moment - this is what makes
// it feel like a real exam hall rather than just a date.
function formatCountdown(ms) {
  if (ms <= 0) return "00:00";

  const totalSeconds =
    Math.floor(ms / 1000);

  const days = Math.floor(
    totalSeconds / 86400
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  const pad = (n) =>
    String(n).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${pad(hours)}:${pad(
      minutes
    )}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(
    seconds
  )}`;
}

/* =========================================================
   SCREEN
========================================================= */

export default function TestListScreen({
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const { user } = useAuth();

  const subscribed =
    isSubscribed(user);

  const [exams, setExams] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(null);

  // Ticks every second so a countdown actually counts down and
  // an exam flips to "LIVE NOW" on its own - without this the
  // student would have to pull-to-refresh at the exact minute.
  const [now, setNow] = useState(
    () => new Date()
  );

  useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()),
      1000
    );

    return () =>
      clearInterval(timer);
  }, []);

  /* =======================================================
     HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     LOAD
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const res =
          await api.get(
            "/exams/live/upcoming"
          );

        setExams(
          res.data?.tests ||
            res.data?.exams ||
            []
        );
      } catch (err) {
        console.log(
          "LiveExamScreen load error:",
          err
        );

        setExams([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* =======================================================
     START EXAM
  ======================================================= */

  async function startExam(exam) {
    if (!exam?._id) return;

    // Already sat it - go straight to the result instead of
    // bouncing off a server rejection.
    if (hasSubmitted(exam)) {
      if (exam.attemptId) {
        navigation.navigate(
          "Result",
          {
            attemptId:
              exam.attemptId,
          }
        );
      }

      return;
    }

    const state = examState(
      exam,
      new Date()
    );

    if (state === "upcoming") {
      const { startsAt } =
        examWindow(exam);

      AppAlert.alert(
        "Not started yet",
        `This live exam opens at ${formatTime(
          startsAt
        )} on ${formatDate(
          startsAt
        )}. Everyone starts together.`
      );

      return;
    }

    if (state === "ended") {
      AppAlert.alert(
        "Exam finished",
        "This live exam has ended."
      );

      return;
    }

    const premiumLocked =
      !exam.isFree &&
      !subscribed;

    if (premiumLocked) {
      AppAlert.alert(
        "Premium exam",
        "Upgrade to join every live exam and see your all-India rank.",
        [
          {
            text: "Later",
            style: "cancel",
          },
          {
            text: "Upgrade",
            onPress: () =>
              navigation.navigate(
                "Subscription"
              ),
          },
        ]
      );

      return;
    }

    setStarting(exam._id);

    try {
      const res =
        await api.get(
          `/tests/${exam._id}`
        );

      navigation.navigate(
        "TestTaking",
        {
          testId:
            res.data?.test?._id ||
            exam._id,
          // The shared window's remaining time - the exam screen
          // must run on this, not the test's full duration, or a
          // late joiner would get extra time.
          liveSecondsRemaining:
            res.data?.live
              ?.secondsRemaining,
          liveEndsAt:
            res.data?.live?.endsAt,
        }
      );
    } catch (err) {
      const code =
        err.response?.data?.code;

      const message =
        err.response?.data
          ?.message;

      if (
        code === "LIVE_NOT_STARTED"
      ) {
        AppAlert.alert(
          "Not started yet",
          message ||
            "This live exam hasn't started yet."
        );
      } else if (
        code === "LIVE_ENDED"
      ) {
        AppAlert.alert(
          "Exam finished",
          message ||
            "This live exam has ended."
        );
      } else if (
        code ===
        "LIVE_ALREADY_ATTEMPTED"
      ) {
        const attemptId =
          err.response?.data
            ?.attemptId;

        AppAlert.alert(
          "Already submitted",
          "You've already taken this live exam.",
          [
            {
              text: "Close",
              style: "cancel",
            },
            ...(attemptId
              ? [
                  {
                    text: "View Result",
                    onPress: () =>
                      navigation.navigate(
                        "Result",
                        {
                          attemptId,
                        }
                      ),
                  },
                ]
              : []),
          ]
        );
      } else if (
        code ===
        "SUBSCRIPTION_REQUIRED"
      ) {
        AppAlert.alert(
          "Premium exam",
          message ||
            "Upgrade to join this live exam.",
          [
            {
              text: "Later",
              style: "cancel",
            },
            {
              text: "Upgrade",
              onPress: () =>
                navigation.navigate(
                  "Subscription"
                ),
            },
          ]
        );
      } else {
        AppAlert.alert(
          "Something went wrong",
          message ||
            "Couldn't load the exam"
        );
      }

      // The window may have just opened or closed - refresh so
      // the card's state matches what the server just told us.
      load();
    } finally {
      setStarting(null);
    }
  }

  /* =======================================================
     SORT

     A live exam that's happening RIGHT NOW always comes
     first, however it's dated - that's the one the student
     needs this second.
  ======================================================= */

  const sorted = useMemo(() => {
    const list = [...exams].sort(
      (a, b) =>
        new Date(a.scheduledAt) -
        new Date(b.scheduledAt)
    );

    const ongoing = list.filter(
      (exam) =>
        examState(exam, now) ===
        "ongoing"
    );

    const others = list.filter(
      (exam) =>
        examState(exam, now) !==
        "ongoing"
    );

    return [...ongoing, ...others];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exams, Math.floor(now / 1000)]);

  const nextExam =
    sorted[0] || null;

  const rest = useMemo(
    () =>
      sorted.filter(
        (exam) =>
          exam._id !==
          nextExam?._id
      ),
    [sorted, nextExam]
  );

  /* =======================================================
     STATS
  ======================================================= */

  const totalUpcoming =
    sorted.length;

  const freeCount = useMemo(
    () =>
      sorted.filter(
        (exam) =>
          exam.isFree
      ).length,
    [sorted]
  );

  const thisWeekCount =
    useMemo(
      () =>
        sorted.filter(
          (exam) => {
            const days =
              daysFromToday(
                exam.scheduledAt
              );

            return (
              days >= 0 &&
              days <= 7
            );
          }
        ).length,
      [sorted]
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.loadingScreen,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <View
          style={styles.loadingIcon}
        >
          <ActivityIndicator
            size="small"
            color={colors.brand}
          />
        </View>

        <Text
          style={styles.loadingTitle}
        >
          Loading live exams
        </Text>

        <Text
          style={styles.loadingText}
        >
          Getting the latest schedule...
        </Text>
      </View>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View
      style={styles.container}
    >
      <FlatList
        data={rest}
        keyExtractor={(item) =>
          item._id
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            spacing.xxl +
            insets.bottom +
            10,
        }}
        ListHeaderComponent={
          <>
            {/* =================================================
                HEADER
            ================================================= */}

            <View
              style={[
                styles.header,
                {
                  paddingTop:
                    Math.max(
                      insets.top +
                        10,
                      spacing.md
                    ),
                },
              ]}
            >
              <View
                style={styles.headerText}
              >
                <View
                  style={
                    styles.headerEyebrow
                  }
                >
                  <View
                    style={
                      styles.headerEyebrowLine
                    }
                  />

                  <Text
                    style={
                      styles.headerEyebrowText
                    }
                  >
                    COMPETITIVE TESTING
                  </Text>
                </View>

                <Text
                  style={
                    styles.headerTitle
                  }
                  numberOfLines={1}
                >
                  Live Exams
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                  numberOfLines={2}
                >
                  Same paper, same clock,
                  real all-India rank
                </Text>
              </View>

              <View
                style={styles.liveChip}
              >
                <View
                  style={styles.liveDot}
                />

                <Text
                  style={
                    styles.liveChipText
                  }
                >
                  LIVE
                </Text>
              </View>
            </View>

            {/* =================================================
                HERO
            ================================================= */}

            {nextExam && (
              <LiveHero
                exam={nextExam}
                now={now}
                subscribed={
                  subscribed
                }
                totalUpcoming={
                  totalUpcoming
                }
                freeCount={
                  freeCount
                }
                thisWeekCount={
                  thisWeekCount
                }
                starting={
                  starting
                }
                onStart={() =>
                  startExam(
                    nextExam
                  )
                }
              />
            )}

            {/* =================================================
                LIST HEADER
            ================================================= */}

            {rest.length > 0 && (
              <View
                style={
                  styles.sectionHeader
                }
              >
                <View
                  style={
                    styles.sectionHeaderText
                  }
                >
                  <View
                    style={
                      styles.sectionTitleRow
                    }
                  >
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Upcoming
                    </Text>

                    <View
                      style={
                        styles.countPill
                      }
                    >
                      <Text
                        style={
                          styles.countPillText
                        }
                      >
                        {rest.length}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    More exams scheduled
                    for you
                  </Text>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !nextExam ? (
            <EmptyState />
          ) : null
        }
        renderItem={({ item }) => (
          <LiveExamCard
            exam={item}
            now={now}
            subscribed={
              subscribed
            }
            starting={
              starting
            }
            onPress={() =>
              startExam(item)
            }
          />
        )}
      />
    </View>
  );
}

/* =========================================================
   HERO
========================================================= */

function LiveHero({
  exam,
  now,
  subscribed,
  totalUpcoming,
  freeCount,
  thisWeekCount,
  starting,
  onStart,
}) {
  const premiumLocked =
    !exam.isFree &&
    !subscribed;

  const isStarting =
    starting === exam._id;

  const { startsAt } =
    examWindow(exam);

  const state = examState(
    exam,
    now
  );

  const submitted =
    hasSubmitted(exam);

  const isLive =
    state === "ongoing";

  const msToStart =
    startsAt - now;

  // Under a day out, a live countdown is far more useful than
  // "TOMORROW" - it's the same signal a real exam gives you.
  const eyebrowText = isLive
    ? "LIVE NOW"
    : state === "ended"
    ? "FINISHED"
    : msToStart < 86400000
    ? `STARTS IN ${formatCountdown(
        msToStart
      )}`
    : whenLabel(
        exam.scheduledAt
      );

  const accent = isLive
    ? colors.danger
    : state === "ended"
    ? colors.slateSoft
    : colors.brand;

  const buttonLabel = submitted
    ? "View Result"
    : isLive
    ? premiumLocked
      ? "Unlock to Join"
      : "Enter Exam"
    : state === "ended"
    ? "Exam Closed"
    : "Starts Soon";

  const buttonDisabled =
    !submitted &&
    state !== "ongoing";

  return (
    <View
      style={[
        styles.hero,
        isLive &&
          styles.heroToday,
      ]}
    >
      {/* TOP ACCENT */}

      <View
        style={[
          styles.heroAccent,
          {
            backgroundColor:
              accent,
          },
        ]}
      />

      {/* HERO HEADER */}

      <View
        style={styles.heroTop}
      >
        <View
          style={styles.heroCopy}
        >
          <View
            style={styles.heroEyebrow}
          >
            <View
              style={[
                styles.heroEyebrowDot,
                {
                  backgroundColor:
                    accent,
                },
              ]}
            />

            <Text
              style={[
                styles.heroEyebrowText,
                { color: accent },
              ]}
            >
              {eyebrowText}
            </Text>
          </View>

          <Text
            style={styles.heroTitle}
            numberOfLines={2}
          >
            {exam.title}
          </Text>

          <View
            style={styles.heroSchedule}
          >
            <View
              style={
                styles.scheduleItem
              }
            >
              <Ionicons
                name="calendar-outline"
                size={13}
                color={
                  colors.slate
                }
              />

              <Text
                style={
                  styles.scheduleText
                }
              >
                {formatDate(
                  exam.scheduledAt
                )}
              </Text>
            </View>

            <View
              style={
                styles.scheduleDot
              }
            />

            <View
              style={
                styles.scheduleItem
              }
            >
              <Ionicons
                name="time-outline"
                size={13}
                color={
                  colors.slate
                }
              />

              <Text
                style={
                  styles.scheduleText
                }
              >
                {timeRange(
                  exam.scheduledAt,
                  exam.durationMinutes
                )}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.heroBadge,
            isLive &&
              styles.heroBadgeToday,
          ]}
        >
          <Ionicons
            name="radio"
            size={22}
            color={
              isLive
                ? colors.danger
                : colors.brand
            }
          />

          {isLive && (
            <View
              style={styles.heroBadgeDot}
            />
          )}
        </View>
      </View>

      {/* HERO STATS */}

      <View
        style={styles.heroStats}
      >
        <HeroStat
          value={totalUpcoming}
          label="Upcoming"
        />

        <View
          style={styles.heroDivider}
        />

        <HeroStat
          value={thisWeekCount}
          label="This week"
        />

        <View
          style={styles.heroDivider}
        />

        <HeroStat
          value={freeCount}
          label="Free"
        />
      </View>

      {/* ACTION */}

      <TouchableOpacity
        style={[
          styles.heroButton,
          isLive &&
            !submitted &&
            !premiumLocked &&
            styles.heroButtonLive,
          premiumLocked &&
            isLive &&
            !submitted &&
            styles.heroButtonLocked,
          buttonDisabled &&
            styles.heroButtonDisabled,
        ]}
        activeOpacity={0.86}
        disabled={
          isStarting ||
          buttonDisabled
        }
        onPress={onStart}
      >
        {isStarting ? (
          <ActivityIndicator
            size="small"
            color="#fff"
          />
        ) : (
          <>
            <View
              style={
                styles.heroButtonIcon
              }
            >
              <Ionicons
                name={
                  submitted
                    ? "document-text"
                    : isLive
                    ? premiumLocked
                      ? "lock-closed"
                      : "play"
                    : state === "ended"
                    ? "lock-closed"
                    : "time-outline"
                }
                size={13}
                color="#fff"
              />
            </View>

            <Text
              style={
                styles.heroButtonText
              }
            >
              {buttonLabel}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={16}
              color="#fff"
            />
          </>
        )}
      </TouchableOpacity>

      {premiumLocked &&
        !submitted && (
          <Text
            style={
              styles.premiumHint
            }
          >
            Premium access required
          </Text>
        )}

      {!premiumLocked &&
        state === "upcoming" && (
          <Text
            style={
              styles.premiumHint
            }
          >
            Everyone starts together at{" "}
            {formatTime(startsAt)}
          </Text>
        )}
    </View>
  );
}

/* =========================================================
   HERO STAT
========================================================= */

function HeroStat({
  value,
  label,
}) {
  return (
    <View
      style={styles.heroStat}
    >
      <Text
        style={styles.heroStatValue}
      >
        {value}
      </Text>

      <Text
        style={styles.heroStatLabel}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   EXAM CARD
========================================================= */

function LiveExamCard({
  exam,
  now,
  subscribed,
  starting,
  onPress,
}) {
  const premiumLocked =
    !exam.isFree &&
    !subscribed;

  const isStarting =
    starting === exam._id;

  const { startsAt } =
    examWindow(exam);

  const state = examState(
    exam,
    now
  );

  const submitted =
    hasSubmitted(exam);

  const isLive =
    state === "ongoing";

  const isToday =
    daysFromToday(
      exam.scheduledAt
    ) === 0;

  const accentColor = isLive
    ? colors.danger
    : state === "ended"
    ? colors.slateSoft
    : colors.brand;

  const date = new Date(
    exam.scheduledAt
  );

  const day = date.getDate();

  const month = date
    .toLocaleDateString(
      "en-IN",
      {
        month: "short",
      }
    )
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[
        styles.examCard,
        isLive &&
          styles.examCardToday,
        state === "ended" &&
          styles.examCardEnded,
      ]}
      activeOpacity={0.78}
      disabled={isStarting}
      onPress={onPress}
    >
      {/* LEFT ACCENT */}

      <View
        style={[
          styles.cardAccent,
          {
            backgroundColor:
              accentColor,
          },
        ]}
      />

      {/* DATE */}

      <View
        style={[
          styles.dateBlock,
          isLive &&
            styles.dateBlockToday,
        ]}
      >
        <Text
          style={[
            styles.dateDay,
            {
              color: accentColor,
            },
          ]}
        >
          {day}
        </Text>

        <Text
          style={[
            styles.dateMonth,
            isLive && {
              color:
                colors.danger,
            },
          ]}
        >
          {month}
        </Text>
      </View>

      {/* CONTENT */}

      <View
        style={styles.cardContent}
      >
        <View
          style={styles.badgeRow}
        >
          {isLive && (
            <View
              style={[
                styles.badge,
                styles.todayBadge,
              ]}
            >
              <View
                style={
                  styles.todayDot
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      colors.danger,
                  },
                ]}
              >
                Live now
              </Text>
            </View>
          )}

          {state === "upcoming" &&
            isToday && (
              <View
                style={[
                  styles.badge,
                  styles.todayBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        colors.danger,
                    },
                  ]}
                >
                  In{" "}
                  {formatCountdown(
                    startsAt - now
                  )}
                </Text>
              </View>
            )}

          {submitted && (
            <View
              style={[
                styles.badge,
                styles.doneBadge,
              ]}
            >
              <Ionicons
                name="checkmark-done"
                size={10}
                color={
                  colors.brand
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      colors.brand,
                  },
                ]}
              >
                Submitted
              </Text>
            </View>
          )}

          {exam.isFree ? (
            <View
              style={[
                styles.badge,
                styles.freeBadge,
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={10}
                color={
                  colors.success
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      colors.success,
                  },
                ]}
              >
                Free
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.badge,
                styles.premiumBadge,
              ]}
            >
              <Ionicons
                name={
                  premiumLocked
                    ? "lock-closed"
                    : "diamond-outline"
                }
                size={10}
                color={
                  premiumLocked
                    ? colors.warn
                    : colors.success
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      premiumLocked
                        ? colors.warn
                        : colors.success,
                  },
                ]}
              >
                Premium
              </Text>
            </View>
          )}
        </View>

        <Text
          style={styles.cardTitle}
          numberOfLines={2}
        >
          {exam.title}
        </Text>

        <View
          style={styles.metaRow}
        >
          <Ionicons
            name="time-outline"
            size={13}
            color={
              colors.slateSoft
            }
          />

          <Text
            style={styles.metaText}
            numberOfLines={1}
          >
            {timeRange(
              exam.scheduledAt,
              exam.durationMinutes
            )}
          </Text>

          {exam.durationMinutes ? (
            <>
              <View
                style={
                  styles.metaSeparator
                }
              />

              <Text
                style={
                  styles.metaText
                }
              >
                {exam.durationMinutes}{" "}
                min
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {/* ACTION */}

      {isStarting ? (
        <View
          style={styles.cardLoader}
        >
          <ActivityIndicator
            size="small"
            color={
              colors.brand
            }
          />
        </View>
      ) : (
        <View
          style={[
            styles.cardAction,
            premiumLocked &&
              !submitted &&
              styles.cardActionPremium,
            state === "upcoming" &&
              !submitted &&
              styles.cardActionWaiting,
          ]}
        >
          <Ionicons
            name={
              submitted
                ? "document-text"
                : state === "upcoming"
                ? "time-outline"
                : state === "ended"
                ? "lock-closed"
                : premiumLocked
                ? "lock-closed"
                : "play"
            }
            size={
              premiumLocked &&
              !submitted
                ? 13
                : 15
            }
            color={
              premiumLocked &&
              !submitted
                ? colors.warn
                : state === "upcoming" &&
                  !submitted
                ? colors.slateSoft
                : colors.brand
            }
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState() {
  return (
    <View
      style={styles.empty}
    >
      <View
        style={styles.emptyIcon}
      >
        <Ionicons
          name="calendar-outline"
          size={27}
          color={
            colors.slateSoft
          }
        />
      </View>

      <Text
        style={styles.emptyTitle}
      >
        No live exams yet
      </Text>

      <Text
        style={styles.emptyText}
      >
        New live exams are announced
        regularly. Check back soon to
        compete for an all-India rank.
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.bg,
  },

  /* =======================================================
     LOADING
  ======================================================= */

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      colors.bg,
  },

  loadingIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor:
      colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  loadingTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: colors.ink,
  },

  loadingText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.slateSoft,
    marginTop: 3,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    paddingHorizontal:
      spacing.lg,
    paddingBottom: 17,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  headerEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  headerEyebrowLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor:
      colors.brand,
    marginRight: 6,
  },

  headerEyebrowText: {
    fontSize: 8.5,
    lineHeight: 12,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 1,
  },

  headerTitle: {
    ...type.h3,
    color: colors.ink,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.slate,
    marginTop: 2,
  },

  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 29,
    borderRadius:
      radius.full,
    backgroundColor:
      colors.dangerLight,
    marginLeft: 10,
    marginBottom: 2,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor:
      colors.danger,
    marginRight: 5,
  },

  liveChipText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.danger,
    letterSpacing: 0.6,
  },

  /* =======================================================
     HERO
  ======================================================= */

  hero: {
    position: "relative",
    marginHorizontal:
      spacing.lg,
    marginBottom: 22,
    padding: 16,
    borderRadius:
      radius.xl,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    overflow: "hidden",
    ...shadow.brand,
  },

  heroToday: {
    borderColor:
      colors.dangerBorder,
  },

  heroAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  heroEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  heroEyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      colors.brand,
    marginRight: 5,
  },

  heroEyebrowText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.brand,
    letterSpacing: 0.7,
  },

  heroTitle: {
    ...type.h1,
    color: colors.ink,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  heroSchedule: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 7,
  },

  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  scheduleText: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slate,
    fontWeight: "600",
    marginLeft: 4,
  },

  scheduleDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor:
      colors.slateSoft,
    marginHorizontal: 7,
  },

  heroBadge: {
    width: 57,
    height: 57,
    borderRadius: 19,
    backgroundColor:
      colors.brandTint,
    borderWidth: 1,
    borderColor:
      colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  heroBadgeToday: {
    backgroundColor:
      colors.dangerLight,
    borderColor:
      colors.dangerBorder,
  },

  heroBadgeDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    right: 10,
    top: 9,
    backgroundColor:
      colors.danger,
  },

  /* =======================================================
     HERO STATS
  ======================================================= */

  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingVertical: 11,
    paddingHorizontal: 2,
    backgroundColor:
      colors.bg,
    borderRadius:
      radius.md,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  heroStat: {
    flex: 1,
    alignItems: "center",
  },

  heroStatValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    color: colors.ink,
  },

  heroStatLabel: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 2,
  },

  heroDivider: {
    width: 1,
    height: 27,
    backgroundColor:
      colors.border,
  },

  /* =======================================================
     HERO BUTTON
  ======================================================= */

  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.brand,
    marginTop: 12,
    ...shadow.brand,
  },

  heroButtonLive: {
    backgroundColor:
      colors.danger,
  },

  heroButtonLocked: {
    backgroundColor:
      colors.warn,
  },

  heroButtonDisabled: {
    backgroundColor:
      colors.slateSoft,
  },

  heroButtonIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  heroButtonText: {
    color: "#fff",
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "800",
    flex: 0,
    marginRight: 7,
  },

  premiumHint: {
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: "center",
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 6,
  },

  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeader: {
    paddingHorizontal:
      spacing.lg,
    marginBottom: 11,
  },

  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionTitle: {
    ...type.h3,
    color: colors.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
  },

  sectionSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slateSoft,
    marginTop: 2,
  },

  countPill: {
    minWidth: 27,
    height: 24,
    paddingHorizontal: 7,
    borderRadius:
      radius.full,
    backgroundColor:
      colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  countPillText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: colors.brand,
  },

  /* =======================================================
     EXAM CARD
  ======================================================= */

  examCard: {
    ...card,
    minHeight: 88,
    marginHorizontal:
      spacing.lg,
    marginBottom: 9,
    paddingVertical: 11,
    paddingLeft: 10,
    paddingRight: 11,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  examCardToday: {
    borderColor:
      colors.dangerBorder,
  },

  examCardEnded: {
    opacity: 0.72,
  },

  cardAccent: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },

  /* =======================================================
     DATE
  ======================================================= */

  dateBlock: {
    width: 48,
    height: 50,
    borderRadius: 14,
    backgroundColor:
      colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 3,
    marginRight: 11,
  },

  dateBlockToday: {
    backgroundColor:
      colors.dangerLight,
  },

  dateDay: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: "900",
    color: colors.brand,
  },

  dateMonth: {
    fontSize: 8.5,
    lineHeight: 12,
    fontWeight: "900",
    color: colors.slateSoft,
    letterSpacing: 0.6,
    marginTop: 1,
  },

  /* =======================================================
     CARD CONTENT
  ======================================================= */

  cardContent: {
    flex: 1,
    minWidth: 0,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
    flexWrap: "wrap",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius:
      radius.full,
  },

  todayBadge: {
    backgroundColor:
      colors.dangerLight,
  },

  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      colors.danger,
  },

  freeBadge: {
    backgroundColor:
      colors.successLight,
  },

  premiumBadge: {
    backgroundColor:
      colors.warnLight,
  },

  doneBadge: {
    backgroundColor:
      colors.brandLight,
  },

  badgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  cardTitle: {
    ...type.bodyStrong,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    minWidth: 0,
  },

  metaText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.slateSoft,
    fontWeight: "600",
    marginLeft: 4,
    flexShrink: 1,
  },

  metaSeparator: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor:
      colors.slateSoft,
    marginHorizontal: 6,
  },

  /* =======================================================
     CARD ACTION
  ======================================================= */

  cardAction: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor:
      colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  cardActionPremium: {
    backgroundColor:
      colors.warnLight,
  },

  cardActionWaiting: {
    backgroundColor:
      colors.slateLight,
  },

  cardLoader: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  empty: {
    alignItems: "center",
    paddingHorizontal:
      spacing.xl,
    paddingTop: 55,
    paddingBottom: 35,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor:
      colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  emptyTitle: {
    ...type.h3,
    color: colors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.slate,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 300,
  },
});