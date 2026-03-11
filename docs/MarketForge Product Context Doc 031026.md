MARKETFORGE MASTER CONTEXT DOCUMENT  
Product, Architecture, and Build Context

This document contains the full operating context for building MarketForge. It consolidates all product memos, architecture decisions, engineering details, and execution guardrails so development can continue in a new AI-assisted chat without losing context.

The purpose of this document is to allow a new assistant session to immediately understand the MarketForge product, its goals, its architecture, and the principles guiding its development.

\---------------------------------------------------------------------

PRODUCT OVERVIEW

MarketForge is an AI-powered revenue intelligence platform for local service businesses.

The product identifies missed revenue opportunities in the local market, recommends marketing campaigns to capture those opportunities, generates campaign assets automatically, and helps track whether those campaigns generate real jobs and revenue.

MarketForge is not a marketing dashboard.

MarketForge is a revenue intelligence command center.

The product must immediately answer the question:

Where is revenue available right now, and how do I capture it?

MarketForge translates marketing signals into the metrics service business owners care about most:

Jobs  
Revenue

Example output:

Estimated Missed Revenue  
$2,850

Expected Jobs  
4–6

The goal is for service business owners to think:

“This software is showing me revenue my competitors are missing.”

\---------------------------------------------------------------------

TARGET MARKET

Initial industry wedge

1\. Plumbing  
2\. HVAC  
3\. Septic  
4\. Tree Service

Primary buyer

Owner/operator of a smaller home-service business.

Typical characteristics

• 3–10 technicians  
• spends limited time thinking about marketing  
• may currently use marketing agencies  
• wants clearer next actions  
• wants to capture revenue competitors miss  
• prefers simple tools over complex marketing software

\---------------------------------------------------------------------

CORE PRODUCT LOOP

The entire MarketForge platform exists to support one loop:

Signal Detection  
→ Revenue Opportunity  
→ Campaign Generation  
→ Revenue Captured

Signal Detection

MarketForge analyzes signals including:

• search demand  
• competitor activity  
• content gaps  
• service availability  
• workforce capacity

Revenue Opportunity

Signals are translated into concrete opportunities expressed in:

Expected jobs  
Estimated revenue

Campaign Generation

MarketForge generates marketing campaigns designed to capture the opportunity.

Revenue Captured

MarketForge tracks the jobs and revenue produced by those campaigns.

\---------------------------------------------------------------------

PRIMARY PRODUCT QUESTION

Every feature in MarketForge must answer:

Where is revenue available right now?  
How do I capture it?

If a feature does not support answering this question it should not be prioritized in v1.

\---------------------------------------------------------------------

PRODUCT POSITIONING

MarketForge is not:

• a marketing dashboard  
• a generic AI content generator  
• a complex marketing analytics tool

MarketForge is:

AI Revenue Intelligence for Local Service Businesses.

\---------------------------------------------------------------------

PRIMARY DASHBOARD FEATURE

Hero Card

Jobs You Can Capture This Week

This card must appear prominently at the top of the dashboard.

Example

Jobs You Can Capture This Week  
4–6 jobs

Estimated Revenue  
$1,900–$2,850

Best Move  
Drain Cleaning Special

Why this exists  
• Drain cleaning demand rising locally  
• Competitors inactive this week  
• Technician capacity available

Confidence  
87%

Sources  
Demand • Competitor • Capacity

Launch Campaign

This card must make the opportunity obvious within 3 seconds.

\---------------------------------------------------------------------

SECONDARY DASHBOARD WIDGET

Revenue Captured Using MarketForge

Example

Revenue Captured This Month  
$6,200

Jobs Booked  
11

Campaigns Launched  
3

Win Rate  
42%

Example campaign results

Drain Cleaning Campaign  
Jobs Generated: 5  
Revenue: $2,100

Water Heater Campaign  
Jobs Generated: 2  
Revenue: $3,800

Purpose

Close the value loop and prove ROI.

\---------------------------------------------------------------------

EXECUTION MODEL

MarketForge v1 is not self-serve launch software.

MarketForge v1 is a frictionless do-it-for-you execution workflow.

Customer workflow

Onboarding  
→ Opportunity identified  
→ Campaign draft ready  
→ Customer reviews / approves  
→ Campaign queued for launch  
→ MarketForge launches campaign  
→ Leads generated  
→ Jobs booked  
→ Revenue captured

Campaign statuses

Draft Ready  
In Review  
Approved  
Queued for Launch  
Launched  
Completed

Customers should not be responsible for launching campaigns themselves.

Export packs exist but are secondary to managed execution.

\---------------------------------------------------------------------

NATURAL LANGUAGE CAMPAIGN CREATION

Users can type requests such as

Promote drain cleaning this week  
We need more water heater installs  
Help fill the schedule this week  
Promote emergency plumbing services

Workflow

User prompt  
→ intent parsing  
→ opportunity check  
→ campaign recommendation  
→ asset generation  
→ Draft Ready campaign

Generated campaign assets

Google Business Post  
Facebook Ad  
Instagram Post  
Google Ads Copy  
Email Campaign  
Blog Content  
AEO FAQ Content

\---------------------------------------------------------------------

REVENUE OPPORTUNITY ENGINE

The opportunity engine identifies revenue opportunities.

Inputs

Demand signals  
Competitor signals  
Capacity signals  
Economic signals  
AEO signals

Opportunity output must include

• opportunity type  
• estimated jobs range  
• estimated revenue range  
• why-now bullets  
• explanation narrative  
• confidence score  
• source tags  
• recommended campaign

Opportunity types

Seasonal Demand  
Competitor Inactive  
Capacity Gap  
High Value Service  
AI Search Visibility  
Review Sentiment Shift  
Local Search Spike

\---------------------------------------------------------------------

OPPORTUNITY CALCULATION FRAMEWORK

Raw opportunity score

0.30 × demand  
0.25 × competitor gap  
0.20 × capacity  
0.15 × service value  
0.10 × visibility gap

Revenue estimate

estimatedJobs × averageJobValue × confidenceAdjustment

Confidence score based on

• data completeness  
• signal strength  
• competitor confirmation  
• capacity data

\---------------------------------------------------------------------

AI ONBOARDING PREFILL

User enters

Company name  
Website

AI attempts to prefill

• business name  
• phone  
• service area  
• likely services  
• service pages  
• FAQ presence  
• competitors  
• logo

User must confirm or edit information.

\---------------------------------------------------------------------

COMPETITOR DISCOVERY

During onboarding the system suggests competitors.

Example

Suggested competitors

Masterflo Plumbing  
Superior Plumbing  
Plumb Works  
Benjamin Franklin Plumbing  
North Georgia Rooter Pros

Competitor profile includes

• service focus  
• geographic overlap  
• positioning summary  
• ad activity  
• review momentum  
• why competitor matters

\---------------------------------------------------------------------

TECHNOLOGY STACK

Frontend

Next.js (App Router)  
React  
TailwindCSS

Backend

Prisma ORM  
Postgres (Neon)

Authentication

Clerk

AI

OpenAI API

Deployment

Vercel

\---------------------------------------------------------------------

DATABASE MODELS

User  
Workspace  
WorkspaceMember  
BusinessProfile  
Competitor  
RevenueOpportunity  
Recommendation  
IntelligenceAlert  
Campaign  
CampaignAsset  
AttributionEntry  
ExportLog  
Lead

\---------------------------------------------------------------------

CURRENT PRODUCT STATUS

Infrastructure complete

Next.js app  
Prisma ORM  
Postgres database  
Clerk auth  
GitHub repo  
Vercel deployment

Working product systems

Onboarding  
AI onboarding prefill  
Competitor storage  
Opportunity engine  
Command Center dashboard  
Campaign drafts  
Campaign review  
Launch queue workflow  
Export packs  
Leads system  
Attribution tracking  
Reports  
AEO module

\---------------------------------------------------------------------

UI DESIGN SYSTEM

Primary colors

Forge Gold \#F5B942  
Emerald Growth \#1ED18A  
Midnight Black \#0F1115  
Graphite Background \#151A21  
Slate Surface \#2A3340

Typography

Inter

UI style

Card-based command center interface.

\---------------------------------------------------------------------

IMPORTANT BUILD PRINCIPLE

Every component must answer

Where is revenue available right now?  
How do I capture it?

\---------------------------------------------------------------------

EXECUTION GUARDRAIL

No feature gets built unless it shortens time to first proof.

First proof means

Onboarding  
→ Opportunity identified  
→ Campaign generated  
→ Campaign approved  
→ Lead captured  
→ Job booked  
→ Revenue visible

\---------------------------------------------------------------------

V1 SUCCESS DEFINITION

A user can

Onboard in under 8 minutes  
See revenue opportunity  
Understand why opportunity exists  
Review campaign draft  
Approve campaign  
Queue campaign for launch  
Record leads and booked jobs  
See attributed revenue

\---------------------------------------------------------------------

CURRENT DEVELOPMENT PRIORITIES

1 Natural language campaign creation  
2 Campaign asset generator  
3 Revenue captured widget  
4 Competitor intelligence enrichment  
5 Brand system UI polish  
6 UTM tracking  
7 Lead to booked job workflow improvements

\---------------------------------------------------------------------

END OF CONTEXT DOCUMENT  
