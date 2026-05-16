"use client";

import { useState } from "react";
import { Mail, Calendar, Check, ExternalLink, Shield } from "lucide-react";

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: typeof Mail;
  connected: boolean;
  color: string;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "gmail",
      name: "Gmail",
      description: "Auto-detect application confirmations and interview invitations in your inbox",
      icon: Mail,
      connected: false,
      color: "text-red-500",
    },
    {
      id: "gcal",
      name: "Google Calendar",
      description: "Sync interview schedules and application deadlines to your calendar",
      icon: Calendar,
      connected: false,
      color: "text-blue-500",
    },
  ]);

  function toggleConnect(id: string) {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i))
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold text-surface-text">Integrations</h1>
      <p className="mt-1 text-sm text-surface-text-muted">
        Connect external services to enhance your job search workflow
      </p>

      <div className="mt-6 space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-lg border border-surface-border bg-surface-0 p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                <integration.icon className={`h-6 w-6 ${integration.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-surface-text">{integration.name}</h3>
                  {integration.connected && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-surface-text-muted">{integration.description}</p>
                <div className="mt-3">
                  <button
                    onClick={() => toggleConnect(integration.id)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                      integration.connected
                        ? "border border-surface-border text-surface-text-secondary hover:bg-surface-2"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    {integration.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* What sync does */}
      <div className="mt-6 rounded-lg border border-surface-border bg-surface-2 p-5">
        <h3 className="text-sm font-semibold text-surface-text">How sync works</h3>
        <ul className="mt-3 space-y-2 text-xs text-surface-text-secondary">
          <li className="flex gap-2">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-text-muted" />
            <span><strong>Gmail:</strong> Scans for application confirmation emails and interview invitations, then updates your tracker automatically.</span>
          </li>
          <li className="flex gap-2">
            <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-text-muted" />
            <span><strong>Calendar:</strong> Creates events for upcoming interviews and deadlines. Adds preparation notes from your analysis.</span>
          </li>
        </ul>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-surface-text-muted">
          <Shield className="h-3.5 w-3.5" />
          We only read job-related emails. Your data is never shared or sold.
        </div>
      </div>
    </div>
  );
}
