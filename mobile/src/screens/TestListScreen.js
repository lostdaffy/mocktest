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
  const days = daysFromToday(date);

  if (days < 0) return "PAST";
  if (days === 0) return "TODAY";
  if (days === 1) return "TOMORROW";

  return `IN ${days} DAYS`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString(
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
  const start = new Date(scheduledAt);

  if (!durationMinutes) {
    return formatTime(start);
  }

  const end = new Date(
    start.getTime() +
      durationMinutes * 60000
  );

  return `${formatTime(start)} - ${formatTime(
    end
  )}`;
}

/* =========================================================
   LIVE WINDOW
========================================================= */

function examWindow(exam) {
  const startsAt = new Date(
    exam.startsAt ||
      exam.scheduledAt
  );

  const endsAt = new Date(
    exam.endsAt ||
      startsAt.getTime() +
        (exam.durationMinutes || 60) *
          60000
  );

  return {
    startsAt,
    endsAt,
  };
}

function examState(exam, now) {
  const { startsAt, endsAt } =
    examWindow(exam);

  if (now < startsAt) {
    return "upcoming";
  }

  if (now <= endsAt) {
    return "ongoing";
  }

  return "ended";
}

function hasSubmitted(exam) {
  return (
    !!exam.attemptStatus &&
    exam.attemptStatus !== "in_progress"
  );
}

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
  const insets = useSafeAreaInsets();

  const { user } = useAuth();

  const subscribed =
    isSubscribed(user);

  const [exams, setExams] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(null);

  const [now, setNow] = useState(
    () => new Date()
  );

  /* =======================================================
     CLOCK
  ======================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
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
        err.response?.data?.message;

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

      load();
    } finally {
      setStarting(null);
    }
  }

  /* =======================================================
     SORT
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

    return [
      ...ongoing,
      ...others,
    ];
  }, [exams, now]);

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
            16,
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
                      insets.top + 8,
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
                >
                  Live Exams
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  Same paper, same clock,
                  real all-India rank
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.refreshButton
                }
                activeOpacity={0.75}
                onPress={load}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={colors.slate}
                />
              </TouchableOpacity>
            </View>

            {/* =================================================
                QUICK STATS
            ================================================= */}

            <View
              style={
                styles.quickStats
              }
            >
              <QuickStat
                icon="calendar-outline"
                value={totalUpcoming}
                label="Exams"
              />

              <View
                style={
                  styles.quickDivider
                }
              />

              <QuickStat
                icon="flash-outline"
                value={thisWeekCount}
                label="This week"
              />

              <View
                style={
                  styles.quickDivider
                }
              />

              <QuickStat
                icon="gift-outline"
                value={freeCount}
                label="Free"
              />
            </View>

            {/* =================================================
                HERO
            ================================================= */}

            {nextExam && (
              <LiveHero
                exam={nextExam}
                now={now}
                subscribed={subscribed}
                starting={starting}
                onStart={() =>
                  startExam(nextExam)
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
                      More exams
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
                    Keep an eye on your
                    upcoming schedule
                  </Text>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !nextExam ? (
            <EmptyState
              onRefresh={load}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <LiveExamCard
            exam={item}
            now={now}
            subscribed={subscribed}
            starting={starting}
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
   QUICK STAT
========================================================= */

function QuickStat({
  icon,
  value,
  label,
}) {
  return (
    <View
      style={styles.quickStat}
    >
      <View
        style={styles.quickIcon}
      >
        <Ionicons
          name={icon}
          size={14}
          color={colors.brand}
        />
      </View>

      <View>
        <Text
          style={
            styles.quickValue
          }
        >
          {value}
        </Text>

        <Text
          style={
            styles.quickLabel
          }
        >
          {label}
        </Text>
      </View>
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
  starting,
  onStart,
}) {
  const premiumLocked =
    !exam.isFree &&
    !subscribed;

  const isStarting =
    starting === exam._id;

  const {
    startsAt,
    endsAt,
  } = examWindow(exam);

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

  const msToEnd =
    endsAt - now;

  const eyebrowText =
    isLive
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
      : "Enter Live Exam"
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
          styles.heroLive,
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

      {/* LIVE STATUS */}

      <View
        style={
          styles.heroStatusRow
        }
      >
        <View
          style={[
            styles.heroStatus,
            isLive &&
              styles.heroStatusLive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  accent,
              },
            ]}
          />

          <Text
            style={[
              styles.heroStatusText,
              {
                color: accent,
              },
            ]}
          >
            {eyebrowText}
          </Text>
        </View>

        {!exam.isFree && (
          <View
            style={
              styles.premiumTag
            }
          >
            <Ionicons
              name="diamond"
              size={10}
              color={colors.warn}
            />

            <Text
              style={
                styles.premiumTagText
              }
            >
              PREMIUM
            </Text>
          </View>
        )}

        {exam.isFree && (
          <View
            style={styles.freeTag}
          >
            <Ionicons
              name="checkmark-circle"
              size={10}
              color={colors.success}
            />

            <Text
              style={
                styles.freeTagText
              }
            >
              FREE
            </Text>
          </View>
        )}
      </View>

      {/* TITLE */}

      <Text
        style={styles.heroTitle}
        numberOfLines={2}
      >
        {exam.title}
      </Text>

      {/* SCHEDULE */}

      <View
        style={styles.heroSchedule}
      >
        <ScheduleItem
          icon="calendar-outline"
          text={formatDate(
            exam.scheduledAt
          )}
        />

        <View
          style={
            styles.scheduleDot
          }
        />

        <ScheduleItem
          icon="time-outline"
          text={timeRange(
            exam.scheduledAt,
            exam.durationMinutes
          )}
        />
      </View>

      {/* LIVE COUNTDOWN */}

      {isLive && (
        <View
          style={
            styles.liveCountdown
          }
        >
          <View
            style={
              styles.countdownIcon
            }
          >
            <Ionicons
              name="timer-outline"
              size={16}
              color={colors.danger}
            />
          </View>

          <View
            style={
              styles.countdownContent
            }
          >
            <Text
              style={
                styles.countdownLabel
              }
            >
              TIME REMAINING
            </Text>

            <Text
              style={
                styles.countdownValue
              }
            >
              {formatCountdown(
                msToEnd
              )}
            </Text>
          </View>

          <View
            style={
              styles.liveNowPill
            }
          >
            <View
              style={
                styles.liveNowDot
              }
            />

            <Text
              style={
                styles.liveNowText
              }
            >
              LIVE
            </Text>
          </View>
        </View>
      )}

      {/* UPCOMING COUNTDOWN */}

      {!isLive &&
        state === "upcoming" &&
        msToStart < 86400000 && (
          <View
            style={
              styles.upcomingCountdown
            }
          >
            <Ionicons
              name="alarm-outline"
              size={15}
              color={colors.brand}
            />

            <Text
              style={
                styles.upcomingCountdownText
              }
            >
              Starts in{" "}
              <Text
                style={
                  styles.upcomingCountdownStrong
                }
              >
                {formatCountdown(
                  msToStart
                )}
              </Text>
            </Text>
          </View>
        )}

      {/* STATS */}

      <View
        style={
          styles.heroStats
        }
      >
        <HeroStat
          icon="time-outline"
          value={
            exam.durationMinutes
              ? `${exam.durationMinutes}m`
              : "—"
          }
          label="Duration"
        />

        <View
          style={
            styles.heroDivider
          }
        />

        <HeroStat
          icon="people-outline"
          value="All India"
          label="Competition"
        />

        <View
          style={
            styles.heroDivider
          }
        />

        <HeroStat
          icon="trophy-outline"
          value="Rank"
          label="Result"
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
            color="#FFFFFF"
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
                    : "time-outline"
                }
                size={14}
                color="#FFFFFF"
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
              color="#FFFFFF"
            />
          </>
        )}
      </TouchableOpacity>

      {premiumLocked &&
        !submitted &&
        isLive && (
          <Text
            style={
              styles.premiumHint
            }
          >
            Premium access required to
            join this exam
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
   SCHEDULE ITEM
========================================================= */

function ScheduleItem({
  icon,
  text,
}) {
  return (
    <View
      style={
        styles.scheduleItem
      }
    >
      <Ionicons
        name={icon}
        size={13}
        color={colors.slate}
      />

      <Text
        style={
          styles.scheduleText
        }
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

/* =========================================================
   HERO STAT
========================================================= */

function HeroStat({
  icon,
  value,
  label,
}) {
  return (
    <View
      style={styles.heroStat}
    >
      <View
        style={
          styles.heroStatIcon
        }
      >
        <Ionicons
          name={icon}
          size={13}
          color={colors.brand}
        />
      </View>

      <Text
        style={
          styles.heroStatValue
        }
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text
        style={
          styles.heroStatLabel
        }
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

  const {
    startsAt,
  } = examWindow(exam);

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
          styles.examCardLive,
        state === "ended" &&
          styles.examCardEnded,
      ]}
      activeOpacity={0.78}
      disabled={isStarting}
      onPress={onPress}
    >
      {/* ACCENT */}

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
            styles.dateBlockLive,
        ]}
      >
        <Text
          style={[
            styles.dateDay,
            {
              color:
                accentColor,
            },
          ]}
        >
          {day}
        </Text>

        <Text
          style={[
            styles.dateMonth,
            isLive &&
              styles.dateMonthLive,
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
                styles.liveBadge,
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
                LIVE
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
                <Ionicons
                  name="alarm-outline"
                  size={10}
                  color={colors.brand}
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
                color={colors.brand}
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
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      colors.success,
                  },
                ]}
              >
                FREE
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
                {exam.durationMinutes}m
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
            color={colors.brand}
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
            isLive &&
              !premiumLocked &&
              styles.cardActionLive,
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
            size={15}
            color={
              premiumLocked &&
              !submitted
                ? colors.warn
                : state === "upcoming" &&
                  !submitted
                ? colors.slateSoft
                : isLive
                ? colors.danger
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

function EmptyState({
  onRefresh,
}) {
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
          color={colors.brand}
        />
      </View>

      <View
        style={
          styles.emptySpark
        }
      >
        <Ionicons
          name="sparkles"
          size={10}
          color="#F59E0B"
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

      <TouchableOpacity
        style={
          styles.emptyButton
        }
        activeOpacity={0.8}
        onPress={onRefresh}
      >
        <Ionicons
          name="refresh-outline"
          size={15}
          color="#FFFFFF"
        />

        <Text
          style={
            styles.emptyButtonText
          }
        >
          Check Again
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     GENERAL
  ======================================================= */

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* =======================================================
     LOADING
  ======================================================= */

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  loadingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...shadow.soft,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: 15,
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
    backgroundColor: colors.brand,
    marginRight: 6,
  },

  headerEyebrowText: {
    fontSize: 8.5,
    lineHeight: 12,
    fontWeight: "900",
    color: colors.brand,
    letterSpacing: 1,
  },

  headerTitle: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.7,
  },

  headerSubtitle: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.slate,
    marginTop: 2,
  },

  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    marginBottom: 2,
    ...shadow.soft,
  },

  /* =======================================================
     QUICK STATS
  ======================================================= */

  quickStats: {
    marginHorizontal: spacing.lg,
    marginBottom: 13,
    minHeight: 58,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    ...shadow.soft,
  },

  quickStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  quickIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },

  quickValue: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900",
    color: colors.ink,
  },

  quickLabel: {
    fontSize: 7.5,
    lineHeight: 11,
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 1,
  },

  quickDivider: {
    width: 1,
    height: 27,
    backgroundColor: colors.border,
  },

  /* =======================================================
     HERO
  ======================================================= */

  hero: {
    position: "relative",
    marginHorizontal: spacing.lg,
    marginBottom: 22,
    padding: 16,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.brand,
  },

  heroLive: {
    borderColor: colors.dangerBorder,
  },

  heroAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 3,
  },

  heroStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 25,
    marginBottom: 8,
  },

  heroStatus: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    height: 25,
    borderRadius: radius.full,
    backgroundColor: colors.brandTint,
  },

  heroStatusLive: {
    backgroundColor: colors.dangerLight,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  heroStatusText: {
    fontSize: 8.5,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  premiumTag: {
    height: 25,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.warnLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  premiumTagText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: colors.warn,
    letterSpacing: 0.4,
  },

  freeTag: {
    height: 25,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  freeTagText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: colors.success,
    letterSpacing: 0.4,
  },

  heroTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.45,
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
    maxWidth: "47%",
  },

  scheduleText: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.slate,
    fontWeight: "600",
    marginLeft: 4,
    flexShrink: 1,
  },

  scheduleDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.slateSoft,
    marginHorizontal: 7,
  },

  /* =======================================================
     COUNTDOWN
  ======================================================= */

  liveCountdown: {
    marginTop: 13,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    flexDirection: "row",
    alignItems: "center",
  },

  countdownIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  countdownContent: {
    flex: 1,
  },

  countdownLabel: {
    fontSize: 7.5,
    lineHeight: 11,
    fontWeight: "800",
    color: colors.danger,
    letterSpacing: 0.7,
  },

  countdownValue: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 1,
  },

  liveNowPill: {
    height: 25,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
  },

  liveNowDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 4,
  },

  liveNowText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  upcomingCountdown: {
    marginTop: 12,
    height: 38,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandLight,
    flexDirection: "row",
    alignItems: "center",
  },

  upcomingCountdownText: {
    fontSize: 10,
    color: colors.slate,
    fontWeight: "600",
    marginLeft: 7,
  },

  upcomingCountdownStrong: {
    color: colors.brand,
    fontWeight: "900",
  },

  /* =======================================================
     HERO STATS
  ======================================================= */

  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    paddingVertical: 10,
    paddingHorizontal: 3,
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  heroStat: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },

  heroStatIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },

  heroStatValue: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "900",
    color: colors.ink,
  },

  heroStatLabel: {
    fontSize: 7.5,
    lineHeight: 11,
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 1,
  },

  heroDivider: {
    width: 1,
    height: 31,
    backgroundColor: colors.border,
  },

  /* =======================================================
     HERO BUTTON
  ======================================================= */

  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 49,
    borderRadius: 14,
    backgroundColor: colors.brand,
    marginTop: 12,
    ...shadow.brand,
  },

  heroButtonLive: {
    backgroundColor: colors.danger,
  },

  heroButtonLocked: {
    backgroundColor: colors.warn,
  },

  heroButtonDisabled: {
    backgroundColor: colors.slateSoft,
  },

  heroButtonIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  heroButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    marginRight: 7,
  },

  premiumHint: {
    fontSize: 9,
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
    paddingHorizontal: spacing.lg,
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
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.slateSoft,
    marginTop: 2,
  },

  countPill: {
    minWidth: 27,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: radius.full,
    backgroundColor: colors.brandTint,
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
    marginHorizontal: spacing.lg,
    marginBottom: 9,
    paddingVertical: 11,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  examCardLive: {
    borderColor: colors.dangerBorder,
    backgroundColor: "#FFFCFC",
  },

  examCardEnded: {
    opacity: 0.65,
  },

  cardAccent: {
    position: "absolute",
    left: 0,
    top: 11,
    bottom: 11,
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
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 3,
    marginRight: 10,
  },

  dateBlockLive: {
    backgroundColor: colors.dangerLight,
  },

  dateDay: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: "900",
  },

  dateMonth: {
    fontSize: 8.5,
    lineHeight: 12,
    fontWeight: "900",
    color: colors.slateSoft,
    letterSpacing: 0.6,
    marginTop: 1,
  },

  dateMonthLive: {
    color: colors.danger,
  },

  /* =======================================================
     CONTENT
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
    borderRadius: radius.full,
  },

  liveBadge: {
    backgroundColor: colors.dangerLight,
  },

  todayBadge: {
    backgroundColor: colors.brandTint,
  },

  freeBadge: {
    backgroundColor: colors.successLight,
  },

  premiumBadge: {
    backgroundColor: colors.warnLight,
  },

  doneBadge: {
    backgroundColor: colors.brandLight,
  },

  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },

  badgeText: {
    fontSize: 8.5,
    fontWeight: "900",
  },

  cardTitle: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "800",
    color: colors.ink,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    minWidth: 0,
  },

  metaText: {
    fontSize: 9.5,
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
    backgroundColor: colors.slateSoft,
    marginHorizontal: 6,
  },

  /* =======================================================
     CARD ACTION
  ======================================================= */

  cardAction: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  cardActionLive: {
    backgroundColor: colors.dangerLight,
  },

  cardActionPremium: {
    backgroundColor: colors.warnLight,
  },

  cardActionWaiting: {
    backgroundColor: colors.slateLight,
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
    position: "relative",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 55,
    paddingBottom: 35,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  emptySpark: {
    position: "absolute",
    top: 47,
    right: "31%",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF8DF",
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    color: colors.ink,
  },

  emptyText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.slate,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 300,
  },

  emptyButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: colors.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 15,
    ...shadow.brand,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "900",
  },
});