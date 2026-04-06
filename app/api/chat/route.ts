import { createClient } from "@/lib/supabase/server";
import { chatMessageSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";

const SYSTEM_PROMPT = `You are Shadow CRM's AI assistant. You help sales teams manage contacts, track deals, analyze pipeline health, forecast revenue, and draft communications.

You are knowledgeable about:
- CRM best practices and sales methodologies (MEDDIC, SPIN, Challenger)
- Pipeline management and deal progression
- Contact relationship management
- Email outreach and follow-up strategies
- Revenue forecasting and sales metrics
- Lead qualification frameworks (BANT, CHAMP)

When asked about CRM data, provide actionable insights. When drafting communications, be professional yet personable. Always be concise and focused on driving sales outcomes.

If you don't have access to specific data the user asks about, let them know and suggest how they might find that information in the CRM.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const parsed = chatMessageSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 422);
  }

  const { message, chat_id } = parsed.data;

  // Load existing chat history if chat_id provided
  let history: ChatMessage[] = [];
  let chatId = chat_id;

  if (chatId) {
    const { data: chat } = await supabase
      .from("chat_history")
      .select("messages")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (chat?.messages) {
      history = chat.messages as ChatMessage[];
    }
  }

  // Build messages array with full history
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: message },
  ];

  // Call AI API
  const aiApiKey = process.env.OPENAI_API_KEY;

  let assistantMessage: string;

  if (aiApiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return errorResponse(
          `AI service error: ${(errData as Record<string, unknown>)?.error || response.statusText}`,
          502
        );
      }

      const data = await response.json();
      assistantMessage = data.choices[0].message.content;
    } catch {
      return errorResponse("Failed to connect to AI service", 502);
    }
  } else {
    // Fallback response when no API key configured
    assistantMessage = getLocalResponse(message);
  }

  // Update history
  const updatedHistory: ChatMessage[] = [
    ...history,
    { role: "user", content: message },
    { role: "assistant", content: assistantMessage },
  ];

  // Save to database
  if (chatId) {
    await supabase
      .from("chat_history")
      .update({ messages: updatedHistory as unknown as Record<string, unknown>[] })
      .eq("id", chatId)
      .eq("user_id", user.id);
  } else {
    const title =
      message.length > 50 ? message.substring(0, 50) + "..." : message;
    const { data: newChat } = await supabase
      .from("chat_history")
      .insert({
        user_id: user.id,
        messages: updatedHistory as unknown as Record<string, unknown>[],
        title,
      })
      .select("id")
      .single();

    chatId = newChat?.id ?? null;
  }

  return successResponse({
    message: assistantMessage,
    chat_id: chatId,
  });
}

function getLocalResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("pipeline") || lower.includes("deal")) {
    return "To analyze your pipeline health, check the Deals page where you can see deals organized by stage. Key metrics to watch: conversion rate between stages, average deal size, and average time in each stage. Would you like tips on moving stalled deals forward?";
  }

  if (lower.includes("email") || lower.includes("outreach") || lower.includes("draft")) {
    return "For effective outreach, I recommend a 3-touch sequence: 1) Personalized intro referencing a trigger event, 2) Value-add follow-up with a relevant resource, 3) Break-up email creating urgency. Keep subject lines under 7 words and body copy under 150 words. Want me to help draft a specific email?";
  }

  if (lower.includes("lead") || lower.includes("qualify") || lower.includes("prospect")) {
    return "For lead qualification, use the BANT framework: Budget (can they afford it?), Authority (are you talking to the decision-maker?), Need (do they have a genuine pain point?), Timeline (is there urgency?). Score contacts based on these criteria and focus on leads scoring 3+ out of 4.";
  }

  if (lower.includes("forecast") || lower.includes("revenue")) {
    return "Revenue forecasting works best with a weighted pipeline approach: multiply each deal's value by its stage probability (Discovery: 10%, Proposal: 30%, Negotiation: 60%, Verbal: 90%). Sum these for your weighted forecast. Track forecast accuracy monthly to improve over time.";
  }

  if (lower.includes("follow") || lower.includes("contact")) {
    return "Best practices for follow-ups: respond within 24 hours to inbound inquiries, space outbound touches 3-5 business days apart, and always reference previous conversations. Use the Activities section to log all touchpoints and set reminders for next steps.";
  }

  return "I can help you with pipeline management, email drafting, lead qualification, revenue forecasting, and CRM best practices. To get the most specific advice, try asking about a particular aspect of your sales process. Note: Connect an OpenAI API key in your environment variables for full AI-powered responses.";
}
