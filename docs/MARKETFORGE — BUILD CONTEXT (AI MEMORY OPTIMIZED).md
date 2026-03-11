MARKETFORGE — BUILD CONTEXT (AI MEMORY OPTIMIZED)

PRODUCT  
MarketForge is a SaaS revenue intelligence and marketing execution platform for local service businesses.

Purpose:  
Detect revenue opportunities → generate marketing campaigns → launch campaigns → capture leads → track booked jobs → attribute revenue → improve future recommendations.

Core product philosophy:  
Opportunity → Campaign → Execution → Revenue → Learning

TECH STACK  
Next.js 16 (App Router)  
TypeScript  
Prisma ORM  
PostgreSQL  
Clerk Auth  
OpenAI Structured Outputs  
Tailwind CSS  
Vercel deployment

CORE SYSTEMS

1\. Revenue Opportunity Engine  
File: src/lib/revenue-opportunity-engine.ts

Analyzes signals:  
\- competitor activity  
\- demand patterns  
\- technician capacity  
\- service priority  
\- historical campaign performance

Outputs ranked opportunities including:  
\- estimated jobs  
\- estimated revenue  
\- confidence score  
\- recommended campaign action  
\- explanation signals

2\. Campaign Generation System

Campaigns can originate from:  
\- natural language prompts  
\- revenue opportunities  
\- recommended campaigns

Campaigns generate assets for:  
Google Business  
Meta Ads  
Google Ads  
Email  
Yelp  
SEO  
AEO

Files:  
src/app/campaigns/actions.ts  
src/lib/nl-campaign-schema.ts

3\. Campaign Workflow

Campaign lifecycle:

DRAFT  
READY  
APPROVED  
SCHEDULED  
LAUNCHED  
COMPLETED

Workflow actions handled in:  
src/components/campaigns/campaign-status-actions.tsx

4\. Campaign Editing System

Users can edit campaign before launch:  
\- campaign name  
\- service  
\- offer  
\- audience  
\- description  
\- CTA  
\- creative guidance

Editing UI:  
src/components/campaigns/campaign-brief-panel.tsx

5\. Attribution Engine

Tracks:  
\- leads generated  
\- booked jobs  
\- revenue  
\- ROI  
\- confidence

Used to calculate:  
dashboard revenue captured  
performance signals  
future recommendations

Files:  
src/components/campaigns/campaign-performance.tsx

6\. Competitor Intelligence

Competitor model includes:  
\- name  
\- website  
\- logoUrl  
\- services  
\- review metrics  
\- promo signals  
\- activity signals

UI:  
src/components/competitors/competitor-card.tsx  
src/components/competitors/competitors-grid.tsx

7\. Demo Workspace Data

File:  
src/lib/seed-demo-workspace-data.ts

Seeds demo environment with:  
\- business profile  
\- competitors  
\- revenue opportunities  
\- recommendations  
\- campaigns  
\- campaign assets  
\- attribution entries

UI STRUCTURE

Dashboard layout  
src/components/dashboard/dashboard-shell.tsx

Header  
src/components/dashboard/dashboard-header.tsx

Sidebar navigation  
src/components/dashboard/dashboard-sidebar.tsx

Primary opportunity card  
src/components/dashboard/top-command-band.tsx

KPIs  
src/components/dashboard/command-center-kpis.tsx

Right rail signals  
src/components/dashboard/right-rail.tsx

CAMPAIGN UI

Campaign cards  
src/components/campaigns/campaign-card.tsx

Campaign grid  
src/components/campaigns/campaigns-grid.tsx

Campaign assets  
src/components/campaigns/campaign-assets.tsx

Campaign asset review  
src/components/campaigns/campaign-assets-review.tsx

Campaign header  
src/components/campaigns/campaign-detail-header.tsx

LEADS SYSTEM

Lead table  
src/components/leads/leads-table.tsx

Lead status updates  
src/components/leads/lead-status-select.tsx

OPPORTUNITIES SYSTEM

Opportunities grid  
src/components/opportunities/opportunities-grid.tsx

MAIN APP ROUTES

src/app/dashboard/page.tsx  
src/app/opportunities/page.tsx  
src/app/campaigns/page.tsx  
src/app/execution/page.tsx  
src/app/leads/page.tsx  
src/app/reports/page.tsx

DESIGN SYSTEM

Primary colors:  
Forge Gold \#F5B942  
Emerald Growth \#1ED18A  
Midnight Black \#0F1115  
Graphite \#151A21  
Slate \#2A3340

Typography:  
Inter

Design style:  
dark card-based command center UI

RECENT PRODUCT IMPROVEMENTS (BUILD DAYS 1–4)

✔ Campaign editing before launch  
✔ Revenue attribution display  
✔ Campaign performance signals  
✔ Hero opportunity compression (less vertical scroll)  
✔ Campaign imagery previews  
✔ Yelp campaign generation  
✔ Export pack system  
✔ Business logos in campaign assets  
✔ Competitor logos in competitor cards  
✔ Dark UI branding pass  
✔ MarketForge logo integration  
✔ Real vs estimated revenue consistency

KNOWN BUILD ISSUE

Vercel build error:

competitors-grid.tsx type mismatch

CompetitorCard expects:  
logoUrl

Fix:  
use Prisma Competitor type in competitors-grid.

CURRENT PRODUCT STATE

The system now supports full workflow:

Opportunity detection  
↓  
Campaign generation  
↓  
Campaign review/edit  
↓  
Campaign approval  
↓  
Campaign launch  
↓  
Leads captured  
↓  
Jobs booked  
↓  
Revenue attributed  
↓  
Future recommendations improved

REMAINING PRE-LAUNCH WORK

Production readiness checks:

• verify Prisma migrations  
• environment variables  
• OpenAI API key  
• Clerk production setup  
• database connection  
• Vercel build stability

Product QA:

Test complete flow  
dashboard → campaign → launch → leads → revenue attribution

User onboarding:

validate workspace creation  
business profile creation  
capacity inputs  
service priorities  
competitor setup

Demo logic:

ensure demo seed only runs for demo workspaces

Final polish:

campaign imagery system  
UI consistency  
error handling  
performance optimization

END CONTEXT  
