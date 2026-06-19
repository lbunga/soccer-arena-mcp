"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { getPolicies, PolicySection } from "@/lib/api";

export default function PoliciesPage() {
  const [sections, setSections] = useState<PolicySection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPolicies()
      .then((d) => setSections(d.sections))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <div className="space-y-6 py-4">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 font-display-lg">Policies</h1>
        <p className="text-slate-500 text-sm">
          Same sections RAG retrieves for Claude. Ask Claude policy questions in chat.
        </p>
      </header>
      {error && <Card><div className="text-rose-500 font-medium">{error}</div></Card>}
      <div className="space-y-4">
        {sections.map((s) => (
          <Card key={s.title} className="p-6">
            <h2 className="text-lg font-bold text-primary mb-3 uppercase tracking-wide">{s.title}</h2>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 leading-relaxed">
              {s.body}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
