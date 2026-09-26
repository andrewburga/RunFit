import React, {
  useCallback,
  useState,
} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  useFocusEffect,
} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Activity =
  | 'Walking'
  | 'Jogging'
  | 'Running';

type RoutePoint = {
  latitude: number;
  longitude: number;
};

type Workout = {
  id: number;
  activity: Activity;
  duration: number;
  distance: number;
  route: RoutePoint[];
};

const HISTORY_KEY =
  '@runfit_workout_history';

export default function HistoryScreen() {
  const [history, setHistory] =
    useState<Workout[]>([]);

  // -----------------------------------------------
  // Load history whenever History tab is opened
  // -----------------------------------------------

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const savedHistory =
        await AsyncStorage.getItem(
          HISTORY_KEY
        );

      if (savedHistory) {
        setHistory(
          JSON.parse(savedHistory)
        );
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.log(
        'Error loading history:',
        error
      );
    }
  };

  // -----------------------------------------------
  // Format time
  // -----------------------------------------------

  const formatTime = (
    totalSeconds: number
  ) => {
    const minutes = Math.floor(
      totalSeconds / 60
    );

    const seconds =
      totalSeconds % 60;

    return `${String(
      minutes
    ).padStart(
      2,
      '0'
    )}:${String(
      seconds
    ).padStart(
      2,
      '0'
    )}`;
  };

  // -----------------------------------------------
  // Delete one workout
  // -----------------------------------------------

  const deleteWorkout = (
    workoutId: number
  ) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              const updatedHistory =
                history.filter(
                  (workout) =>
                    workout.id !==
                    workoutId
                );

              setHistory(
                updatedHistory
              );

              await AsyncStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(
                  updatedHistory
                )
              );
            } catch (error) {
              console.log(
                'Error deleting workout:',
                error
              );
            }
          },
        },
      ]
    );
  };

  // -----------------------------------------------
  // Delete all history
  // -----------------------------------------------

  const clearAllHistory = () => {
    if (history.length === 0) {
      return;
    }

    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all your running, walking and jogging history?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',

          onPress: async () => {
            try {
              await AsyncStorage.removeItem(
                HISTORY_KEY
              );

              setHistory([]);
            } catch (error) {
              console.log(
                'Error clearing history:',
                error
              );
            }
          },
        },
      ]
    );
  };

  // -----------------------------------------------
  // UI
  // -----------------------------------------------

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
          <View>
            <Text
              style={styles.title}
            >
              History
            </Text>

            <Text
              style={styles.subtitle}
            >
              Your previous activities
            </Text>
          </View>

          {history.length > 0 && (
            <TouchableOpacity
              style={
                styles.clearButton
              }
              onPress={
                clearAllHistory
              }
            >
              <Text
                style={
                  styles.clearButtonText
                }
              >
                Clear All
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Empty */}

        {history.length === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyIcon}
            >
              📜
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No workouts yet
            </Text>

            <Text
              style={styles.emptyText}
            >
              Complete a running, walking
              or jogging activity and it
              will appear here.
            </Text>
          </View>
        ) : (
          history.map(
            (workout) => (
              <View
                key={workout.id}
                style={
                  styles.workoutCard
                }
              >
                {/* Top Row */}

                <View
                  style={
                    styles.topRow
                  }
                >
                  <View
                    style={
                      styles.activityInfo
                    }
                  >
                    <Text
                      style={
                        styles.activity
                      }
                    >
                      {
                        workout.activity
                      }
                    </Text>

                    <Text
                      style={
                        styles.date
                      }
                    >
                      {new Date(
                        workout.id
                      ).toLocaleDateString()}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.routeIcon
                    }
                  >
                    🗺️
                  </Text>
                </View>

                <View
                  style={styles.divider}
                />

                {/* Stats */}

                <View
                  style={
                    styles.statsRow
                  }
                >
                  <View
                    style={styles.stat}
                  >
                    <Text
                      style={
                        styles.statValue
                      }
                    >
                      {formatTime(
                        workout.duration
                      )}
                    </Text>

                    <Text
                      style={
                        styles.statLabel
                      }
                    >
                      Duration
                    </Text>
                  </View>

                  <View
                    style={styles.stat}
                  >
                    <Text
                      style={
                        styles.statValue
                      }
                    >
                      {workout.distance.toFixed(
                        2
                      )}{' '}
                      km
                    </Text>

                    <Text
                      style={
                        styles.statLabel
                      }
                    >
                      Distance
                    </Text>
                  </View>

                  <View
                    style={styles.stat}
                  >
                    <Text
                      style={
                        styles.statValue
                      }
                    >
                      {
                        workout.route
                          ?.length ??
                        0
                      }
                    </Text>

                    <Text
                      style={
                        styles.statLabel
                      }
                    >
                      GPS Points
                    </Text>
                  </View>
                </View>

                {/* Delete */}

                <TouchableOpacity
                  style={
                    styles.deleteButton
                  }
                  onPress={() =>
                    deleteWorkout(
                      workout.id
                    )
                  }
                >
                  <Text
                    style={
                      styles.deleteButtonText
                    }
                  >
                    🗑️ Delete Activity
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },

  clearButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 12,
  },

  clearButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },

  emptyIcon: {
    fontSize: 45,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  workoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  activityInfo: {
    flex: 1,
  },

  activity: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  date: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  routeIcon: {
    fontSize: 28,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  stat: {
    alignItems: 'center',
    flex: 1,
  },

  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },

  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },

  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
  },
});