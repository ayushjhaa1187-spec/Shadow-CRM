import { VercelRequest, VercelResponse } from "@vercel/node";
import { computeLeadScore } from "../src/scoring";
import { ScoreComponents, ScoreExplanation } from "../src/types";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { icpFit, intent, timing, momentum, explanation } = req.body || {};
  if ([icpFit, intent, timing, momentum].some((v) => typeof v !== "number")) {
    return res
      .status(400)
      .json({ error: "icpFit, intent, timing, momentum must be numbers (0-100)." });
  }

  const components: ScoreComponents = { icpFit, intent, timing, momentum };
  const expl: Partial<ScoreExplanation> = explanation || {};
  const scored = computeLeadScore(components, expl);
  return res.status(200).json(scored);
}
