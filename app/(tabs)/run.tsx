import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, {
  Marker,
  Polyline,
  Region,
} from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Activity = 'Walking' | 'Jogging' | 'Running';

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

const HISTORY_KEY = '@runfit_workout_history';

export default function RunScreen() {
  const router = useRouter();

  const [activity, setActivity] = useState<Activity>('Walking');
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] =
    useState<RoutePoint | null>(null);

  const [history, setHistory] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] =
    useState<Workout | null>(null);

  const locationSubscription =
    useRef<Location.LocationSubscription | null>(null);

  const lastLocation = useRef<RoutePoint | null>(null);

  const mapRef = useRef<MapView | null>(null);

  /* ---------------- LOAD HISTORY ---------------- */

  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);

      if (!stored) {
        setHistory([]);
        return;
      }

      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        setHistory(parsed);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.log('Error loading history:', error);
      setHistory([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  /* ---------------- CLEANUP GPS ---------------- */

  useEffect(() => {
    return () => {
      locationSubscription.current?.remove();
      locationSubscription.current = null;
    };
  }, []);

  /* ---------------- TIMER ---------------- */

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (running && !paused) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [running, paused]);

  /* ---------------- FORMAT TIME ---------------- */

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${hrs > 0 ? `${String(hrs).padStart(2, '0')}:` : ''}${String(
      mins
    ).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  /* ---------------- DISTANCE CALCULATION ---------------- */

  const calculateDistance = (
    point1: RoutePoint,
    point2: RoutePoint
  ) => {
    const R = 6371000;

    const lat1 = (point1.latitude * Math.PI) / 180;
    const lat2 = (point2.latitude * Math.PI) / 180;

    const dLat =
      ((point2.latitude - point1.latitude) * Math.PI) / 180;

    const dLon =
      ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  /* ---------------- START GPS ---------------- */

  const startGPS = async (isResume = false) => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'RunFit needs location permission to track your route.'
        );
        return false;
      }

      if (!isResume) {
        lastLocation.current = null;
      }

      const subscription =
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 2,
          },
          (location) => {
            const {
              latitude,
              longitude,
              accuracy,
            } = location.coords;

            if (
              typeof accuracy === 'number' &&
              accuracy > 30
            ) {
              return;
            }

            const current = {
              latitude,
              longitude,
            };

            setCurrentLocation(current);

            /*
             * Move the map camera to the current location.
             */
            mapRef.current?.animateToRegion(
              {
                latitude,
                longitude,
                latitudeDelta: 0.004,
                longitudeDelta: 0.004,
              },
              500
            );

            /*
             * First GPS point.
             */
            if (!lastLocation.current) {
              lastLocation.current = current;

              /*
               * Only create a new route when starting
               * a completely new workout.
               */
              if (!isResume) {
                setRoute([current]);
              } else {
                setRoute((prev) => {
                  if (prev.length === 0) {
                    return [current];
                  }

                  return prev;
                });
              }

              return;
            }

            const movement = calculateDistance(
              lastLocation.current,
              current
            );

            /*
             * Ignore GPS jumps/noise.
             */
            if (movement < 5 || movement > 100) {
              return;
            }

            setDistance((prev) => prev + movement);

            setRoute((prev) => [...prev, current]);

            lastLocation.current = current;
          }
        );

      locationSubscription.current = subscription;

      return true;
    } catch (error) {
      console.log('GPS error:', error);

      Alert.alert(
        'GPS Error',
        'Unable to start location tracking.'
      );

      return false;
    }
  };

  /* ---------------- STOP GPS ---------------- */

  const stopGPS = () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    lastLocation.current = null;
  };

  /* ---------------- START WORKOUT ---------------- */

  const startWorkout = async () => {
    setSeconds(0);
    setDistance(0);
    setRoute([]);
    setCurrentLocation(null);
    setPaused(false);
    setSelectedWorkout(null);

    const success = await startGPS(false);

    if (success) {
      setRunning(true);
    }
  };

  /* ---------------- PAUSE ---------------- */

  const pauseWorkout = () => {
    setPaused(true);
    stopGPS();
  };

  /* ---------------- RESUME ---------------- */

  const resumeWorkout = async () => {
    const success = await startGPS(true);

    if (success) {
      setPaused(false);
    }
  };

  /* ---------------- SAVE HISTORY ---------------- */

  const saveHistory = async (workout: Workout) => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);

      let latestHistory: Workout[] = [];

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          latestHistory = parsed;
        }
      }

      const updatedHistory = [
        workout,
        ...latestHistory,
      ];

      await AsyncStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(updatedHistory)
      );

      setHistory(updatedHistory);
    } catch (error) {
      console.log('Error saving history:', error);
    }
  };

  /* ---------------- END WORKOUT ---------------- */

  const stopWorkout = () => {
    Alert.alert(
      'End Workout?',
      'Do you want to save this activity?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            stopGPS();

            if (seconds > 0 || distance > 0) {
              const workout: Workout = {
                id: Date.now(),
                activity,
                duration: seconds,
                distance,
                route,
              };

              await saveHistory(workout);
            }

            setRunning(false);
            setPaused(false);
            setSeconds(0);
            setDistance(0);
            setRoute([]);
            setCurrentLocation(null);
          },
        },
      ]
    );
  };

  /* ---------------- TODAY'S ACTIVITIES ---------------- */

  const today = new Date();

  const todaysActivities = history.filter((item) => {
    const date = new Date(item.id);

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  });

  /* ---------------- MAP REGION ---------------- */

  const mapRegion: Region | undefined =
    currentLocation
      ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        }
      : undefined;

  /* ---------------- SELECTED ROUTE MAP ---------------- */

  const getRouteRegion = (
    selectedRoute: RoutePoint[]
  ): Region | undefined => {
    if (selectedRoute.length === 0) {
      return undefined;
    }

    if (selectedRoute.length === 1) {
      return {
        latitude: selectedRoute[0].latitude,
        longitude: selectedRoute[0].longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
    }

    let minLat = selectedRoute[0].latitude;
    let maxLat = selectedRoute[0].latitude;
    let minLng = selectedRoute[0].longitude;
    let maxLng = selectedRoute[0].longitude;

    selectedRoute.forEach((point) => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    const latitudeDelta = Math.max(
      maxLat - minLat + 0.003,
      0.004
    );

    const longitudeDelta = Math.max(
      maxLng - minLng + 0.003,
      0.004
    );

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta,
      longitudeDelta,
    };
  };

  /* ---------------- ACTIVITY DETAILS ---------------- */

  if (selectedWorkout) {
    const selectedRegion = getRouteRegion(
      selectedWorkout.route
    );

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.detailsContainer}
        >
          <View style={styles.detailsHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedWorkout(null)}
            >
              <Text style={styles.backButtonText}>
                ← Back
              </Text>
            </TouchableOpacity>

            <Text style={styles.detailsTitle}>
              Activity Details
            </Text>

            <View style={{ width: 60 }} />
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsActivity}>
              {selectedWorkout.activity}
            </Text>

            <Text style={styles.detailsDate}>
              {new Date(
                selectedWorkout.id
              ).toLocaleString()}
            </Text>

            <View style={styles.detailsStats}>
              <View style={styles.detailStat}>
                <Text style={styles.detailValue}>
                  {formatTime(
                    selectedWorkout.duration
                  )}
                </Text>

                <Text style={styles.detailLabel}>
                  Duration
                </Text>
              </View>

              <View style={styles.detailStat}>
                <Text style={styles.detailValue}>
                  {(
                    selectedWorkout.distance / 1000
                  ).toFixed(2)}
                </Text>

                <Text style={styles.detailLabel}>
                  KM
                </Text>
              </View>

              <View style={styles.detailStat}>
                <Text style={styles.detailValue}>
                  {selectedWorkout.route.length}
                </Text>

                <Text style={styles.detailLabel}>
                  Points
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.routeTitleRow}>
            <Text style={styles.sectionTitle}>
              Your Route
            </Text>
          </View>

          {selectedWorkout.route.length > 0 &&
          selectedRegion ? (
            <View style={styles.detailsMapContainer}>
              <MapView
                style={styles.detailsMap}
                initialRegion={selectedRegion}
              >
                <Polyline
                  coordinates={selectedWorkout.route}
                  strokeWidth={5}
                />

                <Marker
                  coordinate={
                    selectedWorkout.route[0]
                  }
                  title="Start"
                />

                {selectedWorkout.route.length > 1 && (
                  <Marker
                    coordinate={
                      selectedWorkout.route[
                        selectedWorkout.route.length - 1
                      ]
                    }
                    title="Finish"
                  />
                )}
              </MapView>
            </View>
          ) : (
            <View style={styles.noRouteBox}>
              <Text style={styles.noRouteText}>
                No GPS route was recorded for this
                activity.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---------------- MAIN RUN SCREEN ---------------- */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.title}>
            RunFit
          </Text>

          <Text style={styles.subtitle}>
            Track your walk, jog or run
          </Text>
        </View>

        {/* ACTIVITY SELECTOR */}

        <Text style={styles.sectionTitle}>
          Choose Activity
        </Text>

        <View style={styles.activityRow}>
          {(
            ['Walking', 'Jogging', 'Running'] as Activity[]
          ).map((item) => (
            <TouchableOpacity
              key={item}
              disabled={running}
              style={[
                styles.activityButton,
                activity === item &&
                  styles.activityButtonActive,
                running &&
                  styles.activityButtonDisabled,
              ]}
              onPress={() => setActivity(item)}
            >
              <Text
                style={[
                  styles.activityButtonText,
                  activity === item &&
                    styles.activityButtonTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LIVE MAP */}

        <View style={styles.mapContainer}>
          {mapRegion ? (
            <MapView
              ref={(ref) => {
                mapRef.current = ref;
              }}
              style={styles.map}
              region={mapRegion}
              showsUserLocation
              showsMyLocationButton
            >
              {route.length > 1 && (
                <Polyline
                  coordinates={route}
                  strokeWidth={5}
                />
              )}

              {route.length > 0 && (
                <Marker
                  coordinate={route[0]}
                  title="Start"
                />
              )}

              {currentLocation && (
                <Marker
                  coordinate={currentLocation}
                  title="Current Location"
                />
              )}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapIcon}>
                🗺️
              </Text>

              <Text style={styles.mapPlaceholderTitle}>
                GPS Map
              </Text>

              <Text style={styles.mapPlaceholderText}>
                Start a workout to track your route
              </Text>
            </View>
          )}
        </View>

        {/* TIMER CARD */}

        <View style={styles.trackerCard}>
          <Text style={styles.trackerTitle}>
            {activity}
          </Text>

          <Text style={styles.timer}>
            {formatTime(seconds)}
          </Text>

          <View style={styles.trackerStats}>
            <View style={styles.trackerStat}>
              <Text style={styles.trackerStatValue}>
                {(distance / 1000).toFixed(2)}
              </Text>

              <Text style={styles.trackerStatLabel}>
                KM
              </Text>
            </View>

            <View style={styles.trackerStat}>
              <Text style={styles.trackerStatValue}>
                {running
                  ? paused
                    ? 'PAUSED'
                    : 'GPS ON'
                  : 'READY'}
              </Text>

              <Text style={styles.trackerStatLabel}>
                STATUS
              </Text>
            </View>
          </View>

          {/* CONTROLS */}

          {!running ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startWorkout}
            >
              <Text style={styles.startButtonText}>
                START
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.controlRow}>
              {!paused ? (
                <TouchableOpacity
                  style={styles.pauseButton}
                  onPress={pauseWorkout}
                >
                  <Text style={styles.controlText}>
                    PAUSE
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.resumeButton}
                  onPress={resumeWorkout}
                >
                  <Text style={styles.controlText}>
                    RESUME
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopWorkout}
              >
                <Text style={styles.controlText}>
                  END
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* CURRENT STATS */}

        {running && (
          <View style={styles.liveCard}>
            <Text style={styles.sectionTitle}>
              Current Activity
            </Text>

            <View style={styles.liveRow}>
              <View>
                <Text style={styles.liveLabel}>
                  Distance
                </Text>

                <Text style={styles.liveValue}>
                  {(distance / 1000).toFixed(2)} km
                </Text>
              </View>

              <View>
                <Text style={styles.liveLabel}>
                  Route Points
                </Text>

                <Text style={styles.liveValue}>
                  {route.length}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TODAY'S RECENT ACTIVITIES */}

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>
            Recent Activities
          </Text>

          <Text style={styles.todayText}>
            Today
          </Text>
        </View>

        {todaysActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              🏃
            </Text>

            <Text style={styles.emptyTitle}>
              No activities today.
            </Text>

            <Text style={styles.emptyText}>
              Start your first workout today! 🚀
            </Text>
          </View>
        ) : (
          todaysActivities.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.activityCard}
              activeOpacity={0.75}
              onPress={() =>
                setSelectedWorkout(item)
              }
            >
              <View style={styles.activityCardLeft}>
                <Text style={styles.activityIcon}>
                  {item.activity === 'Walking'
                    ? '🚶'
                    : item.activity === 'Jogging'
                    ? '🏃'
                    : '🏃‍♂️'}
                </Text>

                <View>
                  <Text style={styles.activityName}>
                    {item.activity}
                  </Text>

                  <Text style={styles.activityTime}>
                    {formatTime(item.duration)}
                  </Text>
                </View>
              </View>

              <View style={styles.activityCardRight}>
                <Text style={styles.activityDistance}>
                  {(item.distance / 1000).toFixed(2)} km
                </Text>

                <Text style={styles.viewRouteText}>
                  View route →
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  detailsContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#64748b',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  activityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 18,
  },

  activityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },

  activityButtonActive: {
    backgroundColor: '#111827',
  },

  activityButtonDisabled: {
    opacity: 0.6,
  },

  activityButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  activityButtonTextActive: {
    color: '#ffffff',
  },

  mapContainer: {
    height: 270,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#e2e8f0',
  },

  map: {
    flex: 1,
  },

  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  mapIcon: {
    fontSize: 42,
    marginBottom: 8,
  },

  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
  },

  mapPlaceholderText: {
    marginTop: 5,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },

  trackerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
  },

  trackerTitle: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#475569',
  },

  timer: {
    textAlign: 'center',
    fontSize: 48,
    fontWeight: '800',
    color: '#111827',
    marginVertical: 10,
  },

  trackerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },

  trackerStat: {
    alignItems: 'center',
  },

  trackerStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  trackerStatLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },

  startButton: {
    backgroundColor: '#111827',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
  },

  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  controlRow: {
    flexDirection: 'row',
    gap: 10,
  },

  pauseButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
  },

  resumeButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
  },

  stopButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
  },

  controlText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  liveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },

  liveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },

  liveLabel: {
    fontSize: 13,
    color: '#64748b',
  },

  liveValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  todayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 35,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: '#94a3b8',
  },

  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 17,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  activityCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  activityIcon: {
    fontSize: 28,
  },

  activityName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  activityTime: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748b',
  },

  activityCardRight: {
    alignItems: 'flex-end',
  },

  activityDistance: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  viewRouteText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },

  bottomSpace: {
    height: 20,
  },

  /* ---------------- DETAILS ---------------- */

  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 60,
  },

  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
  },

  detailsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    marginBottom: 22,
  },

  detailsActivity: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
  },

  detailsDate: {
    marginTop: 5,
    fontSize: 13,
    color: '#64748b',
  },

  detailsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },

  detailStat: {
    alignItems: 'center',
    flex: 1,
  },

  detailValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  detailLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },

  routeTitleRow: {
    marginBottom: 12,
  },

  detailsMapContainer: {
    height: 380,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },

  detailsMap: {
    flex: 1,
  },

  noRouteBox: {
    height: 180,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  noRouteText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
  },
});