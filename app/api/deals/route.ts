import { createClient } from "@/lib/supabase/server";
import { dealSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage");
  const contactId = searchParams.get("contact_id");

  let query = supabase
    .from("deals")
    .select("*, contacts(id, name, company)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (stage) query = query.eq("stage", stage);
  if (contactId) query = query.eq("contact_id", contactId);

  const { data, error } = await query;

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const parsed = dealSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 422);
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({ ...parsed.data, user_id: user.id })
    .select("*, contacts(id, name, company)")
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data, 201);
}
