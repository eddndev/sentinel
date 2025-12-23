import { MatchType, Trigger } from "@prisma/client";

export interface MatchResult {
    trigger: Trigger;
    capturedArgs?: string[]; // For Regex groups or wildcard captures
}

export class TriggerMatcher {
    /**
     * Evaluates a message content against a list of active triggers.
     * Priority: EXACT > CONTAINS > REGEX
     */
    static findMatch(content: string, triggers: Trigger[]): MatchResult | null {
        const normalizedContent = content.trim().toLowerCase();

        // 1. Exact Matches (Highest Priority & O(1) Lookup ideal, but list scan here is fine for now)
        const exact = triggers.find(t =>
            t.matchType === 'EXACT' && t.keyword.toLowerCase() === normalizedContent
        );
        if (exact) return { trigger: exact };

        // 2. Contains Matches
        const contains = triggers.find(t =>
            t.matchType === 'CONTAINS' && normalizedContent.includes(t.keyword.toLowerCase())
        );
        if (contains) return { trigger: contains };

        // 3. Regex Matches (Most expensive)
        for (const t of triggers.filter(t => t.matchType === 'REGEX')) {
            try {
                const regex = new RegExp(t.keyword, 'i');
                const match = content.match(regex);
                if (match) {
                    // Return captured groups as args
                    return {
                        trigger: t,
                        capturedArgs: match.slice(1)
                    };
                }
            } catch (e) {
                console.warn(`Invalid regex in trigger ${t.id}: ${t.keyword}`);
            }
        }

        return null;
    }
}
