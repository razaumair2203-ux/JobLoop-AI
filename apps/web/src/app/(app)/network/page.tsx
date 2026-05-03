"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Building2,
  Star,
  Upload,
  MessageSquare,
  Calendar,
  MoreHorizontal,
} from "lucide-react";

type Contact = {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string | null;
  linkedinUrl: string | null;
  relationship: "strong" | "warm" | "cold";
  lastContact: string | null;
  notes: string;
  tags: string[];
};

const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Sarah Kim",
    title: "Engineering Manager",
    company: "Vercel",
    email: "sarah.k@vercel.com",
    linkedinUrl: "linkedin.com/in/sarahkim",
    relationship: "strong",
    lastContact: "Apr 28, 2026",
    notes: "Met at ReactConf 2025. Offered to refer me.",
    tags: ["referral", "frontend"],
  },
  {
    id: "2",
    name: "James Park",
    title: "Senior SWE",
    company: "Stripe",
    email: null,
    linkedinUrl: "linkedin.com/in/jpark",
    relationship: "warm",
    lastContact: "Mar 15, 2026",
    notes: "Former coworker at DataFlow. Now at Stripe Payments team.",
    tags: ["ex-colleague", "payments"],
  },
  {
    id: "3",
    name: "Maria Gonzalez",
    title: "VP Engineering",
    company: "Figma",
    email: "maria@figma.com",
    linkedinUrl: null,
    relationship: "cold",
    lastContact: null,
    notes: "Connected on LinkedIn after her talk on design systems.",
    tags: ["design-systems"],
  },
  {
    id: "4",
    name: "David Liu",
    title: "Tech Lead",
    company: "Notion",
    email: "dliu@notion.so",
    linkedinUrl: "linkedin.com/in/davidliu",
    relationship: "warm",
    lastContact: "Apr 10, 2026",
    notes: "University friend. Works on the editor team.",
    tags: ["university", "editor"],
  },
];

const relationshipColors = {
  strong: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warm: "bg-amber-100 text-amber-700 border-amber-200",
  cold: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export default function NetworkPage() {
  const [contacts, setContacts] = useState(mockContacts);
  const [search, setSearch] = useState("");
  const [filterRelationship, setFilterRelationship] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterRelationship === "all" || c.relationship === filterRelationship;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="-mx-6 -my-8 flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Network</h1>
          <p className="text-sm text-zinc-500">
            Track connections and warm introductions for your job search
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Contact
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Contact list */}
        <div className="flex w-full flex-col lg:w-2/3">
          {/* Filters */}
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-1">
              {["all", "strong", "warm", "cold"].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRelationship(r)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    filterRelationship === r
                      ? "bg-brand-600 text-white"
                      : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 border-b border-zinc-200 bg-white px-6 py-3">
            <div className="text-center">
              <p className="text-lg font-semibold text-zinc-900">{contacts.length}</p>
              <p className="text-xs text-zinc-500">Total contacts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-600">
                {contacts.filter((c) => c.relationship === "strong").length}
              </p>
              <p className="text-xs text-zinc-500">Strong ties</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-amber-600">
                {contacts.filter((c) => c.relationship === "warm").length}
              </p>
              <p className="text-xs text-zinc-500">Warm connections</p>
            </div>
          </div>

          {/* Contact rows */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`flex w-full items-center gap-4 border-b border-zinc-100 px-6 py-3.5 text-left transition-colors hover:bg-zinc-50 ${
                  selectedContact?.id === contact.id ? "bg-brand-50" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
                  {contact.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-zinc-900">{contact.name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${relationshipColors[contact.relationship]}`}>
                      {contact.relationship}
                    </span>
                  </div>
                  <p className="truncate text-xs text-zinc-500">
                    {contact.title} at {contact.company}
                  </p>
                </div>
                {contact.lastContact && (
                  <p className="shrink-0 text-xs text-zinc-400">{contact.lastContact}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selectedContact && (
          <div className="hidden w-1/3 flex-col border-l border-zinc-200 bg-white lg:flex">
            <div className="border-b border-zinc-200 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {selectedContact.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{selectedContact.name}</h3>
                    <p className="text-xs text-zinc-500">
                      {selectedContact.title} at {selectedContact.company}
                    </p>
                  </div>
                </div>
                <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <span className={`mt-3 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${relationshipColors[selectedContact.relationship]}`}>
                {selectedContact.relationship} connection
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Contact info */}
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Contact</h4>
                <div className="mt-2 space-y-2">
                  {selectedContact.email && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" />
                      {selectedContact.email}
                    </div>
                  )}
                  {selectedContact.linkedinUrl && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                      {selectedContact.linkedinUrl}
                    </div>
                  )}
                  {selectedContact.lastContact && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      Last contact: {selectedContact.lastContact}
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Tags</h4>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedContact.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Notes</h4>
                <p className="mt-2 text-sm text-zinc-600">{selectedContact.notes}</p>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
                  <MessageSquare className="h-4 w-4" />
                  Draft outreach message
                </button>
                <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
                  <Star className="h-4 w-4" />
                  Link to application
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add contact modal placeholder */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Add Contact</h3>
            <p className="mt-1 text-sm text-zinc-500">Add a new connection to your network</p>
            <div className="mt-4 space-y-3">
              <input placeholder="Full name" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <input placeholder="Title" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <input placeholder="Company" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <input placeholder="Email (optional)" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <textarea placeholder="Notes" rows={3} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
