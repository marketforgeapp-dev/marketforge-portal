MARKETFORGE — LAUNCH EXECUTION PLAN (AI OPTIMIZED)

LAUNCH GOAL  
MarketForge is launch-ready when a brand new plumbing company can:

1\. Sign up  
2\. Create account/workspace  
3\. Complete onboarding  
4\. See believable opportunities  
5\. Generate campaigns  
6\. Edit campaigns  
7\. Launch campaigns  
8\. Track leads  
9\. Track booked jobs  
10\. See revenue attribution

No developer intervention should be required.

\--------------------------------------------------

PHASE 1 — PRODUCTION STABILITY

Requirements:

• Vercel production build passes  
• TypeScript errors resolved  
• Prisma client synced with schema  
• Prisma migrations run in production  
• Database connected  
• Clerk auth working in production  
• OpenAI integration working  
• All environment variables present

Verification:

• production deploy succeeds  
• user login works  
• database queries succeed  
• AI campaign generation works

\--------------------------------------------------

PHASE 2 — DEMO VS LIVE WORKSPACE SAFETY

Goal: demo data never leaks into real customer workspaces.

Implement:

workspaceType:  
DEMO  
LIVE

or

isDemoWorkspace flag

Rules:

• seedDemoWorkspaceData runs only for DEMO workspaces  
• LIVE workspaces start empty  
• no demo competitors/campaigns injected into real customers  
• onboarding data drives outputs for LIVE workspaces

Verification:

• demo workspace shows seeded data  
• live workspace shows only onboarding data

\--------------------------------------------------

PHASE 3 — CUSTOMER SIGNUP FLOW

Requirements:

• Clerk signup working  
• Clerk login working  
• user record created  
• workspace created  
• user assigned workspace owner role  
• user routed to onboarding

Verification:

new user signup → onboarding screen

\--------------------------------------------------

PHASE 4 — BUSINESS ONBOARDING FLOW

Required inputs:

businessName  
website  
logoUrl or uploaded logo  
phone  
city  
state  
serviceArea  
serviceAreaRadius

preferredServices  
deprioritizedServices

averageJobValue  
technicians  
jobsPerTechnicianPerDay  
weeklyCapacity

targetBookedJobsPerWeek  
targetWeeklyRevenue

GoogleBusinessUrl  
servicePageUrls

content readiness:  
hasBlog  
hasFAQ  
hasServicePages

brandTone

Verification:

• onboarding completes without developer help  
• resulting dashboard renders successfully  
• business name and logo appear correctly

\--------------------------------------------------

PHASE 5 — REALISTIC DASHBOARD OUTPUT

Dashboard must reflect onboarding data.

Verify:

• opportunity titles relate to services  
• estimated jobs believable  
• estimated revenue believable  
• recommended campaigns match services  
• competitors relevant to geography  
• business logo appears  
• competitor logos render correctly  
• no demo brand names appear

\--------------------------------------------------

PHASE 6 — COMPETITOR INTELLIGENCE STABILITY

Competitor model fields:

name  
websiteUrl  
logoUrl  
serviceFocus  
rating  
reviewCount  
isRunningAds  
isPostingActively  
hasActivePromo  
reviewVelocity  
signalSummary

UI requirements:

• competitor card renders with or without logo  
• missing logos do not break layout  
• serviceFocus displays correctly  
• competitor grid handles multiple entries

\--------------------------------------------------

PHASE 7 — CAMPAIGN GENERATION

Campaign generation must work from:

• natural language prompts  
• revenue opportunities  
• recommendations

Generated campaign must include:

campaignName  
targetService  
offer  
audience  
cta  
description  
creativeGuidance

Assets must generate for:

GOOGLE\_BUSINESS  
META  
GOOGLE\_ADS  
EMAIL  
YELP  
SEO  
AEO

Verification:

• generation succeeds repeatedly  
• structured output parsing does not fail  
• assets populate campaign review UI

\--------------------------------------------------

PHASE 8 — CAMPAIGN REVIEW \+ EDIT

User must be able to edit before launch.

Editable fields:

campaignName  
targetService  
offer  
audience  
description  
cta  
recommendedImage  
avoidImagery

Editing allowed when status \!= LAUNCHED or COMPLETED.

Verification:

• edits save successfully  
• edits persist in DB  
• campaign assets remain valid after edits

\--------------------------------------------------

PHASE 9 — CAMPAIGN WORKFLOW

Lifecycle:

DRAFT  
READY  
APPROVED  
SCHEDULED  
LAUNCHED  
COMPLETED

Actions:

Approve  
Queue  
Mark Launched  
Mark Completed

Verification:

• each transition works  
• buttons appear only for valid states  
• no workflow bypass

\--------------------------------------------------

PHASE 10 — EXPORT PACK SYSTEM

Export pack must include:

Google Business copy  
Meta ads  
Google Ads headlines  
Email copy  
Yelp ads  
SEO content  
AEO FAQ

Export format:

folder download

Recommended naming:

BusinessName-CampaignId-CampaignName

Verification:

• export downloads successfully  
• files readable by non-marketers  
• all channels included

\--------------------------------------------------

PHASE 11 — LEAD MANAGEMENT

Lead fields:

name  
source  
status  
bookedRevenue

Statuses:

NEW  
CONTACTED  
BOOKED  
LOST

Verification:

• lead table loads  
• status updates save  
• bookedRevenue saves correctly  
• editing booked revenue works

\--------------------------------------------------

PHASE 12 — REVENUE ATTRIBUTION

Campaign attribution must track:

leadsGenerated  
bookedJobs  
revenue  
roi  
confidence

Dashboard must show:

Revenue Captured by MarketForge

Consistency rules:

• dashboard revenue \= sum of booked revenue  
• campaign page revenue matches  
• reports page revenue matches

\--------------------------------------------------

PHASE 13 — PERFORMANCE LEARNING LOOP

Campaign results must influence future recommendations.

Signals displayed in:

Hero opportunity card  
Opportunities page

Fields:

performanceLabel  
performanceDetail  
historicalCampaignCount

Verification:

• launched campaigns produce learning signals  
• recommendations adjust accordingly

\--------------------------------------------------

PHASE 14 — UI / UX POLISH

Remove prototype artifacts:

• hardcoded demo names  
• duplicate messaging  
• redundant cards  
• placeholder copy

Ensure:

• business logo visible  
• competitor logos visible  
• command center card compact  
• imagery preview visible  
• consistent branding

\--------------------------------------------------

PHASE 15 — EMPTY STATE HANDLING

App must gracefully handle:

• no campaigns  
• no leads  
• no competitors  
• no attribution  
• no recommendations

UI must show helpful guidance instead of blank screens.

\--------------------------------------------------

PHASE 16 — ERROR HANDLING

Handle:

AI generation failures  
export failures  
logo loading failures  
schema parsing errors  
save failures

Requirements:

• user sees readable error  
• system does not break workflow  
• retry possible

\--------------------------------------------------

PHASE 17 — WEBSITE → APP AUTH FLOW

Flow:

Marketing website CTA  
→ Clerk signup  
→ workspace creation  
→ onboarding  
→ dashboard

Verification:

external signup correctly lands inside app.

\--------------------------------------------------

PHASE 18 — WORKSPACE ISOLATION

Each workspace must have isolated data.

Verify:

• campaigns isolated  
• leads isolated  
• competitors isolated  
• opportunities isolated  
• attribution isolated

\--------------------------------------------------

PHASE 19 — REAL CUSTOMER SIMULATION TEST

Process:

1\. choose real plumbing company  
2\. sign up as new customer  
3\. complete onboarding using real data  
4\. review dashboard outputs  
5\. generate campaigns  
6\. edit campaign  
7\. approve campaign  
8\. queue campaign  
9\. mark launched  
10\. create leads  
11\. mark booked jobs  
12\. verify revenue attribution

Questions:

• does product feel believable?  
• are opportunities realistic?  
• are campaigns usable?  
• does workflow feel intuitive?

\--------------------------------------------------

PHASE 20 — OPERATOR PLAYBOOK

Founder must know how to:

• provision workspace  
• identify demo vs live workspace  
• troubleshoot campaign generation  
• validate export packs  
• verify attribution  
• support first customer

\--------------------------------------------------

LAUNCH READY DEFINITION

MarketForge is ready for the first real customer when:

• production deploy stable  
• signup works  
• onboarding works  
• demo/live data separated  
• dashboard uses real business inputs  
• campaigns generate reliably  
• campaigns can be edited  
• campaigns can be launched  
• leads can be tracked  
• revenue attribution works  
• reports match dashboard  
• export packs usable  
• UI handles empty states  
• random plumbing company onboarding works without code changes  
