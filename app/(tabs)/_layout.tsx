import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111827',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />

      <Tabs.Screen
        name="run"
        options={{
          title: 'Run',
        }}
      />

      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
        }}
      />
    </Tabs>
  );
}