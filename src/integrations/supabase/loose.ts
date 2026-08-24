/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
// Typed re-export of the Supabase client.
// Historically this module widened the client to `any` so ported pages could
// call tables/RPCs missing from the generated types. The generated `Database`
// type now covers the full schema, so this is a plain typed re-export.
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const supabase: SupabaseClient<Database> = typedSupabase;
export default supabase;
