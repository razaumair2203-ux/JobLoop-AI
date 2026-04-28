# "Warm Connections" Feature — Feasibility Research Report
**Date:** 2026-04-27
**Status:** RESEARCH ONLY — No implementation decisions made

---

## Executive Summary

**A true "find mutual connections at Company X" feature that programmatically queries LinkedIn is NOT feasible through legal, official channels.** LinkedIn's API deliberately blocks this exact use case. However, there are several alternative approaches of varying quality and legality. The most viable legal path is a **user-initiated CSV import + matching** approach, which is significantly less magical but actually buildable.

---

## 1. Does LinkedIn Have a Public API for Finding Mutual Connections at a Company?

**No. This specific capability does not exist in LinkedIn's public API.**

### What the API Actually Offers:

| API / Scope | What It Does | Access Level |
|---|---|---|
| `r_basicprofile` (formerly `r_liteprofile`) | Returns authenticated user's name, photo, headline | Open (self-serve) |
| `r_emailaddress` | Returns authenticated user's email | Open (self-serve) |
| `r_1st_connections` | Returns list of user's 1st-degree connections | **Restricted — requires LinkedIn Partner approval** |
| `r_1st_connections_size` | Returns only the **count** of connections (not the list) | **Restricted — requires LinkedIn Partner approval** |
| Connections API (`GET /v2/connections`) | Returns 1st-degree connections of the authenticated user | **Restricted — Partner only** |

### Critical Limitations:
- **You can ONLY retrieve connections of the user who granted OAuth access** — not connections of their connections
- **2nd-degree connections are explicitly unavailable** from the API
- **There is no "mutual connections at Company X" endpoint** — this is a LinkedIn.com UI feature only
- **There is no "people search" endpoint** available to general developers
- Even if you got `r_1st_connections` access, you'd get a list of connection URNs — not their current employers, which would require additional (also restricted) API calls

### Getting Partner Access:
- Requires formal application with detailed use case, legal entity verification
- Review takes weeks to months
- Many applications are rejected without clear explanation
- A job-seeker tool is unlikely to qualify — LinkedIn reserves this for enterprise integrations, CRMs, and ATS platforms

**Verdict: Blocked. LinkedIn intentionally prevents this.**

---

## 2. LinkedIn API Access Landscape in 2025-2026

LinkedIn has become **more restrictive, not less**, over time:

- The `r_liteprofile` scope was deprecated and replaced with `r_basicprofile`
- Legacy unversioned Marketing APIs (`/v2/` base path) were fully sunset
- LinkedIn now requires monthly versioned API calls with a `linkedin-version` header
- Rate limits have become stricter, especially for data-heavy endpoints
- LinkedIn restricted **over 58 million accounts** in the first half of 2024 alone for ToS violations
- The free/open tier gives almost nothing: basic profile + email only
- Everything else requires Marketing Developer Platform approval or Partner status

The trend is clear: LinkedIn is locking down access further with each passing year.

---

## 3. How Do Existing Tools (Careerflow, Wonsulting, JobRight) Handle This?

### Careerflow
- Uses a **Chrome extension** that overlays on LinkedIn.com
- Does NOT use the LinkedIn API for connection data
- Users manually add contacts one-by-one by visiting LinkedIn profiles and clicking "Add to Contacts"
- Bulk import is done via a **CSV template** (user fills in First Name, Last Name, Company manually)
- The extension reads profile page DOM data when the user is actively browsing LinkedIn
- This is a **manual CRM**, not automated connection discovery

### Wonsulting (NetworkAI)
- Generates **personalized outreach messages and cold emails**
- Does NOT discover connections for you
- It's a message-writing assistant, not a connection-finding tool

### JobRight
- Focuses on job matching and applications
- No evidence of deep LinkedIn connection integration

**Key Insight: None of these tools programmatically find "people you know at Company X." They all work around LinkedIn's restrictions by either being manual or operating as Chrome extensions that read visible page data.**

---

## 4. Is There Any Legal Way to Programmatically Find "People You Know at Company X"?

### Definitively Legal:
- **User manually exports their LinkedIn connections CSV** and uploads it to your tool
- **User manually tells you** who they know (CRM-style)

### Gray Area (Chrome Extension approach):
- Build a Chrome extension that reads LinkedIn page data while the user browses
- This is what Careerflow and similar tools do
- LinkedIn tolerates some extensions but has banned others
- Risk: LinkedIn can change their DOM, break your extension, or ban users

### Illegal / ToS-Violating:
- Scraping LinkedIn (even with the user's cookies/session)
- Using unofficial/undocumented APIs (LinkedIn Voyager API)
- Using third-party proxy APIs like Apify, Unipile, LinkedAPI, etc. — these automate browser sessions, which violates LinkedIn ToS
- 58 million accounts were restricted in H1 2024 for this type of activity

**Verdict: No legal programmatic way exists to replicate LinkedIn's "mutual connections at Company X" feature.**

---

## 5. Alternative Approach: LinkedIn Connections CSV Export + Matching

This is the **most viable legal approach** and deserves serious consideration.

### How It Works:
1. User goes to LinkedIn → Settings → Data Privacy → Get a copy of your data → Connections
2. LinkedIn emails them a CSV file
3. User uploads the CSV to your tool

### What the CSV Contains:
| Field | Always Present? |
|---|---|
| First Name | Yes |
| Last Name | Yes |
| Company | Yes |
| Position | Yes |
| Email Address | **Only ~10-20% of connections** (only if they've made it visible) |
| Connected On (date) | Yes |

### What You Could Build:
- User uploads CSV → your tool indexes their connections by company
- When the user views a job listing, you cross-reference the company name against their connections
- Show: "You know 3 people at [Company]: Alice (Engineer), Bob (PM), Carol (Designer)"
- Optionally match email domains to identify additional connections

### Limitations:
- **Stale data**: The CSV is a point-in-time snapshot; people change jobs
- **Company name matching is fuzzy**: "Google" vs "Google LLC" vs "Alphabet Inc." vs "Google Cloud"
- **No automatic refresh**: User must manually re-export periodically
- **No profile URLs** in the export (just names and companies)
- **Email addresses are sparse** (~10-20% coverage)

### Viability Rating: **MODERATE — This is actually buildable and legal, but the UX requires manual steps from the user.**

---

## 6. LinkedIn OAuth / "Share Profile" — What Can You Actually Get?

### Sign In with LinkedIn (OpenID Connect):
Returns ONLY:
- `name`, `given_name`, `family_name`
- `picture`
- `email`, `email_verified`
- `locale`

**That's it. No connections. No company data. No network information.**

### With Additional Scopes (requires Partner status):
- `r_basicprofile`: Slightly more profile detail
- `r_1st_connections`: Connection list (Partner only, likely denied for this use case)

### Share Profile:
- This is a user-facing feature, not an API
- No programmatic access to shared profile data

**Verdict: LinkedIn OAuth gives you a login button and an email address. Nothing useful for connection discovery.**

---

## 7. Hunter.io, Apollo, Clearbit — What They Do and Viability

### How They Get Data:

| Tool | Method | Data Source |
|---|---|---|
| **Hunter.io** | Web crawling at scale | Publicly indexed emails on websites, not LinkedIn |
| **Apollo.io** | Aggregated database (210M+ contacts) | Multiple sources: web crawling, data partnerships, user contributions, public filings |
| **Clearbit** (now part of HubSpot) | Multi-source enrichment | Company websites, social profiles, public records |

### Key Points:
- **None of these tools scrape LinkedIn directly** (at least not officially)
- They build independent databases from public web sources
- They provide "find email for [person] at [company]" — which is different from "find people you know at [company]"
- Hunter.io specifically indexes emails found on public web pages
- Apollo's database is built partly through user-contributed data (users install a Chrome extension that shares data back)

### Viability for a Job Seeker Tool:
- **Hunter.io's approach** (crawl public emails): Not relevant — we need to match the user's existing network, not find strangers' emails
- **Apollo's approach** (massive database): Requires building/buying a contact database — this is a business worth hundreds of millions of dollars, not a feature
- **Clearbit's approach** (enrichment): Could be useful for enriching partial data (e.g., given a name + company from CSV, find their email) — but Clearbit's API costs money and is designed for sales teams, not job seekers

**Verdict: These tools solve a different problem (find contact info for strangers) vs our problem (find people the user already knows at a company). Their approaches are not directly applicable.**

---

## Recommended Approach (If Building This Feature)

### Tier 1 — Actually Buildable, Fully Legal:
1. **CSV Import**: Let users upload their LinkedIn connections export
2. **Company Matching**: Fuzzy-match company names from the CSV against job listing companies
3. **Surface Matches**: "You may know people at [Company]" with names and positions
4. **Periodic Refresh Prompt**: Remind users to re-export their CSV every few months

### Tier 2 — Buildable but Fragile:
5. **Chrome Extension**: Read LinkedIn page data as users browse (Careerflow model)
6. **Email Domain Matching**: If user grants email access, match email domains to company domains

### Tier 3 — Not Recommended:
7. Unofficial API wrappers (Unipile, LinkedAPI, etc.) — ToS violation
8. Direct scraping — illegal under CFAA, ToS violation
9. Building a contact database from scratch — requires massive investment

---

## Honest Assessment

The "Warm Connections" feature **sounds extremely compelling in a pitch deck** but the core functionality — "find your mutual connections at any company" — is precisely what LinkedIn guards most jealously. It's their core product moat.

What you CAN build is a **watered-down but still useful version**: a personal networking CRM powered by CSV import that shows "you know [Name] at [Company]" when viewing job listings. This is genuinely helpful, even if it lacks the magic of real-time LinkedIn integration.

The tools that appear to offer deeper LinkedIn integration (Unipile, LinkedAPI, Apify actors) all operate by automating browser sessions on behalf of users, which violates LinkedIn's ToS and puts users' accounts at risk of permanent suspension. Building a product on that foundation is a liability.

---

## Sources

- [Connections API - LinkedIn Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-api)
- [Connections Size API - LinkedIn Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-size)
- [Getting Access to LinkedIn APIs - Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)
- [Sign In with LinkedIn using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Restricted Uses of LinkedIn Marketing APIs](https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases?view=li-lms-2026-01)
- [Export connections from LinkedIn - LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a566336/export-connections-from-linkedin)
- [LinkedIn API Guide 2026 - OutX](https://www.outx.ai/blog/linkedin-api-guide)
- [LinkedIn API Ultimate Guide - Phyllo](https://www.getphyllo.com/post/linkedin-api-ultimate-guide-on-linkedin-api-integration)
- [LinkedIn API Full Integration Guide - Unipile](https://www.unipile.com/linkedin-api-a-comprehensive-guide-to-integration/)
- [Careerflow LinkedIn Integration](https://www.careerflow.ai/linkedin-integration)
- [How to Add Networking Contacts - Careerflow Help](https://help.careerflow.ai/en/articles/9912646-how-to-add-networking-contacts)
- [Wonsulting Review 2026 - JobRight](https://jobright.ai/blog/wonsulting-review-2026-pros-cons-and-alternatives/)
- [LinkedIn API for Developers - Closely](https://blog.closelyhq.com/linkedin-api-for-developers-what-you-can-and-cant-do/)
- [How to Export LinkedIn Sales Navigator Data Legally - Cleanlist](https://www.cleanlist.ai/blog/2026-04-25-how-to-export-linkedin-sales-navigator-data)
- [LinkedIn API Complete Guide 2026 - ConnectSafely](https://connectsafely.ai/articles/linkedin-api-complete-guide-2026)
