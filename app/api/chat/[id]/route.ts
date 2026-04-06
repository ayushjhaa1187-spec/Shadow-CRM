import { createClient } from "@/lib/supabase/server";
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
    .from("chat_history")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return errorResponse("Chat not found", 404);
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
    .from("chat_history")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return errorResponse(error.message, 500);
  return successResponse({ deleted: true });
}
