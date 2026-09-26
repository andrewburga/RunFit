import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Easing,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const WORKOUT_KEY = '@runfit_custom_workouts';

type ExerciseType =
  | 'time'
  | 'reps'
  | 'sets-reps'
  | 'sets-time';

type Exercise = {
  id: number;
  name: string;
  type: ExerciseType;
  time?: number;
  reps?: number;
  sets?: number;
  completed: boolean;
};

type DayWorkout = {
  day: number;
  exercises: Exercise[];
};

type WeeklyWorkout = {
  weekStart: string;
  morning: Exercise[];
  evenings: DayWorkout[];
};

// --------------------------------------------------
// Get Sunday of current week
// --------------------------------------------------

const getSundayKey = () => {
  const today = new Date();

  const day = today.getDay();

  const sunday = new Date(today);

  sunday.setDate(
    today.getDate() - day
  );

  sunday.setHours(
    0,
    0,
    0,
    0
  );

  return sunday
    .toISOString()
    .split('T')[0];
};

// --------------------------------------------------
// Home Screen
// --------------------------------------------------

export default function HomeScreen() {
  const [morningCompleted, setMorningCompleted] =
    useState(0);

  const [eveningCompleted, setEveningCompleted] =
    useState(0);

  const [morningTotal, setMorningTotal] =
    useState(0);

  const [eveningTotal, setEveningTotal] =
    useState(0);

  const [totalWorkouts, setTotalWorkouts] =
    useState(0);

  const [refreshing, setRefreshing] =
    useState(false);

  // ------------------------------------------------
  // Screen animations
  // ------------------------------------------------

  const screenOpacity =
    useRef(new Animated.Value(0)).current;

  const headerTranslate =
    useRef(new Animated.Value(20)).current;

  const heroTranslate =
    useRef(new Animated.Value(30)).current;

  const cardsTranslate =
    useRef(new Animated.Value(40)).current;

  const motivationTranslate =
    useRef(new Animated.Value(50)).current;

  const detailsTranslate =
    useRef(new Animated.Value(60)).current;

  // ------------------------------------------------
  // Progress animations
  // ------------------------------------------------

  const progressAnimation =
    useRef(new Animated.Value(0)).current;

  const numberAnimation =
    useRef(new Animated.Value(0)).current;

  // ------------------------------------------------
  // Goku animations
  // ------------------------------------------------

  const gokuFloat =
    useRef(new Animated.Value(0)).current;

  const gokuScale =
    useRef(new Animated.Value(1)).current;

  const auraOpacity =
    useRef(new Animated.Value(0.5)).current;

  // ------------------------------------------------
  // Load workout data
  // ------------------------------------------------

  const loadWorkoutCount = async () => {
    try {
      const saved =
        await AsyncStorage.getItem(
          WORKOUT_KEY
        );

      if (!saved) {
        setMorningCompleted(0);
        setEveningCompleted(0);
        setMorningTotal(0);
        setEveningTotal(0);
        setTotalWorkouts(0);
        return;
      }

      const workout: WeeklyWorkout =
        JSON.parse(saved);

      const currentWeek =
        getSundayKey();

      // New week
      if (
        workout.weekStart !==
        currentWeek
      ) {
        setMorningCompleted(0);
        setEveningCompleted(0);
        setMorningTotal(0);
        setEveningTotal(0);
        setTotalWorkouts(0);
        return;
      }

      // --------------------------------------------
      // Morning
      // --------------------------------------------

      const morning =
        workout.morning || [];

      const completedMorning =
        morning.filter(
          (exercise) =>
            exercise.completed
        ).length;

      // --------------------------------------------
      // Today's evening
      // --------------------------------------------

      const today =
        new Date().getDay();

      const todayWorkout =
        workout.evenings?.find(
          (item) =>
            item.day === today
        );

      const evening =
        todayWorkout?.exercises || [];

      const completedEvening =
        evening.filter(
          (exercise) =>
            exercise.completed
        ).length;

      // --------------------------------------------
      // Update state
      // --------------------------------------------

      setMorningCompleted(
        completedMorning
      );

      setEveningCompleted(
        completedEvening
      );

      setMorningTotal(
        morning.length
      );

      setEveningTotal(
        evening.length
      );

      setTotalWorkouts(
        completedMorning +
          completedEvening
      );
    } catch (error) {
      console.log(
        'Error loading workout count:',
        error
      );
    }
  };

  // ------------------------------------------------
  // Reload whenever Home is focused
  // ------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      loadWorkoutCount();
    }, [])
  );

  // ------------------------------------------------
  // Pull to refresh
  // ------------------------------------------------

  const onRefresh = async () => {
    setRefreshing(true);

    await loadWorkoutCount();

    setRefreshing(false);
  };

  // ------------------------------------------------
  // Entrance animation
  // ------------------------------------------------

  useEffect(() => {
    screenOpacity.setValue(0);

    headerTranslate.setValue(20);
    heroTranslate.setValue(30);
    cardsTranslate.setValue(40);
    motivationTranslate.setValue(50);
    detailsTranslate.setValue(60);

    Animated.parallel([
      Animated.timing(
        screenOpacity,
        {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        headerTranslate,
        {
          toValue: 0,
          duration: 550,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        heroTranslate,
        {
          toValue: 0,
          duration: 650,
          delay: 100,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        cardsTranslate,
        {
          toValue: 0,
          duration: 650,
          delay: 200,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        motivationTranslate,
        {
          toValue: 0,
          duration: 650,
          delay: 300,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        detailsTranslate,
        {
          toValue: 0,
          duration: 650,
          delay: 400,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),
    ]).start();
  }, []);

  // ------------------------------------------------
  // Goku floating animation
  // ------------------------------------------------

  useEffect(() => {
    const floating =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            gokuFloat,
            {
              toValue: -7,
              duration: 1400,
              easing: Easing.inOut(
                Easing.sin
              ),
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            gokuFloat,
            {
              toValue: 0,
              duration: 1400,
              easing: Easing.inOut(
                Easing.sin
              ),
              useNativeDriver: true,
            }
          ),
        ])
      );

    const breathing =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            gokuScale,
            {
              toValue: 1.025,
              duration: 1100,
              easing: Easing.inOut(
                Easing.sin
              ),
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            gokuScale,
            {
              toValue: 1,
              duration: 1100,
              easing: Easing.inOut(
                Easing.sin
              ),
              useNativeDriver: true,
            }
          ),
        ])
      );

    const aura =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            auraOpacity,
            {
              toValue: 0.85,
              duration: 900,
              easing: Easing.inOut(
                Easing.sin
              ),
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            auraOpacity,
            {
              toValue: 0.4,
              duration: 900,
              easing: Easing.inOut(
                Easing.sin
              ),
              useNativeDriver: true,
            }
          ),
        ])
      );

    floating.start();
    breathing.start();
    aura.start();

    return () => {
      floating.stop();
      breathing.stop();
      aura.stop();
    };
  }, []);

  // ------------------------------------------------
  // Calculate today's progress
  // ------------------------------------------------

  const totalExercises =
    morningTotal +
    eveningTotal;

  const completedExercises =
    totalWorkouts;

  const progress =
    totalExercises > 0
      ? Math.round(
          (completedExercises /
            totalExercises) *
            100
        )
      : 0;

  // ------------------------------------------------
  // Animate progress
  // ------------------------------------------------

  useEffect(() => {
    Animated.parallel([
      Animated.timing(
        progressAnimation,
        {
          toValue: progress,
          duration: 900,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: false,
        }
      ),

      Animated.timing(
        numberAnimation,
        {
          toValue: progress,
          duration: 900,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: false,
        }
      ),
    ]).start();
  }, [progress]);

  // ------------------------------------------------
  // Motivation
  // ------------------------------------------------

  const getMotivation = () => {
    if (progress === 100) {
      return {
        title: 'MISSION COMPLETE! 🏆',
        text:
          'You finished everything planned for today.',
      };
    }

    if (progress >= 80) {
      return {
        title: 'FINISH STRONG! 🔥',
        text:
          'You are almost there. One final push!',
      };
    }

    if (progress >= 50) {
      return {
        title: 'DON’T SLOW DOWN! ⚡',
        text:
          'You are halfway there. Keep the momentum!',
      };
    }

    if (progress > 0) {
      return {
        title: 'KEEP GOING! 💪',
        text:
          'You started. Now keep building momentum.',
      };
    }

    return {
      title: 'GET STARTED! 🔥',
      text:
        'Every great training session starts with one exercise.',
    };
  };

  const motivation =
    getMotivation();

  // ------------------------------------------------
  // Today's day
  // ------------------------------------------------

  const today =
    new Date().getDay();

  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const todayName =
    dayNames[today];

  const isRestDay =
    today === 2;

  // ------------------------------------------------
  // Animated progress width
  // ------------------------------------------------

  const progressWidth =
    progressAnimation.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

  const animatedPercentage =
    numberAnimation.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

  // ==================================================
  // UI
  // ==================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <Animated.View
        style={[
          styles.screen,
          {
            opacity: screenOpacity,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={
            styles.container
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >

          {/* ====================================== */}
          {/* HEADER */}
          {/* ====================================== */}

          <Animated.View
            style={[
              styles.header,
              {
                transform: [
                  {
                    translateY:
                      headerTranslate,
                  },
                ],
              },
            ]}
          >
            <Text
              style={styles.welcome}
            >
              Welcome back 👋
            </Text>

            <Text
              style={styles.title}
            >
              FIT ANDREW
            </Text>

            <View
              style={styles.dayBadge}
            >
              <Text
                style={styles.dayText}
              >
                {todayName}
              </Text>

              {isRestDay && (
                <Text
                  style={
                    styles.restBadge
                  }
                >
                  REST DAY
                </Text>
              )}
            </View>
          </Animated.View>

          {/* ====================================== */}
          {/* TODAY'S PROGRESS */}
          {/* ====================================== */}

          <Animated.View
            style={[
              styles.heroCard,
              {
                transform: [
                  {
                    translateY:
                      heroTranslate,
                  },
                ],
              },
            ]}
          >
            <Text
              style={
                styles.heroSmallTitle
              }
            >
              TODAY'S PROGRESS
            </Text>

            <Animated.Text
              style={
                styles.heroPercentage
              }
            >
              {animatedPercentage}
            </Animated.Text>

            <Text
              style={
                styles.heroSubtitle
              }
            >
              {completedExercises} of{' '}
              {totalExercises} exercises
              completed
            </Text>

            <View
              style={
                styles.progressTrack
              }
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      progressWidth,
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* ====================================== */}
          {/* GOKU MOTIVATION ZONE */}
          {/* ====================================== */}

          <Animated.View
            style={[
              styles.gokuCard,
              {
                transform: [
                  {
                    translateY:
                      motivationTranslate,
                  },
                ],
              },
            ]}
          >
            {/* Aura */}
            <Animated.View
              style={[
                styles.auraOne,
                {
                  opacity:
                    auraOpacity,
                },
              ]}
            />

            <Animated.View
              style={[
                styles.auraTwo,
                {
                  opacity:
                    auraOpacity,
                },
              ]}
            />

            {/* Goku */}
            <Animated.View
              style={[
                styles.gokuContainer,
                {
                  transform: [
                    {
                      translateY:
                        gokuFloat,
                    },
                    {
                      scale:
                        gokuScale,
                    },
                  ],
                },
              ]}
            >
              <Image
                source={require('../../assets/images/goku.jpeg')}
                style={
                  styles.gokuImage
                }
                resizeMode="contain"
              />
            </Animated.View>

            {/* Motivation text */}
            <View
              style={
                styles.gokuTextArea
              }
            >
              <Text
                style={
                  styles.motivationLabel
                }
              >
                ⚡ MOTIVATION ZONE
              </Text>

              <Text
                style={
                  styles.motivationTitle
                }
              >
                {motivation.title}
              </Text>

              <Text
                style={
                  styles.motivationText
                }
              >
                {motivation.text}
              </Text>

              <View
                style={
                  styles.motivationDivider
                }
              />

              <Text
                style={
                  styles.gokuQuote
                }
              >
                “Keep pushing forward.”
              </Text>

              <View
                style={
                  styles.energyBadge
                }
              >
                <Text
                  style={
                    styles.energyBadgeText
                  }
                >
                  {progress === 100
                    ? 'TRAINING COMPLETE 🏆'
                    : 'KEEP FIGHTING 🔥'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ====================================== */}
          {/* TODAY'S ACTIVITY */}
          {/* ====================================== */}

          <Animated.View
            style={{
              transform: [
                {
                  translateY:
                    cardsTranslate,
                },
              ],
            }}
          >
            <Text
              style={styles.sectionTitle}
            >
              Today's Activity
            </Text>

            {/* Total */}
            <View
              style={
                styles.totalWorkoutCard
              }
            >
              <View
                style={
                  styles.workoutIcon
                }
              >
                <Text
                  style={
                    styles.workoutIconText
                  }
                >
                  💪
                </Text>
              </View>

              <View
                style={
                  styles.workoutInfo
                }
              >
                <Text
                  style={
                    styles.workoutTitle
                  }
                >
                  Total Workouts
                </Text>

                <Text
                  style={
                    styles.workoutDescription
                  }
                >
                  Completed exercises today
                </Text>
              </View>

              <Text
                style={
                  styles.workoutCount
                }
              >
                {totalWorkouts}
              </Text>
            </View>

            {/* Morning */}
            <View
              style={
                styles.smallActivityCard
              }
            >
              <View>
                <Text
                  style={
                    styles.smallCardTitle
                  }
                >
                  🌅 Morning Workout
                </Text>

                <Text
                  style={
                    styles.smallCardSubtitle
                  }
                >
                  {morningCompleted} of{' '}
                  {morningTotal} completed
                </Text>
              </View>

              <View
                style={
                  styles.countCircle
                }
              >
                <Text
                  style={
                    styles.countCircleText
                  }
                >
                  {morningCompleted}
                </Text>
              </View>
            </View>

            {/* Evening */}
            <View
              style={
                styles.smallActivityCard
              }
            >
              <View>
                <Text
                  style={
                    styles.smallCardTitle
                  }
                >
                  🌙 Evening Workout
                </Text>

                <Text
                  style={
                    styles.smallCardSubtitle
                  }
                >
                  {isRestDay
                    ? 'Rest day'
                    : `${eveningCompleted} of ${eveningTotal} completed`}
                </Text>
              </View>

              <View
                style={
                  styles.countCircle
                }
              >
                <Text
                  style={
                    styles.countCircleText
                  }
                >
                  {isRestDay
                    ? '—'
                    : eveningCompleted}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ====================================== */}
          {/* FINAL MOTIVATION */}
          {/* ====================================== */}

          <Animated.View
            style={[
              styles.finalMotivationCard,
              {
                transform: [
                  {
                    translateY:
                      motivationTranslate,
                  },
                ],
              },
            ]}
          >
            <Text
              style={
                styles.finalMotivationEmoji
              }
            >
              {progress === 100
                ? '🏆'
                : progress >= 50
                ? '⚡'
                : '🔥'}
            </Text>

            <View
              style={
                styles.finalMotivationText
              }
            >
              <Text
                style={
                  styles.finalMotivationTitle
                }
              >
                {progress === 100
                  ? 'Amazing work!'
                  : progress >= 50
                  ? 'You are getting stronger!'
                  : 'Your training starts here!'}
              </Text>

              <Text
                style={
                  styles.finalMotivationSubtitle
                }
              >
                {progress === 100
                  ? 'Come back tomorrow and do it again.'
                  : 'Stay consistent. Keep moving forward.'}
              </Text>
            </View>
          </Animated.View>

          {/* ====================================== */}
          {/* TODAY'S PLAN */}
          {/* ====================================== */}

          <Animated.View
            style={[
              styles.planCard,
              {
                transform: [
                  {
                    translateY:
                      detailsTranslate,
                  },
                ],
              },
            ]}
          >
            <Text
              style={
                styles.planTitle
              }
            >
              TODAY'S PLAN
            </Text>

            {/* Morning */}
            <View
              style={
                styles.planRow
              }
            >
              <Text
                style={
                  styles.planIcon
                }
              >
                🌅
              </Text>

              <View
                style={
                  styles.planText
                }
              >
                <Text
                  style={
                    styles.planHeading
                  }
                >
                  Morning
                </Text>

                <Text
                  style={
                    styles.planSubheading
                  }
                >
                  {morningTotal === 0
                    ? 'No exercises added'
                    : `${morningCompleted}/${morningTotal} exercises completed`}
                </Text>
              </View>
            </View>

            {/* Evening */}
            <View
              style={
                styles.planRow
              }
            >
              <Text
                style={
                  styles.planIcon
                }
              >
                🌙
              </Text>

              <View
                style={
                  styles.planText
                }
              >
                <Text
                  style={
                    styles.planHeading
                  }
                >
                  Evening
                </Text>

                <Text
                  style={
                    styles.planSubheading
                  }
                >
                  {isRestDay
                    ? 'Rest and recover'
                    : eveningTotal === 0
                    ? 'No exercises added'
                    : `${eveningCompleted}/${eveningTotal} exercises completed`}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.planFooter
              }
            >
              <Text
                style={
                  styles.planFooterText
                }
              >
                💡 Your running, jogging and
                walking sessions are tracked
                separately in the Run tab.
              </Text>
            </View>
          </Animated.View>

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },

  screen: {
    flex: 1,
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  // -----------------------------------------------
  // Header
  // -----------------------------------------------

  header: {
    marginBottom: 20,
  },

  welcome: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 3,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 1,
  },

  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },

  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  restBadge: {
    marginLeft: 8,
    color: '#b45309',
    fontSize: 11,
    fontWeight: '900',
  },

  // -----------------------------------------------
  // Progress
  // -----------------------------------------------

  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    overflow: 'hidden',
  },

  heroSmallTitle: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  heroPercentage: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '900',
    marginTop: 2,
  },

  heroSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },

  progressTrack: {
    height: 10,
    borderRadius: 10,
    backgroundColor: '#374151',
    marginTop: 18,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#8b5cf6',
  },

  // -----------------------------------------------
  // Goku
  // -----------------------------------------------

  gokuCard: {
    minHeight: 310,
    borderRadius: 26,
    backgroundColor: '#080b12',
    marginBottom: 22,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1f2937',
  },

  auraOne: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    left: -65,
    top: 35,
    backgroundColor: '#06b6d4',
  },

  auraTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    left: 10,
    top: 75,
    backgroundColor: '#22d3ee',
  },

  gokuContainer: {
    position: 'absolute',
    left: -12,
    bottom: -8,
    width: 190,
    height: 300,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  gokuImage: {
    width: 190,
    height: 300,
  },

  gokuTextArea: {
    marginLeft: 165,
    paddingTop: 24,
    paddingRight: 16,
    paddingBottom: 20,
  },

  motivationLabel: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  motivationTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
    lineHeight: 27,
  },

  motivationText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  motivationDivider: {
    width: 45,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#22d3ee',
    marginTop: 14,
  },

  gokuQuote: {
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
  },

  energyBadge: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#155e75',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  energyBadgeText: {
    color: '#67e8f9',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // -----------------------------------------------
  // Activity
  // -----------------------------------------------

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },

  totalWorkoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  workoutIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },

  workoutIconText: {
    fontSize: 25,
  },

  workoutInfo: {
    flex: 1,
    marginLeft: 14,
  },

  workoutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  workoutDescription: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 3,
  },

  workoutCount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#7c3aed',
  },

  smallActivityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 17,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  smallCardTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },

  smallCardSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },

  countCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countCircleText: {
    color: '#7c3aed',
    fontSize: 15,
    fontWeight: '900',
  },

  // -----------------------------------------------
  // Final motivation
  // -----------------------------------------------

  finalMotivationCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    marginTop: 10,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  finalMotivationEmoji: {
    fontSize: 30,
    marginRight: 14,
  },

  finalMotivationText: {
    flex: 1,
  },

  finalMotivationTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  finalMotivationSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },

  // -----------------------------------------------
  // Plan
  // -----------------------------------------------

  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
  },

  planTitle: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 16,
  },

  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  planIcon: {
    fontSize: 25,
    width: 42,
  },

  planText: {
    flex: 1,
  },

  planHeading: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },

  planSubheading: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 3,
  },

  planFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 14,
    marginTop: 3,
  },

  planFooterText: {
    color: '#6b7280',
    fontSize: 11,
    lineHeight: 17,
  },
});