import { LeadScore, ScoreComponents, ScoreExplanation } from "./types";

const WEIGHTS = { icp: 0.35, intent: 0.3, timing: 0.2, momentum: 0.15 };

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const tierFor = (score: number): LeadScore["tier"] =>
  score >= 80 ? "A" : score >= 65 ? "B" : "C";

export function computeLeadScore(
  components: ScoreComponents,
  explanation: Partial<ScoreExplanation> = {},
): LeadScore {
  const icp = clamp(components.icpFit);
  const intent = clamp(components.intent);
  const timing = clamp(components.timing);
  const momentum = clamp(components.momentum);

  const final =
    icp * WEIGHTS.icp +
    intent * WEIGHTS.intent +
    timing * WEIGHTS.timing +
    momentum * WEIGHTS.momentum;

  const resolvedExplanation: ScoreExplanation = {
    icpBreakdown: explanation.icpBreakdown ?? [`ICP fit ${icp}/100`],
    intentSignals: explanation.intentSignals ?? [`Intent ${intent}/100`],
    timingFactors: explanation.timingFactors ?? [`Timing ${timing}/100`],
    momentumIndicators:
      explanation.momentumIndicators ?? [`Momentum ${momentum}/100`],
  };

  return {
    final: Math.round(final),
    components: { icpFit: icp, intent, timing, momentum },
    tier: tierFor(final),
    explanation: resolvedExplanation,
  };
}
