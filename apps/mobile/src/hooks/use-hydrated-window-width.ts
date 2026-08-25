import { useSyncExternalStore } from "react";
import { Platform, useWindowDimensions } from "react-native";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useHydratedWindowWidth() {
  const { width } = useWindowDimensions();
  const clientReady = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const hydrated = Platform.OS !== "web" || clientReady;

  return hydrated ? width : 0;
}
