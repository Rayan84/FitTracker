import React from 'react';
import ActivityTrackerNew from '../components/ActivityTrackerNew';

const RunningActivity = () => {
  return (
    <ActivityTrackerNew 
      activityType="Running"
      color="#FF7043"
      icon="run"
    />
  );
};

export default RunningActivity;
