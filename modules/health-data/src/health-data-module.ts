import { requireOptionalNativeModule } from "expo";
import { createHealthDataAdapter, type HealthDataModule } from "./health-data-adapter";

// Keep production's native-module resolver; tests inject a resolver into the
// same adapter without replacing Expo or changing module-cache behavior.
export default createHealthDataAdapter(requireOptionalNativeModule<HealthDataModule>);
