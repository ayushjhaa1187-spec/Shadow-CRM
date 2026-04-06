import { createClient } from "@/lib/supabase/server";
import { dealSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Unauthorized", 401);

  const { data, error } = await supabase
    .from("deals")
    .select("*, contacts(id, name, company, email)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return errorResponse("Deal not found", 404);
  return successResponse(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const parsed = dealSchema.partial().safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 422);
  }

  const { data, error } = await supabase
    .from("deals")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, contacts(id, name, company)")
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Unauthorized", 401);

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return errorResponse(error.message, 500);
  return successResponse({ deleted: true });
}
