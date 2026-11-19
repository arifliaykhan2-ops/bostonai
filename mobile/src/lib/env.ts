import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True inside the Expo Go app. Expo Go can't do Sign in with Apple for our
 * bundle id, real in-app purchases, or our push setup — those need a dev build.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
