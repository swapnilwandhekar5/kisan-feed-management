"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function TestDatabase() {
  const [status, setStatus] = useState("Testing Supabase connection...");

  useEffect(() => {
    async function testConnection() {
      const supabase = createClient();

      const { error } = await supabase
        .from("products")
        .select("id")
        .limit(1);

      if (error) {
        setStatus(`Connection failed: ${error.message}`);
      } else {
        setStatus("✅ Supabase connected successfully!");
      }
    }

    testConnection();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="rounded-2xl border p-8 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold">KisanFeed</h1>
        <p>{status}</p>
      </div>
    </main>
  );
}
