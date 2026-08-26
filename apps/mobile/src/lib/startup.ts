export type StartupState = {
  fontsLoaded: boolean;
  fontsFailed: boolean;
  timedOut: boolean;
};

export function shouldMountApp(state: StartupState) {
  return state.fontsLoaded || state.fontsFailed || state.timedOut;
}
