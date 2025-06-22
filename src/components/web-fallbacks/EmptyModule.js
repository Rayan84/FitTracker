// Empty module fallback for native-only modules
export default {};

// Common exports that might be used
export const createNativeComponentRegistry = () => ({});
export const codegenNativeCommands = () => ({});
export const MapMarker = () => null;
export const MapView = () => null;
export const PROVIDER_GOOGLE = 'google';
export const Polyline = () => null;

// Add any other exports that are used in your code
