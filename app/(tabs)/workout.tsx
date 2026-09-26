import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

type TimerState = {
  exerciseId: number;
  section: 'morning' | 'evening';
  secondsLeft: number;
  currentSet: number;
  totalSets: number;
  running: boolean;
};

const WORKOUT_KEY = '@runfit_custom_workouts';

const DAYS = [
  { number: 0, name: 'Sunday' },
  { number: 1, name: 'Monday' },
  { number: 2, name: 'Tuesday' },
  { number: 3, name: 'Wednesday' },
  { number: 4, name: 'Thursday' },
  { number: 5, name: 'Friday' },
  { number: 6, name: 'Saturday' },
];

const getTodayNumber = () => {
  return new Date().getDay();
};

const getWeekStart = () => {
  const today = new Date();

  const sunday = new Date(today);

  sunday.setDate(
    today.getDate() - today.getDay()
  );

  return `${sunday.getFullYear()}-${String(
    sunday.getMonth() + 1
  ).padStart(2, '0')}-${String(
    sunday.getDate()
  ).padStart(2, '0')}`;
};

const createEmptyEvenings = (): DayWorkout[] => {
  return DAYS.map((day) => ({
    day: day.number,
    exercises: [],
  }));
};

const createEmptyWorkout = (): WeeklyWorkout => {
  return {
    weekStart: getWeekStart(),
    morning: [],
    evenings: createEmptyEvenings(),
  };
};

const resetCompletions = (
  exercises: Exercise[]
): Exercise[] => {
  return exercises.map((exercise) => ({
    ...exercise,
    completed: false,
  }));
};

export default function WorkoutScreen() {
  const [workout, setWorkout] =
    useState<WeeklyWorkout | null>(null);

  const [selectedDay, setSelectedDay] =
    useState(getTodayNumber());

  const [showAddMorning, setShowAddMorning] =
    useState(false);

  const [showAddEvening, setShowAddEvening] =
    useState(false);

  const [exerciseName, setExerciseName] =
    useState('');

  const [exerciseType, setExerciseType] =
    useState<ExerciseType>('time');

  const [timeValue, setTimeValue] =
    useState('');

  const [repsValue, setRepsValue] =
    useState('');

  const [setsValue, setSetsValue] =
    useState('');

  const [timer, setTimer] =
    useState<TimerState | null>(null);

  // ==================================================
  // COMPLETION ANIMATION
  // ==================================================

  const completionAnimations =
    useRef<Record<number, Animated.Value>>({});

  const getCompletionAnimation = (
    id: number
  ) => {
    if (!completionAnimations.current[id]) {
      completionAnimations.current[id] =
        new Animated.Value(1);
    }

    return completionAnimations.current[id];
  };

  const playCompletionAnimation = (
    id: number,
    completing: boolean
  ) => {
    const animation =
      getCompletionAnimation(id);

    if (!completing) {
      animation.setValue(1);
      return;
    }

    animation.setValue(0.92);

    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1.08,
        duration: 140,
        easing: Easing.out(
          Easing.quad
        ),
        useNativeDriver: true,
      }),

      Animated.spring(animation, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ==================================================
  // Load workout
  // ==================================================

  useEffect(() => {
    loadWorkout();
  }, []);

  // ==================================================
  // Countdown timer
  // ==================================================

  useEffect(() => {
    if (!timer?.running) {
      return;
    }

    const interval = setInterval(() => {
      setTimer((previous) => {
        if (!previous || !previous.running) {
          return previous;
        }

        if (previous.secondsLeft > 1) {
          return {
            ...previous,
            secondsLeft:
              previous.secondsLeft - 1,
          };
        }

        // --------------------------------------------
        // Timer reached zero
        // --------------------------------------------

        if (
          previous.currentSet <
          previous.totalSets
        ) {
          Alert.alert(
            'Set Complete! 🎉',
            `Set ${previous.currentSet} finished.`,
            [
              {
                text: 'Next Set',
                onPress: () => {
                  setTimer((current) => {
                    if (!current) {
                      return null;
                    }

                    const exercise =
                      findExercise(
                        current.exerciseId,
                        current.section
                      );

                    if (!exercise) {
                      return null;
                    }

                    return {
                      ...current,
                      currentSet:
                        current.currentSet +
                        1,
                      secondsLeft:
                        exercise.time ||
                        0,
                      running: true,
                    };
                  });
                },
              },
            ]
          );

          return {
            ...previous,
            secondsLeft: 0,
            running: false,
          };
        }

        // --------------------------------------------
        // Final set completed
        // --------------------------------------------

        Alert.alert(
          'Exercise Complete! 🎉',
          'Great job!',
          [
            {
              text: 'OK',
              onPress: () => {
                completeExercise(
                  previous.exerciseId,
                  previous.section
                );

                playCompletionAnimation(
                  previous.exerciseId,
                  true
                );

                setTimer(null);
              },
            },
          ]
        );

        return {
          ...previous,
          secondsLeft: 0,
          running: false,
        };
      });
    }, 1000);

    return () =>
      clearInterval(interval);
  }, [timer?.running]);

  // ==================================================
  // Load saved workout
  // ==================================================

  const loadWorkout = async () => {
    try {
      const saved =
        await AsyncStorage.getItem(
          WORKOUT_KEY
        );

      if (!saved) {
        const emptyWorkout =
          createEmptyWorkout();

        setWorkout(emptyWorkout);

        await AsyncStorage.setItem(
          WORKOUT_KEY,
          JSON.stringify(emptyWorkout)
        );

        return;
      }

      const parsed: WeeklyWorkout =
        JSON.parse(saved);

      // ----------------------------------------------
      // New week
      // ----------------------------------------------

      if (
        parsed.weekStart !==
        getWeekStart()
      ) {
        const newWorkout: WeeklyWorkout = {
          weekStart: getWeekStart(),

          morning:
            (parsed.morning || []).map(
              (exercise) => ({
                ...exercise,
                completed: false,
              })
            ),

          evenings:
            DAYS.map((day) => {
              const existing =
                parsed.evenings?.find(
                  (item) =>
                    item.day ===
                    day.number
                );

              return {
                day: day.number,
                exercises:
                  existing
                    ? resetCompletions(
                        existing.exercises
                      )
                    : [],
              };
            }),
        };

        setWorkout(newWorkout);

        await AsyncStorage.setItem(
          WORKOUT_KEY,
          JSON.stringify(newWorkout)
        );

        return;
      }

      // ----------------------------------------------
      // Make sure all days exist
      // ----------------------------------------------

      const fixedWorkout: WeeklyWorkout = {
        weekStart:
          parsed.weekStart,

        morning:
          parsed.morning || [],

        evenings:
          DAYS.map((day) => {
            const existing =
              parsed.evenings?.find(
                (item) =>
                  item.day ===
                  day.number
              );

            return (
              existing || {
                day: day.number,
                exercises: [],
              }
            );
          }),
      };

      setWorkout(fixedWorkout);
    } catch (error) {
      console.log(
        'Error loading workout:',
        error
      );

      const emptyWorkout =
        createEmptyWorkout();

      setWorkout(emptyWorkout);
    }
  };

  // ==================================================
  // Save workout
  // ==================================================

  const saveWorkout = async (
    updatedWorkout: WeeklyWorkout
  ) => {
    try {
      setWorkout(updatedWorkout);

      await AsyncStorage.setItem(
        WORKOUT_KEY,
        JSON.stringify(updatedWorkout)
      );
    } catch (error) {
      console.log(
        'Error saving workout:',
        error
      );
    }
  };

  // ==================================================
  // Reset form
  // ==================================================

  const resetForm = () => {
    setExerciseName('');
    setExerciseType('time');
    setTimeValue('');
    setRepsValue('');
    setSetsValue('');
  };

  // ==================================================
  // Add exercise
  // ==================================================

  const addExercise = async (
    section: 'morning' | 'evening'
  ) => {
    if (!workout) {
      return;
    }

    const trimmedName =
      exerciseName.trim();

    if (!trimmedName) {
      Alert.alert(
        'Exercise name required',
        'Please enter the exercise name.'
      );

      return;
    }

    const time =
      Number(timeValue);

    const reps =
      Number(repsValue);

    const sets =
      Number(setsValue);

    if (
      exerciseType === 'time' &&
      (!timeValue ||
        isNaN(time) ||
        time <= 0)
    ) {
      Alert.alert(
        'Invalid time',
        'Please enter a valid time in seconds.'
      );

      return;
    }

    if (
      exerciseType === 'reps' &&
      (!repsValue ||
        isNaN(reps) ||
        reps <= 0)
    ) {
      Alert.alert(
        'Invalid reps',
        'Please enter a valid number of reps.'
      );

      return;
    }

    if (
      exerciseType === 'sets-reps' &&
      (!setsValue ||
        isNaN(sets) ||
        sets <= 0 ||
        !repsValue ||
        isNaN(reps) ||
        reps <= 0)
    ) {
      Alert.alert(
        'Invalid values',
        'Please enter valid sets and reps.'
      );

      return;
    }

    if (
      exerciseType === 'sets-time' &&
      (!setsValue ||
        isNaN(sets) ||
        sets <= 0 ||
        !timeValue ||
        isNaN(time) ||
        time <= 0)
    ) {
      Alert.alert(
        'Invalid values',
        'Please enter valid sets and time.'
      );

      return;
    }

    const newExercise: Exercise = {
      id: Date.now(),
      name: trimmedName,
      type: exerciseType,
      completed: false,
    };

    if (
      exerciseType === 'time'
    ) {
      newExercise.time = time;
    }

    if (
      exerciseType === 'reps'
    ) {
      newExercise.reps = reps;
    }

    if (
      exerciseType === 'sets-reps'
    ) {
      newExercise.sets = sets;
      newExercise.reps = reps;
    }

    if (
      exerciseType === 'sets-time'
    ) {
      newExercise.sets = sets;
      newExercise.time = time;
    }

    let updatedWorkout: WeeklyWorkout;

    if (section === 'morning') {
      updatedWorkout = {
        ...workout,
        morning: [
          ...workout.morning,
          newExercise,
        ],
      };

      setShowAddMorning(false);
    } else {
      const updatedEvenings =
        workout.evenings.map((day) => {
          if (
            day.day !== selectedDay
          ) {
            return day;
          }

          return {
            ...day,
            exercises: [
              ...day.exercises,
              newExercise,
            ],
          };
        });

      updatedWorkout = {
        ...workout,
        evenings:
          updatedEvenings,
      };

      setShowAddEvening(false);
    }

    resetForm();

    await saveWorkout(
      updatedWorkout
    );
  };

  // ==================================================
  // Find exercise
  // ==================================================

  const findExercise = (
    id: number,
    section: 'morning' | 'evening'
  ): Exercise | null => {
    if (!workout) {
      return null;
    }

    if (section === 'morning') {
      return (
        workout.morning.find(
          (exercise) =>
            exercise.id === id
        ) || null
      );
    }

    const day =
      workout.evenings.find(
        (item) =>
          item.day === selectedDay
      );

    return (
      day?.exercises.find(
        (exercise) =>
          exercise.id === id
      ) || null
    );
  };

  // ==================================================
  // Complete exercise
  // ==================================================

  const completeExercise = async (
    id: number,
    section: 'morning' | 'evening'
  ) => {
    if (!workout) {
      return;
    }

    if (section === 'morning') {
      const updatedMorning =
        workout.morning.map(
          (exercise) =>
            exercise.id === id
              ? {
                  ...exercise,
                  completed: true,
                }
              : exercise
        );

      await saveWorkout({
        ...workout,
        morning:
          updatedMorning,
      });

      return;
    }

    const updatedEvenings =
      workout.evenings.map((day) => {
        if (
          day.day !== selectedDay
        ) {
          return day;
        }

        return {
          ...day,
          exercises:
            day.exercises.map(
              (exercise) =>
                exercise.id === id
                  ? {
                      ...exercise,
                      completed: true,
                    }
                  : exercise
            ),
        };
      });

    await saveWorkout({
      ...workout,
      evenings:
        updatedEvenings,
    });
  };

  // ==================================================
  // Toggle DONE
  // ==================================================

  const toggleExercise = async (
    id: number,
    section: 'morning' | 'evening'
  ) => {
    if (!workout) {
      return;
    }

    let completing = false;

    if (section === 'morning') {
      const target =
        workout.morning.find(
          (exercise) =>
            exercise.id === id
        );

      completing =
        target
          ? !target.completed
          : false;

      const updatedMorning =
        workout.morning.map(
          (exercise) =>
            exercise.id === id
              ? {
                  ...exercise,
                  completed:
                    !exercise.completed,
                }
              : exercise
        );

      await saveWorkout({
        ...workout,
        morning:
          updatedMorning,
      });

      playCompletionAnimation(
        id,
        completing
      );

      return;
    }

    const selectedEvening =
      workout.evenings.find(
        (day) =>
          day.day === selectedDay
      );

    const target =
      selectedEvening?.exercises.find(
        (exercise) =>
          exercise.id === id
      );

    completing =
      target
        ? !target.completed
        : false;

    const updatedEvenings =
      workout.evenings.map((day) => {
        if (
          day.day !== selectedDay
        ) {
          return day;
        }

        return {
          ...day,
          exercises:
            day.exercises.map(
              (exercise) =>
                exercise.id === id
                  ? {
                      ...exercise,
                      completed:
                        !exercise.completed,
                    }
                  : exercise
            ),
        };
      });

    await saveWorkout({
      ...workout,
      evenings:
        updatedEvenings,
    });

    playCompletionAnimation(
      id,
      completing
    );
  };

  // ==================================================
  // Start timer
  // ==================================================

  const startTimer = (
    exercise: Exercise,
    section: 'morning' | 'evening'
  ) => {
    if (!exercise.time) {
      return;
    }

    const totalSets =
      exercise.type === 'sets-time'
        ? exercise.sets || 1
        : 1;

    setTimer({
      exerciseId:
        exercise.id,
      section,
      secondsLeft:
        exercise.time,
      currentSet: 1,
      totalSets,
      running: true,
    });
  };

  // ==================================================
  // Pause timer
  // ==================================================

  const pauseTimer = () => {
    setTimer((previous) => {
      if (!previous) {
        return null;
      }

      return {
        ...previous,
        running: false,
      };
    });
  };

  // ==================================================
  // Resume timer
  // ==================================================

  const resumeTimer = () => {
    setTimer((previous) => {
      if (!previous) {
        return null;
      }

      return {
        ...previous,
        running: true,
      };
    });
  };

  // ==================================================
  // Stop timer
  // ==================================================

  const stopTimer = () => {
    Alert.alert(
      'Stop Timer?',
      'The timer will reset.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            setTimer(null);
          },
        },
      ]
    );
  };

  // ==================================================
  // Format timer
  // ==================================================

  const formatTimer = (
    seconds: number
  ) => {
    const minutes =
      Math.floor(seconds / 60);

    const secs =
      seconds % 60;

    return `${String(
      minutes
    ).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`;
  };

  // ==================================================
  // Delete morning exercise
  // ==================================================

  const deleteMorningExercise = (
    id: number
  ) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!workout) {
              return;
            }

            if (
              timer?.exerciseId === id
            ) {
              setTimer(null);
            }

            const updatedWorkout = {
              ...workout,
              morning:
                workout.morning.filter(
                  (exercise) =>
                    exercise.id !== id
                ),
            };

            await saveWorkout(
              updatedWorkout
            );
          },
        },
      ]
    );
  };

  // ==================================================
  // Delete evening exercise
  // ==================================================

  const deleteEveningExercise = (
    id: number
  ) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!workout) {
              return;
            }

            if (
              timer?.exerciseId === id
            ) {
              setTimer(null);
            }

            const updatedEvenings =
              workout.evenings.map(
                (day) => {
                  if (
                    day.day !==
                    selectedDay
                  ) {
                    return day;
                  }

                  return {
                    ...day,
                    exercises:
                      day.exercises.filter(
                        (exercise) =>
                          exercise.id !==
                          id
                      ),
                  };
                }
              );

            await saveWorkout({
              ...workout,
              evenings:
                updatedEvenings,
            });
          },
        },
      ]
    );
  };

  // ==================================================
  // Exercise details
  // ==================================================

  const getExerciseDetails = (
    exercise: Exercise
  ) => {
    switch (exercise.type) {
      case 'time':
        return `⏱️ ${exercise.time} sec`;

      case 'reps':
        return `🔢 ${exercise.reps} reps`;

      case 'sets-reps':
        return `🔢 ${exercise.sets} sets × ${exercise.reps} reps`;

      case 'sets-time':
        return `⏱️ ${exercise.sets} sets × ${exercise.time} sec`;

      default:
        return '';
    }
  };

  // ==================================================
  // Timer belongs to exercise
  // ==================================================

  const timerBelongsTo = (
    exercise: Exercise,
    section: 'morning' | 'evening'
  ) => {
    return (
      timer?.exerciseId ===
        exercise.id &&
      timer?.section === section
    );
  };

  // ==================================================
  // Render timer
  // ==================================================

  const renderTimer = (
    exercise: Exercise,
    section: 'morning' | 'evening'
  ) => {
    if (
      exercise.type !== 'time' &&
      exercise.type !== 'sets-time'
    ) {
      return null;
    }

    const active =
      timerBelongsTo(
        exercise,
        section
      );

    if (!active) {
      return (
        <TouchableOpacity
          style={styles.startTimerButton}
          onPress={() =>
            startTimer(
              exercise,
              section
            )
          }
        >
          <Text
            style={
              styles.startTimerText
            }
          >
            ▶ START TIMER
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.timerBox}>
        <Text style={styles.timerLabel}>
          {exercise.type ===
          'sets-time'
            ? `Set ${timer?.currentSet}/${timer?.totalSets}`
            : 'Timer'}
        </Text>

        <Text style={styles.timerValue}>
          {formatTimer(
            timer?.secondsLeft || 0
          )}
        </Text>

        <View style={styles.timerButtons}>
          {!timer?.running ? (
            <TouchableOpacity
              style={
                styles.resumeTimerButton
              }
              onPress={
                resumeTimer
              }
            >
              <Text
                style={
                  styles.timerButtonText
                }
              >
                ▶ RESUME
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={
                styles.pauseTimerButton
              }
              onPress={
                pauseTimer
              }
            >
              <Text
                style={
                  styles.timerButtonText
                }
              >
                ⏸ PAUSE
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={
              styles.stopTimerButton
            }
            onPress={stopTimer}
          >
            <Text
              style={
                styles.timerButtonText
              }
            >
              STOP
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==================================================
  // Render exercise
  // ==================================================

  const renderExercise = (
    exercise: Exercise,
    section: 'morning' | 'evening'
  ) => {
    const animation =
      getCompletionAnimation(
        exercise.id
      );

    return (
      <Animated.View
        key={exercise.id}
        style={[
          styles.exerciseCard,
          exercise.completed &&
            styles.exerciseCompleted,
          {
            transform: [
              {
                scale: animation,
              },
            ],
          },
        ]}
      >
        <View style={styles.exerciseInfo}>
          <Text
            style={[
              styles.exerciseName,
              exercise.completed &&
                styles.exerciseNameCompleted,
            ]}
          >
            {exercise.name}
          </Text>

          <Text
            style={styles.exerciseDetails}
          >
            {getExerciseDetails(
              exercise
            )}
          </Text>

          {renderTimer(
            exercise,
            section
          )}
        </View>

        <View
          style={styles.exerciseActions}
        >
          <TouchableOpacity
            style={[
              styles.doneButton,
              exercise.completed &&
                styles.doneButtonCompleted,
            ]}
            onPress={() =>
              toggleExercise(
                exercise.id,
                section
              )
            }
          >
            <Text
              style={[
                styles.doneButtonText,
                exercise.completed &&
                  styles.doneButtonTextCompleted,
              ]}
            >
              {exercise.completed
                ? 'DONE ✓'
                : 'DONE'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              if (
                section === 'morning'
              ) {
                deleteMorningExercise(
                  exercise.id
                );
              } else {
                deleteEveningExercise(
                  exercise.id
                );
              }
            }}
          >
            <Text
              style={
                styles.deleteText
              }
            >
              🗑️
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // ==================================================
  // Add Exercise Form
  // ==================================================

  const renderAddExerciseForm = (
    section: 'morning' | 'evening'
  ) => {
    const visible =
      section === 'morning'
        ? showAddMorning
        : showAddEvening;

    if (!visible) {
      return null;
    }

    return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>
          Add Exercise
        </Text>

        <Text
          style={styles.inputLabel}
        >
          Exercise Name
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Type exercise name"
          value={exerciseName}
          onChangeText={
            setExerciseName
          }
          placeholderTextColor="#9CA3AF"
        />

        <Text
          style={styles.inputLabel}
        >
          Select Type
        </Text>

        <View style={styles.typeGrid}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              exerciseType ===
                'time' &&
                styles.typeButtonActive,
            ]}
            onPress={() =>
              setExerciseType(
                'time'
              )
            }
          >
            <Text
              style={[
                styles.typeButtonText,
                exerciseType ===
                  'time' &&
                  styles.typeButtonTextActive,
              ]}
            >
              ⏱️ Time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              exerciseType ===
                'reps' &&
                styles.typeButtonActive,
            ]}
            onPress={() =>
              setExerciseType(
                'reps'
              )
            }
          >
            <Text
              style={[
                styles.typeButtonText,
                exerciseType ===
                  'reps' &&
                  styles.typeButtonTextActive,
              ]}
            >
              🔢 Reps
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              exerciseType ===
                'sets-reps' &&
                styles.typeButtonActive,
            ]}
            onPress={() =>
              setExerciseType(
                'sets-reps'
              )
            }
          >
            <Text
              style={[
                styles.typeButtonText,
                exerciseType ===
                  'sets-reps' &&
                  styles.typeButtonTextActive,
              ]}
            >
              Sets + Reps
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              exerciseType ===
                'sets-time' &&
                styles.typeButtonActive,
            ]}
            onPress={() =>
              setExerciseType(
                'sets-time'
              )
            }
          >
            <Text
              style={[
                styles.typeButtonText,
                exerciseType ===
                  'sets-time' &&
                  styles.typeButtonTextActive,
              ]}
            >
              Sets + Time
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time */}

        {(
          exerciseType === 'time' ||
          exerciseType ===
            'sets-time'
        ) && (
          <>
            <Text
              style={
                styles.inputLabel
              }
            >
              Time (seconds)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: 30"
              value={timeValue}
              onChangeText={
                setTimeValue
              }
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </>
        )}

        {/* Reps */}

        {(
          exerciseType === 'reps' ||
          exerciseType ===
            'sets-reps'
        ) && (
          <>
            <Text
              style={
                styles.inputLabel
              }
            >
              Reps
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: 10"
              value={repsValue}
              onChangeText={
                setRepsValue
              }
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </>
        )}

        {/* Sets */}

        {(
          exerciseType ===
            'sets-reps' ||
          exerciseType ===
            'sets-time'
        ) && (
          <>
            <Text
              style={
                styles.inputLabel
              }
            >
              Sets
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: 3"
              value={setsValue}
              onChangeText={
                setSetsValue
              }
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </>
        )}

        <View
          style={styles.formButtons}
        >
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              resetForm();

              if (
                section === 'morning'
              ) {
                setShowAddMorning(
                  false
                );
              } else {
                setShowAddEvening(
                  false
                );
              }
            }}
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              addExercise(section)
            }
          >
            <Text
              style={
                styles.addButtonText
              }
            >
              Add Exercise
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==================================================
  // Data
  // ==================================================

  const selectedEvening =
    workout?.evenings.find(
      (day) =>
        day.day === selectedDay
    );

  const eveningExercises =
    selectedEvening?.exercises || [];

  const morningCompleted =
    workout?.morning.filter(
      (exercise) =>
        exercise.completed
    ).length || 0;

  const morningTotal =
    workout?.morning.length || 0;

  const eveningCompleted =
    eveningExercises.filter(
      (exercise) =>
        exercise.completed
    ).length || 0;

  const eveningTotal =
    eveningExercises.length;

  const selectedDayName =
    DAYS.find(
      (day) =>
        day.number === selectedDay
    )?.name || '';

  const isRestDay =
    selectedDay === 2;

  // ==================================================
  // Loading
  // ==================================================

  if (!workout) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View style={styles.loading}>
          <Text
            style={styles.loadingText}
          >
            Loading workout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Header */}

        <View style={styles.header}>
          <Text style={styles.logo}>
            Workout
          </Text>

          <Text style={styles.subtitle}>
            Build your own routine.
          </Text>
        </View>

        {/* Weekly Days */}

        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>
            Weekly Workout
          </Text>

          <Text
            style={styles.weekSubtitle}
          >
            Sunday → Saturday
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.daysContainer
            }
          >
            {DAYS.map((day) => {
              const active =
                selectedDay ===
                day.number;

              const rest =
                day.number === 2;

              return (
                <TouchableOpacity
                  key={day.number}
                  style={[
                    styles.dayButton,
                    active &&
                      styles.dayButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedDay(
                      day.number
                    );

                    setTimer(null);
                  }}
                >
                  <Text
                    style={[
                      styles.dayName,
                      active &&
                        styles.dayNameActive,
                    ]}
                  >
                    {day.name.slice(
                      0,
                      3
                    )}
                  </Text>

                  {rest && (
                    <Text
                      style={[
                        styles.restSmall,
                        active &&
                          styles.restSmallActive,
                      ]}
                    >
                      Rest
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Morning */}

        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              🌅 Morning Workout
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {morningTotal === 0
                ? 'No exercises added yet.'
                : `${morningCompleted}/${morningTotal} completed`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => {
              resetForm();
              setShowAddMorning(
                !showAddMorning
              );
            }}
          >
            <Text
              style={styles.plusText}
            >
              +
            </Text>
          </TouchableOpacity>
        </View>

        {renderAddExerciseForm(
          'morning'
        )}

        {workout.morning.length ===
        0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyIcon}
            >
              ➕
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              Add your exercises
            </Text>

            <Text
              style={styles.emptyText}
            >
              Tap + and create your custom
              morning workout.
            </Text>
          </View>
        ) : (
          workout.morning.map(
            (exercise) =>
              renderExercise(
                exercise,
                'morning'
              )
          )
        )}

        {/* Evening */}

        <View
          style={[
            styles.sectionHeader,
            { marginTop: 28 },
          ]}
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              🌆 Evening Workout
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {isRestDay
                ? 'Rest day'
                : eveningTotal === 0
                ? 'No exercises added yet.'
                : `${eveningCompleted}/${eveningTotal} completed`}
            </Text>
          </View>

          {!isRestDay && (
            <TouchableOpacity
              style={
                styles.plusButton
              }
              onPress={() => {
                resetForm();
                setShowAddEvening(
                  !showAddEvening
                );
              }}
            >
              <Text
                style={
                  styles.plusText
                }
              >
                +
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isRestDay ? (
          <View
            style={styles.restCard}
          >
            <Text
              style={styles.restIcon}
            >
              😴
            </Text>

            <Text
              style={styles.restTitle}
            >
              Rest Day
            </Text>

            <Text
              style={styles.restText}
            >
              Tuesday is your rest day.
            </Text>
          </View>
        ) : (
          <>
            {renderAddExerciseForm(
              'evening'
            )}

            {eveningExercises.length ===
            0 ? (
              <View
                style={styles.emptyCard}
              >
                <Text
                  style={
                    styles.emptyIcon
                  }
                >
                  ➕
                </Text>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Add your exercises
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Tap + and create your custom
                  evening workout.
                </Text>
              </View>
            ) : (
              eveningExercises.map(
                (exercise) =>
                  renderExercise(
                    exercise,
                    'evening'
                  )
              )
            )}
          </>
        )}

        {/* Progress */}

        <Text
          style={[
            styles.sectionTitle,
            { marginTop: 30 },
          ]}
        >
          📊 Today's Progress
        </Text>

        <View
          style={styles.progressCard}
        >
          <View
            style={styles.progressRow}
          >
            <Text
              style={
                styles.progressLabel
              }
            >
              Morning
            </Text>

            <Text
              style={
                styles.progressValue
              }
            >
              {morningCompleted}/
              {morningTotal}
            </Text>
          </View>

          <View
            style={
              styles.progressBarBackground
            }
          >
            <View
              style={[
                styles.progressBar,
                {
                  width:
                    morningTotal ===
                    0
                      ? '0%'
                      : `${
                          (morningCompleted /
                            morningTotal) *
                          100
                        }%`,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.progressRow,
              { marginTop: 18 },
            ]}
          >
            <Text
              style={
                styles.progressLabel
              }
            >
              {selectedDayName} Evening
            </Text>

            <Text
              style={
                styles.progressValue
              }
            >
              {isRestDay
                ? 'REST'
                : `${eveningCompleted}/${eveningTotal}`}
            </Text>
          </View>

          {!isRestDay && (
            <View
              style={
                styles.progressBarBackground
              }
            >
              <View
                style={[
                  styles.progressBar,
                  {
                    width:
                      eveningTotal ===
                      0
                        ? '0%'
                        : `${
                            (eveningCompleted /
                              eveningTotal) *
                            100
                          }%`,
                  },
                ]}
              />
            </View>
          )}
        </View>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  header: {
    marginBottom: 20,
  },

  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
  },

  // ------------------------------------------------
  // Week
  // ------------------------------------------------

  weekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 25,
    elevation: 3,
  },

  weekTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  weekSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 3,
  },

  daysContainer: {
    gap: 8,
    marginTop: 15,
  },

  dayButton: {
    width: 65,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dayButtonActive: {
    backgroundColor: '#111827',
  },

  dayName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#374151',
  },

  dayNameActive: {
    color: '#FFFFFF',
  },

  restSmall: {
    fontSize: 9,
    marginTop: 2,
    color: '#6B7280',
    fontWeight: '600',
  },

  restSmallActive: {
    color: '#D1D5DB',
  },

  // ------------------------------------------------
  // Sections
  // ------------------------------------------------

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  sectionSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 3,
  },

  plusButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },

  plusText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 32,
  },

  // ------------------------------------------------
  // Form
  // ------------------------------------------------

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    elevation: 3,
  },

  formTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 15,
    color: '#111827',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  typeButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },

  typeButtonActive: {
    backgroundColor: '#111827',
  },

  typeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },

  typeButtonTextActive: {
    color: '#FFFFFF',
  },

  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },

  cancelButtonText: {
    fontWeight: '700',
    color: '#374151',
  },

  addButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 13,
    backgroundColor: '#111827',
    alignItems: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ------------------------------------------------
  // Exercise
  // ------------------------------------------------

  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  exerciseCompleted: {
    opacity: 0.65,
  },

  exerciseInfo: {
    flex: 1,
    paddingRight: 10,
  },

  exerciseName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
  },

  exerciseDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 5,
  },

  exerciseActions: {
    alignItems: 'center',
    gap: 8,
  },

  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },

  doneButtonCompleted: {
    backgroundColor: '#111827',
  },

  doneButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
  },

  doneButtonTextCompleted: {
    color: '#FFFFFF',
  },

  deleteButton: {
    padding: 4,
  },

  deleteText: {
    fontSize: 17,
  },

  // ------------------------------------------------
  // Timer
  // ------------------------------------------------

  startTimerButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  startTimerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  timerBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },

  timerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  timerValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#111827',
    marginVertical: 5,
  },

  timerButtons: {
    flexDirection: 'row',
    gap: 8,
  },

  resumeTimerButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },

  pauseTimerButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },

  stopTimerButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },

  timerButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // ------------------------------------------------
  // Empty
  // ------------------------------------------------

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
    marginBottom: 5,
  },

  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 5,
    fontSize: 13,
  },

  // ------------------------------------------------
  // Rest
  // ------------------------------------------------

  restCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },

  restIcon: {
    fontSize: 40,
    marginBottom: 8,
  },

  restTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  restText: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },

  // ------------------------------------------------
  // Progress
  // ------------------------------------------------

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
    elevation: 3,
  },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  progressValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  progressBarBackground: {
    height: 9,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 8,
  },

  progressBar: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#111827',
  },

  bottomSpace: {
    height: 20,
  },
});