/**
 * system-bootstrap.ts - Phase 0 boot logic (migrations, templates)
 */

import { migrateLegacyDataHome } from '../../config/paths.js';
import { bootstrapDataHome } from '../../config/bootstrap.js';

export async function boot(): Promise<void> {
    // Phase 0: Ensure runtime data home is ready
    migrateLegacyDataHome();
    await bootstrapDataHome();
}
