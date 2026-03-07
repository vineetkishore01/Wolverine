/**
 * tier-detector.ts
 * 
 * Dynamically categorizes models into intelligence tiers to adjust 
 * context injection depth without overfitting to specific model sizes.
 */

export type IntelligenceTier = 'low' | 'medium' | 'high';

export interface TierConfig {
    tier: IntelligenceTier;
    maxPersonalityTokens: number;
    includeExtendedContext: boolean;
    compressionRatio: number;
}

/**
 * Detect tier based on model name, context window, and provider
 */
export function detectIntelligenceTier(
    modelName: string,
    contextWindow?: number,
    providerId?: string
): IntelligenceTier {
    const model = modelName.toLowerCase();

    // 1. Cloud Providers are always High Tier (managed scaling)
    if (providerId === 'openai' || providerId === 'openrouter' || providerId === 'openai_codex') {
        return 'high';
    }

    // 2. Resource-based Detection (Priority)
    // If the user or system has allocated significant context, trust it.
    if (contextWindow) {
        if (contextWindow >= 32768) return 'high';
        if (contextWindow >= 8192) return 'medium';
        return 'low';
    }

    // 3. Fallback: Metadata-based Regex (Name matching)
    // High Tier: Known massive models
    if (
        model.includes('gpt-4') ||
        model.includes('claude-3') ||
        model.includes('deepseek-r1') ||
        model.includes('70b') ||
        model.includes('405b') ||
        model.includes('pro') ||
        model.includes('sonnet')
    ) {
        return 'high';
    }

    // Medium Tier: 7B-14B range
    if (
        model.includes('8b') ||
        model.includes('7b') ||
        model.includes('14b') ||
        model.includes('mistral') ||
        model.includes('llama3')
    ) {
        // Re-check for specific small variants
        if (model.includes('1b') || model.includes('3b')) return 'low';
        return 'medium';
    }

    // Default to Low for anything else (4B, 3B, 1B, 0.5B)
    return 'low';
}

/**
 * Get context constraints for a specific tier
 */
export function getTierConfig(tier: IntelligenceTier): TierConfig {
    switch (tier) {
        case 'high':
            return {
                tier: 'high',
                maxPersonalityTokens: 20000,
                includeExtendedContext: true,
                compressionRatio: 1.0 // No compression
            };
        case 'medium':
            return {
                tier: 'medium',
                maxPersonalityTokens: 5000,
                includeExtendedContext: true,
                compressionRatio: 0.6
            };
        case 'low':
        default:
            return {
                tier: 'low',
                maxPersonalityTokens: 1500,
                includeExtendedContext: false,
                compressionRatio: 0.3
            };
    }
}
