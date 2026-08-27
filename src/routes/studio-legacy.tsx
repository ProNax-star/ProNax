/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/studio-legacy")({
  beforeLoad: () => {
    // Redirect to the main studio implementation
    throw redirect({ to: "/studio" });
  },
});
